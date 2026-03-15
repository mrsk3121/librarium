const jwt = require("jsonwebtoken");

/**
 * Sign a JWT containing the user's id, email, username, and role.
 */
const signToken = (user) =>
  jwt.sign(
    {
      id:       user._id,
      email:    user.email,
      username: user.username,
      role:     user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

/**
 * Verify a JWT and return its decoded payload.
 * Throws if invalid or expired.
 */
const verifyToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);

module.exports = { signToken, verifyToken };
