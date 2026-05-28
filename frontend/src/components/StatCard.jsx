export default function StatCard({ label, value, sub, color = '#2563eb', icon: Icon }) {
  return (
    <div style={{
      background: '#161b22',
      border: '1px solid #30363d',
      borderRadius: 12,
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    }}>
      {Icon && (
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: color + '22',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <Icon size={22} color={color} />
        </div>
      )}
      <div>
        <p style={{ fontSize: 13, color: '#8b949e', marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 26, fontWeight: 700, color: '#e6edf3', lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ fontSize: 12, color: '#8b949e', marginTop: 4 }}>{sub}</p>}
      </div>
    </div>
  )
}
