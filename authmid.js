const { verifyToken } = require("../utils/jwt");
const User = require("../models/User");

/**
 * Protect — requires a valid JWT Bearer token.
 * Attaches req.user = { id, email, username, role }
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authenticated. Please log in." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    // Attach decoded payload — no extra DB call needed for most routes
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token. Please log in again." });
  }
};

/**
 * AdminOnly — must be called after protect.
 * Rejects non-admin users with 403.
 */
const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }
  next();
};

module.exports = { protect, adminOnly };
