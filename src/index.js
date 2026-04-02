require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const swaggerUi = require("swagger-ui-express");

const logger = require("./config/logger");
const swaggerSpec = require("./config/swagger");
const healthRoutes = require("./routes/health.routes");
const eventRoutes = require("./routes/event.routes");
const { errorHandler } = require("./middleware/error.middleware");

// ─── app setup ───────────────────────────────────────────────────────────────

const app = express();

process.env.SERVICE_NAME = process.env.SERVICE_NAME || "eventflow-event-service";

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000" }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ─── request logger ──────────────────────────────────────────────────────────

app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// ─── swagger docs ─────────────────────────────────────────────────────────────

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

// ─── routes ──────────────────────────────────────────────────────────────────

app.get("/", (_req, res) => res.redirect("/api-docs"));

app.use("/api", healthRoutes);
app.use("/api/events", eventRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Global error handler (must be last)
app.use(errorHandler);

// ─── database connection ──────────────────────────────────────────────────────

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/eventflow-events";

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    logger.info(`MongoDB connected: ${MONGO_URI}`);
  } catch (err) {
    logger.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

// ─── start ───────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT || 3003);

connectDB().then(() => {
  app.listen(PORT, () => {
    logger.info(`[${process.env.SERVICE_NAME}] listening on port ${PORT}`);
    logger.info(`Swagger docs: http://localhost:${PORT}/api-docs`);
  });
});

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down`);
  await mongoose.connection.close();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
