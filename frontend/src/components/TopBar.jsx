import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const tabs = [
  { id: '/',          label: 'Overview',        key: 'F1' },
  { id: '/pti',       label: 'PTI Inspection',  key: 'F2' },
  { id: '/loads',     label: 'Loads / Dispatch', key: 'F3' },
  { id: '/fleet',     label: 'Fleet Roster',    key: 'F4' },
  { id: '/factoring', label: 'Factoring',       key: 'F5' },
  { id: '/ifta',      label: 'IFTA',            key: 'F6' },
  { id: '/fuel',        label: 'Fuel',        key: 'F7' },
  { id: '/partners',   label: 'Partners',    key: 'F8' },
  { id: '/accounting', label: 'Accounting',  key: 'F9' },
  { id: '/payroll',    label: 'Payroll',     key: 'F10' },
]

function Clock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const utc = now.toISOString().slice(11, 19)
  const ct = now.toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour12: false })
  const date = now.toLocaleDateString('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.') + ' / ' + now.toLocaleDateString('en-US', { timeZone: 'America/Chicago', weekday: 'short' }).toUpperCase()
  return (
    <div style={{ display: 'flex', gap: 18, alignItems: 'center', fontSize: 11 }}>
      <div><span className="t-mute t-tiny t-up" style={{ marginRight: 6 }}>UTC</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{utc}</span></div>
      <div><span className="t-mute t-tiny t-up" style={{ marginRight: 6 }}>CT</span><span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--amber)' }}>{ct}</span></div>
      <div><span className="t-mute t-tiny t-up" style={{ marginRight: 6 }}>DATE</span><span>{date}</span></div>
    </div>
  )
}

export default function TopBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user, logout } = useAuth()

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  return (
    <div style={{ borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 22, letterSpacing: '0.04em', color: 'var(--amber)', lineHeight: 1 }}>FLEETSYNC</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.2em', color: 'var(--ink-mute)', textTransform: 'uppercase' }}>/dispatch·v0.2</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="dot amber" /><span className="t-tiny t-up t-dim">SYS ONLINE</span></div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="dot green" /><span className="t-tiny t-up t-dim">API · 200 OK</span></div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="dot green" /><span className="t-tiny t-up t-dim">BOT · ACTIVE</span></div>
        </div>
        <Clock />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {user?.company_name && (
            <>
              <span className="t-tiny t-up" style={{ color: 'var(--ink-dim)', border: '1px solid var(--line)', padding: '2px 6px', fontFamily: 'var(--mono)', fontSize: 9 }}>{user.company_name.toUpperCase()}</span>
              <span className="t-tiny t-up t-mute">·</span>
            </>
          )}
          <span className="t-tiny t-up t-mute">OPERATOR</span>
          <span className="t-tiny t-up" style={{ color: 'var(--amber)' }}>{user?.name?.toUpperCase() || 'UNKNOWN'}</span>
          <span className="t-tiny t-up t-mute">·</span>
          <span className="t-tiny t-up t-dim">{user?.role?.toUpperCase() || ''}</span>
          <span className="t-tiny t-up t-mute">·</span>
          <span onClick={handleLogout} className="t-tiny t-up" style={{ color: 'var(--red)', cursor: 'pointer' }}>LOGOUT</span>
        </div>
      </div>

      {/* Nav tabs */}
      <div style={{ display: 'flex', padding: '0 16px', background: 'var(--bg)' }}>
        {tabs.map(({ id, label, key }) => {
          const on = pathname === id
          return (
            <div key={id} onClick={() => navigate(id)} style={{
              padding: '10px 16px', borderRight: '1px solid var(--line)',
              borderBottom: on ? '2px solid var(--amber)' : '2px solid transparent',
              background: on ? 'var(--panel)' : 'transparent',
              display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer',
            }}>
              <span className="t-tiny t-up" style={{ color: 'var(--ink-mute)' }}>{key}</span>
              <span style={{ fontSize: 12, color: on ? 'var(--amber)' : 'var(--ink)', letterSpacing: '0.04em' }}>{label}</span>
            </div>
          )
        })}
        <div style={{ flex: 1 }} />
        <div style={{ padding: '10px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="t-tiny t-up t-mute">CMD</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-dim)', border: '1px solid var(--line)', padding: '2px 8px' }}>:_</span>
        </div>
      </div>
    </div>
  )
}
