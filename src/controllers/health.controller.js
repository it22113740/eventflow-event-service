const mongoose = require("mongoose");

const getHealth = (req, res) => {
  const dbState = mongoose.connection.readyState;
  // 0=disconnected 1=connected 2=connecting 3=disconnecting
  const dbStatus = ["disconnected", "connected", "connecting", "disconnecting"][dbState] || "unknown";

  const status = dbState === 1 ? "ok" : "degraded";

  res.status(dbState === 1 ? 200 : 503).json({
    status,
    service: process.env.SERVICE_NAME || "eventflow-event-service",
    version: process.env.npm_package_version || "1.0.0",
    database: dbStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
};

module.exports = { getHealth };
