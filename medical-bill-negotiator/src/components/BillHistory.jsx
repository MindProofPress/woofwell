export default function BillHistory({ history, onLoad, onClear, dark, theme }) {
  if (history.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>📂</div>
        <h2 style={{ color: 'white', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>No Bills Yet</h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15 }}>
          Analyzed bills appear here. Start by uploading your first bill.
        </p>
      </div>
    )
  }

  const totalSaved = history.reduce((sum, item) => {
    const n = parseFloat((item.savings || '').replace(/[^0-9.]/g, ''))
    return sum + (isNaN(n) ? 0 : n)
  }, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary */}
      <div style={{ background: 'linear-gradient(135deg,#48bb78,#38a169)', borderRadius: 20, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ color: 'white', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Bill History</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{history.length} bill{history.length !== 1 ? 's' : ''} analyzed</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Total Savings Found</div>
          <div style={{ color: 'white', fontSize: 28, fontWeight: 800 }}>
            ${totalSaved.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      {/* List */}
      {history.map((item) => (
        <div key={item.id} style={{ background: theme.card, borderRadius: 16, padding: '16px 18px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', cursor: 'pointer' }} onClick={() => onLoad(item)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: theme.sub }}>{item.date}</span>
                {item.issuesFound > 0 && (
                  <span style={{ background: '#fff5f5', color: '#e53e3e', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                    {item.issuesFound} issue{item.issuesFound !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 13, color: theme.sub, lineHeight: 1.5, fontFamily: 'monospace' }}>
                {item.preview}...
              </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: theme.sub }}>Billed</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>{item.totalBilled}</div>
              <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 4 }}>Potential save</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#38a169' }}>{item.savings}</div>
            </div>
          </div>
          <div style={{ marginTop: 10, color: '#667eea', fontSize: 12, fontWeight: 600 }}>Tap to re-open →</div>
        </div>
      ))}

      <button
        onClick={onClear}
        style={{ padding: '12px 0', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
      >
        🗑️ Clear All History
      </button>
    </div>
  )
}
