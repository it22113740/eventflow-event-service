const axios = require("axios");
const Event = require("../models/event.model");
const logger = require("../config/logger");
const { uploadEventImage } = require("../utils/uploadImage");
const { isConfigured } = require("../config/cloudinary");

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || "http://notification-service:3004";

// ─── helpers ────────────────────────────────────────────────────────────────

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

function parseTags(input) {
  if (input == null || input === "") return [];
  if (Array.isArray(input)) return input.map((t) => String(t).trim()).filter(Boolean).slice(0, 20);
  return String(input)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function parseHighlights(input) {
  if (input == null || input === "") return [];
  if (Array.isArray(input)) return input.map((t) => String(t).trim()).filter(Boolean).slice(0, 5);
  return String(input)
    .split(/\n|,/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function numOrUndef(v) {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * POST /api/events
 * Create a new event. Requires admin role.
 */
const createEvent = async (req, res, next) => {
  try {
    const body = req.body || {};
    const capacity = Number(body.capacity ?? body.availableSeats);
    const ticketPrice = numOrUndef(body.ticketPrice) ?? 0;
    const tags = parseTags(body.tags);
    const highlights = parseHighlights(body.highlights);
    const venueType = ["indoor", "outdoor", "hybrid"].includes(body.venueType) ? body.venueType : "indoor";

    let imageUrl = typeof body.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : undefined;

    if (req.file && req.file.buffer) {
      if (!isConfigured()) {
        return res.status(503).json({
          success: false,
          message: "Image upload is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
        });
      }
      try {
        imageUrl = await uploadEventImage(req.file.buffer, req.file.mimetype);
      } catch (uploadErr) {
        logger.error(`Cloudinary upload failed: ${uploadErr.message}`);
        return res.status(502).json({ success: false, message: "Failed to upload image" });
      }
    }

    const event = await Event.create({
      title: body.title,
      description: body.description || "",
      date: body.date,
      location: body.location,
      category: body.category,
      capacity,
      ticketPrice,
      imageUrl,
      tags,
      highlights,
      venueType,
      cancellationPolicy: body.cancellationPolicy || "",
      createdBy: req.user._id || req.user.id || req.user.userId,
    });

    logger.info(`Event created: ${event._id} by user ${event.createdBy}`);

    axios
      .post(
        `${NOTIFICATION_SERVICE_URL}/api/notify/broadcast`,
        {
          type: "NEW_EVENT",
          eventTitle: event.title,
          eventDate: event.date,
          eventLocation: event.location,
          eventId: event._id,
        },
        { timeout: 5000 }
      )
      .catch((err) => logger.warn(`Failed to broadcast new event notification: ${err.message}`));

    return res.status(201).json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/events
 * List all events with pagination. Public.
 */
const listEvents = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const filter = {};
    if (req.query.category) filter.category = new RegExp(req.query.category, "i");
    if (req.query.venueType && ["indoor", "outdoor", "hybrid"].includes(req.query.venueType)) {
      filter.venueType = req.query.venueType;
    }

    const search = (req.query.search || req.query.q || "").trim();
    if (search) {
      filter.$or = [
        { title: new RegExp(search, "i") },
        { location: new RegExp(search, "i") },
        { category: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
      ];
    }

    const [events, total] = await Promise.all([
      Event.find(filter).sort({ date: 1 }).skip(skip).limit(limit).lean(),
      Event.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: events,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/events/search?q=
 * Full-text search on title and category. Public.
 */
const searchEvents = async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();

    if (!q) {
      return res.status(400).json({ success: false, message: "Query parameter 'q' is required" });
    }

    const { page, limit, skip } = parsePagination(req.query);

    let filter;
    try {
      filter = { $text: { $search: q } };
      const [events, total] = await Promise.all([
        Event.find(filter, { score: { $meta: "textScore" } })
          .sort({ score: { $meta: "textScore" } })
          .skip(skip)
          .limit(limit)
          .lean(),
        Event.countDocuments(filter),
      ]);
      return res.json({ success: true, data: events, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
    } catch {
      const regex = new RegExp(q, "i");
      filter = { $or: [{ title: regex }, { category: regex }, { description: regex }, { location: regex }] };
      const [events, total] = await Promise.all([
        Event.find(filter).sort({ date: 1 }).skip(skip).limit(limit).lean(),
        Event.countDocuments(filter),
      ]);
      return res.json({ success: true, data: events, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/events/:id
 * Get single event by MongoDB ObjectId. Public.
 */
const getEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).lean();

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    return res.json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
};

const UPDATE_FIELDS = [
  "title",
  "description",
  "date",
  "location",
  "category",
  "capacity",
  "ticketPrice",
  "imageUrl",
  "tags",
  "highlights",
  "venueType",
  "cancellationPolicy",
];

/**
 * PUT /api/events/:id
 * Update event. Admin only.
 */
const updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    if (req.file && req.file.buffer) {
      if (!isConfigured()) {
        return res.status(503).json({
          success: false,
          message: "Image upload is not configured. Set CLOUDINARY_* environment variables.",
        });
      }
      try {
        event.imageUrl = await uploadEventImage(req.file.buffer, req.file.mimetype);
      } catch (uploadErr) {
        logger.error(`Cloudinary upload failed: ${uploadErr.message}`);
        return res.status(502).json({ success: false, message: "Failed to upload image" });
      }
    }

    const body = req.body || {};
    if (body.tags !== undefined) event.tags = parseTags(body.tags);
    if (body.highlights !== undefined) event.highlights = parseHighlights(body.highlights);

    UPDATE_FIELDS.forEach((field) => {
      if (field === "tags" || field === "highlights") return;
      if (body[field] !== undefined) event[field] = body[field];
    });

    await event.save();
    logger.info(`Event updated: ${event._id}`);
    return res.json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/events/:id
 * Delete event. Admin only.
 */
const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    await event.deleteOne();
    logger.info(`Event deleted: ${event._id}`);
    return res.json({ success: true, message: "Event deleted successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = { createEvent, listEvents, searchEvents, getEvent, updateEvent, deleteEvent };
