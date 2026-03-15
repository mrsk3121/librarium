// ─── API CONFIG ──────────────────────────────────────────────────────────────
// Hard-code local backend URL to avoid any env / caching issues.
// You can change this later to a public backend URL when you deploy.
export const API_BASE = "http://localhost:5000/api";

export function authHeaders() {
  const token = localStorage.getItem("jwt_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── REAL API ─────────────────────────────────────────────────────────────────
export const api = {
  // Auth
  login:    (body)    => fetch(`${API_BASE}/auth/login`,          { method: "POST", headers: authHeaders(), body: JSON.stringify(body) }).then(handleResponse),
  register: (body)    => fetch(`${API_BASE}/auth/register`,       { method: "POST", headers: authHeaders(), body: JSON.stringify(body) }).then(handleResponse),

  // Books
  getBooks:   ()        => fetch(`${API_BASE}/books`,             { headers: authHeaders() }).then(handleResponse),
  addBook:    (data)    => fetch(`${API_BASE}/books`,             { method: "POST", headers: authHeaders(), body: JSON.stringify(data) }).then(handleResponse),
  updateBook: (id, data)=> fetch(`${API_BASE}/books/${id}`,       { method: "PUT",  headers: authHeaders(), body: JSON.stringify(data) }).then(handleResponse),
  deleteBook: (id)      => fetch(`${API_BASE}/books/${id}`,       { method: "DELETE", headers: authHeaders() }).then(handleResponse),

  // Transactions
  borrowBook:      (bookId) => fetch(`${API_BASE}/borrow`,        { method: "POST", headers: authHeaders(), body: JSON.stringify({ book_id: bookId }) }).then(handleResponse),
  returnBook:      (txId)   => fetch(`${API_BASE}/return/${txId}`,{ method: "PUT",  headers: authHeaders() }).then(handleResponse),
  getMyTransactions: ()     => fetch(`${API_BASE}/transactions/me`,{ headers: authHeaders() }).then(handleResponse),
  getAllTransactions: ()    => fetch(`${API_BASE}/transactions`,   { headers: authHeaders() }).then(handleResponse),
};

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
export const MOCK_BOOKS = [
  { id: 1,  title: "The Pragmatic Programmer",    author: "Hunt & Thomas",      genre: "Technology", year: 1999, stock: 4,  cover: "🖥️",  description: "A classic guide to software craftsmanship covering best practices, tips, and philosophies for developers." },
  { id: 2,  title: "Dune",                         author: "Frank Herbert",       genre: "Sci-Fi",     year: 1965, stock: 0,  cover: "🪐",  description: "An epic saga of politics, religion, and ecology on the desert planet Arrakis — the universe's only source of spice." },
  { id: 3,  title: "Atomic Habits",                author: "James Clear",         genre: "Self-Help",  year: 2018, stock: 7,  cover: "⚡",  description: "A practical framework for building good habits and breaking bad ones through small, incremental changes." },
  { id: 4,  title: "The Design of Everyday Things",author: "Don Norman",          genre: "Design",     year: 1988, stock: 2,  cover: "🎨",  description: "A foundational text on user-centered design, exploring why some products satisfy and others frustrate." },
  { id: 5,  title: "Project Hail Mary",            author: "Andy Weir",           genre: "Sci-Fi",     year: 2021, stock: 5,  cover: "🚀",  description: "A lone astronaut must save Earth from an extinction-level threat — a gripping solo science adventure." },
  { id: 6,  title: "Thinking, Fast and Slow",      author: "Daniel Kahneman",     genre: "Psychology", year: 2011, stock: 3,  cover: "🧠",  description: "Nobel laureate Kahneman explores the two systems of thought that drive the way we think and make decisions." },
  { id: 7,  title: "The Lean Startup",             author: "Eric Ries",           genre: "Business",   year: 2011, stock: 0,  cover: "📈",  description: "A methodology for developing businesses and products that aims to shorten product development cycles." },
  { id: 8,  title: "Sapiens",                      author: "Yuval Noah Harari",   genre: "History",    year: 2011, stock: 6,  cover: "🌍",  description: "A sweeping narrative of humankind from the Stone Age through the 21st century." },
  { id: 9,  title: "Clean Code",                   author: "Robert C. Martin",    genre: "Technology", year: 2008, stock: 8,  cover: "✨",  description: "Best practices and principles for writing clean, readable, maintainable software." },
  { id: 10, title: "The Alchemist",                author: "Paulo Coelho",        genre: "Fiction",    year: 1988, stock: 9,  cover: "🌟",  description: "A philosophical novel about a young Andalusian shepherd's journey to find treasure and his personal legend." },
  { id: 11, title: "Deep Work",                    author: "Cal Newport",         genre: "Self-Help",  year: 2016, stock: 4,  cover: "🎯",  description: "Rules for focused success in a distracted world — how to produce your best work in less time." },
  { id: 12, title: "1984",                         author: "George Orwell",       genre: "Fiction",    year: 1949, stock: 11, cover: "👁️",  description: "A dystopian novel set in a totalitarian society under constant surveillance — Orwell's timeless warning." },
];

let _books = MOCK_BOOKS.map(b => ({ ...b }));
let _transactions = [
  { id: 101, book_id: 2,  book_title: "Dune",                  book_author: "Frank Herbert",   borrowed_at: "2026-02-10", due_date: "2026-02-24", returned_at: "2026-02-22", status: "returned", user_id: 1, user_name: "Alex Rivera" },
  { id: 102, book_id: 6,  book_title: "Thinking, Fast & Slow", book_author: "Daniel Kahneman", borrowed_at: "2026-02-28", due_date: "2026-03-14", returned_at: null,         status: "active",   user_id: 1, user_name: "Alex Rivera" },
  { id: 103, book_id: 10, book_title: "The Alchemist",         book_author: "Paulo Coelho",    borrowed_at: "2026-01-15", due_date: "2026-01-29", returned_at: "2026-01-28", status: "returned", user_id: 2, user_name: "Jamie Chen" },
  { id: 104, book_id: 3,  book_title: "Atomic Habits",         book_author: "James Clear",     borrowed_at: "2026-02-20", due_date: "2026-03-06", returned_at: null,         status: "active",   user_id: 2, user_name: "Jamie Chen" },
  { id: 105, book_id: 8,  book_title: "Sapiens",               book_author: "Y.N. Harari",     borrowed_at: "2026-01-05", due_date: "2026-01-19", returned_at: null,         status: "active",   user_id: 3, user_name: "Morgan Lee" },
];
let _nextTxId = 200;
let _nextBookId = 13;

const delay = (ms = 600) => new Promise(r => setTimeout(r, ms));

export const mockApi = {
  login: async ({ email, password }) => {
    await delay();
    if (email === "admin@lib.com" && password === "admin123") {
      const payload = btoa(JSON.stringify({ id: 0, email, username: "Admin", role: "admin" }));
      return { token: `hdr.${payload}.sig`, user: { id: 0, email, username: "Admin", role: "admin" } };
    }
    if (email === "demo@lib.com" && password === "user123") {
      const payload = btoa(JSON.stringify({ id: 1, email, username: "Alex Rivera", role: "user" }));
      return { token: `hdr.${payload}.sig`, user: { id: 1, email, username: "Alex Rivera", role: "user" } };
    }
    throw new Error("Invalid email or password");
  },
  register: async ({ username, email }) => {
    await delay();
    const id = Date.now();
    const payload = btoa(JSON.stringify({ id, email, username, role: "user" }));
    return { token: `hdr.${payload}.sig`, user: { id, email, username, role: "user" } };
  },
  getBooks: async () => { await delay(400); return [..._books]; },
  addBook: async (data) => {
    await delay();
    const book = { ...data, id: _nextBookId++, cover: data.cover || "📖" };
    _books.push(book);
    return book;
  },
  updateBook: async (id, data) => {
    await delay();
    _books = _books.map(b => b.id === id ? { ...b, ...data } : b);
    return { id, ...data };
  },
  deleteBook: async (id) => {
    await delay();
    _books = _books.filter(b => b.id !== id);
    return { ok: true };
  },
  borrowBook: async (bookId) => {
    await delay();
    const book = _books.find(b => b.id === bookId);
    if (!book || book.stock < 1) throw new Error("Book unavailable");
    book.stock--;
    const due = new Date(); due.setDate(due.getDate() + 14);
    const tx = {
      id: _nextTxId++, book_id: bookId, book_title: book.title, book_author: book.author,
      borrowed_at: new Date().toISOString().slice(0, 10),
      due_date: due.toISOString().slice(0, 10),
      returned_at: null, status: "active", user_id: 1, user_name: "Alex Rivera",
    };
    _transactions.push(tx);
    return tx;
  },
  returnBook: async (txId) => {
    await delay();
    const tx = _transactions.find(t => t.id === txId);
    if (!tx) throw new Error("Transaction not found");
    tx.returned_at = new Date().toISOString().slice(0, 10);
    tx.status = "returned";
    const book = _books.find(b => b.id === tx.book_id);
    if (book) book.stock++;
    return tx;
  },
  getMyTransactions: async () => { await delay(400); return [..._transactions].filter(t => t.user_id === 1).reverse(); },
  getAllTransactions: async () => { await delay(400); return [..._transactions].reverse(); },
};

// Controlled by env so deploys can use real API without code changes.
// In local dev, set VITE_USE_MOCK=true to run without backend.
export const USE_MOCK = (import.meta?.env?.VITE_USE_MOCK ?? "false") === "true";
export const $api = USE_MOCK ? mockApi : api;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
export const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export const daysUntil = (dateStr) => {
  const diff = new Date(dateStr + "T00:00:00") - new Date(new Date().toDateString());
  return Math.round(diff / 86400000);
};

export const getDueStatus = (tx) => {
  if (tx.status === "returned") return "returned";
  const d = daysUntil(tx.due_date);
  if (d < 0) return "overdue";
  if (d <= 3) return "urgent";
  return "ok";
};

export const GENRES = ["Fiction", "Non-Fiction", "Sci-Fi", "Fantasy", "Mystery", "Romance", "Technology", "Design", "Self-Help", "History", "Psychology", "Business", "Biography", "Other"];

export const COVER_OPTIONS = ["📖","🖥️","🪐","⚡","🎨","🚀","🧠","📈","🌍","✨","🌟","🎯","👁️","🔬","🏛️","🌊","🦋","🔮"];
