const RIGHTS = [
  {
    icon: '\u{1F4C4}',
    title: 'Right to an Itemized Bill',
    body: 'You have the right to request a complete itemized bill from any provider. They must provide one within 30 days. This is the single most important first step.',
    action: 'Call billing: "I am requesting an itemized bill with all CPT codes per my patient rights."',
  },
  {
    icon: '\u23F1\uFE0F',
    title: 'No Time Limit on Disputes',
    body: 'There is no law preventing you from disputing a bill at any time. Statute of limitations on medical debt varies by state, typically 3 to 6 years.',
    action: 'Do not let urgency pressure you into paying before reviewing carefully.',
  },
  {
    icon: '\u{1F3E5}',
    title: 'Charity Care Programs',
    body: 'Nonprofit hospitals are required by law to offer charity care. Many for-profit hospitals do too. You may qualify even with insurance.',
    action: 'Ask billing: "Do you have a financial assistance or charity care program I can apply for?"',
  },
  {
    icon: '\u{1F504}',
    title: 'Right to Appeal Insurance Denials',
    body: 'Under the ACA, you can appeal any insurance claim denial both internally and externally. External appeals are won about 40% of the time.',
    action: 'File an internal appeal first, then request external review from your state insurance commissioner.',
  },
  {
    icon: '\u{1F4B3}',
    title: 'Medical Debt Credit Rules (2025)',
    body: 'As of 2025, medical debt under $500 cannot appear on credit reports. A bill in dispute should not be sent to collections.',
    action: 'If sent to collections while disputing, file a complaint with the CFPB at consumerfinance.gov.',
  },
  {
    icon: '\u{1F9FE}',
    title: 'No Surprise Billing Act',
    body: 'The No Surprises Act (2022) bans unexpected out-of-network bills for emergency care at in-network facilities. You may owe nothing if this happened.',
    action: 'Call your insurer: "I believe this is a surprise billing violation under the No Surprises Act."',
  },
  {
    icon: '\u{1F91D}',
    title: 'Payment Plans Are Always Available',
    body: 'Hospitals must offer interest-free payment plans to qualifying patients. Never pay a lump sum you cannot afford.',
    action: 'Say: "I cannot pay this in full. What interest-free payment plan options do you offer?"',
  },
  {
    icon: '\u{1F4DE}',
    title: 'CFPB and State Protections',
    body: 'The CFPB and your state Attorney General handle medical billing complaints. Filing a complaint often triggers rapid resolution.',
    action: 'File at consumerfinance.gov/complaint or your state AG website if billing is abusive.',
  },
]

export default function KnowYourRights({ dark, theme }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'linear-gradient(135deg,#f093fb,#f5576c)', borderRadius: 20, padding: '20px 24px' }}>
        <h2 style={{ color: 'white', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Know Your Rights</h2>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>Most patients do not know these exist. Knowledge is your biggest negotiating tool.</p>
      </div>

      {RIGHTS.map(({ icon, title, body, action }) => (
        <div key={title} style={{ background: theme.card, borderRadius: 16, padding: '18px 20px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>{icon}</span>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: theme.text, lineHeight: 1.3 }}>{title}</h3>
          </div>
          <p style={{ fontSize: 13, color: theme.sub, lineHeight: 1.6, marginBottom: 12 }}>{body}</p>
          <div style={{ background: dark ? '#0f172a' : '#f0f4ff', borderRadius: 10, padding: '10px 14px', borderLeft: '3px solid #667eea' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#667eea' }}>What to say: </span>
            <span style={{ fontSize: 12, color: theme.sub, fontStyle: 'italic' }}>{action}</span>
          </div>
        </div>
      ))}

      <div style={{ background: theme.card, borderRadius: 16, padding: '18px 20px' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: theme.text, marginBottom: 12 }}>Useful Resources</h3>
        {[
          ['CMS.gov', 'Official Medicare/Medicaid billing rules'],
          ['consumerfinance.gov/complaint', 'File CFPB complaint'],
          ['cms.gov/nosurprises', 'No Surprises Act info'],
          ['needymeds.org', 'Drug assistance programs'],
          ['cancercare.org/financial', 'Cancer-specific financial help'],
        ].map(([url, desc]) => (
          <div key={url} style={{ padding: '8px 0', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#667eea', fontWeight: 600 }}>{url}</span>
            <span style={{ fontSize: 12, color: theme.sub }}>{desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
