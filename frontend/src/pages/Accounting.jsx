import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  getBillingEntries, createBillingEntry, updateBillingEntry, deleteBillingEntry,
  getFactoringReports, createFactoringReport, updateFactoringReport, deleteFactoringReport,
  getAccountingSummary, getPartners, getDrivers, getTrucks,
} from '../api'

const today = new Date().toISOString().slice(0, 10)

const BILLING_CATEGORIES = [
  'Freight Revenue','Fuel Surcharge','Detention','Layover','TONU',
  'Accessorial','Fuel Expense','Repair','Insurance','Toll','Lumper',
  'Other Income','Other Expense',
]

const STATUS_COLORS = {
  pending: 'var(--amber)', approved: 'var(--green)', paid: 'var(--green)',
  void: 'var(--ink-mute)', preparing: 'var(--amber)', submitted: 'var(--amber)',
  funded: 'var(--green)', denied: 'var(--red)',
}

const EMPTY_BILLING = { partner_id: '', driver_id: '', truck_id: '', date: today, entry_type: 'income', category: '', status: 'pending', amount: '', load_number: '', driver_settlement: false, settlement_description: '', notes: '' }
const EMPTY_FR = { partner_id: '', date: today, status: 'preparing', amount: '', notes: '' }

const inp = { width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '7px 10px', fontFamily: 'var(--mono)', fontSize: 12, boxSizing: 'border-box' }
const sel = { ...inp }

export default function Accounting() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('billing')
  const [panel, setPanel] = useState(null)
  const [form, setForm] = useState(EMPTY_BILLING)

  const { data: billing = [] }  = useQuery({ queryKey: ['billing'], queryFn: getBillingEntries })
  const { data: frList = [] }   = useQuery({ queryKey: ['factoring-reports'], queryFn: getFactoringReports })
  const { data: summary = {} }  = useQuery({ queryKey: ['acct-summary'], queryFn: getAccountingSummary })
  const { data: partners = [] } = useQuery({ queryKey: ['partners'], queryFn: () => getPartners() })
  const { data: drivers = [] }  = useQuery({ queryKey: ['drivers'], queryFn: getDrivers })
  const { data: trucks = [] }   = useQuery({ queryKey: ['trucks'], queryFn: getTrucks })

  const createB = useMutation({ mutationFn: createBillingEntry,   onSuccess: () => { qc.invalidateQueries(['billing']); qc.invalidateQueries(['acct-summary']); setPanel(null) } })
  const updateB = useMutation({ mutationFn: ({ id, data }) => updateBillingEntry(id, data), onSuccess: () => { qc.invalidateQueries(['billing']); setPanel(null) } })
  const deleteB = useMutation({ mutationFn: deleteBillingEntry, onSuccess: () => { qc.invalidateQueries(['billing']); qc.invalidateQueries(['acct-summary']); setPanel(null) } })
  const createF = useMutation({ mutationFn: createFactoringReport, onSuccess: () => { qc.invalidateQueries(['factoring-reports']); setPanel(null) } })
  const updateF = useMutation({ mutationFn: ({ id, data }) => updateFactoringReport(id, data), onSuccess: () => { qc.invalidateQueries(['factoring-reports']); setPanel(null) } })
  const deleteF = useMutation({ mutationFn: deleteFactoringReport, onSuccess: () => { qc.invalidateQueries(['factoring-reports']); setPanel(null) } })

  const openNew = () => {
    setForm(tab === 'billing' ? EMPTY_BILLING : EMPTY_FR)
    setPanel('new')
  }
  const openEdit = (item) => {
    setForm({ ...item, partner_id: item.partner_id || '', driver_id: item.driver_id || '', truck_id: item.truck_id || '' })
    setPanel(item)
  }
  const save = () => {
    if (tab === 'billing') {
      const p = { ...form, partner_id: form.partner_id ? parseInt(form.partner_id) : null, driver_id: form.driver_id ? parseInt(form.driver_id) : null, truck_id: form.truck_id ? parseInt(form.truck_id) : null, amount: parseFloat(form.amount) || null }
      panel === 'new' ? createB.mutate(p) : updateB.mutate({ id: panel.id, data: p })
    } else {
      const p = { ...form, partner_id: form.partner_id ? parseInt(form.partner_id) : null, amount: parseFloat(form.amount) || null }
      panel === 'new' ? createF.mutate(p) : updateF.mutate({ id: panel.id, data: p })
    }
  }
  const del = () => {
    if (tab === 'billing') deleteB.mutate(panel.id)
    else deleteF.mutate(panel.id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 89px)', position: 'relative' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid var(--line)', background: 'var(--bg-elev)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {[['billing','BILLING ENTRIES'], ['factoring','FACTORING REPORTS']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ padding: '7px 18px', background: 'none', border: 'none', borderBottom: tab === key ? '2px solid var(--amber)' : '2px solid transparent', color: tab === key ? 'var(--amber)' : 'var(--ink-mute)', fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Stat label="TOTAL INCOME"  value={`$${(summary.total_income || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="var(--green)" />
          <Stat label="TOTAL EXPENSE" value={`$${(summary.total_expense || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="var(--red)" />
          <Stat label="NET"           value={`$${(summary.net || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color={(summary.net || 0) >= 0 ? 'var(--green)' : 'var(--red)'} />
          <Stat label="PENDING"       value={`$${(summary.pending_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="var(--amber)" />
          <button className="btn primary" style={{ padding: '6px 14px', fontSize: 11 }} onClick={openNew}>
            + {tab === 'billing' ? 'NEW ENTRY' : 'NEW REPORT'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>

        {tab === 'billing' && (billing.length === 0 ? <Empty text="NO BILLING ENTRIES" /> :
          <table className="tbl">
            <thead><tr>
              <th>ID</th><th>DATE</th><th>TYPE</th><th>CATEGORY</th><th>STATUS</th>
              <th>PARTNER</th><th>DRIVER</th><th className="num">AMOUNT</th>
              <th>LOAD #</th><th>NOTES</th><th></th>
            </tr></thead>
            <tbody>
              {billing.map(e => (
                <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(e)}>
                  <td style={{ fontSize: 10, color: 'var(--ink-mute)' }}>#{e.id}</td>
                  <td style={{ fontSize: 11 }}>{e.date}</td>
                  <td><span className={`tag ${e.entry_type === 'income' || e.entry_type === 'addition' ? 'green' : 'red'}`} style={{ fontSize: 9 }}>{e.entry_type?.toUpperCase()}</span></td>
                  <td style={{ fontSize: 11 }}>{e.category || '—'}</td>
                  <td><span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: STATUS_COLORS[e.status] || 'var(--ink)' }}>{e.status?.toUpperCase()}</span></td>
                  <td style={{ fontSize: 11 }}>{e.partner_name || '—'}</td>
                  <td style={{ fontSize: 11 }}>{e.driver_name || '—'}</td>
                  <td className="num" style={{ color: e.entry_type === 'income' ? 'var(--green)' : 'var(--red)' }}>
                    {e.amount != null ? `$${e.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td style={{ fontSize: 10, color: 'var(--ink-dim)' }}>{e.load_number || '—'}</td>
                  <td style={{ fontSize: 10, color: 'var(--ink-mute)' }}>{e.notes || '—'}</td>
                  <td style={{ color: 'var(--ink-mute)', fontFamily: 'var(--mono)' }}>›</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'factoring' && (frList.length === 0 ? <Empty text="NO FACTORING REPORTS" /> :
          <table className="tbl">
            <thead><tr>
              <th>ID</th><th>DATE</th><th>PARTNER</th><th className="num">AMOUNT</th><th>STATUS</th><th>NOTES</th><th></th>
            </tr></thead>
            <tbody>
              {frList.map(r => (
                <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(r)}>
                  <td style={{ fontSize: 10, color: 'var(--ink-mute)' }}>#{r.id}</td>
                  <td style={{ fontSize: 11 }}>{r.date}</td>
                  <td style={{ fontSize: 11 }}>{r.partner_name || '—'}</td>
                  <td className="num" style={{ color: 'var(--green)' }}>{r.amount != null ? `$${r.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td>
                  <td><span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: STATUS_COLORS[r.status] || 'var(--ink)' }}>{r.status?.toUpperCase()}</span></td>
                  <td style={{ fontSize: 10, color: 'var(--ink-mute)' }}>{r.notes || '—'}</td>
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
          <div style={{ width: 680, background: 'var(--panel)', borderLeft: '1px solid var(--line-strong)', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
              <span className="t-tiny t-up t-dim">{panel === 'new' ? (tab === 'billing' ? '· NEW BILLING ENTRY' : '· NEW FACTORING REPORT') : (tab === 'billing' ? `· BILLING ENTRY #${panel.id}` : `· FACTORING REPORT #${panel.id}`)}</span>
              <button onClick={() => setPanel(null)} className="btn" style={{ padding: '3px 8px' }}>✕ CLOSE</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              {tab === 'billing' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <L>Partner</L>
                    <select value={form.partner_id || ''} onChange={e => setForm(f => ({ ...f, partner_id: e.target.value }))} style={sel}>
                      <option value="">— None —</option>
                      {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <L>Driver</L>
                    <select value={form.driver_id || ''} onChange={e => setForm(f => ({ ...f, driver_id: e.target.value }))} style={sel}>
                      <option value="">— None —</option>
                      {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <L>Truck</L>
                    <select value={form.truck_id || ''} onChange={e => setForm(f => ({ ...f, truck_id: e.target.value }))} style={sel}>
                      <option value="">— None —</option>
                      {trucks.map(t => <option key={t.id} value={t.id}>{t.unit_number}</option>)}
                    </select>
                  </div>
                  <div>
                    <L>Date *</L>
                    <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inp} />
                  </div>
                  <div>
                    <L>Type</L>
                    <select value={form.entry_type || 'income'} onChange={e => setForm(f => ({ ...f, entry_type: e.target.value }))} style={sel}>
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                      <option value="deduction">Deduction</option>
                      <option value="addition">Addition</option>
                    </select>
                  </div>
                  <div>
                    <L>Category *</L>
                    <select value={form.category || ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={sel}>
                      <option value="">— Select —</option>
                      {BILLING_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <L>Status</L>
                    <select value={form.status || 'pending'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={sel}>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="paid">Paid</option>
                      <option value="void">Void</option>
                    </select>
                  </div>
                  <div>
                    <L>Amount ($) *</L>
                    <input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={inp} />
                  </div>
                  <div>
                    <L>Load Number</L>
                    <input value={form.load_number || ''} onChange={e => setForm(f => ({ ...f, load_number: e.target.value }))} style={inp} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <L>Settlement Description</L>
                    <textarea value={form.settlement_description || ''} onChange={e => setForm(f => ({ ...f, settlement_description: e.target.value }))} style={{ ...inp, minHeight: 56, resize: 'vertical' }} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <L>Notes</L>
                    <textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inp, minHeight: 56, resize: 'vertical' }} />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <L>Partner</L>
                    <select value={form.partner_id || ''} onChange={e => setForm(f => ({ ...f, partner_id: e.target.value }))} style={sel}>
                      <option value="">— None —</option>
                      {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <L>Date *</L>
                    <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inp} />
                  </div>
                  <div>
                    <L>Status</L>
                    <select value={form.status || 'preparing'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={sel}>
                      <option value="preparing">Preparing</option>
                      <option value="submitted">Submitted</option>
                      <option value="funded">Funded</option>
                      <option value="denied">Denied</option>
                    </select>
                  </div>
                  <div>
                    <L>Amount ($)</L>
                    <input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={inp} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <L>Notes</L>
                    <textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inp, minHeight: 80, resize: 'vertical' }} />
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, flexShrink: 0 }}>
              <button onClick={save} disabled={!form.date} className="btn primary" style={{ flex: 1, justifyContent: 'center', padding: 10 }}>
                {panel === 'new' ? '+ ADD' : '▸ SAVE CHANGES'}
              </button>
              {panel !== 'new' && (
                <button onClick={del} className="btn" style={{ padding: '10px 14px', color: 'var(--red)', border: '1px solid var(--red)' }}>DELETE</button>
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
function Empty({ text }) { return <div style={{ padding: 32, color: 'var(--ink-mute)', fontSize: 11, fontFamily: 'var(--mono)' }}>{text}</div> }
