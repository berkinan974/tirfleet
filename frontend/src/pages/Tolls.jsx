import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  getTollDevices, createTollDevice, updateTollDevice, deleteTollDevice,
  getTollTransactions, createTollTransaction, updateTollTransaction, deleteTollTransaction,
  getTollTemplates, createTollTemplate, deleteTollTemplate,
  getTrucks, getDrivers,
} from '../api'

const today = new Date().toISOString().slice(0, 10)

const inp = { width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '7px 10px', fontFamily: 'var(--mono)', fontSize: 12, boxSizing: 'border-box' }
const sel = { ...inp }

const EMPTY_DEV = { device_name: '', is_active: true, truck_id: '', notes: '' }
const EMPTY_TX  = { device_id: '', driver_id: '', truck_id: '', payable_to: '', posting_date: today, amount: '', is_deduction: false, entry_date: '', entry_time: '', entry_plaza: '', exit_date: '', exit_time: '', exit_plaza: '', notes: '' }
const EMPTY_TPL = { template_name: '', assigned_columns: '' }

const SUB_TABS = ['TOLL DEVICES', 'TOLL TRANSACTIONS', 'IMPORT TEMPLATES']

export default function Tolls() {
  const qc = useQueryClient()
  const [subTab, setSubTab] = useState('TOLL DEVICES')
  const [panel, setPanel] = useState(null)
  const [devForm, setDevForm] = useState(EMPTY_DEV)
  const [txForm, setTxForm]   = useState(EMPTY_TX)
  const [tplForm, setTplForm] = useState(EMPTY_TPL)

  const { data: devices = [] }     = useQuery({ queryKey: ['toll-devices'], queryFn: getTollDevices })
  const { data: txData = {} }      = useQuery({ queryKey: ['toll-transactions'], queryFn: getTollTransactions })
  const { data: templates = [] }   = useQuery({ queryKey: ['toll-templates'], queryFn: getTollTemplates })
  const { data: trucks = [] }      = useQuery({ queryKey: ['trucks'], queryFn: getTrucks })
  const { data: drivers = [] }     = useQuery({ queryKey: ['drivers'], queryFn: getDrivers })

  const txRows = txData.rows || []
  const txTotal = txData.total || 0

  // Mutations — devices
  const createDev = useMutation({ mutationFn: createTollDevice, onSuccess: () => { qc.invalidateQueries(['toll-devices']); setPanel(null) } })
  const updateDev = useMutation({ mutationFn: ({ id, data }) => updateTollDevice(id, data), onSuccess: () => { qc.invalidateQueries(['toll-devices']); setPanel(null) } })
  const deleteDev = useMutation({ mutationFn: deleteTollDevice, onSuccess: () => { qc.invalidateQueries(['toll-devices']); setPanel(null) } })

  // Mutations — transactions
  const createTx = useMutation({ mutationFn: createTollTransaction, onSuccess: () => { qc.invalidateQueries(['toll-transactions']); setPanel(null) } })
  const updateTx = useMutation({ mutationFn: ({ id, data }) => updateTollTransaction(id, data), onSuccess: () => { qc.invalidateQueries(['toll-transactions']); setPanel(null) } })
  const deleteTx = useMutation({ mutationFn: deleteTollTransaction, onSuccess: () => { qc.invalidateQueries(['toll-transactions']); setPanel(null) } })

  // Mutations — templates
  const createTpl = useMutation({ mutationFn: createTollTemplate, onSuccess: () => { qc.invalidateQueries(['toll-templates']); setPanel(null) } })
  const deleteTpl = useMutation({ mutationFn: deleteTollTemplate, onSuccess: () => qc.invalidateQueries(['toll-templates']) })

  const openNewDev = () => { setDevForm(EMPTY_DEV); setPanel('new-dev') }
  const openEditDev = (d) => { setDevForm({ ...d, truck_id: d.truck_id || '' }); setPanel({ type: 'dev', ...d }) }

  const openNewTx = () => { setTxForm(EMPTY_TX); setPanel('new-tx') }
  const openEditTx = (t) => { setTxForm({ ...t, device_id: t.device_id || '', driver_id: t.driver_id || '', truck_id: t.truck_id || '' }); setPanel({ type: 'tx', ...t }) }

  const openNewTpl = () => { setTplForm(EMPTY_TPL); setPanel('new-tpl') }

  const saveDev = () => {
    const p = { ...devForm, truck_id: devForm.truck_id ? parseInt(devForm.truck_id) : null }
    panel === 'new-dev' ? createDev.mutate(p) : updateDev.mutate({ id: panel.id, data: p })
  }

  const saveTx = () => {
    const p = {
      ...txForm,
      device_id: txForm.device_id ? parseInt(txForm.device_id) : null,
      driver_id: txForm.driver_id ? parseInt(txForm.driver_id) : null,
      truck_id:  txForm.truck_id  ? parseInt(txForm.truck_id)  : null,
      amount: parseFloat(txForm.amount) || 0,
    }
    panel === 'new-tx' ? createTx.mutate(p) : updateTx.mutate({ id: panel.id, data: p })
  }

  const saveTpl = () => { createTpl.mutate(tplForm) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 89px)', position: 'relative' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid var(--line)', background: 'var(--bg-elev)', flexShrink: 0 }}>
        <span className="t-tiny t-up" style={{ color: 'var(--amber)', letterSpacing: '0.12em' }}>· TOLLS</span>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Stat label="DEVICES"      value={devices.length} />
          <Stat label="TRANSACTIONS" value={txRows.length} />
          <Stat label="TOTAL TOLLS"  value={`$${txTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="var(--amber)" />
          {subTab === 'TOLL DEVICES'      && <button className="btn primary" style={{ padding: '6px 14px', fontSize: 11 }} onClick={openNewDev}>+ NEW DEVICE</button>}
          {subTab === 'TOLL TRANSACTIONS' && <button className="btn primary" style={{ padding: '6px 14px', fontSize: 11 }} onClick={openNewTx}>+ NEW TRANSACTION</button>}
          {subTab === 'IMPORT TEMPLATES'  && <button className="btn primary" style={{ padding: '6px 14px', fontSize: 11 }} onClick={openNewTpl}>+ NEW TEMPLATE</button>}
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'var(--bg)', flexShrink: 0 }}>
        {SUB_TABS.map(t => (
          <div key={t} onClick={() => setSubTab(t)} style={{
            padding: '8px 18px', cursor: 'pointer',
            borderBottom: subTab === t ? '2px solid var(--amber)' : '2px solid transparent',
            background: subTab === t ? 'var(--panel)' : 'transparent',
            fontSize: 11, color: subTab === t ? 'var(--amber)' : 'var(--ink)',
            letterSpacing: '0.06em', fontFamily: 'var(--mono)',
          }}>{t}</div>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>

        {/* Toll Devices */}
        {subTab === 'TOLL DEVICES' && (
          devices.length === 0
            ? <Empty text="NO TOLL DEVICES RECORDED" />
            : <table className="tbl">
                <thead><tr><th>DEVICE</th><th>STATUS</th><th>TRUCK</th><th>NOTES</th><th></th></tr></thead>
                <tbody>
                  {devices.map(d => (
                    <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => openEditDev(d)}>
                      <td style={{ color: 'var(--amber)', fontFamily: 'var(--mono)', fontSize: 12 }}>{d.device_name}</td>
                      <td><span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: d.is_active ? 'var(--green)' : 'var(--ink-mute)' }}>{d.is_active ? 'ACTIVE' : 'INACTIVE'}</span></td>
                      <td style={{ fontSize: 11 }}>{d.truck_unit || '—'}</td>
                      <td style={{ fontSize: 10, color: 'var(--ink-mute)' }}>{d.notes || '—'}</td>
                      <td style={{ color: 'var(--ink-mute)', fontFamily: 'var(--mono)' }}>›</td>
                    </tr>
                  ))}
                </tbody>
              </table>
        )}

        {/* Toll Transactions */}
        {subTab === 'TOLL TRANSACTIONS' && (
          txRows.length === 0
            ? <Empty text="NO TOLL TRANSACTIONS RECORDED" />
            : <table className="tbl">
                <thead><tr><th>POSTING DATE</th><th>DEVICE</th><th>DRIVER</th><th>PAYABLE TO</th><th>TRUCK</th><th>ENTRY PLAZA</th><th>EXIT PLAZA</th><th>DEDUCTION</th><th className="num">AMOUNT</th><th></th></tr></thead>
                <tbody>
                  {txRows.map(t => (
                    <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => openEditTx(t)}>
                      <td style={{ fontSize: 11 }}>{t.posting_date}</td>
                      <td style={{ fontSize: 11 }}>{t.device_name || '—'}</td>
                      <td style={{ fontSize: 11 }}>{t.driver_name || '—'}</td>
                      <td style={{ fontSize: 11 }}>{t.payable_to || '—'}</td>
                      <td style={{ fontSize: 11 }}>{t.truck_unit || '—'}</td>
                      <td style={{ fontSize: 10, color: 'var(--ink-mute)' }}>{t.entry_plaza || '—'}</td>
                      <td style={{ fontSize: 10, color: 'var(--ink-mute)' }}>{t.exit_plaza || '—'}</td>
                      <td><span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: t.is_deduction ? 'var(--amber)' : 'var(--ink-mute)' }}>{t.is_deduction ? 'YES' : 'NO'}</span></td>
                      <td className="num" style={{ color: 'var(--amber)' }}>{t.amount != null ? `$${Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td>
                      <td style={{ color: 'var(--ink-mute)', fontFamily: 'var(--mono)' }}>›</td>
                    </tr>
                  ))}
                </tbody>
              </table>
        )}

        {/* Import Templates */}
        {subTab === 'IMPORT TEMPLATES' && (
          templates.length === 0
            ? <Empty text="NO IMPORT TEMPLATES CONFIGURED" />
            : <table className="tbl">
                <thead><tr><th>TEMPLATE NAME</th><th>ASSIGNED COLUMNS</th><th>CREATED ON</th><th></th></tr></thead>
                <tbody>
                  {templates.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontSize: 11, color: 'var(--amber)', fontFamily: 'var(--mono)' }}>{t.template_name}</td>
                      <td style={{ fontSize: 10, color: 'var(--ink-mute)' }}>{t.assigned_columns || '—'}</td>
                      <td style={{ fontSize: 11 }}>{t.created_at}</td>
                      <td><button onClick={() => deleteTpl.mutate(t.id)} className="btn" style={{ padding: '2px 8px', fontSize: 10, color: 'var(--red)', border: '1px solid var(--red)' }}>DEL</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
        )}
      </div>

      {/* PANELS */}
      {panel && (
        <div style={{ position: 'fixed', inset: 0, background: '#00000077', zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 640, background: 'var(--panel)', borderLeft: '1px solid var(--line-strong)', display: 'flex', flexDirection: 'column', height: '100%' }}>

            {/* Device Panel */}
            {(panel === 'new-dev' || panel?.type === 'dev') && (
              <>
                <PanelHeader title={panel === 'new-dev' ? '· NEW TOLL DEVICE' : `· ${panel.device_name}`} onClose={() => setPanel(null)} />
                <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <L>Device Name *</L>
                      <input value={devForm.device_name} onChange={e => setDevForm(f => ({ ...f, device_name: e.target.value }))} style={inp} />
                    </div>
                    <div>
                      <L>Active</L>
                      <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                        {[true, false].map(v => (
                          <label key={String(v)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer', color: devForm.is_active === v ? 'var(--amber)' : 'var(--ink-mute)' }}>
                            <input type="radio" checked={devForm.is_active === v} onChange={() => setDevForm(f => ({ ...f, is_active: v }))} />
                            {v ? 'Yes' : 'No'}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <L>Truck</L>
                      <select value={devForm.truck_id || ''} onChange={e => setDevForm(f => ({ ...f, truck_id: e.target.value }))} style={sel}>
                        <option value="">— Select Truck —</option>
                        {trucks.map(t => <option key={t.id} value={t.id}>{t.unit_number}</option>)}
                      </select>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <L>Notes</L>
                      <textarea value={devForm.notes || ''} onChange={e => setDevForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inp, height: 80, resize: 'vertical' }} />
                    </div>
                  </div>
                </div>
                <PanelFooter
                  onSave={saveDev}
                  saveDisabled={!devForm.device_name}
                  saveLabel={panel === 'new-dev' ? '+ CREATE DEVICE' : '▸ SAVE CHANGES'}
                  onDelete={panel !== 'new-dev' ? () => deleteDev.mutate(panel.id) : null}
                  onClose={() => setPanel(null)}
                />
              </>
            )}

            {/* Transaction Panel */}
            {(panel === 'new-tx' || panel?.type === 'tx') && (
              <>
                <PanelHeader title={panel === 'new-tx' ? '· NEW TOLL TRANSACTION' : `· TRANSACTION #${panel.id}`} onClose={() => setPanel(null)} />
                <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <L>Device (Tag)</L>
                      <select value={txForm.device_id || ''} onChange={e => setTxForm(f => ({ ...f, device_id: e.target.value }))} style={sel}>
                        <option value="">— Select Device —</option>
                        {devices.map(d => <option key={d.id} value={d.id}>{d.device_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <L>Posting Date *</L>
                      <input type="date" value={txForm.posting_date} onChange={e => setTxForm(f => ({ ...f, posting_date: e.target.value }))} style={inp} />
                    </div>
                    <div>
                      <L>Driver</L>
                      <select value={txForm.driver_id || ''} onChange={e => {
                        const drv = drivers.find(d => String(d.id) === e.target.value)
                        setTxForm(f => ({ ...f, driver_id: e.target.value, payable_to: drv?.name || f.payable_to }))
                      }} style={sel}>
                        <option value="">— Select Driver —</option>
                        {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <L>Truck</L>
                      <select value={txForm.truck_id || ''} onChange={e => setTxForm(f => ({ ...f, truck_id: e.target.value }))} style={sel}>
                        <option value="">— Select Truck —</option>
                        {trucks.map(t => <option key={t.id} value={t.id}>{t.unit_number}</option>)}
                      </select>
                    </div>
                    <div>
                      <L>Payable To</L>
                      <input value={txForm.payable_to || ''} onChange={e => setTxForm(f => ({ ...f, payable_to: e.target.value }))} style={inp} />
                    </div>
                    <div>
                      <L>Amount ($) *</L>
                      <input type="number" step="0.01" value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))} style={inp} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <L>Deduction</L>
                      <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                        {[['Yes', true], ['No', false]].map(([lbl, v]) => (
                          <label key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer', color: txForm.is_deduction === v ? 'var(--amber)' : 'var(--ink-mute)' }}>
                            <input type="radio" checked={txForm.is_deduction === v} onChange={() => setTxForm(f => ({ ...f, is_deduction: v }))} />{lbl}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Entry / Exit */}
                    <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--line)', marginTop: 8, paddingTop: 12 }}>
                      <span className="t-tiny t-up" style={{ color: 'var(--amber)' }}>ENTRY / EXIT</span>
                    </div>
                    <div>
                      <L>Entry Date</L>
                      <input type="date" value={txForm.entry_date || ''} onChange={e => setTxForm(f => ({ ...f, entry_date: e.target.value }))} style={inp} />
                    </div>
                    <div>
                      <L>Entry Time</L>
                      <input value={txForm.entry_time || ''} onChange={e => setTxForm(f => ({ ...f, entry_time: e.target.value }))} style={inp} placeholder="hh:mm A" />
                    </div>
                    <div>
                      <L>Entry Plaza</L>
                      <input value={txForm.entry_plaza || ''} onChange={e => setTxForm(f => ({ ...f, entry_plaza: e.target.value }))} style={inp} />
                    </div>
                    <div>
                      <L>Exit Date</L>
                      <input type="date" value={txForm.exit_date || ''} onChange={e => setTxForm(f => ({ ...f, exit_date: e.target.value }))} style={inp} />
                    </div>
                    <div>
                      <L>Exit Time</L>
                      <input value={txForm.exit_time || ''} onChange={e => setTxForm(f => ({ ...f, exit_time: e.target.value }))} style={inp} placeholder="hh:mm A" />
                    </div>
                    <div>
                      <L>Exit Plaza</L>
                      <input value={txForm.exit_plaza || ''} onChange={e => setTxForm(f => ({ ...f, exit_plaza: e.target.value }))} style={inp} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <L>Notes</L>
                      <textarea value={txForm.notes || ''} onChange={e => setTxForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inp, height: 70, resize: 'vertical' }} />
                    </div>
                  </div>
                </div>
                <PanelFooter
                  onSave={saveTx}
                  saveDisabled={!txForm.posting_date}
                  saveLabel={panel === 'new-tx' ? '+ CREATE TRANSACTION' : '▸ SAVE CHANGES'}
                  onDelete={panel !== 'new-tx' ? () => deleteTx.mutate(panel.id) : null}
                  onClose={() => setPanel(null)}
                />
              </>
            )}

            {/* Template Panel */}
            {panel === 'new-tpl' && (
              <>
                <PanelHeader title="· NEW IMPORT TEMPLATE" onClose={() => setPanel(null)} />
                <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                  <div style={{ marginBottom: 14 }}>
                    <L>Template Name *</L>
                    <input value={tplForm.template_name} onChange={e => setTplForm(f => ({ ...f, template_name: e.target.value }))} style={inp} placeholder="e.g. PrePass EFS" />
                  </div>
                  <div>
                    <L>Assigned Columns (optional)</L>
                    <textarea value={tplForm.assigned_columns || ''} onChange={e => setTplForm(f => ({ ...f, assigned_columns: e.target.value }))} style={{ ...inp, height: 120, resize: 'vertical' }} placeholder="Column mapping notes..." />
                  </div>
                </div>
                <PanelFooter
                  onSave={saveTpl}
                  saveDisabled={!tplForm.template_name}
                  saveLabel="+ CREATE TEMPLATE"
                  onClose={() => setPanel(null)}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function PanelHeader({ title, onClose }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
      <span className="t-tiny t-up t-dim">{title}</span>
      <button onClick={onClose} className="btn" style={{ padding: '3px 8px' }}>✕ CLOSE</button>
    </div>
  )
}

function PanelFooter({ onSave, saveDisabled, saveLabel, onDelete, onClose }) {
  return (
    <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, flexShrink: 0 }}>
      <button onClick={onSave} disabled={saveDisabled} className="btn primary" style={{ flex: 1, justifyContent: 'center', padding: 10 }}>{saveLabel}</button>
      {onDelete && <button onClick={onDelete} className="btn" style={{ padding: '10px 14px', color: 'var(--red)', border: '1px solid var(--red)' }}>DELETE</button>}
      <button onClick={onClose} className="btn" style={{ padding: '10px 14px' }}>CLOSE</button>
    </div>
  )
}

function Empty({ text }) {
  return <div style={{ padding: 32, color: 'var(--ink-mute)', fontSize: 11, fontFamily: 'var(--mono)' }}>{text}</div>
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
