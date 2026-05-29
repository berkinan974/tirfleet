import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Fleet from './pages/Fleet'
import PTI from './pages/PTI'
import Loads from './pages/Loads'
import Factoring from './pages/Factoring'
import IFTA from './pages/IFTA'
import Partners from './pages/Partners'
import Fuel from './pages/Fuel'
import Login from './pages/Login'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="fleet" element={<Fleet />} />
          <Route path="pti" element={<PTI />} />
          <Route path="loads" element={<Loads />} />
          <Route path="factoring" element={<Factoring />} />
          <Route path="ifta" element={<IFTA />} />
          <Route path="partners" element={<Partners />} />
          <Route path="fuel" element={<Fuel />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
