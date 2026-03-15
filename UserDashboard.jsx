import { useState, useEffect, useCallback, useRef } from "react";
import { $api, fmtDate, daysUntil, getDueStatus } from "./lib.js";
import { useAuth } from "./AuthPage.jsx";

// ═══════════════════════════════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════════════════════════════
function useToast() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);
  const dismiss = id => setToasts(t => t.filter(x => x.id !== id));
  return { toasts, push, dismiss };
}

function ToastStack({ toasts, dismiss }) {
  return (
    <div style={{ position:"fixed", bottom:28, right:28, zIndex:600, display:"flex", flexDirection:"column", gap:10, pointerEvents:"none" }}>
      {toasts.map(t => (
        <div key={t.id} className={`u-toast u-toast-${t.type}`} style={{pointerEvents:"auto"}} onClick={() => dismiss(t.id)}>
          <span>{t.type==="success"?"✓":t.type==="error"?"✕":"ℹ"}</span>{t.msg}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  SKELETON
// ═══════════════════════════════════════════════════════════════════
function Sk({ w="100%", h=14, r=6, style={} }) {
  return <div className="u-sk" style={{width:w,height:h,borderRadius:r,...style}} />;
}

// ═══════════════════════════════════════════════════════════════════
//  BORROW CONFIRM MODAL
// ═══════════════════════════════════════════════════════════════════
function BorrowModal({ book, onClose, onConfirm, loading }) {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);
  return (
    <div className="u-backdrop" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="u-modal" role="dialog" aria-modal="true">
        <button className="u-modal-close" onClick={onClose}>✕</button>
        <div className="bm-cover">{book.cover}</div>
        <h2 className="bm-title">{book.title}</h2>
        <p className="bm-author">{book.author} · {book.year}</p>
        {book.description && <p className="bm-desc">{book.description}</p>}
        <div className="bm-dates">
          <div><div className="bm-dl">Borrow Date</div><div className="bm-dv">{fmtDate(new Date().toISOString().slice(0,10))}</div></div>
          <div className="bm-div" />
          <div><div className="bm-dl">Due Date</div><div className="bm-dv amber">{fmtDate(dueDate.toISOString().slice(0,10))}</div></div>
        </div>
        <div className="bm-note">📋 14-day loan period. Return by <strong>{fmtDate(dueDate.toISOString().slice(0,10))}</strong> to avoid late fees.</div>
        <div className="bm-actions">
          <button className="u-btn u-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="u-btn u-btn-primary" onClick={onConfirm} disabled={loading}>
            {loading ? <><span className="u-spinner" /> Borrowing…</> : "✓ Confirm Borrow"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  BOOK DETAIL DRAWER  (opens on card click)
// ═══════════════════════════════════════════════════════════════════
function BookDrawer({ book, isBorrowed, activeTx, onClose, onBorrow, onReturn, actionLoading }) {
  const stockStatus = book.stock === 0 ? "out" : book.stock <= 3 ? "low" : "ok";
  return (
    <div className="drawer-backdrop" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="drawer">
        <button className="drawer-close" onClick={onClose}>✕</button>
        <div className="drawer-cover">{book.cover}</div>
        <div className="drawer-genre">{book.genre}</div>
        <h2 className="drawer-title">{book.title}</h2>
        <p className="drawer-author">{book.author}</p>
        <p className="drawer-year">{book.year}</p>
        {book.description && <p className="drawer-desc">{book.description}</p>}
        <div className="drawer-meta">
          <div className={`drawer-stock stock-${stockStatus}`}>
            {stockStatus==="out" ? "Out of Stock" : stockStatus==="low" ? `Only ${book.stock} left` : `${book.stock} copies available`}
          </div>
        </div>
        {isBorrowed && activeTx && (
          <div className="drawer-loan-info">
            <div className="dli-row"><span>Borrowed</span><strong>{fmtDate(activeTx.borrowed_at)}</strong></div>
            <div className="dli-row"><span>Due</span><strong className="amber">{fmtDate(activeTx.due_date)}</strong></div>
          </div>
        )}
        <div className="drawer-action">
          {isBorrowed
            ? <button className="u-btn u-btn-return" onClick={() => onReturn(activeTx)} disabled={actionLoading}>
                {actionLoading ? <><span className="u-spinner dark" /> Returning…</> : "↩ Return Book"}
              </button>
            : <button className="u-btn u-btn-primary" onClick={() => onBorrow(book)} disabled={book.stock===0 || actionLoading}>
                {book.stock===0 ? "Unavailable" : "Borrow This Book →"}
              </button>
          }
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN USER DASHBOARD
// ═══════════════════════════════════════════════════════════════════
const SORT_OPTIONS = [
  { label:"Title A–Z",    fn:(a,b)=>a.title.localeCompare(b.title) },
  { label:"Title Z–A",    fn:(a,b)=>b.title.localeCompare(a.title) },
  { label:"Newest",       fn:(a,b)=>b.year-a.year },
  { label:"Oldest",       fn:(a,b)=>a.year-b.year },
  { label:"Most Stock",   fn:(a,b)=>b.stock-a.stock },
];

export default function UserDashboard() {
  const { user, logout }          = useAuth();
  const { toasts, push, dismiss } = useToast();

  // Data
  const [books, setBooks]           = useState([]);
  const [transactions, setTx]       = useState([]);
  const [loadingBooks, setLB]       = useState(true);
  const [loadingTx, setLT]          = useState(true);
  const [fetchError, setFetchError] = useState("");

  // UI
  const [tab, setTab]               = useState("browse");
  const [search, setSearch]         = useState("");
  const [genreFilter, setGenreFilter] = useState("All");
  const [sortIdx, setSortIdx]       = useState(0);
  const [viewMode, setViewMode]     = useState("grid"); // grid | list

  // Modals
  const [borrowTarget, setBorrowTarget] = useState(null);
  const [drawerBook, setDrawerBook]     = useState(null);
  const [actionLoading, setActLoading]  = useState(null);

  const searchRef = useRef(null);

  // ── FETCH ──────────────────────────────────────────────────────
  const fetchBooks = useCallback(async () => {
    setLB(true); setFetchError("");
    try { setBooks(await $api.getBooks()); }
    catch (e) { setFetchError(e.message); push(e.message, "error"); }
    finally { setLB(false); }
  }, []);

  const fetchTx = useCallback(async () => {
    setLT(true);
    try { setTx(await $api.getMyTransactions()); }
    catch {}
    finally { setLT(false); }
  }, []);

  useEffect(() => { fetchBooks(); fetchTx(); }, [fetchBooks, fetchTx]);

  // ── DERIVED ───────────────────────────────────────────────────
  const activeTx    = transactions.filter(t => t.status === "active");
  const borrowedIds = new Map(activeTx.map(t => [t.book_id, t]));
  const overdueTx   = activeTx.filter(t => daysUntil(t.due_date) < 0);
  const urgentTx    = activeTx.filter(t => { const d = daysUntil(t.due_date); return d >= 0 && d <= 3; });

  const genres = ["All", ...Array.from(new Set(books.map(b => b.genre))).filter(Boolean).sort()];

  const filteredBooks = books
    .filter(b => {
      const q = search.toLowerCase();
      return (!q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || (b.description||"").toLowerCase().includes(q));
    })
    .filter(b => genreFilter === "All" || b.genre === genreFilter)
    .sort(SORT_OPTIONS[sortIdx].fn);

  // ── BORROW / RETURN ───────────────────────────────────────────
  const handleBorrow = async (book) => {
    setActLoading(book.id);
    try {
      const tx = await $api.borrowBook(book.id);
      setTx(prev => [tx, ...prev]);
      setBooks(prev => prev.map(b => b.id === book.id ? { ...b, stock: Math.max(0, b.stock-1) } : b));
      setBorrowTarget(null);
      setDrawerBook(null);
      push(`"${book.title}" borrowed! Due in 14 days.`, "info");
    } catch (e) { push(e.message, "error"); }
    finally { setActLoading(null); }
  };

  const handleReturn = async (tx) => {
    setActLoading(tx.id);
    try {
      await $api.returnBook(tx.id);
      setTx(prev => prev.map(x => x.id===tx.id ? {...x, status:"returned", returned_at:new Date().toISOString().slice(0,10)} : x));
      setBooks(prev => prev.map(b => b.id===tx.book_id ? { ...b, stock: b.stock+1 } : b));
      setDrawerBook(null);
      push(`"${tx.book_title}" returned successfully.`);
    } catch (e) { push(e.message, "error"); }
    finally { setActLoading(null); }
  };

  // ── KEYBOARD ──────────────────────────────────────────────────
  useEffect(() => {
    const h = e => { if ((e.metaKey||e.ctrlKey) && e.key==="k") { e.preventDefault(); searchRef.current?.focus(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const TABS = [
    { id:"browse",   label:"Catalog",    count: books.length },
    { id:"borrowed", label:"My Loans",   count: activeTx.length },
    { id:"history",  label:"History",    count: transactions.length },
  ];

  return (
    <>
      <style>{userCss}</style>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav className="u-nav">
        <div className="u-nav-brand"><em>Libra</em>rium</div>
        <div className="u-nav-tabs">
          {TABS.map(t => (
            <button key={t.id} className={`u-nav-tab${tab===t.id?" active":""}`} onClick={() => setTab(t.id)}>
              {t.label}
              {t.count > 0 && <span className={`u-nav-count${t.id==="borrowed"&&overdueTx.length>0?" danger":""}`}>{t.count}</span>}
            </button>
          ))}
        </div>
        <div className="u-nav-right">
          <div className="u-avatar">{user?.username?.[0]?.toUpperCase() ?? "U"}</div>
          <span className="u-nav-name">{user?.username}</span>
          <button className="u-logout" onClick={logout} title="Sign out">⏻</button>
        </div>
      </nav>

      <div className="u-page">

        {/* ── ALERT BANNERS ──────────────────────────────────── */}
        {overdueTx.length > 0 && (
          <div className="u-alert u-alert-danger">
            <span>⚠</span>
            <span>You have <strong>{overdueTx.length}</strong> overdue {overdueTx.length===1?"book":"books"}: {overdueTx.map(t=>t.book_title).join(", ")}. Please return immediately.</span>
            <button className="u-btn u-btn-ghost u-btn-sm" onClick={() => setTab("borrowed")}>View Loans →</button>
          </div>
        )}
        {urgentTx.length > 0 && overdueTx.length === 0 && (
          <div className="u-alert u-alert-warn">
            <span>⏰</span>
            <span><strong>{urgentTx.length}</strong> {urgentTx.length===1?"loan":"loans"} due within 3 days.</span>
            <button className="u-btn u-btn-ghost u-btn-sm" onClick={() => setTab("borrowed")}>View →</button>
          </div>
        )}

        {/* ── STAT CARDS ──────────────────────────────────────── */}
        <div className="u-stats">
          {[
            { label:"Books Available", val: books.filter(b=>b.stock>0).length, of: books.length, icon:"📚", color:"teal" },
            { label:"On Loan",         val: activeTx.length,                    icon:"🔄",         color:"blue" },
            { label:"Overdue",         val: overdueTx.length,                   icon:"⚠️",         color: overdueTx.length>0?"red":"green" },
            { label:"All Returned",    val: transactions.filter(t=>t.status==="returned").length, icon:"✅", color:"green" },
          ].map((s,i) => (
            <div key={i} className={`u-stat u-stat-${s.color}`} style={{animationDelay:`${i*60}ms`}}>
              <div className="u-stat-top">
                <div className="u-stat-label">{s.label}</div>
                <span className="u-stat-icon">{s.icon}</span>
              </div>
              <div className="u-stat-val">
                {loadingBooks ? <Sk w={50} h={34} /> : <>
                  {s.val}
                  {s.of !== undefined && <span className="u-stat-of">/{s.of}</span>}
                </>}
              </div>
            </div>
          ))}
        </div>

        {/* ═══════════ BROWSE TAB ══════════════════════════════ */}
        {tab === "browse" && (
          <>
            <div className="u-toolbar">
              <div className="u-search-wrap">
                <span className="u-search-ico">⌕</span>
                <input ref={searchRef} className="u-search-inp" placeholder="Search books, authors… ⌘K"
                  value={search} onChange={e => setSearch(e.target.value)} aria-label="Search books" />
                {search && <button className="u-search-clear" onClick={() => setSearch("")}>✕</button>}
              </div>
              <select className="u-sort-sel" value={sortIdx} onChange={e => setSortIdx(+e.target.value)}>
                {SORT_OPTIONS.map((s,i) => <option key={i} value={i}>{s.label}</option>)}
              </select>
              <div className="u-view-toggle">
                <button className={`u-vt-btn${viewMode==="grid"?" active":""}`} onClick={() => setViewMode("grid")} title="Grid view">⊞</button>
                <button className={`u-vt-btn${viewMode==="list"?" active":""}`} onClick={() => setViewMode("list")} title="List view">≡</button>
              </div>
            </div>

            {/* Genre chips */}
            <div className="u-genre-row">
              {genres.map(g => (
                <button key={g} className={`u-chip${genreFilter===g?" active":""}`} onClick={() => setGenreFilter(g)}>
                  {g}
                  {g !== "All" && <span className="u-chip-n">{books.filter(b=>b.genre===g).length}</span>}
                </button>
              ))}
            </div>

            {fetchError && (
              <div className="u-err-banner">⚠ {fetchError}
                <button className="u-btn u-btn-ghost u-btn-sm" onClick={fetchBooks}>Retry</button>
              </div>
            )}

            {/* Results count */}
            {!loadingBooks && (
              <div className="u-results-count">
                {filteredBooks.length === books.length
                  ? `${books.length} books in catalog`
                  : `${filteredBooks.length} of ${books.length} books`}
                {(search || genreFilter !== "All") && (
                  <button className="u-clear-link" onClick={() => { setSearch(""); setGenreFilter("All"); }}>Clear filters</button>
                )}
              </div>
            )}

            {/* Grid / List */}
            {loadingBooks ? (
              <div className={viewMode==="grid" ? "u-grid" : "u-list"}>
                {Array.from({length:8}).map((_,i) => (
                  viewMode==="grid"
                    ? <div key={i} className="u-card"><Sk h={100} r={10} /><div style={{padding:"14px 0 4px"}}><Sk h={14} /><Sk w="65%" h={11} style={{marginTop:8}} /><Sk w="40%" h={10} style={{marginTop:6}} /></div></div>
                    : <div key={i} className="u-list-row"><Sk w={44} h={44} r={10} /><div style={{flex:1}}><Sk h={14} w="50%" /><Sk h={11} w="30%" style={{marginTop:6}}/></div><Sk w={90} h={30} r={8}/></div>
                ))}
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="u-empty">
                <div className="u-empty-icon">🔍</div>
                <div className="u-empty-title">No books found</div>
                <div className="u-empty-sub">Try different keywords or remove filters.</div>
                <button className="u-btn u-btn-ghost" style={{marginTop:14}} onClick={()=>{setSearch("");setGenreFilter("All")}}>Clear all filters</button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="u-grid">
                {filteredBooks.map(book => {
                  const isBorrowed = borrowedIds.has(book.id);
                  const noStock    = book.stock === 0;
                  const lowStock   = book.stock <= 3 && book.stock > 0;
                  return (
                    <div key={book.id} className={`u-card${isBorrowed?" borrowed":""}${noStock?" out":""}`}
                         onClick={() => setDrawerBook(book)} style={{cursor:"pointer"}}>
                      <div className="u-card-cover">
                        {book.cover}
                        {isBorrowed && <div className="u-card-ribbon">On Loan</div>}
                        {!isBorrowed && noStock && <div className="u-card-ribbon out">Unavailable</div>}
                        {!isBorrowed && lowStock && <div className="u-card-ribbon low">Low Stock</div>}
                      </div>
                      <div className="u-card-body">
                        <div className="u-card-genre">{book.genre}</div>
                        <div className="u-card-title">{book.title}</div>
                        <div className="u-card-author">{book.author}</div>
                        <div className="u-card-footer">
                          <span className="u-card-year">{book.year}</span>
                          <button
                            className={`u-card-btn${isBorrowed?" return-btn":noStock?" disabled-btn":""}`}
                            onClick={e => { e.stopPropagation(); isBorrowed ? handleReturn(borrowedIds.get(book.id)) : setBorrowTarget(book); }}
                            disabled={(!isBorrowed && noStock) || actionLoading !== null}
                          >
                            {actionLoading === (isBorrowed ? borrowedIds.get(book.id)?.id : book.id) ? "…" :
                              isBorrowed ? "↩ Return" : noStock ? "N/A" : "Borrow"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="u-list">
                {filteredBooks.map(book => {
                  const isBorrowed = borrowedIds.has(book.id);
                  const noStock    = book.stock === 0;
                  return (
                    <div key={book.id} className="u-list-row" onClick={() => setDrawerBook(book)}>
                      <div className="u-list-cover">{book.cover}</div>
                      <div className="u-list-info">
                        <div className="u-list-title">{book.title}</div>
                        <div className="u-list-meta">{book.author} · {book.year} · <span className="u-list-genre">{book.genre}</span></div>
                      </div>
                      <div className={`u-list-stock stock-${noStock?"out":book.stock<=3?"low":"ok"}`}>
                        {noStock?"Out":isBorrowed?"On Loan":`${book.stock} left`}
                      </div>
                      <button
                        className={`u-btn${isBorrowed?" u-btn-return":noStock?" u-btn-ghost":" u-btn-primary"}`}
                        style={{fontSize:13,padding:"7px 16px"}}
                        onClick={e => { e.stopPropagation(); isBorrowed ? handleReturn(borrowedIds.get(book.id)) : setBorrowTarget(book); }}
                        disabled={(!isBorrowed && noStock) || actionLoading !== null}
                      >
                        {isBorrowed ? "↩ Return" : noStock ? "N/A" : "Borrow"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ═══════════ MY LOANS TAB ════════════════════════════ */}
        {tab === "borrowed" && (
          loadingTx ? (
            <div className="u-loans-grid">{Array.from({length:4}).map((_,i)=><div key={i} className="u-loan-card"><Sk h={160} r={10}/></div>)}</div>
          ) : activeTx.length === 0 ? (
            <div className="u-empty" style={{marginTop:48}}>
              <div className="u-empty-icon">📭</div>
              <div className="u-empty-title">No active loans</div>
              <div className="u-empty-sub">Browse the catalog and borrow a book to get started.</div>
              <button className="u-btn u-btn-primary" style={{marginTop:16}} onClick={() => setTab("browse")}>Browse Catalog →</button>
            </div>
          ) : (
            <div className="u-loans-grid">
              {activeTx.map(tx => {
                const status  = getDueStatus(tx);
                const days    = daysUntil(tx.due_date);
                const bookRef = books.find(b => b.id === tx.book_id);
                return (
                  <div key={tx.id} className={`u-loan-card status-${status}`}>
                    <div className="u-loan-top">
                      <div className="u-loan-cover">{bookRef?.cover ?? "📖"}</div>
                      <div className="u-loan-info">
                        <div className="u-loan-title">{tx.book_title}</div>
                        <div className="u-loan-author">{tx.book_author}</div>
                        <div className={`u-due-badge status-${status}`}>
                          {status==="overdue" ? `⚠ ${Math.abs(days)}d overdue` :
                           status==="urgent"  ? `⏰ Due in ${days}d` :
                           `✓ ${days} days left`}
                        </div>
                      </div>
                    </div>
                    <div className="u-loan-dates">
                      <div><div className="u-loan-dl">Borrowed</div><div className="u-loan-dv">{fmtDate(tx.borrowed_at)}</div></div>
                      <div><div className="u-loan-dl">Due Date</div><div className={`u-loan-dv${status==="overdue"?" text-red":status==="urgent"?" text-amber":""}`}>{fmtDate(tx.due_date)}</div></div>
                    </div>
                    <button className="u-btn u-btn-return u-btn-full" onClick={() => handleReturn(tx)} disabled={actionLoading !== null}>
                      {actionLoading===tx.id ? <><span className="u-spinner dark" /> Returning…</> : "↩ Return Book"}
                    </button>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ═══════════ HISTORY TAB ═════════════════════════════ */}
        {tab === "history" && (
          loadingTx ? (
            <div className="u-tx-wrap">{Array.from({length:6}).map((_,i)=><div key={i} style={{padding:"14px 18px",borderBottom:"1px solid var(--u-border)"}}><Sk h={14} /><Sk w="50%" h={11} style={{marginTop:6}}/></div>)}</div>
          ) : transactions.length === 0 ? (
            <div className="u-empty"><div className="u-empty-icon">📜</div><div className="u-empty-title">No history yet</div></div>
          ) : (
            <div className="u-tx-wrap">
              <div className="u-tx-header">
                <span>Book</span><span>Borrowed</span><span>Due</span><span>Returned</span><span>Status</span><span></span>
              </div>
              {transactions.map((tx, i) => {
                const status = getDueStatus(tx);
                const bookRef = books.find(b => b.id === tx.book_id);
                return (
                  <div className="u-tx-row" key={tx.id}>
                    <div className="u-tx-book">
                      <div className="u-tx-cover">{bookRef?.cover ?? "📖"}</div>
                      <div>
                        <div className="u-tx-title">{tx.book_title}</div>
                        <div className="u-tx-author">{tx.book_author}</div>
                      </div>
                    </div>
                    <div className="u-tx-date">{fmtDate(tx.borrowed_at)}</div>
                    <div className={`u-tx-date${status==="overdue"?" text-red":status==="urgent"?" text-amber":""}`}>{fmtDate(tx.due_date)}</div>
                    <div className="u-tx-date">{fmtDate(tx.returned_at)}</div>
                    <div>
                      <span className={`u-tx-badge status-${tx.status==="active"&&status==="overdue"?"overdue":tx.status}`}>
                        <span className="tx-dot" />
                        {tx.status==="active"&&status==="overdue"?"Overdue":tx.status==="active"?"Active":"Returned"}
                      </span>
                    </div>
                    <div>
                      {tx.status==="active" && (
                        <button className="u-btn u-btn-return" style={{fontSize:12.5,padding:"6px 14px"}}
                          onClick={() => handleReturn(tx)} disabled={actionLoading!==null}>
                          {actionLoading===tx.id ? <span className="u-spinner dark"/> : "↩"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* ── MODALS ─────────────────────────────────────────────── */}
      {borrowTarget && (
        <BorrowModal book={borrowTarget} onClose={() => setBorrowTarget(null)}
          onConfirm={() => handleBorrow(borrowTarget)} loading={actionLoading===borrowTarget.id} />
      )}
      {drawerBook && (
        <BookDrawer
          book={drawerBook}
          isBorrowed={borrowedIds.has(drawerBook.id)}
          activeTx={borrowedIds.get(drawerBook.id)}
          onClose={() => setDrawerBook(null)}
          onBorrow={book => { setDrawerBook(null); setBorrowTarget(book); }}
          onReturn={handleReturn}
          actionLoading={actionLoading !== null}
        />
      )}

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  CSS
// ═══════════════════════════════════════════════════════════════════
const userCss = `
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Nunito:wght@300;400;500;600;700&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --u-bg:#0b0f18;
  --u-surf:#131929;
  --u-surf2:#1a2236;
  --u-surf3:#212d43;
  --u-border:rgba(255,255,255,0.07);
  --u-border2:rgba(255,255,255,0.13);
  --u-text:#e8edf8;
  --u-muted:#7a849e;
  --u-muted2:#a0aabf;
  --u-teal:#38c4b8;
  --u-teal-dim:rgba(56,196,184,0.1);
  --u-teal-glow:rgba(56,196,184,0.22);
  --u-blue:#5b9cf6;
  --u-blue-dim:rgba(91,156,246,0.1);
  --u-amber:#f0b429;
  --u-amber-dim:rgba(240,180,41,0.12);
  --u-red:#f05252;
  --u-red-dim:rgba(240,82,82,0.12);
  --u-green:#48bb78;
  --u-green-dim:rgba(72,187,120,0.1);
  --u-ff:'Lora',serif;
  --u-fb:'Nunito',sans-serif;
  --u-nav-h:64px;
  --u-radius:12px;
}
body{font-family:var(--u-fb);background:var(--u-bg);color:var(--u-text);-webkit-font-smoothing:antialiased;min-height:100vh}

/* NAV */
.u-nav{
  height:var(--u-nav-h);background:rgba(11,15,24,0.9);backdrop-filter:blur(16px);
  border-bottom:1px solid var(--u-border);
  display:flex;align-items:center;gap:16px;padding:0 28px;position:sticky;top:0;z-index:100;
}
.u-nav-brand{font-family:var(--u-ff);font-size:20px;color:var(--u-teal);font-style:italic;margin-right:8px;flex-shrink:0}
.u-nav-tabs{display:flex;gap:2px;background:var(--u-surf);border:1px solid var(--u-border);border-radius:10px;padding:4px;flex:1;max-width:380px}
.u-nav-tab{flex:1;padding:7px 12px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;color:var(--u-muted);transition:all .17s;border:none;background:transparent;font-family:var(--u-fb);display:flex;align-items:center;justify-content:center;gap:6px}
.u-nav-tab.active{background:var(--u-surf2);color:var(--u-text);box-shadow:0 2px 8px rgba(0,0,0,.3)}
.u-nav-tab:hover:not(.active){color:var(--u-muted2)}
.u-nav-count{font-size:10.5px;font-weight:700;padding:2px 6px;border-radius:10px;background:rgba(255,255,255,.1)}
.u-nav-count.danger{background:var(--u-red-dim);color:var(--u-red)}
.u-nav-right{display:flex;align-items:center;gap:10px;margin-left:auto}
.u-avatar{width:34px;height:34px;border-radius:9px;background:var(--u-teal-dim);border:1px solid rgba(56,196,184,.25);display:grid;place-items:center;font-family:var(--u-ff);font-style:italic;font-size:15px;font-weight:700;color:var(--u-teal);flex-shrink:0}
.u-nav-name{font-size:13.5px;font-weight:600;color:var(--u-muted2);white-space:nowrap}
.u-logout{width:32px;height:32px;border-radius:8px;border:1px solid var(--u-border);background:transparent;cursor:pointer;color:var(--u-muted);font-size:14px;display:grid;place-items:center;transition:all .15s}
.u-logout:hover{background:var(--u-red-dim);color:var(--u-red);border-color:rgba(240,82,82,.3)}

/* PAGE */
.u-page{max-width:1280px;margin:0 auto;padding:28px 28px 60px}

/* ALERTS */
.u-alert{display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:10px;margin-bottom:16px;font-size:13.5px}
.u-alert-danger{background:var(--u-red-dim);border:1px solid rgba(240,82,82,.25);color:var(--u-red)}
.u-alert-warn{background:var(--u-amber-dim);border:1px solid rgba(240,180,41,.25);color:var(--u-amber)}
.u-alert span:first-child{font-size:16px;flex-shrink:0}
.u-alert span:nth-child(2){flex:1}

/* STATS */
.u-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px}
@media(max-width:900px){.u-stats{grid-template-columns:repeat(2,1fr)}}
@media(max-width:480px){.u-stats{grid-template-columns:1fr 1fr}}
.u-stat{background:var(--u-surf);border:1px solid var(--u-border);border-radius:var(--u-radius);padding:20px;position:relative;overflow:hidden;animation:uFadeUp .4s cubic-bezier(.16,1,.3,1) both;transition:border-color .2s,transform .2s}
.u-stat:hover{border-color:var(--u-border2);transform:translateY(-2px)}
@keyframes uFadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.u-stat::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px}
.u-stat-teal::after{background:var(--u-teal)}.u-stat-blue::after{background:var(--u-blue)}
.u-stat-green::after{background:var(--u-green)}.u-stat-red::after{background:var(--u-red)}
.u-stat-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.u-stat-label{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--u-muted);font-weight:700}
.u-stat-icon{font-size:20px;opacity:.5}
.u-stat-val{font-family:var(--u-ff);font-size:36px;font-weight:700;line-height:1;letter-spacing:-.03em}
.u-stat-teal .u-stat-val{color:var(--u-teal)}.u-stat-blue .u-stat-val{color:var(--u-blue)}
.u-stat-green .u-stat-val{color:var(--u-green)}.u-stat-red .u-stat-val{color:var(--u-red)}
.u-stat-of{font-size:16px;opacity:.4;letter-spacing:0}

/* TOOLBAR */
.u-toolbar{display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;align-items:center}
.u-search-wrap{flex:1;min-width:220px;position:relative;display:flex;align-items:center}
.u-search-ico{position:absolute;left:12px;color:var(--u-muted);font-size:15px;pointer-events:none}
.u-search-inp{width:100%;background:var(--u-surf);border:1.5px solid var(--u-border);border-radius:10px;padding:10px 32px 10px 35px;color:var(--u-text);font-family:var(--u-fb);font-size:13.5px;outline:none;transition:border-color .2s,box-shadow .2s}
.u-search-inp:focus{border-color:var(--u-teal);box-shadow:0 0 0 3px var(--u-teal-dim)}
.u-search-inp::placeholder{color:#3a4560}
.u-search-clear{position:absolute;right:10px;background:transparent;border:none;cursor:pointer;color:var(--u-muted);font-size:12px;padding:2px;transition:color .15s}
.u-search-clear:hover{color:var(--u-text)}
.u-sort-sel{background:var(--u-surf);border:1.5px solid var(--u-border);border-radius:10px;padding:9px 13px;color:var(--u-text);font-family:var(--u-fb);font-size:13px;outline:none;cursor:pointer;transition:border-color .2s}
.u-sort-sel:focus{border-color:var(--u-teal)}
.u-view-toggle{display:flex;gap:2px;background:var(--u-surf);border:1.5px solid var(--u-border);border-radius:10px;padding:3px}
.u-vt-btn{width:34px;height:34px;border-radius:8px;border:none;background:transparent;cursor:pointer;color:var(--u-muted);font-size:16px;display:grid;place-items:center;transition:all .15s}
.u-vt-btn.active{background:var(--u-surf2);color:var(--u-text)}
.u-vt-btn:hover:not(.active){color:var(--u-muted2)}

/* GENRE ROW */
.u-genre-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
.u-chip{padding:6px 13px;border-radius:20px;border:1.5px solid var(--u-border);background:transparent;font-family:var(--u-fb);font-size:12.5px;font-weight:600;color:var(--u-muted);cursor:pointer;transition:all .16s;display:flex;align-items:center;gap:5px}
.u-chip:hover{border-color:var(--u-border2);color:var(--u-muted2)}
.u-chip.active{background:var(--u-teal-dim);border-color:rgba(56,196,184,.3);color:var(--u-teal)}
.u-chip-n{font-size:10.5px;background:rgba(255,255,255,.08);border-radius:10px;padding:1px 5px}
.u-chip.active .u-chip-n{background:rgba(56,196,184,.15);color:var(--u-teal)}

/* RESULTS COUNT */
.u-results-count{font-size:12.5px;color:var(--u-muted);margin-bottom:14px;display:flex;align-items:center;gap:10px}
.u-clear-link{background:transparent;border:none;color:var(--u-teal);font-family:var(--u-fb);font-size:12.5px;cursor:pointer;text-decoration:underline;text-underline-offset:2px}

/* ERROR BANNER */
.u-err-banner{background:var(--u-red-dim);border:1px solid rgba(240,82,82,.2);border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13.5px;color:var(--u-red);display:flex;align-items:center;justify-content:space-between;gap:12px}

/* BOOK GRID */
.u-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
@media(max-width:600px){.u-grid{grid-template-columns:repeat(2,1fr)}}
.u-card{background:var(--u-surf);border:1.5px solid var(--u-border);border-radius:var(--u-radius);overflow:hidden;transition:transform .2s,box-shadow .2s,border-color .2s;animation:uCardIn .4s cubic-bezier(.16,1,.3,1) both}
@keyframes uCardIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.u-card:hover{transform:translateY(-4px);box-shadow:0 14px 36px rgba(0,0,0,.4);border-color:var(--u-border2)}
.u-card.borrowed{border-color:rgba(56,196,184,.3)}
.u-card.out{opacity:.65}
.u-card-cover{height:100px;display:flex;align-items:center;justify-content:center;font-size:44px;background:var(--u-surf2);position:relative}
.u-card-ribbon{position:absolute;top:8px;right:8px;font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px;text-transform:uppercase;letter-spacing:.05em;background:var(--u-teal-dim);color:var(--u-teal);border:1px solid rgba(56,196,184,.25)}
.u-card-ribbon.out{background:var(--u-red-dim);color:var(--u-red);border-color:rgba(240,82,82,.25)}
.u-card-ribbon.low{background:var(--u-amber-dim);color:var(--u-amber);border-color:rgba(240,180,41,.25)}
.u-card-body{padding:14px}
.u-card-genre{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--u-teal);font-weight:700;margin-bottom:5px}
.u-card-title{font-family:var(--u-ff);font-size:13.5px;font-weight:600;line-height:1.35;margin-bottom:3px;letter-spacing:-.01em}
.u-card-author{font-size:11.5px;color:var(--u-muted);margin-bottom:10px}
.u-card-footer{display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--u-border);padding-top:10px}
.u-card-year{font-size:11px;color:var(--u-muted)}
.u-card-btn{padding:5px 12px;border-radius:8px;border:1.5px solid rgba(56,196,184,.3);background:var(--u-teal-dim);color:var(--u-teal);font-size:12px;font-weight:700;cursor:pointer;transition:all .16s;font-family:var(--u-fb)}
.u-card-btn:hover:not(:disabled){background:rgba(56,196,184,.2);box-shadow:0 0 10px var(--u-teal-glow)}
.u-card-btn.return-btn{background:var(--u-amber-dim);border-color:rgba(240,180,41,.3);color:var(--u-amber)}
.u-card-btn.disabled-btn{background:transparent;border-color:var(--u-border);color:var(--u-muted);cursor:not-allowed}
.u-card-btn:disabled{opacity:.5;cursor:not-allowed}

/* BOOK LIST */
.u-list{display:flex;flex-direction:column;gap:8px}
.u-list-row{background:var(--u-surf);border:1.5px solid var(--u-border);border-radius:var(--u-radius);padding:14px 18px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:border-color .17s,background .17s}
.u-list-row:hover{border-color:var(--u-border2);background:rgba(255,255,255,.02)}
.u-list-cover{width:44px;height:44px;background:var(--u-surf2);border-radius:10px;display:grid;place-items:center;font-size:22px;flex-shrink:0}
.u-list-info{flex:1;min-width:0}
.u-list-title{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.u-list-meta{font-size:12px;color:var(--u-muted);margin-top:3px}
.u-list-genre{color:var(--u-teal)}
.u-list-stock{font-size:12px;font-weight:600;white-space:nowrap;padding:3px 10px;border-radius:20px;margin-right:8px}
.stock-ok{background:var(--u-green-dim);color:var(--u-green);border:1px solid rgba(72,187,120,.2)}
.stock-low{background:var(--u-amber-dim);color:var(--u-amber);border:1px solid rgba(240,180,41,.2)}
.stock-out{background:var(--u-red-dim);color:var(--u-red);border:1px solid rgba(240,82,82,.2)}

/* EMPTY */
.u-empty{padding:72px 0;text-align:center}
.u-empty-icon{font-size:50px;margin-bottom:14px;opacity:.4}
.u-empty-title{font-family:var(--u-ff);font-size:22px;font-style:italic;margin-bottom:8px}
.u-empty-sub{font-size:14px;color:var(--u-muted);line-height:1.6}

/* LOANS GRID */
.u-loans-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:16px}
.u-loan-card{background:var(--u-surf);border:1.5px solid var(--u-border);border-radius:var(--u-radius);padding:20px;display:flex;flex-direction:column;gap:14px;transition:border-color .2s}
.u-loan-card.status-overdue{border-color:rgba(240,82,82,.35);background:linear-gradient(135deg,var(--u-surf),rgba(240,82,82,.04))}
.u-loan-card.status-urgent{border-color:rgba(240,180,41,.3)}
.u-loan-top{display:flex;gap:12px;align-items:flex-start}
.u-loan-cover{width:46px;height:46px;background:var(--u-surf2);border-radius:10px;display:grid;place-items:center;font-size:24px;flex-shrink:0}
.u-loan-info{flex:1}
.u-loan-title{font-family:var(--u-ff);font-size:15px;font-weight:600;line-height:1.3;margin-bottom:3px}
.u-loan-author{font-size:12px;color:var(--u-muted);margin-bottom:8px}
.u-due-badge{display:inline-flex;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700}
.u-due-badge.status-ok{background:var(--u-green-dim);color:var(--u-green);border:1px solid rgba(72,187,120,.2)}
.u-due-badge.status-urgent{background:var(--u-amber-dim);color:var(--u-amber);border:1px solid rgba(240,180,41,.2);animation:upulse 2s ease-in-out infinite}
.u-due-badge.status-overdue{background:var(--u-red-dim);color:var(--u-red);border:1px solid rgba(240,82,82,.2);animation:upulse 1.5s ease-in-out infinite}
@keyframes upulse{0%,100%{opacity:1}50%{opacity:.6}}
.u-loan-dates{display:grid;grid-template-columns:1fr 1fr;gap:10px;background:var(--u-surf2);border-radius:9px;padding:11px 14px}
.u-loan-dl{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--u-muted);margin-bottom:4px}
.u-loan-dv{font-size:13.5px;font-weight:600}
.text-red{color:var(--u-red)}.text-amber{color:var(--u-amber)}
.amber{color:var(--u-amber)}

/* TRANSACTIONS */
.u-tx-wrap{background:var(--u-surf);border:1.5px solid var(--u-border);border-radius:var(--u-radius);overflow:hidden}
.u-tx-header{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 80px;gap:10px;padding:12px 18px;background:var(--u-surf2);font-size:10.5px;text-transform:uppercase;letter-spacing:.1em;color:var(--u-muted);font-weight:700;border-bottom:1px solid var(--u-border)}
.u-tx-row{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 80px;gap:10px;padding:14px 18px;border-bottom:1px solid var(--u-border);align-items:center;transition:background .14s}
.u-tx-row:last-child{border-bottom:none}
.u-tx-row:hover{background:rgba(255,255,255,.02)}
.u-tx-book{display:flex;align-items:center;gap:10px}
.u-tx-cover{width:32px;height:32px;background:var(--u-surf2);border-radius:8px;display:grid;place-items:center;font-size:16px;flex-shrink:0}
.u-tx-title{font-size:13.5px;font-weight:600}
.u-tx-author{font-size:11.5px;color:var(--u-muted);margin-top:1px}
.u-tx-date{font-size:12.5px;color:var(--u-muted2)}
.u-tx-badge{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;padding:4px 10px;border-radius:20px;text-transform:capitalize}
.u-tx-badge.status-active{background:var(--u-teal-dim);color:var(--u-teal);border:1px solid rgba(56,196,184,.2)}
.u-tx-badge.status-returned{background:var(--u-green-dim);color:var(--u-green);border:1px solid rgba(72,187,120,.2)}
.u-tx-badge.status-overdue{background:var(--u-red-dim);color:var(--u-red);border:1px solid rgba(240,82,82,.2)}
.tx-dot{width:6px;height:6px;border-radius:50%;background:currentColor}
@media(max-width:900px){.u-tx-header,.u-tx-row{grid-template-columns:1fr 1fr 1fr auto}.u-tx-header span:nth-child(3),.u-tx-header span:nth-child(4),.u-tx-row>div:nth-child(3),.u-tx-row>div:nth-child(4){display:none}}

/* BORROW MODAL */
.u-backdrop{position:fixed;inset:0;background:rgba(5,8,15,.8);backdrop-filter:blur(8px);z-index:500;display:flex;align-items:center;justify-content:center;padding:24px;animation:ubfIn .2s}
@keyframes ubfIn{from{opacity:0}to{opacity:1}}
.u-modal{background:var(--u-surf);border:1.5px solid var(--u-border2);border-radius:18px;width:100%;max-width:420px;padding:32px;box-shadow:0 40px 100px rgba(0,0,0,.6);animation:umIn .25s cubic-bezier(.16,1,.3,1);position:relative;text-align:center}
@keyframes umIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
.u-modal-close{position:absolute;top:16px;right:16px;width:30px;height:30px;border-radius:8px;border:1.5px solid var(--u-border);background:transparent;cursor:pointer;color:var(--u-muted);font-size:13px;display:grid;place-items:center;transition:all .15s}
.u-modal-close:hover{background:var(--u-red-dim);color:var(--u-red)}
.bm-cover{font-size:64px;margin-bottom:14px;display:block}
.bm-title{font-family:var(--u-ff);font-size:22px;font-style:italic;font-weight:600;margin-bottom:5px;line-height:1.2}
.bm-author{font-size:13px;color:var(--u-muted);margin-bottom:16px}
.bm-desc{font-size:13px;color:var(--u-muted2);line-height:1.65;margin-bottom:18px;text-align:left;background:var(--u-surf2);border-radius:10px;padding:12px 14px}
.bm-dates{display:flex;align-items:center;justify-content:center;gap:24px;background:var(--u-surf2);border-radius:10px;padding:14px;margin-bottom:14px}
.bm-div{width:1px;height:32px;background:var(--u-border)}
.bm-dl{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--u-muted);margin-bottom:5px}
.bm-dv{font-size:14px;font-weight:700}
.bm-dv.amber{color:var(--u-amber)}
.bm-note{font-size:12.5px;color:var(--u-muted2);background:var(--u-teal-dim);border:1px solid rgba(56,196,184,.15);border-radius:9px;padding:11px 13px;line-height:1.6;margin-bottom:20px;text-align:left}
.bm-actions{display:flex;gap:10px}

/* BOOK DRAWER */
.drawer-backdrop{position:fixed;inset:0;background:rgba(5,8,15,.7);backdrop-filter:blur(6px);z-index:400;display:flex;align-items:stretch;justify-content:flex-end;animation:dbfIn .2s}
@keyframes dbfIn{from{opacity:0}to{opacity:1}}
.drawer{width:340px;max-width:90vw;background:var(--u-surf);border-left:1.5px solid var(--u-border2);padding:32px 24px;overflow-y:auto;position:relative;animation:drawerIn .28s cubic-bezier(.16,1,.3,1)}
@keyframes drawerIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
.drawer-close{position:absolute;top:16px;right:16px;width:30px;height:30px;border-radius:8px;border:1.5px solid var(--u-border);background:transparent;cursor:pointer;color:var(--u-muted);font-size:13px;display:grid;place-items:center;transition:all .15s}
.drawer-close:hover{background:var(--u-red-dim);color:var(--u-red)}
.drawer-cover{font-size:60px;margin-bottom:16px;display:block;text-align:center}
.drawer-genre{font-size:10.5px;text-transform:uppercase;letter-spacing:.1em;color:var(--u-teal);font-weight:700;margin-bottom:8px;text-align:center}
.drawer-title{font-family:var(--u-ff);font-size:22px;font-style:italic;font-weight:600;text-align:center;line-height:1.25;margin-bottom:6px}
.drawer-author{text-align:center;font-size:13.5px;color:var(--u-muted2);margin-bottom:4px}
.drawer-year{text-align:center;font-size:12px;color:var(--u-muted);margin-bottom:16px}
.drawer-desc{font-size:13.5px;color:var(--u-muted2);line-height:1.7;background:var(--u-surf2);border-radius:10px;padding:14px;margin-bottom:16px}
.drawer-meta{margin-bottom:16px;text-align:center}
.drawer-stock{display:inline-block;font-size:12.5px;font-weight:700;padding:5px 14px;border-radius:20px}
.drawer-loan-info{background:var(--u-surf2);border-radius:10px;padding:12px 14px;margin-bottom:16px}
.dli-row{display:flex;justify-content:space-between;font-size:13px;padding:4px 0}
.dli-row span{color:var(--u-muted)}
.drawer-action{margin-top:auto;padding-top:12px}

/* BUTTONS */
.u-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:none;cursor:pointer;font-family:var(--u-fb);font-weight:700;border-radius:10px;transition:all .17s;font-size:14px;padding:11px 22px}
.u-btn:disabled{opacity:.45;cursor:not-allowed}
.u-btn-primary{background:var(--u-teal);color:#0b0f18}
.u-btn-primary:hover:not(:disabled){filter:brightness(1.08);box-shadow:0 4px 18px var(--u-teal-glow)}
.u-btn-return{background:var(--u-amber-dim);border:1.5px solid rgba(240,180,41,.25);color:var(--u-amber)}
.u-btn-return:hover:not(:disabled){background:rgba(240,180,41,.2)}
.u-btn-ghost{background:transparent;border:1.5px solid var(--u-border2);color:var(--u-muted2)}
.u-btn-ghost:hover:not(:disabled){border-color:var(--u-border2);color:var(--u-text)}
.u-btn-sm{padding:7px 14px;font-size:12.5px}
.u-btn-full{width:100%}

/* SKELETON */
.u-sk{background:linear-gradient(90deg,var(--u-surf2) 25%,var(--u-surf3) 50%,var(--u-surf2) 75%);background-size:400% 100%;animation:uskShimmer 1.4s infinite;display:block}
@keyframes uskShimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}

/* TOAST */
.u-toast{padding:12px 18px;border-radius:11px;font-size:13.5px;font-weight:600;box-shadow:0 8px 28px rgba(0,0,0,.5);animation:utoastIn .3s cubic-bezier(.16,1,.3,1);display:flex;align-items:center;gap:10px;min-width:240px;max-width:340px;background:var(--u-surf);border:1.5px solid var(--u-border);cursor:pointer}
@keyframes utoastIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
.u-toast-success{border-left:3px solid var(--u-green)}
.u-toast-error{border-left:3px solid var(--u-red)}
.u-toast-info{border-left:3px solid var(--u-teal)}

/* SPINNER */
.u-spinner{width:14px;height:14px;border:2px solid rgba(11,15,24,.25);border-top-color:currentColor;border-radius:50%;animation:uspin .6s linear infinite;display:inline-block}
.u-spinner.dark{border-color:rgba(255,255,255,.2);border-top-color:currentColor}
@keyframes uspin{to{transform:rotate(360deg)}}

@media(max-width:640px){
  .u-nav{padding:0 16px}.u-nav-name{display:none}
  .u-page{padding:16px 16px 40px}
  .u-nav-tabs{flex:none}
  .drawer{width:100%;max-width:100%}
}
`;
