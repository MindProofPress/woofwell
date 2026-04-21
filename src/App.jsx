import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabase";

// ─── Design Tokens ───────────────────────────────────────────────
const C = {
  bg: "#FAF6F0",
  card: "#FFFFFF",
  card2: "#F3EDE4",
  border: "#E2D5C5",
  accent: "#E8622A",
  accentDim: "#FEF0E8",
  text: "#1E1108",
  muted: "#8B7355",
  success: "#2A7A50",
  warn: "#B8750A",
  danger: "#C0392B",
  pro: "#9A7010",
  proDim: "#FBF4E0",
};

// ─── Global Styles ────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Outfit:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeUp { from { opacity:0; transform:translateY(20px);} to {opacity:1;transform:translateY(0);} }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  * { box-sizing: border-box; }
  body { margin: 0; background: #FAF6F0; }
  ::placeholder { color: #C0AE98; }
  input, select, textarea { outline: none; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: #F3EDE4; }
  ::-webkit-scrollbar-thumb { background: #D0C4B4; border-radius: 2px; }
  .tab-btn:hover { color: #1E1108 !important; }
  .chip:hover { border-color: ${C.accent} !important; color: ${C.accent} !important; background: ${C.accentDim} !important; }
  .pro-btn:hover { background: #7A5808 !important; }
  .free-btn:hover { border-color: ${C.accent} !important; }
  .action-btn:hover { background: #C9541F !important; }
  .action-btn:disabled { opacity: 0.5; cursor: not-allowed !important; }
  .back-btn:hover { color: ${C.text} !important; }
  .upload-area:hover { border-color: ${C.accent} !important; background: ${C.accentDim} !important; }
  .sym-chip { cursor:pointer; transition: all 0.15s; }
  .sym-chip:hover { border-color: ${C.accent} !important; color: ${C.accent} !important; }
  .sym-chip.selected { border-color: ${C.accent} !important; background: ${C.accentDim} !important; color: ${C.accent} !important; }
  .dog-delete-btn:hover { border-color: ${C.danger} !important; color: ${C.danger} !important; }
  input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.3); }
`;

// ─── Scan Limit Hook ──────────────────────────────────────────────
const MAX_FREE_SCANS = 3;

function useScanLimit(userId, isPro) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `scans_${userId}_${today}`;

  const getCount = () => parseInt(localStorage.getItem(key) || "0", 10);

  const [scansUsed, setScansUsed] = useState(getCount);

  const canScan = isPro || scansUsed < MAX_FREE_SCANS;

  const incrementScan = () => {
    if (isPro) return;
    const next = getCount() + 1;
    localStorage.setItem(key, next);
    setScansUsed(next);
  };

  return { scansUsed, canScan, incrementScan, maxScans: MAX_FREE_SCANS };
}

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
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 22px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", ...style }}>
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
function Paywall({ onUnlock, isPro, userId }) {
  const [billing, setBilling] = useState("annual");
  const [showCheckout, setShowCheckout] = useState(false);
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  const formatCard = (v) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const formatExpiry = (v) => { const d = v.replace(/\D/g, "").slice(0, 4); return d.length >= 3 ? d.slice(0, 2) + "/" + d.slice(2) : d; };

  const handlePayment = async () => {
    setProcessing(true);
    await new Promise(r => setTimeout(r, 2200));
    await supabase.from("profiles").upsert({ id: userId, is_pro: true, pro_since: new Date().toISOString() }, { onConflict: "id" });
    setProcessing(false);
    setDone(true);
    await new Promise(r => setTimeout(r, 1200));
    onUnlock();
  };

  const monthly = 4.99;
  const annual = 3.33;
  const price = billing === "annual" ? annual : monthly;
  const inputStyle = { width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, color: C.text, fontFamily: "'Outfit', sans-serif", marginBottom: 14 };

  if (showCheckout) return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      {done ? (
        <Card style={{ textAlign: "center", padding: "50px 20px", borderColor: C.success }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, color: C.success, fontWeight: 700 }}>Payment Successful!</div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 8 }}>Activating your Pro account...</div>
        </Card>
      ) : (
        <>
          <button onClick={() => setShowCheckout(false)} className="back-btn"
            style={{ background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer", marginBottom: 16, fontFamily: "'Outfit', sans-serif", padding: 0 }}>
            ← Back
          </button>
          <Card style={{ marginBottom: 14, background: C.proDim, borderColor: C.pro }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.pro }}>WoofWell Pro — {billing === "annual" ? "Annual" : "Monthly"}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{billing === "annual" ? `$${(3.33 * 12).toFixed(2)}/year` : "$4.99/month"}</div>
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: C.pro }}>${price.toFixed(2)}<span style={{ fontSize: 13, color: C.muted }}>/mo</span></div>
            </div>
          </Card>
          <Card>
            <SectionLabel>Name on Card</SectionLabel>
            <input value={cardName} onChange={e => setCardName(e.target.value)} placeholder="Jane Smith" style={inputStyle} />
            <SectionLabel>Card Number</SectionLabel>
            <input value={cardNumber} onChange={e => setCardNumber(formatCard(e.target.value))} placeholder="1234 5678 9012 3456" style={inputStyle} />
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <SectionLabel>Expiry</SectionLabel>
                <input value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))} placeholder="MM/YY" style={{ ...inputStyle, marginBottom: 0 }} />
              </div>
              <div style={{ flex: 1 }}>
                <SectionLabel>CVV</SectionLabel>
                <input value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="123" style={{ ...inputStyle, marginBottom: 0 }} />
              </div>
            </div>
          </Card>
          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", margin: "12px 0", color: C.muted, fontSize: 12 }}>
            🔒 Secured with 256-bit SSL encryption
          </div>
          <ActionBtn onClick={handlePayment} disabled={!cardName || cardNumber.replace(/\s/g, "").length < 16 || expiry.length < 5 || cvv.length < 3} loading={processing} style={{ background: C.pro }}>
            {processing ? "Processing payment..." : `💳 Pay $${price.toFixed(2)}/mo`}
          </ActionBtn>
          <div style={{ textAlign: "center", color: C.muted, fontSize: 11, marginTop: 10 }}>
            This is a demo — no real charge will occur
          </div>
        </>
      )}
    </div>
  );

  if (isPro) return (
    <Card style={{ textAlign: "center", borderColor: C.pro }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>👑</div>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: C.pro, fontWeight: 700 }}>Woof 🐾 Well Pro Active</div>
      <div style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>All features unlocked. Enjoy unlimited access.</div>
    </Card>
  );

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

      <ActionBtn onClick={() => setShowCheckout(true)} style={{ background: C.pro, marginBottom: 10 }}>
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
function BreedIdentifier({ isPro, onUpgrade, userId }) {
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageMediaType, setImageMediaType] = useState("image/jpeg");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const fileRef = useRef();
  const { scansUsed, canScan, incrementScan, maxScans } = useScanLimit(userId, isPro);

  const loadHistory = async () => {
    const { data } = await supabase.from("scan_history").select("*").eq("user_id", userId).order("scanned_at", { ascending: false }).limit(5);
    if (data) setHistory(data);
  };

  useEffect(() => { loadHistory(); }, []);

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
    if (!canScan) { onUpgrade(); return; }
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
      const parsed = JSON.parse(clean);
      setResult(parsed);
      incrementScan();
      await supabase.from("scan_history").insert({
        user_id: userId,
        breed: parsed.breed,
        confidence: parsed.confidence,
        is_mix: parsed.mix || false,
        secondary_breed: parsed.secondaryBreed || null,
        traits: parsed.traits || [],
        temperament: parsed.temperament,
        fun_fact: parsed.funFact,
      });
      loadHistory();
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
        <div style={{ background: canScan ? C.proDim : "#1F0A0A", border: `1px solid ${canScan ? C.pro + "33" : C.danger + "55"}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: canScan ? C.muted : C.danger }}>{scansUsed}/{maxScans} free scans used today{!canScan && " — limit reached"}</span>
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

      {history.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <SectionLabel>Recent Scans</SectionLabel>
          {history.map(scan => {
            const cc = scan.confidence >= 80 ? C.success : scan.confidence >= 60 ? C.warn : C.danger;
            return (
              <Card key={scan.id} style={{ marginBottom: 8, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{scan.breed}</div>
                    {scan.is_mix && scan.secondary_breed && (
                      <div style={{ fontSize: 11, color: C.muted }}>Mix with {scan.secondary_breed}</div>
                    )}
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                      {new Date(scan.scanned_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: cc, fontFamily: "'JetBrains Mono', monospace" }}>{scan.confidence}%</div>
                    <div style={{ fontSize: 10, color: C.muted }}>confidence</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── SYMPTOM CHECKER ──────────────────────────────────────────────
function SymptomChecker({ isPro, onUpgrade, userId }) {
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
  const { scansUsed, canScan, incrementScan, maxScans } = useScanLimit(userId, isPro);

  const toggle = (s) => setSelected(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const check = async () => {
    if (!selected.length) return;
    if (!canScan) { onUpgrade(); return; }
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
      incrementScan();
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
        <div style={{ background: canScan ? C.proDim : "#1F0A0A", border: `1px solid ${canScan ? C.pro + "33" : C.danger + "55"}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: canScan ? C.muted : C.danger }}>{scansUsed}/{maxScans} free checks used today{!canScan && " — limit reached"}</span>
          <button onClick={onUpgrade} style={{ background: "none", border: "none", color: C.pro, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>Upgrade →</button>
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

// ─── SAVED DOGS ───────────────────────────────────────────────────
function SavedDogs({ userId, dogs, onDogsChange, onViewProfile }) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("adult");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleAdd = async () => {
    if (!name.trim() || !breed.trim()) return;
    setSaving(true); setError(null);
    const { error } = await supabase.from("dogs").insert({ user_id: userId, name: name.trim(), breed: breed.trim(), age });
    if (error) {
      setError("Could not save dog. Please try again.");
    } else {
      setName(""); setBreed(""); setAge("adult"); setShowAdd(false);
      onDogsChange();
    }
    setSaving(false);
  };

  const handleDelete = async (dogId) => {
    await supabase.from("dogs").delete().eq("id", dogId);
    onDogsChange();
  };

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: C.text }}>My Dogs</div>
        <button onClick={() => { setShowAdd(!showAdd); setError(null); }}
          style={{ background: showAdd ? C.card2 : C.accent, border: "none", borderRadius: 8, padding: "7px 14px", color: showAdd ? C.muted : "#fff", fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif", cursor: "pointer" }}>
          {showAdd ? "Cancel" : "+ Add Dog"}
        </button>
      </div>

      {showAdd && (
        <Card style={{ marginBottom: 16, borderColor: C.accent }}>
          <SectionLabel>Dog's Name</SectionLabel>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Buddy"
            style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, color: C.text, fontFamily: "'Outfit', sans-serif", marginBottom: 14 }} />
          <SectionLabel>Breed</SectionLabel>
          <input value={breed} onChange={e => setBreed(e.target.value)} placeholder="e.g. Golden Retriever"
            style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, color: C.text, fontFamily: "'Outfit', sans-serif", marginBottom: 14 }} />
          <SectionLabel>Life Stage</SectionLabel>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
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
          {error && <div style={{ color: C.danger, fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <ActionBtn onClick={handleAdd} disabled={!name.trim() || !breed.trim()} loading={saving}>Save Dog</ActionBtn>
        </Card>
      )}

      {dogs.length === 0 && !showAdd && (
        <Card style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🐕</div>
          <div style={{ color: C.text, fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No dogs saved yet</div>
          <div style={{ color: C.muted, fontSize: 13 }}>Add your dog's profile to get personalized health insights.</div>
        </Card>
      )}

      {dogs.map(dog => (
        <Card key={dog.id} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: C.accentDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <PawIcon size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16, color: C.text }}>{dog.name}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{dog.breed} · <span style={{ textTransform: "capitalize" }}>{dog.age}</span></div>
              </div>
            </div>
            <button className="dog-delete-btn" onClick={() => handleDelete(dog.id)}
              style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 10px", color: C.muted, fontSize: 12, cursor: "pointer", transition: "all 0.15s", flexShrink: 0 }}>✕</button>
          </div>
          <button className="action-btn" onClick={() => onViewProfile(dog)}
            style={{ width: "100%", marginTop: 12, padding: "10px 0", border: "none", borderRadius: 8, background: C.accent, color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif", cursor: "pointer" }}>
            View Health Profile →
          </button>
        </Card>
      ))}
    </div>
  );
}

// ─── HEALTH PROFILE ───────────────────────────────────────────────
function HealthProfile({ selectedDog = null, onClearDog = null }) {
  const [breed, setBreed] = useState(selectedDog?.breed || "");
  const [age, setAge] = useState(selectedDog?.age || "adult");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (selectedDog) {
      setBreed(selectedDog.breed);
      setAge(selectedDog.age);
      setReport(null);
    }
  }, [selectedDog?.id]);

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

  const exportPDF = () => {
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

    const sectionsHTML = sections.map(sec => `
      <div class="section">
        <h2>${sec.heading}</h2>
        <ul>${sec.items.map(item => `<li>${item.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")}</li>`).join("")}</ul>
      </div>`).join("");

    const title = `${age.charAt(0).toUpperCase() + age.slice(1)} ${breed}`;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title} — WoofWell</title><style>
      body{font-family:Georgia,serif;max-width:700px;margin:0 auto;padding:40px 20px;color:#222;line-height:1.7}
      h1{font-size:26px;margin-bottom:2px}
      .meta{color:#888;font-size:12px;margin-bottom:28px;letter-spacing:0.08em;font-family:monospace}
      h2{font-size:15px;color:#E8622A;margin:22px 0 6px;font-family:sans-serif;font-weight:600}
      ul{padding-left:18px;margin:0}li{font-size:14px;margin-bottom:5px}
      .footer{margin-top:40px;font-size:11px;color:#aaa;border-top:1px solid #eee;padding-top:10px}
    </style></head><body>
      <h1>${title}</h1>
      <div class="meta">HEALTH PROFILE · WOOFWELL · ${new Date().toLocaleDateString().toUpperCase()}</div>
      ${sectionsHTML}
      <div class="footer">Generated by WoofWell · woofwell.vercel.app</div>
    </body></html>`;

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      {selectedDog && (
        <div style={{ background: C.accentDim, border: `1px solid ${C.accent}`, borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: C.accent, display: "flex", alignItems: "center", gap: 8 }}>
          <PawIcon size={14} />
          <span>Profile for <strong>{selectedDog.name}</strong></span>
          <button onClick={onClearDog} style={{ marginLeft: "auto", background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 12, padding: 0 }}>Clear</button>
        </div>
      )}
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
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={() => { setReport(null); setBreed(""); if (onClearDog) onClearDog(); }} style={{ flex: 1, padding: "11px 0", border: `1px solid ${C.border}`, borderRadius: 10, background: "transparent", color: C.muted, fontSize: 13, fontFamily: "'Outfit', sans-serif", cursor: "pointer" }}>
              ← New Search
            </button>
            <button onClick={exportPDF} style={{ flex: 1, padding: "11px 0", border: `1px solid ${C.accent}`, borderRadius: 10, background: "transparent", color: C.accent, fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif", cursor: "pointer" }}>
              📄 Export PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── VET REMINDERS ────────────────────────────────────────────────
function VetReminders({ userId, dogs }) {
  const [reminders, setReminders] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [dogId, setDogId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadReminders = async () => {
    const { data } = await supabase.from("vet_reminders").select("*, dogs(name)").eq("user_id", userId).order("reminder_date", { ascending: true });
    if (data) setReminders(data);
  };

  useEffect(() => { loadReminders(); }, []);

  const handleAdd = async () => {
    if (!title.trim() || !date) return;
    setSaving(true); setError(null);
    const { error } = await supabase.from("vet_reminders").insert({ user_id: userId, title: title.trim(), reminder_date: date, dog_id: dogId || null, notes: notes.trim() });
    if (error) { setError("Could not save reminder."); } else { setTitle(""); setDate(""); setDogId(""); setNotes(""); setShowAdd(false); loadReminders(); }
    setSaving(false);
  };

  const handleToggle = async (id, completed) => {
    await supabase.from("vet_reminders").update({ completed: !completed }).eq("id", id);
    loadReminders();
  };

  const handleDelete = async (id) => {
    await supabase.from("vet_reminders").delete().eq("id", id);
    loadReminders();
  };

  const today = new Date().toISOString().slice(0, 10);
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const getStatus = (dateStr, completed) => {
    if (completed) return { color: C.success };
    if (dateStr < today) return { color: C.danger, label: "Overdue" };
    if (dateStr <= weekFromNow) return { color: C.warn, label: "Soon" };
    return { color: C.border };
  };

  const formatDate = (d) => new Date(d + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  const upcoming = reminders.filter(r => !r.completed);
  const done = reminders.filter(r => r.completed);

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: C.text }}>Vet Reminders</div>
        <button onClick={() => { setShowAdd(!showAdd); setError(null); }}
          style={{ background: showAdd ? C.card2 : C.accent, border: "none", borderRadius: 8, padding: "7px 14px", color: showAdd ? C.muted : "#fff", fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif", cursor: "pointer" }}>
          {showAdd ? "Cancel" : "+ Add Reminder"}
        </button>
      </div>

      {showAdd && (
        <Card style={{ marginBottom: 16, borderColor: C.accent }}>
          <SectionLabel>Title</SectionLabel>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Annual checkup, Rabies vaccine..."
            style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, color: C.text, fontFamily: "'Outfit', sans-serif", marginBottom: 14 }} />
          <SectionLabel>Date</SectionLabel>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, color: C.text, fontFamily: "'Outfit', sans-serif", marginBottom: 14, colorScheme: "dark" }} />
          {dogs.length > 0 && (
            <>
              <SectionLabel>Dog (optional)</SectionLabel>
              <select value={dogId} onChange={e => setDogId(e.target.value)}
                style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, color: dogId ? C.text : C.muted, fontFamily: "'Outfit', sans-serif", marginBottom: 14 }}>
                <option value="">No specific dog</option>
                {dogs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </>
          )}
          <SectionLabel>Notes (optional)</SectionLabel>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any details..."
            style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, color: C.text, fontFamily: "'Outfit', sans-serif", marginBottom: 16 }} />
          {error && <div style={{ color: C.danger, fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <ActionBtn onClick={handleAdd} disabled={!title.trim() || !date} loading={saving}>Save Reminder</ActionBtn>
        </Card>
      )}

      {reminders.length === 0 && !showAdd && (
        <Card style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
          <div style={{ color: C.text, fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No reminders yet</div>
          <div style={{ color: C.muted, fontSize: 13 }}>Add vet appointments, vaccinations, and checkup alerts.</div>
        </Card>
      )}

      {upcoming.map(r => {
        const { color, label } = getStatus(r.reminder_date, r.completed);
        return (
          <Card key={r.id} style={{ marginBottom: 10, borderLeft: `3px solid ${color}` }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, fontSize: 15, color: C.text }}>{r.title}</span>
                  {label && <span style={{ fontSize: 10, background: color + "22", border: `1px solid ${color}44`, borderRadius: 10, padding: "1px 7px", color, fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>}
                </div>
                <div style={{ fontSize: 12, color: C.muted }}>
                  📅 {formatDate(r.reminder_date)}{r.dogs?.name && <span> · 🐕 {r.dogs.name}</span>}
                </div>
                {r.notes && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{r.notes}</div>}
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => handleToggle(r.id, r.completed)} title="Mark done"
                  style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 9px", color: C.success, fontSize: 14, cursor: "pointer" }}>✓</button>
                <button className="dog-delete-btn" onClick={() => handleDelete(r.id)}
                  style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 9px", color: C.muted, fontSize: 12, cursor: "pointer", transition: "all 0.15s" }}>✕</button>
              </div>
            </div>
          </Card>
        );
      })}

      {done.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <SectionLabel>Completed</SectionLabel>
          {done.map(r => (
            <Card key={r.id} style={{ marginBottom: 8, opacity: 0.5 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 14, color: C.text, textDecoration: "line-through" }}>{r.title}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{formatDate(r.reminder_date)}{r.dogs?.name && ` · ${r.dogs.name}`}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => handleToggle(r.id, r.completed)} title="Reopen"
                    style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 9px", color: C.muted, fontSize: 12, cursor: "pointer" }}>↩</button>
                  <button className="dog-delete-btn" onClick={() => handleDelete(r.id)}
                    style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 9px", color: C.muted, fontSize: 12, cursor: "pointer", transition: "all 0.15s" }}>✕</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────
const TABS = [
  { id: "dogs", label: "My Dogs", icon: "🐕" },
  { id: "reminders", label: "Reminders", icon: "🔔" },
  { id: "health", label: "Health Profile", icon: "📋" },
  { id: "photo", label: "Breed ID", icon: "📸" },
  { id: "symptoms", label: "Symptoms", icon: "🩺" },
  { id: "pro", label: "Pro", icon: "👑" },
];

export default function WoofWell() {
  const [tab, setTab] = useState("dogs");
  const [isPro, setIsPro] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dogs, setDogs] = useState([]);
  const [selectedDog, setSelectedDog] = useState(null);

  const fetchDogs = async (uid) => {
    const { data } = await supabase.from("dogs").select("*").eq("user_id", uid).order("created_at", { ascending: false });
    if (data) setDogs(data);
  };

  const fetchProfile = async (uid) => {
    const { data } = await supabase.from("profiles").select("is_pro").eq("id", uid).single();
    if (data?.is_pro) setIsPro(true);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (session?.user) { fetchDogs(session.user.id); fetchProfile(session.user.id); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) { fetchDogs(session.user.id); fetchProfile(session.user.id); }
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
        {tab === "dogs" && <SavedDogs userId={user.id} dogs={dogs} onDogsChange={() => fetchDogs(user.id)} onViewProfile={(dog) => { setSelectedDog(dog); setTab("health"); }} />}
        {tab === "reminders" && <VetReminders userId={user.id} dogs={dogs} />}
        {tab === "health" && <HealthProfile selectedDog={selectedDog} onClearDog={() => setSelectedDog(null)} />}
        {tab === "photo" && <BreedIdentifier isPro={isPro} onUpgrade={() => setTab("pro")} userId={user.id} />}
        {tab === "symptoms" && <SymptomChecker isPro={isPro} onUpgrade={() => setTab("pro")} userId={user.id} />}
        {tab === "pro" && <Paywall isPro={isPro} userId={user.id} onUnlock={() => { setIsPro(true); setTab("dogs"); }} />}
      </div>
    </div>
  );
}