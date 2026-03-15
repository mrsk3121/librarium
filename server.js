require("dotenv").config();

const express  = require("express");
const cors     = require("cors");
const connectDB = require("./config/db");

// Route files
const authRoutes        = require("./routes/auth");
const bookRoutes        = require("./routes/books");
const transactionRoutes = require("./routes/transactions");

// ── Connect to MongoDB ────────────────────────────────────────────
connectDB();

const app = express();

// ── Middleware ────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Routes ────────────────────────────────────────────────────────
app.use("/api/auth",         authRoutes);
app.use("/api/books",        bookRoutes);
app.use("/api",              transactionRoutes); // handles /borrow, /return/:id, /transactions, /transactions/me

// ── Health check ──────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// ── 404 handler ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found.` });
});

// ── Global error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error.",
  });
});

// ── Start server ──────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀  Server running on http://localhost:${PORT}`);
});
