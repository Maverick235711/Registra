import React, { useState, useEffect, useCallback } from "react";

/*
  AutoFillPage — the core feature of Registra.
  
  HOW TO ADD TO YOUR APP:
  1. Copy this file into your src/ folder.
  2. In App.jsx, import it:
       import AutoFillPage from "./AutoFillPage";
  3. Add to TABS array:
       { id: "autofill", label: "⚡ AutoFill" }
  4. Add to the main render in App():
       {active === "autofill" && <AutoFillPage user={user} showToast={showToast} supabase={supabase} />}
  5. Add CSS from the bottom of this file into your App.css.
*/

/* ── Per-exam field maps ─────────────────────────────────────────────
   Each section maps what the exam form asks → which profile key holds it.
   Add more exams or fields as needed.
   ──────────────────────────────────────────────────────────────────── */
const EXAM_FIELD_MAPS = {
  jee: {
    label: "JEE Main",
    icon: "🚀",
    color: "#7c3aed",
    link: "https://jeemain.nta.nic.in",
    steps: [
      {
        title: "Personal Details",
        fields: [
          { profileKey: "full_name",    formLabel: "Candidate Name (as on Aadhar)" },
          { profileKey: "dob",          formLabel: "Date of Birth" },
          { profileKey: "father_Name",   formLabel: "Father's Name" },
          { profileKey: "mother_Name",   formLabel: "Mother's Name" },
          { profileKey: "aadhar",       formLabel: "Aadhar Number" },
        ],
      },
      {
        title: "Contact & Address",
        fields: [
          { profileKey: "phone",    formLabel: "Mobile Number" },
          { profileKey: "email",    formLabel: "Email ID" },
          { profileKey: "address",  formLabel: "Permanent Address" },
          { profileKey: "city",     formLabel: "City / Town" },
          { profileKey: "state",    formLabel: "State" },
          { profileKey: "pincode",  formLabel: "PIN Code" },
        ],
      },
      {
        title: "Academic Details",
        fields: [
          { profileKey: "class10", formLabel: "Class 10 Roll Number" },
          { profileKey: "class12", formLabel: "Class 12 Roll Number" },
        ],
      },
      {
        title: "Documents to Upload",
        fields: [],
        isUploadStep: true,
        uploads: [
          { label: "Passport Photo", spec: "200×230px, JPEG, < 50 KB" },
          { label: "Signature",      spec: "140×60px, JPEG, < 30 KB" },
          { label: "Class 10 Certificate", spec: "PDF/JPEG, < 300 KB" },
        ],
      },
    ],
  },

  neet: {
    label: "NEET UG",
    icon: "🩺",
    color: "#10b981",
    link: "https://neet.nta.nic.in",
    steps: [
      {
        title: "Personal Details",
        fields: [
          { profileKey: "full_name",  formLabel: "Candidate Name" },
          { profileKey: "dob",        formLabel: "Date of Birth" },
          { profileKey: "fatherName", formLabel: "Father's Name" },
          { profileKey: "motherName", formLabel: "Mother's Name" },
          { profileKey: "aadhar",     formLabel: "Aadhar Number" },
        ],
      },
      {
        title: "Contact & Address",
        fields: [
          { profileKey: "phone",   formLabel: "Mobile Number" },
          { profileKey: "email",   formLabel: "Email Address" },
          { profileKey: "address", formLabel: "Correspondence Address" },
          { profileKey: "city",    formLabel: "City" },
          { profileKey: "state",   formLabel: "State" },
          { profileKey: "pincode", formLabel: "PIN Code" },
        ],
      },
      {
        title: "Academic Details",
        fields: [
          { profileKey: "class10", formLabel: "Class 10 Roll No." },
          { profileKey: "class12", formLabel: "Class 12 Roll No." },
        ],
      },
      {
        title: "Documents to Upload",
        fields: [],
        isUploadStep: true,
        uploads: [
          { label: "Passport Photo",   spec: "200×230px, JPEG, < 50 KB" },
          { label: "Signature",        spec: "140×60px, JPEG, < 20 KB" },
          { label: "Class 12 Marksheet", spec: "PDF/JPEG, < 500 KB" },
          { label: "Category Certificate (if applicable)", spec: "PDF, < 300 KB" },
        ],
      },
    ],
  },

  upsc: {
    label: "UPSC CSE",
    icon: "🏛️",
    color: "#f59e0b",
    link: "https://upsc.gov.in",
    steps: [
      {
        title: "Personal Details",
        fields: [
          { profileKey: "full_name",  formLabel: "Full Name (as in Matriculation)" },
          { profileKey: "dob",        formLabel: "Date of Birth" },
          { profileKey: "fatherName", formLabel: "Father's Name" },
          { profileKey: "aadhar",     formLabel: "Aadhar UID" },
        ],
      },
      {
        title: "Contact Details",
        fields: [
          { profileKey: "phone",   formLabel: "Mobile No." },
          { profileKey: "email",   formLabel: "Email ID" },
          { profileKey: "address", formLabel: "Correspondence Address" },
          { profileKey: "city",    formLabel: "City" },
          { profileKey: "state",   formLabel: "State" },
          { profileKey: "pincode", formLabel: "PIN Code" },
        ],
      },
      {
        title: "Academic Details",
        fields: [
          { profileKey: "class10", formLabel: "Matriculation Roll No." },
          { profileKey: "class12", formLabel: "Intermediate Roll No." },
        ],
      },
      {
        title: "Documents to Upload",
        fields: [],
        isUploadStep: true,
        uploads: [
          { label: "Photograph",    spec: "200×230px, JPEG, < 50 KB" },
          { label: "Signature",     spec: "140×60px, JPEG, < 20 KB" },
          { label: "Aadhar / ID Proof", spec: "PDF, < 200 KB" },
        ],
      },
    ],
  },

  ssc: {
    label: "SSC CGL",
    icon: "📋",
    color: "#2563eb",
    link: "https://ssc.nic.in",
    steps: [
      {
        title: "Personal Details",
        fields: [
          { profileKey: "full_name",  formLabel: "Name of Candidate" },
          { profileKey: "dob",        formLabel: "Date of Birth" },
          { profileKey: "fatherName", formLabel: "Father's/Husband's Name" },
          { profileKey: "motherName", formLabel: "Mother's Name" },
          { profileKey: "aadhar",     formLabel: "Aadhar Card No." },
        ],
      },
      {
        title: "Contact Details",
        fields: [
          { profileKey: "phone",   formLabel: "Mobile Number" },
          { profileKey: "email",   formLabel: "Email ID" },
          { profileKey: "address", formLabel: "Correspondence Address" },
          { profileKey: "city",    formLabel: "City" },
          { profileKey: "state",   formLabel: "State" },
          { profileKey: "pincode", formLabel: "PIN Code" },
        ],
      },
      {
        title: "Academic Details",
        fields: [
          { profileKey: "class10", formLabel: "Matriculation Roll No." },
          { profileKey: "class12", formLabel: "Higher Secondary Roll No." },
        ],
      },
      {
        title: "Documents to Upload",
        fields: [],
        isUploadStep: true,
        uploads: [
          { label: "Photograph",          spec: "200×230px, JPEG, < 50 KB" },
          { label: "Signature",           spec: "140×60px, JPEG, < 20 KB" },
          { label: "10th Certificate",    spec: "JPEG/PDF, < 300 KB" },
          { label: "Category Certificate (if applicable)", spec: "PDF, < 300 KB" },
        ],
      },
    ],
  },

  cat: {
    label: "CAT",
    icon: "📊",
    color: "#ef4444",
    link: "https://iimcat.ac.in",
    steps: [
      {
        title: "Personal Details",
        fields: [
          { profileKey: "full_name",  formLabel: "Name (as per Class 10 certificate)" },
          { profileKey: "dob",        formLabel: "Date of Birth" },
          { profileKey: "fatherName", formLabel: "Father's Name" },
          { profileKey: "motherName", formLabel: "Mother's Name" },
        ],
      },
      {
        title: "Contact Details",
        fields: [
          { profileKey: "phone",   formLabel: "Mobile No." },
          { profileKey: "email",   formLabel: "Email ID" },
          { profileKey: "address", formLabel: "Address" },
          { profileKey: "city",    formLabel: "City" },
          { profileKey: "state",   formLabel: "State" },
          { profileKey: "pincode", formLabel: "PIN Code" },
        ],
      },
      {
        title: "Academic Details",
        fields: [
          { profileKey: "class10", formLabel: "Class 10 Roll No." },
          { profileKey: "class12", formLabel: "Class 12 Roll No." },
        ],
      },
      {
        title: "Documents to Upload",
        fields: [],
        isUploadStep: true,
        uploads: [
          { label: "Photograph", spec: "200×230px, JPEG, < 50 KB" },
          { label: "Signature",  spec: "140×60px, JPEG, < 20 KB" },
        ],
      },
    ],
  },
};

/* ── Component ─────────────────────────────────────────────────────── */
export default function AutoFillPage({ user, showToast, supabase }) {
  const [examId, setExamId] = useState("jee");
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [copiedKey, setCopiedKey] = useState("");
  const [doneSteps, setDoneSteps] = useState({});

  const exam = EXAM_FIELD_MAPS[examId];
  const steps = exam.steps;
  const currentStep = steps[step];

  /* Load profile from Supabase or localStorage fallback */
  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        if (supabase && user) {
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();
          if (alive && data) setProfile(data);
        } else if (user) {
          // localStorage fallback (if your ProfilePage saves there too)
          const saved = localStorage.getItem(`profile_${user?.id}`);
          if (saved && alive) setProfile(JSON.parse(saved));
        }
      } catch (_) {}
      if (alive) setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [user, supabase]);

  /* Count missing required fields for this exam */
  const missingFields = steps
    .flatMap((s) => s.fields)
    .filter((f) => !profile[f.profileKey])
    .map((f) => f.formLabel);

  const filledCount = steps
    .flatMap((s) => s.fields)
    .filter((f) => profile[f.profileKey]).length;

  const totalFields = steps.flatMap((s) => s.fields).length;

  const copy = useCallback(async (key, value, label) => {
    if (!value) {
      showToast(`${label} not saved — go to Profile Vault first`);
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      showToast(`Copied: ${value}`);
      setTimeout(() => setCopiedKey(""), 1600);
    } catch (_) {
      showToast("Could not copy — try manually");
    }
  }, [showToast]);

  const copyAll = async () => {
    const fields = currentStep.fields.filter((f) => profile[f.profileKey]);
    if (!fields.length) { showToast("No filled fields to copy in this section"); return; }
    const text = fields.map((f) => `${f.formLabel}: ${profile[f.profileKey]}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      showToast(`Copied ${fields.length} fields`);
    } catch (_) {
      showToast("Copy failed");
    }
  };

  const markDone = () => {
    setDoneSteps((d) => ({ ...d, [`${examId}-${step}`]: true }));
    if (step < steps.length - 1) setStep((s) => s + 1);
    else showToast("All steps done! 🎉 Fill remaining fields manually.");
  };

  if (loading) {
    return (
      <div className="page-enter page-enter-active">
        <div className="af-loading">Loading your profile…</div>
      </div>
    );
  }

  const progressPct = Math.round((filledCount / (totalFields || 1)) * 100);
  const isDone = (s) => doneSteps[`${examId}-${s}`];

  return (
    <div className="page-enter page-enter-active">

      {/* ── Header ── */}
      <div className="page-header fade-up">
        <h2>⚡ AutoFill Assistant</h2>
        <p className="muted">
          Step through the form with your saved data ready to paste. Only captcha &amp; OTP left for you.
        </p>
      </div>

      {/* ── Exam Selector ── */}
      <div className="af-exam-row fade-up delay-1">
        {Object.entries(EXAM_FIELD_MAPS).map(([id, ex]) => (
          <button
            key={id}
            className={`af-exam-btn ${examId === id ? "active" : ""}`}
            style={{ "--ex-color": ex.color }}
            onClick={() => { setExamId(id); setStep(0); }}
          >
            <span>{ex.icon}</span> {ex.label}
          </button>
        ))}
      </div>

      {/* ── Readiness Banner ── */}
      <div className="af-banner fade-up delay-2" style={{ "--ex-color": exam.color }}>
        <div className="af-banner-left">
          <span className="af-exam-icon-big">{exam.icon}</span>
          <div>
            <div className="af-exam-name">{exam.label} — Form AutoFill</div>
            <div className="af-readiness">
              <div className="af-progress-bar">
                <div className="af-progress-fill" style={{ width: `${progressPct}%`, background: exam.color }} />
              </div>
              <span className="af-pct">{progressPct}% profile ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Missing fields warning ── */}
      {missingFields.length > 0 && (
        <div className="af-warning fade-up delay-2">
          <span className="af-warn-icon">⚠️</span>
          <div>
            <strong>{missingFields.length} fields missing from your profile.</strong>
            <div className="af-warn-list">
              {missingFields.slice(0, 5).join(" · ")}
              {missingFields.length > 5 && ` · +${missingFields.length - 5} more`}
            </div>
            <div className="af-warn-hint">Go to <strong>Profile Vault</strong> → fill them → come back.</div>
          </div>
        </div>
      )}

      {/* ── Step Navigator ── */}
      <div className="af-stepper fade-up delay-3">
        {steps.map((s, i) => (
          <button
            key={i}
            className={`af-step-btn ${step === i ? "active" : ""} ${isDone(i) ? "done" : ""}`}
            onClick={() => setStep(i)}
          >
            <span className="af-step-num">{isDone(i) ? "✓" : i + 1}</span>
            <span className="af-step-label">{s.title}</span>
          </button>
        ))}
      </div>

      {/* ── Step Content ── */}
      <div className="glass-card af-step-card fade-up delay-3">
        <div className="af-step-header">
          <h3>{currentStep.title}</h3>
          {!currentStep.isUploadStep && currentStep.fields.length > 0 && (
            <button className="af-copy-all-btn" onClick={copyAll}>
              Copy all as text
            </button>
          )}
        </div>

        {currentStep.isUploadStep ? (
          /* Upload checklist step */
          <div className="af-upload-checklist">
            <p className="muted" style={{ marginBottom: 16 }}>
              These are the documents you need to upload on the form. Go to the{" "}
              <strong>Documents</strong> tab to prepare them.
            </p>
            {currentStep.uploads.map((u, i) => (
              <div key={i} className="af-upload-item">
                <span className="af-upload-icon">📎</span>
                <div className="af-upload-info">
                  <div className="af-upload-label">{u.label}</div>
                  <div className="af-upload-spec muted">{u.spec}</div>
                </div>
                <span className="af-upload-badge">Needed</span>
              </div>
            ))}
          </div>
        ) : (
          /* Fields step */
          <div className="af-fields">
            {currentStep.fields.map((f, i) => {
              const value = profile[f.profileKey] || "";
              const filled = !!value;
              const isCopied = copiedKey === `${examId}-${step}-${i}`;
              return (
                <div key={f.profileKey} className={`af-field-row ${filled ? "filled" : "empty"}`}>
                  <div className="af-field-info">
                    <div className="af-form-label">{f.formLabel}</div>
                    <div className={`af-value ${filled ? "" : "af-value-empty"}`}>
                      {filled ? value : "Not saved yet — go to Profile Vault"}
                    </div>
                  </div>
                  <button
                    className={`af-copy-btn ${isCopied ? "copied" : ""} ${!filled ? "disabled" : ""}`}
                    onClick={() => copy(`${examId}-${step}-${i}`, value, f.formLabel)}
                    disabled={!filled}
                    title={filled ? `Copy "${value}"` : "Fill this in Profile Vault first"}
                  >
                    {isCopied ? "✓ Copied" : filled ? "Copy" : "Missing"}
                  </button>
                </div>
              );
            })}

            {currentStep.fields.length === 0 && (
              <p className="muted">No text fields in this step.</p>
            )}
          </div>
        )}

        {/* Step nav buttons */}
        <div className="af-step-actions">
          <button
            className="btn ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            ← Previous
          </button>
          <button className="btn primary glow-btn" onClick={markDone}>
            {step === steps.length - 1 ? "Finish ✓" : "Mark Done & Next →"}
          </button>
        </div>
      </div>

      {/* ── Quick Copy Panel ── */}
      <div className="glass-card af-quick-panel fade-up delay-4">
        <div className="af-quick-title">🗂 Quick Copy — All Fields</div>
        <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
          Tap any row to instantly copy it while the exam form is open in another tab.
        </p>
        <div className="af-quick-grid">
          {steps
            .flatMap((s) => s.fields)
            .map((f, i) => {
              const value = profile[f.profileKey] || "";
              const key = `quick-${f.profileKey}`;
              const isCopied = copiedKey === key;
              return (
                <button
                  key={f.profileKey}
                  className={`af-quick-row ${value ? "filled" : "empty"} ${isCopied ? "copied" : ""}`}
                  onClick={() => copy(key, value, f.formLabel)}
                  disabled={!value}
                >
                  <span className="af-quick-label">{f.formLabel}</span>
                  <span className="af-quick-value">{value || "—"}</span>
                  <span className="af-quick-action">{isCopied ? "✓" : value ? "⎘" : "!"}</span>
                </button>
              );
            })}
        </div>
      </div>

    </div>
  );
}


/*
  ══════════════════════════════════════════════════════════════
  ADD THIS CSS TO YOUR App.css FILE
  ══════════════════════════════════════════════════════════════

  .af-loading {
    text-align: center;
    padding: 60px;
    color: var(--text-muted);
    font-size: 16px;
  }

  .af-exam-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 20px;
  }

  .af-exam-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 18px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(30, 30, 45, 0.8);
    color: #c0c0d8;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.22s ease;
  }

  .af-exam-btn:hover {
    border-color: var(--ex-color, #7c3aed);
    color: #fff;
    transform: translateY(-2px);
  }

  .af-exam-btn.active {
    background: var(--ex-color, #7c3aed);
    border-color: var(--ex-color, #7c3aed);
    color: #fff;
    box-shadow: 0 0 18px color-mix(in srgb, var(--ex-color, #7c3aed) 60%, transparent);
  }

  .af-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    padding: 20px 24px;
    border-radius: var(--radius);
    border: 1px solid color-mix(in srgb, var(--ex-color, #7c3aed) 40%, transparent);
    background: color-mix(in srgb, var(--ex-color, #7c3aed) 8%, transparent);
    margin-bottom: 16px;
  }

  .af-banner-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .af-exam-icon-big { font-size: 36px; }

  .af-exam-name {
    font-weight: 800;
    font-size: 18px;
    color: #fff;
    margin-bottom: 8px;
  }

  .af-readiness {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .af-progress-bar {
    width: 200px;
    height: 6px;
    background: rgba(255,255,255,0.1);
    border-radius: 999px;
    overflow: hidden;
  }

  .af-progress-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.5s ease;
  }

  .af-pct {
    font-size: 13px;
    color: var(--text-muted);
    white-space: nowrap;
  }

  .af-official-link {
    display: inline-flex;
    align-items: center;
    padding: 9px 18px;
    border-radius: var(--radius-sm);
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.12);
    color: #d0d0f0;
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.22s;
    white-space: nowrap;
  }

  .af-official-link:hover {
    background: rgba(255,255,255,0.14);
    color: #fff;
  }

  .af-warning {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    padding: 16px 20px;
    border-radius: var(--radius);
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.3);
    margin-bottom: 20px;
  }

  .af-warn-icon { font-size: 22px; flex-shrink: 0; margin-top: 2px; }
  .af-warn-list { font-size: 13px; color: #e0c060; margin: 4px 0; }
  .af-warn-hint { font-size: 13px; color: var(--text-muted); }

  .af-stepper {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }

  .af-step-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 16px;
    border-radius: var(--radius-sm);
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--card-border);
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.22s;
  }

  .af-step-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }

  .af-step-btn.active {
    background: rgba(124, 58, 237, 0.15);
    border-color: #7c3aed;
    color: #c4b5fd;
  }

  .af-step-btn.done {
    border-color: #10b981;
    color: #10b981;
    background: rgba(16, 185, 129, 0.08);
  }

  .af-step-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px; height: 22px;
    border-radius: 50%;
    background: rgba(255,255,255,0.08);
    font-size: 12px;
    font-weight: 800;
  }

  .af-step-btn.active .af-step-num { background: #7c3aed; color: #fff; }
  .af-step-btn.done .af-step-num { background: #10b981; color: #fff; }

  .af-step-card { margin-bottom: 24px; }

  .af-step-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 10px;
  }

  .af-step-header h3 {
    font-size: 17px;
    font-weight: 800;
    color: #fff;
    margin: 0;
  }

  .af-copy-all-btn {
    padding: 7px 14px;
    border-radius: var(--radius-sm);
    background: rgba(124, 58, 237, 0.12);
    border: 1px solid rgba(124, 58, 237, 0.3);
    color: #c4b5fd;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .af-copy-all-btn:hover { background: rgba(124, 58, 237, 0.25); }

  .af-fields { display: flex; flex-direction: column; gap: 8px; }

  .af-field-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--card-border);
    background: rgba(255,255,255,0.03);
    transition: all 0.2s;
  }

  .af-field-row.filled { border-color: rgba(124, 58, 237, 0.2); }
  .af-field-row.empty  { border-color: rgba(245, 158, 11, 0.15); }

  .af-field-row:hover { background: rgba(255,255,255,0.06); }

  .af-field-info { flex: 1; min-width: 0; }

  .af-form-label {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    margin-bottom: 4px;
  }

  .af-value {
    font-size: 15px;
    font-weight: 600;
    color: #f0f0f8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .af-value-empty {
    font-size: 13px;
    font-weight: 400;
    color: #f59e0b;
    font-style: italic;
  }

  .af-copy-btn {
    flex-shrink: 0;
    padding: 7px 16px;
    border-radius: var(--radius-sm);
    background: rgba(124, 58, 237, 0.15);
    border: 1px solid rgba(124, 58, 237, 0.35);
    color: #c4b5fd;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.18s;
    white-space: nowrap;
  }

  .af-copy-btn:hover:not(.disabled) {
    background: #7c3aed;
    color: #fff;
    transform: scale(1.04);
  }

  .af-copy-btn.copied {
    background: rgba(16, 185, 129, 0.2);
    border-color: #10b981;
    color: #10b981;
  }

  .af-copy-btn.disabled {
    background: rgba(245, 158, 11, 0.08);
    border-color: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
    cursor: not-allowed;
    opacity: 0.8;
  }

  .af-step-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid var(--card-border);
    gap: 12px;
  }

  .af-upload-checklist { display: flex; flex-direction: column; gap: 10px; }

  .af-upload-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    background: rgba(255,255,255,0.03);
    border-radius: var(--radius-sm);
    border: 1px solid var(--card-border);
  }

  .af-upload-icon { font-size: 22px; flex-shrink: 0; }

  .af-upload-info { flex: 1; }

  .af-upload-label {
    font-weight: 700;
    font-size: 15px;
    color: #f0f0f8;
    margin-bottom: 3px;
  }

  .af-upload-spec { font-size: 13px; }

  .af-upload-badge {
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #10b981;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
  }

  .af-quick-panel { margin-bottom: 40px; }

  .af-quick-title {
    font-size: 16px;
    font-weight: 800;
    color: #fff;
    margin-bottom: 6px;
  }

  .af-quick-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 8px;
  }

  .af-quick-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--card-border);
    text-align: left;
    cursor: pointer;
    transition: all 0.18s;
  }

  .af-quick-row.filled:hover { background: rgba(124, 58, 237, 0.12); border-color: #7c3aed; }
  .af-quick-row.copied { background: rgba(16, 185, 129, 0.1); border-color: #10b981; }
  .af-quick-row.empty  { cursor: not-allowed; opacity: 0.5; }

  .af-quick-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-muted);
    flex-shrink: 0;
    width: 130px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .af-quick-value {
    flex: 1;
    font-size: 14px;
    font-weight: 600;
    color: #e0e0f0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .af-quick-action {
    flex-shrink: 0;
    font-size: 16px;
    color: var(--text-muted);
  }

  .af-quick-row.copied .af-quick-action { color: #10b981; }
  .af-quick-row.filled:hover .af-quick-action { color: #c4b5fd; }

  @media (max-width: 640px) {
    .af-banner { flex-direction: column; }
    .af-progress-bar { width: 140px; }
    .af-quick-grid { grid-template-columns: 1fr; }
    .af-step-actions { flex-direction: column; }
    .af-step-actions .btn { width: 100%; justify-content: center; }
    .af-quick-label { width: 100px; }
  }
*/