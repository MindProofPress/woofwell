import { useState } from 'react'

export default function ApiKeySetup({ apiKey, onSave, dark }) {
  const [open, setOpen] = useState(false)
  const [val, setVal] = useState(apiKey)

  function save() {
    onSave(val.trim())
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: apiKey ? 'rgba(72,187,120,0.3)' : 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 8, color: 'white', padding: '6px 12px', fontSize: 12, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600,
        }}
      >
        {apiKey ? '✅ Key Set' : '🔑 Add Key'}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 44, borderRadius: 14, padding: 18, width: 310,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)', zIndex: 100,
          background: dark ? '#1e293b' : 'white',
          border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
        }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: dark ? '#f1f5f9' : '#2d3748', marginBottom: 6 }}>Anthropic API Key</p>
          <p style={{ fontSize: 12, color: dark ? '#94a3b8' : '#718096', marginBottom: 12, lineHeight: 1.5 }}>
            Stored locally only. Get a key at <strong>console.anthropic.com</strong>
          </p>
          <input
            type="password"
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder="sk-ant-..."
            style={{
              width: '100%', padding: '9px 12px', fontSize: 13, outline: 'none', marginBottom: 10,
              border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`, borderRadius: 8,
              background: dark ? '#0f172a' : 'white', color: dark ? '#f1f5f9' : '#2d3748',
            }}
            onKeyDown={e => e.key === 'Enter' && save()}
          />
          <button onClick={save} style={{ width: '100%', padding: '9px 0', background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', borderRadius: 8, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Save Key
          </button>
        </div>
      )}
    </div>
  )
}
