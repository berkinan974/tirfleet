import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getSettlements, createSettlement, updateSettlement, deleteSettlement, getOpenBalance, getDrivers } from '../api'

const today = new Date().toISOString().slice(0, 10)
const EMPTY = { driver_id: '', payable_to: '', date: today, date_from: '', date_to: '', settlement_total: '', balance_due: '', status: 'draft', notes: '' }

const STATUS_COLOR = { draft: 'var(--ink-mute)', approved: 'var(--amber)', paid: 'var(--green)' }

const inp = { width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '7px 10px', fontFamily: 'var(--mono)', fontSize: 12, boxSizing: 'border-box' }
const sel = { ...inp }

export default function Payroll() {
  const qc = useQueryClient()
  const [panel, setPanel] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [byDate, setByDate] = useState('pickup')
  const [balanceFetched, setBalanceFetched] = useState(false)

  const { data: settlements = [] } = useQuery({ queryKey: ['settlements'], queryFn: getSettlements })
  const { data: drivers = [] }     = useQuery({ queryKey: ['drivers'], queryFn: getDrivers })
  const { data: balance = [], refetch: fetchBalance, isFetching: balLoading } = useQuery({
    queryKey: ['open-balance', dateFrom, dateTo, byDate],
    queryFn: () => getOpenBalance({ date_from: dateFrom || undefined, date_to: dateTo || undefined, by: byDate }),
    enabled: false,
  })

  const createMut = useMutation({ mutationFn: createSettlement, onSuccess: () => { qc.invalidateQueries(['settlements']); setPanel(null) } })
  const updateMut = useMutation({ mutationFn: ({ id, data }) => updateSettlement(id, data), onSuccess: () => { qc.invalidateQueries(['settlements']); setPanel(null) } })
  const deleteMut = useMutation({ mutationFn: deleteSettlement, onSuccess: () => { qc.invalidateQueries(['settlements']); setPanel(null) } })

  const openNew = () => { setForm(EMPTY); setBalanceFetched(false); setPanel('new') }
  const openEdit = (s) => { setForm({ ...s, driver_id: s.driver_id || '', settlement_total: s.settlement_total || '', balance_due: s.balance_due || '' }); setPanel(s) }

  const applyBalance = () => { fetchBalance(); setBalanceFetched(true) }

  const fillFromBalance = (row) => {
    setForm(f => ({ ...f, driver_id: String(row.driver_id), payable_to: row.driver_name, settlement_total: row.earned.toFixed(2), balance_due: row.balance.toFixed(2) }))
  }

  const save = () => {
    const p = { ...form, driver_id: form.driver_id ? parseInt(form.driver_id) : null, settlement_total: parseFloat(form.settlement_total) || 0, balance_due: parseFloat(form.balance_due) || 0 }
    panel === 'new' ? createMut.mutate(p) : updateMut.mutate({ id: panel.id, data: p })
  }

  const totalPaid    = settlements.filter(s => s.status === 'paid').reduce((a, s) => a + (s.settlement_total || 0), 0)
  const totalPending = settlements.filter(s => s.status !== 'paid').reduce((a, s) => a + (s.balance_due || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 89px)', position: 'relative' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid var(--line)', background: 'var(--bg-elev)', flexShrink: 0 }}>
        <span className="t-tiny t-up" style={{ color: 'var(--amber)', letterSpacing: '0.12em' }}>· DRIVER PAYROLL · SETTLEMENTS</span>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Stat label="TOTAL PAID"    value={`$${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="var(--green)" />
          <Stat label="BALANCE DUE"   value={`$${totalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="var(--amber)" />
          <Stat label="SETTLEMENTS"   value={settlements.length} />
          <button className="btn primary" style={{ padding: '6px 14px', fontSize: 11 }} onClick={openNew}>+ NEW SETTLEMENT</button>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {settlements.length === 0 ? (
          <div style={{ padding: 32, color: 'var(--ink-mute)', fontSize: 11, fontFamily: 'var(--mono)' }}>NO SETTLEMENTS RECORDED</div>
        ) : (
          <table className="tbl">
            <thead><tr>
              <th>NUMBER</th><th>DATE</th><th>PAYABLE TO</th><th>DRIVER</th>
              <th className="num">SETTLEMENT TOTAL</th><th className="num">BALANCE DUE</th>
              <th>STATUS</th><th>NOTES</th><th></th>
            </tr></thead>
            <tbody>
              {settlements.map(s => (
                <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(s)}>
                  <td><span className="t-display" style={{ color: 'var(--amber)', fontSize: 12 }}>{s.number}</span></td>
                  <td style={{ fontSize: 11 }}>{s.date}</td>
                  <td style={{ fontSize: 11 }}>{s.payable_to || '—'}</td>
                  <td style={{ fontSize: 11 }}>{s.driver_name || '—'}</td>
                  <td className="num" style={{ color: 'var(--green)' }}>{s.settlement_total != null ? `$${Number(s.settlement_total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td>
                  <td className="num" style={{ color: 'var(--amber)' }}>{s.balance_due != null ? `$${Number(s.balance_due).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td>
                  <td><span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: STATUS_COLOR[s.status] || 'var(--ink)' }}>{s.status?.toUpperCase()}</span></td>
                  <td style={{ fontSize: 10, color: 'var(--ink-mute)' }}>{s.notes || '—'}</td>
                  <td style={{ color: 'var(--ink-mute)', fontFamily: 'var(--mono)' }}>›</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* SLIDE PANEL */}
      {panel && (
        <div style={{ position: 'fixed', inset: 0, background: '#00000077', zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 720, background: 'var(--panel)', borderLeft: '1px solid var(--line-strong)', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
              <span className="t-tiny t-up t-dim">{panel === 'new' ? '· NEW SETTLEMENT' : `· ${panel.number}`}</span>
              <button onClick={() => setPanel(null)} className="btn" style={{ padding: '3px 8px' }}>✕ CLOSE</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

              {/* Top fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <L>Driver</L>
                  <select value={form.driver_id || ''} onChange={e => {
                    const drv = drivers.find(d => String(d.id) === e.target.value)
                    setForm(f => ({ ...f, driver_id: e.target.value, payable_to: drv?.name || f.payable_to }))
                  }} style={sel}>
                    <option value="">— Select Driver —</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <L>Payable To *</L>
                  <input value={form.payable_to || ''} onChange={e => setForm(f => ({ ...f, payable_to: e.target.value }))} style={inp} />
                </div>
              </div>

              {/* Open Balance calculator */}
              <div style={{ border: '1px solid var(--line)', padding: 14, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span className="t-tiny t-up" style={{ color: 'var(--amber)' }}>OPEN BALANCE</span>
                  <div style={{ display: 'flex', gap: 16 }}>
                    {[['pickup','by Pickup Date'], ['delivery','by Delivery Date']].map(([val, lbl]) => (
                      <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer', color: byDate === val ? 'var(--amber)' : 'var(--ink-mute)' }}>
                        <input type="radio" checked={byDate === val} onChange={() => setByDate(val)} />
                        {lbl}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <L>Date Range: From</L>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inp} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <L>Date Range: To</L>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inp} />
                  </div>
                  <button onClick={applyBalance} className="btn primary" style={{ padding: '7px 16px', fontSize: 11, flexShrink: 0 }}>
                    {balLoading ? '...' : '▸ APPLY'}
                  </button>
                </div>
                {balanceFetched && balance.length > 0 && (
                  <table className="tbl" style={{ fontSize: 11 }}>
                    <thead><tr><th>DRIVER</th><th>PAYABLE TO</th><th className="num">LOADS</th><th className="num">GROSS</th><th className="num">EARNED</th><th></th></tr></thead>
                    <tbody>
                      {balance.map(row => (
                        <tr key={row.driver_id}>
                          <td>{row.driver_name}</td>
                          <td>{row.payable_to}</td>
                          <td className="num">{row.load_count}</td>
                          <td className="num">${row.gross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="num" style={{ color: 'var(--green)' }}>${row.earned.toFixed(2)}</td>
                          <td><button onClick={() => fillFromBalance(row)} className="btn" style={{ padding: '2px 8px', fontSize: 10 }}>USE</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {balanceFetched && balance.length === 0 && (
                  <div style={{ fontSize: 11, color: 'var(--ink-mute)', padding: '8px 0' }}>No delivered loads found in this range.</div>
                )}
              </div>

              {/* Settlement fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <L>Settlement Date *</L>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inp} />
                </div>
                <div>
                  <L>Settlement Total ($)</L>
                  <input type="number" step="0.01" value={form.settlement_total} onChange={e => setForm(f => ({ ...f, settlement_total: e.target.value }))} style={inp} />
                </div>
                <div>
                  <L>Balance Due ($)</L>
                  <input type="number" step="0.01" value={form.balance_due} onChange={e => setForm(f => ({ ...f, balance_due: e.target.value }))} style={inp} />
                </div>
                <div>
                  <L>Status</L>
                  <select value={form.status || 'draft'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={sel}>
                    <option value="draft">Draft</option>
                    <option value="approved">Approved</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div style={{ gridColumn: '2 / -1' }}>
                  <L>Notes</L>
                  <input value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={inp} />
                </div>
              </div>
            </div>

            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, flexShrink: 0 }}>
              <button onClick={save} disabled={!form.date || !form.payable_to} className="btn primary" style={{ flex: 1, justifyContent: 'center', padding: 10 }}>
                {panel === 'new' ? '+ CREATE SETTLEMENT' : '▸ SAVE CHANGES'}
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
