const express = require("express");
const { getHealth } = require("../controllers/health.controller");

const router = express.Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Service health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 service:
 *                   type: string
 *                 version:
 *                   type: string
 *                 database:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                 uptime:
 *                   type: integer
 *       503:
 *         description: Service degraded (database disconnected)
 */
router.get("/health", getHealth);

module.exports = router;
