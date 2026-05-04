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
function AuthScreen({ onAuth, initialMode = "login", onBack = null }) {
  const [mode, setMode] = useState(initialMode);
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
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{GLOBAL_CSS}</style>
      {onBack && (
        <button onClick={onBack} className="back-btn" style={{ position: "fixed", top: 16, left: 16, background: "none", border: "none", color: C.muted, fontSize: 13, fontFamily: "'Outfit', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          ← Back to WoofWell
        </button>
      )}
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

        <p style={{ textAlign: "center", fontSize: 12, color: C.muted, marginTop: 20 }}>
          <a href="/privacy.html" style={{ color: C.muted }}>Privacy Policy</a>
          {" · "}
          <a href="/terms.html" style={{ color: C.muted }}>Terms of Service</a>
        </p>
      </div>
    </div>
  );
}

// ─── LANDING PAGE ────────────────────────────────────────────────
function LandingPage({ onAuth }) {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("signup");

  if (showAuth) return <AuthScreen onAuth={onAuth} initialMode={authMode} onBack={() => setShowAuth(false)} />;

  const features = [
    { icon: "📸", title: "AI Breed Identifier", desc: "Upload a photo of any dog and get instant breed identification with detailed information about temperament, care needs, and health considerations." },
    { icon: "🩺", title: "Symptom Checker", desc: "Describe your dog's symptoms and receive an AI-powered triage assessment to help you decide whether to visit the vet urgently or monitor at home." },
    { icon: "💬", title: "24/7 AI Vet Chat", desc: "Get instant answers to your dog health questions any time of day. Our AI is powered by up-to-date veterinary knowledge and tailored to your specific dog." },
    { icon: "📋", title: "Health Profiles", desc: "Generate comprehensive health profiles for any breed covering common conditions, lifespan, exercise needs, diet recommendations, and grooming tips." },
    { icon: "💉", title: "Vaccination Records", desc: "Keep all your dog's vaccination records organized in one place. Set reminders so you never miss an important booster shot." },
    { icon: "📊", title: "Weight Tracker", desc: "Track your dog's weight over time with visual trend charts. Maintaining a healthy weight is one of the most important factors in a dog's longevity." },
    { icon: "📝", title: "Health Journal", desc: "Log daily health observations, symptoms, and notes. Build a detailed health history that's invaluable when speaking with your veterinarian." },
    { icon: "🔔", title: "Vet Reminders", desc: "Never miss a vet appointment again. Set and manage reminders for checkups, dental cleanings, flea treatments, and other recurring health tasks." },
    { icon: "⚖️", title: "Breed Compare", desc: "Compare two dog breeds side by side across key dimensions including health risks, exercise needs, grooming, and suitability for different lifestyles." },
    { icon: "🔧", title: "Dog Tools", desc: "Handy calculators including a dog age converter (dog years to human years) and a feeding calculator to find the right portion size for your dog." },
    { icon: "🚨", title: "Emergency Guide", desc: "Step-by-step first aid guides for common dog emergencies including choking, poisoning, heatstroke, and injuries. Potentially life-saving information." },
    { icon: "🐕", title: "Multi-Dog Support", desc: "Manage health profiles for your entire pack. Add unlimited dogs and keep each pet's health records, reminders, and journal entries separate and organized." },
  ];

  const articles = [
    {
      title: "Recognizing Signs Your Dog Needs Veterinary Care",
      body: [
        "Knowing when to call the vet is one of the most important skills a dog owner can develop. While some symptoms can be safely monitored at home, others require immediate professional attention.",
        "**Urgent signs that warrant an emergency vet visit:** Difficulty breathing, collapse or inability to stand, seizures lasting more than a few minutes, suspected poisoning, severe trauma, uncontrolled bleeding, inability to urinate (especially in male dogs), a bloated or distended abdomen, loss of consciousness, or signs of extreme pain.",
        "**Signs to call your vet within 24 hours:** Vomiting or diarrhea lasting more than 24 hours, noticeable limping that does not improve, loss of appetite for more than a day, unusual lethargy or tiredness, eye or ear discharge, excessive scratching or sudden skin changes, and unexplained weight loss or gain.",
        "**Monitoring at home may be appropriate for:** Minor cuts or scrapes, mild sneezing without other symptoms, occasional loose stool without blood, and very mild limping after exercise that improves with rest within a few hours.",
        "The WoofWell Symptom Checker can help you triage your dog's symptoms and decide on the best course of action. However, it should always complement — never replace — professional veterinary advice.",
      ]
    },
    {
      title: "Essential Dog Vaccinations: A Complete Owner's Guide",
      body: [
        "Vaccinations are one of the most effective tools we have to protect dogs from serious and potentially fatal diseases. Understanding which vaccines your dog needs and when they are due is a cornerstone of responsible dog ownership.",
        "**Core vaccines (recommended for all dogs):** Rabies is required by law in most regions and protects against the fatal rabies virus. The DHPP combination vaccine protects against Distemper, Hepatitis, Parvovirus, and Parainfluenza — four serious diseases that are common in unvaccinated dogs.",
        "**Non-core vaccines (based on lifestyle and risk):** Bordetella (Kennel Cough) is recommended for dogs that visit grooming facilities, dog parks, or boarding kennels. Leptospirosis is recommended for dogs exposed to wildlife or standing water. Lyme disease vaccine is recommended in tick-endemic regions. Canine Influenza is recommended for dogs with frequent contact with other dogs.",
        "**Puppy vaccination schedule:** Puppies typically receive their first DHPP at 6–8 weeks, a booster at 10–12 weeks, then DHPP and Rabies at 14–16 weeks. Boosters are given at 12–16 months, then every 1–3 years depending on the vaccine type and your veterinarian's recommendation.",
        "WoofWell's Vaccination Records feature helps you track all of your dog's immunizations and sends reminders when boosters are due, so you never fall behind on your dog's protection.",
      ]
    },
    {
      title: "Dog Nutrition Basics: Feeding Your Dog for a Long, Healthy Life",
      body: [
        "What your dog eats has a profound impact on their health, energy levels, coat condition, and longevity. Understanding the fundamentals of dog nutrition helps you make better decisions at the pet food aisle and beyond.",
        "**Protein** is the most important macronutrient for dogs. High-quality animal proteins such as chicken, beef, fish, and lamb should appear as the first ingredient in your dog's food. Protein supports muscle maintenance, immune function, and tissue repair throughout your dog's life.",
        "**Fats** are essential for energy, skin and coat health, brain function, and absorption of fat-soluble vitamins A, D, E, and K. Look for named fat sources like chicken fat or salmon oil rather than generic 'animal fat' on ingredient labels.",
        "**How much to feed** depends on your dog's age, weight, activity level, and the caloric density of the food. As a general starting point: small dogs under 10 lbs need about ¼ to 1 cup per day; medium dogs (10–30 lbs) need 1 to 2 cups; large dogs (30–60 lbs) need 2 to 3 cups; and giant breeds need 3 or more cups. Always follow the feeding guidelines on your specific food and adjust based on body condition.",
        "**Foods that are toxic to dogs:** Chocolate, xylitol (artificial sweetener found in sugar-free products), grapes and raisins, onions and garlic, macadamia nuts, alcohol, caffeine, avocado, and raw yeast dough are all dangerous or fatal to dogs and must be kept out of reach at all times.",
        "Use WoofWell's Feeding Calculator tool to get a personalized feeding recommendation for your dog based on their breed, current weight, and age.",
      ]
    },
  ];

  const breeds = [
    { name: "Labrador Retriever", lifespan: "10–12 yrs", size: "Large (55–80 lbs)", health: "Hip dysplasia, obesity, ear infections", trait: "Friendly, outgoing, active" },
    { name: "Golden Retriever", lifespan: "10–12 yrs", size: "Large (55–75 lbs)", health: "Hip dysplasia, cancer, heart disease", trait: "Intelligent, friendly, devoted" },
    { name: "French Bulldog", lifespan: "10–12 yrs", size: "Small (under 28 lbs)", health: "Brachycephalic syndrome, allergies, spinal disorders", trait: "Adaptable, playful, smart" },
    { name: "German Shepherd", lifespan: "9–13 yrs", size: "Large (50–90 lbs)", health: "Hip & elbow dysplasia, bloat, degenerative myelopathy", trait: "Confident, courageous, intelligent" },
    { name: "Beagle", lifespan: "10–15 yrs", size: "Medium (20–30 lbs)", health: "Epilepsy, hypothyroidism, obesity", trait: "Curious, friendly, merry" },
    { name: "Poodle", lifespan: "10–18 yrs", size: "Toy to Standard (4–70 lbs)", health: "Hip dysplasia, Addison's disease, bloat", trait: "Intelligent, active, elegant" },
  ];

  const footerLinks = [
    { label: "About", href: "/about.html" },
    { label: "Privacy Policy", href: "/privacy.html" },
    { label: "Terms of Service", href: "/terms.html" },
    { label: "Contact", href: "mailto:mindproofpress@gmail.com" },
  ];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Outfit', sans-serif", color: C.text }}>
      <style>{GLOBAL_CSS}</style>

      {/* Nav */}
      <header style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "14px 24px", display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <PawIcon size={26} />
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: C.text }}>
            Woof<span style={{ color: C.accent }}>Well</span>
          </span>
        </div>
        <nav style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/about.html" style={{ fontSize: 13, color: C.muted, textDecoration: "none", fontWeight: 500 }}>About</a>
          <button onClick={() => { setAuthMode("login"); setShowAuth(true); }} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 14px", color: C.text, fontSize: 13, fontFamily: "'Outfit', sans-serif", cursor: "pointer", fontWeight: 500 }}>
            Sign In
          </button>
          <button onClick={() => { setAuthMode("signup"); setShowAuth(true); }} style={{ padding: "6px 16px", border: "none", borderRadius: 8, background: C.accent, color: "#fff", fontSize: 13, fontFamily: "'Outfit', sans-serif", cursor: "pointer", fontWeight: 600 }}>
            Get Started Free
          </button>
        </nav>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 720, margin: "0 auto", padding: "72px 24px 60px", textAlign: "center" }}>
        <div style={{ display: "inline-block", background: C.accentDim, border: `1px solid ${C.accent}`, borderRadius: 20, padding: "4px 16px", fontSize: 12, color: C.accent, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 24 }}>
          AI-POWERED DOG HEALTH
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(2.2rem, 6vw, 3.4rem)", fontWeight: 700, color: C.text, lineHeight: 1.15, margin: "0 0 20px" }}>
          The Complete Dog Health Companion
        </h1>
        <p style={{ fontSize: 17, color: C.muted, lineHeight: 1.7, maxWidth: 520, margin: "0 auto 36px" }}>
          WoofWell combines AI technology with comprehensive dog health tools — breed identification, symptom checking, vaccination tracking, emergency guides, and more. Everything you need to keep your dog healthy, all in one place.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => { setAuthMode("signup"); setShowAuth(true); }} style={{ padding: "14px 32px", border: "none", borderRadius: 10, background: C.accent, color: "#fff", fontSize: 15, fontWeight: 600, fontFamily: "'Outfit', sans-serif", cursor: "pointer" }}>
            Start for Free
          </button>
          <button onClick={() => { setAuthMode("login"); setShowAuth(true); }} style={{ padding: "14px 32px", border: `1px solid ${C.border}`, borderRadius: 10, background: "transparent", color: C.text, fontSize: 15, fontWeight: 500, fontFamily: "'Outfit', sans-serif", cursor: "pointer" }}>
            Sign In
          </button>
        </div>
        <p style={{ fontSize: 12, color: C.muted, marginTop: 14 }}>Free to use · No credit card required</p>
      </section>

      {/* Features Grid */}
      <section style={{ background: C.card, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "60px 24px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2rem", fontWeight: 700, color: C.text, textAlign: "center", margin: "0 0 8px" }}>Everything Your Dog Needs</h2>
          <p style={{ color: C.muted, textAlign: "center", fontSize: 15, marginBottom: 48 }}>12 powerful tools covering every aspect of your dog's health and wellness</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
            {features.map(f => (
              <div key={f.title} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 22px" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: "0 0 8px" }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dog Health Articles */}
      <section style={{ maxWidth: 800, margin: "0 auto", padding: "64px 24px" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2rem", fontWeight: 700, color: C.text, margin: "0 0 8px" }}>Dog Health Guide</h2>
        <p style={{ color: C.muted, fontSize: 15, marginBottom: 48 }}>Evidence-based information to help you care for your dog</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
          {articles.map(a => (
            <article key={a.title} style={{ borderTop: `1px solid ${C.border}`, paddingTop: 36 }}>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 700, color: C.text, margin: "0 0 20px" }}>{a.title}</h3>
              <div style={{ fontSize: 14, color: C.text, lineHeight: 1.85 }}>
                {a.body.map((para, i) => (
                  <p key={i} style={{ margin: "0 0 14px" }}>{parseMarkdown(para)}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Breed Profiles */}
      <section style={{ background: C.card2, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "60px 24px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2rem", fontWeight: 700, color: C.text, margin: "0 0 8px" }}>Popular Breed Profiles</h2>
          <p style={{ color: C.muted, fontSize: 15, marginBottom: 40 }}>Key health facts for six of the most popular dog breeds</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {breeds.map(b => (
              <div key={b.name} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 22px" }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: "0 0 14px" }}>{b.name}</h3>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 2 }}>
                  <div><strong style={{ color: C.text }}>Lifespan:</strong> {b.lifespan}</div>
                  <div><strong style={{ color: C.text }}>Size:</strong> {b.size}</div>
                  <div><strong style={{ color: C.text }}>Temperament:</strong> {b.trait}</div>
                  <div><strong style={{ color: C.text }}>Health watch:</strong> {b.health}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section style={{ maxWidth: 560, margin: "0 auto", padding: "72px 24px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2rem", fontWeight: 700, color: C.text, margin: "0 0 12px" }}>Start Caring Smarter</h2>
        <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7, margin: "0 0 32px" }}>
          Join dog owners using WoofWell to track health records, identify breeds, check symptoms, and get AI-powered veterinary guidance — all for free.
        </p>
        <button onClick={() => { setAuthMode("signup"); setShowAuth(true); }} style={{ padding: "15px 40px", border: "none", borderRadius: 10, background: C.accent, color: "#fff", fontSize: 16, fontWeight: 600, fontFamily: "'Outfit', sans-serif", cursor: "pointer" }}>
          Create Your Free Account
        </button>
      </section>

      {/* Footer */}
      <footer style={{ background: C.card, borderTop: `1px solid ${C.border}`, padding: "32px 24px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
          <PawIcon size={18} />
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 700, color: C.text }}>WoofWell</span>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap", marginBottom: 16 }}>
          {footerLinks.map(link => (
            <a key={link.label} href={link.href} style={{ fontSize: 13, color: C.muted, textDecoration: "none", fontWeight: 500 }}>
              {link.label}
            </a>
          ))}
        </div>
        <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>© 2026 WoofWell by Mind Proof Press. All rights reserved.</p>
      </footer>
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

      {billing === "monthly" && (
        <div onClick={() => setBilling("annual")} style={{ background: C.proDim, border: `1px solid ${C.pro}44`, borderRadius: 10, padding: "10px 14px", marginBottom: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>💡</span>
          <span style={{ fontSize: 13, color: C.pro, fontWeight: 600 }}>Save ${((monthly - annual) * 12).toFixed(2)}/year — switch to Annual</span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: C.pro }}>Switch →</span>
        </div>
      )}
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

  const streakKey = `streak_${userId}`, streakDateKey = `streak_date_${userId}`;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const lastDate = localStorage.getItem(streakDateKey);
  let streak = parseInt(localStorage.getItem(streakKey) || "1", 10);
  if (lastDate !== today) {
    streak = lastDate === yesterday ? streak + 1 : 1;
    localStorage.setItem(streakKey, streak);
    localStorage.setItem(streakDateKey, today);
  }

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: streak > 1 ? 8 : 16 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: C.text }}>My Dogs</div>
        <button onClick={() => { setShowAdd(!showAdd); setError(null); }}
          style={{ background: showAdd ? C.card2 : C.accent, border: "none", borderRadius: 8, padding: "7px 14px", color: showAdd ? C.muted : "#fff", fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif", cursor: "pointer" }}>
          {showAdd ? "Cancel" : "+ Add Dog"}
        </button>
      </div>

      {streak > 1 && (
        <div style={{ background: C.accentDim, border: `1px solid ${C.accent}44`, borderRadius: 10, padding: "8px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>🔥</span>
          <span style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>{streak}-day streak!</span>
          <span style={{ fontSize: 12, color: C.muted }}>Keep caring for your dogs every day.</span>
        </div>
      )}

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
            <button onClick={() => { navigator.clipboard.writeText(`WoofWell Health Profile — ${age} ${breed}\n\n${report}`); }} style={{ flex: 1, padding: "11px 0", border: `1px solid ${C.border}`, borderRadius: 10, background: "transparent", color: C.muted, fontSize: 13, fontFamily: "'Outfit', sans-serif", cursor: "pointer" }}>
              📋 Copy
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
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {"Notification" in window && Notification.permission === "default" && (
            <button onClick={() => Notification.requestPermission()} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 10px", color: C.muted, fontSize: 11, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>🔔 Enable alerts</button>
          )}
        <button onClick={() => { setShowAdd(!showAdd); setError(null); }}
          style={{ background: showAdd ? C.card2 : C.accent, border: "none", borderRadius: 8, padding: "7px 14px", color: showAdd ? C.muted : "#fff", fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif", cursor: "pointer" }}>
          {showAdd ? "Cancel" : "+ Add Reminder"}
        </button>
        </div>
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

// ─── WEIGHT TRACKER ───────────────────────────────────────────────
function WeightTracker({ userId, dogs }) {
  const [selectedDog, setSelectedDog] = useState(dogs[0]?.id || "");
  const [logs, setLogs] = useState([]);
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const sel = { width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, color: C.text, fontFamily: "'Outfit', sans-serif" };

  const loadLogs = async (dogId) => {
    if (!dogId) return;
    setLoading(true);
    const { data } = await supabase.from("weight_logs").select("*").eq("user_id", userId).eq("dog_id", dogId).order("logged_at", { ascending: false }).limit(20);
    if (data) setLogs(data);
    setLoading(false);
  };

  useEffect(() => { if (selectedDog) loadLogs(selectedDog); }, [selectedDog]);
  useEffect(() => { if (dogs.length > 0 && !selectedDog) setSelectedDog(dogs[0].id); }, [dogs]);

  const handleSave = async () => {
    if (!weight || !selectedDog) return;
    setSaving(true);
    await supabase.from("weight_logs").insert({ user_id: userId, dog_id: selectedDog, weight_lbs: parseFloat(weight), logged_at: date, notes: notes || null });
    setWeight(""); setNotes("");
    await loadLogs(selectedDog);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await supabase.from("weight_logs").delete().eq("id", id);
    setLogs(prev => prev.filter(l => l.id !== id));
  };

  const trend = logs.length >= 2 ? (logs[0].weight_lbs > logs[1].weight_lbs ? "up" : logs[0].weight_lbs < logs[1].weight_lbs ? "down" : "same") : null;

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: C.text, margin: 0 }}>Weight Log</h2>
        {trend && <span style={{ fontSize: 13, color: trend === "up" ? C.warn : trend === "down" ? C.success : C.muted }}>{trend === "up" ? "↑ Gaining" : trend === "down" ? "↓ Losing" : "→ Stable"}</span>}
      </div>
      <Card style={{ marginBottom: 14 }}>
        {dogs.length > 1 && (<><SectionLabel>Dog</SectionLabel><select value={selectedDog} onChange={e => setSelectedDog(e.target.value)} style={{ ...sel, marginBottom: 14 }}>{dogs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></>)}
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}><SectionLabel>Weight (lbs)</SectionLabel><input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 45.5" style={sel} /></div>
          <div style={{ flex: 1 }}><SectionLabel>Date</SectionLabel><input type="date" value={date} onChange={e => setDate(e.target.value)} style={sel} /></div>
        </div>
        <SectionLabel>Notes (optional)</SectionLabel>
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. after vet visit" style={{ ...sel, marginBottom: 14 }} />
        <ActionBtn onClick={handleSave} disabled={!weight || !selectedDog} loading={saving}>Log Weight</ActionBtn>
      </Card>

      {logs.length >= 3 && (() => {
        const recent = [...logs].reverse().slice(-10);
        const min = Math.min(...recent.map(l => l.weight_lbs));
        const max = Math.max(...recent.map(l => l.weight_lbs));
        const range = max - min || 1;
        const W = 300, H = 60, P = 8;
        const pts = recent.map((l, i) => `${P + (i / (recent.length - 1)) * (W - P * 2)},${H - P - ((l.weight_lbs - min) / range) * (H - P * 2)}`).join(" ");
        return (
          <Card style={{ marginBottom: 14, padding: "14px 16px" }}>
            <SectionLabel>Trend ({recent.length} entries)</SectionLabel>
            <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
              <polyline points={pts} fill="none" stroke={C.accent} strokeWidth="2" strokeLinejoin="round" />
              {recent.map((l, i) => { const x = P + (i / (recent.length - 1)) * (W - P * 2), y = H - P - ((l.weight_lbs - min) / range) * (H - P * 2); return <circle key={i} cx={x} cy={y} r="3" fill={C.accent} />; })}
            </svg>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}><span>{min} lbs</span><span>{max} lbs</span></div>
          </Card>
        );
      })()}

      {loading ? <div style={{ textAlign: "center", padding: 20 }}><Spinner /></div> : logs.length === 0
        ? <div style={{ textAlign: "center", color: C.muted, fontSize: 14, padding: 30 }}>No weight entries yet.</div>
        : logs.map((log, i) => (
          <Card key={log.id} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 700, color: C.text }}>{log.weight_lbs}</span>
                <span style={{ color: C.muted, fontSize: 13 }}> lbs</span>
                {i === 0 && logs.length > 1 && <span style={{ marginLeft: 8, fontSize: 11, color: log.weight_lbs > logs[1].weight_lbs ? C.warn : C.success }}>{log.weight_lbs > logs[1].weight_lbs ? "+" : ""}{(log.weight_lbs - logs[1].weight_lbs).toFixed(1)} from last</span>}
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{new Date(log.logged_at + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}{log.notes && ` · ${log.notes}`}</div>
              </div>
              <button className="dog-delete-btn" onClick={() => handleDelete(log.id)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 9px", color: C.muted, fontSize: 12, cursor: "pointer", transition: "all 0.15s" }}>✕</button>
            </div>
          </Card>
        ))}
    </div>
  );
}

// ─── VACCINATION RECORD ───────────────────────────────────────────
const COMMON_VACCINES = ["Rabies", "DHPP", "Bordetella", "Leptospirosis", "Lyme", "Canine Influenza", "Heartworm Test"];

function VaccinationRecord({ userId, dogs }) {
  const [selectedDog, setSelectedDog] = useState(dogs[0]?.id || "");
  const [vaccines, setVaccines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [dateGiven, setDateGiven] = useState("");
  const [nextDue, setNextDue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const sel = { width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, color: C.text, fontFamily: "'Outfit', sans-serif" };

  const loadVaccines = async (dogId) => {
    if (!dogId) return;
    setLoading(true);
    const { data } = await supabase.from("vaccinations").select("*").eq("user_id", userId).eq("dog_id", dogId).order("next_due", { ascending: true });
    if (data) setVaccines(data);
    setLoading(false);
  };

  useEffect(() => { if (selectedDog) loadVaccines(selectedDog); }, [selectedDog]);
  useEffect(() => { if (dogs.length > 0 && !selectedDog) setSelectedDog(dogs[0].id); }, [dogs]);

  const handleSave = async () => {
    if (!name || !selectedDog) return;
    setSaving(true);
    await supabase.from("vaccinations").insert({ user_id: userId, dog_id: selectedDog, vaccine_name: name, date_given: dateGiven || null, next_due: nextDue || null, notes: notes || null });
    setName(""); setDateGiven(""); setNextDue(""); setNotes("");
    setShowAdd(false);
    await loadVaccines(selectedDog);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await supabase.from("vaccinations").delete().eq("id", id);
    setVaccines(prev => prev.filter(v => v.id !== id));
  };

  const getStatus = (v) => {
    if (!v.next_due) return "none";
    const days = (new Date(v.next_due) - new Date()) / 86400000;
    return days < 0 ? "overdue" : days <= 30 ? "soon" : "ok";
  };
  const statusColor = { overdue: C.danger, soon: C.warn, ok: C.success, none: C.muted };
  const statusLabel = { overdue: "Overdue", soon: "Due soon", ok: "Up to date", none: "No due date" };

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: C.text, margin: 0 }}>Vaccinations</h2>
        <button onClick={() => setShowAdd(!showAdd)} style={{ background: showAdd ? C.bg : C.accent, border: `1px solid ${showAdd ? C.border : C.accent}`, borderRadius: 8, padding: "8px 14px", color: showAdd ? C.muted : "#fff", fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif", cursor: "pointer" }}>{showAdd ? "Cancel" : "+ Add"}</button>
      </div>

      {dogs.length > 1 && <Card style={{ marginBottom: 14 }}><SectionLabel>Dog</SectionLabel><select value={selectedDog} onChange={e => setSelectedDog(e.target.value)} style={sel}>{dogs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Card>}

      {showAdd && (
        <Card style={{ marginBottom: 14, borderColor: C.accent }}>
          <SectionLabel>Quick Select</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {COMMON_VACCINES.map(v => <button key={v} onClick={() => setName(v)} className="chip" style={{ background: name === v ? C.accentDim : C.bg, border: `1px solid ${name === v ? C.accent : C.border}`, borderRadius: 16, padding: "4px 10px", fontSize: 12, color: name === v ? C.accent : C.muted, fontFamily: "'Outfit', sans-serif", cursor: "pointer", transition: "all 0.15s" }}>{v}</button>)}
          </div>
          <SectionLabel>Vaccine Name</SectionLabel>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Or enter custom vaccine..." style={{ ...sel, marginBottom: 14 }} />
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}><SectionLabel>Date Given</SectionLabel><input type="date" value={dateGiven} onChange={e => setDateGiven(e.target.value)} style={sel} /></div>
            <div style={{ flex: 1 }}><SectionLabel>Next Due</SectionLabel><input type="date" value={nextDue} onChange={e => setNextDue(e.target.value)} style={sel} /></div>
          </div>
          <SectionLabel>Notes (optional)</SectionLabel>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Dr. Smith's clinic" style={{ ...sel, marginBottom: 14 }} />
          <ActionBtn onClick={handleSave} disabled={!name} loading={saving}>Save Vaccine</ActionBtn>
        </Card>
      )}

      {loading ? <div style={{ textAlign: "center", padding: 20 }}><Spinner /></div> : vaccines.length === 0
        ? <div style={{ textAlign: "center", color: C.muted, fontSize: 14, padding: 30 }}>No vaccinations recorded yet.</div>
        : vaccines.map(v => {
          const s = getStatus(v);
          return (
            <Card key={v.id} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{v.vaccine_name}</span>
                    <span style={{ fontSize: 10, background: statusColor[s] + "22", color: statusColor[s], border: `1px solid ${statusColor[s]}44`, borderRadius: 10, padding: "1px 7px", fontFamily: "'JetBrains Mono', monospace" }}>{statusLabel[s]}</span>
                  </div>
                  {v.date_given && <div style={{ fontSize: 12, color: C.muted }}>Given: {new Date(v.date_given + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>}
                  {v.next_due && <div style={{ fontSize: 12, color: statusColor[s] }}>Due: {new Date(v.next_due + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>}
                  {v.notes && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{v.notes}</div>}
                </div>
                <button className="dog-delete-btn" onClick={() => handleDelete(v.id)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 9px", color: C.muted, fontSize: 12, cursor: "pointer", transition: "all 0.15s", flexShrink: 0 }}>✕</button>
              </div>
            </Card>
          );
        })}
    </div>
  );
}

// ─── SYMPTOM JOURNAL ──────────────────────────────────────────────
function SymptomJournal({ userId, dogs }) {
  const [filterDog, setFilterDog] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [mood, setMood] = useState("good");
  const [notes, setNotes] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [dogForEntry, setDogForEntry] = useState("");
  const [saving, setSaving] = useState(false);
  const sel = { width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, color: C.text, fontFamily: "'Outfit', sans-serif" };

  const loadEntries = async () => {
    setLoading(true);
    let q = supabase.from("symptom_journal").select("*, dogs(name)").eq("user_id", userId).order("entry_date", { ascending: false }).limit(30);
    if (filterDog) q = q.eq("dog_id", filterDog);
    const { data } = await q;
    if (data) setEntries(data);
    setLoading(false);
  };

  useEffect(() => { loadEntries(); }, [filterDog]);

  const handleSave = async () => {
    if (!notes.trim()) return;
    setSaving(true);
    await supabase.from("symptom_journal").insert({ user_id: userId, dog_id: dogForEntry || null, entry_date: entryDate, mood, notes: notes.trim() });
    setNotes(""); setMood("good"); setShowAdd(false);
    await loadEntries();
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await supabase.from("symptom_journal").delete().eq("id", id);
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const moodEmoji = { good: "😊", fair: "😐", poor: "😟" };
  const moodColor = { good: C.success, fair: C.warn, poor: C.danger };

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: C.text, margin: 0 }}>Health Journal</h2>
        <button onClick={() => setShowAdd(!showAdd)} style={{ background: showAdd ? C.bg : C.accent, border: `1px solid ${showAdd ? C.border : C.accent}`, borderRadius: 8, padding: "8px 14px", color: showAdd ? C.muted : "#fff", fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif", cursor: "pointer" }}>{showAdd ? "Cancel" : "+ Log Entry"}</button>
      </div>

      {showAdd && (
        <Card style={{ marginBottom: 14, borderColor: C.accent }}>
          {dogs.length > 0 && (<><SectionLabel>Dog (optional)</SectionLabel><select value={dogForEntry} onChange={e => setDogForEntry(e.target.value)} style={{ ...sel, marginBottom: 14 }}><option value="">General / all dogs</option>{dogs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></>)}
          <SectionLabel>How is your dog feeling?</SectionLabel>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {["good", "fair", "poor"].map(m => (
              <button key={m} onClick={() => setMood(m)} style={{ flex: 1, padding: "10px 0", border: `1px solid ${mood === m ? moodColor[m] : C.border}`, borderRadius: 10, background: mood === m ? moodColor[m] + "22" : C.bg, color: mood === m ? moodColor[m] : C.muted, fontSize: 13, fontFamily: "'Outfit', sans-serif", cursor: "pointer", transition: "all 0.15s" }}>
                {moodEmoji[m]} {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          <SectionLabel>Date</SectionLabel>
          <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} style={{ ...sel, marginBottom: 14 }} />
          <SectionLabel>Notes</SectionLabel>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Describe symptoms, behavior, appetite, energy level..." rows={3} style={{ ...sel, resize: "vertical", marginBottom: 14 }} />
          <ActionBtn onClick={handleSave} disabled={!notes.trim()} loading={saving}>Save Entry</ActionBtn>
        </Card>
      )}

      {dogs.length > 1 && !showAdd && (
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {[{ id: "", name: "All" }, ...dogs].map(d => (
            <button key={d.id} onClick={() => setFilterDog(d.id)} className="chip" style={{ background: filterDog === d.id ? C.accentDim : C.bg, border: `1px solid ${filterDog === d.id ? C.accent : C.border}`, borderRadius: 16, padding: "4px 12px", fontSize: 12, color: filterDog === d.id ? C.accent : C.muted, fontFamily: "'Outfit', sans-serif", cursor: "pointer" }}>{d.name}</button>
          ))}
        </div>
      )}

      {loading ? <div style={{ textAlign: "center", padding: 20 }}><Spinner /></div> : entries.length === 0
        ? <div style={{ textAlign: "center", color: C.muted, fontSize: 14, padding: 30 }}>No journal entries yet.</div>
        : entries.map(e => (
          <Card key={e.id} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>{moodEmoji[e.mood]}</span>
                  <span style={{ fontSize: 12, color: moodColor[e.mood], fontWeight: 600, textTransform: "capitalize" }}>{e.mood}</span>
                  <span style={{ fontSize: 11, color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>{new Date(e.entry_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  {e.dogs?.name && <span style={{ fontSize: 11, color: C.muted }}>· {e.dogs.name}</span>}
                </div>
                <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{e.notes}</div>
              </div>
              <button className="dog-delete-btn" onClick={() => handleDelete(e.id)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 9px", color: C.muted, fontSize: 12, cursor: "pointer", transition: "all 0.15s", flexShrink: 0, marginLeft: 8 }}>✕</button>
            </div>
          </Card>
        ))}
    </div>
  );
}

// ─── EMERGENCY GUIDE ──────────────────────────────────────────────
const FIRST_AID = [
  { title: "Choking", icon: "🫁", steps: ["Look in the mouth — remove visible objects with fingers if safe to do so", "Small dogs: hold upside down, gravity may dislodge the object", "Large dogs: stand behind, place hands below ribcage, give 5 firm abdominal thrusts upward", "If unconscious: close mouth and breathe into nose — get to emergency vet immediately", "Do not leave the dog alone — monitor breathing at all times"] },
  { title: "Poisoning", icon: "☠️", steps: ["Call ASPCA Poison Control: (888) 426-4435 (fee may apply)", "Do NOT induce vomiting unless specifically instructed by a vet", "Bring the packaging or a sample of the substance to the vet", "Common toxins: grapes, raisins, xylitol, chocolate, onions, garlic, ibuprofen", "Symptoms to watch: vomiting, excessive drooling, seizures, collapse, pale gums"] },
  { title: "Bleeding", icon: "🩹", steps: ["Apply firm, direct pressure with a clean cloth for at least 5 minutes", "Do not remove the cloth — add more material on top if soaked through", "Elevate the limb above heart level if possible", "For spurting blood: apply a tourniquet above the wound only as a last resort", "Seek vet care for any deep, non-stopping, or puncture wounds"] },
  { title: "Heat Stroke", icon: "🌡️", steps: ["Move to shade or air conditioning immediately", "Apply cool (not ice cold) water to paw pads, groin, and armpits", "Offer small sips of cool water to drink if conscious", "Fan the dog while keeping the coat wet", "Rush to emergency vet — heat stroke causes organ failure and is life-threatening"] },
  { title: "Seizures", icon: "⚡", steps: ["Stay calm — do NOT put your hands near the mouth", "Move nearby furniture to prevent injury", "Time the seizure from start to finish", "Keep the room dark and quiet to reduce stimulation", "Seizure lasting >5 minutes or multiple seizures back to back: emergency vet immediately"] },
  { title: "Burns", icon: "🔥", steps: ["Run cool (not cold) water over the burn for at least 10 minutes", "Do not apply ice, butter, toothpaste, or any home remedy", "Cover the area loosely with a clean, damp bandage", "Do not pop or break any blisters that form", "See a vet for any burn larger than a quarter or on the face/paws"] },
  { title: "Broken Bones", icon: "🦴", steps: ["Do not attempt to set, straighten, or splint the bone yourself", "Keep the dog as still and calm as possible", "Muzzle gently if in pain — dogs bite instinctively when hurt", "Slide a flat board under the dog to transport without bending", "Go directly to an emergency vet"] },
  { title: "Eye Injuries", icon: "👁️", steps: ["Do not rub or apply pressure to the eye", "Flush gently with saline solution or clean lukewarm water for 5 minutes", "Prevent the dog from pawing at the eye — use a cone if available", "Do not attempt to remove any embedded object yourself", "See a vet within hours — eye injuries deteriorate rapidly without treatment"] },
];

function EmergencyGuide() {
  const [open, setOpen] = useState(null);
  const [locating, setLocating] = useState(false);

  const findVets = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { window.open(`https://www.google.com/maps/search/emergency+veterinary+clinic/@${coords.latitude},${coords.longitude},13z`, "_blank"); setLocating(false); },
      () => { window.open("https://www.google.com/maps/search/emergency+veterinary+clinic+near+me", "_blank"); setLocating(false); }
    );
  };

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: C.text, margin: "0 0 6px" }}>Emergency</h2>
      <p style={{ color: C.muted, fontSize: 13, margin: "0 0 20px" }}>Quick access to emergency resources and first aid guidance.</p>
      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <button onClick={findVets} disabled={locating} style={{ flex: 1, padding: "14px 0", background: C.danger, border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "'Outfit', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          {locating ? <Spinner /> : "📍"} Find Emergency Vet
        </button>
        <a href="tel:8884264435" style={{ flex: 1, padding: "14px 0", background: C.warn, border: "none", borderRadius: 12, color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, textDecoration: "none" }}>
          ☎️ Poison Control
        </a>
      </div>
      <a href="https://www.pawp.com" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 0", marginBottom: 24, background: C.accentDim, border: `1px solid ${C.accent}44`, borderRadius: 12, color: C.accent, fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif", textDecoration: "none" }}>
        🩺 Talk to a Vet Online — Pawp Telehealth
      </a>
      <SectionLabel>First Aid Quick Reference</SectionLabel>
      {FIRST_AID.map(item => (
        <Card key={item.title} style={{ marginBottom: 8, cursor: "pointer" }} onClick={() => setOpen(open === item.title ? null : item.title)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{item.title}</span>
            </div>
            <span style={{ color: C.muted, fontSize: 12, display: "inline-block", transform: open === item.title ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
          </div>
          {open === item.title && (
            <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
              {item.steps.map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                  <span style={{ width: 20, height: 20, borderRadius: "50%", background: C.accentDim, color: C.accent, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>{i + 1}</span>
                  <span style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{step}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// ─── TOOLS (Dog Age Calculator + Feeding Calculator) ──────────────
function DogAgeCalculator() {
  const [dogYears, setDogYears] = useState("");
  const [size, setSize] = useState("medium");
  const [humanAge, setHumanAge] = useState(null);
  const sel = { width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, color: C.text, fontFamily: "'Outfit', sans-serif" };

  const calculate = () => {
    const y = parseFloat(dogYears);
    if (!y || y <= 0) return;
    const tables = {
      small:  [15, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76],
      medium: [15, 24, 29, 34, 38, 42, 46, 51, 55, 59, 63, 67, 72, 76, 80],
      large:  [15, 24, 31, 38, 45, 49, 56, 64, 71, 79, 88, 97, 105, 115, 120],
    };
    const tbl = tables[size];
    const idx = Math.min(Math.floor(y) - 1, tbl.length - 1);
    const frac = y - Math.floor(y);
    const base = tbl[Math.max(0, idx)];
    const next = tbl[Math.min(idx + 1, tbl.length - 1)];
    setHumanAge(Math.round(base + frac * (next - base)));
  };

  return (
    <Card style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 20 }}>🐶</span>
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: C.text }}>Dog Age Calculator</span>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}><SectionLabel>Dog's Age (years)</SectionLabel><input type="number" value={dogYears} onChange={e => setDogYears(e.target.value)} placeholder="e.g. 4" style={sel} /></div>
        <div style={{ flex: 1 }}><SectionLabel>Size</SectionLabel>
          <select value={size} onChange={e => setSize(e.target.value)} style={sel}>
            <option value="small">Small (&lt;20 lbs)</option>
            <option value="medium">Medium (20–50 lbs)</option>
            <option value="large">Large (&gt;50 lbs)</option>
          </select>
        </div>
      </div>
      <ActionBtn onClick={calculate} disabled={!dogYears}>Calculate Human Age</ActionBtn>
      {humanAge !== null && (
        <div style={{ textAlign: "center", marginTop: 16, padding: "16px 0", background: C.accentDim, borderRadius: 10 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 48, fontWeight: 700, color: C.accent, lineHeight: 1 }}>{humanAge}</div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>human years</div>
        </div>
      )}
    </Card>
  );
}

function FeedingCalculator() {
  const [breed, setBreed] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("adult");
  const [activity, setActivity] = useState("moderate");
  const [foodType, setFoodType] = useState("dry");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const sel = { width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, color: C.text, fontFamily: "'Outfit', sans-serif" };

  const calculate = async () => {
    if (!breed || !weight) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const text = await callClaude(
        "You are a veterinary nutrition expert. Be concise and precise. Always respond with valid JSON only.",
        `Feeding recommendation for: Breed: ${breed}, Weight: ${weight} lbs, Life stage: ${age}, Activity: ${activity}, Food type: ${foodType}. Respond in JSON: {"dailyAmount":"X cups","mealsPerDay":2,"amMeal":"X cups","pmMeal":"X cups","calories":"~X kcal/day","tips":["tip1","tip2","tip3"]}`
      );
      setResult(JSON.parse(text.replace(/```json|```/g, "").trim()));
    } catch { setError("Failed to calculate. Please try again."); }
    setLoading(false);
  };

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 20 }}>🍖</span>
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: C.text }}>Feeding Calculator</span>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}><SectionLabel>Breed</SectionLabel><input value={breed} onChange={e => setBreed(e.target.value)} placeholder="e.g. Labrador" style={sel} /></div>
        <div style={{ flex: 1 }}><SectionLabel>Weight (lbs)</SectionLabel><input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 65" style={sel} /></div>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}><SectionLabel>Life Stage</SectionLabel>
          <select value={age} onChange={e => setAge(e.target.value)} style={sel}>
            <option value="puppy">Puppy</option><option value="adult">Adult</option><option value="senior">Senior</option>
          </select>
        </div>
        <div style={{ flex: 1 }}><SectionLabel>Activity</SectionLabel>
          <select value={activity} onChange={e => setActivity(e.target.value)} style={sel}>
            <option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option>
          </select>
        </div>
      </div>
      <SectionLabel>Food Type</SectionLabel>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {["dry", "wet", "raw", "mixed"].map(t => <button key={t} onClick={() => setFoodType(t)} className="chip" style={{ flex: 1, padding: "8px 0", border: `1px solid ${foodType === t ? C.accent : C.border}`, borderRadius: 8, background: foodType === t ? C.accentDim : C.bg, color: foodType === t ? C.accent : C.muted, fontSize: 12, fontFamily: "'Outfit', sans-serif", cursor: "pointer", textTransform: "capitalize", transition: "all 0.15s" }}>{t}</button>)}
      </div>
      <ActionBtn onClick={calculate} disabled={!breed || !weight} loading={loading}>Calculate Feeding Plan</ActionBtn>
      {error && <div style={{ color: C.danger, fontSize: 13, marginTop: 10, textAlign: "center" }}>{error}</div>}
      {result && (
        <div style={{ marginTop: 16, animation: "fadeUp 0.3s ease" }}>
          <div style={{ background: C.accentDim, borderRadius: 10, padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 10 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: C.accent }}>{result.dailyAmount}</div>
                <div style={{ fontSize: 11, color: C.muted }}>per day</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: C.text }}>{result.mealsPerDay}x</div>
                <div style={{ fontSize: 11, color: C.muted }}>meals/day</div>
              </div>
              <div style={{ textAlign: "center", fontSize: 12, color: C.muted }}>
                <div>🌅 {result.amMeal}</div>
                <div style={{ marginTop: 4 }}>🌙 {result.pmMeal}</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: C.muted, textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}>{result.calories}</div>
          </div>
          {result.tips?.map((tip, i) => <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: C.text, marginBottom: 6 }}><span style={{ color: C.accent, flexShrink: 0 }}>•</span>{tip}</div>)}
          <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
            <SectionLabel>Shop food for {breed}</SectionLabel>
            <div style={{ display: "flex", gap: 8 }}>
              <a href={`https://www.chewy.com/s?query=${encodeURIComponent(breed + " dog food")}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: "9px 0", background: C.accentDim, border: `1px solid ${C.accent}44`, borderRadius: 8, color: C.accent, fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif", textAlign: "center", textDecoration: "none" }}>🛒 Chewy</a>
              <a href={`https://www.amazon.com/s?k=${encodeURIComponent(breed + " dog food")}&tag=woofwell20-20`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: "9px 0", background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif", textAlign: "center", textDecoration: "none" }}>📦 Amazon</a>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function Tools() {
  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: C.text, margin: "0 0 20px" }}>Tools</h2>
      <DogAgeCalculator />
      <FeedingCalculator />
    </div>
  );
}

// ─── VET CHAT ────────────────────────────────────────────────────
function VetChat({ isPro, onUpgrade, dogs }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedDog, setSelectedDog] = useState(dogs[0] || null);
  const bottomRef = useRef();

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);
    const dogCtx = selectedDog ? `The user is asking about their ${selectedDog.age} ${selectedDog.breed} named ${selectedDog.name}.` : "";
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 600, system: `You are a friendly, knowledgeable veterinary AI assistant for WoofWell. ${dogCtx} Give helpful, accurate dog health advice. Always recommend consulting a real vet for serious concerns. Keep responses warm and concise.`, messages: newMsgs }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.content?.find(b => b.type === "text")?.text || "Sorry, I couldn't respond." }]);
    } catch { setMessages(prev => [...prev, { role: "assistant", content: "Connection issue. Please try again." }]); }
    setLoading(false);
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  if (!isPro) return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <Card style={{ textAlign: "center", padding: "40px 20px", borderColor: C.pro }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 8 }}>AI Vet Chat</div>
        <div style={{ color: C.muted, fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>Ask anything about your dog's health. Get instant AI-powered answers, available 24/7.</div>
        <ActionBtn onClick={onUpgrade} style={{ background: C.pro }}>👑 Unlock with Pro</ActionBtn>
      </Card>
    </div>
  );

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: C.text, margin: 0 }}>AI Vet Chat</h2>
        {dogs.length > 0 && (
          <select value={selectedDog?.id || ""} onChange={e => setSelectedDog(dogs.find(d => d.id === e.target.value) || null)} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 12, color: C.text, fontFamily: "'Outfit', sans-serif" }}>
            <option value="">General</option>
            {dogs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
      </div>
      {messages.length === 0 && (
        <Card style={{ marginBottom: 14, background: C.accentDim, borderColor: C.accent + "44" }}>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
            Ask me anything! For example:<br />
            • "Is it normal for my dog to eat grass?"<br />
            • "Signs of hip dysplasia in Labradors?"<br />
            • "How much water should my dog drink daily?"
          </div>
        </Card>
      )}
      <div style={{ maxHeight: 380, overflowY: "auto", marginBottom: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "85%", padding: "10px 14px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: m.role === "user" ? C.accent : C.card, border: m.role === "user" ? "none" : `1px solid ${C.border}`, color: m.role === "user" ? "#fff" : C.text, fontSize: 13, lineHeight: 1.6, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex" }}>
            <div style={{ padding: "10px 14px", borderRadius: "16px 16px 16px 4px", background: C.card, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", gap: 4 }}>{[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.muted, animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}</div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder={`Ask about ${selectedDog?.name || "your dog"}...`}
          style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, color: C.text, fontFamily: "'Outfit', sans-serif" }} />
        <button onClick={send} disabled={!input.trim() || loading}
          style={{ padding: "0 18px", background: input.trim() && !loading ? C.accent : C.card2, border: "none", borderRadius: 10, color: input.trim() && !loading ? "#fff" : C.muted, fontSize: 18, cursor: input.trim() && !loading ? "pointer" : "not-allowed", transition: "all 0.15s" }}>↑</button>
      </div>
    </div>
  );
}

// ─── DOG COMPARE ─────────────────────────────────────────────────
function DogCompare({ isPro, onUpgrade, dogs }) {
  const [dogA, setDogA] = useState(dogs[0] || null);
  const [dogB, setDogB] = useState(dogs[1] || null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const sel = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, color: C.text, fontFamily: "'Outfit', sans-serif", width: "100%" };

  if (!isPro) return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <Card style={{ textAlign: "center", padding: "40px 20px", borderColor: C.pro }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚖️</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 8 }}>Compare Dogs</div>
        <div style={{ color: C.muted, fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>Side-by-side health comparison. Perfect for multi-pet households.</div>
        <ActionBtn onClick={onUpgrade} style={{ background: C.pro }}>👑 Unlock with Pro</ActionBtn>
      </Card>
    </div>
  );

  if (dogs.length < 2) return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <Card style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🐕🐕</div>
        <div style={{ color: C.text, fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Add a second dog first</div>
        <div style={{ color: C.muted, fontSize: 13 }}>You need at least 2 saved dogs to compare.</div>
      </Card>
    </div>
  );

  const compare = async () => {
    if (!dogA || !dogB) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const text = await callClaude("You are a veterinary expert. Respond with valid JSON only.",
        `Compare these two dogs: A: ${dogA.age} ${dogA.breed} (${dogA.name}), B: ${dogB.age} ${dogB.breed} (${dogB.name}). JSON: {"categories":["Lifespan","Exercise","Health Risks","Grooming","Diet","Temperament","Ideal Home"],"dogA":{"name":"${dogA.name}","values":["v1","v2","v3","v4","v5","v6","v7"]},"dogB":{"name":"${dogB.name}","values":["v1","v2","v3","v4","v5","v6","v7"]},"summary":"2 sentence comparison"}`
      );
      setResult(JSON.parse(text.replace(/```json|```/g, "").trim()));
    } catch { setError("Comparison failed. Please try again."); }
    setLoading(false);
  };

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: C.text, margin: "0 0 20px" }}>Compare Dogs</h2>
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}><SectionLabel>Dog A</SectionLabel><select value={dogA?.id || ""} onChange={e => setDogA(dogs.find(d => d.id === e.target.value))} style={sel}>{dogs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
          <div style={{ flex: 1 }}><SectionLabel>Dog B</SectionLabel><select value={dogB?.id || ""} onChange={e => setDogB(dogs.find(d => d.id === e.target.value))} style={sel}>{dogs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
        </div>
        <ActionBtn onClick={compare} disabled={!dogA || !dogB || dogA?.id === dogB?.id} loading={loading}>Compare</ActionBtn>
        {dogA?.id === dogB?.id && <div style={{ color: C.warn, fontSize: 12, textAlign: "center", marginTop: 8 }}>Select two different dogs</div>}
        {error && <div style={{ color: C.danger, fontSize: 13, marginTop: 10, textAlign: "center" }}>{error}</div>}
      </Card>
      {result && (
        <div style={{ animation: "fadeUp 0.3s ease" }}>
          <Card style={{ marginBottom: 14, background: C.accentDim, borderColor: C.accent + "44" }}>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7 }}>{result.summary}</div>
          </Card>
          {result.categories.map((cat, i) => (
            <Card key={cat} style={{ marginBottom: 8 }}>
              <SectionLabel>{cat}</SectionLabel>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1, background: C.accentDim, borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 11, color: C.accent, fontWeight: 600, marginBottom: 3 }}>{result.dogA.name}</div>
                  <div style={{ fontSize: 13, color: C.text }}>{result.dogA.values[i]}</div>
                </div>
                <div style={{ flex: 1, background: C.card2, borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 3 }}>{result.dogB.name}</div>
                  <div style={{ fontSize: 13, color: C.text }}>{result.dogB.values[i]}</div>
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
  { id: "dogs",      label: "My Dogs",    icon: "🐕" },
  { id: "reminders", label: "Reminders",  icon: "🔔" },
  { id: "weight",    label: "Weight",     icon: "📊" },
  { id: "vaccines",  label: "Vaccines",   icon: "💉" },
  { id: "journal",   label: "Journal",    icon: "📝" },
  { id: "health",    label: "Health",     icon: "📋" },
  { id: "photo",     label: "Breed ID",   icon: "📸" },
  { id: "symptoms",  label: "Symptoms",   icon: "🩺" },
  { id: "chat",      label: "Vet Chat",   icon: "💬" },
  { id: "compare",   label: "Compare",    icon: "⚖️" },
  { id: "tools",     label: "Tools",      icon: "🔧" },
  { id: "emergency", label: "Emergency",  icon: "🚨" },
  { id: "pro",       label: "Pro",        icon: "👑" },
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

  if (!user) return <LandingPage onAuth={setUser} />;

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
        {tab === "dogs"      && <SavedDogs userId={user.id} dogs={dogs} onDogsChange={() => fetchDogs(user.id)} onViewProfile={(dog) => { setSelectedDog(dog); setTab("health"); }} />}
        {tab === "reminders" && <VetReminders userId={user.id} dogs={dogs} />}
        {tab === "weight"    && <WeightTracker userId={user.id} dogs={dogs} />}
        {tab === "vaccines"  && <VaccinationRecord userId={user.id} dogs={dogs} />}
        {tab === "journal"   && <SymptomJournal userId={user.id} dogs={dogs} />}
        {tab === "health"    && <HealthProfile selectedDog={selectedDog} onClearDog={() => setSelectedDog(null)} />}
        {tab === "photo"     && <BreedIdentifier isPro={isPro} onUpgrade={() => setTab("pro")} userId={user.id} />}
        {tab === "symptoms"  && <SymptomChecker isPro={isPro} onUpgrade={() => setTab("pro")} userId={user.id} />}
        {tab === "chat"      && <VetChat isPro={isPro} onUpgrade={() => setTab("pro")} dogs={dogs} />}
        {tab === "compare"   && <DogCompare isPro={isPro} onUpgrade={() => setTab("pro")} dogs={dogs} />}
        {tab === "tools"     && <Tools />}
        {tab === "emergency" && <EmergencyGuide />}
        {tab === "pro"       && <Paywall isPro={isPro} userId={user.id} onUnlock={() => { setIsPro(true); setTab("dogs"); }} />}
      </div>
    </div>
  );
}