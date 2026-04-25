import { useState } from 'react'

export default function SuccessFeeCalc({ dark, theme }) {
  const [billed, setBilled] = useState('')
  const [pct, setPct] = useState(30)

  const billedNum = parseFloat(billed.replace(/[^0-9.]/g, '')) || 0
  const scenarios = [
    { label: 'Conservative (20% off)', reduction: 0.20 },
    { label: 'Typical (35% off)', reduction: 0.35 },
    { label: 'Strong (55% off)', reduction: 0.55 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: theme.grad, borderRadius: 20, padding: '20px 24px' }}>
        <h2 style={{ color: 'white', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>💰 Savings Calculator</h2>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>See what you could save — and what the success fee looks like.</p>
      </div>

      <div style={{ background: theme.card, borderRadius: 20, padding: 24, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: theme.text, display: 'block', marginBottom: 8 }}>Your Bill Amount</label>
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: theme.sub }}>$</span>
          <input
            type="number"
            value={billed}
            onChange={e => setBilled(e.target.value)}
            placeholder="0.00"
            style={{ width: '100%', padding: '12px 14px 12px 32px', border: `1px solid ${theme.border}`, borderRadius: 12, fontSize: 20, fontWeight: 700, color: theme.text, background: theme.card, outline: 'none' }}
          />
        </div>

        <label style={{ fontSize: 13, fontWeight: 600, color: theme.text, display: 'block', marginBottom: 8 }}>
          Success Fee: <span style={{ color: '#667eea' }}>{pct}%</span>
        </label>
        <input type="range" min={15} max={40} value={pct} onChange={e => setPct(+e.target.value)}
          style={{ width: '100%', marginBottom: 6, accentColor: '#667eea' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: theme.sub, marginBottom: 24 }}>
          <span>15% (discount)</span><span>30% (standard)</span><span>40% (premium)</span>
        </div>

        {billedNum > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {scenarios.map(({ label, reduction }) => {
              const savings = billedNum * reduction
              const fee = savings * (pct / 100)
              const net = savings - fee
              return (
                <div key={label} style={{ border: `1px solid ${theme.border}`, borderRadius: 14, padding: '16px 18px', background: dark ? '#0f172a' : '#f7fafc' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, marginBottom: 10 }}>{label}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: 11, color: theme.sub, marginBottom: 3 }}>You Save</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#38a169' }}>${savings.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: theme.sub, marginBottom: 3 }}>Our Fee</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#e53e3e' }}>${fee.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: theme.sub, marginBottom: 3 }}>Net to You</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#667eea' }}>${net.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 10, background: dark ? '#1e293b' : '#edf2f7', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: theme.sub }}>
                    You pay ${(billedNum - savings).toLocaleString('en-US', { maximumFractionDigits: 0 })} instead of ${billedNum.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!billedNum && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: theme.sub, fontSize: 14 }}>
            Enter your bill amount above to see potential savings
          </div>
        )}
      </div>

      <div style={{ background: theme.card, borderRadius: 16, padding: '18px 20px' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: theme.text, marginBottom: 12 }}>📊 Industry Benchmarks</h3>
        {[
          { label: 'Bills with at least one error', value: '80%' },
          { label: 'Average reduction when disputed', value: '30–55%' },
          { label: 'Patients who never dispute', value: '93%' },
          { label: 'Avg time to resolve a dispute', value: '30–60 days' },
          { label: 'Success rate with written dispute', value: '67%' },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${theme.border}` }}>
            <span style={{ fontSize: 13, color: theme.sub }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
