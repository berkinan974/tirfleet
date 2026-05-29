import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPartners, createPartner, updatePartner, deletePartner, getVendors, createVendor, updateVendor, deleteVendor } from '../api'
import { useState } from 'react'

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

const EMPTY_PARTNER = { name: '', partner_type: 'broker', address: '', address2: '', city: '', state: '', zip: '', phone: '', email: '', fid_ein: '', mc_number: '', pay_method: '', credit: '', avg_dtp: '', billing_type: 'factoring', quickpay_fee: '', status: 'pending', pay_terms: '', notes: '' }
const EMPTY_VENDOR  = { name: '', vendor_type: '', address: '', address2: '', city: '', state: '', zip: '', phone: '', email: '', fid_ein: '', mc_number: '', additional_payee: false, equipment_owner: false, payee_rate: '', settlement_template: '', notes: '' }

const inputStyle  = { width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '7px 10px', fontFamily: 'var(--mono)', fontSize: 12, boxSizing: 'border-box' }
const selectStyle = { ...inputStyle }
const labelStyle  = { fontSize: 10, color: 'var(--ink-mute)', fontFamily: 'var(--mono)', textTransform: 'uppercase', marginBottom: 4 }

export default function Partners() {
  const qc = useQueryClient()
  const [mainTab, setMainTab] = useState('customers')   // customers | vendors
  const [custTab, setCustTab] = useState('broker')      // broker | shipper_receiver
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(EMPTY_PARTNER)
  const [vForm, setVForm] = useState(EMPTY_VENDOR)
  const [showVForm, setShowVForm] = useState(false)
  const [editVendor, setEditVendor] = useState(null)

  const { data: brokers = [] }   = useQuery({ queryKey: ['partners', 'broker'], queryFn: () => getPartners('broker') })
  const { data: shippers = [] }  = useQuery({ queryKey: ['partners', 'shipper_receiver'], queryFn: () => getPartners('shipper_receiver') })
  const { data: vendors = [] }   = useQuery({ queryKey: ['vendors'], queryFn: getVendors })

  const createP = useMutation({ mutationFn: createPartner, onSuccess: () => { qc.invalidateQueries(['partners']); setShowForm(false); setForm(EMPTY_PARTNER) } })
  const updateP = useMutation({ mutationFn: ({ id, data }) => updatePartner(id, data), onSuccess: () => { qc.invalidateQueries(['partners']); setEditItem(null) } })
  const deleteP = useMutation({ mutationFn: deletePartner, onSuccess: () => qc.invalidateQueries(['partners']) })

  const createV = useMutation({ mutationFn: createVendor, onSuccess: () => { qc.invalidateQueries(['vendors']); setShowVForm(false); setVForm(EMPTY_VENDOR) } })
  const updateV = useMutation({ mutationFn: ({ id, data }) => updateVendor(id, data), onSuccess: () => { qc.invalidateQueries(['vendors']); setEditVendor(null) } })
  const deleteV = useMutation({ mutationFn: deleteVendor, onSuccess: () => qc.invalidateQueries(['vendors']) })

  const activePartners = custTab === 'broker' ? brokers : shippers
  const currentForm = editItem || form
  const setCurrentForm = editItem ? setEditItem : setForm

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 89px)', overflow: 'hidden' }}>

      {/* Main tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'var(--bg-elev)', flexShrink: 0, padding: '0 16px' }}>
        {[['customers','CUSTOMERS / BROKERS'], ['vendors','VENDORS']].map(([val, label]) => (
          <button key={val} onClick={() => setMainTab(val)} style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: mainTab === val ? '2px solid var(--amber)' : '2px solid transparent', color: mainTab === val ? 'var(--amber)' : 'var(--ink-mute)', fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer', marginBottom: -1, textTransform: 'uppercase' }}>
            {label}
          </button>
        ))}
      </div>

      {/* CUSTOMERS TAB */}
      {mainTab === 'customers' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="panel-head" style={{ padding: '10px 16px', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 0 }}>
              {[['broker','Brokers'], ['shipper_receiver','Shippers / Receivers']].map(([val, label]) => (
                <button key={val} onClick={() => setCustTab(val)} style={{ padding: '4px 14px', background: custTab === val ? 'var(--amber)' : 'var(--bg-elev)', border: '1px solid var(--line)', color: custTab === val ? '#000' : 'var(--ink-mute)', fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer' }}>
                  {label}
                </button>
              ))}
            </div>
            <button className="btn primary" style={{ padding: '5px 14px', fontSize: 11 }} onClick={() => { setForm({ ...EMPTY_PARTNER, partner_type: custTab }); setShowForm(true) }}>
              + New Customer
            </button>
          </div>

          <div style={{ flex: 1, overflow: 'auto' }}>
            {activePartners.length === 0 ? (
              <div style={{ padding: 24, color: 'var(--ink-mute)', fontSize: 11 }}>NO RECORDS — ADD WITH [+ NEW CUSTOMER]</div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>NAME</th>
                    <th>ADDRESS</th>
                    <th>PHONE</th>
                    <th>MC #</th>
                    <th>PAY METHOD</th>
                    <th>CREDIT</th>
                    <th>AVG DTP</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {activePartners.map(p => (
                    <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => setEditItem({ ...p })}>
                      <td>
                        <div style={{ fontSize: 11, color: 'var(--amber)' }}>{p.name}</div>
                        {p.email && <div className="t-tiny t-mute">{p.email}</div>}
                      </td>
                      <td style={{ fontSize: 10, color: 'var(--ink-dim)' }}>
                        {[p.city, p.state].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td style={{ fontSize: 10 }}>{p.phone || '—'}</td>
                      <td style={{ fontSize: 10, fontFamily: 'var(--mono)' }}>{p.mc_number || '—'}</td>
                      <td style={{ fontSize: 10 }}>{p.pay_method || '—'}</td>
                      <td style={{ fontSize: 10 }}>{p.credit || '—'}</td>
                      <td style={{ fontSize: 10 }}>{p.avg_dtp ? `${p.avg_dtp} days` : '—'}</td>
                      <td>
                        <span style={{ fontSize: 10, color: p.status === 'active' ? 'var(--green)' : p.status === 'inactive' ? 'var(--red)' : 'var(--amber)', fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>
                          {p.status || 'pending'}
                        </span>
                      </td>
                      <td>
                        <span onClick={e => { e.stopPropagation(); if (confirm('Delete?')) deleteP.mutate(p.id) }} style={{ fontSize: 10, color: 'var(--ink-mute)', cursor: 'pointer' }}>✕</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* VENDORS TAB */}
      {mainTab === 'vendors' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="panel-head" style={{ padding: '10px 16px', flexShrink: 0 }}>
            <span>· VENDORS · {vendors.length} RECORDS</span>
            <button className="btn primary" style={{ padding: '5px 14px', fontSize: 11 }} onClick={() => { setVForm(EMPTY_VENDOR); setShowVForm(true) }}>
              + New Vendor
            </button>
          </div>

          <div style={{ flex: 1, overflow: 'auto' }}>
            {vendors.length === 0 ? (
              <div style={{ padding: 24, color: 'var(--ink-mute)', fontSize: 11 }}>NO VENDORS — ADD WITH [+ NEW VENDOR]</div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>NAME</th>
                    <th>ADDRESS</th>
                    <th>MC #</th>
                    <th>PHONE</th>
                    <th>EMAIL</th>
                    <th>TYPE</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map(v => (
                    <tr key={v.id} style={{ cursor: 'pointer' }} onClick={() => setEditVendor({ ...v })}>
                      <td>
                        <div style={{ fontSize: 11, color: 'var(--amber)' }}>{v.name}</div>
                      </td>
                      <td style={{ fontSize: 10, color: 'var(--ink-dim)' }}>{[v.city, v.state].filter(Boolean).join(', ') || '—'}</td>
                      <td style={{ fontSize: 10, fontFamily: 'var(--mono)' }}>{v.mc_number || '—'}</td>
                      <td style={{ fontSize: 10 }}>{v.phone || '—'}</td>
                      <td style={{ fontSize: 10 }}>{v.email || '—'}</td>
                      <td><span className="tag" style={{ fontSize: 9 }}>{v.vendor_type || 'Vendor'}</span></td>
                      <td>
                        <span onClick={e => { e.stopPropagation(); if (confirm('Delete?')) deleteV.mutate(v.id) }} style={{ fontSize: 10, color: 'var(--ink-mute)', cursor: 'pointer' }}>✕</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* PARTNER FORM MODAL (create + edit) */}
      {(showForm || editItem) && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000bb', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', zIndex: 100 }}>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line-strong)', padding: 24, width: 860, height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
              <span className="t-tiny t-up t-dim">{editItem ? `· EDIT — ${editItem.name}` : '· NEW CUSTOMER'}</span>
              <button onClick={() => { setShowForm(false); setEditItem(null) }} className="btn" style={{ padding: '3px 8px' }}>✕ CLOSE</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, flex: 1 }}>
              {/* Left */}
              <div>
                <div style={labelStyle}>COMPANY NAME</div>
                <input value={currentForm.name || ''} onChange={e => setCurrentForm(f => ({ ...f, name: e.target.value }))} style={{ ...inputStyle, marginBottom: 14 }} placeholder="Search by name or MC number" />

                <div style={labelStyle}>ADDRESS</div>
                <input value={currentForm.address || ''} onChange={e => setCurrentForm(f => ({ ...f, address: e.target.value }))} style={{ ...inputStyle, marginBottom: 8 }} />
                <div style={labelStyle}>ADDRESS LINE 2</div>
                <input value={currentForm.address2 || ''} onChange={e => setCurrentForm(f => ({ ...f, address2: e.target.value }))} style={{ ...inputStyle, marginBottom: 14 }} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div>
                    <div style={labelStyle}>PHONE</div>
                    <input type="tel" value={currentForm.phone || ''} onChange={e => setCurrentForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <div style={labelStyle}>EMAIL</div>
                    <input type="email" value={currentForm.email || ''} onChange={e => setCurrentForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 10, marginBottom: 14 }}>
                  <div>
                    <div style={labelStyle}>CITY</div>
                    <input value={currentForm.city || ''} onChange={e => setCurrentForm(f => ({ ...f, city: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <div style={labelStyle}>STATE</div>
                    <select value={currentForm.state || ''} onChange={e => setCurrentForm(f => ({ ...f, state: e.target.value }))} style={selectStyle}>
                      <option value="">—</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={labelStyle}>ZIP</div>
                    <input value={currentForm.zip || ''} onChange={e => setCurrentForm(f => ({ ...f, zip: e.target.value }))} style={inputStyle} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div>
                    <div style={labelStyle}>FID / EIN</div>
                    <input value={currentForm.fid_ein || ''} onChange={e => setCurrentForm(f => ({ ...f, fid_ein: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <div style={labelStyle}>MC #</div>
                    <input value={currentForm.mc_number || ''} onChange={e => setCurrentForm(f => ({ ...f, mc_number: e.target.value }))} style={inputStyle} />
                  </div>
                </div>

                <div style={labelStyle}>NOTES</div>
                <textarea value={currentForm.notes || ''} onChange={e => setCurrentForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inputStyle, height: 80, resize: 'vertical' }} />
              </div>

              {/* Right */}
              <div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--mono)', marginBottom: 10 }}>CUSTOMER TYPE</div>
                  {[['broker','Broker'], ['shipper_receiver','Shipper / Receiver']].map(([val, label]) => (
                    <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontSize: 12, color: 'var(--ink-dim)' }}>
                      <input type="checkbox" checked={currentForm.partner_type === val} onChange={() => setCurrentForm(f => ({ ...f, partner_type: val }))} />
                      {label}
                    </label>
                  ))}
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--mono)', marginBottom: 10 }}>BILLING</div>
                  {[['direct','Direct billing'], ['factoring','Factoring']].map(([val, label]) => (
                    <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontSize: 12, color: currentForm.billing_type === val ? 'var(--amber)' : 'var(--ink-dim)' }}>
                      <input type="radio" checked={currentForm.billing_type === val} onChange={() => setCurrentForm(f => ({ ...f, billing_type: val }))} />
                      {label}
                    </label>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div>
                    <div style={labelStyle}>QUICKPAY FEE %</div>
                    <input type="number" value={currentForm.quickpay_fee || ''} onChange={e => setCurrentForm(f => ({ ...f, quickpay_fee: e.target.value }))} style={inputStyle} placeholder="e.g. 2.25" />
                  </div>
                  <div>
                    <div style={labelStyle}>CREDIT</div>
                    <select value={currentForm.credit || ''} onChange={e => setCurrentForm(f => ({ ...f, credit: e.target.value }))} style={selectStyle}>
                      <option value="">—</option>
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                    </select>
                  </div>
                  <div>
                    <div style={labelStyle}>AVG DAYS TO PAY</div>
                    <input type="number" value={currentForm.avg_dtp || ''} onChange={e => setCurrentForm(f => ({ ...f, avg_dtp: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <div style={labelStyle}>STATUS</div>
                    <select value={currentForm.status || 'pending'} onChange={e => setCurrentForm(f => ({ ...f, status: e.target.value }))} style={selectStyle}>
                      <option value="pending">Pending</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={labelStyle}>PAY TERMS</div>
                    <input value={currentForm.pay_terms || ''} onChange={e => setCurrentForm(f => ({ ...f, pay_terms: e.target.value }))} style={inputStyle} placeholder="e.g. Net 30" />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={labelStyle}>PAY METHOD</div>
                    <input value={currentForm.pay_method || ''} onChange={e => setCurrentForm(f => ({ ...f, pay_method: e.target.value }))} style={inputStyle} placeholder="e.g. Check, ACH" />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
              <button
                className="btn primary"
                style={{ flex: 1, justifyContent: 'center', padding: 10 }}
                disabled={!currentForm.name || createP.isPending || updateP.isPending}
                onClick={() => {
                  const payload = { ...currentForm, avg_dtp: parseFloat(currentForm.avg_dtp) || null, quickpay_fee: parseFloat(currentForm.quickpay_fee) || null }
                  if (editItem) updateP.mutate({ id: editItem.id, data: payload })
                  else createP.mutate(payload)
                }}
              >
                {createP.isPending || updateP.isPending ? 'Saving...' : editItem ? '+ Save Changes' : '+ Create Customer'}
              </button>
              <button className="btn" style={{ padding: '10px 18px' }} onClick={() => { setShowForm(false); setEditItem(null) }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* VENDOR FORM MODAL */}
      {(showVForm || editVendor) && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000bb', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', zIndex: 100 }}>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line-strong)', padding: 24, width: 860, height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
              <span className="t-tiny t-up t-dim">{editVendor ? `· EDIT — ${editVendor.name}` : '· NEW VENDOR'}</span>
              <button onClick={() => { setShowVForm(false); setEditVendor(null) }} className="btn" style={{ padding: '3px 8px' }}>✕ CLOSE</button>
            </div>

            {(() => {
              const vf = editVendor || vForm
              const setVf = editVendor ? setEditVendor : setVForm
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, flex: 1 }}>
                  <div>
                    <div style={labelStyle}>COMPANY NAME *</div>
                    <input value={vf.name || ''} onChange={e => setVf(f => ({ ...f, name: e.target.value }))} style={{ ...inputStyle, marginBottom: 14 }} />

                    <div style={labelStyle}>ADDRESS</div>
                    <input value={vf.address || ''} onChange={e => setVf(f => ({ ...f, address: e.target.value }))} style={{ ...inputStyle, marginBottom: 8 }} />
                    <div style={labelStyle}>ADDRESS LINE 2</div>
                    <input value={vf.address2 || ''} onChange={e => setVf(f => ({ ...f, address2: e.target.value }))} style={{ ...inputStyle, marginBottom: 14 }} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                      <div><div style={labelStyle}>PHONE</div><input type="tel" value={vf.phone || ''} onChange={e => setVf(f => ({ ...f, phone: e.target.value }))} style={inputStyle} /></div>
                      <div><div style={labelStyle}>EMAIL</div><input type="email" value={vf.email || ''} onChange={e => setVf(f => ({ ...f, email: e.target.value }))} style={inputStyle} /></div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 10, marginBottom: 14 }}>
                      <div><div style={labelStyle}>CITY</div><input value={vf.city || ''} onChange={e => setVf(f => ({ ...f, city: e.target.value }))} style={inputStyle} /></div>
                      <div>
                        <div style={labelStyle}>STATE</div>
                        <select value={vf.state || ''} onChange={e => setVf(f => ({ ...f, state: e.target.value }))} style={selectStyle}>
                          <option value="">—</option>
                          {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div><div style={labelStyle}>ZIP</div><input value={vf.zip || ''} onChange={e => setVf(f => ({ ...f, zip: e.target.value }))} style={inputStyle} /></div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                      <div><div style={labelStyle}>FID / EIN</div><input value={vf.fid_ein || ''} onChange={e => setVf(f => ({ ...f, fid_ein: e.target.value }))} style={inputStyle} /></div>
                      <div><div style={labelStyle}>MC #</div><input value={vf.mc_number || ''} onChange={e => setVf(f => ({ ...f, mc_number: e.target.value }))} style={inputStyle} /></div>
                    </div>

                    <div style={labelStyle}>NOTES</div>
                    <textarea value={vf.notes || ''} onChange={e => setVf(f => ({ ...f, notes: e.target.value }))} style={{ ...inputStyle, height: 80, resize: 'vertical' }} />
                  </div>

                  <div>
                    <div style={{ fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--mono)', marginBottom: 10 }}>VENDOR TYPE</div>
                    <input value={vf.vendor_type || ''} onChange={e => setVf(f => ({ ...f, vendor_type: e.target.value }))} style={{ ...inputStyle, marginBottom: 20 }} placeholder="e.g. Driver, Fuel, Mechanic" />

                    <div style={{ fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--mono)', marginBottom: 10 }}>BILLING</div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12, color: 'var(--ink-dim)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!vf.additional_payee} onChange={e => setVf(f => ({ ...f, additional_payee: e.target.checked }))} />
                      Additional payee
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 12, color: 'var(--ink-dim)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!vf.equipment_owner} onChange={e => setVf(f => ({ ...f, equipment_owner: e.target.checked }))} />
                      Equipment owner
                    </label>

                    <div style={labelStyle}>ADDITIONAL PAYEE RATE %</div>
                    <input type="number" value={vf.payee_rate || ''} onChange={e => setVf(f => ({ ...f, payee_rate: e.target.value }))} style={{ ...inputStyle, marginBottom: 12 }} placeholder="e.g. 90" />

                    <div style={labelStyle}>SETTLEMENT TEMPLATE TYPE</div>
                    <select value={vf.settlement_template || ''} onChange={e => setVf(f => ({ ...f, settlement_template: e.target.value }))} style={selectStyle}>
                      <option value="">— Select template —</option>
                      <option value="standard">Standard</option>
                      <option value="owner_operator">Owner Operator</option>
                      <option value="lease">Lease</option>
                    </select>
                  </div>
                </div>
              )
            })()}

            <div style={{ display: 'flex', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
              <button
                className="btn primary"
                style={{ flex: 1, justifyContent: 'center', padding: 10 }}
                disabled={!(editVendor || vForm).name || createV.isPending || updateV.isPending}
                onClick={() => {
                  const vf = editVendor || vForm
                  const payload = { ...vf, payee_rate: parseFloat(vf.payee_rate) || null }
                  if (editVendor) updateV.mutate({ id: editVendor.id, data: payload })
                  else createV.mutate(payload)
                }}
              >
                {createV.isPending || updateV.isPending ? 'Saving...' : editVendor ? '+ Save Changes' : '+ Create Vendor'}
              </button>
              <button className="btn" style={{ padding: '10px 18px' }} onClick={() => { setShowVForm(false); setEditVendor(null) }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
