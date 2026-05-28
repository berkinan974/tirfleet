import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLoads, createLoad, updateLoad, getTrucks, getLoadSummary } from '../api'
import { useState } from 'react'
import Ticker from '../components/Ticker'

const STATE_MAP = {
  pending:    ['',      'BOOKED'],
  in_transit: ['amber', 'ROLLING'],
  delivered:  ['green', 'DELIV'],
  cancelled:  ['red',   'CANCEL'],
}

function StateTag({ status }) {
  const [tone, label] = STATE_MAP[status] || ['', status?.toUpperCase()]
  return <span className={`tag ${tone}`}>{label}</span>
}

export default function Loads() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ truck_id: '', origin: '', destination: '', broker_name: '', rate: '', miles: '', load_number: '', dat_reference: '', eta: '' })

  const { data: loadsAll = [] } = useQuery({ queryKey: ['loads', ''], queryFn: () => getLoads('') })
  const { data: trucks = [] } = useQuery({ queryKey: ['trucks'], queryFn: getTrucks })
  const { data: summary = {} } = useQuery({ queryKey: ['loadSummary'], queryFn: getLoadSummary })

  const loads = filter
    ? loadsAll.filter(l => l.status === filter)
    : loadsAll

  const createMut = useMutation({
    mutationFn: createLoad,
    onSuccess: () => {
      qc.invalidateQueries(['loads'])
      qc.invalidateQueries(['loadSummary'])
      setShowForm(false)
      setForm({ truck_id: '', origin: '', destination: '', broker_name: '', rate: '', miles: '', load_number: '', dat_reference: '', eta: '' })
    }
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateLoad(id, data),
    onSuccess: () => { qc.invalidateQueries(['loads']); qc.invalidateQueries(['loadSummary']) }
  })

  // Build truck map: id → {unit_number, driver}
  const truckMap = Object.fromEntries(trucks.map(t => [t.id, t]))

  const pending   = loadsAll.filter(l => l.status === 'pending').length
  const inTransit = loadsAll.filter(l => l.status === 'in_transit').length
  const delivered = loadsAll.filter(l => l.status === 'delivered').length
  const cancelled = loadsAll.filter(l => l.status === 'cancelled').length
  const totalRev  = loadsAll.filter(l => l.status === 'delivered').reduce((s, l) => s + (l.rate || 0), 0)
  const transitRev = loadsAll.filter(l => l.status === 'in_transit').reduce((s, l) => s + (l.rate || 0), 0)
  const pendingRev = loadsAll.filter(l => l.status === 'pending').reduce((s, l) => s + (l.rate || 0), 0)

  // Best / worst lane by $/MI
  const loadsWithRpm = loadsAll.filter(l => l.miles && l.rate).map(l => ({ ...l, rpm: l.rate / l.miles }))
  const bestLane = loadsWithRpm.length ? loadsWithRpm.reduce((a, b) => a.rpm > b.rpm ? a : b) : null
  const worstLane = loadsWithRpm.length ? loadsWithRpm.reduce((a, b) => a.rpm < b.rpm ? a : b) : null

  const totalMiles = loadsAll.reduce((s, l) => s + (l.miles || 0), 0)
  const rpm = totalMiles > 0 ? (totalRev / totalMiles) : 0

  const tickerItems = [
    { t: 'DISPATCH', body: `${loadsAll.length} LOADS · ${inTransit} ROLLING · ${pending} PENDING`, tone: 'amber' },
    { t: 'WTD', body: `$${totalRev.toLocaleString()} GROSS · ${totalMiles.toLocaleString()} MI · $${rpm.toFixed(2)}/MI`, tone: 'green' },
    ...(bestLane ? [{ t: 'LANE BEST', body: `${bestLane.origin} → ${bestLane.destination} @ $${bestLane.rpm.toFixed(2)}/MI`, tone: 'green' }] : []),
    { t: 'BOARD', body: 'DAT · LOAD TRACKING ACTIVE' },
  ]

  const buckets = [
    { label: 'Booked · Pending', n: pending,   rev: `$${pendingRev.toLocaleString()}`,  tone: 'default' },
    { label: 'In Transit',       n: inTransit, rev: `$${transitRev.toLocaleString()}`,  tone: 'amber' },
    { label: 'Delivered · WTD',  n: delivered, rev: `$${totalRev.toLocaleString()}`,    tone: 'green' },
    { label: 'Cancelled',        n: cancelled, rev: '',                                  tone: 'default' },
    { label: 'Total Loads',      n: loadsAll.length, rev: '',                            tone: 'default' },
  ]

  const inputStyle = { width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '7px 10px', fontFamily: 'var(--mono)', fontSize: 12, boxSizing: 'border-box' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 89px)' }}>
      <Ticker items={tickerItems} />

      {/* Pipeline */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'var(--panel)', flexShrink: 0 }}>
        {buckets.map((b, i) => {
          const c = b.tone === 'amber' ? 'var(--amber)' : b.tone === 'green' ? 'var(--green)' : 'var(--ink)'
          return (
            <div key={i} style={{ flex: 1, padding: '12px 16px', borderRight: i < buckets.length - 1 ? '1px solid var(--line)' : '0' }}>
              <span className="t-tiny t-up t-mute">{b.label}</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 6 }}>
                <span className="t-num" style={{ fontSize: 32, color: c, lineHeight: 1 }}>{String(b.n).padStart(2,'0')}</span>
                {b.rev && <span className="t-dim t-tiny">{b.rev}</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', minHeight: 0, overflow: 'hidden' }}>

        {/* Load table */}
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line)', overflow: 'hidden' }}>
          <div className="panel-head" style={{ padding: '10px 16px' }}>
            <span>· LOAD BOARD · {loadsAll.length} RECORDS</span>
            <span className="ph-r" style={{ cursor: 'pointer', color: 'var(--amber)' }} onClick={() => setShowForm(true)}>+ NEW LOAD</span>
          </div>

          {/* Filter chips */}
          <div style={{ display: 'flex', gap: 6, padding: '8px 16px', borderBottom: '1px solid var(--line)', background: 'var(--bg-elev)', flexShrink: 0 }}>
            {[
              ['',           `ALL · ${loadsAll.length}`],
              ['pending',    `BOOKED · ${pending}`],
              ['in_transit', `ROLLING · ${inTransit}`],
              ['delivered',  `DELIV · ${delivered}`],
              ['cancelled',  `CANCEL · ${cancelled}`],
            ].map(([val, label]) => (
              <span key={val} onClick={() => setFilter(val)}
                className={`tag ${filter === val ? 'amber' : ''}`}
                style={{ cursor: 'pointer' }}>{label}</span>
            ))}
          </div>

          <div style={{ flex: 1, overflow: 'auto' }}>
            {loads.length === 0 ? (
              <div style={{ padding: 24, color: 'var(--ink-mute)', fontSize: 11 }}>NO LOADS FOUND — ADD LOADS WITH [+ NEW LOAD]</div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Load #</th>
                    <th>Broker</th>
                    <th>Lane</th>
                    <th className="num">Miles</th>
                    <th className="num">Rate</th>
                    <th className="num">$/MI</th>
                    <th>Truck</th>
                    <th>Driver</th>
                    <th>ETA</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loads.map(l => {
                    const truck = truckMap[l.truck_id]
                    const rpm = l.miles && l.rate ? l.rate / l.miles : null
                    const rpmColor = rpm === null ? 'var(--ink-mute)' : rpm >= 5 ? 'var(--green)' : rpm >= 4 ? 'var(--amber)' : 'var(--red)'
                    return (
                      <tr key={l.id}>
                        <td>
                          <div className="t-mono">{l.load_number || `L-${l.id}`}</div>
                          <div className="t-tiny t-mute">{l.dat_reference || '—'}</div>
                        </td>
                        <td>{l.broker_name || <span className="t-mute">—</span>}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
                            <span>{l.origin}</span>
                            <span style={{ color: 'var(--amber)' }}>→</span>
                            <span>{l.destination}</span>
                          </div>
                        </td>
                        <td className="num">{l.miles ? l.miles.toLocaleString() : '—'}</td>
                        <td className="num">${(l.rate || 0).toLocaleString()}</td>
                        <td className="num"><span style={{ color: rpmColor }}>{rpm !== null ? `$${rpm.toFixed(2)}` : '—'}</span></td>
                        <td><span className="t-display" style={{ fontSize: 12 }}>{truck?.unit_number || '—'}</span></td>
                        <td><span style={{ fontSize: 11, color: 'var(--ink-dim)' }}>{truck?.driver || <span className="t-mute">—</span>}</span></td>
                        <td><span style={{ fontSize: 11, color: 'var(--ink-dim)' }}>{l.eta || <span className="t-mute">—</span>}</span></td>
                        <td><StateTag status={l.status} /></td>
                        <td>
                          <select value={l.status} onChange={e => updateMut.mutate({ id: l.id, data: { status: e.target.value } })}
                            style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', color: 'var(--ink-dim)', padding: '3px 6px', fontSize: 10, fontFamily: 'var(--mono)', cursor: 'pointer' }}>
                            <option value="pending">BOOKED</option>
                            <option value="in_transit">ROLLING</option>
                            <option value="delivered">DELIV</option>
                            <option value="cancelled">CANCEL</option>
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Lane performance */}
          <div className="panel-head" style={{ padding: '10px 16px' }}>
            <span>· LANE PERFORMANCE</span>
            <span className="ph-r">$/MI</span>
          </div>
          <div style={{ padding: 14, borderBottom: '1px solid var(--line)', overflow: 'auto', maxHeight: '50%' }}>
            {loadsWithRpm.length === 0 && <span className="t-mute" style={{ fontSize: 11 }}>NO LANE DATA YET</span>}
            {[...loadsWithRpm].sort((a, b) => b.rpm - a.rpm).map((l, i) => (
              <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 56px', gap: 8, alignItems: 'center', padding: '5px 0', borderBottom: i < loadsWithRpm.length - 1 ? '1px dashed var(--line)' : '0' }}>
                <span style={{ fontSize: 11, color: 'var(--ink)' }}>{l.origin?.slice(0,3).toUpperCase()} → {l.destination?.slice(0,3).toUpperCase()}</span>
                <div style={{ height: 6, background: 'var(--line)', position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${Math.min(100,(l.rpm/6)*100)}%`, background: l.rpm >= 5 ? 'var(--green)' : l.rpm >= 4 ? 'var(--amber)' : 'var(--red)' }} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 11, color: l.rpm >= 5 ? 'var(--green)' : l.rpm >= 4 ? 'var(--amber)' : 'var(--red)' }}>${l.rpm.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Summary stats */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
            <div className="t-tiny t-up t-mute" style={{ marginBottom: 8 }}>· WTD SUMMARY</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
              <span className="t-mute">Gross Rev</span>  <span style={{ color: 'var(--green)' }}>${totalRev.toLocaleString()}</span>
              <span className="t-mute">Total Miles</span><span className="t-dim">{totalMiles.toLocaleString()} mi</span>
              <span className="t-mute">Avg $/MI</span>   <span style={{ color: rpm >= 4 ? 'var(--green)' : 'var(--amber)' }}>${rpm.toFixed(2)}</span>
              <span className="t-mute">Delivered</span>  <span className="t-dim">{delivered} loads</span>
              {bestLane && <><span className="t-mute">Best Lane</span><span style={{ color: 'var(--green)', fontSize: 10 }}>{bestLane.origin?.slice(0,3)}→{bestLane.destination?.slice(0,3)} ${bestLane.rpm.toFixed(2)}</span></>}
              {worstLane && bestLane?.id !== worstLane?.id && <><span className="t-mute">Worst Lane</span><span style={{ color: 'var(--red)', fontSize: 10 }}>{worstLane.origin?.slice(0,3)}→{worstLane.destination?.slice(0,3)} ${worstLane.rpm.toFixed(2)}</span></>}
            </div>
          </div>

          {/* DAT Board placeholder */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <div className="panel-head" style={{ padding: '10px 16px' }}>
              <span>· DAT BOARD</span>
              <span className="ph-r" style={{ color: 'var(--ink-mute)' }}>CONNECT API</span>
            </div>
            <div style={{ padding: '12px 16px' }}>
              <span className="t-mute" style={{ fontSize: 11 }}>DAT API integration pending.</span>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button className="btn" style={{ flex: 1, fontSize: 10 }} onClick={() => window.open('https://dat.com', '_blank')}>▸ OPEN DAT PORTAL</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Load Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000bb', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line-strong)', padding: 24, width: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
              <span className="t-tiny t-up t-dim">· NEW LOAD ENTRY</span>
              <button onClick={() => setShowForm(false)} className="btn" style={{ padding: '3px 8px' }}>✕ CLOSE</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['origin','Origin *'], ['destination','Destination *'],
                ['broker_name','Broker'], ['rate','Rate ($)'],
                ['miles','Miles'], ['eta','ETA (e.g. 18:30 CT)'],
                ['load_number','Load # (opt)'], ['dat_reference','DAT Ref (opt)'],
              ].map(([key, label]) => (
                <div key={key}>
                  <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>{label}</div>
                  <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
                </div>
              ))}
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>Truck</div>
                <select value={form.truck_id} onChange={e => setForm(f => ({ ...f, truck_id: e.target.value }))} style={inputStyle}>
                  <option value="">— SELECT —</option>
                  {trucks.map(t => <option key={t.id} value={t.id}>{t.unit_number}{t.driver ? ` · ${t.driver}` : ''}</option>)}
                </select>
              </div>
              {form.rate && form.miles && (
                <div style={{ gridColumn: '1 / -1', padding: '8px 10px', background: 'var(--bg-elev)', border: '1px solid var(--line)', fontSize: 11 }}>
                  <span className="t-mute">$/MI: </span>
                  <span style={{ color: (form.rate / form.miles) >= 4 ? 'var(--green)' : 'var(--amber)' }}>
                    ${(parseFloat(form.rate) / parseFloat(form.miles)).toFixed(2)}
                  </span>
                  <span className="t-mute" style={{ marginLeft: 16 }}>Total: </span>
                  <span style={{ color: 'var(--green)' }}>${parseFloat(form.rate).toLocaleString()}</span>
                </div>
              )}
            </div>
            <button onClick={() => createMut.mutate({ ...form, truck_id: parseInt(form.truck_id), rate: parseFloat(form.rate) || 0, miles: parseFloat(form.miles) || 0 })}
              className="btn primary" style={{ marginTop: 20, width: '100%', justifyContent: 'center', padding: 10 }}>
              ▸ SUBMIT LOAD
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
