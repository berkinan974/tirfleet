import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getIftaSummary, getIftaFuelByState, getDrivers } from '../api'
import Ticker from '../components/Ticker'

const CURRENT_YEAR = new Date().getFullYear()
const CURRENT_Q    = Math.ceil((new Date().getMonth() + 1) / 3)

const US_FUEL_TAX = {
  AL: 0.290, AK: 0.087, AZ: 0.260, AR: 0.285, CA: 0.800, CO: 0.205, CT: 0.402,
  DE: 0.220, FL: 0.355, GA: 0.325, HI: 0.160, ID: 0.330, IL: 0.462, IN: 0.530,
  IA: 0.325, KS: 0.260, KY: 0.246, LA: 0.200, ME: 0.312, MD: 0.373, MA: 0.240,
  MI: 0.263, MN: 0.285, MS: 0.182, MO: 0.170, MT: 0.275, NE: 0.246, NV: 0.270,
  NH: 0.222, NJ: 0.410, NM: 0.210, NY: 0.451, NC: 0.385, ND: 0.230, OH: 0.385,
  OK: 0.190, OR: 0.368, PA: 0.741, RI: 0.340, SC: 0.220, SD: 0.280, TN: 0.270,
  TX: 0.200, UT: 0.245, VT: 0.320, VA: 0.262, WA: 0.494, WV: 0.357, WI: 0.329,
  WY: 0.240,
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const SURCHARGE_STATES = ['KY', 'NM', 'OR', 'NY', 'CT']

const sel = { background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '5px 8px', fontFamily: 'var(--mono)', fontSize: 11 }
const inp = { ...sel, width: 110 }

const SUB_TABS = ['IFTA', 'KY / NM / OR / NY / CT', 'MILES & FUEL BY STATE']

// ── Shared period controls ──────────────────────────────────────────
function PeriodControls({ year, setYear, periodType, setPeriodType, quarter, setQuarter, month, setMonth, groupBy, setGroupBy, driverId, setDriverId, drivers, showGroupBy = true, showDriver = true }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, padding: '12px 16px', borderBottom: '1px solid var(--line)', background: 'var(--bg-elev)', alignItems: 'center', flexShrink: 0 }}>

      {/* Period type */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span className="t-tiny t-up t-mute">PERIOD</span>
        {['quarter', 'month'].map(v => (
          <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, cursor: 'pointer', color: periodType === v ? 'var(--amber)' : 'var(--ink-mute)' }}>
            <input type="radio" checked={periodType === v} onChange={() => setPeriodType(v)} />
            {v === 'quarter' ? 'By Quarter' : 'By Month'}
          </label>
        ))}
      </div>

      {/* Year */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span className="t-tiny t-up t-mute">YEAR</span>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={sel}>
          {[CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Quarter or Month */}
      {periodType === 'quarter' ? (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className="t-tiny t-up t-mute">QUARTER</span>
          {[1, 2, 3, 4].map(q => (
            <button key={q} onClick={() => setQuarter(q)} className={quarter === q ? 'btn primary' : 'btn'} style={{ padding: '3px 10px', fontSize: 11 }}>Q{q}</button>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="t-tiny t-up t-mute">MONTH</span>
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} style={sel}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
      )}

      {/* Group by */}
      {showGroupBy && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="t-tiny t-up t-mute">REPORT</span>
          {['state', 'driver', 'truck'].map(v => (
            <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, cursor: 'pointer', color: groupBy === v ? 'var(--amber)' : 'var(--ink-mute)' }}>
              <input type="radio" checked={groupBy === v} onChange={() => setGroupBy(v)} />
              by {v}
            </label>
          ))}
        </div>
      )}

      {/* Driver filter */}
      {showDriver && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="t-tiny t-up t-mute">DRIVER</span>
          <select value={driverId || ''} onChange={e => setDriverId(e.target.value || null)} style={sel}>
            <option value="">All drivers</option>
            {(drivers || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      )}
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────
export default function IFTA() {
  const [subTab, setSubTab] = useState('IFTA')

  // Shared state
  const [year, setYear]           = useState(CURRENT_YEAR)
  const [quarter, setQuarter]     = useState(CURRENT_Q)
  const [periodType, setPeriodType] = useState('quarter')
  const [month, setMonth]         = useState(new Date().getMonth() + 1)
  const [groupBy, setGroupBy]     = useState('state')
  const [driverId, setDriverId]   = useState(null)

  // KY/NM/OR/NY/CT custom rates
  const [rates, setRates] = useState({ KY: '', NM: '', OR: '', NY: '', CT: '' })

  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: () => import('../api').then(m => m.getDrivers()) })

  const iftaParams = { year, quarter: periodType === 'quarter' ? quarter : undefined, period_type: periodType, month: periodType === 'month' ? month : undefined, group_by: groupBy, driver_id: driverId || undefined }
  const fuelParams = { year, quarter: periodType === 'quarter' ? quarter : undefined, period_type: periodType, month: periodType === 'month' ? month : undefined, driver_id: driverId || undefined }

  const { data: iftaData, isLoading: iftaLoading } = useQuery({ queryKey: ['ifta', iftaParams], queryFn: () => getIftaSummary(iftaParams) })
  const { data: fuelData, isLoading: fuelLoading } = useQuery({ queryKey: ['ifta-fuel', fuelParams], queryFn: () => getIftaFuelByState(fuelParams), enabled: subTab === 'MILES & FUEL BY STATE' })

  const states    = iftaData?.states    || []
  const groupRows = iftaData?.rows      || []
  const totalMiles = iftaData?.total_miles || 0

  const totalTax = states.reduce((s, r) => {
    const rate = US_FUEL_TAX[r.state] || 0
    return s + (r.miles / 6.5) * rate
  }, 0)

  const periodLabel = periodType === 'quarter' ? `Q${quarter} ${year}` : `${MONTHS[month - 1]} ${year}`

  const tickerItems = [
    { t: 'IFTA', body: `${periodLabel} · ${iftaData?.loads_count ?? 0} LOADS · ${totalMiles.toLocaleString()} MI TOTAL`, tone: 'amber' },
    { t: 'NOTE', body: 'MILES ESTIMATED 50/50 ORIGIN→DEST · VERIFY BEFORE FILING' },
    { t: 'TAX',  body: `EST. FUEL TAX LIABILITY: $${totalTax.toFixed(0)} (6.5 MPG ASSUMPTION)` },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 89px)' }}>
      <Ticker items={tickerItems} />

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

      {/* ── Tab 1: IFTA ── */}
      {subTab === 'IFTA' && (
        <>
          <PeriodControls {...{ year, setYear, periodType, setPeriodType, quarter, setQuarter, month, setMonth, groupBy, setGroupBy, driverId, setDriverId, drivers }} />

          {/* Summary bar */}
          <div style={{ display: 'flex', gap: 32, padding: '8px 16px', background: 'var(--panel)', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
            <span className="t-tiny t-up t-mute">· IFTA MILEAGE SUMMARY · {periodLabel}</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 24 }}>
              <SummaryItem label="TOTAL MILES" value={(totalMiles).toLocaleString()} color="var(--amber)" />
              <SummaryItem label="EST. TAX"    value={`$${totalTax.toFixed(0)}`}       color="var(--red)" />
              <SummaryItem label="LOADS"       value={iftaData?.loads_count ?? 0} />
            </div>
          </div>

          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 320px', minHeight: 0, overflow: 'hidden' }}>

            {/* Table */}
            <div style={{ borderRight: '1px solid var(--line)', overflow: 'auto' }}>
              {iftaLoading ? (
                <div style={{ padding: 24, color: 'var(--ink-mute)', fontSize: 11 }}>LOADING...</div>
              ) : groupBy === 'state' ? (
                states.length === 0
                  ? <div style={{ padding: 24, color: 'var(--ink-mute)', fontSize: 11 }}>NO LOADS WITH MILEAGE FOR {periodLabel}.</div>
                  : <table className="tbl">
                      <thead><tr><th>STATE</th><th className="num">MILES</th><th className="num">% TOTAL</th><th className="num">TAX RATE</th><th className="num">GALLONS</th><th className="num">EST. TAX</th></tr></thead>
                      <tbody>
                        {states.map(row => {
                          const pct = totalMiles ? ((row.miles / totalMiles) * 100).toFixed(1) : '0.0'
                          const rate = US_FUEL_TAX[row.state]
                          const gallons = row.miles / 6.5
                          const tax = rate ? gallons * rate : null
                          return (
                            <tr key={row.state}>
                              <td><span className="tag amber" style={{ fontSize: 9, minWidth: 28, textAlign: 'center' }}>{row.state}</span></td>
                              <td className="num">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                                  <div style={{ width: 60, height: 3, background: 'var(--line)' }}>
                                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--amber)' }} />
                                  </div>
                                  <span className="t-mono">{row.miles.toLocaleString()}</span>
                                </div>
                              </td>
                              <td className="num t-mute">{pct}%</td>
                              <td className="num">{rate ? `$${rate.toFixed(3)}` : <span className="t-mute">—</span>}</td>
                              <td className="num t-dim">{Math.round(gallons).toLocaleString()}</td>
                              <td className="num" style={{ color: tax ? 'var(--red)' : 'var(--ink-mute)' }}>{tax ? `$${tax.toFixed(0)}` : '—'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
              ) : (
                groupRows.length === 0
                  ? <div style={{ padding: 24, color: 'var(--ink-mute)', fontSize: 11 }}>NO DATA FOR {periodLabel}.</div>
                  : <table className="tbl">
                      <thead><tr><th>{groupBy === 'driver' ? 'DRIVER' : 'TRUCK'}</th><th className="num">MILES</th></tr></thead>
                      <tbody>
                        {groupRows.map((r, i) => (
                          <tr key={i}>
                            <td style={{ fontSize: 11 }}>{r.group}</td>
                            <td className="num" style={{ color: 'var(--amber)' }}>{r.miles.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
              )}
            </div>

            {/* Right filing info */}
            <div style={{ overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <InfoBox title="QUARTERLY DEADLINES">
                {[{ q: 'Q1 (Jan–Mar)', due: 'Apr 30' }, { q: 'Q2 (Apr–Jun)', due: 'Jul 31' }, { q: 'Q3 (Jul–Sep)', due: 'Oct 31' }, { q: 'Q4 (Oct–Dec)', due: 'Jan 31' }].map(({ q, due }) => (
                  <div key={q} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--line)', fontSize: 11 }}>
                    <span className="t-dim">{q}</span>
                    <span style={{ color: 'var(--amber)', fontFamily: 'var(--mono)' }}>{due}</span>
                  </div>
                ))}
              </InfoBox>
              <InfoBox title={`${periodLabel} SUMMARY`}>
                {[['Loads counted', iftaData?.loads_count ?? 0], ['Total miles', totalMiles.toLocaleString()], ['States crossed', states.length], ['Est. fuel tax', `$${totalTax.toFixed(0)}`]].map(([lbl, val], i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0' }}>
                    <span className="t-mute">{lbl}</span>
                    <span className="t-mono" style={{ color: i === 3 ? 'var(--red)' : 'inherit' }}>{val}</span>
                  </div>
                ))}
              </InfoBox>
              <div style={{ padding: 12, border: '1px solid var(--amber-dim)', background: 'var(--bg-elev)' }}>
                <div className="t-tiny t-up" style={{ marginBottom: 6, color: 'var(--amber)' }}>· DISCLAIMER</div>
                <div style={{ fontSize: 10, color: 'var(--ink-mute)', lineHeight: 1.7 }}>
                  Miles estimated 50/50 between origin and destination states. Use actual GPS-tracked mileage for accurate filing. Tax rates are approximate.
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Tab 2: KY/NM/OR/NY/CT Surcharge ── */}
      {subTab === 'KY / NM / OR / NY / CT' && (
        <>
          <PeriodControls {...{ year, setYear, periodType, setPeriodType, quarter, setQuarter, month, setMonth, groupBy, setGroupBy, driverId, setDriverId, drivers }} showGroupBy={false} />

          <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
            <div style={{ marginBottom: 20 }}>
              <span className="t-tiny t-up" style={{ color: 'var(--amber)', letterSpacing: '0.1em' }}>· SPECIAL SURCHARGE STATES — ENTER TAX RATE OR LEAVE BLANK TO USE DEFAULT</span>
            </div>

            {/* Rate inputs */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
              {SURCHARGE_STATES.map(st => (
                <div key={st}>
                  <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>{st}</div>
                  <input
                    type="number" step="0.001" placeholder={`$${(US_FUEL_TAX[st] || 0).toFixed(3)}`}
                    value={rates[st]}
                    onChange={e => setRates(r => ({ ...r, [st]: e.target.value }))}
                    style={{ ...inp, width: 120 }}
                  />
                </div>
              ))}
            </div>

            {/* Results */}
            {iftaLoading
              ? <div style={{ color: 'var(--ink-mute)', fontSize: 11 }}>LOADING...</div>
              : (() => {
                  const surchargeRows = states.filter(r => SURCHARGE_STATES.includes(r.state))
                  if (surchargeRows.length === 0) return <div style={{ color: 'var(--ink-mute)', fontSize: 11 }}>NO MILEAGE IN SURCHARGE STATES FOR {periodLabel}.</div>
                  return (
                    <table className="tbl">
                      <thead><tr><th>STATE</th><th className="num">MILES</th><th className="num">GALLONS (6.5 MPG)</th><th className="num">RATE</th><th className="num">EST. SURCHARGE</th></tr></thead>
                      <tbody>
                        {surchargeRows.map(row => {
                          const rate = parseFloat(rates[row.state]) || US_FUEL_TAX[row.state] || 0
                          const gallons = row.miles / 6.5
                          const tax = gallons * rate
                          return (
                            <tr key={row.state}>
                              <td><span className="tag amber" style={{ fontSize: 9, minWidth: 28, textAlign: 'center' }}>{row.state}</span></td>
                              <td className="num">{row.miles.toLocaleString()}</td>
                              <td className="num t-dim">{Math.round(gallons).toLocaleString()}</td>
                              <td className="num">${rate.toFixed(3)}</td>
                              <td className="num" style={{ color: 'var(--red)' }}>${tax.toFixed(2)}</td>
                            </tr>
                          )
                        })}
                        <tr style={{ borderTop: '2px solid var(--line-strong)', fontWeight: 700 }}>
                          <td colSpan={4} style={{ fontSize: 11, color: 'var(--ink)' }}>TOTAL SURCHARGE</td>
                          <td className="num" style={{ color: 'var(--red)' }}>
                            ${surchargeRows.reduce((s, row) => {
                              const rate = parseFloat(rates[row.state]) || US_FUEL_TAX[row.state] || 0
                              return s + (row.miles / 6.5) * rate
                            }, 0).toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )
                })()
            }
          </div>
        </>
      )}

      {/* ── Tab 3: Miles & Fuel by State ── */}
      {subTab === 'MILES & FUEL BY STATE' && (
        <>
          <PeriodControls {...{ year, setYear, periodType, setPeriodType, quarter, setQuarter, month, setMonth, groupBy, setGroupBy, driverId, setDriverId, drivers }} showGroupBy={false} />

          {/* Summary bar */}
          {fuelData && (
            <div style={{ display: 'flex', gap: 32, padding: '8px 16px', background: 'var(--panel)', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
              <span className="t-tiny t-up t-mute">· MILES & FUEL BY STATE · {periodLabel}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 24 }}>
                <SummaryItem label="TOTAL MILES"   value={(fuelData.total_miles || 0).toLocaleString()} color="var(--amber)" />
                <SummaryItem label="TOTAL GALLONS" value={(fuelData.total_gallons || 0).toLocaleString()} color="var(--green)" />
                <SummaryItem label="LOADS"         value={fuelData.loads_count ?? 0} />
                <SummaryItem label="FUEL TX"       value={fuelData.fuel_tx_count ?? 0} />
              </div>
            </div>
          )}

          <div style={{ flex: 1, overflow: 'auto' }}>
            {fuelLoading
              ? <div style={{ padding: 24, color: 'var(--ink-mute)', fontSize: 11 }}>LOADING...</div>
              : !fuelData
              ? <div style={{ padding: 24, color: 'var(--ink-mute)', fontSize: 11 }}>SELECT PERIOD AND NAVIGATE TO THIS TAB TO LOAD DATA.</div>
              : fuelData.rows?.length === 0
              ? <div style={{ padding: 24, color: 'var(--ink-mute)', fontSize: 11 }}>NO DATA FOR {periodLabel}.</div>
              : <table className="tbl">
                  <thead><tr><th>STATE</th><th className="num">MILES</th><th className="num">GALLONS PURCHASED</th><th className="num">FUEL AMOUNT</th><th className="num">TAX RATE</th><th className="num">EST. TAX</th></tr></thead>
                  <tbody>
                    {fuelData.rows.map(row => {
                      const rate = US_FUEL_TAX[row.state]
                      const gallons = row.miles / 6.5
                      const tax = rate ? gallons * rate : null
                      const pct = fuelData.total_miles ? ((row.miles / fuelData.total_miles) * 100).toFixed(1) : '0.0'
                      return (
                        <tr key={row.state}>
                          <td><span className="tag amber" style={{ fontSize: 9, minWidth: 28, textAlign: 'center' }}>{row.state}</span></td>
                          <td className="num">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                              <div style={{ width: 50, height: 3, background: 'var(--line)' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: 'var(--amber)' }} />
                              </div>
                              <span className="t-mono">{row.miles.toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="num" style={{ color: row.gallons > 0 ? 'var(--green)' : 'var(--ink-mute)' }}>{row.gallons > 0 ? row.gallons.toLocaleString() : '—'}</td>
                          <td className="num" style={{ color: row.fuel_amount > 0 ? 'var(--green)' : 'var(--ink-mute)' }}>{row.fuel_amount > 0 ? `$${row.fuel_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td>
                          <td className="num">{rate ? `$${rate.toFixed(3)}` : <span className="t-mute">—</span>}</td>
                          <td className="num" style={{ color: tax ? 'var(--red)' : 'var(--ink-mute)' }}>{tax ? `$${tax.toFixed(0)}` : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
            }
          </div>
        </>
      )}
    </div>
  )
}

function SummaryItem({ label, value, color }) {
  return (
    <div>
      <span className="t-tiny t-up t-mute">{label} </span>
      <span style={{ fontFamily: 'var(--mono)', color: color || 'var(--ink)', fontSize: 13 }}>{value}</span>
    </div>
  )
}

function InfoBox({ title, children }) {
  return (
    <div style={{ padding: 14, border: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
      <div className="t-tiny t-up t-mute" style={{ marginBottom: 8 }}>· {title}</div>
      {children}
    </div>
  )
}
