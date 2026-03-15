const express     = require("express");
const router      = express.Router();
const Transaction = require("../models/Transaction");
const Book        = require("../models/Book");
const { protect, adminOnly } = require("../middleware/auth");

// Helper: format date as "YYYY-MM-DD"
const toDateStr = (d = new Date()) =>
  d.toISOString().slice(0, 10);

// Helper: map a Transaction doc → plain object the frontend expects
const mapTx = (tx) => ({
  id:          tx._id,
  book_id:     tx.book_id,
  book_title:  tx.book_title,
  book_author: tx.book_author,
  user_id:     tx.user,
  user_name:   tx.user_name,
  borrowed_at: tx.borrowed_at,
  due_date:    tx.due_date,
  returned_at: tx.returned_at,
  status:      tx.status,
});

// ── POST /api/borrow ─────────────────────────────────────────────
// Borrow a book — creates a new active transaction
router.post("/borrow", protect, async (req, res) => {
  try {
    const { book_id } = req.body;

    if (!book_id) {
      return res.status(400).json({ message: "book_id is required." });
    }

    // Check book exists and has stock
    const book = await Book.findById(book_id);
    if (!book) {
      return res.status(404).json({ message: "Book not found." });
    }
    if (book.stock < 1) {
      return res.status(400).json({ message: "Book unavailable — out of stock." });
    }

    // Check user doesn't already have this book borrowed
    const alreadyBorrowed = await Transaction.findOne({
      user:    req.user.id,
      book_id: book_id,
      status:  "active",
    });
    if (alreadyBorrowed) {
      return res.status(400).json({ message: "You already have this book borrowed." });
    }

    // Decrement stock atomically
    book.stock -= 1;
    await book.save();

    // Calculate due date (14 days from today)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    const tx = await Transaction.create({
      user:        req.user.id,
      book_id:     book._id,
      book_title:  book.title,
      book_author: book.author,
      user_name:   req.user.username,
      borrowed_at: toDateStr(),
      due_date:    toDateStr(dueDate),
    });

    res.status(201).json(mapTx(tx));
  } catch (err) {
    console.error("Borrow error:", err);
    res.status(500).json({ message: "Failed to borrow book." });
  }
});

// ── PUT /api/return/:id ──────────────────────────────────────────
// Return a borrowed book by transaction ID
router.put("/return/:id", protect, async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id);

    if (!tx) {
      return res.status(404).json({ message: "Transaction not found." });
    }

    // Only the borrower (or admin) can return
    if (tx.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to return this book." });
    }

    if (tx.status === "returned") {
      return res.status(400).json({ message: "This book was already returned." });
    }

    // Mark returned
    tx.returned_at = toDateStr();
    tx.status      = "returned";
    await tx.save();

    // Restore stock
    await Book.findByIdAndUpdate(tx.book_id, { $inc: { stock: 1 } });

    res.json(mapTx(tx));
  } catch (err) {
    console.error("Return error:", err);
    res.status(500).json({ message: "Failed to return book." });
  }
});

// ── GET /api/transactions/me ─────────────────────────────────────
// Current user's transaction history (most recent first)
router.get("/transactions/me", protect, async (req, res) => {
  try {
    const txs = await Transaction.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(txs.map(mapTx));
  } catch (err) {
    console.error("My transactions error:", err);
    res.status(500).json({ message: "Failed to fetch transactions." });
  }
});

// ── GET /api/transactions ────────────────────────────────────────
// All transactions — admin only
router.get("/transactions", protect, adminOnly, async (req, res) => {
  try {
    const txs = await Transaction.find().sort({ createdAt: -1 });
    res.json(txs.map(mapTx));
  } catch (err) {
    console.error("All transactions error:", err);
    res.status(500).json({ message: "Failed to fetch transactions." });
  }
});

module.exports = router;
