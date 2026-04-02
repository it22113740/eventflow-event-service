const express = require("express");
const { body, param, query } = require("express-validator");

const { authenticate, requireAdmin } = require("../middleware/auth.middleware");
const { handleValidationErrors } = require("../middleware/validate.middleware");
const {
  createEvent,
  listEvents,
  searchEvents,
  getEvent,
  updateEvent,
  deleteEvent,
} = require("../controllers/event.controller");

const router = express.Router();

// ─── validation chains ───────────────────────────────────────────────────────

const eventBodyRules = [
  body("title").trim().notEmpty().withMessage("Title is required").isLength({ max: 200 }),
  body("description").optional().trim().isLength({ max: 2000 }),
  body("date").notEmpty().withMessage("Date is required").isISO8601().withMessage("Date must be a valid ISO 8601 date"),
  body("location").trim().notEmpty().withMessage("Location is required").isLength({ max: 300 }),
  body("category").trim().notEmpty().withMessage("Category is required").isLength({ max: 100 }),
  body("capacity").isInt({ min: 1 }).withMessage("Capacity must be a positive integer"),
];

const updateBodyRules = [
  body("title").optional().trim().notEmpty().isLength({ max: 200 }),
  body("description").optional().trim().isLength({ max: 2000 }),
  body("date").optional().isISO8601().withMessage("Date must be a valid ISO 8601 date"),
  body("location").optional().trim().notEmpty().isLength({ max: 300 }),
  body("category").optional().trim().notEmpty().isLength({ max: 100 }),
  body("capacity").optional().isInt({ min: 1 }).withMessage("Capacity must be a positive integer"),
];

const idParam = [param("id").isMongoId().withMessage("Invalid event ID")];

// ─── routes ──────────────────────────────────────────────────────────────────

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Event management endpoints
 */

/**
 * @swagger
 * /api/events/search:
 *   get:
 *     summary: Search events by name or category (public)
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Missing query param
 */
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

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create a new event (admin only)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, date, location, category, capacity]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: string
 *               category:
 *                 type: string
 *               capacity:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Event created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin role required
 *       422:
 *         description: Validation error
 */
router.post("/", authenticate, requireAdmin, eventBodyRules, handleValidationErrors, createEvent);

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: List all events (public, paginated)
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated event list
 */
router.get("/", listEvents);

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Get a single event by ID (public)
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event detail
 *       404:
 *         description: Event not found
 */
router.get("/:id", idParam, handleValidationErrors, getEvent);

/**
 * @swagger
 * /api/events/{id}:
 *   put:
 *     summary: Update an event (admin only)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin role required
 *       404:
 *         description: Event not found
 */
router.put("/:id", authenticate, requireAdmin, idParam, updateBodyRules, handleValidationErrors, updateEvent);

/**
 * @swagger
 * /api/events/{id}:
 *   delete:
 *     summary: Delete an event (admin only)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin role required
 *       404:
 *         description: Event not found
 */
router.delete("/:id", authenticate, requireAdmin, idParam, handleValidationErrors, deleteEvent);

module.exports = router;
