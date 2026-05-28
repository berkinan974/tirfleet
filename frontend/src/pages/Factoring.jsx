import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFactoring, getFactoringSummary, getUninvoicedLoads, createFactoring, updateFactoring } from '../api'
import { useState } from 'react'
import Ticker from '../components/Ticker'

const STATUS_MAP = {
  pending:  ['amber', 'PENDING'],
  approved: ['green', 'APPROVED'],
  paid:     ['green', 'PAID'],
}

export default function Factoring() {
  const qc = useQueryClient()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState({ load_id: '', invoice_number: '', invoice_amount: '', factoring_fee_pct: '3.5' })

  const { data: records = [] } = useQuery({ queryKey: ['factoring'], queryFn: getFactoring })
  const { data: fsum = {} } = useQuery({ queryKey: ['factoringSummary'], queryFn: getFactoringSummary })
  const { data: uninvoiced = [] } = useQuery({ queryKey: ['uninvoiced'], queryFn: getUninvoicedLoads })

  const createMut = useMutation({
    mutationFn: createFactoring,
    onSuccess: () => {
      qc.invalidateQueries(['factoring'])
      qc.invalidateQueries(['factoringSummary'])
      qc.invalidateQueries(['uninvoiced'])
      setShowCreateForm(false)
      setCreateForm({ load_id: '', invoice_number: '', invoice_amount: '', factoring_fee_pct: '3.5' })
    }
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateFactoring(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['factoring'])
      qc.invalidateQueries(['factoringSummary'])
    }
  })

  const pending = records.filter(r => !r.submitted_to_rts)
  const submitted = records.filter(r => r.submitted_to_rts && r.rts_status !== 'paid')
  const paid = records.filter(r => r.rts_status === 'paid')

  const tickerItems = [
    { t: 'RTS',      body: `FACTORING · ${records.length} INVOICES TOTAL`, tone: 'amber' },
    { t: 'PENDING',  body: `$${(fsum.pending_amount ?? 0).toLocaleString()} · ${pending.length} INVOICES`, tone: pending.length > 0 ? 'amber' : '' },
    { t: 'PAID',     body: `$${(fsum.paid_amount ?? 0).toLocaleString()} RECEIVED` , tone: 'green' },
    { t: 'FEES',     body: `$${(fsum.fee_total ?? 0).toFixed(0)} TOTAL FACTORING FEE @ 3.5%` },
  ]

  const inputStyle = { width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '7px 10px', fontFamily: 'var(--mono)', fontSize: 12, boxSizing: 'border-box' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 89px)' }}>
      <Ticker items={tickerItems} />

      {/* Pipeline buckets */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'var(--panel)', flexShrink: 0 }}>
        {[
          { label: 'Uninvoiced · Delivered', n: uninvoiced.length, rev: `$${uninvoiced.reduce((s,l) => s+(l.rate||0), 0).toLocaleString()}`, tone: uninvoiced.length > 0 ? 'amber' : 'default' },
          { label: 'Pending · Not Submitted', n: pending.length, rev: `$${(fsum.pending_amount ?? 0).toLocaleString()}`, tone: pending.length > 0 ? 'amber' : 'default' },
          { label: 'Submitted to RTS', n: submitted.length, rev: `$${(fsum.submitted_amount ?? 0).toLocaleString()}`, tone: submitted.length > 0 ? 'default' : 'default' },
          { label: 'Paid · Received', n: paid.length, rev: `$${(fsum.paid_amount ?? 0).toLocaleString()}`, tone: 'green' },
        ].map((b, i) => {
          const c = b.tone === 'amber' ? 'var(--amber)' : b.tone === 'green' ? 'var(--green)' : 'var(--ink)'
          return (
            <div key={i} style={{ flex: 1, padding: '12px 16px', borderRight: i < 3 ? '1px solid var(--line)' : '0' }}>
              <span className="t-tiny t-up t-mute">{b.label}</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 6 }}>
                <span className="t-num" style={{ fontSize: 32, color: c, lineHeight: 1 }}>{String(b.n).padStart(2,'0')}</span>
                <span className="t-dim t-tiny">{b.rev}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', minHeight: 0, overflow: 'hidden' }}>

        {/* Invoice table */}
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line)', overflow: 'hidden' }}>
          <div className="panel-head" style={{ padding: '10px 16px' }}>
            <span>· INVOICE LEDGER · {records.length} RECORDS</span>
            <span className="ph-r" style={{ cursor: 'pointer', color: 'var(--amber)' }} onClick={() => setShowCreateForm(true)}>+ NEW INVOICE</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {records.length === 0 ? (
              <div style={{ padding: 24, color: 'var(--ink-mute)', fontSize: 11 }}>NO INVOICES YET — CREATE FROM A DELIVERED LOAD</div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Load</th>
                    <th>Broker · Lane</th>
                    <th className="num">Amount</th>
                    <th className="num">Fee</th>
                    <th className="num">Net</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => {
                    const [tone, label] = STATUS_MAP[r.rts_status] || ['', r.rts_status?.toUpperCase()]
                    const feeAmt = (r.invoice_amount || 0) * (r.factoring_fee_pct || 3.5) / 100
                    return (
                      <tr key={r.id}>
                        <td><div className="t-mono">{r.invoice_number || `INV-${String(r.id).padStart(4,'0')}`}</div></td>
                        <td><div className="t-mono">{r.load_number}</div></td>
                        <td>
                          <div>{r.broker}</div>
                          <div className="t-tiny t-mute">{r.lane}</div>
                        </td>
                        <td className="num">${(r.invoice_amount || 0).toLocaleString()}</td>
                        <td className="num" style={{ color: 'var(--red)' }}>-${feeAmt.toFixed(0)}</td>
                        <td className="num" style={{ color: 'var(--green)' }}>${(r.net_amount || 0).toLocaleString()}</td>
                        <td><span className={`tag ${tone}`}>{r.submitted_to_rts ? label : 'DRAFT'}</span></td>
                        <td>
                          {!r.submitted_to_rts && (
                            <button className="btn primary" style={{ padding: '2px 8px', fontSize: 9 }}
                              onClick={() => updateMut.mutate({ id: r.id, data: { submitted_to_rts: true, rts_status: 'pending' } })}>
                              ▸ SUBMIT RTS
                            </button>
                          )}
                          {r.submitted_to_rts && r.rts_status !== 'paid' && (
                            <button className="btn" style={{ padding: '2px 8px', fontSize: 9 }}
                              onClick={() => updateMut.mutate({ id: r.id, data: { rts_status: 'paid', paid_at: new Date().toISOString() } })}>
                              ✓ MARK PAID
                            </button>
                          )}
                          {r.rts_status === 'paid' && <span className="t-tiny t-mute">{r.paid_at?.slice(0,10)}</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right — Uninvoiced loads */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="panel-head" style={{ padding: '10px 16px' }}>
            <span>· READY TO INVOICE</span>
            <span className="ph-r">{uninvoiced.length} LOADS</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {uninvoiced.length === 0 && (
              <div style={{ padding: 14, color: 'var(--ink-mute)', fontSize: 11 }}>ALL DELIVERED LOADS INVOICED</div>
            )}
            {uninvoiced.map(l => (
              <div key={l.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="t-mono" style={{ fontSize: 12, color: 'var(--ink)' }}>{l.load_number}</div>
                    <div className="t-tiny t-dim" style={{ marginTop: 2 }}>{l.broker_name}</div>
                    <div className="t-tiny t-mute" style={{ marginTop: 2 }}>{l.origin} → {l.destination}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--green)', fontSize: 12 }}>${(l.rate || 0).toLocaleString()}</div>
                    <button className="btn primary" style={{ marginTop: 6, padding: '2px 8px', fontSize: 9 }}
                      onClick={() => {
                        setCreateForm({ load_id: String(l.id), invoice_number: '', invoice_amount: String(l.rate || ''), factoring_fee_pct: '3.5' })
                        setShowCreateForm(true)
                      }}>
                      + INVOICE
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--line)', padding: '12px 16px', background: 'var(--bg-elev)', flexShrink: 0 }}>
            <div className="t-tiny t-up t-mute" style={{ marginBottom: 8 }}>RTS FACTORING INFO</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
              <span className="t-mute">Rate</span>       <span className="t-dim">3.5% standard</span>
              <span className="t-mute">Payment</span>    <span className="t-dim">24-48h ACH</span>
              <span className="t-mute">Portal</span>     <span className="t-dim" style={{ cursor: 'pointer', color: 'var(--amber)' }} onClick={() => window.open('https://app.rtsfactoring.com', '_blank')}>app.rtsfactoring.com ›</span>
            </div>
          </div>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showCreateForm && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000bb', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line-strong)', padding: 24, width: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
              <span className="t-tiny t-up t-dim">· NEW INVOICE</span>
              <button onClick={() => setShowCreateForm(false)} className="btn" style={{ padding: '3px 8px' }}>✕ CLOSE</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>Load</div>
                <select value={createForm.load_id} onChange={e => {
                  const l = uninvoiced.find(x => String(x.id) === e.target.value)
                  setCreateForm(f => ({ ...f, load_id: e.target.value, invoice_amount: l ? String(l.rate || '') : f.invoice_amount }))
                }} style={inputStyle}>
                  <option value="">— SELECT DELIVERED LOAD —</option>
                  {uninvoiced.map(l => <option key={l.id} value={l.id}>{l.load_number} · {l.origin} → {l.destination} · ${l.rate}</option>)}
                </select>
              </div>
              {[['invoice_number','Invoice # (opt)'], ['invoice_amount','Amount ($)'], ['factoring_fee_pct','Fee %']].map(([key, label]) => (
                <div key={key}>
                  <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>{label}</div>
                  <input value={createForm[key]} onChange={e => setCreateForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
                </div>
              ))}
              {createForm.invoice_amount && createForm.factoring_fee_pct && (
                <div style={{ gridColumn: '1/-1', padding: '8px 10px', background: 'var(--bg-elev)', border: '1px solid var(--line)', fontSize: 11 }}>
                  <span className="t-mute">Net received: </span>
                  <span style={{ color: 'var(--green)' }}>
                    ${(parseFloat(createForm.invoice_amount) * (1 - parseFloat(createForm.factoring_fee_pct) / 100)).toFixed(2)}
                  </span>
                  <span className="t-mute"> · Fee: </span>
                  <span style={{ color: 'var(--red)' }}>
                    ${(parseFloat(createForm.invoice_amount) * parseFloat(createForm.factoring_fee_pct) / 100).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
            <button onClick={() => createMut.mutate({ load_id: parseInt(createForm.load_id), invoice_number: createForm.invoice_number || null, invoice_amount: parseFloat(createForm.invoice_amount), factoring_fee_pct: parseFloat(createForm.factoring_fee_pct) })}
              disabled={!createForm.load_id || !createForm.invoice_amount || createMut.isPending}
              className="btn primary" style={{ marginTop: 20, width: '100%', justifyContent: 'center', padding: 10 }}>
              ▸ CREATE INVOICE
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
