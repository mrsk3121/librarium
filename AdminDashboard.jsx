import { useState, useEffect, useCallback, useRef } from "react";
import { $api, fmtDate, GENRES, COVER_OPTIONS } from "./lib.js";
import { useAuth } from "./AuthPage.jsx";

// ═══════════════════════════════════════════════════════════════════
//  TOAST SYSTEM
// ═══════════════════════════════════════════════════════════════════
function useToast() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);
  const dismiss = useCallback((id) => setToasts(t => t.filter(x => x.id !== id)), []);
  return { toasts, push, dismiss };
}

function ToastStack({ toasts, dismiss }) {
  return (
    <div style={{ position:"fixed", bottom:28, right:28, zIndex:600, display:"flex", flexDirection:"column", gap:10, pointerEvents:"none" }}>
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`} style={{ pointerEvents:"auto" }} onClick={() => dismiss(t.id)}>
          <span className="toast-icon">{t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  SKELETON LOADER
// ═══════════════════════════════════════════════════════════════════
function Skeleton({ w = "100%", h = 16, r = 6, style = {} }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

function TableSkeleton({ rows = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} style={{ opacity: 1 - i * 0.1 }}>
          <td><Skeleton w={22} h={22} r={4} /></td>
          <td><div style={{ display:"flex", alignItems:"center", gap:10 }}><Skeleton w={32} h={32} r={8} /><div><Skeleton w={160} h={13} /><Skeleton w={100} h={10} style={{ marginTop:5 }} /></div></div></td>
          <td><Skeleton w={110} h={13} /></td>
          <td><Skeleton w={70} h={22} r={20} /></td>
          <td><Skeleton w={40} h={13} /></td>
          <td><Skeleton w={30} h={13} /></td>
          <td><div style={{ display:"flex", gap:6 }}><Skeleton w={32} h={32} r={7} /><Skeleton w={32} h={32} r={7} /></div></td>
        </tr>
      ))}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  BOOK MODAL
// ═══════════════════════════════════════════════════════════════════
const BLANK_BOOK = { title: "", author: "", genre: "", year: new Date().getFullYear(), stock: 1, cover: "📖", description: "" };

function BookModal({ book, onClose, onSave, saving }) {
  const [form, setForm] = useState(book ? { ...BLANK_BOOK, ...book } : BLANK_BOOK);
  const [errors, setErrors] = useState({});
  const isEdit = !!book;
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); };

  const validate = () => {
    const e = {};
    if (!form.title.trim())  e.title  = "Title is required";
    if (!form.author.trim()) e.author = "Author is required";
    if (!form.genre)         e.genre  = "Please select a genre";
    if (!form.year || form.year < 1000 || form.year > 2099) e.year = "Enter a valid year";
    if (form.stock < 0) e.stock = "Stock can't be negative";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => { if (validate()) onSave(form); };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={isEdit ? "Edit book" : "Add book"}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? "Edit Book" : "Add New Book"}</h2>
          <button className="btn-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          {/* Cover picker */}
          <div className="field">
            <label className="field-label">Cover Icon</label>
            <div className="cover-grid">
              {COVER_OPTIONS.map(e => (
                <button key={e} className={`cover-opt${form.cover === e ? " selected" : ""}`} onClick={() => set("cover", e)} type="button">{e}</button>
              ))}
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label className="field-label">Title *</label>
              <input className={`field-input${errors.title ? " has-error" : ""}`} value={form.title} onChange={e => set("title", e.target.value)} placeholder="Book title" autoFocus />
              {errors.title && <span className="field-error">{errors.title}</span>}
            </div>
            <div className="field">
              <label className="field-label">Author *</label>
              <input className={`field-input${errors.author ? " has-error" : ""}`} value={form.author} onChange={e => set("author", e.target.value)} placeholder="Author name" />
              {errors.author && <span className="field-error">{errors.author}</span>}
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label className="field-label">Genre *</label>
              <select className={`field-input${errors.genre ? " has-error" : ""}`} value={form.genre} onChange={e => set("genre", e.target.value)}>
                <option value="">Select genre…</option>
                {GENRES.map(g => <option key={g}>{g}</option>)}
              </select>
              {errors.genre && <span className="field-error">{errors.genre}</span>}
            </div>
            <div className="field">
              <label className="field-label">Year *</label>
              <input type="number" className={`field-input${errors.year ? " has-error" : ""}`} value={form.year} onChange={e => set("year", +e.target.value)} placeholder="e.g. 2023" />
              {errors.year && <span className="field-error">{errors.year}</span>}
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label className="field-label">Stock *</label>
              <input type="number" min={0} className={`field-input${errors.stock ? " has-error" : ""}`} value={form.stock} onChange={e => set("stock", +e.target.value)} />
              {errors.stock && <span className="field-error">{errors.stock}</span>}
            </div>
          </div>

          <div className="field">
            <label className="field-label">Description</label>
            <textarea className="field-input" rows={3} style={{ resize:"vertical", lineHeight:1.6 }}
              value={form.description} onChange={e => set("description", e.target.value)} placeholder="Brief description (optional)" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="spinner" />{isEdit ? " Saving…" : " Adding…"}</> : isEdit ? "Save Changes" : "Add Book"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  DELETE CONFIRM
// ═══════════════════════════════════════════════════════════════════
function DeleteModal({ book, onClose, onConfirm, saving }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-header"><h2 className="modal-title">Confirm Delete</h2><button className="btn-close" onClick={onClose}>✕</button></div>
        <div className="modal-body" style={{ textAlign:"center" }}>
          <div style={{ fontSize:52, marginBottom:16 }}>{book.cover}</div>
          <p style={{ fontSize:15, fontWeight:600, marginBottom:8 }}>{book.title}</p>
          <p style={{ fontSize:13.5, color:"var(--muted)", lineHeight:1.6 }}>
            This will permanently remove the book from the catalog. This action cannot be undone.
          </p>
        </div>
        <div className="modal-footer" style={{ justifyContent:"center" }}>
          <button className="btn btn-ghost" onClick={onClose}>Keep Book</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={saving}>
            {saving ? <><span className="spinner" /> Deleting…</> : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════
const SORT_OPTIONS = [
  { label: "Title A–Z",     fn: (a,b) => a.title.localeCompare(b.title) },
  { label: "Title Z–A",     fn: (a,b) => b.title.localeCompare(a.title) },
  { label: "Newest First",  fn: (a,b) => b.year - a.year },
  { label: "Oldest First",  fn: (a,b) => a.year - b.year },
  { label: "Stock: Low→Hi", fn: (a,b) => a.stock - b.stock },
  { label: "Stock: Hi→Low", fn: (a,b) => b.stock - a.stock },
];

export default function AdminDashboard() {
  const { user, logout }   = useAuth();
  const { toasts, push, dismiss } = useToast();

  // Data
  const [books, setBooks]               = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingTx, setLoadingTx]       = useState(true);
  const [fetchError, setFetchError]     = useState("");

  // UI state
  const [activeNav, setActiveNav]   = useState("books");
  const [search, setSearch]         = useState("");
  const [genreFilter, setGenreFilter] = useState("All");
  const [sortIdx, setSortIdx]       = useState(0);
  const [page, setPage]             = useState(1);
  const PAGE_SIZE = 10;

  // Modals
  const [bookModal, setBookModal]   = useState(null); // null | "add" | bookObj
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving]         = useState(false);

  const searchRef = useRef(null);

  // ── FETCH ──────────────────────────────────────────────────────
  const fetchBooks = useCallback(async () => {
    setLoadingBooks(true); setFetchError("");
    try { setBooks(await $api.getBooks()); }
    catch (e) { setFetchError(e.message); push(e.message, "error"); }
    finally { setLoadingBooks(false); }
  }, []);

  const fetchTx = useCallback(async () => {
    setLoadingTx(true);
    try { setTransactions(await $api.getAllTransactions()); }
    catch { /* non-critical */ }
    finally { setLoadingTx(false); }
  }, []);

  useEffect(() => { fetchBooks(); fetchTx(); }, [fetchBooks, fetchTx]);

  // ── DERIVED STATS ─────────────────────────────────────────────
  const totalStock   = books.reduce((s, b) => s + (+b.stock || 0), 0);
  const lowStock     = books.filter(b => +b.stock > 0 && +b.stock <= 3).length;
  const outOfStock   = books.filter(b => +b.stock === 0).length;
  const activeTx     = transactions.filter(t => t.status === "active").length;
  const overdueTx    = transactions.filter(t => t.status === "active" && new Date(t.due_date) < new Date()).length;
  const genreStats   = books.reduce((acc, b) => { acc[b.genre] = (acc[b.genre] || 0) + 1; return acc; }, {});
  const topGenre     = Object.entries(genreStats).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? "—";

  // ── FILTERED / SORTED / PAGINATED ────────────────────────────
  const genres = ["All", ...Array.from(new Set(books.map(b => b.genre))).filter(Boolean).sort()];
  const filtered = books
    .filter(b => {
      const q = search.toLowerCase();
      return (!q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.genre.toLowerCase().includes(q));
    })
    .filter(b => genreFilter === "All" || b.genre === genreFilter)
    .sort(SORT_OPTIONS[sortIdx].fn);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search, genreFilter, sortIdx]);

  // ── CRUD HANDLERS ────────────────────────────────────────────
  const handleAdd = async (form) => {
    setSaving(true);
    try {
      const nb = await $api.addBook({ ...form, year: +form.year, stock: +form.stock });
      setBooks(b => [nb, ...b]);
      setBookModal(null);
      push(`"${nb.title}" added to catalog.`);
    } catch (e) { push(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleEdit = async (form) => {
    setSaving(true);
    const id = bookModal.id;
    try {
      await $api.updateBook(id, { ...form, year: +form.year, stock: +form.stock });
      setBooks(b => b.map(x => x.id === id ? { ...x, ...form, year: +form.year, stock: +form.stock } : x));
      setBookModal(null);
      push(`"${form.title}" updated.`);
    } catch (e) { push(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await $api.deleteBook(deleteTarget.id);
      setBooks(b => b.filter(x => x.id !== deleteTarget.id));
      push(`"${deleteTarget.title}" deleted.`);
      setDeleteTarget(null);
    } catch (e) { push(e.message, "error"); }
    finally { setSaving(false); }
  };

  // ── KEYBOARD SHORTCUT (Cmd/Ctrl+K to focus search) ───────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault(); searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const NAV = [
    { id:"overview", icon:"◈", label:"Overview" },
    { id:"books",    icon:"⊞", label:"Books",    badge: books.length },
    { id:"loans",    icon:"↻", label:"Active Loans", badge: activeTx || undefined },
    { id:"overdue",  icon:"⚠", label:"Overdue",  badge: overdueTx || undefined },
  ];

  return (
    <>
      <style>{adminCss}</style>
      <div className="admin-shell">

        {/* ── SIDEBAR ─────────────────────────────────────────── */}
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="brand-mark">L</div>
            <div>
              <div className="brand-name">Librarium</div>
              <div className="brand-sub">Admin Console</div>
            </div>
          </div>
          <nav className="sidebar-nav">
            <div className="nav-section">Main</div>
            {NAV.map(n => (
              <button key={n.id} className={`nav-item${activeNav === n.id ? " active" : ""}`} onClick={() => setActiveNav(n.id)}>
                <span className="nav-icon">{n.icon}</span>
                <span className="nav-label">{n.label}</span>
                {n.badge !== undefined && <span className={`nav-badge${n.id === "overdue" ? " danger" : ""}`}>{n.badge}</span>}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="sf-user">
              <div className="sf-avatar">{user?.username?.[0]?.toUpperCase() ?? "A"}</div>
              <div>
                <div className="sf-name">{user?.username}</div>
                <div className="sf-role">Administrator</div>
              </div>
            </div>
            <button className="sf-logout" onClick={logout} title="Sign out">⏻</button>
          </div>
        </aside>

        {/* ── MAIN ────────────────────────────────────────────── */}
        <main className="admin-main">
          <header className="topbar">
            <div className="topbar-left">
              <h1 className="topbar-title">
                {activeNav === "books"    ? "Book Catalog"     :
                 activeNav === "overview" ? "Overview"         :
                 activeNav === "loans"    ? "Active Loans"     : "Overdue Books"}
              </h1>
              <div className="topbar-sub">
                {activeNav === "books" ? `${filtered.length} of ${books.length} books` :
                 activeNav === "loans" ? `${activeTx} books currently on loan` :
                 activeNav === "overdue" ? `${overdueTx} overdue loans need attention` :
                 "Library at a glance"}
              </div>
            </div>
            <div className="topbar-actions">
              {activeNav === "books" && (
                <>
                  <div className="search-box">
                    <span className="search-ico">⌕</span>
                    <input ref={searchRef} className="search-inp" placeholder="Search… ⌘K" value={search}
                      onChange={e => setSearch(e.target.value)} aria-label="Search books" />
                    {search && <button className="search-clear" onClick={() => setSearch("")}>✕</button>}
                  </div>
                  <button className="btn btn-primary" onClick={() => setBookModal("add")}>＋ Add Book</button>
                </>
              )}
            </div>
          </header>

          <div className="content">

            {/* ── OVERVIEW ─────────────────────────────────────── */}
            {activeNav === "overview" && (
              <div className="overview">
                <div className="stat-grid">
                  {[
                    { label:"Total Books",    value: books.length,   sub: `${topGenre} most common`,  color:"teal",  icon:"📚" },
                    { label:"Total Stock",    value: totalStock,     sub: `${outOfStock} out of stock`, color:"blue",  icon:"📦" },
                    { label:"Active Loans",   value: activeTx,       sub: `${overdueTx} overdue`,      color:"amber", icon:"🔄" },
                    { label:"Low Stock",      value: lowStock,       sub: "≤ 3 copies remaining",      color:"red",   icon:"⚠️" },
                    { label:"Genres",         value: Object.keys(genreStats).length, sub: `Top: ${topGenre}`, color:"green", icon:"🏷️" },
                    { label:"All Transactions", value: transactions.length, sub: "All time",           color:"purple",icon:"📋" },
                  ].map((s,i) => (
                    <div className={`stat-card accent-${s.color}`} key={i} style={{ animationDelay: `${i*60}ms` }}>
                      <div className="stat-top">
                        <div className="stat-label">{s.label}</div>
                        <div className="stat-icon-bg">{s.icon}</div>
                      </div>
                      <div className="stat-value">{loadingBooks ? <Skeleton w={60} h={36} /> : s.value}</div>
                      <div className="stat-sub">{s.sub}</div>
                    </div>
                  ))}
                </div>

                <div className="overview-grid">
                  <div className="ov-card">
                    <div className="ov-card-title">Genre Distribution</div>
                    <div className="genre-bars">
                      {Object.entries(genreStats).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([g,n]) => (
                        <div key={g} className="genre-bar-row">
                          <span className="genre-bar-label">{g}</span>
                          <div className="genre-bar-track">
                            <div className="genre-bar-fill" style={{ width: `${(n/books.length)*100}%` }} />
                          </div>
                          <span className="genre-bar-count">{n}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="ov-card">
                    <div className="ov-card-title">Recent Transactions</div>
                    {loadingTx
                      ? Array.from({length:5}).map((_,i)=><div key={i} style={{marginBottom:12}}><Skeleton h={13} /><Skeleton w="60%" h={10} style={{marginTop:5}}/></div>)
                      : transactions.slice(0,8).map(tx => (
                        <div className="tx-row" key={tx.id}>
                          <div className="tx-dot" data-status={tx.status} />
                          <div className="tx-info">
                            <div className="tx-title">{tx.book_title}</div>
                            <div className="tx-meta">{tx.user_name} · {fmtDate(tx.borrowed_at)}</div>
                          </div>
                          <span className={`tx-badge ${tx.status}`}>{tx.status}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            )}

            {/* ── BOOKS TABLE ──────────────────────────────────── */}
            {activeNav === "books" && (
              <div className="books-section">
                {/* Filter row */}
                <div className="filter-row">
                  <div className="genre-filters">
                    {genres.map(g => (
                      <button key={g} className={`filter-chip${genreFilter === g ? " active" : ""}`} onClick={() => setGenreFilter(g)}>
                        {g}{g !== "All" && <span className="chip-count">{books.filter(b=>b.genre===g).length}</span>}
                      </button>
                    ))}
                  </div>
                  <select className="sort-select" value={sortIdx} onChange={e => setSortIdx(+e.target.value)} aria-label="Sort books">
                    {SORT_OPTIONS.map((s,i) => <option key={i} value={i}>{s.label}</option>)}
                  </select>
                </div>

                {/* Error banner */}
                {fetchError && (
                  <div className="error-banner">
                    <span>⚠ Failed to load books: {fetchError}</span>
                    <button className="btn btn-ghost btn-sm" onClick={fetchBooks}>Retry</button>
                  </div>
                )}

                {/* Table */}
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style={{width:44}}></th>
                        <th>Title & Author</th>
                        <th>Genre</th>
                        <th>Year</th>
                        <th>Stock</th>
                        <th>Status</th>
                        <th style={{width:90}}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingBooks
                        ? <TableSkeleton rows={8} />
                        : paginated.length === 0
                        ? (
                          <tr><td colSpan={7}>
                            <div className="empty-state">
                              <div className="empty-icon">🔍</div>
                              <div className="empty-title">{search ? "No results found" : "No books yet"}</div>
                              <div className="empty-sub">{search ? `Try different keywords or clear the filter.` : "Add your first book to get started."}</div>
                              {search && <button className="btn btn-ghost btn-sm" style={{marginTop:12}} onClick={()=>{setSearch("");setGenreFilter("All")}}>Clear filters</button>}
                            </div>
                          </td></tr>
                        )
                        : paginated.map(book => {
                          const stockStatus = book.stock === 0 ? "out" : book.stock <= 3 ? "low" : "ok";
                          return (
                            <tr key={book.id} className="book-row">
                              <td><div className="book-cover-cell">{book.cover}</div></td>
                              <td>
                                <div className="book-title-cell">{book.title}</div>
                                <div className="book-author-cell">{book.author}</div>
                              </td>
                              <td><span className="genre-pill">{book.genre}</span></td>
                              <td className="muted-cell">{book.year}</td>
                              <td className="muted-cell">{book.stock}</td>
                              <td>
                                <span className={`stock-badge stock-${stockStatus}`}>
                                  {stockStatus === "out" ? "Out of Stock" : stockStatus === "low" ? "Low Stock" : "Available"}
                                </span>
                              </td>
                              <td>
                                <div className="action-btns">
                                  <button className="icon-btn edit-btn" onClick={() => setBookModal(book)} title="Edit book" aria-label={`Edit ${book.title}`}>✎</button>
                                  <button className="icon-btn del-btn"  onClick={() => setDeleteTarget(book)} title="Delete book" aria-label={`Delete ${book.title}`}>🗑</button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      }
                    </tbody>
                  </table>

                  {/* Pagination */}
                  {!loadingBooks && totalPages > 1 && (
                    <div className="pagination">
                      <span className="pag-info">Page {page} of {totalPages} · {filtered.length} results</span>
                      <div className="pag-btns">
                        <button className="pag-btn" onClick={() => setPage(1)}        disabled={page===1}>«</button>
                        <button className="pag-btn" onClick={() => setPage(p=>p-1)}   disabled={page===1}>‹</button>
                        {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
                          let p; if(totalPages<=5){p=i+1}else if(page<=3){p=i+1}else if(page>=totalPages-2){p=totalPages-4+i}else{p=page-2+i}
                          return <button key={p} className={`pag-btn${page===p?" active":""}`} onClick={()=>setPage(p)}>{p}</button>
                        })}
                        <button className="pag-btn" onClick={() => setPage(p=>p+1)}   disabled={page===totalPages}>›</button>
                        <button className="pag-btn" onClick={() => setPage(totalPages)} disabled={page===totalPages}>»</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── ACTIVE LOANS ─────────────────────────────────── */}
            {(activeNav === "loans" || activeNav === "overdue") && (
              <div className="loans-section">
                {loadingTx
                  ? <div className="loans-grid">{Array.from({length:6}).map((_,i)=>(
                      <div key={i} className="loan-card"><Skeleton h={120} /></div>
                    ))}</div>
                  : (() => {
                      const list = transactions.filter(t =>
                        activeNav === "overdue"
                          ? t.status === "active" && new Date(t.due_date + "T00:00:00") < new Date()
                          : t.status === "active"
                      );
                      if (list.length === 0) return (
                        <div className="empty-state" style={{marginTop:60}}>
                          <div className="empty-icon">✅</div>
                          <div className="empty-title">{activeNav === "overdue" ? "No overdue books" : "No active loans"}</div>
                          <div className="empty-sub">{activeNav === "overdue" ? "All loans are on time." : "No books are currently on loan."}</div>
                        </div>
                      );
                      return (
                        <div className="loans-grid">
                          {list.map(tx => {
                            const due = new Date(tx.due_date + "T00:00:00");
                            const diffDays = Math.round((due - new Date(new Date().toDateString())) / 86400000);
                            const isOverdue = diffDays < 0;
                            const isUrgent  = !isOverdue && diffDays <= 3;
                            return (
                              <div key={tx.id} className={`loan-card${isOverdue?" overdue":isUrgent?" urgent":""}`}>
                                <div className="loan-card-top">
                                  <div className="loan-book-cover">{books.find(b=>b.id===tx.book_id)?.cover ?? "📖"}</div>
                                  <div>
                                    <div className="loan-book-title">{tx.book_title}</div>
                                    <div className="loan-book-author">{tx.book_author}</div>
                                  </div>
                                </div>
                                <div className="loan-user">
                                  <span className="loan-user-icon">👤</span>{tx.user_name}
                                </div>
                                <div className="loan-dates">
                                  <div><div className="loan-date-label">Borrowed</div><div className="loan-date-val">{fmtDate(tx.borrowed_at)}</div></div>
                                  <div><div className="loan-date-label">Due</div><div className={`loan-date-val${isOverdue?" text-red":isUrgent?" text-amber":""}`}>{fmtDate(tx.due_date)}</div></div>
                                </div>
                                {isOverdue && <div className="overdue-badge">⚠ {Math.abs(diffDays)}d overdue</div>}
                                {isUrgent  && <div className="urgent-badge">⏰ Due in {diffDays}d</div>}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                }
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── MODALS ───────────────────────────────────────────── */}
      {bookModal === "add"           && <BookModal            onClose={()=>setBookModal(null)} onSave={handleAdd}    saving={saving} />}
      {bookModal && bookModal!=="add" && <BookModal book={bookModal} onClose={()=>setBookModal(null)} onSave={handleEdit} saving={saving} />}
      {deleteTarget                  && <DeleteModal book={deleteTarget} onClose={()=>setDeleteTarget(null)} onConfirm={handleDelete} saving={saving} />}

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  CSS
// ═══════════════════════════════════════════════════════════════════
const adminCss = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,600&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#f7f5f0;
  --surface:#ffffff;
  --surface2:#f0ede6;
  --border:#e5e0d8;
  --border2:#d8d2c8;
  --text:#1a1714;
  --muted:#9a9080;
  --muted2:#6e6860;
  --sidebar-bg:#1c1a14;
  --sidebar-border:rgba(255,255,255,0.06);
  --accent:#b85c28;
  --accent-dim:rgba(184,92,40,0.1);
  --accent-glow:rgba(184,92,40,0.25);
  --teal:#2a7d6e;
  --blue:#2563a8;
  --amber:#b87c28;
  --red:#b83228;
  --green:#2a7d4e;
  --purple:#6b3db8;
  --ff:'Fraunces',serif;
  --fb:'DM Sans',sans-serif;
  --sidebar-w:248px;
  --topbar-h:70px;
  --radius:10px;
}
body{font-family:var(--fb);background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased}

/* SHELL */
.admin-shell{display:flex;min-height:100vh}

/* SIDEBAR */
.sidebar{
  width:var(--sidebar-w);flex-shrink:0;background:var(--sidebar-bg);
  position:fixed;top:0;left:0;height:100vh;z-index:200;
  display:flex;flex-direction:column;border-right:1px solid var(--sidebar-border);
}
.sidebar-brand{display:flex;align-items:center;gap:12px;padding:24px 20px;border-bottom:1px solid var(--sidebar-border)}
.brand-mark{
  width:38px;height:38px;background:var(--accent);border-radius:9px;
  display:grid;place-items:center;font-family:var(--ff);font-size:20px;font-style:italic;
  color:#fff;font-weight:700;flex-shrink:0;
}
.brand-name{font-family:var(--ff);font-size:17px;font-style:italic;color:#fff;letter-spacing:-.01em}
.brand-sub{font-size:10px;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:.12em;margin-top:1px}
.sidebar-nav{flex:1;padding:16px 12px;display:flex;flex-direction:column;gap:3px;overflow-y:auto}
.nav-section{font-size:9.5px;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.25);padding:10px 10px 6px}
.nav-item{
  display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:8px;cursor:pointer;
  color:rgba(255,255,255,.45);font-size:13.5px;font-weight:500;
  transition:background .16s,color .16s;border:none;background:transparent;font-family:var(--fb);width:100%;text-align:left;
}
.nav-item:hover{background:rgba(255,255,255,.07);color:rgba(255,255,255,.82)}
.nav-item.active{background:rgba(184,92,40,.18);color:#f0c898;border:1px solid rgba(184,92,40,.25) !important}
.nav-item.active .nav-icon{color:#f0c898}
.nav-icon{font-size:15px;width:18px;text-align:center;flex-shrink:0;color:rgba(255,255,255,.3);transition:color .16s}
.nav-label{flex:1}
.nav-badge{
  background:rgba(255,255,255,.12);color:rgba(255,255,255,.6);
  font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:20px;min-width:22px;text-align:center;
}
.nav-badge.danger{background:rgba(184,50,40,.3);color:#f09898}
.sidebar-footer{padding:14px;border-top:1px solid var(--sidebar-border);display:flex;align-items:center;gap:10px}
.sf-user{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
.sf-avatar{width:34px;height:34px;border-radius:8px;background:rgba(184,92,40,.25);border:1px solid rgba(184,92,40,.3);display:grid;place-items:center;font-family:var(--ff);font-size:15px;font-style:italic;color:#f0c898;flex-shrink:0}
.sf-name{font-size:13px;font-weight:600;color:rgba(255,255,255,.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sf-role{font-size:10.5px;color:rgba(255,255,255,.3)}
.sf-logout{width:32px;height:32px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:transparent;cursor:pointer;color:rgba(255,255,255,.35);font-size:14px;display:grid;place-items:center;flex-shrink:0;transition:all .16s}
.sf-logout:hover{background:rgba(200,50,40,.2);color:#f08888;border-color:rgba(200,50,40,.3)}

/* MAIN */
.admin-main{margin-left:var(--sidebar-w);flex:1;display:flex;flex-direction:column;min-height:100vh}

/* TOPBAR */
.topbar{
  height:var(--topbar-h);background:var(--surface);border-bottom:1px solid var(--border);
  display:flex;align-items:center;justify-content:space-between;padding:0 32px;
  position:sticky;top:0;z-index:100;gap:20px;
}
.topbar-left{}
.topbar-title{font-family:var(--ff);font-size:22px;font-style:italic;font-weight:600;letter-spacing:-.02em;line-height:1.2}
.topbar-sub{font-size:12px;color:var(--muted);margin-top:2px}
.topbar-actions{display:flex;align-items:center;gap:10px;flex-shrink:0}

/* SEARCH */
.search-box{position:relative;display:flex;align-items:center}
.search-ico{position:absolute;left:12px;color:var(--muted);font-size:15px;pointer-events:none}
.search-inp{
  width:260px;background:var(--surface2);border:1.5px solid var(--border);border-radius:9px;
  padding:9px 32px 9px 34px;color:var(--text);font-family:var(--fb);font-size:13.5px;outline:none;
  transition:border-color .2s,box-shadow .2s,width .25s;
}
.search-inp:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-dim);width:320px}
.search-inp::placeholder{color:#c0b8ac}
.search-clear{position:absolute;right:10px;background:transparent;border:none;cursor:pointer;color:var(--muted);font-size:12px;width:18px;height:18px;display:grid;place-items:center;border-radius:50%;transition:background .15s}
.search-clear:hover{background:var(--border);color:var(--text)}

/* CONTENT */
.content{padding:28px 32px;flex:1}

/* SKELETON */
.skeleton{background:linear-gradient(90deg,var(--border) 25%,var(--surface2) 50%,var(--border) 75%);background-size:400% 100%;animation:shimmer 1.4s infinite;display:block}
@keyframes shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}

/* STAT GRID */
.stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:28px}
@media(max-width:1100px){.stat-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:700px){.stat-grid{grid-template-columns:1fr}}
.stat-card{
  background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);
  padding:22px 24px;position:relative;overflow:hidden;
  animation:fadeUp .4s cubic-bezier(.16,1,.3,1) both;
  transition:transform .2s,box-shadow .2s;
}
.stat-card:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,.08)}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px}
.stat-card.accent-teal::before{background:var(--teal)}
.stat-card.accent-blue::before{background:var(--blue)}
.stat-card.accent-amber::before{background:var(--amber)}
.stat-card.accent-red::before{background:var(--red)}
.stat-card.accent-green::before{background:var(--green)}
.stat-card.accent-purple::before{background:var(--purple)}
.stat-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.stat-label{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);font-weight:600}
.stat-icon-bg{font-size:22px;opacity:.5}
.stat-value{font-family:var(--ff);font-size:38px;font-weight:700;letter-spacing:-.04em;line-height:1;margin-bottom:6px}
.stat-sub{font-size:12px;color:var(--muted)}

/* OVERVIEW GRID */
.overview-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
@media(max-width:900px){.overview-grid{grid-template-columns:1fr}}
.ov-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px}
.ov-card-title{font-family:var(--ff);font-size:16px;font-style:italic;font-weight:600;margin-bottom:20px;letter-spacing:-.01em}
.genre-bars{display:flex;flex-direction:column;gap:10px}
.genre-bar-row{display:flex;align-items:center;gap:10px}
.genre-bar-label{font-size:12px;color:var(--muted2);width:100px;flex-shrink:0;text-align:right}
.genre-bar-track{flex:1;height:7px;background:var(--surface2);border-radius:4px;overflow:hidden}
.genre-bar-fill{height:100%;background:var(--accent);border-radius:4px;transition:width .8s cubic-bezier(.16,1,.3,1)}
.genre-bar-count{font-size:12px;font-weight:600;color:var(--muted2);width:24px;text-align:right}
.tx-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)}
.tx-row:last-child{border-bottom:none}
.tx-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.tx-dot[data-status="active"]{background:var(--teal)}
.tx-dot[data-status="returned"]{background:var(--green)}
.tx-dot[data-status="overdue"]{background:var(--red)}
.tx-info{flex:1;min-width:0}
.tx-title{font-size:13.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tx-meta{font-size:11.5px;color:var(--muted);margin-top:1px}
.tx-badge{font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px;text-transform:capitalize;flex-shrink:0}
.tx-badge.active{background:rgba(42,125,110,.12);color:var(--teal);border:1px solid rgba(42,125,110,.2)}
.tx-badge.returned{background:rgba(42,125,78,.1);color:var(--green);border:1px solid rgba(42,125,78,.2)}
.tx-badge.overdue{background:rgba(184,50,40,.1);color:var(--red);border:1px solid rgba(184,50,40,.2)}

/* FILTER ROW */
.filter-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.genre-filters{display:flex;gap:6px;flex-wrap:wrap;flex:1}
.filter-chip{
  padding:6px 13px;border-radius:20px;border:1.5px solid var(--border);background:transparent;
  font-family:var(--fb);font-size:12.5px;font-weight:500;color:var(--muted2);cursor:pointer;
  transition:all .16s;display:flex;align-items:center;gap:5px;
}
.filter-chip:hover{border-color:var(--border2);color:var(--text)}
.filter-chip.active{background:var(--accent-dim);border-color:rgba(184,92,40,.3);color:var(--accent)}
.chip-count{font-size:10.5px;background:var(--border);border-radius:10px;padding:1px 5px;color:var(--muted)}
.filter-chip.active .chip-count{background:rgba(184,92,40,.15);color:var(--accent)}
.sort-select{padding:7px 14px;border:1.5px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text);font-family:var(--fb);font-size:13px;outline:none;cursor:pointer;transition:border-color .2s}
.sort-select:focus{border-color:var(--accent)}

/* ERROR BANNER */
.error-banner{
  background:rgba(184,50,40,.08);border:1px solid rgba(184,50,40,.2);border-radius:var(--radius);
  padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;
  font-size:13.5px;color:var(--red);gap:12px;
}

/* TABLE */
.table-wrap{background:var(--surface);border:1.5px solid var(--border);border-radius:var(--radius);overflow:hidden}
table{width:100%;border-collapse:collapse}
thead tr{background:var(--surface2)}
th{padding:12px 16px;text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);font-weight:600;white-space:nowrap;border-bottom:1.5px solid var(--border)}
td{padding:13px 16px;border-bottom:1px solid var(--border);vertical-align:middle}
.book-row{transition:background .14s}
.book-row:last-child td{border-bottom:none}
.book-row:hover{background:rgba(184,92,40,.03)}
.book-cover-cell{width:34px;height:34px;background:var(--surface2);border-radius:8px;display:grid;place-items:center;font-size:18px}
.book-title-cell{font-size:14px;font-weight:600;color:var(--text)}
.book-author-cell{font-size:12px;color:var(--muted);margin-top:2px}
.muted-cell{color:var(--muted2);font-size:13.5px}
.genre-pill{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11.5px;font-weight:600;background:var(--accent-dim);color:var(--accent);border:1px solid rgba(184,92,40,.18)}
.stock-badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11.5px;font-weight:600}
.stock-ok {background:rgba(42,125,78,.1); color:var(--green); border:1px solid rgba(42,125,78,.2)}
.stock-low{background:rgba(184,124,40,.1);color:var(--amber); border:1px solid rgba(184,124,40,.2)}
.stock-out{background:rgba(184,50,40,.1); color:var(--red);   border:1px solid rgba(184,50,40,.2)}
.action-btns{display:flex;gap:7px}
.icon-btn{width:32px;height:32px;border-radius:7px;border:1.5px solid var(--border);background:transparent;cursor:pointer;font-size:14px;display:grid;place-items:center;transition:all .15s}
.edit-btn:hover{background:rgba(37,99,168,.1);border-color:rgba(37,99,168,.3);color:#2563a8}
.del-btn:hover{background:rgba(184,50,40,.1);border-color:rgba(184,50,40,.3);color:var(--red)}

/* EMPTY STATE */
.empty-state{padding:64px 0;text-align:center}
.empty-icon{font-size:46px;margin-bottom:14px;opacity:.45}
.empty-title{font-family:var(--ff);font-size:20px;font-style:italic;color:var(--text);margin-bottom:6px}
.empty-sub{font-size:13.5px;color:var(--muted);line-height:1.6}

/* PAGINATION */
.pagination{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-top:1px solid var(--border);background:var(--surface2)}
.pag-info{font-size:12.5px;color:var(--muted)}
.pag-btns{display:flex;gap:4px}
.pag-btn{width:32px;height:32px;border-radius:7px;border:1.5px solid var(--border);background:transparent;cursor:pointer;font-size:13px;display:grid;place-items:center;color:var(--muted2);transition:all .15s;font-family:var(--fb)}
.pag-btn:hover:not(:disabled){border-color:var(--border2);color:var(--text)}
.pag-btn:disabled{opacity:.35;cursor:not-allowed}
.pag-btn.active{background:var(--accent);border-color:var(--accent);color:#fff}

/* LOANS */
.loans-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.loan-card{background:var(--surface);border:1.5px solid var(--border);border-radius:var(--radius);padding:20px;transition:border-color .2s,box-shadow .2s}
.loan-card:hover{box-shadow:0 6px 24px rgba(0,0,0,.07)}
.loan-card.overdue{border-color:rgba(184,50,40,.35);background:linear-gradient(135deg,var(--surface),rgba(184,50,40,.03))}
.loan-card.urgent{border-color:rgba(184,124,40,.35)}
.loan-card-top{display:flex;gap:12px;align-items:flex-start;margin-bottom:14px}
.loan-book-cover{width:44px;height:44px;background:var(--surface2);border-radius:10px;display:grid;place-items:center;font-size:22px;flex-shrink:0}
.loan-book-title{font-size:14px;font-weight:600;line-height:1.3;margin-bottom:3px}
.loan-book-author{font-size:12px;color:var(--muted)}
.loan-user{font-size:12.5px;color:var(--muted2);margin-bottom:12px;display:flex;align-items:center;gap:6px}
.loan-user-icon{font-size:12px}
.loan-dates{display:grid;grid-template-columns:1fr 1fr;gap:10px;background:var(--surface2);border-radius:8px;padding:10px 12px;margin-bottom:10px}
.loan-date-label{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:3px}
.loan-date-val{font-size:13px;font-weight:500}
.text-red{color:var(--red)}.text-amber{color:var(--amber)}
.overdue-badge{background:rgba(184,50,40,.1);border:1px solid rgba(184,50,40,.2);border-radius:7px;padding:6px 12px;font-size:12.5px;font-weight:600;color:var(--red);text-align:center;animation:pulse 2s ease-in-out infinite}
.urgent-badge{background:rgba(184,124,40,.1);border:1px solid rgba(184,124,40,.2);border-radius:7px;padding:6px 12px;font-size:12.5px;font-weight:600;color:var(--amber);text-align:center}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.65}}

/* MODAL */
.modal-backdrop{position:fixed;inset:0;background:rgba(20,18,14,.6);backdrop-filter:blur(5px);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;animation:bfIn .2s}
@keyframes bfIn{from{opacity:0}to{opacity:1}}
.modal{background:var(--surface);border:1.5px solid var(--border);border-radius:16px;width:100%;max-width:540px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 32px 80px rgba(0,0,0,.25);animation:modalIn .25s cubic-bezier(.16,1,.3,1)}
@keyframes modalIn{from{opacity:0;transform:translateY(18px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
.modal-header{padding:24px 24px 0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.modal-title{font-family:var(--ff);font-size:20px;font-style:italic;font-weight:600;letter-spacing:-.02em}
.btn-close{width:30px;height:30px;border-radius:8px;border:1.5px solid var(--border);background:transparent;cursor:pointer;color:var(--muted);font-size:13px;display:grid;place-items:center;transition:all .15s;flex-shrink:0}
.btn-close:hover{background:rgba(184,50,40,.1);color:var(--red);border-color:rgba(184,50,40,.3)}
.modal-body{padding:20px 24px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:14px}
.modal-footer{padding:16px 24px;border-top:1.5px solid var(--border);display:flex;justify-content:flex-end;gap:10px;flex-shrink:0}

/* COVER PICKER */
.cover-grid{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px}
.cover-opt{width:36px;height:36px;border-radius:8px;border:1.5px solid var(--border);background:var(--surface2);cursor:pointer;font-size:18px;display:grid;place-items:center;transition:all .15s}
.cover-opt:hover{border-color:var(--border2);transform:scale(1.1)}
.cover-opt.selected{border-color:var(--accent);background:var(--accent-dim);transform:scale(1.1)}

/* FORM FIELDS */
.field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:520px){.field-row{grid-template-columns:1fr}}
.field{display:flex;flex-direction:column;gap:5px}
.field-label{font-size:11px;text-transform:uppercase;letter-spacing:.09em;color:var(--muted2);font-weight:600}
.field-input{
  background:var(--surface2);border:1.5px solid var(--border);border-radius:9px;
  padding:10px 13px;color:var(--text);font-family:var(--fb);font-size:13.5px;outline:none;
  transition:border-color .2s,box-shadow .2s;
}
.field-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-dim)}
.field-input.has-error{border-color:var(--red)!important;box-shadow:0 0 0 3px rgba(184,50,40,.1)!important}
.field-error{font-size:11.5px;color:var(--red);margin-top:2px}

/* BUTTONS */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:none;cursor:pointer;font-family:var(--fb);font-weight:600;border-radius:9px;transition:all .17s;font-size:13.5px;padding:10px 20px}
.btn:disabled{opacity:.5;cursor:not-allowed}
.btn-primary{background:var(--sidebar-bg);color:#fff}
.btn-primary:hover:not(:disabled){background:#2d2920;box-shadow:0 4px 16px rgba(0,0,0,.2)}
.btn-ghost{background:transparent;border:1.5px solid var(--border);color:var(--muted2)}
.btn-ghost:hover:not(:disabled){border-color:var(--border2);color:var(--text)}
.btn-danger{background:rgba(184,50,40,.1);border:1.5px solid rgba(184,50,40,.25);color:var(--red)}
.btn-danger:hover:not(:disabled){background:rgba(184,50,40,.18)}
.btn-sm{padding:7px 14px;font-size:12.5px}

/* TOAST */
.toast{
  padding:12px 18px;border-radius:11px;font-size:13.5px;font-weight:500;
  box-shadow:0 8px 28px rgba(0,0,0,.18);animation:toastIn .3s cubic-bezier(.16,1,.3,1);
  display:flex;align-items:center;gap:10px;min-width:240px;max-width:340px;
  background:var(--surface);border:1.5px solid var(--border);cursor:pointer;
}
@keyframes toastIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
.toast.toast-success{border-left:3px solid var(--green)}
.toast.toast-error  {border-left:3px solid var(--red)}
.toast.toast-info   {border-left:3px solid var(--teal)}
.toast-icon{font-size:15px;flex-shrink:0}

/* SPINNER */
.spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite;display:inline-block}
@keyframes spin{to{transform:rotate(360deg)}}
.btn-ghost .spinner,.btn-danger .spinner{border-color:rgba(0,0,0,.15);border-top-color:currentColor}

/* RESPONSIVE */
@media(max-width:900px){
  :root{--sidebar-w:0px}
  .sidebar{transform:translateX(-100%)}
  .admin-main{margin-left:0}
  .topbar{padding:0 20px}
  .content{padding:20px}
  .search-inp{width:200px}
  .search-inp:focus{width:220px}
}
`;
