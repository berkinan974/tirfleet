import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email, password })
      login(res.data.access_token, res.data.user)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Giriş başarısız')
    } finally {
      setLoading(false)
    }
  }

  const inp = {
    width: '100%', background: 'var(--bg)', border: '1px solid var(--line)',
    color: 'var(--ink)', padding: '10px 12px', fontFamily: 'var(--mono)',
    fontSize: 13, boxSizing: 'border-box', outline: 'none',
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 32, letterSpacing: '0.04em', color: 'var(--amber)' }}>
            FLEETSYNC
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-mute)', letterSpacing: '0.2em', marginTop: 4 }}>
            /DISPATCH·V0.2
          </div>
        </div>

        {/* Form */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line-strong)', padding: 28 }}>
          <div className="t-tiny t-up t-mute" style={{ marginBottom: 20 }}>· OPERATOR LOGIN</div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <div className="t-tiny t-up t-mute" style={{ marginBottom: 6 }}>Email</div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inp}
                autoFocus
                required
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div className="t-tiny t-up t-mute" style={{ marginBottom: 6 }}>Password</div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={inp}
                required
              />
            </div>

            {error && (
              <div style={{ color: 'var(--red)', fontSize: 11, fontFamily: 'var(--mono)', marginBottom: 14 }}>
                ✕ {error}
              </div>
            )}

            <button
              type="submit"
              className="btn primary"
              style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: 12 }}
              disabled={loading}
            >
              {loading ? '⟳ AUTHENTICATING...' : '▸ LOGIN'}
            </button>
          </form>
        </div>

        <div className="t-tiny t-mute" style={{ textAlign: 'center', marginTop: 16, fontSize: 10 }}>
          FLEETSYNC TMS · SECURED · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}
