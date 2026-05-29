import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  getFuelCards, createFuelCard, updateFuelCard, deleteFuelCard,
  getFuelTransactions, createFuelTransaction, updateFuelTransaction, deleteFuelTransaction,
  getFuelSummary, getTrucks, getDrivers, getTrailers,
} from '../api'

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']
const PRODUCT_CODES = ['DEF', 'DIESEL', 'GASOLINE', 'REEFER', 'LUBRICANTS', 'OTHER']

const inp = { width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '7px 10px', fontFamily: 'var(--mono)', fontSize: 12, boxSizing: 'border-box' }
const sel = { ...inp }

const today = new Date().toISOString().slice(0, 10)

const EMPTY_CARD = { card_number: '', is_active: true, expiration_date: '', truck_id: '', driver_id: '', assigned_on: '', notes: '' }
const EMPTY_TX = { driver_id: '', fuel_card_id: '', truck_id: '', trailer_id: '', product_code: '', include_in_ifta: true, date: today, amount: '', gallons: '', city: '', state: '', zip: '', notes: '' }

export default function Fuel() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('cards')
  const [cardPanel, setCardPanel] = useState(null)   // null | 'new' | card-obj
  const [txPanel, setTxPanel] = useState(null)
  const [cardForm, setCardForm] = useState(EMPTY_CARD)
  const [txForm, setTxForm] = useState(EMPTY_TX)

  const { data: cards = [] }    = useQuery({ queryKey: ['fuel-cards'], queryFn: getFuelCards })
  const { data: txs = [] }      = useQuery({ queryKey: ['fuel-txs'], queryFn: getFuelTransactions })
  const { data: summary = {} }  = useQuery({ queryKey: ['fuel-summary'], queryFn: getFuelSummary })
  const { data: trucks = [] }   = useQuery({ queryKey: ['trucks'], queryFn: getTrucks })
  const { data: drivers = [] }  = useQuery({ queryKey: ['drivers'], queryFn: getDrivers })
  const { data: trailers = [] } = useQuery({ queryKey: ['trailers'], queryFn: getTrailers })

  const createCardMut  = useMutation({ mutationFn: createFuelCard,   onSuccess: () => { qc.invalidateQueries(['fuel-cards']); qc.invalidateQueries(['fuel-summary']); setCardPanel(null) } })
  const updateCardMut  = useMutation({ mutationFn: ({ id, data }) => updateFuelCard(id, data), onSuccess: () => { qc.invalidateQueries(['fuel-cards']); setCardPanel(null) } })
  const deleteCardMut  = useMutation({ mutationFn: deleteFuelCard, onSuccess: () => { qc.invalidateQueries(['fuel-cards']); qc.invalidateQueries(['fuel-summary']); setCardPanel(null) } })
  const createTxMut    = useMutation({ mutationFn: createFuelTransaction, onSuccess: () => { qc.invalidateQueries(['fuel-txs']); qc.invalidateQueries(['fuel-summary']); setTxPanel(null) } })
  const updateTxMut    = useMutation({ mutationFn: ({ id, data }) => updateFuelTransaction(id, data), onSuccess: () => { qc.invalidateQueries(['fuel-txs']); setTxPanel(null) } })
  const deleteTxMut    = useMutation({ mutationFn: deleteFuelTransaction, onSuccess: () => { qc.invalidateQueries(['fuel-txs']); qc.invalidateQueries(['fuel-summary']); setTxPanel(null) } })

  const openCard = (c) => { setCardForm({ ...EMPTY_CARD, ...c, truck_id: c.truck_id || '', driver_id: c.driver_id || '' }); setCardPanel(c) }
  const openTx   = (t) => { setTxForm({ ...EMPTY_TX, ...t, driver_id: t.driver_id || '', truck_id: t.truck_id || '', trailer_id: t.trailer_id || '', fuel_card_id: t.fuel_card_id || '' }); setTxPanel(t) }

  const saveCard = () => {
    const payload = { ...cardForm, truck_id: cardForm.truck_id ? parseInt(cardForm.truck_id) : null, driver_id: cardForm.driver_id ? parseInt(cardForm.driver_id) : null, expiration_date: cardForm.expiration_date || null, assigned_on: cardForm.assigned_on || null }
    if (cardPanel === 'new') createCardMut.mutate(payload)
    else updateCardMut.mutate({ id: cardPanel.id, data: payload })
  }
  const saveTx = () => {
    const payload = { ...txForm, driver_id: txForm.driver_id ? parseInt(txForm.driver_id) : null, truck_id: txForm.truck_id ? parseInt(txForm.truck_id) : null, trailer_id: txForm.trailer_id ? parseInt(txForm.trailer_id) : null, fuel_card_id: txForm.fuel_card_id ? parseInt(txForm.fuel_card_id) : null, amount: parseFloat(txForm.amount) || null, gallons: parseFloat(txForm.gallons) || null }
    if (txPanel === 'new') createTxMut.mutate(payload)
    else updateTxMut.mutate({ id: txPanel.id, data: payload })
  }

  const totalSpend = txs.reduce((s, t) => s + (t.amount || 0), 0)
  const totalGal   = txs.reduce((s, t) => s + (t.gallons || 0), 0)
  const avgPpg     = totalGal ? (totalSpend / totalGal) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 89px)', position: 'relative' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid var(--line)', background: 'var(--bg-elev)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {[['cards','FUEL CARDS'], ['transactions','FUEL TRANSACTIONS']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ padding: '7px 18px', background: 'none', border: 'none', borderBottom: tab === key ? '2px solid var(--amber)' : '2px solid transparent', color: tab === key ? 'var(--amber)' : 'var(--ink-mute)', fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 20 }}>
            <Stat label="ACTIVE CARDS" value={summary.active_cards ?? cards.filter(c => c.is_active).length} />
            <Stat label="TOTAL SPEND" value={`$${totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
            <Stat label="TOTAL GALLONS" value={`${totalGal.toFixed(1)} GAL`} />
            <Stat label="AVG $/GAL" value={avgPpg ? `$${avgPpg.toFixed(3)}` : '—'} />
          </div>
          <button className="btn primary" style={{ padding: '6px 14px', fontSize: 11 }}
            onClick={() => { if (tab === 'cards') { setCardForm(EMPTY_CARD); setCardPanel('new') } else { setTxForm(EMPTY_TX); setTxPanel('new') } }}>
            + {tab === 'cards' ? 'NEW CARD' : 'NEW TRANSACTION'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto' }}>

        {/* FUEL CARDS TABLE */}
        {tab === 'cards' && (
          cards.length === 0 ? <Empty text="NO FUEL CARDS REGISTERED" /> :
          <table className="tbl">
            <thead>
              <tr>
                <th>CARD NUMBER</th>
                <th>STATUS</th>
                <th>EXPIRATION DATE</th>
                <th>ASSIGNED TO</th>
                <th>ASSIGNED ON</th>
                <th>TRUCK</th>
                <th>NOTES</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {cards.map(c => (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => openCard(c)}>
                  <td><span className="t-display" style={{ color: 'var(--amber)' }}>{c.card_number}</span></td>
                  <td><span className={`tag ${c.is_active ? 'green' : 'red'}`}>{c.is_active ? 'ACTIVE' : 'INACTIVE'}</span></td>
                  <td style={{ fontSize: 11 }}>{c.expiration_date || '—'}</td>
                  <td style={{ fontSize: 11 }}>{c.driver_name || '—'}</td>
                  <td style={{ fontSize: 11 }}>{c.assigned_on || '—'}</td>
                  <td style={{ fontSize: 11 }}>{c.truck_unit || '—'}</td>
                  <td style={{ fontSize: 10, color: 'var(--ink-mute)' }}>{c.notes || '—'}</td>
                  <td style={{ color: 'var(--ink-mute)', fontFamily: 'var(--mono)' }}>›</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* FUEL TRANSACTIONS TABLE */}
        {tab === 'transactions' && (
          txs.length === 0 ? <Empty text="NO FUEL TRANSACTIONS" /> :
          <table className="tbl">
            <thead>
              <tr>
                <th>DATE</th>
                <th>FUEL CARD</th>
                <th>DRIVER</th>
                <th>TRUCK</th>
                <th>LOCATION</th>
                <th>PRODUCT</th>
                <th className="num">AMOUNT</th>
                <th className="num">GALLONS</th>
                <th>IFTA</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {txs.map(t => (
                <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => openTx(t)}>
                  <td style={{ fontSize: 11 }}>{t.date}</td>
                  <td style={{ fontSize: 10, color: 'var(--ink-dim)' }}>{t.fuel_card_number || '—'}</td>
                  <td style={{ fontSize: 11 }}>{t.driver_name || '—'}</td>
                  <td style={{ fontSize: 11, color: 'var(--amber)' }}>{t.truck_unit || '—'}</td>
                  <td style={{ fontSize: 10, color: 'var(--ink-dim)' }}>{[t.city, t.state].filter(Boolean).join(', ') || '—'}</td>
                  <td><span className="tag" style={{ fontSize: 9 }}>{t.product_code || 'DIESEL'}</span></td>
                  <td className="num" style={{ color: 'var(--green)' }}>{t.amount != null ? `$${t.amount.toFixed(2)}` : '—'}</td>
                  <td className="num">{t.gallons != null ? t.gallons.toFixed(1) : '—'}</td>
                  <td><span style={{ fontSize: 10, color: t.include_in_ifta ? 'var(--green)' : 'var(--ink-mute)' }}>{t.include_in_ifta ? '✓' : '—'}</span></td>
                  <td style={{ color: 'var(--ink-mute)', fontFamily: 'var(--mono)' }}>›</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* FUEL CARD PANEL */}
      {cardPanel && (
        <SlidePanel title={cardPanel === 'new' ? '· NEW FUEL CARD' : `· FUEL CARD — ${cardPanel.card_number}`}
          onClose={() => setCardPanel(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Label>Card Number *</Label>
              <input value={cardForm.card_number} onChange={e => setCardForm(f => ({ ...f, card_number: e.target.value }))} style={inp} />
            </div>
            <div>
              <Label>Status</Label>
              <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                {[['true','Active'], ['false','Inactive']].map(([val, lbl]) => (
                  <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: String(cardForm.is_active) === val ? 'var(--amber)' : 'var(--ink-mute)' }}>
                    <input type="radio" checked={String(cardForm.is_active) === val} onChange={() => setCardForm(f => ({ ...f, is_active: val === 'true' }))} />
                    {lbl}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Expiration Date</Label>
              <input type="date" value={cardForm.expiration_date || ''} onChange={e => setCardForm(f => ({ ...f, expiration_date: e.target.value }))} style={inp} />
            </div>
            <div>
              <Label>Assign Truck</Label>
              <select value={cardForm.truck_id || ''} onChange={e => setCardForm(f => ({ ...f, truck_id: e.target.value }))} style={sel}>
                <option value="">— None —</option>
                {trucks.map(t => <option key={t.id} value={t.id}>{t.unit_number}</option>)}
              </select>
            </div>
            <div>
              <Label>Assign Driver</Label>
              <select value={cardForm.driver_id || ''} onChange={e => setCardForm(f => ({ ...f, driver_id: e.target.value }))} style={sel}>
                <option value="">— None —</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Assigned On</Label>
              <input type="date" value={cardForm.assigned_on || ''} onChange={e => setCardForm(f => ({ ...f, assigned_on: e.target.value }))} style={inp} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Label>Notes</Label>
              <textarea value={cardForm.notes || ''} onChange={e => setCardForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inp, minHeight: 64, resize: 'vertical' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={saveCard} disabled={!cardForm.card_number} className="btn primary" style={{ flex: 1, justifyContent: 'center', padding: 10 }}>
              {cardPanel === 'new' ? '+ ADD CARD' : '▸ SAVE CHANGES'}
            </button>
            {cardPanel !== 'new' && (
              <button onClick={() => deleteCardMut.mutate(cardPanel.id)} className="btn" style={{ padding: '10px 14px', color: 'var(--red)', border: '1px solid var(--red)' }}>
                DEACTIVATE
              </button>
            )}
          </div>
        </SlidePanel>
      )}

      {/* FUEL TRANSACTION PANEL */}
      {txPanel && (
        <SlidePanel title={txPanel === 'new' ? '· NEW FUEL TRANSACTION' : `· EDIT TRANSACTION — ${txPanel.date}`}
          onClose={() => setTxPanel(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <Label>Driver</Label>
              <select value={txForm.driver_id || ''} onChange={e => setTxForm(f => ({ ...f, driver_id: e.target.value }))} style={sel}>
                <option value="">— None —</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Product Code</Label>
              <select value={txForm.product_code || ''} onChange={e => setTxForm(f => ({ ...f, product_code: e.target.value }))} style={sel}>
                <option value="">— Select —</option>
                {PRODUCT_CODES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', color: txForm.include_in_ifta ? 'var(--green)' : 'var(--ink-mute)', paddingBottom: 8 }}>
                <input type="checkbox" checked={txForm.include_in_ifta} onChange={e => setTxForm(f => ({ ...f, include_in_ifta: e.target.checked }))} />
                Include in IFTA
              </label>
            </div>
            <div>
              <Label>Date *</Label>
              <input type="date" value={txForm.date} onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))} style={inp} />
            </div>
            <div>
              <Label>Amount ($) *</Label>
              <input type="number" step="0.01" value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))} style={inp} />
            </div>
            <div>
              <Label>Gallons *</Label>
              <input type="number" step="0.001" value={txForm.gallons} onChange={e => setTxForm(f => ({ ...f, gallons: e.target.value }))} style={inp} />
            </div>
            <div>
              <Label>Truck</Label>
              <select value={txForm.truck_id || ''} onChange={e => setTxForm(f => ({ ...f, truck_id: e.target.value }))} style={sel}>
                <option value="">— None —</option>
                {trucks.map(t => <option key={t.id} value={t.id}>{t.unit_number}</option>)}
              </select>
            </div>
            <div>
              <Label>Trailer</Label>
              <select value={txForm.trailer_id || ''} onChange={e => setTxForm(f => ({ ...f, trailer_id: e.target.value }))} style={sel}>
                <option value="">— None —</option>
                {trailers.map(t => <option key={t.id} value={t.id}>{t.unit_number}</option>)}
              </select>
            </div>
            <div>
              <Label>Fuel Card</Label>
              <select value={txForm.fuel_card_id || ''} onChange={e => setTxForm(f => ({ ...f, fuel_card_id: e.target.value }))} style={sel}>
                <option value="">— None —</option>
                {cards.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.card_number}</option>)}
              </select>
            </div>
            <div>
              <Label>City</Label>
              <input value={txForm.city || ''} onChange={e => setTxForm(f => ({ ...f, city: e.target.value }))} style={inp} />
            </div>
            <div>
              <Label>State *</Label>
              <select value={txForm.state || ''} onChange={e => setTxForm(f => ({ ...f, state: e.target.value }))} style={sel}>
                <option value="">—</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <Label>ZIP</Label>
              <input value={txForm.zip || ''} onChange={e => setTxForm(f => ({ ...f, zip: e.target.value }))} style={inp} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Label>Notes</Label>
              <textarea value={txForm.notes || ''} onChange={e => setTxForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inp, minHeight: 56, resize: 'vertical' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={saveTx} disabled={!txForm.date} className="btn primary" style={{ flex: 1, justifyContent: 'center', padding: 10 }}>
              {txPanel === 'new' ? '+ ADD TRANSACTION' : '▸ SAVE CHANGES'}
            </button>
            {txPanel !== 'new' && (
              <button onClick={() => deleteTxMut.mutate(txPanel.id)} className="btn" style={{ padding: '10px 14px', color: 'var(--red)', border: '1px solid var(--red)' }}>
                DELETE
              </button>
            )}
          </div>
        </SlidePanel>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 15, color: 'var(--ink)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--ink-mute)', fontFamily: 'var(--mono)', marginTop: 2, letterSpacing: '0.08em' }}>{label}</div>
    </div>
  )
}

function Label({ children }) {
  return <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>{children}</div>
}

function Empty({ text }) {
  return <div style={{ padding: 32, color: 'var(--ink-mute)', fontSize: 11, fontFamily: 'var(--mono)' }}>{text}</div>
}

function SlidePanel({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000077', zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ width: 720, background: 'var(--panel)', borderLeft: '1px solid var(--line-strong)', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
          <span className="t-tiny t-up t-dim">{title}</span>
          <button onClick={onClose} className="btn" style={{ padding: '3px 8px' }}>✕ CLOSE</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
