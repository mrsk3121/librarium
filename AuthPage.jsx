import { useState, useContext, createContext, useEffect, useCallback } from "react";
import { $api } from "./lib.js";

// ═══════════════════════════════════════════════════════════════════
//  AUTH CONTEXT
// ═══════════════════════════════════════════════════════════════════
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("jwt_token"));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUser(payload);
      } catch { logout(); }
    }
    setReady(true);
  }, []);

  const login = useCallback((jwt, userData) => {
    localStorage.setItem("jwt_token", jwt);
    setToken(jwt);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("jwt_token");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// ═══════════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════════
const css = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:         #faf8f4;
  --surface:    #ffffff;
  --border:     #e8e3db;
  --border-f:   #c8bfb0;
  --text:       #1c1a17;
  --muted:      #9a9080;
  --muted2:     #6b6358;
  --ink:        #2d2820;
  --accent:     #c45c2e;
  --accent-dim: rgba(196,92,46,0.08);
  --accent-glow:rgba(196,92,46,0.2);
  --green:      #2e7d52;
  --green-dim:  rgba(46,125,82,0.1);
  --ff:  'Instrument Serif', serif;
  --fb:  'Instrument Sans', sans-serif;
}

body { font-family: var(--fb); background: var(--bg); color: var(--text); -webkit-font-smoothing: antialiased; }

/* LAYOUT */
.auth-shell {
  min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr;
}
@media(max-width:820px){ .auth-shell { grid-template-columns: 1fr; } .auth-hero { display: none; } }

/* HERO PANEL */
.auth-hero {
  background: var(--ink); position: relative; overflow: hidden;
  display: flex; flex-direction: column; justify-content: flex-end; padding: 56px;
}
.hero-pattern {
  position: absolute; inset: 0; opacity: .04;
  background-image: repeating-linear-gradient(0deg, transparent, transparent 39px, #fff 39px, #fff 40px),
    repeating-linear-gradient(90deg, transparent, transparent 39px, #fff 39px, #fff 40px);
}
.hero-orb {
  position: absolute; border-radius: 50%; filter: blur(70px); pointer-events: none;
}
.hero-orb-1 { width: 460px; height: 460px; background: radial-gradient(circle, rgba(196,92,46,.22), transparent 65%); top: -80px; right: -80px; }
.hero-orb-2 { width: 320px; height: 320px; background: radial-gradient(circle, rgba(100,160,255,.1), transparent 65%); bottom: 60px; left: -60px; }
.hero-books {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%,-54%);
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; width: 240px;
}
.hero-book {
  height: 120px; border-radius: 6px; display: flex; align-items: center; justify-content: center;
  font-size: 32px; opacity: .85;
  animation: bookFloat 6s ease-in-out infinite;
}
.hero-book:nth-child(1){ background:#3a3020; animation-delay: 0s;   height:140px; }
.hero-book:nth-child(2){ background:#2a2a3a; animation-delay: .8s;  height:110px; margin-top:30px; }
.hero-book:nth-child(3){ background:#2a3028; animation-delay: 1.6s; height:130px; }
.hero-book:nth-child(4){ background:#3a2a20; animation-delay: 2.4s; height:115px; }
.hero-book:nth-child(5){ background:#202838; animation-delay: 3.2s; height:145px; margin-top:-20px; }
.hero-book:nth-child(6){ background:#283028; animation-delay: 4.0s; height:108px; }
@keyframes bookFloat {
  0%,100% { transform: translateY(0); }
  50%      { transform: translateY(-8px); }
}
.hero-content { position: relative; z-index: 2; }
.hero-brand { font-family: var(--ff); font-size: 38px; color: #fff; font-style: italic; letter-spacing: -.02em; margin-bottom: 12px; }
.hero-brand span { font-style: normal; }
.hero-tagline { font-size: 15px; color: rgba(255,255,255,.45); line-height: 1.7; max-width: 300px; }
.hero-stat-row { display: flex; gap: 32px; margin-top: 28px; }
.hero-stat-val { font-family: var(--ff); font-size: 28px; color: #fff; font-style: italic; }
.hero-stat-label { font-size: 11px; color: rgba(255,255,255,.35); text-transform: uppercase; letter-spacing: .1em; margin-top: 2px; }

/* FORM PANEL */
.auth-form-panel {
  display: flex; align-items: center; justify-content: center; padding: 40px 24px;
  background: var(--bg);
}
.auth-card {
  width: 100%; max-width: 420px;
  animation: cardIn .5s cubic-bezier(.16,1,.3,1) both;
}
@keyframes cardIn {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

.auth-logo { font-family: var(--ff); font-size: 22px; color: var(--ink); font-style: italic; margin-bottom: 36px; }
.auth-logo span { font-style: normal; }

.auth-heading { font-family: var(--ff); font-size: 34px; font-style: italic; letter-spacing: -.02em; line-height: 1.1; margin-bottom: 6px; }
.auth-sub { font-size: 14px; color: var(--muted); margin-bottom: 32px; }

/* DEMO HINT */
.demo-hint {
  background: var(--accent-dim); border: 1px solid rgba(196,92,46,.18); border-radius: 10px;
  padding: 12px 14px; margin-bottom: 24px; font-size: 12.5px; color: var(--muted2); line-height: 1.7;
}
.demo-hint strong { color: var(--accent); }

/* FIELDS */
.field { margin-bottom: 18px; }
.field-label {
  display: block; font-size: 11.5px; font-weight: 600;
  text-transform: uppercase; letter-spacing: .08em; color: var(--muted2); margin-bottom: 7px;
}
.field-input {
  width: 100%; background: var(--surface); border: 1.5px solid var(--border);
  border-radius: 10px; padding: 12px 16px; color: var(--text);
  font-family: var(--fb); font-size: 14px; outline: none;
  transition: border-color .2s, box-shadow .2s;
}
.field-input::placeholder { color: #c5bdb4; }
.field-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-dim); }
.field-input.has-error { border-color: #d44; box-shadow: 0 0 0 3px rgba(204,68,68,.1); }

/* ALERTS */
.alert {
  border-radius: 10px; padding: 12px 14px; margin-bottom: 20px;
  font-size: 13.5px; display: flex; align-items: flex-start; gap: 10px;
}
.alert.error   { background: rgba(204,68,68,.08); border: 1px solid rgba(204,68,68,.2); color: #c33; }
.alert.success { background: var(--green-dim);     border: 1px solid rgba(46,125,82,.2); color: var(--green); }
.alert-icon { font-size: 15px; flex-shrink: 0; margin-top: 1px; }
@keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(3px)} }
.alert.error { animation: shake .4s cubic-bezier(.36,.07,.19,.97); }

/* BUTTONS */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  border: none; cursor: pointer; font-family: var(--fb); font-weight: 600;
  border-radius: 10px; transition: all .18s;
}
.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn-primary {
  width: 100%; padding: 13px; font-size: 15px; background: var(--ink); color: #fff; margin-top: 6px;
}
.btn-primary:hover:not(:disabled) { background: #3d3830; box-shadow: 0 4px 20px rgba(0,0,0,.2); }
.btn-link {
  background: transparent; color: var(--muted2); font-size: 13.5px; padding: 0;
  text-decoration: underline; text-underline-offset: 3px; text-decoration-color: transparent;
  transition: color .18s, text-decoration-color .18s;
}
.btn-link:hover { color: var(--accent); text-decoration-color: var(--accent); }

.divider { display: flex; align-items: center; gap: 12px; margin: 22px 0; }
.divider-line { flex: 1; height: 1px; background: var(--border); }
.divider-text { font-size: 12px; color: var(--muted); }

.spinner { width: 15px; height: 15px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.switch-row { text-align: center; margin-top: 24px; font-size: 13.5px; color: var(--muted); }
`;

// ═══════════════════════════════════════════════════════════════════
//  LOGIN FORM
// ═══════════════════════════════════════════════════════════════════
function LoginForm({ onSwitch }) {
  const { login } = useAuth();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) { setError("Please fill in all fields."); return; }
    setError(""); setLoading(true);
    try {
      const { token, user } = await $api.login({ email: email.trim(), password });
      login(token, user);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-card">
      <div className="auth-logo"><em>Libra</em><span>rium</span></div>
      <h1 className="auth-heading">Welcome back.</h1>
      <p className="auth-sub">Sign in to your account to continue.</p>

      <div className="demo-hint">
        <strong>Admin demo:</strong> admin@lib.com / admin123<br />
        <strong>User demo:</strong> demo@lib.com / user123
      </div>

      {error && (
        <div className="alert error">
          <span className="alert-icon">⚠</span>{error}
        </div>
      )}

      <div className="field">
        <label className="field-label">Email address</label>
        <input className={`field-input${error ? " has-error" : ""}`} type="email" placeholder="you@example.com"
          value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} autoFocus />
      </div>
      <div className="field">
        <label className="field-label">Password</label>
        <input className={`field-input${error ? " has-error" : ""}`} type="password" placeholder="••••••••"
          value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
      </div>

      <button className="btn btn-primary" onClick={submit} disabled={loading}>
        {loading ? <><span className="spinner" /> Signing in…</> : "Sign In →"}
      </button>

      <div className="divider"><div className="divider-line" /><span className="divider-text">or</span><div className="divider-line" /></div>

      <div className="switch-row">
        Don't have an account?{" "}
        <button className="btn btn-link" onClick={onSwitch}>Create one</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  REGISTER FORM
// ═══════════════════════════════════════════════════════════════════
function RegisterForm({ onSwitch }) {
  const { login } = useAuth();
  const [form, setForm]       = useState({ username: "", email: "", password: "" });
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    const { username, email, password } = form;
    if (!username.trim() || !email.trim() || !password) { setError("Please fill in all fields."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setError(""); setLoading(true);
    try {
      const { token, user } = await $api.register({ username: username.trim(), email: email.trim(), password });
      setSuccess("Account created! Redirecting…");
      setTimeout(() => login(token, user), 900);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-card">
      <div className="auth-logo"><em>Libra</em><span>rium</span></div>
      <h1 className="auth-heading">Create account.</h1>
      <p className="auth-sub">Join the library and start borrowing today.</p>

      {error   && <div className="alert error">  <span className="alert-icon">⚠</span>{error}</div>}
      {success && <div className="alert success"><span className="alert-icon">✓</span>{success}</div>}

      <div className="field">
        <label className="field-label">Full name</label>
        <input className={`field-input${error ? " has-error" : ""}`} type="text" placeholder="Your name"
          value={form.username} onChange={e => set("username", e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} autoFocus />
      </div>
      <div className="field">
        <label className="field-label">Email address</label>
        <input className={`field-input${error ? " has-error" : ""}`} type="email" placeholder="you@example.com"
          value={form.email} onChange={e => set("email", e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
      </div>
      <div className="field">
        <label className="field-label">Password</label>
        <input className={`field-input${error ? " has-error" : ""}`} type="password" placeholder="Min. 8 characters"
          value={form.password} onChange={e => set("password", e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
      </div>

      <button className="btn btn-primary" onClick={submit} disabled={loading}>
        {loading ? <><span className="spinner" /> Creating account…</> : "Create Account →"}
      </button>

      <div className="switch-row" style={{ marginTop: 20 }}>
        Already have an account?{" "}
        <button className="btn btn-link" onClick={onSwitch}>Sign in</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  HERO PANEL
// ═══════════════════════════════════════════════════════════════════
function HeroPanel() {
  const emojis = ["📖","🪐","⚡","🎨","🚀","🧠"];
  return (
    <div className="auth-hero">
      <div className="hero-pattern" />
      <div className="hero-orb hero-orb-1" />
      <div className="hero-orb hero-orb-2" />
      <div className="hero-books">
        {emojis.map((e, i) => <div key={i} className="hero-book">{e}</div>)}
      </div>
      <div className="hero-content">
        <div className="hero-brand"><em>Libra</em><span>rium</span></div>
        <div className="hero-tagline">A modern library management system. Borrow, track, and return books with ease.</div>
        <div className="hero-stat-row">
          <div><div className="hero-stat-val">2,400+</div><div className="hero-stat-label">Books</div></div>
          <div><div className="hero-stat-val">840</div>  <div className="hero-stat-label">Members</div></div>
          <div><div className="hero-stat-val">99.9%</div><div className="hero-stat-label">Uptime</div></div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  EXPORT
// ═══════════════════════════════════════════════════════════════════
export default function AuthPage() {
  const [page, setPage] = useState("login");
  return (
    <>
      <style>{css}</style>
      <div className="auth-shell">
        <HeroPanel />
        <div className="auth-form-panel">
          {page === "login"
            ? <LoginForm    onSwitch={() => setPage("register")} />
            : <RegisterForm onSwitch={() => setPage("login")}    />}
        </div>
      </div>
    </>
  );
}
