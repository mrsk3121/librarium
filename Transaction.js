const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Denormalised fields so we can display them even if book is deleted
    book_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    book_title:  { type: String, required: true },
    book_author: { type: String, required: true },
    user_name:   { type: String, required: true },

    borrowed_at: {
      type: String, // "YYYY-MM-DD"
      required: true,
    },
    due_date: {
      type: String, // "YYYY-MM-DD"
      required: true,
    },
    returned_at: {
      type: String, // "YYYY-MM-DD" or null
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "returned"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
