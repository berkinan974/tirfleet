import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLoads, createLoad, updateLoad, getTrucks, getDrivers, getLoadSummary, getDocuments, uploadDocument, deleteDocument, parseRateConfirmation, getDatStatus, searchDatLoads, getDatRates } from '../api'
import { useState, useRef } from 'react'
import Ticker from '../components/Ticker'

const STATUS_MAP = {
  pending:    ['',      'NEW'],
  in_transit: ['amber', 'IN TRANSIT'],
  delivered:  ['green', 'DELIVERED'],
  cancelled:  ['red',   'CANCELLED'],
}
const BILLING_MAP = {
  pending:  ['',      'PENDING'],
  invoiced: ['amber', 'INVOICED'],
  paid:     ['green', 'PAID'],
}

function StatusTag({ status }) {
  const [tone, label] = STATUS_MAP[status] || ['', status?.toUpperCase()]
  return <span className={`tag ${tone}`}>{label}</span>
}
function BillingTag({ status }) {
  const [tone, label] = BILLING_MAP[status] || ['', status?.toUpperCase()]
  return <span className={`tag ${tone}`}>{label}</span>
}

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

const EMPTY_FORM = {
  status: 'pending', billing_status: 'pending', dispatcher_name: '',
  pickup_date: '', pickup_city: '', pickup_state: '', pickup_zip: '',
  delivery_date: '', delivery_city: '', delivery_state: '', delivery_zip: '',
  broker_name: '', po_number: '', rate: '',
  driver_id: '', truck_id: '', trailer: '',
  notes: '', load_number: '', miles: '', dat_reference: '', eta: '',
}

export default function Loads() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showNewLoadMenu, setShowNewLoadMenu] = useState(false)
  const [docsLoad, setDocsLoad] = useState(null)
  const [docType, setDocType] = useState('bol')
  const [datOrigin, setDatOrigin] = useState('')
  const [datDest, setDatDest] = useState('')
  const [datEquip, setDatEquip] = useState('Van')
  const [datResults, setDatResults] = useState(null)
  const [datRates, setDatRates] = useState(null)
  const [datLoading, setDatLoading] = useState(false)
  const [showRC, setShowRC] = useState(false)
  const [rcParsing, setRcParsing] = useState(false)
  const [rcData, setRcData] = useState(null)
  const [rcRaw, setRcRaw] = useState('')
  const fileInputRef = useRef(null)
  const rcInputRef = useRef(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: loadsAll = [] } = useQuery({ queryKey: ['loads', ''], queryFn: () => getLoads('') })
  const { data: trucks = [] } = useQuery({ queryKey: ['trucks'], queryFn: getTrucks })
  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: getDrivers })
  const { data: summary = {} } = useQuery({ queryKey: ['loadSummary'], queryFn: getLoadSummary })

  const loads = loadsAll.filter(l => {
    if (filter && l.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (l.origin || '').toLowerCase().includes(q) ||
        (l.destination || '').toLowerCase().includes(q) ||
        (l.broker_name || '').toLowerCase().includes(q) ||
        (l.load_number || '').toLowerCase().includes(q)
    }
    return true
  })

  const createMut = useMutation({
    mutationFn: createLoad,
    onSuccess: () => {
      qc.invalidateQueries(['loads'])
      qc.invalidateQueries(['loadSummary'])
      setShowForm(false)
      setForm(EMPTY_FORM)
    }
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateLoad(id, data),
    onSuccess: () => { qc.invalidateQueries(['loads']); qc.invalidateQueries(['loadSummary']) }
  })
  const uploadMut = useMutation({
    mutationFn: ({ loadId, file, docType }) => uploadDocument(loadId, file, docType),
    onSuccess: () => qc.invalidateQueries(['docs', docsLoad?.id])
  })
  const deleteDocMut = useMutation({
    mutationFn: ({ loadId, docId }) => deleteDocument(loadId, docId),
    onSuccess: () => qc.invalidateQueries(['docs', docsLoad?.id])
  })
  const { data: docs = [] } = useQuery({
    queryKey: ['docs', docsLoad?.id],
    queryFn: () => getDocuments(docsLoad.id),
    enabled: !!docsLoad,
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
  const inStyle    = { width: '100%', background: 'var(--bg-elev)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '5px 8px', fontFamily: 'var(--mono)', fontSize: 11, boxSizing: 'border-box' }
  const selStyle   = { width: '100%', background: 'var(--bg-elev)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '5px 6px', fontFamily: 'var(--mono)', fontSize: 11, boxSizing: 'border-box' }
  const labelStyle = { fontSize: 9, color: 'var(--ink-mute)', fontFamily: 'var(--mono)', textTransform: 'uppercase', marginBottom: 3, letterSpacing: '0.05em' }

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
          {/* Header bar */}
          <div className="panel-head" style={{ padding: '10px 16px' }}>
            <span>· LOAD BOARD · {loadsAll.length} RECORDS</span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '4px 10px', fontFamily: 'var(--mono)', fontSize: 10, width: 180 }}
              />
              {/* New Load dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  className="btn primary"
                  style={{ padding: '5px 14px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => setShowNewLoadMenu(m => !m)}
                >
                  + New Load <span style={{ fontSize: 9 }}>▼</span>
                </button>
                {showNewLoadMenu && (
                  <div style={{ position: 'absolute', right: 0, top: '110%', background: 'var(--panel)', border: '1px solid var(--line-strong)', zIndex: 50, width: 220, boxShadow: '0 4px 12px #0006' }}>
                    <div
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--line)' }}
                      onClick={() => { setShowNewLoadMenu(false); setRcData(null); setRcRaw(''); setShowRC(true) }}
                    >
                      <div style={{ fontSize: 11, color: 'var(--amber)', fontFamily: 'var(--mono)' }}>Auto-Create from PDF</div>
                      <div style={{ fontSize: 10, color: 'var(--ink-mute)', marginTop: 2 }}>Extract load info from a Rate Confirmation</div>
                    </div>
                    <div
                      style={{ padding: '10px 14px', cursor: 'pointer' }}
                      onClick={() => { setShowNewLoadMenu(false); setShowForm(f => !f) }}
                    >
                      <div style={{ fontSize: 11, color: 'var(--ink)', fontFamily: 'var(--mono)' }}>Manual Load Entry</div>
                      <div style={{ fontSize: 10, color: 'var(--ink-mute)', marginTop: 2 }}>Enter load details manually</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Inline New Load Form */}
          {showForm && (
            <div style={{ background: 'var(--bg-elev)', borderBottom: '2px solid var(--amber)', padding: '14px 16px', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--amber)', fontFamily: 'var(--mono)', marginBottom: 12, fontWeight: 700 }}>NEW LOAD</div>

              {/* Row 1: Status / Billing / Dispatcher */}
              <div style={{ display: 'grid', gridTemplateColumns: '160px 160px 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <div style={labelStyle}>STATUS</div>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={selStyle}>
                    <option value="pending">New</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <div style={labelStyle}>BILLING STATUS</div>
                  <select value={form.billing_status} onChange={e => setForm(f => ({ ...f, billing_status: e.target.value }))} style={selStyle}>
                    <option value="pending">Pending</option>
                    <option value="invoiced">Invoiced</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div>
                  <div style={labelStyle}>DISPATCHER</div>
                  <input value={form.dispatcher_name} onChange={e => setForm(f => ({ ...f, dispatcher_name: e.target.value }))} style={inStyle} placeholder="Dispatcher name" />
                </div>
              </div>

              {/* Row 2: Pickup / Delivery / Broker / Driver */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                {/* Pickup */}
                <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', padding: 10 }}>
                  <div style={{ fontSize: 10, color: 'var(--amber)', fontFamily: 'var(--mono)', marginBottom: 8 }}>↑ PICKUP</div>
                  <div style={labelStyle}>DATE</div>
                  <input type="date" value={form.pickup_date} onChange={e => setForm(f => ({ ...f, pickup_date: e.target.value }))} style={{ ...inStyle, marginBottom: 6 }} />
                  <div style={labelStyle}>CITY</div>
                  <input value={form.pickup_city} onChange={e => setForm(f => ({ ...f, pickup_city: e.target.value }))} style={{ ...inStyle, marginBottom: 6 }} placeholder="City" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 6 }}>
                    <div>
                      <div style={labelStyle}>STATE</div>
                      <select value={form.pickup_state} onChange={e => setForm(f => ({ ...f, pickup_state: e.target.value }))} style={selStyle}>
                        <option value="">—</option>
                        {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={labelStyle}>ZIP</div>
                      <input value={form.pickup_zip} onChange={e => setForm(f => ({ ...f, pickup_zip: e.target.value }))} style={inStyle} placeholder="ZIP" />
                    </div>
                  </div>
                </div>

                {/* Delivery */}
                <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', padding: 10 }}>
                  <div style={{ fontSize: 10, color: 'var(--green)', fontFamily: 'var(--mono)', marginBottom: 8 }}>↓ DELIVERY</div>
                  <div style={labelStyle}>DATE</div>
                  <input type="date" value={form.delivery_date} onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))} style={{ ...inStyle, marginBottom: 6 }} />
                  <div style={labelStyle}>CITY</div>
                  <input value={form.delivery_city} onChange={e => setForm(f => ({ ...f, delivery_city: e.target.value }))} style={{ ...inStyle, marginBottom: 6 }} placeholder="City" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 6 }}>
                    <div>
                      <div style={labelStyle}>STATE</div>
                      <select value={form.delivery_state} onChange={e => setForm(f => ({ ...f, delivery_state: e.target.value }))} style={selStyle}>
                        <option value="">—</option>
                        {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={labelStyle}>ZIP</div>
                      <input value={form.delivery_zip} onChange={e => setForm(f => ({ ...f, delivery_zip: e.target.value }))} style={inStyle} placeholder="ZIP" />
                    </div>
                  </div>
                </div>

                {/* Broker */}
                <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', padding: 10 }}>
                  <div style={{ fontSize: 10, color: 'var(--ink-mute)', fontFamily: 'var(--mono)', marginBottom: 8 }}>BROKER</div>
                  <div style={labelStyle}>BROKER</div>
                  <input value={form.broker_name} onChange={e => setForm(f => ({ ...f, broker_name: e.target.value }))} style={{ ...inStyle, marginBottom: 6 }} placeholder="Broker name" />
                  <div style={labelStyle}>PO #</div>
                  <input value={form.po_number} onChange={e => setForm(f => ({ ...f, po_number: e.target.value }))} style={{ ...inStyle, marginBottom: 6 }} placeholder="PO number" />
                  <div style={labelStyle}>RATE</div>
                  <input type="number" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} style={inStyle} placeholder="$0.00" />
                </div>

                {/* Driver */}
                <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', padding: 10 }}>
                  <div style={{ fontSize: 10, color: 'var(--ink-mute)', fontFamily: 'var(--mono)', marginBottom: 8 }}>DRIVER</div>
                  <div style={labelStyle}>DRIVER</div>
                  <select value={form.driver_id} onChange={e => setForm(f => ({ ...f, driver_id: e.target.value }))} style={{ ...selStyle, marginBottom: 6 }}>
                    <option value="">— Select Driver —</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <div style={labelStyle}>TRUCK</div>
                  <select value={form.truck_id} onChange={e => setForm(f => ({ ...f, truck_id: e.target.value }))} style={{ ...selStyle, marginBottom: 6 }}>
                    <option value="">— Select Truck —</option>
                    {trucks.map(t => <option key={t.id} value={t.id}>{t.unit_number}{t.driver ? ` · ${t.driver}` : ''}</option>)}
                  </select>
                  <div style={labelStyle}>TRAILER</div>
                  <input value={form.trailer} onChange={e => setForm(f => ({ ...f, trailer: e.target.value }))} style={inStyle} placeholder="Trailer #" />
                </div>
              </div>

              {/* Row 3: Notes + Miles + Actions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: 10, alignItems: 'end' }}>
                <div>
                  <div style={labelStyle}>NOTES</div>
                  <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={inStyle} placeholder="Notes..." />
                </div>
                <div>
                  <div style={labelStyle}>MILES (opt)</div>
                  <input type="number" value={form.miles} onChange={e => setForm(f => ({ ...f, miles: e.target.value }))} style={inStyle} placeholder="0" />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn primary"
                    style={{ padding: '7px 20px', fontSize: 11 }}
                    disabled={createMut.isPending}
                    onClick={() => createMut.mutate({
                      ...form,
                      truck_id: form.truck_id ? parseInt(form.truck_id) : null,
                      driver_id: form.driver_id ? parseInt(form.driver_id) : null,
                      rate: parseFloat(form.rate) || 0,
                      miles: parseFloat(form.miles) || 0,
                      pickup_date: form.pickup_date || null,
                      delivery_date: form.delivery_date || null,
                    })}
                  >
                    {createMut.isPending ? 'Saving...' : '+ Create Load'}
                  </button>
                  <button className="btn" style={{ padding: '7px 14px', fontSize: 11 }} onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Filter chips */}
          <div style={{ display: 'flex', gap: 6, padding: '8px 16px', borderBottom: '1px solid var(--line)', background: 'var(--bg-elev)', flexShrink: 0, alignItems: 'center' }}>
            {[
              ['',           `ALL · ${loadsAll.length}`],
              ['pending',    `NEW · ${pending}`],
              ['in_transit', `IN TRANSIT · ${inTransit}`],
              ['delivered',  `DELIVERED · ${delivered}`],
              ['cancelled',  `CANCELLED · ${cancelled}`],
            ].map(([val, label]) => (
              <span key={val} onClick={() => setFilter(val)}
                className={`tag ${filter === val ? 'amber' : ''}`}
                style={{ cursor: 'pointer' }}>{label}</span>
            ))}
          </div>

          {/* Table */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {loads.length === 0 ? (
              <div style={{ padding: 24, color: 'var(--ink-mute)', fontSize: 11 }}>NO LOADS FOUND — USE [+ NEW LOAD] TO ADD</div>
            ) : (
              <table className="tbl" style={{ minWidth: 1200 }}>
                <thead>
                  <tr>
                    <th>LOAD</th>
                    <th>DATE</th>
                    <th>DRIVER</th>
                    <th>BROKER</th>
                    <th>PO #</th>
                    <th>PICKUP</th>
                    <th>DELIVERY</th>
                    <th className="num">RATE</th>
                    <th>COMPLETED</th>
                    <th>STATUS</th>
                    <th>BILLING</th>
                    <th>NOTES</th>
                    <th>DOCS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loads.map(l => {
                    const truck = truckMap[l.truck_id]
                    const driverName = l.driver?.name || truck?.driver || '—'
                    const pickupLoc = [l.pickup_city, l.pickup_state].filter(Boolean).join(', ') || l.origin || '—'
                    const deliveryLoc = [l.delivery_city, l.delivery_state].filter(Boolean).join(', ') || l.destination || '—'
                    const pickupDate = l.pickup_date ? new Date(l.pickup_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'
                    const completedDate = l.completed_at ? new Date(l.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'
                    return (
                      <tr key={l.id}>
                        <td>
                          <div className="t-mono" style={{ fontSize: 11 }}>{l.load_number || `L-${l.id}`}</div>
                        </td>
                        <td style={{ fontSize: 10, color: 'var(--ink-dim)' }}>{pickupDate}</td>
                        <td style={{ fontSize: 11 }}>{driverName}</td>
                        <td style={{ fontSize: 11 }}>{l.broker_name || <span className="t-mute">—</span>}</td>
                        <td style={{ fontSize: 10, color: 'var(--ink-dim)' }}>{l.po_number || '—'}</td>
                        <td style={{ fontSize: 10 }}>{pickupLoc}</td>
                        <td style={{ fontSize: 10 }}>{deliveryLoc}</td>
                        <td className="num">${(l.rate || 0).toLocaleString()}</td>
                        <td style={{ fontSize: 10, color: 'var(--ink-dim)' }}>{completedDate}</td>
                        <td>
                          <StatusTag status={l.status} />
                        </td>
                        <td>
                          <BillingTag status={l.billing_status || 'pending'} />
                        </td>
                        <td style={{ fontSize: 10, color: 'var(--ink-mute)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.notes || '—'}
                        </td>
                        <td>
                          <span onClick={() => setDocsLoad(l)} style={{ fontSize: 10, color: 'var(--amber)', cursor: 'pointer', fontFamily: 'var(--mono)' }}>DOCS</span>
                        </td>
                        <td>
                          <select value={l.status} onChange={e => updateMut.mutate({ id: l.id, data: { status: e.target.value } })}
                            style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', color: 'var(--ink-dim)', padding: '3px 6px', fontSize: 10, fontFamily: 'var(--mono)', cursor: 'pointer' }}>
                            <option value="pending">New</option>
                            <option value="in_transit">In Transit</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
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

          {/* DAT Board */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="panel-head" style={{ padding: '10px 16px' }}>
              <span>· DAT BOARD</span>
              <span className="ph-r" style={{ color: 'var(--ink-mute)', fontSize: 9 }}>MOCK MODE · ADD CREDENTIALS TO ACTIVATE</span>
            </div>

            {/* Search form */}
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', background: 'var(--bg-elev)', flexShrink: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 72px', gap: 6, marginBottom: 6 }}>
                <input value={datOrigin} onChange={e => setDatOrigin(e.target.value)} placeholder="Origin  e.g. Dallas, TX"
                  style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '5px 8px', fontFamily: 'var(--mono)', fontSize: 10 }} />
                <input value={datDest} onChange={e => setDatDest(e.target.value)} placeholder="Dest  e.g. Chicago, IL"
                  style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '5px 8px', fontFamily: 'var(--mono)', fontSize: 10 }} />
                <select value={datEquip} onChange={e => setDatEquip(e.target.value)}
                  style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '5px 4px', fontFamily: 'var(--mono)', fontSize: 10 }}>
                  <option>Van</option>
                  <option>Reefer</option>
                  <option>Flatbed</option>
                </select>
              </div>
              <button className="btn primary" style={{ width: '100%', justifyContent: 'center', padding: '5px 0', fontSize: 10 }}
                disabled={!datOrigin || !datDest || datLoading}
                onClick={async () => {
                  setDatLoading(true)
                  setDatResults(null)
                  setDatRates(null)
                  try {
                    const [loads, rates] = await Promise.all([
                      searchDatLoads(datOrigin, datDest, datEquip),
                      getDatRates(datOrigin, datDest, datEquip),
                    ])
                    setDatResults(loads.loads || [])
                    setDatRates(rates)
                  } catch (e) {
                    setDatResults([])
                  } finally {
                    setDatLoading(false)
                  }
                }}>
                {datLoading ? '⟳ SEARCHING...' : '▸ SEARCH LOADS'}
              </button>
            </div>

            {/* Rate summary */}
            {datRates && (
              <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--line)', background: 'var(--bg)', flexShrink: 0 }}>
                <div className="t-tiny t-up t-mute" style={{ marginBottom: 5 }}>
                  MARKET RATE · {datRates.lane}
                  {datRates.mock && <span style={{ color: 'var(--amber)', marginLeft: 6 }}>MOCK</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
                  {[
                    ['LOW',  `$${datRates.rate_low?.toFixed(2)}/MI`,  'var(--red)'],
                    ['AVG',  `$${datRates.rate_avg?.toFixed(2)}/MI`,  'var(--amber)'],
                    ['HIGH', `$${datRates.rate_high?.toFixed(2)}/MI`, 'var(--green)'],
                    ['VOL',  `${datRates.volume_index}/100`,          'var(--ink)'],
                  ].map(([label, val, color]) => (
                    <div key={label} style={{ textAlign: 'center', padding: '4px 0', borderRight: '1px solid var(--line)' }}>
                      <div className="t-tiny t-mute">{label}</div>
                      <div style={{ fontSize: 11, color, fontFamily: 'var(--mono)', marginTop: 2 }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 4, fontSize: 9, color: datRates.trend === 'up' ? 'var(--green)' : 'var(--red)' }}>
                  {datRates.trend === 'up' ? '▲' : '▼'} {datRates.trend_pct}% vs last week · {datRates.sample_size} loads sampled
                </div>
              </div>
            )}

            {/* Load results */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {!datResults && !datLoading && (
                <div style={{ padding: 14, color: 'var(--ink-mute)', fontSize: 10 }}>ENTER ORIGIN + DESTINATION TO SEARCH</div>
              )}
              {datResults && datResults.length === 0 && (
                <div style={{ padding: 14, color: 'var(--ink-mute)', fontSize: 10 }}>NO LOADS FOUND FOR THIS LANE</div>
              )}
              {datResults && datResults.map((load, i) => {
                const rpm = load.rate_per_mile
                const rpmColor = rpm >= 3.5 ? 'var(--green)' : rpm >= 3.0 ? 'var(--amber)' : 'var(--red)'
                return (
                  <div key={load.id || i} style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--ink)' }}>{load.broker?.name}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center' }}>
                          <span className="t-tiny t-mute">MC {load.broker?.mc}</span>
                          {load.broker?.credit && <span className="tag green" style={{ fontSize: 8, padding: '1px 4px' }}>{load.broker.credit}</span>}
                        </div>
                        <div style={{ marginTop: 4, fontSize: 10, color: 'var(--ink-dim)' }}>
                          {load.pickup_date} · {load.weight?.toLocaleString()} lbs · {load.commodity}
                        </div>
                        <div style={{ marginTop: 2, fontSize: 9, color: 'var(--ink-mute)' }}>
                          REF: {load.reference} · Posted {load.posted_age_min}m ago
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 14, color: 'var(--green)', fontFamily: 'var(--mono)' }}>${load.rate?.toLocaleString()}</div>
                        <div style={{ fontSize: 10, color: rpmColor, marginTop: 2 }}>${rpm?.toFixed(2)}/MI</div>
                        <div style={{ fontSize: 9, color: 'var(--ink-mute)', marginTop: 2 }}>{load.miles} mi</div>
                        <button className="btn" style={{ marginTop: 6, fontSize: 9, padding: '3px 8px', color: 'var(--amber)' }}
                          onClick={() => createMut.mutate({
                            truck_id: trucks[0]?.id,
                            origin: `${load.origin?.city}, ${load.origin?.state}`,
                            destination: `${load.destination?.city}, ${load.destination?.state}`,
                            broker_name: load.broker?.name,
                            rate: load.rate,
                            miles: load.miles,
                            dat_reference: load.reference,
                          })}>
                          + IMPORT
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* RC Parser Modal */}
      {showRC && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000cc', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line-strong)', padding: 24, width: 620, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
              <span className="t-tiny t-up t-dim">· RATE CONFIRMATION PARSER</span>
              <button onClick={() => setShowRC(false)} className="btn" style={{ padding: '3px 8px' }}>✕ CLOSE</button>
            </div>

            {/* Step 1: Upload */}
            {!rcData && (
              <div>
                <div style={{ padding: '24px 0', textAlign: 'center', border: '1px dashed var(--line-strong)', marginBottom: 16 }}>
                  <div className="t-tiny t-up t-mute" style={{ marginBottom: 12 }}>DROP RATE CONFIRMATION PDF</div>
                  <input ref={rcInputRef} type="file" accept=".pdf" style={{ display: 'none' }}
                    onChange={async e => {
                      const file = e.target.files[0]
                      if (!file) return
                      setRcParsing(true)
                      try {
                        const res = await parseRateConfirmation(file)
                        setRcData(res.parsed)
                        setRcRaw(res.raw_preview || '')
                      } catch (err) {
                        alert('PDF parse hatası: ' + (err.response?.data?.detail || err.message))
                      } finally {
                        setRcParsing(false)
                        e.target.value = ''
                      }
                    }}
                  />
                  <button className="btn primary" style={{ padding: '8px 24px' }} onClick={() => rcInputRef.current?.click()} disabled={rcParsing}>
                    {rcParsing ? '⟳ PARSING...' : '▸ SELECT PDF'}
                  </button>
                </div>
                <div className="t-tiny t-mute" style={{ fontSize: 10 }}>
                  Echo Global, Coyote, CH Robinson, Convoy ve diğer broker formatları desteklenir.
                  Bulunamayan alanları manuel girebilirsin.
                </div>
              </div>
            )}

            {/* Step 2: Review & confirm */}
            {rcData && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--green)' }}>
                    ✓ {Object.keys(rcData).length} ALAN BULUNDU — KONTROL ET
                  </span>
                  <span onClick={() => { setRcData(null); setRcRaw('') }} style={{ fontSize: 10, color: 'var(--ink-mute)', cursor: 'pointer', fontFamily: 'var(--mono)' }}>
                    ↺ YENİDEN YÜKLE
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    ['load_number', 'Load #'],
                    ['broker_name', 'Broker'],
                    ['origin', 'Origin *'],
                    ['destination', 'Destination *'],
                    ['rate', 'Rate ($)'],
                    ['miles', 'Miles'],
                    ['pickup_date', 'Pickup Date'],
                    ['delivery_date', 'Delivery Date'],
                    ['dat_reference', 'DAT Ref'],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <div className="t-tiny t-up t-mute" style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                        <span>{label}</span>
                        {rcData[key] != null && <span style={{ color: 'var(--green)' }}>✓</span>}
                      </div>
                      <input
                        value={rcData[key] ?? ''}
                        onChange={e => setRcData(d => ({ ...d, [key]: e.target.value }))}
                        style={inputStyle}
                        placeholder={rcData[key] == null ? '— not found' : ''}
                      />
                    </div>
                  ))}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>Truck *</div>
                    <select
                      value={rcData.truck_id || ''}
                      onChange={e => setRcData(d => ({ ...d, truck_id: e.target.value }))}
                      style={inputStyle}
                    >
                      <option value="">— SELECT TRUCK —</option>
                      {trucks.map(t => <option key={t.id} value={t.id}>{t.unit_number}{t.driver ? ` · ${t.driver}` : ''}</option>)}
                    </select>
                  </div>
                </div>

                {/* RPM preview */}
                {rcData.rate && rcData.miles && parseFloat(rcData.miles) > 0 && (
                  <div style={{ padding: '8px 10px', background: 'var(--bg-elev)', border: '1px solid var(--line)', fontSize: 11, marginTop: 10 }}>
                    <span className="t-mute">$/MI: </span>
                    <span style={{ color: (parseFloat(rcData.rate) / parseFloat(rcData.miles)) >= 4 ? 'var(--green)' : 'var(--amber)' }}>
                      ${(parseFloat(rcData.rate) / parseFloat(rcData.miles)).toFixed(2)}
                    </span>
                    <span className="t-mute" style={{ marginLeft: 16 }}>Rate: </span>
                    <span style={{ color: 'var(--green)' }}>${parseFloat(rcData.rate).toLocaleString()}</span>
                  </div>
                )}

                <button
                  className="btn primary"
                  style={{ marginTop: 16, width: '100%', justifyContent: 'center', padding: 10 }}
                  disabled={!rcData.origin || !rcData.destination || !rcData.truck_id}
                  onClick={() => {
                    createMut.mutate({
                      truck_id: parseInt(rcData.truck_id),
                      origin: rcData.origin,
                      destination: rcData.destination,
                      broker_name: rcData.broker_name || '',
                      rate: parseFloat(rcData.rate) || 0,
                      miles: parseFloat(rcData.miles) || 0,
                      load_number: rcData.load_number || '',
                      dat_reference: rcData.dat_reference || '',
                      eta: '',
                    })
                    setShowRC(false)
                    setRcData(null)
                  }}
                >
                  ▸ CREATE LOAD FROM RC
                </button>

                {/* Raw text preview (collapsible) */}
                {rcRaw && (
                  <details style={{ marginTop: 12 }}>
                    <summary style={{ fontSize: 10, color: 'var(--ink-mute)', cursor: 'pointer', fontFamily: 'var(--mono)' }}>RAW TEXT PREVIEW</summary>
                    <pre style={{ fontSize: 9, color: 'var(--ink-mute)', marginTop: 8, whiteSpace: 'pre-wrap', maxHeight: 150, overflow: 'auto', background: 'var(--bg)', padding: 8 }}>{rcRaw}</pre>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Docs Modal */}
      {docsLoad && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000bb', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line-strong)', padding: 24, width: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
              <span className="t-tiny t-up t-dim">· DOCUMENTS — {docsLoad.load_number || `L-${docsLoad.id}`}</span>
              <button onClick={() => setDocsLoad(null)} className="btn" style={{ padding: '3px 8px' }}>✕ CLOSE</button>
            </div>
            {/* Document list */}
            {docs.length === 0 ? (
              <div style={{ color: 'var(--ink-mute)', fontSize: 11, marginBottom: 16 }}>NO DOCUMENTS ATTACHED</div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                {docs.map(d => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--line)', fontSize: 11 }}>
                    <div>
                      <span className="tag" style={{ fontSize: 9, marginRight: 8 }}>{d.doc_type?.toUpperCase()}</span>
                      <span className="t-dim">{d.filename}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <a href={`/api/${d.file_path}`} target="_blank" rel="noreferrer" style={{ color: 'var(--amber)', fontSize: 10, fontFamily: 'var(--mono)' }}>OPEN</a>
                      <span onClick={() => deleteDocMut.mutate({ loadId: docsLoad.id, docId: d.id })} style={{ color: 'var(--ink-mute)', cursor: 'pointer', fontSize: 10 }}>✕</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Upload form */}
            <div className="t-tiny t-up t-mute" style={{ marginBottom: 8 }}>UPLOAD DOCUMENT</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select value={docType} onChange={e => setDocType(e.target.value)} style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '6px 8px', fontFamily: 'var(--mono)', fontSize: 11 }}>
                <option value="bol">BOL</option>
                <option value="rate_confirmation">RATE CONF</option>
                <option value="other">OTHER</option>
              </select>
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) uploadMut.mutate({ loadId: docsLoad.id, file: e.target.files[0], docType }); e.target.value = '' }} />
              <button className="btn primary" style={{ flex: 1, justifyContent: 'center', padding: '6px 0' }} onClick={() => fileInputRef.current?.click()}>
                {uploadMut.isPending ? 'UPLOADING...' : '▸ CHOOSE FILE'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
