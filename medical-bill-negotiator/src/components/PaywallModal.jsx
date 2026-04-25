import { useState } from 'react'

const PLANS = [
  {
    id: 'letter',
    name: 'Single Letter',
    price: '$9.99',
    desc: 'Unlock one dispute, appeal, or hardship letter + phone script',
    highlight: false,
  },
  {
    id: 'unlimited',
    name: 'Unlimited Access',
    price: '$19.99/mo',
    desc: 'Unlimited bills, all letter types, phone scripts, priority support',
    highlight: true,
  },
]

export default function PaywallModal({ analysis, stripeLinks, onClose, onUnlock, dark, theme }) {
  const [selected, setSelected] = useState('letter')
  const savings = analysis?.totalSavingsPotential || 'significant savings'

  function pay() {
    const link = stripeLinks[selected]
    if (!link || link.includes('YOUR_STRIPE')) {
      alert('Set up your Stripe Payment Link first in Settings (top-right gear icon).')
      return
    }
    const returnUrl = encodeURIComponent(window.location.origin + window.location.pathname + '?paid=' + selected)
    window.location.href = `${link}?client_reference_id=billguard_${Date.now()}&success_url=${returnUrl}`
  }

  function devUnlock() {
    onUnlock(selected)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: theme.card, borderRadius: '24px 24px 0 0', padding: '28px 22px 40px', width: '100%', maxWidth: 480, boxShadow: '0 -20px 60px rgba(0,0,0,0.3)' }}>
        {/* Handle bar */}
        <div style={{ width: 40, height: 4, background: dark ? '#334155' : '#e2e8f0', borderRadius: 2, margin: '0 auto 20px' }} />

        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔒</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: theme.text, marginBottom: 6 }}>Unlock Your Letter</h2>
          <p style={{ fontSize: 14, color: theme.sub, lineHeight: 1.5 }}>
            The AI found <strong style={{ color: '#38a169' }}>{savings}</strong> in potential savings.
            Unlock your dispute letter to start collecting.
          </p>
        </div>

        {/* Plans */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {PLANS.map(({ id, name, price, desc, highlight }) => (
            <button
              key={id}
              onClick={() => setSelected(id)}
              style={{
                padding: '14px 16px', borderRadius: 14, textAlign: 'left', cursor: 'pointer',
                border: selected === id
                  ? `2px solid ${highlight ? '#38a169' : '#667eea'}`
                  : `1px solid ${theme.border}`,
                background: selected === id
                  ? (highlight ? (dark ? '#0d2010' : '#f0fff4') : (dark ? '#1a1f3c' : '#f0f4ff'))
                  : 'transparent',
                transition: 'all 0.15s',
                position: 'relative',
              }}
            >
              {highlight && (
                <span style={{ position: 'absolute', top: -10, right: 12, background: '#38a169', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                  BEST VALUE
                </span>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: theme.text, marginBottom: 3 }}>{name}</div>
                  <div style={{ fontSize: 12, color: theme.sub }}>{desc}</div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: highlight ? '#38a169' : '#667eea', marginLeft: 12, flexShrink: 0 }}>
                  {price}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* ROI callout */}
        <div style={{ background: dark ? '#0f172a' : '#f0fff4', borderRadius: 12, padding: '10px 14px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>📊</span>
          <p style={{ fontSize: 12, color: theme.sub, lineHeight: 1.5 }}>
            If you save even <strong>$100</strong>, your letter pays for itself <strong>10x over.</strong> Average dispute saves $1,300.
          </p>
        </div>

        <button
          onClick={pay}
          style={{ width: '100%', padding: '15px 0', background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', borderRadius: 14, color: 'white', fontSize: 16, fontWeight: 800, cursor: 'pointer', marginBottom: 10, boxShadow: '0 4px 20px rgba(102,126,234,0.4)' }}
        >
          Pay {selected === 'letter' ? '$9.99' : '$19.99/mo'} — Unlock Now
        </button>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={devUnlock}
            style={{ flex: 1, padding: '11px 0', border: `1px solid ${theme.border}`, borderRadius: 12, background: 'transparent', color: theme.sub, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
          >
            Dev: Skip Payment
          </button>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '11px 0', border: `1px solid ${theme.border}`, borderRadius: 12, background: 'transparent', color: theme.sub, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
          >
            Cancel
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: theme.sub, marginTop: 12 }}>
          🔒 Secured by Stripe · No card data touches our servers
        </p>
      </div>
    </div>
  )
}
