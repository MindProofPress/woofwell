import { useState } from 'react'

const LETTER_TYPES = [
  { id: 'dispute', label: '⚡ Dispute', color: '#764ba2', desc: 'Dispute billing errors' },
  { id: 'appeal', label: '📋 Appeal', color: '#667eea', desc: 'Appeal insurance denial' },
  { id: 'hardship', label: '🤝 Hardship', color: '#dd6b20', desc: 'Request reduction/plan' },
]

export default function DisputeLetter({ letter, letterType, analysis, onGenerateLetter, onBack, onReset, dark, theme }) {
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)

  function copy() {
    navigator.clipboard.writeText(letter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function download() {
    const blob = new Blob([letter], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${letterType}-letter.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function switchType(type) {
    if (type === letterType) return
    setGenerating(true)
    await onGenerateLetter(type)
    setGenerating(false)
  }

  const currentType = LETTER_TYPES.find(t => t.id === letterType)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Savings banner */}
      <div style={{ background: 'linear-gradient(135deg,#48bb78,#38a169)', borderRadius: 20, padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ color: 'white', fontSize: 19, fontWeight: 700, marginBottom: 3 }}>Letter Ready to Send! 📬</h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>Potential savings: <strong>{analysis.totalSavingsPotential}</strong></p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '7px 14px', color: 'white', fontSize: 12, fontWeight: 600 }}>
          30% of savings = your fee
        </div>
      </div>

      {/* Letter type switcher */}
      <div style={{ background: theme.card, borderRadius: 16, padding: '14px 16px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
        <p style={{ fontSize: 12, color: theme.sub, marginBottom: 10, fontWeight: 600 }}>SWITCH LETTER TYPE</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {LETTER_TYPES.map(({ id, label, color, desc }) => (
            <button
              key={id}
              onClick={() => switchType(id)}
              disabled={generating}
              style={{
                padding: '10px 6px', borderRadius: 12, cursor: generating ? 'not-allowed' : 'pointer',
                border: letterType === id ? `2px solid ${color}` : `1px solid ${theme.border}`,
                background: letterType === id ? (dark ? '#1e293b' : '#f0f4ff') : 'transparent',
                textAlign: 'center', transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: letterType === id ? color : theme.sub }}>{label}</div>
              <div style={{ fontSize: 10, color: theme.sub, marginTop: 2 }}>{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Letter content */}
      <div style={{ background: theme.card, borderRadius: 20, boxShadow: '0 8px 30px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>📄 {currentType?.label} Letter</span>
            <span style={{ marginLeft: 8, fontSize: 11, color: theme.sub }}>{currentType?.desc}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={copy} style={{ padding: '6px 12px', border: `1px solid ${theme.border}`, borderRadius: 8, background: 'transparent', fontSize: 12, color: '#667eea', cursor: 'pointer', fontWeight: 600 }}>
              {copied ? '✅ Copied!' : '📋 Copy'}
            </button>
            <button onClick={download} style={{ padding: '6px 12px', border: 'none', borderRadius: 8, background: theme.grad, fontSize: 12, color: 'white', cursor: 'pointer', fontWeight: 600 }}>
              ⬇️ Download
            </button>
          </div>
        </div>
        {generating ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: theme.sub, fontSize: 14 }}>
            ✍️ Generating {letterType} letter...
          </div>
        ) : (
          <pre style={{ padding: '20px 22px', fontSize: 13, lineHeight: 1.8, color: theme.text, whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', maxHeight: 480, overflowY: 'auto' }}>
            {letter}
          </pre>
        )}
      </div>

      {/* Next steps */}
      <div style={{ background: theme.card, borderRadius: 16, padding: '18px 20px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: theme.text, marginBottom: 12 }}>📋 Sending Checklist</h3>
        {[
          'Fill in all [BRACKETED] placeholders with your info',
          'Send via certified mail — you get proof of delivery',
          'Keep a copy of everything you send',
          'Follow up by phone in 10–14 business days',
          'Document the name of every person you speak with',
        ].map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
            <div style={{ width: 20, height: 20, background: theme.grad, borderRadius: 6, color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
            <p style={{ fontSize: 13, color: theme.sub, lineHeight: 1.5 }}>{step}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{ padding: '12px 18px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
          ← Analysis
        </button>
        <button onClick={onReset} style={{ flex: 1, padding: '12px 0', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
          Analyze New Bill
        </button>
      </div>
    </div>
  )
}
