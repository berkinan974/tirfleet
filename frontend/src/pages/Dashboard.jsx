import { useQuery, useMutation } from '@tanstack/react-query'
import { getTrucks, getPtiToday, getLoadSummary, getLoads, nudgePti, broadcastMessage } from '../api'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Ticker from '../components/Ticker'

const STATUS_MAP = {
  active:      ['amber', 'ROLLING'],
  maintenance: ['red',   'SHOP'],
  inactive:    ['',      'IDLE'],
}

function StatusBadge({ status }) {
  const [tone, label] = STATUS_MAP[status] || ['', status?.toUpperCase()]
  return <span className={`tag ${tone}`}>{label}</span>
}

function PTIBadge({ ok }) {
  return ok
    ? <span className="tag green">PTI · OK</span>
    : <span className="tag red">PTI · MISS</span>
}

function FuelBar({ value = 100 }) {
  const pct = Math.max(0, Math.min(100, value))
  const color = pct < 25 ? 'var(--red)' : pct < 50 ? 'var(--amber)' : 'var(--green)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 48, height: 4, background: 'var(--line)', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: color }} />
      </div>
      <span style={{ fontSize: 10, color: pct < 25 ? 'var(--red)' : 'var(--ink-dim)', fontFamily: 'var(--mono)' }}>{pct}%</span>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState([])
  const [showMsgModal, setShowMsgModal] = useState(false)
  const [msgText, setMsgText] = useState('')

  const { data: trucks = [] } = useQuery({ queryKey: ['trucks'], queryFn: getTrucks, refetchInterval: 30000 })
  const { data: ptiToday = [] } = useQuery({ queryKey: ['ptiToday'], queryFn: getPtiToday, refetchInterval: 30000 })
  const { data: summary = {} } = useQuery({ queryKey: ['loadSummary'], queryFn: getLoadSummary, refetchInterval: 60000 })
  const { data: loads = [] } = useQuery({ queryKey: ['loads', ''], queryFn: () => getLoads('') })

  const nudgeMut = useMutation({
    mutationFn: nudgePti,
    onSuccess: (data) => setLogs(l => [...l, {
      cmd: 'nudge pti --today',
      out: data.total_missing === 0 ? 'ALL CLEAR · no missing PTI' : `SENT · ${data.sent}/${data.total_missing} drivers notified`
    }]),
    onError: () => setLogs(l => [...l, { cmd: 'nudge pti --today', out: 'ERROR · check bot connection' }])
  })

  const broadcastMut = useMutation({
    mutationFn: (msg) => broadcastMessage(msg),
    onSuccess: (data) => {
      setShowMsgModal(false); setMsgText('')
      setLogs(l => [...l, { cmd: 'broadcast --all', out: `SENT · ${data.sent}/${data.total} drivers` }])
    },
    onError: () => setLogs(l => [...l, { cmd: 'broadcast --all', out: 'ERROR · check bot connection' }])
  })

  const activeTrucks = trucks.filter(t => t.status === 'active').length
  const ptiDone = ptiToday.filter(p => p.submitted).length
  const ptiMiss = ptiToday.length - ptiDone
  const onTimePct = summary.on_time_pct ?? 0
  const rpm = summary.revenue_per_mile ?? 0

  const exportCsv = () => {
    if (!loads.length) return
    const headers = ['id', 'load_number', 'broker_name', 'origin', 'destination', 'miles', 'rate', 'eta', 'status', 'dat_reference']
    const rows = loads.map(l => headers.map(h => l[h] ?? '').join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `loads_${new Date().toISOString().slice(0,10)}.csv`; a.click()
    URL.revokeObjectURL(url)
    setLogs(l => [...l, { cmd: 'export csv --loads', out: `${loads.length} RECORDS downloaded` }])
  }

  const tickerItems = [
    { t: 'DISPATCH', body: `${trucks.length} UNITS · ${activeTrucks} ROLLING · ${trucks.filter(t=>t.status==='maintenance').length} SHOP · ${trucks.filter(t=>t.status==='inactive').length} EMPTY`, tone: 'amber' },
    { t: 'PTI',      body: `${ptiDone}/${ptiToday.length} SUBMITTED · ${ptiMiss > 0 ? ptiMiss + ' MISSING' : '0 MISSING'}`, tone: ptiMiss > 0 ? 'amber' : '' },
    { t: 'WTD',      body: `$${(summary.total_revenue ?? 0).toLocaleString()} GROSS · ${(summary.total_miles ?? 0).toLocaleString()} MI · $${rpm}/MI`, tone: 'green' },
    { t: 'RTS',      body: 'FACTORING · CHECK PENDING INVOICES' },
  ]

  const alerts = [
    ...(ptiMiss > 0 ? [{ t: new Date().toTimeString().slice(0,5), tone: 'red', txt: `${ptiMiss} DRIVER(S) MISSING PTI TODAY` }] : []),
    ...(trucks.some(t => (t.fuel_level ?? 100) < 25) ? [{ t: '—', tone: 'amber', txt: 'FUEL ALERT · TRUCK(S) BELOW 25%' }] : []),
    { t: '—', tone: '', txt: `FLEET · ${trucks.length} TOTAL UNITS REGISTERED` },
    { t: '—', tone: '', txt: 'RTS FACTORING · CHECK PENDING INVOICES' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 89px)' }}>
      <Ticker items={tickerItems} />

      {/* STATS ROW */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'var(--panel)', flexShrink: 0 }}>
        {[
          { label: 'Active Trucks',  value: String(activeTrucks).padStart(2,'0'), sub: `/ ${trucks.length} total`,   tone: activeTrucks > 0 ? 'amber' : 'default' },
          { label: 'PTI Today',      value: `${ptiDone}/${ptiToday.length}`,      sub: ptiMiss > 0 ? `${ptiMiss} outstanding` : 'all clear', tone: ptiMiss > 0 ? 'amber' : 'green' },
          { label: 'In Transit',     value: String(summary.in_transit ?? 0).padStart(2,'0'), sub: 'rolling',         tone: 'default' },
          { label: 'Gross · WTD',    value: `$${((summary.total_revenue ?? 0)/1000).toFixed(1)}K`, sub: `$${rpm}/mi`, tone: 'green' },
          { label: 'On-Time',        value: `${onTimePct}%`,                      sub: 'last 30 days',               tone: onTimePct >= 90 ? 'green' : onTimePct >= 75 ? 'amber' : 'red' },
          { label: 'Open Alerts',    value: String(ptiMiss).padStart(2,'0'),       sub: ptiMiss > 0 ? `${ptiMiss} critical` : 'none', tone: ptiMiss > 0 ? 'red' : 'default' },
        ].map(({ label, value, sub, tone }) => {
          const c = tone === 'amber' ? 'var(--amber)' : tone === 'green' ? 'var(--green)' : tone === 'red' ? 'var(--red)' : 'var(--ink)'
          return (
            <div key={label} style={{ padding: '14px 16px', borderRight: '1px solid var(--line)', flex: 1, minHeight: 92 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="t-tiny t-up t-mute">{label}</span>
                {sub && <span className="t-tiny t-mute">{sub}</span>}
              </div>
              <div style={{ marginTop: 8 }}>
                <span className="t-num" style={{ fontSize: 36, color: c, lineHeight: 1 }}>{value}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* MAIN BODY */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 420px', minHeight: 0, overflow: 'hidden' }}>

        {/* LEFT — Fleet status board */}
        <div style={{ borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <div className="panel-head" style={{ padding: '10px 16px' }}>
            <span>· FLEET STATUS BOARD · LIVE</span>
            <span className="ph-r">SORT ▾ UNIT · FILTER ▾ ALL</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {trucks.length === 0 ? (
              <div style={{ padding: 24, color: 'var(--ink-mute)', fontSize: 11 }}>
                NO UNITS REGISTERED — ADD TRUCKS IN FLEET ROSTER [F4]
              </div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 20 }}></th>
                    <th>Unit</th>
                    <th>Driver</th>
                    <th>Status</th>
                    <th>Lane / Position</th>
                    <th className="num">Rate</th>
                    <th>ETA</th>
                    <th>PTI</th>
                    <th>Fuel</th>
                  </tr>
                </thead>
                <tbody>
                  {trucks.map(truck => {
                    const pti = ptiToday.find(p => p.truck === truck.unit_number)
                    const dotColor = truck.status === 'active' ? 'var(--amber)' : truck.status === 'maintenance' ? 'var(--red)' : 'var(--ink-mute)'
                    const load = truck.active_load
                    return (
                      <tr key={truck.id}>
                        <td><span className="dot" style={{ background: dotColor }} /></td>
                        <td><span className="t-display" style={{ fontSize: 14, color: 'var(--ink)' }}>{truck.unit_number}</span></td>
                        <td>{truck.driver || <span className="t-mute">—</span>}</td>
                        <td><StatusBadge status={truck.status} /></td>
                        <td>
                          {load ? (
                            <div>
                              <div style={{ fontSize: 11 }}>{load.origin} → {load.destination}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                                <div style={{ width: 60, height: 2, background: 'var(--line)', position: 'relative' }}>
                                  <div style={{ position: 'absolute', inset: 0, width: '40%', background: 'var(--amber)' }} />
                                </div>
                                <span className="t-tiny t-mute">EN ROUTE</span>
                              </div>
                            </div>
                          ) : <span className="t-mute">—</span>}
                        </td>
                        <td className="num">{load ? `$${(load.rate||0).toLocaleString()}` : <span className="t-mute">—</span>}</td>
                        <td><span style={{ fontSize: 11, color: 'var(--ink-dim)' }}>{load?.eta || <span className="t-mute">—</span>}</span></td>
                        <td><PTIBadge ok={pti?.submitted} /></td>
                        <td><FuelBar value={truck.fuel_level} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT — Alert feed + PTI compliance + Quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="panel-head" style={{ padding: '10px 16px' }}>
            <span>· ALERT FEED</span>
            <span className="ph-r">{alerts.length} ITEMS · SHIFT</span>
          </div>
          <div style={{ borderBottom: '1px solid var(--line)' }}>
            {alerts.map((a, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '48px 12px 1fr', padding: '8px 16px', borderBottom: '1px solid var(--line)', fontSize: 11, alignItems: 'baseline', gap: 8 }}>
                <span className="t-mute" style={{ fontFamily: 'var(--mono)' }}>{a.t}</span>
                <span className="dot" style={{ background: a.tone === 'red' ? 'var(--red)' : a.tone === 'amber' ? 'var(--amber)' : 'var(--ink-mute)' }} />
                <span style={{ color: a.tone === 'red' ? 'var(--red)' : a.tone === 'amber' ? 'var(--amber)' : 'var(--ink-dim)' }}>{a.txt}</span>
              </div>
            ))}
          </div>

          {/* PTI Compliance */}
          <div className="panel-head" style={{ padding: '10px 16px' }}>
            <span>· PTI COMPLIANCE · TODAY</span>
            <span className="ph-r">{ptiToday.length > 0 ? Math.round((ptiDone / ptiToday.length) * 100) : 0}%</span>
          </div>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 48 }}>
              {ptiToday.map((p, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: '100%', height: p.submitted ? '100%' : '30%', background: p.submitted ? 'var(--green)' : 'var(--red)' }} />
                  <span style={{ fontSize: 8, color: 'var(--ink-mute)' }}>{p.driver_name?.split(' ')[0]?.slice(0,4).toUpperCase()}</span>
                </div>
              ))}
              {ptiToday.length === 0 && <span className="t-mute" style={{ fontSize: 11 }}>NO DATA</span>}
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
            <span className="t-tiny t-up t-mute">· QUICK COMMAND</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button className="btn primary" disabled={nudgeMut.isPending} onClick={() => nudgeMut.mutate()}>
                {nudgeMut.isPending ? '▸ SENDING...' : '▸ NUDGE LATE PTI'}
              </button>
              <button className="btn" onClick={() => navigate('/loads')}>+ NEW LOAD</button>
              <button className="btn" onClick={() => navigate('/loads')}>+ DISPATCH</button>
              <button className="btn" onClick={() => navigate('/factoring')}>RTS BATCH</button>
              <button className="btn" onClick={() => setShowMsgModal(true)}>DRIVER MSG</button>
              <button className="btn" onClick={exportCsv} disabled={!loads.length}>EXPORT CSV</button>
            </div>
            <div style={{ flex: 1, marginTop: 4, padding: 10, border: '1px solid var(--line)', background: 'var(--bg-elev)', overflow: 'auto' }}>
              <span className="t-tiny t-up t-mute">CONSOLE</span>
              <pre style={{ margin: '6px 0 0', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-dim)', whiteSpace: 'pre-wrap' }}>
{`> status --fleet\n  ${activeTrucks} ACTIVE · ${trucks.length - activeTrucks} OFFLINE\n> pti --today\n  ${ptiDone}/${ptiToday.length} OK · ${ptiMiss} MISS`}
{logs.slice(-4).map(l => `\n> ${l.cmd}\n  ${l.out}`).join('')}
{'\n_'}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Driver Broadcast Modal */}
      {showMsgModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000bb', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line-strong)', padding: 24, width: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
              <span className="t-tiny t-up t-dim">· BROADCAST TO ALL DRIVERS</span>
              <button onClick={() => setShowMsgModal(false)} className="btn" style={{ padding: '3px 8px' }}>✕ CLOSE</button>
            </div>
            <div className="t-tiny t-up t-mute" style={{ marginBottom: 6 }}>Message</div>
            <textarea value={msgText} onChange={e => setMsgText(e.target.value)} rows={4}
              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '8px 10px', fontFamily: 'var(--mono)', fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }}
              placeholder="Type message to send via Telegram..." />
            <button onClick={() => broadcastMut.mutate(msgText)} disabled={!msgText.trim() || broadcastMut.isPending}
              className="btn primary" style={{ marginTop: 16, width: '100%', justifyContent: 'center', padding: 10 }}>
              {broadcastMut.isPending ? '▸ SENDING...' : '▸ SEND TO ALL DRIVERS'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
