import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'

const FEATURES = [
  { tag: 'DISPATCH',    text: 'Real-time load tracking with live status updates across your entire fleet.' },
  { tag: 'PTI',         text: 'Daily pre-trip inspection via Telegram bot — photo evidence, auto-logged.' },
  { tag: 'DAT BOARD',   text: 'Integrated load board with market rate intelligence and one-click import.' },
  { tag: 'FACTORING',   text: 'RTS factoring workflow built-in — invoice to payment, fully tracked.' },
  { tag: 'DOCS',        text: 'Rate confirmation PDF parser — drop a broker RC, load is created automatically.' },
  { tag: 'MAINTENANCE', text: 'Service logs, CDL expiry alerts, and compliance reminders per vehicle.' },
]

const STATS = [
  { value: '100%', label: 'Uptime SLA' },
  { value: '<2s',  label: 'API Response' },
  { value: '24/7', label: 'Bot Active' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')  // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const res = await api.post('/auth/login', { email, password })
        login(res.data.access_token, res.data.user)
        navigate('/', { replace: true })
      } else {
        const res = await api.post('/auth/register', { email, password, name, company_name: companyName })
        login(res.data.access_token, res.data.user)
        navigate('/', { replace: true })
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'İşlem başarısız')
    } finally {
      setLoading(false)
    }
  }

  const inp = {
    width: '100%', background: '#0d0e0d', border: '1px solid var(--line)',
    color: 'var(--ink)', padding: '10px 12px', fontFamily: 'var(--mono)',
    fontSize: 13, boxSizing: 'border-box', outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex' }}>

      {/* LEFT — Marketing */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '48px 56px', borderRight: '1px solid var(--line)', maxWidth: 640,
      }}>
        {/* Logo */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 28, letterSpacing: '0.04em', color: 'var(--amber)' }}>
              FLEETSYNC
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-mute)', letterSpacing: '0.2em' }}>
              /DISPATCH·V0.2
            </span>
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-dim)', marginTop: 2 }}>
            Transportation Management System
          </div>
        </div>

        {/* Headline */}
        <div>
          <div style={{ fontSize: 36, fontFamily: 'var(--sans)', fontWeight: 700, lineHeight: 1.15, color: 'var(--ink)', marginBottom: 16 }}>
            Run your fleet.<br />
            <span style={{ color: 'var(--amber)' }}>Not spreadsheets.</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-dim)', lineHeight: 1.7, maxWidth: 440 }}>
            FLEETSYNC gives owner-operators and small carriers a professional-grade
            dispatch platform — built for the reality of daily trucking operations.
          </div>
        </div>

        {/* Feature list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {FEATURES.map(f => (
            <div key={f.tag} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 12, alignItems: 'start' }}>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--amber)',
                border: '1px solid var(--amber)', padding: '2px 6px',
                letterSpacing: '0.12em', textAlign: 'center', marginTop: 2,
              }}>
                {f.tag}
              </span>
              <span style={{ fontSize: 11, color: 'var(--ink-dim)', lineHeight: 1.6 }}>{f.text}</span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 0, borderTop: '1px solid var(--line)', paddingTop: 24 }}>
          {STATS.map((s, i) => (
            <div key={s.label} style={{ flex: 1, borderRight: i < STATS.length - 1 ? '1px solid var(--line)' : '0', paddingRight: 24, paddingLeft: i > 0 ? 24 : 0 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 22, color: 'var(--green)', lineHeight: 1 }}>{s.value}</div>
              <div className="t-tiny t-up t-mute" style={{ marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
          <div style={{ flex: 2, paddingLeft: 24 }}>
            <div style={{ fontSize: 10, color: 'var(--ink-mute)', lineHeight: 1.7 }}>
              Built for owner-operators ready to scale.<br />
              PTI · Loads · DAT · Factoring · Maintenance
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT — Login */}
      <div style={{ width: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 40px' }}>
        <div style={{ width: '100%' }}>
          <div className="t-tiny t-up t-mute" style={{ marginBottom: 28, letterSpacing: '0.15em' }}>
            {mode === 'login' ? '· OPERATOR ACCESS' : '· İLK KURULUM — YÖNETİCİ HESABI'}
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <div className="t-tiny t-up t-mute" style={{ marginBottom: 6 }}>Ad Soyad *</div>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} style={inp} required />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div className="t-tiny t-up t-mute" style={{ marginBottom: 6 }}>Şirket Adı</div>
                  <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} style={inp} placeholder="TIR Fleet" />
                </div>
              </>
            )}
            <div style={{ marginBottom: 14 }}>
              <div className="t-tiny t-up t-mute" style={{ marginBottom: 6 }}>Email</div>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inp} autoFocus required />
            </div>
            <div style={{ marginBottom: 24 }}>
              <div className="t-tiny t-up t-mute" style={{ marginBottom: 6 }}>Şifre</div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={inp} required />
            </div>

            {error && (
              <div style={{ color: 'var(--red)', fontSize: 11, fontFamily: 'var(--mono)', marginBottom: 14 }}>
                ✕ {error}
              </div>
            )}

            <button type="submit" className="btn primary"
              style={{ width: '100%', justifyContent: 'center', padding: 13, fontSize: 12, letterSpacing: '0.1em' }}
              disabled={loading}>
              {loading
                ? '⟳ İŞLEM YAPILIYOR...'
                : mode === 'login' ? '▸ GİRİŞ YAP' : '▸ HESAP OLUŞTUR'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            {mode === 'login' ? (
              <span style={{ fontSize: 11, color: 'var(--ink-mute)', fontFamily: 'var(--mono)', cursor: 'pointer' }}
                onClick={() => { setMode('register'); setError('') }}>
                İlk kurulum? <span style={{ color: 'var(--amber)' }}>Hesap oluştur →</span>
              </span>
            ) : (
              <span style={{ fontSize: 11, color: 'var(--ink-mute)', fontFamily: 'var(--mono)', cursor: 'pointer' }}
                onClick={() => { setMode('login'); setError('') }}>
                Zaten hesabın var? <span style={{ color: 'var(--amber)' }}>Giriş yap →</span>
              </span>
            )}
          </div>

          <div className="t-tiny t-mute" style={{ textAlign: 'center', marginTop: 24, fontSize: 9, letterSpacing: '0.1em' }}>
            FLEETSYNC TMS · SECURED · {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </div>
  )
}
