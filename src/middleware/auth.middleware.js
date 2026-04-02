const axios = require("axios");
const logger = require("../config/logger");

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://user-service:3001";

/**
 * Validates the Bearer JWT by forwarding it to the User Service profile endpoint.
 * On success, attaches the user profile to req.user.
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const { data } = await axios.get(`${USER_SERVICE_URL}/api/users/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 5000,
    });

    req.user = data.user || data;
    next();
  } catch (err) {
    if (err.response) {
      const status = err.response.status;
      if (status === 401 || status === 403) {
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
      }
    }

    if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND" || err.code === "ETIMEDOUT") {
      logger.error(`Auth: cannot reach user-service — ${err.message}`);
      return res.status(503).json({ success: false, message: "Authentication service unavailable" });
    }

    logger.error("Auth middleware error:", err);
    return res.status(500).json({ success: false, message: "Authentication error" });
  }
};

/**
 * Must be used after `authenticate`. Allows only users whose role is "admin".
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin role required" });
  }

  next();
};

module.exports = { authenticate, requireAdmin };
