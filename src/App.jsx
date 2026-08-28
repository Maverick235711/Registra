import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "./firebase";
import AutoFillPage from "./AutoFillPage";
import registraLogo from "./registra-logo.png";
import registralogo1 from "./registra-logo1.png";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import DocumentsPage from "./Documentspage";

import { createClient } from "@supabase/supabase-js";
import "./App.css";

/* ============================================================
   Supabase client
   ============================================================ */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
window.supabase = supabase;

/* ============================================================
   Static reference data
   ============================================================ */
const EXAMS = [
  { id: "jee", name: "JEE Main", icon: "🚀", color: "#7c3aed", date: "2027-01-24", link: "https://jeemain.nta.nic.in" },
  { id: "neet", name: "NEET UG", icon: "🩺", color: "#10b981", date: "2027-05-03", link: "https://neet.nta.nic.in" },
  { id: "upsc", name: "UPSC CSE", icon: "🏛️", color: "#f59e0b", date: "2027-05-26", link: "https://upsc.gov.in" },
  { id: "ssc", name: "SSC CGL", icon: "📋", color: "#2563eb", date: "2026-08-09", link: "https://ssc.nic.in" },
  { id: "cat", name: "CAT", icon: "📊", color: "#ef4444", date: "2026-11-29", link: "https://iimcat.ac.in" },
];

const CHEATSHEET_FIELDS = [
  { key: "full_name", label: "Full Name" },
  { key: "dob", label: "Date of Birth" },
  { key: "father_Name", label: "Father's Name" },
  { key: "mother_Name", label: "Mother's Name" },
  { key: "aadhar", label: "Aadhar Number" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "pincode", label: "Pincode" },
  { key: "class10", label: "Class 10 Roll No." },
  { key: "class12", label: "Class 12 Roll No." },
];

const CHECKLIST_TEMPLATE = [
  "Read full information bulletin",
  "Keep scanned photo ready (200x230px, <50KB)",
  "Keep scanned signature ready (140x60px, <20KB)",
  "Keep Aadhar / ID proof scanned copy",
  "Check category certificate (if applicable)",
  "Verify class 10 & 12 marksheet numbers",
  "Note down application fee & payment mode",
  "Set a reminder 2 days before deadline",
  "Take printout of confirmation page",
  "Save admit card download date",
];

const QUOTES = [
  "Discipline beats motivation when the deadline doesn't wait.",
  "Every form you fill right today is one less panic tomorrow.",
  "Small consistent prep wins over last-night cramming.",
  "Your future rank starts with today's checklist.",
  "Stay sharp. Stay ready. Stay ahead.",
];

/* ============================================================
   Small helpers
   ============================================================ */
function daysUntil(dateStr) {
  const target = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  return diff;
}

function initialsOf(name, email) {
  const src = (name || email || "?").trim();
  return src.slice(0, 1).toUpperCase();
}

/* ============================================================
   Image Processor (New)
   ============================================================ */
async function processImage(file, options = {}) {
  const { maxWidth = 800, maxHeight = 800, quality = 0.88, targetSizeKB = null } = options;
  
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) { height = (maxWidth / width) * height; width = maxWidth; }
      if (height > maxHeight) { width = (maxHeight / height) * width; height = maxHeight; }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      let dataUrl = canvas.toDataURL("image/jpeg", quality);

      if (targetSizeKB) {
        let q = quality;
        while ((dataUrl.length * 0.75) / 1024 > targetSizeKB && q > 0.5) {
          q -= 0.05;
          dataUrl = canvas.toDataURL("image/jpeg", q);
        }
      }

      resolve({
        dataUrl,
        sizeKB: (dataUrl.length * 0.75) / 1024,
        width: Math.round(width),
        height: Math.round(height)
      });
    };
    img.src = URL.createObjectURL(file);
  });
} 

/* ============================================================
   Loader
   ============================================================ */
function Loader({ label = "Loading" }) {
  return (
    <div className="loader-root">
      <BgMesh />
      <div className="loader">
        <div className="loader-ring" />
        <span>
          {label}
          <span className="dots" />
        </span>
      </div>
    </div>
  );
}

/* ============================================================
   Ambient animated background
   ============================================================ */
function BgMesh() {
  return (
    <div className="bg-mesh" aria-hidden="true">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <div className="grid-overlay" />
    </div>
  );
}

/* ============================================================
   Toast
   ============================================================ */
function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  if (!message) return null;
  return (
    <div className="toast pop-in">
      <span className="toast-icon">✓</span>
      <span>{message}</span>
    </div>
  );
}

/* ============================================================
   Auth screen - CUSTOM REGISTRA LOGIN (NO SUPABASE DEFAULT UI)
   ============================================================ */

const googleLogin = async (showToast) => {
  if (!supabase) {
    showToast("Supabase not configured");
    return;
  }

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}`,
        skipBrowserRedirect: false,
      },
    });

    if (error) {
      console.error("Google login error:", error);
      showToast("Google login failed");
    }
  } catch (err) {
    console.error(err);
    showToast("Error during login");
  }
};

function AuthScreen({ onAuthed, showToast }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!supabase) {
      setError("Backend not configured — missing Supabase env vars.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        showToast("Welcome back!");
      } else {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        showToast("Account created — check your inbox!");
      }
      onAuthed();
    } catch (err) {
      setError(err.message || "Something went wrong");
      setShake(true);
      setTimeout(() => setShake(false), 400);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-root">
      <BgMesh />
      <div className="auth-card page-enter page-enter-active">
        
        {/* LOGO SIDE */}
        <div className="auth-visual fade-up">
          <img src={registralogo1} alt="Registra" className="auth-logo-big" />
          <p className="auth-tagline">One profile. Every exam. Zero last-minute panic.</p>
        </div>

        {/* Login Form Side */}
        <div className={`glass-card auth-form fade-up delay-1 ${shake ? "shake" : ""}`}>
          <div className="auth-header">
            <div>
              <div className="auth-title">{mode === "login" ? "Welcome to Registra" : "Create your Registra vault"}</div>
              <div className="auth-sub">
                {mode === "login" ? "Log in to access your saved profile" : "One signup, every exam form ready"}
              </div>
            </div>
            <span className="monospace-tag">{mode === "login" ? "LOGIN" : "SIGNUP"}</span>
          </div>

          {error && <div className="err" style={{ marginBottom: 12 }}>{error}</div>}

          <form onSubmit={submit} className="auth-fields">
            <div className="field field-animate">
              <label className="label" htmlFor="email">Email</label>
              <input 
                id="email" 
                className="input" 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="you@example.com" 
              />
            </div>
            <div className="field field-animate delay-1">
              <label className="label" htmlFor="password">Password</label>
              <input 
                id="password" 
                className="input" 
                type="password" 
                required 
                minLength={6}
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
              />
            </div>

            <div className="auth-actions">
              <button className="btn primary glow-btn" type="submit" disabled={busy}>
                {busy ? "Please wait…" : mode === "login" ? "Log in to Registra" : "Sign up for Registra"}
              </button>
            </div>
          </form>

          <div style={{ position: "relative", margin: "16px 0" }}>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }} />
            <span style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", background: "rgba(15, 23, 42, 0.8)", padding: "0 8px", fontSize: "12px", color: "#999" }}>OR</span>
          </div>

          <button
            type="button"
            className="btn ghost"
            onClick={() => googleLogin(showToast)}
            disabled={busy}
            style={{ 
              marginTop: 12, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              gap: "10px",
              width: "100%"
            }}
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              width="20"
              alt="Google"
            />
            Continue with Google
          </button>

          <div className="auth-footer-row">
            <span className="muted">
              {mode === "login" ? "New to Registra?" : "Already have a Registra account?"}
            </span>
            <button 
              type="button"
              className="linkish"
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
            >
              {mode === "login" ? "Create an account" : "Log in instead"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Nav
   ============================================================ */
const TABS = [
  { id: "autofill", label: "⚡ AutoFill" },
  { id: "home", label: "Home" },
  { id: "profile", label: "Profile" },
  { id: "calendar", label: "Calendar" },
  { id: "cheatsheet", label: "Cheatsheet" },
  { id: "checklist", label: "Checklist" },
  { id: "specs", label: "Photo Specs" },
  { id: "documents", label: "Documents" },
];

function Nav({ active, setActive, user, onLogout }) {
  return (
    <nav className="nav slide-down">
      <div className="nav-left">
        <button className="logo" onClick={() => setActive("home")}>
          <img src={registralogo1} alt="Registra" className="logo-img" />
          <span>Registra</span>
        </button>
        <div className="links">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`nav-btn ${active === t.id ? "active" : ""}`}
              onClick={() => setActive(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="nav-right">
        <span className="muted" style={{ marginRight: 12, fontSize: 13 }}>
          {user?.email}
        </span>
        <button className="btn ghost btn-sm" onClick={onLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}

/* ============================================================
   Home page
   ============================================================ */
function HomePage({ setActive }) {
  const quote = useMemo(() => QUOTES[new Date().getDate() % QUOTES.length], []);

  return (
    <div className="page-enter page-enter-active">
      <section className="hero">
        <div className="hero-logo">
          <img src={registralogo1} alt="Registra" className="hero-logo-img" />
        </div>
        <div className="hero-glow" />
        <h1 className="brand fade-up delay-1">One Profile. Every Exam.</h1>
        <p className="sub fade-up delay-2">
          Save your details once. Auto-fill the chaos of every application form —
          photos, signatures, addresses, the works.
        </p>

        <div className="glass-card quotebox fade-up delay-3">
          <div className="quotebox-inner">
            <div>
              <span className="monospace-tag">DAILY MOTIVATION</span>
              <div className="quote-text">"{quote}"</div>
            </div>
            <div className="quote-actions">
              <button className="btn primary glow-btn btn-sm" onClick={() => setActive("checklist")}>
                Open Checklist
              </button>
              <button className="btn ghost btn-sm" onClick={() => setActive("calendar")}>
                View Exam Dates
              </button>
            </div>
          </div>
        </div>

        <div className="exam-pills fade-up delay-4">
          {EXAMS.map((ex, i) => (
            <span
              key={ex.id}
              className="pill pop-in"
              style={{ "--exam-color": ex.color, animationDelay: `${0.1 * i}s` }}
            >
              <span className="pill-icon">{ex.icon}</span> {ex.name}
            </span>
          ))}
        </div>
      </section>

      <section className="cal-grid" style={{ marginTop: 28 }}>
        {[
          { title: "Profile Vault", desc: "Store every field once — name, Aadhar, address, marksheet numbers.", tab: "profile" },
          { title: "Exam Calendar", desc: "Live countdown to every major exam's expected window.", tab: "calendar" },
          { title: "Cheatsheet", desc: "Tap to copy any saved field while filling out a form.", tab: "cheatsheet" },
          { title: "Photo & Signature Specs", desc: "Exact pixel & size rules so uploads never get rejected.", tab: "specs" },
        ].map((c, i) => (
          <button
            key={c.title}
            className="exam-card hover-lift"
            style={{ textAlign: "left", cursor: "pointer", animationDelay: `${0.08 * i}s` }}
            onClick={() => setActive(c.tab)}
          >
            <div className="exam-card-top">
              <span className="exam-name">{c.title}</span>
            </div>
            <div className="exam-date muted">{c.desc}</div>
            <div className="exam-accent-bar" />
          </button>
        ))}
      </section>
    </div>
  );
}

/* ============================================================
   Profile page (form + uploads)
   ============================================================ */
function ProfilePage({ user, showToast }) {
  const [form, setForm] = useState(
    Object.fromEntries(CHEATSHEET_FIELDS.map((f) => [f.key, ""]))
  );
  const [photo, setPhoto] = useState(null);
  const [signature, setSignature] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // load existing profile
  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase || !user) { setLoaded(true); return; }
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (active && !error && data) {
        setForm((prev) => ({ ...prev, ...data }));
        if (data.photo_url) setPhoto(data.photo_url);
        if (data.signature_url) setSignature(data.signature_url);
      }
      if (active) setLoaded(true);
    }
    load();
    return () => { active = false; };
  }, [user]);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleFile = async (e, kind) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!supabase || !user) {
      showToast("Connect Supabase to save photos");
      return;
    }
    try {
      const path = `${user.id}/${kind}-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("documents").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;

      const { data: signed } = await supabase.storage
        .from("documents")
        .createSignedUrl(path, 3600);

      if (kind === "photo") setPhoto({ url: signed?.signedUrl });
      else setSignature({ url: signed?.signedUrl });
    } catch (err) {
      showToast(err.message || "Upload failed");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      if (supabase && user) {
        const payload = {
          id: user.id,
          ...form,
          photo_url: photo?.url || null,
          signature_url: signature?.url || null,
        };
        const { error } = await supabase.from("profiles").upsert(payload);
        if (error) throw error;
      }
      showToast("Profile saved");
    } catch (err) {
      showToast(err.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <Loader label="Loading profile" />;

  return (
    <div className="page-enter page-enter-active">
      <div className="page-header fade-up">
        <h2>Profile Vault</h2>
        <p className="muted">Fill this once — reuse it on every exam form, forever.</p>
      </div>

      <div className="glass-card fade-up delay-1">
        <div className="form-grid">
          {CHEATSHEET_FIELDS.map((f, i) => (
            <div className="field field-animate" key={f.key} style={{ animationDelay: `${i * 0.03}s` }}>
              <label className="label" htmlFor={f.key}>{f.label}</label>
              <input
                id={f.key}
                className="input"
                value={form[f.key] || ""}
                onChange={(e) => update(f.key, e.target.value)}
                placeholder={f.label}
              />
            </div>
          ))}
        </div>

        <div className="upload-section">
          <div>
            <label className="label">Photo (passport style)</label>
            <div className="preview-row" style={{ marginTop: 8 }}>
              {photo && (
                <div className="preview-frame">
                  <img src={photo} alt="Profile" className="preview-img" />
                </div>
              )}
              <label className="file-btn">
                {photo ? "Replace photo" : "Upload photo"}
                <input type="file" accept="image/*" className="hidden-file-input" onChange={(e) => handleFile(e, "photo")} />
              </label>
            </div>
          </div>
          <div>
            <label className="label">Signature</label>
            <div className="preview-row" style={{ marginTop: 8 }}>
              {signature && (
                <div className="preview-frame sig-frame">
                  <img src={signature} alt="Signature" className="sig-img" />
                </div>
              )}
              <label className="file-btn">
                {signature ? "Replace signature" : "Upload signature"}
                <input type="file" accept="image/*" className="hidden-file-input" onChange={(e) => handleFile(e, "signature")} />
              </label>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn primary glow-btn" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
        {!supabase && (
          <p className="hint muted">
            Backend not connected — add VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY to .env.local to persist data.
          </p>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Calendar page
   ============================================================ */
function CalendarPage() {
  return (
    <div className="page-enter page-enter-active">
      <div className="page-header fade-up">
        <h2>Exam Calendar</h2>
        <p className="muted">Expected windows for major exams — always double-check the official notification.</p>
      </div>
      <div className="cal-grid">
        {EXAMS.map((ex, i) => {
          const d = daysUntil(ex.date);
          return (
            <div
              key={ex.id}
              className="exam-card hover-lift"
              style={{ "--exam-color": ex.color, animationDelay: `${i * 0.08}s` }}
            >
              <div className="exam-card-top">
                <span className="exam-icon">{ex.icon}</span>
                <span className="exam-name">{ex.name}</span>
              </div>
              <div className="exam-date">
                {new Date(ex.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </div>
              <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
                {d >= 0 ? `${d} days to go` : "Window likely passed — check next cycle"}
              </div>
              <a className="exam-link" href={ex.link} target="_blank" rel="noreferrer">
                Official site ↗
              </a>
              <div className="exam-accent-bar" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   Cheatsheet page
   ============================================================ */
function CheatsheetPage({ profile }) {
  const [copiedKey, setCopiedKey] = useState("");

  const copy = async (key, value) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(""), 1200);
    } catch (_) {}
  };

  const hasData = CHEATSHEET_FIELDS.some((f) => profile[f.key]);

  return (
    <div className="page-enter page-enter-active">
      <div className="page-header fade-up">
        <h2>Cheatsheet</h2>
        <p className="muted">Tap any row to copy it while you fill out a form.</p>
      </div>

      {!hasData ? (
        <div className="empty-state glass-card">
          <p>No saved details yet.</p>
          <p className="muted hint">Fill your Profile Vault first, then come back here to copy-paste.</p>
        </div>
      ) : (
        <div className="glass-card cheatsheet">
          {CHEATSHEET_FIELDS.map((f, i) => (
            <button
              key={f.key}
              className={`sheet-row ${copiedKey === f.key ? "copied" : ""}`}
              style={{ animationDelay: `${i * 0.03}s` }}
              onClick={() => copy(f.key, profile[f.key])}
            >
              <span className="sheet-key">{f.label}</span>
              <span className="sheet-val">{profile[f.key] || "—"}</span>
              <span className="copy-hint">{copiedKey === f.key ? "Copied ✓" : "Tap to copy"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Checklist page
   ============================================================ */
function ChecklistPage() {
  const [examId, setExamId] = useState(EXAMS[0].id);
  const [state, setState] = useState({});

  const exam = EXAMS.find((e) => e.id === examId);
  const checked = state[examId] || [];

  const toggle = (idx) => {
    setState((s) => {
      const cur = s[examId] || [];
      const next = cur.includes(idx) ? cur.filter((i) => i !== idx) : [...cur, idx];
      return { ...s, [examId]: next };
    });
  };

  const pct = Math.round((checked.length / CHECKLIST_TEMPLATE.length) * 100);

  return (
    <div className="page-enter page-enter-active">
      <div className="page-header fade-up">
        <h2>Prep Checklist</h2>
        <p className="muted">Track what's done before each exam's application closes.</p>
      </div>

      <div className="exam-selector fade-up delay-1">
        {EXAMS.map((ex) => (
          <button
            key={ex.id}
            className={`pill exam-select-btn ${examId === ex.id ? "active" : ""}`}
            style={{ "--exam-color": ex.color }}
            onClick={() => setExamId(ex.id)}
          >
            <span className="pill-icon">{ex.icon}</span> {ex.name}
          </button>
        ))}
      </div>

      <div className="glass-card fade-up delay-2">
        <div className="checklist-header">
          <h3>{exam.name} checklist</h3>
          <div className="progress-ring" style={{ "--pct": `${pct}%` }}>
            <span>{pct}%</span>
          </div>
        </div>

        {CHECKLIST_TEMPLATE.map((item, idx) => (
          <label key={idx} className={`check-item ${checked.includes(idx) ? "done" : ""}`}>
            <input type="checkbox" checked={checked.includes(idx)} onChange={() => toggle(idx)} />
            <span className="check-box" />
            <span>{item}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Photo / signature specs page
   ============================================================ */
function SpecsPage() {
  return (
    <div className="page-enter page-enter-active">
      <div className="page-header fade-up">
        <h2>Photo &amp; Signature Specs</h2>
        <p className="muted">Generic guidelines — always confirm against the specific exam's bulletin.</p>
      </div>

      <div className="spec-grid">
        <div className="spec-card fade-up delay-1">
          <div className="spec-title">Passport Photo</div>
          <ul className="spec-list">
            <li>200 × 230 px, JPEG</li>
            <li>Under 50 KB</li>
            <li>White / light background</li>
            <li>Taken in the last 3 months</li>
            <li>No caps, no sunglasses</li>
          </ul>
          <div className="spec-tip">Tip: Crop tight to shoulders, face centered</div>
        </div>

        <div className="spec-card fade-up delay-2">
          <div className="spec-title">Signature</div>
          <ul className="spec-list">
            <li>140 × 60 px, JPEG</li>
            <li>Under 20 KB</li>
            <li>Black ink on white paper</li>
            <li>Signed by hand, not typed</li>
            <li>Same signature across all forms</li>
          </ul>
          <div className="spec-tip">Tip: Scan, don't photograph, for clean edges</div>
        </div>

        <div className="spec-card fade-up delay-3">
          <div className="spec-title">ID / Aadhar Scan</div>
          <ul className="spec-list">
            <li>PDF or JPEG, under 200 KB</li>
            <li>All four corners visible</li>
            <li>No glare or blur</li>
            <li>Name must match application exactly</li>
          </ul>
          <div className="spec-tip">Tip: Scan flat — phone photos often get rejected</div>
        </div>
      </div>

      <div className="glass-card fade-up delay-4">
        <p className="label" style={{ marginBottom: 8 }}>Free tools to resize / compress</p>
        <ul className="tools-list">
          <li><a href="https://www.iloveimg.com/resize-image" target="_blank" rel="noreferrer">iLoveIMG — resize image</a></li>
          <li><a href="https://tinypng.com" target="_blank" rel="noreferrer">TinyPNG — compress under a size limit</a></li>
        </ul>
      </div>
    </div>
  );
}

/* ============================================================
   App shell
   ============================================================ */
export default function App() {
  const [user, setUser] = useState(undefined);
  const [active, setActive] = useState("home");
  const [toast, setToast] = useState("");
  const [profileCache, setProfileCache] = useState(
    Object.fromEntries(CHEATSHEET_FIELDS.map((f) => [f.key, ""]))
  );
  const [authLoading, setAuthLoading] = useState(true);

  const showToast = useCallback((msg) => setToast(msg), []);

  // Auth state - properly handle OAuth redirects
  useEffect(() => {
    if (!supabase) {
      setUser(null);
      setAuthLoading(false);
      return;
    }

    const initializeAuth = async () => {
      try {
        // Check for OAuth session data in URL (from redirect)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          setAuthLoading(false);
          return;
        }

        // If no session yet, wait for auth state change event
        setAuthLoading(false);
      } catch (error) {
        console.error("Auth init error:", error);
        setAuthLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes (handles OAuth redirect, login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        setAuthLoading(false);
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  // Keep a light profile cache for cheatsheet
  useEffect(() => {
    let active2 = true;
    async function loadProfile() {
      if (!supabase || !user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (active2 && data) setProfileCache((p) => ({ ...p, ...data }));
    }
    if (active === "cheatsheet") loadProfile();
    return () => { active2 = false; };
  }, [active, user]);

  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setActive("home");
  };

  if (authLoading) {
    return <Loader label="Starting Registra" />;
  }

  if (!user) {
    return (
      <>
        <AuthScreen onAuthed={() => {}} showToast={showToast} />
        <Toast message={toast} onDone={() => setToast("")} />
      </>
    );
  }

  return (
    <div className="app-root">
      <BgMesh />
      <Nav active={active} setActive={setActive} user={user} onLogout={logout} />
      <main className="main-content">
        {active === "home" && <HomePage setActive={setActive} />}
        {active === "profile" && <ProfilePage user={user} showToast={showToast} />}
        {active === "calendar" && <CalendarPage />}
        {active === "cheatsheet" && <CheatsheetPage profile={profileCache} />}
        {active === "checklist" && <ChecklistPage />}
        {active === "specs" && <SpecsPage />}
        {active === "autofill" && <AutoFillPage user={user} showToast={showToast} supabase={supabase} />}
        {active === "documents" && <DocumentsPage user={user} showToast={showToast} supabase={supabase} />}
      </main>
      <Toast message={toast} onDone={() => setToast("")} />
    </div>
  );
}
