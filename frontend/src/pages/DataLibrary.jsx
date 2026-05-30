import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  getDLBrokers, getDLShippers,
  getDLFactoringCompanies, createDLFactoringCompany, updateDLFactoringCompany, deleteDLFactoringCompany,
  getDLLocations, createDLLocation, updateDLLocation, deleteDLLocation,
} from '../api'

const SUB_TABS = ['BROKERS', 'SHIPPERS / RECEIVERS', 'FACTORING COMPANIES', 'LOCATIONS']

const inp = { width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '7px 10px', fontFamily: 'var(--mono)', fontSize: 12, boxSizing: 'border-box' }
const sel = { ...inp }

const EMPTY_FC  = { name: '', address: '', city: '', state: '', zip: '', phone: '', website: '', is_integrated: false, notes: '' }
const EMPTY_LOC = { code: '', company_name: '', street: '', city: '', state: '', zip: '', country: 'US', notes: '' }

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

export default function DataLibrary() {
  const qc = useQueryClient()
  const [subTab, setSubTab] = useState('BROKERS')
  const [search, setSearch] = useState('')
  const [panel, setPanel] = useState(null)
  const [fcForm, setFcForm]   = useState(EMPTY_FC)
  const [locForm, setLocForm] = useState(EMPTY_LOC)

  const { data: brokers  = [] } = useQuery({ queryKey: ['dl-brokers',  search], queryFn: () => getDLBrokers(search),  enabled: subTab === 'BROKERS' })
  const { data: shippers = [] } = useQuery({ queryKey: ['dl-shippers', search], queryFn: () => getDLShippers(search), enabled: subTab === 'SHIPPERS / RECEIVERS' })
  const { data: factoringCos = [] } = useQuery({ queryKey: ['dl-factoring-cos'], queryFn: getDLFactoringCompanies, enabled: subTab === 'FACTORING COMPANIES' })
  const { data: locations = [] } = useQuery({ queryKey: ['dl-locations', search], queryFn: () => getDLLocations(search), enabled: subTab === 'LOCATIONS' })

  const createFC = useMutation({ mutationFn: createDLFactoringCompany, onSuccess: () => { qc.invalidateQueries(['dl-factoring-cos']); setPanel(null) } })
  const updateFC = useMutation({ mutationFn: ({ id, data }) => updateDLFactoringCompany(id, data), onSuccess: () => { qc.invalidateQueries(['dl-factoring-cos']); setPanel(null) } })
  const deleteFC = useMutation({ mutationFn: deleteDLFactoringCompany, onSuccess: () => { qc.invalidateQueries(['dl-factoring-cos']); setPanel(null) } })

  const createLoc = useMutation({ mutationFn: createDLLocation, onSuccess: () => { qc.invalidateQueries(['dl-locations']); setPanel(null) } })
  const updateLoc = useMutation({ mutationFn: ({ id, data }) => updateDLLocation(id, data), onSuccess: () => { qc.invalidateQueries(['dl-locations']); setPanel(null) } })
  const deleteLoc = useMutation({ mutationFn: deleteDLLocation, onSuccess: () => { qc.invalidateQueries(['dl-locations']); setPanel(null) } })

  const saveFC = () => {
    panel === 'new-fc' ? createFC.mutate(fcForm) : updateFC.mutate({ id: panel.id, data: fcForm })
  }
  const saveLoc = () => {
    panel === 'new-loc' ? createLoc.mutate(locForm) : updateLoc.mutate({ id: panel.id, data: locForm })
  }

  const switchTab = (t) => { setSubTab(t); setSearch(''); setPanel(null) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 89px)', position: 'relative' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid var(--line)', background: 'var(--bg-elev)', flexShrink: 0 }}>
        <span className="t-tiny t-up" style={{ color: 'var(--amber)', letterSpacing: '0.12em' }}>· DATA LIBRARY</span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Search */}
          {['BROKERS', 'SHIPPERS / RECEIVERS', 'LOCATIONS'].includes(subTab) && (
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              style={{ ...inp, width: 200, padding: '5px 10px' }}
            />
          )}
          {subTab === 'FACTORING COMPANIES' && (
            <button className="btn primary" style={{ padding: '6px 14px', fontSize: 11 }} onClick={() => { setFcForm(EMPTY_FC); setPanel('new-fc') }}>+ NEW</button>
          )}
          {subTab === 'LOCATIONS' && (
            <button className="btn primary" style={{ padding: '6px 14px', fontSize: 11 }} onClick={() => { setLocForm(EMPTY_LOC); setPanel('new-loc') }}>+ NEW LOCATION</button>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'var(--bg)', flexShrink: 0 }}>
        {SUB_TABS.map(t => (
          <div key={t} onClick={() => switchTab(t)} style={{
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

        {/* BROKERS */}
        {subTab === 'BROKERS' && (
          brokers.length === 0
            ? <Empty text="NO BROKERS. ADD PARTNERS WITH TYPE 'BROKER' IN THE PARTNERS TAB." />
            : <table className="tbl">
                <thead><tr><th>NAME</th><th>ADDRESS</th><th>PHONE</th><th>MC</th><th>DOT</th></tr></thead>
                <tbody>
                  {brokers.map(p => (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--amber)', fontSize: 11 }}>{p.name}</td>
                      <td style={{ fontSize: 10, color: 'var(--ink-dim)' }}>{p.address || '—'}</td>
                      <td style={{ fontSize: 11 }}>{p.phone || '—'}</td>
                      <td style={{ fontSize: 11, fontFamily: 'var(--mono)' }}>{p.mc_number || '—'}</td>
                      <td style={{ fontSize: 11, fontFamily: 'var(--mono)' }}>{p.dot_number || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
        )}

        {/* SHIPPERS / RECEIVERS */}
        {subTab === 'SHIPPERS / RECEIVERS' && (
          shippers.length === 0
            ? <Empty text="NO SHIPPERS/RECEIVERS. ADD PARTNERS WITH TYPE 'SHIPPER/RECEIVER' IN THE PARTNERS TAB." />
            : <table className="tbl">
                <thead><tr><th>NAME</th><th>ADDRESS</th><th>PHONE</th><th>MC</th></tr></thead>
                <tbody>
                  {shippers.map(p => (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--amber)', fontSize: 11 }}>{p.name}</td>
                      <td style={{ fontSize: 10, color: 'var(--ink-dim)' }}>{p.address || '—'}</td>
                      <td style={{ fontSize: 11 }}>{p.phone || '—'}</td>
                      <td style={{ fontSize: 11, fontFamily: 'var(--mono)' }}>{p.mc_number || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
        )}

        {/* FACTORING COMPANIES */}
        {subTab === 'FACTORING COMPANIES' && (
          factoringCos.length === 0
            ? <Empty text="NO FACTORING COMPANIES ADDED." />
            : <table className="tbl">
                <thead><tr><th>NAME</th><th>ADDRESS</th><th>PHONE</th><th>WEBSITE</th><th>INTEGRATED</th><th></th></tr></thead>
                <tbody>
                  {factoringCos.map(f => (
                    <tr key={f.id} style={{ cursor: 'pointer' }} onClick={() => { setFcForm({ ...f }); setPanel(f) }}>
                      <td style={{ color: 'var(--amber)', fontSize: 11 }}>{f.name}</td>
                      <td style={{ fontSize: 10, color: 'var(--ink-dim)' }}>{f.address || '—'}</td>
                      <td style={{ fontSize: 11 }}>{f.phone || '—'}</td>
                      <td style={{ fontSize: 10, color: 'var(--ink-dim)' }}>{f.website || '—'}</td>
                      <td><span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: f.is_integrated ? 'var(--green)' : 'var(--ink-mute)' }}>{f.is_integrated ? 'YES' : 'NO'}</span></td>
                      <td style={{ color: 'var(--ink-mute)', fontFamily: 'var(--mono)' }}>›</td>
                    </tr>
                  ))}
                </tbody>
              </table>
        )}

        {/* LOCATIONS */}
        {subTab === 'LOCATIONS' && (
          locations.length === 0
            ? <Empty text="NO LOCATIONS SAVED." />
            : <table className="tbl">
                <thead><tr><th>CODE</th><th>COMPANY</th><th>ADDRESS</th><th>COUNTRY</th><th></th></tr></thead>
                <tbody>
                  {locations.map(l => (
                    <tr key={l.id} style={{ cursor: 'pointer' }} onClick={() => { setLocForm({ ...l }); setPanel(l) }}>
                      <td style={{ color: 'var(--amber)', fontFamily: 'var(--mono)', fontSize: 12 }}>{l.code}</td>
                      <td style={{ fontSize: 11 }}>{l.company_name || '—'}</td>
                      <td style={{ fontSize: 10, color: 'var(--ink-dim)' }}>{l.address || '—'}</td>
                      <td style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-mute)' }}>{l.country || 'US'}</td>
                      <td style={{ color: 'var(--ink-mute)', fontFamily: 'var(--mono)' }}>›</td>
                    </tr>
                  ))}
                </tbody>
              </table>
        )}
      </div>

      {/* PANELS */}
      {panel && (
        <div style={{ position: 'fixed', inset: 0, background: '#00000077', zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 600, background: 'var(--panel)', borderLeft: '1px solid var(--line-strong)', display: 'flex', flexDirection: 'column', height: '100%' }}>

            {/* Factoring Company Panel */}
            {(panel === 'new-fc' || panel?.website !== undefined) && (
              <>
                <PanelHeader title={panel === 'new-fc' ? '· NEW FACTORING COMPANY' : `· ${panel.name}`} onClose={() => setPanel(null)} />
                <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <L>Company Name *</L>
                      <input value={fcForm.name} onChange={e => setFcForm(f => ({ ...f, name: e.target.value }))} style={inp} />
                    </div>
                    <div>
                      <L>Phone</L>
                      <input value={fcForm.phone || ''} onChange={e => setFcForm(f => ({ ...f, phone: e.target.value }))} style={inp} />
                    </div>
                    <div>
                      <L>Website</L>
                      <input value={fcForm.website || ''} onChange={e => setFcForm(f => ({ ...f, website: e.target.value }))} style={inp} placeholder="https://..." />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <L>Address</L>
                      <input value={fcForm.address || ''} onChange={e => setFcForm(f => ({ ...f, address: e.target.value }))} style={inp} />
                    </div>
                    <div>
                      <L>City</L>
                      <input value={fcForm.city || ''} onChange={e => setFcForm(f => ({ ...f, city: e.target.value }))} style={inp} />
                    </div>
                    <div>
                      <L>State</L>
                      <select value={fcForm.state || ''} onChange={e => setFcForm(f => ({ ...f, state: e.target.value }))} style={sel}>
                        <option value="">—</option>
                        {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <L>ZIP</L>
                      <input value={fcForm.zip || ''} onChange={e => setFcForm(f => ({ ...f, zip: e.target.value }))} style={inp} />
                    </div>
                    <div>
                      <L>Integrated</L>
                      <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                        {[['Yes', true], ['No', false]].map(([lbl, v]) => (
                          <label key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer', color: fcForm.is_integrated === v ? 'var(--amber)' : 'var(--ink-mute)' }}>
                            <input type="radio" checked={fcForm.is_integrated === v} onChange={() => setFcForm(f => ({ ...f, is_integrated: v }))} />{lbl}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <L>Notes</L>
                      <textarea value={fcForm.notes || ''} onChange={e => setFcForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inp, height: 80, resize: 'vertical' }} />
                    </div>
                  </div>
                </div>
                <PanelFooter
                  onSave={saveFC}
                  saveDisabled={!fcForm.name}
                  saveLabel={panel === 'new-fc' ? '+ CREATE' : '▸ SAVE CHANGES'}
                  onDelete={panel !== 'new-fc' ? () => deleteFC.mutate(panel.id) : null}
                  onClose={() => setPanel(null)}
                />
              </>
            )}

            {/* Location Panel */}
            {(panel === 'new-loc' || panel?.code !== undefined) && (
              <>
                <PanelHeader title={panel === 'new-loc' ? '· CREATE LOCATION' : `· ${panel.code}`} onClose={() => setPanel(null)} />
                <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <L>Code *</L>
                      <input value={locForm.code} onChange={e => setLocForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} style={inp} placeholder="e.g. ABE2" />
                    </div>
                    <div>
                      <L>Company</L>
                      <input value={locForm.company_name || ''} onChange={e => setLocForm(f => ({ ...f, company_name: e.target.value }))} style={inp} placeholder="e.g. Amazon Fulfillment" />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <L>Street</L>
                      <input value={locForm.street || ''} onChange={e => setLocForm(f => ({ ...f, street: e.target.value }))} style={inp} />
                    </div>
                    <div>
                      <L>City *</L>
                      <input value={locForm.city || ''} onChange={e => setLocForm(f => ({ ...f, city: e.target.value }))} style={inp} />
                    </div>
                    <div>
                      <L>State *</L>
                      <select value={locForm.state || ''} onChange={e => setLocForm(f => ({ ...f, state: e.target.value }))} style={sel}>
                        <option value="">—</option>
                        {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <L>ZIP</L>
                      <input value={locForm.zip || ''} onChange={e => setLocForm(f => ({ ...f, zip: e.target.value }))} style={inp} />
                    </div>
                    <div>
                      <L>Country</L>
                      <select value={locForm.country || 'US'} onChange={e => setLocForm(f => ({ ...f, country: e.target.value }))} style={sel}>
                        <option value="US">US</option>
                        <option value="CA">CA</option>
                        <option value="MX">MX</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <L>Notes</L>
                      <textarea value={locForm.notes || ''} onChange={e => setLocForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inp, height: 80, resize: 'vertical' }} />
                    </div>
                  </div>
                </div>
                <PanelFooter
                  onSave={saveLoc}
                  saveDisabled={!locForm.code || !locForm.city || !locForm.state}
                  saveLabel={panel === 'new-loc' ? '+ CREATE LOCATION' : '▸ SAVE CHANGES'}
                  onDelete={panel !== 'new-loc' ? () => deleteLoc.mutate(panel.id) : null}
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

function L({ children }) { return <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>{children}</div> }
