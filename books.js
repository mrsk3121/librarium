const express    = require("express");
const router     = express.Router();
const Book       = require("../models/Book");
const { protect, adminOnly } = require("../middleware/auth");

// ── GET /api/books ───────────────────────────────────────────────
// Public — all authenticated users can list books
router.get("/", protect, async (req, res) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 });

    // Map _id → id for frontend compatibility
    const mapped = books.map(b => ({
      id:          b._id,
      title:       b.title,
      author:      b.author,
      genre:       b.genre,
      year:        b.year,
      stock:       b.stock,
      cover:       b.cover,
      description: b.description,
    }));

    res.json(mapped);
  } catch (err) {
    console.error("Get books error:", err);
    res.status(500).json({ message: "Failed to fetch books." });
  }
});

// ── POST /api/books ──────────────────────────────────────────────
// Admin only
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const { title, author, genre, year, stock, cover, description } = req.body;

    if (!title || !author || !genre || !year) {
      return res.status(400).json({ message: "Title, author, genre, and year are required." });
    }

    const book = await Book.create({ title, author, genre, year, stock, cover, description });

    res.status(201).json({
      id:          book._id,
      title:       book.title,
      author:      book.author,
      genre:       book.genre,
      year:        book.year,
      stock:       book.stock,
      cover:       book.cover,
      description: book.description,
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      const msg = Object.values(err.errors).map(e => e.message).join(", ");
      return res.status(400).json({ message: msg });
    }
    console.error("Add book error:", err);
    res.status(500).json({ message: "Failed to add book." });
  }
});

// ── PUT /api/books/:id ───────────────────────────────────────────
// Admin only
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!book) {
      return res.status(404).json({ message: "Book not found." });
    }

    res.json({
      id:          book._id,
      title:       book.title,
      author:      book.author,
      genre:       book.genre,
      year:        book.year,
      stock:       book.stock,
      cover:       book.cover,
      description: book.description,
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      const msg = Object.values(err.errors).map(e => e.message).join(", ");
      return res.status(400).json({ message: msg });
    }
    console.error("Update book error:", err);
    res.status(500).json({ message: "Failed to update book." });
  }
});

// ── DELETE /api/books/:id ────────────────────────────────────────
// Admin only
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);

    if (!book) {
      return res.status(404).json({ message: "Book not found." });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Delete book error:", err);
    res.status(500).json({ message: "Failed to delete book." });
  }
});

module.exports = router;
