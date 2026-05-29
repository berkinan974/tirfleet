import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getSafetyClaims, createSafetyClaim, updateSafetyClaim, deleteSafetyClaim, getTrucks, getDrivers, getTrailers } from '../api'

const today = new Date().toISOString().slice(0, 10)

const CLAIM_TYPES    = ['Accident', 'Cargo', 'Liability', 'Workers Comp', 'Other']
const CLAIM_STATUSES = ['Open', 'In Progress', 'Closed']

const STATUS_COLOR = { 'Open': 'var(--red)', 'In Progress': 'var(--amber)', 'Closed': 'var(--green)' }

const EMPTY = { date: today, driver_id: '', truck_id: '', trailer_id: '', claim_type: 'Accident', status: 'Open', amount: '', short_description: '', full_description: '' }

const inp = { width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '7px 10px', fontFamily: 'var(--mono)', fontSize: 12, boxSizing: 'border-box' }
const sel = { ...inp }

export default function Safety() {
  const qc = useQueryClient()
  const [panel, setPanel] = useState(null)
  const [form, setForm] = useState(EMPTY)

  const { data: claimsData = {} } = useQuery({ queryKey: ['safety-claims'], queryFn: getSafetyClaims })
  const { data: trucks = [] }     = useQuery({ queryKey: ['trucks'], queryFn: getTrucks })
  const { data: drivers = [] }    = useQuery({ queryKey: ['drivers'], queryFn: getDrivers })
  const { data: trailers = [] }   = useQuery({ queryKey: ['trailers'], queryFn: getTrailers })

  const rows       = claimsData.rows || []
  const totalOpen  = claimsData.total_open || 0
  const totalClosed = claimsData.total_closed || 0

  const createMut = useMutation({ mutationFn: createSafetyClaim, onSuccess: () => { qc.invalidateQueries(['safety-claims']); setPanel(null) } })
  const updateMut = useMutation({ mutationFn: ({ id, data }) => updateSafetyClaim(id, data), onSuccess: () => { qc.invalidateQueries(['safety-claims']); setPanel(null) } })
  const deleteMut = useMutation({ mutationFn: deleteSafetyClaim, onSuccess: () => { qc.invalidateQueries(['safety-claims']); setPanel(null) } })

  const openNew  = () => { setForm(EMPTY); setPanel('new') }
  const openEdit = (c) => { setForm({ ...c, driver_id: c.driver_id || '', truck_id: c.truck_id || '', trailer_id: c.trailer_id || '', amount: c.amount ?? '' }); setPanel(c) }

  const save = () => {
    const p = {
      ...form,
      driver_id:  form.driver_id  ? parseInt(form.driver_id)  : null,
      truck_id:   form.truck_id   ? parseInt(form.truck_id)   : null,
      trailer_id: form.trailer_id ? parseInt(form.trailer_id) : null,
      amount: parseFloat(form.amount) || 0,
    }
    panel === 'new' ? createMut.mutate(p) : updateMut.mutate({ id: panel.id, data: p })
  }

  const openCount  = rows.filter(r => r.status === 'Open').length
  const inProgCount = rows.filter(r => r.status === 'In Progress').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 89px)', position: 'relative' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid var(--line)', background: 'var(--bg-elev)', flexShrink: 0 }}>
        <span className="t-tiny t-up" style={{ color: 'var(--amber)', letterSpacing: '0.12em' }}>· SAFETY · CLAIMS</span>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Stat label="OPEN"        value={openCount}    color="var(--red)" />
          <Stat label="IN PROGRESS" value={inProgCount}  color="var(--amber)" />
          <Stat label="TOTAL CLAIMS" value={rows.length} />
          <Stat label="OPEN AMT"   value={`$${totalOpen.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="var(--red)" />
          <Stat label="CLOSED AMT" value={`$${totalClosed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="var(--green)" />
          <button className="btn primary" style={{ padding: '6px 14px', fontSize: 11 }} onClick={openNew}>+ NEW CLAIM</button>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {rows.length === 0
          ? <div style={{ padding: 32, color: 'var(--ink-mute)', fontSize: 11, fontFamily: 'var(--mono)' }}>NO CLAIMS RECORDED</div>
          : (
            <table className="tbl">
              <thead><tr>
                <th>NUMBER</th><th>DATE</th><th>DRIVER</th><th>TRUCK</th><th>TRAILER</th>
                <th className="num">AMOUNT</th><th>TYPE</th><th>STATUS</th><th>DESCRIPTION</th><th></th>
              </tr></thead>
              <tbody>
                {rows.map(c => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(c)}>
                    <td style={{ color: 'var(--amber)', fontFamily: 'var(--mono)', fontSize: 12 }}>{c.number}</td>
                    <td style={{ fontSize: 11 }}>{c.date}</td>
                    <td style={{ fontSize: 11 }}>{c.driver_name || '—'}</td>
                    <td style={{ fontSize: 11 }}>{c.truck_unit || '—'}</td>
                    <td style={{ fontSize: 11 }}>{c.trailer_unit || '—'}</td>
                    <td className="num" style={{ color: 'var(--amber)' }}>{c.amount != null ? `$${Number(c.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td>
                    <td style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-dim)' }}>{c.claim_type}</td>
                    <td><span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: STATUS_COLOR[c.status] || 'var(--ink)' }}>{c.status?.toUpperCase()}</span></td>
                    <td style={{ fontSize: 10, color: 'var(--ink-mute)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.short_description || '—'}</td>
                    <td style={{ color: 'var(--ink-mute)', fontFamily: 'var(--mono)' }}>›</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>

      {/* PANEL */}
      {panel && (
        <div style={{ position: 'fixed', inset: 0, background: '#00000077', zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 660, background: 'var(--panel)', borderLeft: '1px solid var(--line-strong)', display: 'flex', flexDirection: 'column', height: '100%' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
              <span className="t-tiny t-up t-dim">{panel === 'new' ? '· NEW CLAIM' : `· ${panel.number}`}</span>
              <button onClick={() => setPanel(null)} className="btn" style={{ padding: '3px 8px' }}>✕ CLOSE</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

                <div>
                  <L>Status *</L>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={sel}>
                    {CLAIM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <L>Date *</L>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inp} />
                </div>

                <div>
                  <L>Type *</L>
                  <select value={form.claim_type} onChange={e => setForm(f => ({ ...f, claim_type: e.target.value }))} style={sel}>
                    {CLAIM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <L>Amount ($) *</L>
                  <input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={inp} placeholder="0" />
                </div>

                <div>
                  <L>Driver</L>
                  <select value={form.driver_id || ''} onChange={e => setForm(f => ({ ...f, driver_id: e.target.value }))} style={sel}>
                    <option value="">— Select Driver —</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <L>Truck</L>
                  <select value={form.truck_id || ''} onChange={e => setForm(f => ({ ...f, truck_id: e.target.value }))} style={sel}>
                    <option value="">— Select Truck —</option>
                    {trucks.map(t => <option key={t.id} value={t.id}>{t.unit_number}</option>)}
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <L>Trailer</L>
                  <select value={form.trailer_id || ''} onChange={e => setForm(f => ({ ...f, trailer_id: e.target.value }))} style={sel}>
                    <option value="">— Select Trailer —</option>
                    {trailers.map(t => <option key={t.id} value={t.id}>{t.unit_number}</option>)}
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <L>Short Description</L>
                  <input value={form.short_description || ''} onChange={e => setForm(f => ({ ...f, short_description: e.target.value }))} style={inp} />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <L>Full Description</L>
                  <textarea value={form.full_description || ''} onChange={e => setForm(f => ({ ...f, full_description: e.target.value }))} style={{ ...inp, height: 120, resize: 'vertical' }} />
                </div>
              </div>
            </div>

            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, flexShrink: 0 }}>
              <button onClick={save} disabled={!form.date} className="btn primary" style={{ flex: 1, justifyContent: 'center', padding: 10 }}>
                {panel === 'new' ? '+ CREATE CLAIM' : '▸ SAVE CHANGES'}
              </button>
              {panel !== 'new' && (
                <button onClick={() => deleteMut.mutate(panel.id)} className="btn" style={{ padding: '10px 14px', color: 'var(--red)', border: '1px solid var(--red)' }}>DELETE</button>
              )}
              <button onClick={() => setPanel(null)} className="btn" style={{ padding: '10px 14px' }}>CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 15, color: color || 'var(--ink)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--ink-mute)', fontFamily: 'var(--mono)', marginTop: 2, letterSpacing: '0.08em' }}>{label}</div>
    </div>
  )
}
function L({ children }) { return <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>{children}</div> }
