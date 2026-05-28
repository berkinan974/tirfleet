import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTrucks, getDrivers, createTruck, createDriver, updateTruck, updateDriver } from '../api'
import { useState } from 'react'
import Ticker from '../components/Ticker'

const STATUS_MAP = {
  active:      ['green', 'ACTIVE'],
  maintenance: ['red',   'SHOP'],
  inactive:    ['',      'IDLE'],
}

export default function Fleet() {
  const qc = useQueryClient()
  const [showTruckForm, setShowTruckForm] = useState(false)
  const [showDriverForm, setShowDriverForm] = useState(false)
  const [editTruck, setEditTruck] = useState(null)
  const [editDriver, setEditDriver] = useState(null)
  const [truckForm, setTruckForm] = useState({ unit_number: '', plate: '', make: '', model: '', year: '2020', vin: '', odometer: '' })
  const [driverForm, setDriverForm] = useState({ name: '', phone: '', telegram_id: '', license_number: '', truck_id: '' })

  const { data: trucks = [] } = useQuery({ queryKey: ['trucks'], queryFn: getTrucks })
  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: getDrivers })

  const createTruckMut = useMutation({ mutationFn: createTruck, onSuccess: () => { qc.invalidateQueries(['trucks']); setShowTruckForm(false); setTruckForm({ unit_number: '', plate: '', make: '', model: '', year: '2020', vin: '', odometer: '' }) } })
  const createDriverMut = useMutation({ mutationFn: createDriver, onSuccess: () => { qc.invalidateQueries(['drivers']); setShowDriverForm(false); setDriverForm({ name: '', phone: '', telegram_id: '', license_number: '', truck_id: '' }) } })
  const updateTruckMut = useMutation({ mutationFn: ({ id, data }) => updateTruck(id, data), onSuccess: () => { qc.invalidateQueries(['trucks']); setEditTruck(null) } })
  const updateDriverMut = useMutation({ mutationFn: ({ id, data }) => updateDriver(id, data), onSuccess: () => { qc.invalidateQueries(['drivers']); setEditDriver(null) } })

  const truckMap = Object.fromEntries(trucks.map(t => [t.id, t.unit_number]))
  const active = trucks.filter(t => t.status === 'active').length
  const shop = trucks.filter(t => t.status === 'maintenance').length
  const noTg = drivers.filter(d => !d.telegram_id).length
  const avgOdo = trucks.length ? Math.round(trucks.reduce((s, t) => s + (t.odometer || 0), 0) / trucks.length) : 0
  const utilization = trucks.length ? Math.round(active / trucks.length * 100) : 0
  const currentYear = new Date().getFullYear()
  const avgAge = trucks.length ? (trucks.reduce((s, t) => s + (t.year ? currentYear - t.year : 0), 0) / trucks.length).toFixed(1) : '0.0'

  const tickerItems = [
    { t: 'FLEET',    body: `${trucks.length} TRUCKS · ${active} ACTIVE · ${shop} SHOP · AVG AGE ${avgAge}Y`, tone: 'amber' },
    { t: 'DRIVERS',  body: `${drivers.length} DRIVERS · ${drivers.length - noTg} TG-BOUND · ${noTg} UNBOUND`, tone: noTg > 0 ? 'amber' : '' },
    { t: 'CDL',      body: 'VERIFY EXPIRY DATES BEFORE DISPATCH' },
    { t: 'INSURANCE', body: 'PROGRESSIVE COMMERCIAL · POL #C-44821 · EXP 2026.12.31' },
  ]

  const inputStyle = { width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '7px 10px', fontFamily: 'var(--mono)', fontSize: 12, boxSizing: 'border-box' }
  const selectStyle = { ...inputStyle }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 89px)' }}>
      <Ticker items={tickerItems} />

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr) 320px', minHeight: 0, overflow: 'hidden' }}>

        {/* TRUCKS */}
        <div style={{ borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="panel-head" style={{ padding: '10px 16px' }}>
            <span>· TRUCK ROSTER · {trucks.length} UNITS</span>
            <span className="ph-r" style={{ cursor: 'pointer', color: 'var(--amber)' }} onClick={() => setShowTruckForm(true)}>+ ADD UNIT</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {trucks.length === 0 ? (
              <div style={{ padding: 24, color: 'var(--ink-mute)', fontSize: 11 }}>NO UNITS REGISTERED</div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Unit</th>
                    <th>Plate</th>
                    <th>Make / Model</th>
                    <th className="num">YR</th>
                    <th className="num">Odometer</th>
                    <th>Status</th>
                    <th>Driver</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {trucks.map(t => {
                    const [tone, label] = STATUS_MAP[t.status] || ['', t.status?.toUpperCase()]
                    return (
                      <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => setEditTruck(t)}>
                        <td>
                          <div className="t-display" style={{ fontSize: 14, color: 'var(--ink)' }}>{t.unit_number}</div>
                          {t.vin && <div className="t-tiny t-mute" style={{ marginTop: 2 }}>{t.vin}</div>}
                          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 48, height: 3, background: 'var(--line-strong)', borderRadius: 0 }}>
                              <div style={{ width: `${t.fuel_level ?? 100}%`, height: '100%', background: (t.fuel_level ?? 100) < 25 ? 'var(--red)' : (t.fuel_level ?? 100) < 50 ? 'var(--amber)' : 'var(--green)' }} />
                            </div>
                            <span className="t-tiny t-mute">{t.fuel_level ?? 100}%</span>
                          </div>
                        </td>
                        <td className="t-dim">{t.plate || '—'}</td>
                        <td>
                          <div>{t.make || '—'}</div>
                          {t.model && <div className="t-tiny t-mute">{t.model}</div>}
                        </td>
                        <td className="num">{t.year || '—'}</td>
                        <td className="num">
                          {t.odometer ? <span className="t-mono">{(t.odometer).toLocaleString()}<span className="t-tiny t-mute"> MI</span></span> : <span className="t-mute">—</span>}
                        </td>
                        <td><span className={`tag ${tone}`}>{label}</span></td>
                        <td className="t-dim">{t.driver || '—'}</td>
                        <td style={{ color: 'var(--ink-mute)', fontFamily: 'var(--mono)' }}>›</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
          <div style={{ borderTop: '1px solid var(--line)', padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, background: 'var(--bg-elev)', flexShrink: 0 }}>
            <div>
              <div className="t-tiny t-up t-mute" style={{ marginBottom: 6 }}>AVG ODO</div>
              <div className="t-num" style={{ fontSize: 22, color: 'var(--ink)', lineHeight: 1 }}>{avgOdo ? (avgOdo / 1000).toFixed(0) + 'K' : '—'}</div>
              <div className="t-tiny t-mute" style={{ marginTop: 3 }}>MI</div>
            </div>
            <div>
              <div className="t-tiny t-up t-mute" style={{ marginBottom: 6 }}>UTILIZATION</div>
              <div className="t-num" style={{ fontSize: 22, color: utilization >= 80 ? 'var(--green)' : utilization >= 50 ? 'var(--amber)' : 'var(--red)', lineHeight: 1 }}>{utilization}</div>
              <div className="t-tiny t-mute" style={{ marginTop: 3 }}>%</div>
            </div>
            <div>
              <div className="t-tiny t-up t-mute" style={{ marginBottom: 6 }}>AVG FLEET AGE</div>
              <div className="t-num" style={{ fontSize: 22, color: 'var(--ink)', lineHeight: 1 }}>{avgAge}</div>
              <div className="t-tiny t-mute" style={{ marginTop: 3 }}>YR</div>
            </div>
          </div>
        </div>

        {/* DRIVERS */}
        <div style={{ borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="panel-head" style={{ padding: '10px 16px' }}>
            <span>· DRIVER ROSTER · {drivers.length} ACTIVE</span>
            <span className="ph-r" style={{ cursor: 'pointer', color: 'var(--amber)' }} onClick={() => setShowDriverForm(true)}>+ ADD DRIVER</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {drivers.length === 0 && (
              <div style={{ padding: 16, color: 'var(--ink-mute)', fontSize: 11 }}>NO DRIVERS REGISTERED</div>
            )}
            {drivers.map((d, i) => {
              const initials = d.name?.split(' ').map(p => p[0]).slice(0,2).join('') || '??'
              const hasTg = !!d.telegram_id
              return (
                <div key={d.id} onClick={() => setEditDriver(d)} style={{
                  padding: '14px 16px', borderBottom: '1px solid var(--line)',
                  display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: 12, alignItems: 'center',
                  cursor: 'pointer',
                }}>
                  <div style={{
                    width: 36, height: 36, border: '1px solid var(--line-strong)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--amber)',
                    background: 'var(--bg-elev)', flexShrink: 0,
                  }}>
                    {initials}
                  </div>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                      <span style={{ color: 'var(--ink)', fontSize: 13 }}>{d.name}</span>
                      <span className="t-tiny t-mute">DRV·{String(d.id).padStart(3,'0')}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <span className="t-tiny t-dim">{d.phone || '—'}</span>
                      {d.telegram_id && <><span className="t-tiny t-mute">·</span><span className="t-tiny t-dim">TG·{d.telegram_id}</span></>}
                    </div>
                    {d.license_number && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
                        <span className="t-tiny t-mute">CDL</span>
                        <span className="t-tiny t-dim">{d.license_number}</span>
                        {d.license_expiry && (() => {
                          const exp = new Date(d.license_expiry)
                          const now = new Date()
                          const color = exp < now ? 'var(--red)' : exp < new Date(Date.now() + 90*24*60*60*1000) ? 'var(--amber)' : 'var(--ink-mute)'
                          return <span className="t-tiny" style={{ color }}>· EXP {d.license_expiry?.slice(0, 10)}</span>
                        })()}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="t-display" style={{ fontSize: 14, color: 'var(--amber)' }}>{truckMap[d.truck_id] || '—'}</div>
                    {!hasTg && <div className="tag red" style={{ marginTop: 4 }}>NO TG</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* COMPLIANCE / INFO */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="panel-head" style={{ padding: '10px 16px' }}>
            <span>· COMPLIANCE</span>
            <span className="ph-r">REMINDERS</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {[
              { d: 'DAILY',   task: 'PTI — MIN 4 PHOTOS',       unit: 'ALL DRIVERS', tone: 'amber' },
              { d: 'WEEKLY',  task: 'LOAD BOARD CHECK · DAT',    unit: 'DISPATCH',    tone: '' },
              { d: 'MONTHLY', task: 'IFTA MILEAGE LOG REVIEW',   unit: 'FLEET MGR',   tone: '' },
              { d: 'QUARTER', task: 'DOT INSPECTION VERIFY',     unit: 'ALL TRUCKS',  tone: 'amber' },
              { d: 'ANNUAL',  task: 'CDL RENEWAL CHECK',         unit: 'ALL DRIVERS', tone: '' },
              { d: 'ANNUAL',  task: 'INSURANCE POLICY REVIEW',   unit: 'OWNER',       tone: '' },
            ].map((c, i) => (
              <div key={i} style={{
                padding: '14px 16px', borderBottom: '1px solid var(--line)',
                display: 'grid', gridTemplateColumns: '64px 1fr', gap: 12, alignItems: 'center',
                borderLeft: c.tone === 'red' ? '2px solid var(--red)' : c.tone === 'amber' ? '2px solid var(--amber)' : '2px solid transparent',
              }}>
                <div>
                  <div className="t-display" style={{ fontSize: 11, color: c.tone === 'amber' ? 'var(--amber)' : c.tone === 'red' ? 'var(--red)' : 'var(--ink)' }}>{c.d}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink)' }}>{c.task}</div>
                  <div className="t-tiny t-mute" style={{ marginTop: 2 }}>{c.unit}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--line)', padding: 14, background: 'var(--bg-elev)', flexShrink: 0 }}>
            <div className="t-tiny t-up t-mute" style={{ marginBottom: 8 }}>INSURANCE · ACTIVE</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, fontSize: 11 }}>
              <span className="t-mute">Carrier</span>     <span className="t-dim">Progressive Commercial</span>
              <span className="t-mute">Policy</span>      <span className="t-dim">C-44821</span>
              <span className="t-mute">Premium / mo</span><span className="t-dim">$4,820</span>
              <span className="t-mute">Liability</span>   <span className="t-dim">$1,000,000</span>
              <span className="t-mute">Cargo</span>       <span className="t-dim">$300,000</span>
              <span className="t-mute">Expires</span>     <span style={{ color: 'var(--amber)', fontSize: 11, fontFamily: 'var(--mono)' }}>2026.12.31</span>
            </div>
          </div>
        </div>
      </div>

      {/* ADD TRUCK MODAL */}
      {showTruckForm && (
        <FormModal title="· NEW UNIT ENTRY" onClose={() => setShowTruckForm(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[['unit_number','Unit Number *'], ['plate','Plate *'], ['make','Make'], ['model','Model'], ['year','Year'], ['vin','VIN (opt)']].map(([key, label]) => (
              <div key={key}>
                <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>{label}</div>
                <input value={truckForm[key]} onChange={e => setTruckForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
          </div>
          <button onClick={() => createTruckMut.mutate({ ...truckForm, year: parseInt(truckForm.year) || null })}
            className="btn primary" style={{ marginTop: 20, width: '100%', justifyContent: 'center', padding: 10 }}>
            ▸ ADD TRUCK
          </button>
        </FormModal>
      )}

      {/* EDIT TRUCK MODAL */}
      {editTruck && (
        <FormModal title={`· EDIT ${editTruck.unit_number}`} onClose={() => setEditTruck(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[['plate','Plate'], ['make','Make'], ['model','Model'], ['vin','VIN']].map(([key, label]) => (
              <div key={key}>
                <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>{label}</div>
                <input value={editTruck[key] || ''} onChange={e => setEditTruck(t => ({ ...t, [key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
            <div>
              <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>Status</div>
              <select value={editTruck.status} onChange={e => setEditTruck(t => ({ ...t, status: e.target.value }))} style={selectStyle}>
                <option value="active">ACTIVE</option>
                <option value="maintenance">SHOP</option>
                <option value="inactive">IDLE</option>
              </select>
            </div>
            <div>
              <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>Fuel Level %</div>
              <input type="number" min="0" max="100" value={editTruck.fuel_level ?? 100} onChange={e => setEditTruck(t => ({ ...t, fuel_level: parseInt(e.target.value) || 0 }))} style={inputStyle} />
            </div>
            <div>
              <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>Odometer (MI)</div>
              <input type="number" min="0" value={editTruck.odometer ?? 0} onChange={e => setEditTruck(t => ({ ...t, odometer: parseInt(e.target.value) || 0 }))} style={inputStyle} />
            </div>
          </div>
          <button onClick={() => updateTruckMut.mutate({ id: editTruck.id, data: { plate: editTruck.plate, make: editTruck.make, model: editTruck.model, vin: editTruck.vin, status: editTruck.status, fuel_level: editTruck.fuel_level, odometer: editTruck.odometer } })}
            className="btn primary" style={{ marginTop: 20, width: '100%', justifyContent: 'center', padding: 10 }}>
            ▸ SAVE CHANGES
          </button>
        </FormModal>
      )}

      {/* ADD DRIVER MODAL */}
      {showDriverForm && (
        <FormModal title="· NEW DRIVER ENTRY" onClose={() => setShowDriverForm(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[['name','Full Name *'], ['phone','Phone'], ['telegram_id','Telegram ID (numeric)'], ['license_number','CDL License #']].map(([key, label]) => (
              <div key={key}>
                <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>{label}</div>
                <input value={driverForm[key]} onChange={e => setDriverForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>Assign Truck</div>
              <select value={driverForm.truck_id} onChange={e => setDriverForm(f => ({ ...f, truck_id: e.target.value }))} style={selectStyle}>
                <option value="">— UNASSIGNED —</option>
                {trucks.map(t => <option key={t.id} value={t.id}>{t.unit_number}</option>)}
              </select>
            </div>
          </div>
          <button onClick={() => createDriverMut.mutate({ ...driverForm, truck_id: driverForm.truck_id ? parseInt(driverForm.truck_id) : null })}
            className="btn primary" style={{ marginTop: 20, width: '100%', justifyContent: 'center', padding: 10 }}>
            ▸ ADD DRIVER
          </button>
        </FormModal>
      )}

      {/* EDIT DRIVER MODAL */}
      {editDriver && (
        <FormModal title={`· EDIT ${editDriver.name}`} onClose={() => setEditDriver(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[['name','Full Name'], ['phone','Phone'], ['telegram_id','Telegram ID'], ['license_number','CDL License #']].map(([key, label]) => (
              <div key={key}>
                <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>{label}</div>
                <input value={editDriver[key] || ''} onChange={e => setEditDriver(d => ({ ...d, [key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>Assign Truck</div>
              <select value={editDriver.truck_id || ''} onChange={e => setEditDriver(d => ({ ...d, truck_id: e.target.value }))} style={selectStyle}>
                <option value="">— UNASSIGNED —</option>
                {trucks.map(t => <option key={t.id} value={t.id}>{t.unit_number}</option>)}
              </select>
            </div>
          </div>
          <button onClick={() => updateDriverMut.mutate({ id: editDriver.id, data: { name: editDriver.name, phone: editDriver.phone, telegram_id: editDriver.telegram_id, license_number: editDriver.license_number, truck_id: editDriver.truck_id ? parseInt(editDriver.truck_id) : null } })}
            className="btn primary" style={{ marginTop: 20, width: '100%', justifyContent: 'center', padding: 10 }}>
            ▸ SAVE CHANGES
          </button>
        </FormModal>
      )}
    </div>
  )
}

function FormModal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000000bb', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line-strong)', padding: 24, width: 520 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
          <span className="t-tiny t-up t-dim">{title}</span>
          <button onClick={onClose} className="btn" style={{ padding: '3px 8px' }}>✕ CLOSE</button>
        </div>
        {children}
      </div>
    </div>
  )
}
