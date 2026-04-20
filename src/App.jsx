import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabase";

// ─── Design Tokens ───────────────────────────────────────────────
const C = {
  bg: "#0A0908",
  card: "#13120F",
  card2: "#1B1917",
  border: "#272420",
  accent: "#E8622A",
  accentDim: "#2A1A10",
  text: "#F0EBE1",
  muted: "#7A7268",
  success: "#4CAF7D",
  warn: "#E8A82A",
  danger: "#E85A2A",
  pro: "#C9A84C",
  proDim: "#1E1A0E",
};

// ─── Global Styles ────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Outfit:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeUp { from { opacity:0; transform:translateY(20px);} to {opacity:1;transform:translateY(0);} }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  * { box-sizing: border-box; }
  body { margin: 0; }
  ::placeholder { color: #3A3830; }
  input, select, textarea { outline: none; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: ${C.bg}; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
  .tab-btn:hover { color: ${C.text} !important; }
  .chip:hover { border-color: ${C.accent} !important; color: ${C.text} !important; background: ${C.accentDim} !important; }
  .pro-btn:hover { background: #B8963C !important; }
  .free-btn:hover { border-color: ${C.accent} !important; }
  .action-btn:hover { background: #C9541F !important; }
  .action-btn:disabled { opacity: 0.4; cursor: not-allowed !important; }
  .back-btn:hover { color: ${C.text} !important; }
  .upload-area:hover { border-color: ${C.accent} !important; background: ${C.accentDim} !important; }
  .sym-chip { cursor:pointer; transition: all 0.15s; }
  .sym-chip:hover { border-color: ${C.accent} !important; color: ${C.accent} !important; }
  .sym-chip.selected { border-color: ${C.accent} !important; background: ${C.accentDim} !important; color: ${C.accent} !important; }
`;

// ─── Helpers ──────────────────────────────────────────────────────
function parseMarkdown(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} style={{ color: C.text, fontWeight: 600 }}>{p.slice(2, -2)}</strong>
      : p
  );
}

async function callClaude(systemPrompt, userPrompt, imageBase64 = null, imageMediaType = "image/jpeg") {
  const content = imageBase64
    ? [
        { type: "image", source: { type: "base64", media_type: imageMediaType, data: imageBase64 } },
        { type: "text", text: userPrompt }
      ]
    : userPrompt;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content }],
    }),
  });
  const data = await res.json();
  const text = data.content?.find(b => b.type === "text")?.text;
  if (!text) throw new Error("No response");
  return text;
}

// ─── Icons ────────────────────────────────────────────────────────
const PawIcon = ({ size = 24, color = C.accent }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    {/* Main pad - large rounded base */}
    <ellipse cx="16" cy="21" rx="8" ry="7" fill={color} />
    {/* Four small toe beans arranged in an arc above */}
    <ellipse cx="8"  cy="13" rx="3" ry="3.5" fill={color} />
    <ellipse cx="13" cy="10" rx="3" ry="3.5" fill={color} />
    <ellipse cx="19" cy="10" rx="3" ry="3.5" fill={color} />
    <ellipse cx="24" cy="13" rx="3" ry="3.5" fill={color} />
  </svg>
);

const Spinner = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" style={{ animation: "spin 0.8s linear infinite" }}>
    <circle cx="10" cy="10" r="8" fill="none" stroke={C.border} strokeWidth="2" />
    <path d="M10 2 A8 8 0 0 1 18 10" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ─── Shared Components ────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 22px", ...style }}>
      {children}
    </div>
  );
}

function ActionBtn({ onClick, disabled, loading, children, style = {} }) {
  return (
    <button className="action-btn" onClick={onClick} disabled={disabled || loading}
      style={{
        width: "100%", padding: "13px 0", border: "none", borderRadius: 10,
        background: disabled || loading ? C.card2 : C.accent,
        color: disabled || loading ? C.muted : "#fff",
        fontSize: 14, fontWeight: 600, fontFamily: "'Outfit', sans-serif",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        transition: "background 0.15s", ...style
      }}>
      {loading && <Spinner />}{children}
    </button>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>
      {children}
    </div>
  );
}

// ─── AUTH SCREEN ─────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleSubmit = async () => {
    setLoading(true); setError(null); setMessage(null);
    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuth(data.user);
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Check your email to confirm your account, then log in.");
        setMode("login");
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400, animation: "fadeUp 0.3s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <PawIcon size={40} />
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 700, color: C.text, margin: "12px 0 4px" }}>
            Woof<span style={{ color: C.accent }}>Well</span>
          </h1>
          <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>AI-powered dog health companion</p>
        </div>

        <Card>
          <div style={{ display: "flex", background: C.card2, borderRadius: 10, padding: 4, marginBottom: 20, gap: 4 }}>
            {["login", "signup"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(null); setMessage(null); }} style={{
                flex: 1, padding: "9px 0", borderRadius: 8, border: "none",
                background: mode === m ? C.card : "transparent",
                color: mode === m ? C.text : C.muted,
                fontSize: 13, fontWeight: 500, fontFamily: "'Outfit', sans-serif", cursor: "pointer"
              }}>
                {m === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>

          <SectionLabel>Email</SectionLabel>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" type="email"
            style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, color: C.text, fontFamily: "'Outfit', sans-serif", marginBottom: 14 }} />

          <SectionLabel>Password</SectionLabel>
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" type="password"
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, color: C.text, fontFamily: "'Outfit', sans-serif", marginBottom: 20 }} />

          {error && <div style={{ color: C.danger, fontSize: 13, marginBottom: 14, textAlign: "center" }}>{error}</div>}
          {message && <div style={{ color: C.success, fontSize: 13, marginBottom: 14, textAlign: "center" }}>{message}</div>}

          <ActionBtn onClick={handleSubmit} loading={loading}>
            {mode === "login" ? "Log In" : "Create Account"}
          </ActionBtn>
        </Card>
      </div>
    </div>
  );
}

// ─── PAYWALL ─────────────────────────────────────────────────────
function Paywall({ onUnlock, isPro }) {
  const [billing, setBilling] = useState("annual");

  if (isPro) return (
    <Card style={{ textAlign: "center", borderColor: C.pro }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>👑</div>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: C.pro, fontWeight: 700 }}>Woof 🐾 Well Pro Active</div>
      <div style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>All features unlocked. Enjoy unlimited access.</div>
    </Card>
  );

  const monthly = 4.99;
  const annual = 3.33;
  const price = billing === "annual" ? annual : monthly;

  const features = [
    ["📸", "Photo Breed Identifier", "Unlimited scans"],
    ["🩺", "Symptom Checker", "AI triage + urgency ratings"],
    ["📋", "Full Health Profiles", "All breeds, all life stages"],
    ["📄", "PDF Export", "Download & share reports"],
    ["🔔", "Vet Reminders", "Vaccination & checkup alerts"],
    ["💬", "Priority Support", "Fast responses"],
  ];

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.proDim, border: `1px solid ${C.pro}`, borderRadius: 20, padding: "4px 14px", marginBottom: 14 }}>
          <span style={{ color: C.pro, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>WOOFWELL PRO</span>
        </div>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 700, color: C.text, margin: "0 0 10px", lineHeight: 1.1 }}>
          Your dog deserves<br />the full picture
        </h2>
        <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          Unlock AI-powered breed ID, symptom triage,<br />and unlimited health profiles.
        </p>
      </div>

      {/* Billing Toggle */}
      <div style={{ display: "flex", background: C.card2, borderRadius: 10, padding: 4, marginBottom: 20, gap: 4 }}>
        {["monthly", "annual"].map(b => (
          <button key={b} onClick={() => setBilling(b)} style={{
            flex: 1, padding: "9px 0", borderRadius: 8, border: "none",
            background: billing === b ? C.card : "transparent",
            color: billing === b ? C.text : C.muted,
            fontSize: 13, fontWeight: 500, fontFamily: "'Outfit', sans-serif",
            cursor: "pointer", transition: "all 0.15s", position: "relative"
          }}>
            {b.charAt(0).toUpperCase() + b.slice(1)}
            {b === "annual" && <span style={{ marginLeft: 6, background: C.success, color: "#fff", fontSize: 10, padding: "1px 6px", borderRadius: 6, fontWeight: 600 }}>-33%</span>}
          </button>
        ))}
      </div>

      {/* Price Card */}
      <Card style={{ borderColor: C.pro, marginBottom: 16, background: C.proDim }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 4 }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 42, fontWeight: 700, color: C.pro, lineHeight: 1 }}>${price.toFixed(2)}</span>
          <span style={{ color: C.muted, fontSize: 13, paddingBottom: 6 }}>/month{billing === "annual" ? ", billed annually" : ""}</span>
        </div>
        {billing === "annual" && <div style={{ color: C.muted, fontSize: 12 }}>That's ${(annual * 12).toFixed(2)}/year — save ${((monthly - annual) * 12).toFixed(2)}</div>}
      </Card>

      {/* Features */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {features.map(([icon, title, desc]) => (
            <div key={title} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20, width: 28, textAlign: "center" }}>{icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{title}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{desc}</div>
              </div>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: C.success, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <ActionBtn onClick={onUnlock} style={{ background: C.pro, marginBottom: 10 }}>
        👑 Start Pro — ${price.toFixed(2)}/mo
      </ActionBtn>
      <button className="free-btn" style={{
        width: "100%", padding: "11px 0", border: `1px solid ${C.border}`, borderRadius: 10,
        background: "transparent", color: C.muted, fontSize: 13,
        fontFamily: "'Outfit', sans-serif", cursor: "pointer", transition: "border-color 0.15s"
      }}>
        Continue with Free (3 searches/day)
      </button>
      <div style={{ textAlign: "center", color: C.muted, fontSize: 11, marginTop: 12 }}>
        Cancel anytime · No hidden fees · 7-day free trial
      </div>
    </div>
  );
}

// ─── PHOTO BREED IDENTIFIER ───────────────────────────────────────
function BreedIdentifier({ isPro, onUpgrade }) {
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageMediaType, setImageMediaType] = useState("image/jpeg");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef();
  const [scansUsed] = useState(2);
  const maxFreeScans = 3;

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target.result);
      const b64 = e.target.result.split(",")[1];
      setImageBase64(b64);
      setImageMediaType(file.type || "image/jpeg");
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const identify = async () => {
    if (!imageBase64) return;
    setLoading(true); setError(null);
    try {
      const text = await callClaude(
        `You are a dog breed expert. Analyze dog photos and return ONLY a JSON object (no markdown, no backticks) with this exact structure:
{
  "breed": "Primary breed name",
  "confidence": 85,
  "mix": false,
  "secondaryBreed": null,
  "traits": ["trait1", "trait2", "trait3"],
  "temperament": "Brief temperament description",
  "funFact": "One interesting fact about this breed"
}
If it's a mix, set mix to true and fill secondaryBreed. Confidence is 0-100.`,
        "Please identify the dog breed in this photo.",
        imageBase64,
        imageMediaType
      );
      const clean = text.replace(/```json|```/g, "").trim();
      setResult(JSON.parse(clean));
    } catch {
      setError("Couldn't identify the breed. Please try a clearer photo.");
    }
    setLoading(false);
  };

  const confidenceColor = result
    ? result.confidence >= 80 ? C.success : result.confidence >= 60 ? C.warn : C.danger
    : C.muted;

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      {!isPro && (
        <div style={{ background: C.proDim, border: `1px solid ${C.pro}33`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: C.muted }}>{scansUsed}/{maxFreeScans} free scans used today</span>
          <button onClick={onUpgrade} style={{ background: "none", border: "none", color: C.pro, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>Upgrade →</button>
        </div>
      )}

      {/* Upload Area */}
      <div className="upload-area" onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
        style={{
          border: `2px dashed ${image ? C.accent : C.border}`, borderRadius: 16,
          padding: image ? 0 : "40px 20px", textAlign: "center",
          cursor: "pointer", marginBottom: 16, overflow: "hidden",
          transition: "all 0.2s", minHeight: image ? 200 : "auto",
          position: "relative", background: image ? "#000" : C.card
        }}>
        {image ? (
          <>
            <img src={image} alt="dog" style={{ width: "100%", maxHeight: 280, objectFit: "cover", display: "block" }} />
            <div style={{
              position: "absolute", bottom: 10, right: 10,
              background: "rgba(0,0,0,0.7)", border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "5px 10px", fontSize: 11, color: C.muted
            }}>Tap to change</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📸</div>
            <div style={{ color: C.text, fontWeight: 500, fontSize: 15, marginBottom: 4 }}>Upload a dog photo</div>
            <div style={{ color: C.muted, fontSize: 12 }}>Drag & drop or tap to browse</div>
          </>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
      </div>

      <ActionBtn onClick={identify} disabled={!image} loading={loading}>
        {loading ? "Identifying breed..." : "🔍 Identify Breed"}
      </ActionBtn>

      {error && <div style={{ marginTop: 14, color: C.danger, fontSize: 13, textAlign: "center" }}>{error}</div>}

      {result && (
        <div style={{ marginTop: 20, animation: "fadeUp 0.3s ease" }}>
          <Card style={{ marginBottom: 12, borderColor: confidenceColor + "44" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: C.text }}>{result.breed}</div>
                {result.mix && result.secondaryBreed && (
                  <div style={{ fontSize: 12, color: C.muted }}>Mix with {result.secondaryBreed}</div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: confidenceColor, fontFamily: "'JetBrains Mono', monospace" }}>{result.confidence}%</div>
                <div style={{ fontSize: 10, color: C.muted }}>confidence</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {result.traits?.map(t => (
                <span key={t} style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, color: C.muted }}>{t}</span>
              ))}
            </div>
            <div style={{ fontSize: 13, color: "#C0BAB0", lineHeight: 1.6 }}>{result.temperament}</div>
          </Card>
          <Card style={{ background: C.accentDim, borderColor: C.accent + "44" }}>
            <div style={{ fontSize: 11, color: C.accent, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginBottom: 6 }}>FUN FACT</div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>🐾 {result.funFact}</div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── SYMPTOM CHECKER ──────────────────────────────────────────────
function SymptomChecker({ isPro, onUpgrade }) {
  const SYMPTOMS = [
    "Vomiting", "Diarrhea", "Lethargy", "Not eating", "Excessive thirst",
    "Coughing", "Sneezing", "Limping", "Hair loss", "Itching/Scratching",
    "Eye discharge", "Ear scratching", "Bloated belly", "Difficulty breathing",
    "Seizures", "Excessive licking", "Weight loss", "Fever"
  ];

  const [selected, setSelected] = useState([]);
  const [breedName, setBreedName] = useState("");
  const [dogAge, setDogAge] = useState("adult");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggle = (s) => setSelected(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const check = async () => {
    if (!selected.length) return;
    setLoading(true); setError(null);
    try {
      const text = await callClaude(
        `You are a veterinary triage assistant. Analyze dog symptoms and return ONLY a JSON object (no markdown, no backticks) with this structure:
{
  "urgency": "emergency|urgent|monitor|routine",
  "urgencyLabel": "Seek Emergency Care|See Vet Soon|Monitor at Home|Schedule Routine Visit",
  "summary": "Brief 1-2 sentence summary of likely cause",
  "possibleCauses": ["cause1", "cause2", "cause3"],
  "homeCareTips": ["tip1", "tip2"],
  "redFlags": ["flag1", "flag2"],
  "vetQuestion": "The most important question to ask your vet"
}`,
        `Dog info: ${breedName || "Unknown breed"}, ${dogAge}. Symptoms: ${selected.join(", ")}. Please triage.`
      );
      const clean = text.replace(/```json|```/g, "").trim();
      setResult(JSON.parse(clean));
    } catch {
      setError("Analysis failed. Please try again.");
    }
    setLoading(false);
  };

  const urgencyColors = {
    emergency: C.danger, urgent: C.warn, monitor: C.accent, routine: C.success
  };
  const urgencyBg = {
    emergency: "#1F0A0A", urgent: "#1F1508", monitor: C.accentDim, routine: "#0A1A10"
  };

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      {!isPro && (
        <div style={{ background: C.proDim, border: `1px solid ${C.pro}33`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: C.muted }}>Free: basic triage only</span>
          <button onClick={onUpgrade} style={{ background: "none", border: "none", color: C.pro, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>Get full analysis →</button>
        </div>
      )}

      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <SectionLabel>Breed (optional)</SectionLabel>
            <input value={breedName} onChange={e => setBreedName(e.target.value)} placeholder="e.g. Labrador..."
              style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: C.text, fontFamily: "'Outfit', sans-serif" }} />
          </div>
          <div>
            <SectionLabel>Age Stage</SectionLabel>
            <select value={dogAge} onChange={e => setDogAge(e.target.value)}
              style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: C.text, fontFamily: "'Outfit', sans-serif", cursor: "pointer" }}>
              {["puppy", "adult", "senior"].map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
            </select>
          </div>
        </div>

        <SectionLabel>Select Symptoms ({selected.length} selected)</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {SYMPTOMS.map(s => (
            <button key={s} className={`sym-chip ${selected.includes(s) ? "selected" : ""}`}
              onClick={() => toggle(s)}
              style={{
                padding: "6px 12px", borderRadius: 20, border: `1px solid ${selected.includes(s) ? C.accent : C.border}`,
                background: selected.includes(s) ? C.accentDim : C.card2,
                color: selected.includes(s) ? C.accent : C.muted,
                fontSize: 12, fontFamily: "'Outfit', sans-serif",
              }}>{s}</button>
          ))}
        </div>
      </Card>

      <ActionBtn onClick={check} disabled={!selected.length} loading={loading}>
        {loading ? "Analyzing symptoms..." : `🩺 Analyze ${selected.length} Symptom${selected.length !== 1 ? "s" : ""}`}
      </ActionBtn>

      {error && <div style={{ marginTop: 14, color: C.danger, fontSize: 13, textAlign: "center" }}>{error}</div>}

      {result && (
        <div style={{ marginTop: 20, animation: "fadeUp 0.3s ease", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Urgency Banner */}
          <div style={{ background: urgencyBg[result.urgency] || C.card, border: `1px solid ${urgencyColors[result.urgency]}55`, borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: urgencyColors[result.urgency], animation: result.urgency === "emergency" ? "pulse 1s infinite" : "none" }} />
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: urgencyColors[result.urgency] }}>{result.urgencyLabel}</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#C0BAB0", lineHeight: 1.6 }}>{result.summary}</p>
          </div>

          {/* Possible Causes */}
          <Card>
            <div style={{ fontSize: 11, color: C.muted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginBottom: 10 }}>POSSIBLE CAUSES</div>
            {result.possibleCauses?.map(c => (
              <div key={c} style={{ display: "flex", gap: 8, marginBottom: 7, fontSize: 13, color: "#C0BAB0", alignItems: "flex-start" }}>
                <span style={{ color: C.accent, marginTop: 1 }}>◆</span>{c}
              </div>
            ))}
          </Card>

          {/* Home Care */}
          {result.homeCareTips?.length > 0 && (
            <Card style={{ background: "#0A1208", borderColor: C.success + "44" }}>
              <div style={{ fontSize: 11, color: C.success, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginBottom: 10 }}>HOME CARE TIPS</div>
              {result.homeCareTips.map(t => (
                <div key={t} style={{ fontSize: 13, color: "#C0BAB0", marginBottom: 7, display: "flex", gap: 8 }}>
                  <span style={{ color: C.success }}>✓</span>{t}
                </div>
              ))}
            </Card>
          )}

          {/* Red Flags */}
          {result.redFlags?.length > 0 && (
            <Card style={{ background: "#160A0A", borderColor: C.danger + "44" }}>
              <div style={{ fontSize: 11, color: C.danger, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginBottom: 10 }}>RED FLAGS — SEEK CARE IMMEDIATELY IF:</div>
              {result.redFlags.map(f => (
                <div key={f} style={{ fontSize: 13, color: "#C0BAB0", marginBottom: 7, display: "flex", gap: 8 }}>
                  <span style={{ color: C.danger }}>!</span>{f}
                </div>
              ))}
            </Card>
          )}

          {/* Vet Question */}
          {result.vetQuestion && (
            <Card style={{ background: C.proDim, borderColor: C.pro + "44" }}>
              <div style={{ fontSize: 11, color: C.pro, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginBottom: 8 }}>ASK YOUR VET</div>
              <div style={{ fontSize: 14, color: C.text, fontStyle: "italic" }}>"{result.vetQuestion}"</div>
            </Card>
          )}

          <div style={{ fontSize: 11, color: C.muted, textAlign: "center", lineHeight: 1.6 }}>
            ⚠️ This is AI-generated triage, not a medical diagnosis. Always consult a licensed veterinarian.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── HEALTH PROFILE ───────────────────────────────────────────────
function HealthProfile() {
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("adult");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const SUGGESTIONS = ["Golden Retriever", "French Bulldog", "German Shepherd", "Labrador", "Poodle", "Beagle", "Husky", "Dachshund", "Bulldog", "Chihuahua"];

  const fetch_ = async () => {
    if (!breed.trim()) return;
    setLoading(true); setError(null); setReport(null);
    try {
      const text = await callClaude(
        `You are a dog health expert. Produce a clear health profile using ## headers and - bullets. Sections: ## Overview, ## Common Health Issues, ## Lifespan & Size, ## Exercise Needs, ## Diet Tips, ## Grooming, ## Vet Checkup Recommendations. Use **bold** for key terms. Keep bullets concise.`,
        `Health profile for a ${age} ${breed}.`
      );
      setReport(text);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const ICONS = { "Overview": "🐾", "Common Health Issues": "🩺", "Lifespan & Size": "📏", "Exercise Needs": "🏃", "Diet Tips": "🥩", "Grooming": "✂️", "Vet Checkup Recommendations": "📋" };

  const renderReport = () => {
    const sections = [];
    let current = null;
    for (const line of report.split("\n").filter(l => l.trim())) {
      if (line.startsWith("##")) {
        if (current) sections.push(current);
        current = { heading: line.replace(/^##\s*/, ""), items: [] };
      } else if (current) {
        current.items.push(line.replace(/^[-*]\s*/, "").trim());
      }
    }
    if (current) sections.push(current);
    return sections.map((sec, i) => (
      <Card key={i} style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 18 }}>{ICONS[sec.heading] || "•"}</span>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 700, color: C.text }}>{sec.heading}</span>
        </div>
        {sec.items.map((item, j) => (
          <div key={j} style={{ fontSize: 13, color: "#C0BAB0", lineHeight: 1.65, paddingLeft: 10, borderLeft: `2px solid ${C.border}`, marginBottom: 6 }}>
            {parseMarkdown(item)}
          </div>
        ))}
      </Card>
    ));
  };

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <Card style={{ marginBottom: 14 }}>
        <SectionLabel>Dog Breed</SectionLabel>
        <input value={breed} onChange={e => setBreed(e.target.value)} onKeyDown={e => e.key === "Enter" && fetch_()}
          placeholder="e.g. Golden Retriever..."
          style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, color: C.text, fontFamily: "'Outfit', sans-serif", marginBottom: 14 }} />
        <SectionLabel>Life Stage</SectionLabel>
        <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
          {["puppy", "adult", "senior"].map(a => (
            <button key={a} onClick={() => setAge(a)} style={{
              flex: 1, padding: "8px 0", borderRadius: 8,
              border: `1px solid ${age === a ? C.accent : C.border}`,
              background: age === a ? C.accentDim : C.card2,
              color: age === a ? C.accent : C.muted,
              fontSize: 13, fontFamily: "'Outfit', sans-serif",
              fontWeight: age === a ? 600 : 400, cursor: "pointer", transition: "all 0.15s", textTransform: "capitalize"
            }}>{a}</button>
          ))}
        </div>
      </Card>

      {!report && !loading && (
        <div style={{ marginBottom: 14 }}>
          <SectionLabel>Popular Breeds — or type any breed above</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {SUGGESTIONS.map(s => (
              <button key={s} className="chip" onClick={() => setBreed(s)}
                style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${C.border}`, background: C.card2, color: C.muted, fontSize: 12, fontFamily: "'Outfit', sans-serif", cursor: "pointer", transition: "all 0.15s" }}>{s}</button>
            ))}
          </div>
        </div>
      )}

      <ActionBtn onClick={fetch_} disabled={!breed.trim()} loading={loading} style={{ marginBottom: 14 }}>
        {loading ? "Generating profile..." : "Generate Health Profile"}
      </ActionBtn>

      {error && <div style={{ color: C.danger, fontSize: 13, textAlign: "center", marginBottom: 14 }}>{error}</div>}

      {report && (
        <div style={{ animation: "fadeUp 0.3s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <PawIcon size={22} />
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: C.text }}>{age.charAt(0).toUpperCase() + age.slice(1)} {breed}</div>
              <div style={{ fontSize: 11, color: C.muted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em" }}>HEALTH PROFILE</div>
            </div>
          </div>
          {renderReport()}
          <button onClick={() => { setReport(null); setBreed(""); }} style={{ width: "100%", padding: "11px 0", marginTop: 4, border: `1px solid ${C.border}`, borderRadius: 10, background: "transparent", color: C.muted, fontSize: 13, fontFamily: "'Outfit', sans-serif", cursor: "pointer" }}>
            ← New Search
          </button>
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────
const TABS = [
  { id: "health", label: "Health Profile", icon: "📋" },
  { id: "photo", label: "Breed ID", icon: "📸" },
  { id: "symptoms", label: "Symptoms", icon: "🩺" },
  { id: "pro", label: "Pro", icon: "👑" },
];

export default function WoofWell() {
  const [tab, setTab] = useState("health");
  const [isPro, setIsPro] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (authLoading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Spinner />
    </div>
  );

  if (!user) return <AuthScreen onAuth={setUser} />;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Outfit', sans-serif" }}>
      <style>{GLOBAL_CSS}</style>

      {/* Header */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 10 }}>
        <PawIcon size={26} />
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: C.text, display: "flex", alignItems: "center", gap: 4 }}>
          <span>Woof</span>
          <PawIcon size={16} color={C.accent} />
          <span>Well</span>
        </span>
        {isPro && (
          <span style={{ marginLeft: 4, background: C.proDim, border: `1px solid ${C.pro}`, borderRadius: 12, padding: "2px 9px", fontSize: 10, color: C.pro, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>PRO</span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>AI-Powered</span>
          <button onClick={handleSignOut} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 10px", color: C.muted, fontSize: 11, fontFamily: "'Outfit', sans-serif", cursor: "pointer" }}>Sign Out</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, display: "flex", overflowX: "auto", padding: "0 8px" }}>
        {TABS.map(t => (
          <button key={t.id} className="tab-btn" onClick={() => setTab(t.id)}
            style={{
              padding: "12px 14px", border: "none", background: "transparent",
              color: tab === t.id ? C.accent : C.muted,
              fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
              cursor: "pointer", whiteSpace: "nowrap", borderBottom: `2px solid ${tab === t.id ? C.accent : "transparent"}`,
              transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5
            }}>
            <span>{t.icon}</span>{t.label}
            {t.id === "pro" && !isPro && <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.pro, display: "inline-block" }} />}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px 60px" }}>
        {tab === "health" && <HealthProfile />}
        {tab === "photo" && <BreedIdentifier isPro={isPro} onUpgrade={() => setTab("pro")} />}
        {tab === "symptoms" && <SymptomChecker isPro={isPro} onUpgrade={() => setTab("pro")} />}
        {tab === "pro" && <Paywall isPro={isPro} onUnlock={() => { setIsPro(true); setTab("health"); }} />}
      </div>
    </div>
  );
}