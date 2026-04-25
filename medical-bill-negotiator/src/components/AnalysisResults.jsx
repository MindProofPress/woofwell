const STRENGTH_COLOR = { weak: '#e53e3e', moderate: '#dd6b20', strong: '#38a169' }
const STRENGTH_BG = { weak: '#fff5f5', moderate: '#fffaf0', strong: '#f0fff4' }
const SEVERITY_COLOR = { high: '#e53e3e', medium: '#dd6b20', low: '#718096' }

const STATUS_OPTIONS = [
  { value: 'pending', label: '🔴 Pending', color: '#e53e3e' },
  { value: 'in_progress', label: '🟡 In Progress', color: '#dd6b20' },
  { value: 'resolved', label: '🟢 Resolved', color: '#38a169' },
  { value: 'ignored', label: '⚫ Ignored', color: '#718096' },
]

export default function AnalysisResults({ analysis, tracker, setTracker, onGenerateLetter, onPhoneScript, onReset, dark, theme }) {
  const {
    totalBilled, flaggedCharges = [], totalSavingsPotential,
    summary, negotiationStrength, topTips = [], chargeBreakdown = [],
  } = analysis

  const resolvedCount = Object.values(tracker).filter(s => s === 'resolved').length

  function setStatus(i, val) {
    setTracker(prev => ({ ...prev, [i]: val }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary */}
      <div style={{ background: theme.card, borderRadius: 20, padding: 22, boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: theme.text, marginBottom: 6 }}>Analysis Complete ✅</h2>
            <p style={{ fontSize: 13, color: theme.sub, lineHeight: 1.6, maxWidth: 440 }}>{summary}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: theme.sub }}>Estimated Savings</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: '#38a169' }}>{totalSavingsPotential}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <StatBox label="Total Billed" value={totalBilled} color={theme.text} bg={dark ? '#0f172a' : '#f7fafc'} />
          <StatBox label="Issues Found" value={`${flaggedCharges.length}`} color="#e53e3e" bg={dark ? '#2d1515' : '#fff5f5'} />
          <div style={{ background: dark ? (negotiationStrength === 'strong' ? '#0d2010' : negotiationStrength === 'moderate' ? '#1a1200' : '#200d0d') : STRENGTH_BG[negotiationStrength], borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: theme.sub, marginBottom: 3 }}>Negotiation</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: STRENGTH_COLOR[negotiationStrength], textTransform: 'capitalize' }}>{negotiationStrength} ✦</div>
          </div>
        </div>

        {/* Progress tracker */}
        {flaggedCharges.length > 0 && (
          <div style={{ marginTop: 14, background: dark ? '#0f172a' : '#f0f4ff', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: theme.sub }}>Dispute Progress</span>
              <span style={{ fontSize: 12, color: '#667eea', fontWeight: 700 }}>{resolvedCount}/{flaggedCharges.length} resolved</span>
            </div>
            <div style={{ background: dark ? '#1e293b' : '#e2e8f0', borderRadius: 6, height: 8, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg,#667eea,#38a169)', borderRadius: 6, width: `${flaggedCharges.length ? (resolvedCount / flaggedCharges.length) * 100 : 0}%`, transition: 'width 0.4s' }} />
            </div>
          </div>
        )}
      </div>

      {/* Charge Chart */}
      {chargeBreakdown.length > 0 && (
        <div style={{ background: theme.card, borderRadius: 20, padding: 22, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: theme.text, marginBottom: 16 }}>📊 Charge Breakdown</h3>
          <ChargeChart breakdown={chargeBreakdown} dark={dark} theme={theme} />
        </div>
      )}

      {/* Flagged Charges */}
      {flaggedCharges.length > 0 && (
        <div style={{ background: theme.card, borderRadius: 20, padding: 22, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: theme.text, marginBottom: 14 }}>🚩 Flagged Charges</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {flaggedCharges.map((charge, i) => {
              const status = tracker[i] || 'pending'
              const statusObj = STATUS_OPTIONS.find(s => s.value === status)
              return (
                <div key={i} style={{ border: `1px solid ${dark ? '#334155' : '#fed7d7'}`, borderRadius: 14, padding: '14px 16px', background: dark ? '#0f172a' : '#fff5f5' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: SEVERITY_COLOR[charge.severity] || '#e53e3e', background: dark ? '#1e293b' : '#fff', padding: '2px 8px', borderRadius: 20, border: `1px solid ${SEVERITY_COLOR[charge.severity] || '#e53e3e'}` }}>
                          {charge.severity?.toUpperCase() || 'HIGH'}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>{charge.description}</span>
                      </div>
                      <p style={{ fontSize: 12, color: '#e53e3e', marginBottom: 6 }}>⚠️ {charge.issue}</p>
                      <div style={{ fontSize: 12, color: theme.sub, background: dark ? '#1e293b' : '#edf2f7', padding: '4px 10px', borderRadius: 8, display: 'inline-block' }}>
                        → {charge.action}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: theme.sub }}>Charged</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>{charge.amount}</div>
                      {charge.savingsPotential && <>
                        <div style={{ fontSize: 11, color: theme.sub, marginTop: 4 }}>Save</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#38a169' }}>{charge.savingsPotential}</div>
                      </>}
                    </div>
                  </div>
                  <select
                    value={status}
                    onChange={e => setStatus(i, e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`, borderRadius: 8, fontSize: 12, color: statusObj?.color, background: theme.card, cursor: 'pointer', fontWeight: 600 }}
                  >
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tips */}
      {topTips.length > 0 && (
        <div style={{ background: theme.card, borderRadius: 20, padding: 22, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: theme.text, marginBottom: 14 }}>💡 Negotiation Tips</h3>
          {topTips.map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ width: 24, height: 24, background: theme.grad, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
              <p style={{ fontSize: 13, color: theme.sub, lineHeight: 1.6, marginTop: 2 }}>{tip}</p>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button onClick={() => onGenerateLetter('dispute')} style={{ padding: '14px 10px', background: 'white', border: 'none', borderRadius: 14, fontSize: 13, fontWeight: 700, color: '#764ba2', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
          ✍️ Dispute Letter
        </button>
        <button onClick={() => onGenerateLetter('appeal')} style={{ padding: '14px 10px', background: 'white', border: 'none', borderRadius: 14, fontSize: 13, fontWeight: 700, color: '#667eea', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
          📋 Appeal Letter
        </button>
        <button onClick={() => onGenerateLetter('hardship')} style={{ padding: '14px 10px', background: 'white', border: 'none', borderRadius: 14, fontSize: 13, fontWeight: 700, color: '#dd6b20', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
          🤝 Hardship Letter
        </button>
        <button onClick={onPhoneScript} style={{ padding: '14px 10px', background: 'white', border: 'none', borderRadius: 14, fontSize: 13, fontWeight: 700, color: '#38a169', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
          📞 Phone Script
        </button>
      </div>

      <button onClick={onReset} style={{ padding: '12px 0', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
        ← Analyze New Bill
      </button>
    </div>
  )
}

function StatBox({ label, value, color, bg }) {
  return (
    <div style={{ background: bg, borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: '#a0aec0', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

function ChargeChart({ breakdown, dark, theme }) {
  const max = Math.max(...breakdown.map(b => b.amount), 1)
  const COLORS = ['#667eea', '#f6ad55', '#fc8181', '#68d391', '#76e4f7', '#b794f4', '#fbb6ce']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {breakdown.map(({ category, amount, flagged }, i) => (
        <div key={category}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: theme.sub, display: 'flex', alignItems: 'center', gap: 5 }}>
              {flagged && <span style={{ fontSize: 10, color: '#e53e3e' }}>🚩</span>}
              {category}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: theme.text }}>${amount.toLocaleString()}</span>
          </div>
          <div style={{ background: dark ? '#1e293b' : '#e2e8f0', borderRadius: 6, height: 10, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: flagged ? '#fc8181' : COLORS[i % COLORS.length], borderRadius: 6, width: `${(amount / max) * 100}%`, transition: 'width 0.6s' }} />
          </div>
        </div>
      ))}
    </div>
  )
}
