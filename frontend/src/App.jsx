import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Fleet from './pages/Fleet'
import PTI from './pages/PTI'
import Loads from './pages/Loads'
import Factoring from './pages/Factoring'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="fleet" element={<Fleet />} />
        <Route path="pti" element={<PTI />} />
        <Route path="loads" element={<Loads />} />
        <Route path="factoring" element={<Factoring />} />
      </Route>
    </Routes>
  )
}
