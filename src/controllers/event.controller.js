const axios = require("axios");
const Event = require("../models/event.model");
const logger = require("../config/logger");

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

// ─── controllers ────────────────────────────────────────────────────────────

/**
 * POST /api/events
 * Create a new event. Requires admin role.
 */
const createEvent = async (req, res, next) => {
  try {
    const { title, description, date, location, category, capacity } = req.body;

    const event = await Event.create({
      title,
      description,
      date,
      location,
      category,
      capacity,
      createdBy: req.user._id || req.user.id || req.user.userId,
    });

    logger.info(`Event created: ${event._id} by user ${event.createdBy}`);

    // Fire-and-forget broadcast to notification service
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
      .catch((err) =>
        logger.warn(`Failed to broadcast new event notification: ${err.message}`)
      );

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
      filter = { $or: [{ title: regex }, { category: regex }] };
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

    const allowed = ["title", "description", "date", "location", "category", "capacity"];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) event[field] = req.body[field];
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
