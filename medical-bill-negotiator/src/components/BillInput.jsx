import { useState, useRef } from 'react'

const SAMPLE_BILL = `PATIENT: John Smith  DATE: 03/15/2026
PROVIDER: City General Hospital  ACCOUNT: 789456

CHARGES:
99213 - Office Visit Level 3                    $450.00
99213 - Office Visit Level 3                    $450.00
80053 - Comprehensive Metabolic Panel           $320.00
36415 - Routine Venipuncture                    $185.00
99000 - Specimen Handling                       $95.00
A4550 - Surgical Tray                          $230.00
99070 - Supplies                               $175.00
Facility Fee                                   $650.00
Emergency Room Fee                             $800.00

SUBTOTAL:                                     $3,355.00
Insurance Adjustment:                          -$412.00
AMOUNT DUE:                                   $2,943.00`

export default function BillInput({ onAnalyze, loading, dark, theme }) {
  const [text, setText] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef()

  function handleFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => setText(e.target.result)
    reader.readAsText(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 60, marginBottom: 12 }}>🏥</div>
        <h2 style={{ color: 'white', fontSize: 26, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.5px' }}>
          Stop Overpaying Medical Bills
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>
          AI finds errors, duplicate charges & negotiation opportunities in seconds. Most bills have issues.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {[['80%', 'bills have errors'], ['$1,300', 'avg savings'], ['30%', 'success fee only']].map(([stat, label]) => (
          <div key={stat} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: '14px 10px', textAlign: 'center' }}>
            <div style={{ color: 'white', fontSize: 22, fontWeight: 800 }}>{stat}</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Input card */}
      <div style={{ background: theme.card, borderRadius: 20, padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <button
            onClick={() => fileRef.current.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{
              flex: 1, padding: '10px 0', border: `2px dashed ${dragging ? '#667eea' : theme.border}`,
              borderRadius: 10, background: dragging ? (dark ? '#1e293b' : '#f0f4ff') : 'transparent',
              cursor: 'pointer', fontSize: 13, color: theme.sub, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            📎 Upload Bill or Drag & Drop
          </button>
          <button
            onClick={() => setText(SAMPLE_BILL)}
            style={{ padding: '10px 14px', border: `1px solid ${theme.border}`, borderRadius: 10, background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#667eea', fontWeight: 700 }}
          >
            Try Sample
          </button>
        </div>

        <input ref={fileRef} type="file" accept=".txt,.csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste your bill here — charges, CPT codes, amounts, anything from the bill..."
          style={{
            width: '100%', height: 190, padding: '12px 14px', border: `1px solid ${theme.border}`,
            borderRadius: 12, fontSize: 12, fontFamily: 'monospace', resize: 'vertical',
            outline: 'none', lineHeight: 1.6, color: theme.text, background: dark ? '#0f172a' : '#fafafa',
          }}
        />

        <button
          onClick={() => onAnalyze(text)}
          disabled={!text.trim() || loading}
          style={{
            width: '100%', marginTop: 14, padding: '14px 0',
            background: text.trim() && !loading ? 'linear-gradient(135deg,#667eea,#764ba2)' : (dark ? '#334155' : '#e2e8f0'),
            border: 'none', borderRadius: 12,
            color: text.trim() && !loading ? 'white' : (dark ? '#64748b' : '#a0aec0'),
            fontSize: 15, fontWeight: 700, cursor: text.trim() && !loading ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
          }}
        >
          {loading ? '🔍 Analyzing your bill...' : '🔍 Analyze My Bill — Free'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 11, color: theme.sub, marginTop: 10 }}>
          🔒 Your bill data is never stored or shared.
        </p>
      </div>
    </div>
  )
}
