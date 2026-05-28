import { useQuery } from '@tanstack/react-query'
import { getIftaSummary } from '../api'
import { useState } from 'react'
import Ticker from '../components/Ticker'

const CURRENT_YEAR = new Date().getFullYear()
const CURRENT_Q = Math.ceil((new Date().getMonth() + 1) / 3)

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

export default function IFTA() {
  const [year, setYear] = useState(CURRENT_YEAR)
  const [quarter, setQuarter] = useState(CURRENT_Q)

  const { data, isLoading } = useQuery({
    queryKey: ['ifta', year, quarter],
    queryFn: () => getIftaSummary(year, quarter),
  })

  const states = data?.states || []
  const totalTax = states.reduce((s, r) => {
    const rate = US_FUEL_TAX[r.state] || 0
    const gallons = r.miles / 6.5  // avg MPG for heavy truck
    return s + gallons * rate
  }, 0)

  const tickerItems = [
    { t: 'IFTA', body: `Q${quarter} ${year} · ${data?.loads_count ?? 0} LOADS · ${(data?.total_miles ?? 0).toLocaleString()} MI TOTAL`, tone: 'amber' },
    { t: 'NOTE', body: 'MILES ESTIMATED 50/50 ORIGIN→DEST · VERIFY BEFORE FILING' },
    { t: 'TAX',  body: `EST. FUEL TAX LIABILITY: $${totalTax.toFixed(0)} (6.5 MPG ASSUMPTION)` },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 89px)' }}>
      <Ticker items={tickerItems} />

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--line)', background: 'var(--panel)', alignItems: 'center', flexShrink: 0 }}>
        <span className="t-tiny t-up t-mute">· IFTA MILEAGE SUMMARY ·</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="t-tiny t-up t-mute">YEAR</span>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))}
            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '4px 8px', fontFamily: 'var(--mono)', fontSize: 11 }}>
            {[CURRENT_YEAR, CURRENT_YEAR - 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="t-tiny t-up t-mute">QUARTER</span>
          {[1, 2, 3, 4].map(q => (
            <button key={q} onClick={() => setQuarter(q)}
              className={quarter === q ? 'btn primary' : 'btn'}
              style={{ padding: '4px 12px', fontSize: 11 }}>
              Q{q}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 24 }}>
          <div>
            <span className="t-tiny t-up t-mute">TOTAL MILES </span>
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--amber)', fontSize: 13 }}>{(data?.total_miles ?? 0).toLocaleString()}</span>
          </div>
          <div>
            <span className="t-tiny t-up t-mute">EST. TAX LIABILITY </span>
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--red)', fontSize: 13 }}>${totalTax.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', minHeight: 0, overflow: 'hidden' }}>

        {/* State table */}
        <div style={{ borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="panel-head" style={{ padding: '10px 16px' }}>
            <span>· STATE MILEAGE BREAKDOWN · Q{quarter} {year}</span>
            <span className="ph-r">{states.length} STATES</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {isLoading ? (
              <div style={{ padding: 24, color: 'var(--ink-mute)', fontSize: 11 }}>LOADING...</div>
            ) : states.length === 0 ? (
              <div style={{ padding: 24, color: 'var(--ink-mute)', fontSize: 11 }}>
                NO LOADS WITH MILEAGE FOR Q{quarter} {year}.<br />
                <span style={{ color: 'var(--ink-mute)', marginTop: 8, display: 'block' }}>
                  Add mileage to loads in the Dispatch tab.
                </span>
              </div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>State</th>
                    <th className="num">Miles</th>
                    <th className="num">% of Total</th>
                    <th className="num">Tax Rate ($/gal)</th>
                    <th className="num">Gallons (6.5 MPG)</th>
                    <th className="num">Est. Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {states.map(row => {
                    const pct = data.total_miles ? ((row.miles / data.total_miles) * 100).toFixed(1) : '0.0'
                    const rate = US_FUEL_TAX[row.state]
                    const gallons = row.miles / 6.5
                    const tax = rate ? (gallons * rate) : null
                    return (
                      <tr key={row.state}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="tag amber" style={{ fontSize: 9, minWidth: 28, textAlign: 'center' }}>{row.state}</span>
                          </div>
                        </td>
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
                        <td className="num" style={{ color: tax ? 'var(--red)' : 'var(--ink-mute)' }}>
                          {tax ? `$${tax.toFixed(0)}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right panel — filing info */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="panel-head" style={{ padding: '10px 16px' }}>
            <span>· IFTA FILING INFO</span>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'auto' }}>

            <div style={{ padding: 14, border: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
              <div className="t-tiny t-up t-mute" style={{ marginBottom: 8 }}>· QUARTERLY DEADLINES</div>
              {[
                { q: 'Q1 (Jan–Mar)', due: 'Apr 30' },
                { q: 'Q2 (Apr–Jun)', due: 'Jul 31' },
                { q: 'Q3 (Jul–Sep)', due: 'Oct 31' },
                { q: 'Q4 (Oct–Dec)', due: 'Jan 31' },
              ].map(({ q, due }) => (
                <div key={q} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)', fontSize: 11 }}>
                  <span className="t-dim">{q}</span>
                  <span style={{ color: 'var(--amber)', fontFamily: 'var(--mono)' }}>{due}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: 14, border: '1px solid var(--line)', background: 'var(--bg-elev)' }}>
              <div className="t-tiny t-up t-mute" style={{ marginBottom: 8 }}>· Q{quarter} {year} SUMMARY</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="t-mute">Loads counted</span>
                  <span className="t-mono">{data?.loads_count ?? 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="t-mute">Total miles</span>
                  <span className="t-mono">{(data?.total_miles ?? 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="t-mute">States crossed</span>
                  <span className="t-mono">{states.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="t-mute">Est. fuel tax</span>
                  <span style={{ color: 'var(--red)', fontFamily: 'var(--mono)' }}>${totalTax.toFixed(0)}</span>
                </div>
              </div>
            </div>

            <div style={{ padding: 14, border: '1px solid var(--amber-dim)', background: 'var(--bg-elev)' }}>
              <div className="t-tiny t-up" style={{ marginBottom: 8, color: 'var(--amber)' }}>· DISCLAIMER</div>
              <div style={{ fontSize: 10, color: 'var(--ink-mute)', lineHeight: 1.7 }}>
                Miles are estimated 50/50 between origin and destination states. For accurate IFTA filing, use actual GPS-tracked state-by-state mileage logs. Tax rates are approximate and subject to change. Consult your IFTA administrator.
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
