import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTrucks, getDrivers, createTruck, createDriver, updateTruck, updateDriver, getMaintenance, createMaintenance, deleteMaintenance } from '../api'
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
  const [driverTab, setDriverTab] = useState('general')
  const EMPTY_DRIVER = { name: '', first_name: '', last_name: '', phone: '', email: '', date_of_birth: '', address: '', address2: '', city: '', state: '', zip: '', telegram_id: '', license_number: '', license_expiry: '', truck_id: '', trailer: '', fuel_card: '', driver_status: 'hired', driver_type: 'company', application_date: '', hire_date: '', termination_date: '', pay_type: 'per_mile', pay_rate: '', pay_extra_stop: '', pay_empty_mile: '' }
  const [driverForm, setDriverForm] = useState(EMPTY_DRIVER)
  const [maintForm, setMaintForm] = useState({ truck_id: '', date: '', type: 'oil_change', description: '', cost: '', mileage: '', vendor: '' })
  const [showMaintForm, setShowMaintForm] = useState(false)

  const { data: trucks = [] } = useQuery({ queryKey: ['trucks'], queryFn: getTrucks })
  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: getDrivers })
  const { data: maintenance = [] } = useQuery({ queryKey: ['maintenance'], queryFn: () => getMaintenance() })

  const createTruckMut = useMutation({ mutationFn: createTruck, onSuccess: () => { qc.invalidateQueries(['trucks']); setShowTruckForm(false); setTruckForm({ unit_number: '', plate: '', make: '', model: '', year: '2020', vin: '', odometer: '' }) } })
  const createDriverMut = useMutation({ mutationFn: createDriver, onSuccess: () => { qc.invalidateQueries(['drivers']); setShowDriverForm(false); setDriverForm(EMPTY_DRIVER) } })
  const updateTruckMut = useMutation({ mutationFn: ({ id, data }) => updateTruck(id, data), onSuccess: () => { qc.invalidateQueries(['trucks']); setEditTruck(null) } })
  const updateDriverMut = useMutation({ mutationFn: ({ id, data }) => updateDriver(id, data), onSuccess: () => { qc.invalidateQueries(['drivers']); setEditDriver(null) } })
  const createMaintMut = useMutation({ mutationFn: createMaintenance, onSuccess: () => { qc.invalidateQueries(['maintenance']); setShowMaintForm(false); setMaintForm({ truck_id: '', date: '', type: 'oil_change', description: '', cost: '', mileage: '', vendor: '' }) } })
  const deleteMaintMut = useMutation({ mutationFn: deleteMaintenance, onSuccess: () => qc.invalidateQueries(['maintenance']) })

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
            <span className="ph-r" style={{ cursor: 'pointer', color: 'var(--amber)' }} onClick={() => { setDriverTab('general'); setShowDriverForm(true) }}>+ ADD DRIVER</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {drivers.length === 0 ? (
              <div style={{ padding: 16, color: 'var(--ink-mute)', fontSize: 11 }}>NO DRIVERS REGISTERED</div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>NAME</th>
                    <th>TYPE</th>
                    <th>STATUS</th>
                    <th>HIRE DATE</th>
                    <th>PHONE</th>
                    <th>EMAIL</th>
                    <th>TRUCK</th>
                    <th>CDL EXP</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map(d => {
                    const statusColor = d.driver_status === 'hired' ? 'var(--green)' : d.driver_status === 'terminated' ? 'var(--red)' : 'var(--amber)'
                    const hireDate = d.hire_date ? new Date(d.hire_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'
                    const cdlExp = d.license_expiry ? (() => {
                      const exp = new Date(d.license_expiry)
                      const color = exp < new Date() ? 'var(--red)' : exp < new Date(Date.now() + 90*24*60*60*1000) ? 'var(--amber)' : 'var(--ink-dim)'
                      return <span style={{ color, fontSize: 10 }}>{d.license_expiry.slice(0,10)}</span>
                    })() : <span className="t-mute">—</span>
                    return (
                      <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => setEditDriver(d)}>
                        <td>
                          <div style={{ fontSize: 11 }}>{d.name}</div>
                          <div className="t-tiny t-mute">DRV·{String(d.id).padStart(3,'0')}</div>
                        </td>
                        <td><span className="tag" style={{ fontSize: 9 }}>{d.driver_type === 'owner_operator' ? 'O/O' : 'DRV'}</span></td>
                        <td><span style={{ fontSize: 10, color: statusColor, fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>{d.driver_status || 'hired'}</span></td>
                        <td style={{ fontSize: 10, color: 'var(--ink-dim)' }}>{hireDate}</td>
                        <td style={{ fontSize: 10, color: 'var(--ink-dim)' }}>{d.phone || '—'}</td>
                        <td style={{ fontSize: 10, color: 'var(--ink-dim)' }}>{d.email || '—'}</td>
                        <td><span className="t-display" style={{ fontSize: 12, color: 'var(--amber)' }}>{truckMap[d.truck_id] || '—'}</span></td>
                        <td>{cdlExp}</td>
                        <td style={{ color: 'var(--ink-mute)', fontFamily: 'var(--mono)' }}>›</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* MAINTENANCE LOG */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="panel-head" style={{ padding: '10px 16px' }}>
            <span>· MAINTENANCE LOG · {maintenance.length} RECORDS</span>
            <span className="ph-r" style={{ cursor: 'pointer', color: 'var(--amber)' }} onClick={() => setShowMaintForm(true)}>+ LOG SERVICE</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {maintenance.length === 0 ? (
              <div style={{ padding: 16, color: 'var(--ink-mute)', fontSize: 11 }}>NO SERVICE RECORDS</div>
            ) : maintenance.map((m, i) => {
              const truckUnit = trucks.find(t => t.id === m.truck_id)?.unit_number || `#${m.truck_id}`
              const statusColor = m.status === 'completed' ? 'var(--green)' : m.status === 'in_progress' ? 'var(--amber)' : 'var(--ink-mute)'
              const typeLabel = { oil_change: 'OIL', tire: 'TIRE', brake: 'BRAKE', inspection: 'INSP', other: 'OTHER' }[m.type] || m.type.toUpperCase()
              return (
                <div key={m.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'grid', gridTemplateColumns: '44px 1fr auto', gap: 10, alignItems: 'start' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div className="tag" style={{ fontSize: 9, padding: '2px 4px' }}>{typeLabel}</div>
                    <div className="t-display" style={{ fontSize: 13, color: 'var(--amber)', marginTop: 4 }}>{truckUnit}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--ink)' }}>{m.description || typeLabel}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                      <span className="t-tiny t-mute">{m.date}</span>
                      {m.vendor && <span className="t-tiny t-dim">{m.vendor}</span>}
                      {m.mileage && <span className="t-tiny t-mute">{m.mileage.toLocaleString()} MI</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {m.cost ? <div style={{ fontSize: 11, color: 'var(--green)' }}>${m.cost.toLocaleString()}</div> : null}
                    <div className="t-tiny" style={{ color: statusColor, marginTop: 2 }}>{m.status?.toUpperCase()}</div>
                    <span onClick={() => deleteMaintMut.mutate(m.id)} style={{ fontSize: 9, color: 'var(--ink-mute)', cursor: 'pointer', marginTop: 4, display: 'block' }}>✕</span>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ borderTop: '1px solid var(--line)', padding: 14, background: 'var(--bg-elev)', flexShrink: 0 }}>
            <div className="t-tiny t-up t-mute" style={{ marginBottom: 6 }}>INSURANCE · ACTIVE</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 11 }}>
              <span className="t-mute">Carrier</span>     <span className="t-dim">Progressive Commercial</span>
              <span className="t-mute">Policy</span>      <span className="t-dim">C-44821</span>
              <span className="t-mute">Expires</span>     <span style={{ color: 'var(--amber)', fontFamily: 'var(--mono)' }}>2026.12.31</span>
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
        <DriverFormModal
          title="· NEW DRIVER"
          form={driverForm}
          setForm={setDriverForm}
          tab={driverTab}
          setTab={setDriverTab}
          trucks={trucks}
          onClose={() => { setShowDriverForm(false); setDriverForm(EMPTY_DRIVER) }}
          onSave={() => createDriverMut.mutate({
            ...driverForm,
            truck_id: driverForm.truck_id ? parseInt(driverForm.truck_id) : null,
            pay_rate: parseFloat(driverForm.pay_rate) || null,
            pay_extra_stop: parseFloat(driverForm.pay_extra_stop) || null,
            pay_empty_mile: parseFloat(driverForm.pay_empty_mile) || null,
            hire_date: driverForm.hire_date || null,
            application_date: driverForm.application_date || null,
            license_expiry: driverForm.license_expiry || null,
          })}
          saving={createDriverMut.isPending}
          inputStyle={inputStyle}
          selectStyle={selectStyle}
        />
      )}

      {/* EDIT DRIVER MODAL */}
      {editDriver && (
        <DriverFormModal
          title={`· EDIT ${editDriver.name}`}
          form={editDriver}
          setForm={setEditDriver}
          tab={driverTab}
          setTab={setDriverTab}
          trucks={trucks}
          onClose={() => setEditDriver(null)}
          onSave={() => updateDriverMut.mutate({
            id: editDriver.id,
            data: {
              name: editDriver.name, first_name: editDriver.first_name, last_name: editDriver.last_name,
              phone: editDriver.phone, email: editDriver.email,
              address: editDriver.address, city: editDriver.city, state: editDriver.state, zip: editDriver.zip,
              telegram_id: editDriver.telegram_id, license_number: editDriver.license_number,
              license_expiry: editDriver.license_expiry || null,
              truck_id: editDriver.truck_id ? parseInt(editDriver.truck_id) : null,
              trailer: editDriver.trailer, fuel_card: editDriver.fuel_card,
              driver_status: editDriver.driver_status, driver_type: editDriver.driver_type,
              hire_date: editDriver.hire_date || null, application_date: editDriver.application_date || null,
              termination_date: editDriver.termination_date || null,
              pay_type: editDriver.pay_type,
              pay_rate: parseFloat(editDriver.pay_rate) || null,
              pay_extra_stop: parseFloat(editDriver.pay_extra_stop) || null,
              pay_empty_mile: parseFloat(editDriver.pay_empty_mile) || null,
            }
          })}
          saving={updateDriverMut.isPending}
          inputStyle={inputStyle}
          selectStyle={selectStyle}
        />
      )}

      {/* MAINTENANCE FORM MODAL */}
      {showMaintForm && (
        <FormModal title="· LOG SERVICE ENTRY" onClose={() => setShowMaintForm(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>Truck *</div>
              <select value={maintForm.truck_id} onChange={e => setMaintForm(f => ({ ...f, truck_id: e.target.value }))} style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '7px 10px', fontFamily: 'var(--mono)', fontSize: 12, boxSizing: 'border-box' }}>
                <option value="">— SELECT TRUCK —</option>
                {trucks.map(t => <option key={t.id} value={t.id}>{t.unit_number}</option>)}
              </select>
            </div>
            <div>
              <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>Type *</div>
              <select value={maintForm.type} onChange={e => setMaintForm(f => ({ ...f, type: e.target.value }))} style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '7px 10px', fontFamily: 'var(--mono)', fontSize: 12, boxSizing: 'border-box' }}>
                <option value="oil_change">OIL CHANGE</option>
                <option value="tire">TIRE</option>
                <option value="brake">BRAKE</option>
                <option value="inspection">INSPECTION</option>
                <option value="other">OTHER</option>
              </select>
            </div>
            <div>
              <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>Date *</div>
              <input type="date" value={maintForm.date} onChange={e => setMaintForm(f => ({ ...f, date: e.target.value }))} style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '7px 10px', fontFamily: 'var(--mono)', fontSize: 12, boxSizing: 'border-box' }} />
            </div>
            {[['description','Description'], ['vendor','Vendor / Shop'], ['cost','Cost ($)'], ['mileage','Mileage (MI)']].map(([key, label]) => (
              <div key={key}>
                <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>{label}</div>
                <input value={maintForm[key]} onChange={e => setMaintForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '7px 10px', fontFamily: 'var(--mono)', fontSize: 12, boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>
          <button onClick={() => createMaintMut.mutate({ ...maintForm, truck_id: parseInt(maintForm.truck_id), cost: parseFloat(maintForm.cost) || null, mileage: parseInt(maintForm.mileage) || null })}
            className="btn primary" style={{ marginTop: 20, width: '100%', justifyContent: 'center', padding: 10 }}>
            ▸ SAVE SERVICE RECORD
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

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

function DriverFormModal({ title, form, setForm, tab, setTab, trucks, onClose, onSave, saving, inputStyle, selectStyle }) {
  const F = (key, label, type = 'text') => (
    <div key={key}>
      <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>{label}</div>
      <input type={type} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
    </div>
  )
  const tabs = ['general', 'address', 'employment', 'pay']
  const tabLabel = { general: 'General', address: 'Address', employment: 'Employment', pay: 'Pay Rates' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000000bb', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line-strong)', padding: 24, width: 680, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
          <span className="t-tiny t-up t-dim">{title}</span>
          <button onClick={onClose} className="btn" style={{ padding: '3px 8px' }}>✕ CLOSE</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid var(--line)' }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '7px 16px', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--amber)' : '2px solid transparent', color: tab === t ? 'var(--amber)' : 'var(--ink-mute)', fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer', marginBottom: -1 }}>
              {tabLabel[t]}
            </button>
          ))}
        </div>

        {/* General */}
        {tab === 'general' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {F('first_name', 'First Name')}
            {F('last_name', 'Last Name')}
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>Full Name *</div>
              <input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="Full name" />
            </div>
            {F('phone', 'Phone', 'tel')}
            {F('email', 'Email', 'email')}
            {F('date_of_birth', 'Date of Birth', 'date')}
            {F('telegram_id', 'Telegram ID')}
            {F('license_number', 'CDL License #')}
            {F('license_expiry', 'CDL Expiry', 'date')}
          </div>
        )}

        {/* Address */}
        {tab === 'address' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>{F('address', 'Address')}</div>
            <div style={{ gridColumn: '1 / -1' }}>{F('address2', 'Address Line 2')}</div>
            {F('city', 'City')}
            <div>
              <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>State</div>
              <select value={form.state || ''} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} style={selectStyle}>
                <option value="">—</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {F('zip', 'ZIP')}
          </div>
        )}

        {/* Employment */}
        {tab === 'employment' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>Status</div>
              <select value={form.driver_status || 'hired'} onChange={e => setForm(f => ({ ...f, driver_status: e.target.value }))} style={selectStyle}>
                <option value="applicant">Applicant</option>
                <option value="hired">Hired</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
            <div>
              <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>Driver Type</div>
              <select value={form.driver_type || 'company'} onChange={e => setForm(f => ({ ...f, driver_type: e.target.value }))} style={selectStyle}>
                <option value="company">Company Driver</option>
                <option value="owner_operator">Owner Operator</option>
              </select>
            </div>
            {F('application_date', 'Application Date', 'date')}
            {F('hire_date', 'Hire Date', 'date')}
            {F('termination_date', 'Term Date', 'date')}
            <div>
              <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>Assign Truck</div>
              <select value={form.truck_id || ''} onChange={e => setForm(f => ({ ...f, truck_id: e.target.value }))} style={selectStyle}>
                <option value="">— Unassigned —</option>
                {trucks.map(t => <option key={t.id} value={t.id}>{t.unit_number}</option>)}
              </select>
            </div>
            {F('trailer', 'Trailer #')}
            {F('fuel_card', 'Fuel Card #')}
          </div>
        )}

        {/* Pay Rates */}
        {tab === 'pay' && (
          <div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              {[['company','Company Driver'], ['owner_operator','Owner Operator']].map(([val, label]) => (
                <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: form.driver_type === val ? 'var(--amber)' : 'var(--ink-mute)' }}>
                  <input type="radio" checked={form.driver_type === val} onChange={() => setForm(f => ({ ...f, driver_type: val }))} />
                  {label}
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              {[['per_mile','Per Mile'], ['freight_percentage','Freight %'], ['flatpay','Flatpay'], ['hourly','Hourly']].map(([val, label]) => (
                <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: form.pay_type === val ? 'var(--amber)' : 'var(--ink-mute)' }}>
                  <input type="radio" checked={form.pay_type === val} onChange={() => setForm(f => ({ ...f, pay_type: val }))} />
                  {label}
                </label>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>
                  {form.pay_type === 'per_mile' ? 'Per Mile ($)' : form.pay_type === 'freight_percentage' ? 'Freight % (0-100)' : form.pay_type === 'flatpay' ? 'Flat Pay ($)' : 'Hourly Rate ($)'}
                </div>
                <input type="number" value={form.pay_rate || ''} onChange={e => setForm(f => ({ ...f, pay_rate: e.target.value }))} style={inputStyle} placeholder="0.00" />
              </div>
              <div>
                <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>Per Extra Stop ($)</div>
                <input type="number" value={form.pay_extra_stop || ''} onChange={e => setForm(f => ({ ...f, pay_extra_stop: e.target.value }))} style={inputStyle} placeholder="0.00" />
              </div>
              <div>
                <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>Per Empty Mile ($)</div>
                <input type="number" value={form.pay_empty_mile || ''} onChange={e => setForm(f => ({ ...f, pay_empty_mile: e.target.value }))} style={inputStyle} placeholder="0.00" />
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onSave} disabled={saving || !form.name}
            className="btn primary" style={{ flex: 1, justifyContent: 'center', padding: 10 }}>
            {saving ? 'Saving...' : '+ Save Driver'}
          </button>
          <button onClick={onClose} className="btn" style={{ padding: '10px 18px' }}>Close</button>
        </div>
      </div>
    </div>
  )
}
