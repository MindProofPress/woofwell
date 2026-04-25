const TABS = [
  { id: 'home', icon: '🔍', label: 'Analyze' },
  { id: 'history', icon: '📋', label: 'History' },
  { id: 'calc', icon: '💰', label: 'Savings' },
  { id: 'rights', icon: '⚖️', label: 'Your Rights' },
]

export default function NavBar({ page, setPage, dark }) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      background: dark ? '#1e293b' : 'white',
      borderTop: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
      display: 'flex', padding: '6px 0 env(safe-area-inset-bottom, 6px)',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
    }}>
      {TABS.map(({ id, icon, label }) => {
        const active = page === id
        return (
          <button
            key={id}
            onClick={() => setPage(id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, padding: '6px 0', border: 'none', background: 'transparent', cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 22, filter: active ? 'none' : 'grayscale(60%) opacity(0.5)' }}>{icon}</span>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? '#667eea' : dark ? '#64748b' : '#a0aec0' }}>
              {label}
            </span>
            {active && (
              <div style={{ width: 20, height: 3, background: 'linear-gradient(135deg,#667eea,#764ba2)', borderRadius: 2, marginTop: 1 }} />
            )}
          </button>
        )
      })}
    </nav>
  )
}
