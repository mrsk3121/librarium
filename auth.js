const express = require("express");
const router  = express.Router();
const User    = require("../models/User");
const { signToken } = require("../utils/jwt");

// ── POST /api/auth/register ──────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Check duplicate email
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    // Create user (password hashed automatically by model pre-save hook)
    const user = await User.create({ username, email, password });

    const token = signToken(user);

    res.status(201).json({
      token,
      user: {
        id:       user._id,
        email:    user.email,
        username: user.username,
        role:     user.role,
      },
    });
  } catch (err) {
    // Mongoose validation error
    if (err.name === "ValidationError") {
      const msg = Object.values(err.errors).map(e => e.message).join(", ");
      return res.status(400).json({ message: msg });
    }
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error. Please try again." });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    // Explicitly select password (hidden by default in schema)
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = signToken(user);

    res.json({
      token,
      user: {
        id:       user._id,
        email:    user.email,
        username: user.username,
        role:     user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error. Please try again." });
  }
});

module.exports = router;
