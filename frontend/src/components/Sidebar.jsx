import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Truck, ClipboardCheck, Package } from 'lucide-react'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/fleet', icon: Truck, label: 'Fleet' },
  { to: '/pti', icon: ClipboardCheck, label: 'PTI' },
  { to: '/loads', icon: Package, label: 'Loads' },
]

export default function Sidebar() {
  return (
    <aside style={{ width: 220, background: '#161b22', borderRight: '1px solid #30363d', display: 'flex', flexDirection: 'column', minHeight: '100vh', flexShrink: 0 }}>
      <div style={{ padding: '24px 20px', borderBottom: '1px solid #30363d' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: '#2563eb', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Truck size={18} color="white" />
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#e6edf3' }}>FleetSync</span>
        </div>
      </div>

      <nav style={{ padding: '12px 8px', flex: 1 }}>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 8,
              marginBottom: 4,
              textDecoration: 'none',
              color: isActive ? '#e6edf3' : '#8b949e',
              background: isActive ? '#1c2128' : 'transparent',
              fontWeight: isActive ? 600 : 400,
              fontSize: 14,
              transition: 'all 0.15s',
            })}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '16px 20px', borderTop: '1px solid #30363d' }}>
        <p style={{ fontSize: 12, color: '#8b949e' }}>FleetSync v0.1</p>
      </div>
    </aside>
  )
}
