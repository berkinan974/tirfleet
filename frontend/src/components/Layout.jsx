import TopBar from './TopBar'
import { Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="tir-grid-bg" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar />
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
