export default function Ticker({ items }) {
  return (
    <div style={{
      display: 'flex', gap: 32, padding: '6px 16px',
      background: 'var(--bg-elev)', borderBottom: '1px solid var(--line)',
      fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.08em',
      color: 'var(--ink-dim)', overflow: 'hidden', whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {items.map((it, i) => (
        <span key={i} style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          <span className="t-mute">{String(i + 1).padStart(2, '0')}</span>
          <span style={{ color: it.tone === 'amber' ? 'var(--amber)' : it.tone === 'red' ? 'var(--red)' : 'var(--ink-dim)' }}>{it.t}</span>
          <span>{it.body}</span>
        </span>
      ))}
    </div>
  )
}
