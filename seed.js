require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const User = require("./models/User");
const Book = require("./models/Book");

const SEED_BOOKS = [
  { title: "The Pragmatic Programmer",     author: "Hunt & Thomas",       genre: "Technology",          year: 1999, stock: 4,  cover: "🖥️",  description: "A classic guide to software craftsmanship." },
  { title: "Dune",                          author: "Frank Herbert",        genre: "Sci-Fi",              year: 1965, stock: 3,  cover: "🪐",  description: "Epic saga on the desert planet Arrakis." },
  { title: "Atomic Habits",                 author: "James Clear",          genre: "Self-Help",           year: 2018, stock: 7,  cover: "⚡",  description: "A framework for building good habits." },
  { title: "The Design of Everyday Things", author: "Don Norman",           genre: "Design",              year: 1988, stock: 2,  cover: "🎨",  description: "Foundational text on user-centered design." },
  { title: "Project Hail Mary",             author: "Andy Weir",            genre: "Sci-Fi",              year: 2021, stock: 5,  cover: "🚀",  description: "A lone astronaut must save Earth." },
  { title: "Thinking, Fast and Slow",       author: "Daniel Kahneman",      genre: "Psychology",          year: 2011, stock: 3,  cover: "🧠",  description: "Two systems of thought that drive decisions." },
  { title: "The Lean Startup",              author: "Eric Ries",            genre: "Business",            year: 2011, stock: 4,  cover: "📈",  description: "Methodology for developing businesses." },
  { title: "Sapiens",                       author: "Yuval Noah Harari",    genre: "History",             year: 2011, stock: 6,  cover: "🌍",  description: "A sweeping narrative of humankind." },
  { title: "Clean Code",                    author: "Robert C. Martin",     genre: "Technology",          year: 2008, stock: 8,  cover: "✨",  description: "Best practices for readable, maintainable code." },
  { title: "The Alchemist",                 author: "Paulo Coelho",         genre: "Fiction",             year: 1988, stock: 9,  cover: "🌟",  description: "A philosophical novel about finding your legend." },
  { title: "Deep Work",                     author: "Cal Newport",          genre: "Self-Help",           year: 2016, stock: 4,  cover: "🎯",  description: "Rules for focused success in a distracted world." },
  { title: "1984",                          author: "George Orwell",        genre: "Fiction",             year: 1949, stock: 11, cover: "👁️",  description: "A dystopian novel about totalitarian surveillance." },

  // ── Computer Science & Engineering course books ──
  { title: "Computer Networking: A Top-Down Approach", author: "James F. Kurose, Keith W. Ross", genre: "Computer Networks",    year: 2017, stock: 5, cover: "🌐", description: "Intro to computer networks from application layer down, with real-world protocols." },
  { title: "Operating System Concepts",                 author: "A. Silberschatz, P. B. Galvin, G. Gagne", genre: "Operating Systems", year: 2018, stock: 4, cover: "🧵", description: "Classic OS text covering processes, threads, scheduling, memory, and file systems." },
  { title: "Introduction to Algorithms",                author: "T. H. Cormen et al.",          genre: "Algorithms",           year: 2009, stock: 6, cover: "📐", description: "Comprehensive reference for algorithms and data structures with proofs and pseudocode." },
  { title: "Computer Organization and Design",          author: "D. A. Patterson, J. L. Hennessy", genre: "Computer Architecture", year: 2017, stock: 5, cover: "🖥️", description: "From instruction sets to pipelining and memory hierarchy in modern CPU design." },
  { title: "Digital Design and Computer Architecture",  author: "David Harris, Sarah Harris",   genre: "Digital Design",       year: 2012, stock: 4, cover: "🔌", description: "Logic gates to CPUs with practical digital systems and hardware design." },
  { title: "Database System Concepts",                  author: "A. Silberschatz, H. F. Korth, S. Sudarshan", genre: "Databases", year: 2010, stock: 5, cover: "🗄️", description: "Relational model, SQL, transactions, concurrency control, and recovery." },
  { title: "Computer Security: Principles and Practice",author: "William Stallings, Lawrie Brown", genre: "Security",          year: 2017, stock: 3, cover: "🔐", description: "Foundations of computer and network security including cryptography and access control." },
  { title: "Artificial Intelligence: A Modern Approach",author: "Stuart Russell, Peter Norvig", genre: "Artificial Intelligence", year: 2021, stock: 4, cover: "🤖", description: "Broad AI textbook covering search, reasoning, learning, and planning." },
  { title: "Clean Architecture",                        author: "Robert C. Martin",             genre: "Software Engineering", year: 2017, stock: 4, cover: "🏗️", description: "Principles and patterns for designing maintainable, testable software systems." },
  { title: "Designing Data-Intensive Applications",     author: "Martin Kleppmann",            genre: "Distributed Systems",  year: 2017, stock: 4, cover: "📊", description: "How to design reliable, scalable, fault-tolerant systems using modern data technologies." },
];

const seed = async () => {
  await connectDB();

  console.log("🌱  Seeding database...\n");

  // Clear existing data
  await User.deleteMany({});
  await Book.deleteMany({});
  console.log("🗑   Cleared existing users and books.");

  // Create admin user
  const admin = await User.create({
    username: "Admin",
    email:    "admin@lib.com",
    password: "admin123",
    role:     "admin",
  });
  console.log(`👤  Admin created   → ${admin.email}  /  admin123`);

  // Create demo user
  const demo = await User.create({
    username: "Alex Rivera",
    email:    "demo@lib.com",
    password: "user1234",
    role:     "user",
  });
  console.log(`👤  Demo user created → ${demo.email}  /  user123`);

  // Insert books
  const books = await Book.insertMany(SEED_BOOKS);
  console.log(`📚  ${books.length} books inserted.`);

  console.log("\n✅  Seeding complete!");
  process.exit(0);
};

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
