import { useState } from 'react'

export default function StripeConfig({ stripeLinks, onSave, dark, theme }) {
  const [open, setOpen] = useState(false)
  const [letter, setLetter] = useState(stripeLinks.letter || '')
  const [unlimited, setUnlimited] = useState(stripeLinks.unlimited || '')

  function save() {
    onSave({ letter: letter.trim(), unlimited: unlimited.trim() })
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Stripe Settings"
        style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '6px 10px', color: 'white', fontSize: 16, cursor: 'pointer' }}
      >
        ⚙️
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 44, borderRadius: 14, padding: 18, width: 320, zIndex: 100,
          background: dark ? '#1e293b' : 'white', border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: dark ? '#f1f5f9' : '#2d3748', marginBottom: 4 }}>Stripe Payment Links</p>
          <p style={{ fontSize: 11, color: dark ? '#94a3b8' : '#718096', marginBottom: 14, lineHeight: 1.5 }}>
            Create Payment Links at <strong>dashboard.stripe.com</strong> → Payment Links → Create. Set the success URL to your app URL + <code>?paid=letter</code>
          </p>

          {[
            { label: 'Single Letter — $9.99', key: 'letter', val: letter, set: setLetter, placeholder: 'https://buy.stripe.com/...' },
            { label: 'Unlimited — $19.99/mo', key: 'unlimited', val: unlimited, set: setUnlimited, placeholder: 'https://buy.stripe.com/...' },
          ].map(({ label, val, set, placeholder }) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: dark ? '#94a3b8' : '#718096', display: 'block', marginBottom: 4 }}>{label}</label>
              <input
                value={val}
                onChange={e => set(e.target.value)}
                placeholder={placeholder}
                style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`, borderRadius: 8, background: dark ? '#0f172a' : '#f7fafc', color: dark ? '#f1f5f9' : '#2d3748', outline: 'none' }}
              />
            </div>
          ))}

          <button onClick={save} style={{ width: '100%', padding: '9px 0', background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', borderRadius: 8, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Save
          </button>
        </div>
      )}
    </div>
  )
}
