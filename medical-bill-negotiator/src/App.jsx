import { useState, useEffect } from 'react'
import BillInput from './components/BillInput'
import AnalysisResults from './components/AnalysisResults'
import DisputeLetter from './components/DisputeLetter'
import ApiKeySetup from './components/ApiKeySetup'
import BillHistory from './components/BillHistory'
import KnowYourRights from './components/KnowYourRights'
import SuccessFeeCalc from './components/SuccessFeeCalc'
import NavBar from './components/NavBar'
import PaywallModal from './components/PaywallModal'
import StripeConfig from './components/StripeConfig'

function checkPaid() {
  if (localStorage.getItem('billguard_paid')) return true
  const params = new URLSearchParams(window.location.search)
  const paid = params.get('paid')
  if (paid) {
    localStorage.setItem('billguard_paid', paid)
    window.history.replaceState({}, '', window.location.pathname)
    return true
  }
  return false
}

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('billguard_api_key') || '')
  const [step, setStep] = useState('input')
  const [page, setPage] = useState('home')
  const [billText, setBillText] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState('')
  const [dark, setDark] = useState(() => localStorage.getItem('billguard_dark') === 'true')
  const [paid, setPaid] = useState(checkPaid)
  const [showPaywall, setShowPaywall] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [stripeLinks, setStripeLinks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('billguard_stripe') || '{}') }
    catch { return {} }
  })
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('billguard_history') || '[]') }
    catch { return [] }
  })
  const [letterType, setLetterType] = useState('dispute')
  const [tracker, setTracker] = useState({}) // chargeIndex -> status

  const theme = {
    bg: dark ? '#0f172a' : '#f0f4f8',
    card: dark ? '#1e293b' : 'white',
    text: dark ? '#f1f5f9' : '#1a202c',
    sub: dark ? '#94a3b8' : '#718096',
    border: dark ? '#334155' : '#e2e8f0',
    grad: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    headerBg: dark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.1)',
  }

  useEffect(() => {
    localStorage.setItem('billguard_dark', dark)
    document.body.style.background = dark ? '#0f172a' : '#f0f4f8'
  }, [dark])

  function saveToHistory(bill, result) {
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      preview: bill.slice(0, 120),
      totalBilled: result.totalBilled,
      savings: result.totalSavingsPotential,
      issuesFound: result.flaggedCharges?.length || 0,
      analysis: result,
      billText: bill,
    }
    const updated = [entry, ...history].slice(0, 20)
    setHistory(updated)
    localStorage.setItem('billguard_history', JSON.stringify(updated))
  }

  async function callClaude(prompt) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-calls': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error?.message || 'API error')
    }
    const data = await response.json()
    return data.content[0].text
  }

  async function analyzeBill(text) {
    if (!apiKey) { setError('Please enter your Anthropic API key first.'); return }
    setBillText(text)
    setStep('analyzing')
    setError('')
    setTracker({})

    try {
      const raw = await callClaude(`You are a medical billing expert and patient advocate. Analyze this medical bill and identify:
1. Incorrect, duplicate, or upcoded charges
2. Charges that are negotiable or commonly waived
3. Billing code errors (CPT/ICD codes if visible)
4. Total estimated savings potential

Return ONLY valid JSON with this exact structure:
{
  "totalBilled": "dollar amount as string or 'unknown'",
  "flaggedCharges": [
    {
      "description": "charge description",
      "amount": "dollar amount",
      "issue": "why this is suspicious",
      "savingsPotential": "estimated savings",
      "action": "what to do",
      "severity": "high|medium|low"
    }
  ],
  "totalSavingsPotential": "total estimated savings",
  "summary": "2-3 sentence plain English summary",
  "negotiationStrength": "weak|moderate|strong",
  "topTips": ["tip1", "tip2", "tip3"],
  "chargeBreakdown": [
    { "category": "category name", "amount": 1234, "flagged": true }
  ],
  "hospitalType": "name or type of provider if detectable",
  "stateResources": "any state-specific billing rights or resources"
}

Medical bill:
${text}`)

      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Could not parse analysis')
      const result = JSON.parse(jsonMatch[0])
      setAnalysis(result)
      saveToHistory(text, result)
      setStep('results')
    } catch (e) {
      setError(e.message)
      setStep('input')
    }
  }

  function saveStripeLinks(links) {
    setStripeLinks(links)
    localStorage.setItem('billguard_stripe', JSON.stringify(links))
  }

  function gatedAction(action) {
    if (paid) {
      action()
    } else {
      setPendingAction(() => action)
      setShowPaywall(true)
    }
  }

  function onPaywallUnlock() {
    setPaid(true)
    localStorage.setItem('billguard_paid', 'letter')
    if (pendingAction) { pendingAction(); setPendingAction(null) }
    setShowPaywall(false)
  }

  async function generateLetter(type = 'dispute') {
    setLetterType(type)
    setStep('analyzing')
    setError('')

    const letterInstructions = {
      dispute: 'Write a firm but professional medical bill dispute letter. Reference specific flagged charges, cite patient billing rights, request itemized review, ask about financial assistance programs.',
      appeal: 'Write a medical insurance claim appeal letter. Focus on medical necessity, cite relevant policies, reference supporting documentation the patient can provide, demand reconsideration.',
      hardship: 'Write a financial hardship letter requesting bill reduction or payment plan. Be empathetic but specific, mention financial hardship, ask about charity care programs, sliding scale fees, and payment plans.',
    }

    try {
      const letter = await callClaude(`${letterInstructions[type]}

Be professional, firm, and specific. Include [YOUR NAME], [YOUR ADDRESS], [DATE], [PROVIDER NAME], [ACCOUNT NUMBER] placeholders.

Analysis findings:
${JSON.stringify(analysis, null, 2)}

Bill excerpt:
${billText.slice(0, 600)}

Return ONLY the letter text, ready to print and mail.`)

      setAnalysis(prev => ({ ...prev, [`${type}Letter`]: letter }))
      setStep('letter')
    } catch (e) {
      setError(e.message)
      setStep('results')
    }
  }

  async function generatePhoneScript() {
    setStep('analyzing')
    setError('')
    try {
      const script = await callClaude(`Create a detailed phone negotiation script for disputing this medical bill. Include:
- Opening statement
- Key talking points for each flagged charge
- Responses to common pushback ("that's our standard rate", "insurance already paid their share", etc.)
- How to escalate to supervisor
- How to ask about charity care / financial assistance
- Closing and next steps
- What to document during the call

Make it conversational, confident but polite. Use [PATIENT NAME] and [ACCOUNT NUMBER] placeholders.

Analysis:
${JSON.stringify(analysis, null, 2)}`)

      setAnalysis(prev => ({ ...prev, phoneScript: script }))
      setStep('phone')
    } catch (e) {
      setError(e.message)
      setStep('results')
    }
  }

  function loadHistoryItem(item) {
    setBillText(item.billText)
    setAnalysis(item.analysis)
    setPage('home')
    setStep('results')
  }

  function clearHistory() {
    setHistory([])
    localStorage.removeItem('billguard_history')
  }

  const isAnalyzing = step === 'analyzing'

  return (
    <div style={{ minHeight: '100vh', background: dark ? '#0f172a' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', transition: 'background 0.3s' }}>
      {/* Header */}
      <header style={{ background: theme.headerBg, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.2)'}`, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => { setPage('home'); setStep('input'); setAnalysis(null); setBillText('') }} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <div style={{ width: 36, height: 36, background: dark ? '#667eea' : 'white', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🛡️</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: 'white', fontSize: 17, fontWeight: 700 }}>BillGuard AI</div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>Medical Bill Negotiator</div>
          </div>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {paid && <span style={{ background: 'rgba(72,187,120,0.3)', border: '1px solid rgba(72,187,120,0.5)', borderRadius: 8, padding: '4px 10px', color: 'white', fontSize: 11, fontWeight: 700 }}>✅ PRO</span>}
          <button onClick={() => setDark(d => !d)} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '5px 10px', color: 'white', fontSize: 16, cursor: 'pointer' }}>
            {dark ? '☀️' : '🌙'}
          </button>
          <StripeConfig stripeLinks={stripeLinks} onSave={saveStripeLinks} dark={dark} theme={theme} />
          <ApiKeySetup apiKey={apiKey} onSave={key => { setApiKey(key); localStorage.setItem('billguard_api_key', key) }} dark={dark} />
        </div>
      </header>

      {/* Progress bar (home only) */}
      {page === 'home' && step !== 'input' && !isAnalyzing && (
        <div style={{ background: 'rgba(0,0,0,0.15)', padding: '8px 20px', display: 'flex', gap: 6, alignItems: 'center', overflowX: 'auto' }}>
          {[['input','1. Upload'], ['results','2. Analysis'], ['letter','3. Letter'], ['phone','4. Script']].map(([s, label], i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {i > 0 && <div style={{ width: 16, height: 2, background: 'rgba(255,255,255,0.25)' }} />}
              <div style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: step === s ? 'white' : 'rgba(255,255,255,0.15)', color: step === s ? '#764ba2' : 'rgba(255,255,255,0.55)' }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      )}

      <main style={{ maxWidth: 880, margin: '0 auto', padding: '24px 14px 100px' }}>
        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: 12, padding: '12px 16px', marginBottom: 18, color: '#c53030', fontSize: 14 }}>
            ⚠️ {error}
          </div>
        )}

        {page === 'home' && (
          <>
            {(step === 'input' || isAnalyzing) && <BillInput onAnalyze={analyzeBill} loading={isAnalyzing} dark={dark} theme={theme} />}
            {step === 'results' && analysis && (
              <AnalysisResults
                analysis={analysis}
                tracker={tracker}
                setTracker={setTracker}
                onGenerateLetter={type => gatedAction(() => generateLetter(type))}
                onPhoneScript={() => gatedAction(generatePhoneScript)}
                onReset={() => { setStep('input'); setAnalysis(null); setBillText(''); setTracker({}) }}
                dark={dark}
                theme={theme}
              />
            )}
            {step === 'letter' && analysis && (
              <DisputeLetter
                letter={analysis[`${letterType}Letter`]}
                letterType={letterType}
                analysis={analysis}
                onGenerateLetter={generateLetter}
                onBack={() => setStep('results')}
                onReset={() => { setStep('input'); setAnalysis(null); setBillText('') }}
                dark={dark}
                theme={theme}
              />
            )}
            {step === 'phone' && analysis?.phoneScript && (
              <PhoneScriptView
                script={analysis.phoneScript}
                onBack={() => setStep('results')}
                dark={dark}
                theme={theme}
              />
            )}
          </>
        )}

        {page === 'history' && (
          <BillHistory history={history} onLoad={loadHistoryItem} onClear={clearHistory} dark={dark} theme={theme} />
        )}

        {page === 'rights' && <KnowYourRights dark={dark} theme={theme} />}

        {page === 'calc' && <SuccessFeeCalc dark={dark} theme={theme} />}
      </main>

      <NavBar page={page} setPage={setPage} dark={dark} />

      {showPaywall && (
        <PaywallModal
          analysis={analysis}
          stripeLinks={stripeLinks}
          onClose={() => setShowPaywall(false)}
          onUnlock={onPaywallUnlock}
          dark={dark}
          theme={theme}
        />
      )}
    </div>
  )
}

function PhoneScriptView({ script, onBack, dark, theme }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(script)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function download() {
    const blob = new Blob([script], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'phone-negotiation-script.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'linear-gradient(135deg, #f6d365, #fda085)', borderRadius: 20, padding: '20px 24px' }}>
        <h2 style={{ color: 'white', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>📞 Phone Negotiation Script</h2>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>Read this word-for-word when calling the billing department. Confident tone = better outcomes.</p>
      </div>
      <div style={{ background: theme.card, borderRadius: 20, boxShadow: '0 8px 30px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>Call Script</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={copy} style={{ padding: '6px 12px', border: `1px solid ${theme.border}`, borderRadius: 8, background: 'transparent', fontSize: 12, color: '#667eea', cursor: 'pointer', fontWeight: 600 }}>{copied ? '✅ Copied!' : '📋 Copy'}</button>
            <button onClick={download} style={{ padding: '6px 12px', border: 'none', borderRadius: 8, background: theme.grad, fontSize: 12, color: 'white', cursor: 'pointer', fontWeight: 600 }}>⬇️ Save</button>
          </div>
        </div>
        <pre style={{ padding: '20px 22px', fontSize: 13, lineHeight: 1.8, color: theme.text, whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', maxHeight: 520, overflowY: 'auto' }}>{script}</pre>
      </div>
      <div style={{ background: theme.card, borderRadius: 16, padding: '18px 20px' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: theme.text, marginBottom: 12 }}>📝 During the Call — Track These</h3>
        {['Rep name & employee ID', 'Date and time of call', 'Reference/confirmation number', 'Specific promises made', 'Next steps agreed upon'].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
            <div style={{ width: 18, height: 18, border: `2px solid ${theme.border}`, borderRadius: 4, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: theme.sub }}>{item}</span>
          </div>
        ))}
      </div>
      <button onClick={onBack} style={{ padding: '12px 20px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 600, alignSelf: 'flex-start' }}>← Back to Analysis</button>
    </div>
  )
}
