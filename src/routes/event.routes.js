const express = require("express");
const { body, param, query } = require("express-validator");

const { authenticate, requireAdmin } = require("../middleware/auth.middleware");
const { handleValidationErrors } = require("../middleware/validate.middleware");
const { optionalMultipartSingle } = require("../middleware/upload.middleware");
const {
  createEvent,
  listEvents,
  searchEvents,
  getEvent,
  updateEvent,
  deleteEvent,
} = require("../controllers/event.controller");

const router = express.Router();

const normalizeCapacity = (req, _res, next) => {
  if (req.body && req.body.availableSeats != null && req.body.capacity == null) {
    req.body.capacity = req.body.availableSeats;
  }
  next();
};

// ─── validation chains ───────────────────────────────────────────────────────

const eventBodyRules = [
  body("title").trim().notEmpty().withMessage("Title is required").isLength({ max: 200 }),
  body("description").optional({ values: "falsy" }).trim().isLength({ max: 2000 }),
  body("date").notEmpty().withMessage("Date is required").isISO8601().withMessage("Date must be a valid ISO 8601 date"),
  body("location").trim().notEmpty().withMessage("Location is required").isLength({ max: 300 }),
  body("category").trim().notEmpty().withMessage("Category is required").isLength({ max: 100 }),
  body("capacity").optional().toInt().isInt({ min: 1 }).withMessage("Capacity must be a positive integer"),
  body("availableSeats").optional().toInt().isInt({ min: 1 }),
  body("ticketPrice").optional().toFloat().isFloat({ min: 0 }),
  body("cancellationPolicy").optional({ values: "falsy" }).trim().isLength({ max: 500 }),
  body("venueType").optional().isIn(["indoor", "outdoor", "hybrid"]),
  body("imageUrl").optional({ values: "falsy" }).trim().isLength({ max: 500 }),
  body().custom((_, { req }) => {
    const c = req.body.capacity ?? req.body.availableSeats;
    if (c == null || c === "") {
      throw new Error("Capacity (or available seats) is required");
    }
    if (Number(c) < 1) throw new Error("Capacity must be at least 1");
    return true;
  }),
];

const updateBodyRules = [
  body("title").optional().trim().notEmpty().isLength({ max: 200 }),
  body("description").optional({ values: "falsy" }).trim().isLength({ max: 2000 }),
  body("date").optional().isISO8601().withMessage("Date must be a valid ISO 8601 date"),
  body("location").optional().trim().notEmpty().isLength({ max: 300 }),
  body("category").optional().trim().notEmpty().isLength({ max: 100 }),
  body("capacity").optional().toInt().isInt({ min: 1 }),
  body("ticketPrice").optional().toFloat().isFloat({ min: 0 }),
  body("cancellationPolicy").optional({ values: "falsy" }).trim().isLength({ max: 500 }),
  body("venueType").optional().isIn(["indoor", "outdoor", "hybrid"]),
  body("imageUrl").optional({ values: "falsy" }).trim().isLength({ max: 500 }),
];

const idParam = [param("id").isMongoId().withMessage("Invalid event ID")];

// ─── routes ──────────────────────────────────────────────────────────────────

router.get(
  "/search",
  [
    query("q").notEmpty().withMessage("Search query 'q' is required"),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  handleValidationErrors,
  searchEvents
);

router.post(
  "/",
  authenticate,
  requireAdmin,
  optionalMultipartSingle("image"),
  normalizeCapacity,
  eventBodyRules,
  handleValidationErrors,
  createEvent
);

router.get("/", listEvents);

router.get("/:id", idParam, handleValidationErrors, getEvent);

router.put(
  "/:id",
  authenticate,
  requireAdmin,
  optionalMultipartSingle("image"),
  idParam,
  updateBodyRules,
  handleValidationErrors,
  updateEvent
);

router.delete("/:id", authenticate, requireAdmin, idParam, handleValidationErrors, deleteEvent);

module.exports = router;
