import { useState } from 'react'
import {
  getReportTotalRevenue, getReportRatePerMile, getReportRevenueByDispatcher,
  getReportPaymentSummary, getReportExpenses, getReportGrossProfit,
  getReportGrossProfitPerLoad, getReportProfitLoss,
} from '../api'

const REPORT_TABS = [
  { id: 'total-revenue',          label: 'Total Revenue' },
  { id: 'rate-per-mile',          label: 'Rate per Mile' },
  { id: 'revenue-by-dispatcher',  label: 'Rev. by Dispatcher' },
  { id: 'payment-summary',        label: 'Payment Summary' },
  { id: 'expenses',               label: 'Expenses' },
  { id: 'gross-profit',           label: 'Gross Profit' },
  { id: 'gross-profit-per-load',  label: 'GP per Load' },
  { id: 'profit-loss',            label: 'Profit & Loss' },
]

const PERIODS = [
  { value: '7d',  label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'all', label: 'All Time' },
]

const inp = { background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '6px 10px', fontFamily: 'var(--mono)', fontSize: 11, boxSizing: 'border-box' }
const sel = { ...inp }

function fmt$(n) { return n == null ? '—' : `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function fmtN(n) { return n == null ? '—' : Number(n).toLocaleString(undefined, { maximumFractionDigits: 1 }) }

export default function Reports() {
  const [tab, setTab] = useState('total-revenue')
  const [period, setPeriod] = useState('30d')
  const [groupBy, setGroupBy] = useState('none')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const run = async () => {
    setLoading(true); setError(null); setData(null)
    try {
      const params = { period }
      if (['total-revenue', 'rate-per-mile', 'gross-profit-per-load'].includes(tab)) params.group_by = groupBy
      let result
      if (tab === 'total-revenue')         result = await getReportTotalRevenue(params)
      else if (tab === 'rate-per-mile')    result = await getReportRatePerMile(params)
      else if (tab === 'revenue-by-dispatcher') result = await getReportRevenueByDispatcher(params)
      else if (tab === 'payment-summary')  result = await getReportPaymentSummary(params)
      else if (tab === 'expenses')         result = await getReportExpenses(params)
      else if (tab === 'gross-profit')     result = await getReportGrossProfit(params)
      else if (tab === 'gross-profit-per-load') result = await getReportGrossProfitPerLoad(params)
      else if (tab === 'profit-loss')      result = await getReportProfitLoss(params)
      setData(result)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const showGroupBy = ['total-revenue', 'rate-per-mile', 'gross-profit-per-load'].includes(tab)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 89px)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid var(--line)', background: 'var(--bg-elev)', flexShrink: 0 }}>
        <span className="t-tiny t-up" style={{ color: 'var(--amber)', letterSpacing: '0.12em' }}>· REPORTS</span>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'var(--bg)', flexShrink: 0, overflowX: 'auto' }}>
        {REPORT_TABS.map(t => (
          <div key={t.id} onClick={() => { setTab(t.id); setData(null) }} style={{
            padding: '8px 16px', cursor: 'pointer', whiteSpace: 'nowrap',
            borderBottom: tab === t.id ? '2px solid var(--amber)' : '2px solid transparent',
            background: tab === t.id ? 'var(--panel)' : 'transparent',
            fontSize: 11, color: tab === t.id ? 'var(--amber)' : 'var(--ink)',
            letterSpacing: '0.04em', fontFamily: 'var(--mono)',
          }}>
            {t.label.toUpperCase()}
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', padding: '12px 20px', borderBottom: '1px solid var(--line)', background: 'var(--bg-elev)', flexShrink: 0 }}>
        <div>
          <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>Period</div>
          <select value={period} onChange={e => setPeriod(e.target.value)} style={{ ...sel, width: 160 }}>
            {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        {showGroupBy && (
          <div>
            <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>Group By</div>
            <select value={groupBy} onChange={e => setGroupBy(e.target.value)} style={{ ...sel, width: 140 }}>
              <option value="none">None</option>
              <option value="driver">Driver</option>
              <option value="truck">Truck</option>
            </select>
          </div>
        )}
        <button onClick={run} className="btn primary" style={{ padding: '6px 20px', fontSize: 11, alignSelf: 'flex-end' }}>
          {loading ? '...' : '▸ RUN REPORT'}
        </button>
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {error && <div style={{ color: 'var(--red)', fontSize: 11, fontFamily: 'var(--mono)' }}>{error}</div>}
        {!data && !loading && !error && (
          <div style={{ color: 'var(--ink-mute)', fontSize: 11, fontFamily: 'var(--mono)' }}>SELECT A PERIOD AND RUN THE REPORT.</div>
        )}

        {data && tab === 'total-revenue'         && <TotalRevenueResult data={data} />}
        {data && tab === 'rate-per-mile'         && <RatePerMileResult data={data} />}
        {data && tab === 'revenue-by-dispatcher' && <DispatcherResult data={data} />}
        {data && tab === 'payment-summary'       && <PaymentSummaryResult data={data} />}
        {data && tab === 'expenses'              && <ExpensesResult data={data} />}
        {data && tab === 'gross-profit'          && <GrossProfitResult data={data} />}
        {data && tab === 'gross-profit-per-load' && <GPPerLoadResult data={data} />}
        {data && tab === 'profit-loss'           && <ProfitLossResult data={data} />}
      </div>
    </div>
  )
}

/* ── Totals bar ─────────────────────────────────────────────────── */
function TotalsBar({ totals }) {
  if (!totals) return null
  return (
    <div style={{ display: 'flex', gap: 32, marginBottom: 16, padding: '10px 16px', background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
      <Stat label="LOADS"   value={totals.load_count} />
      <Stat label="MILES"   value={fmtN(totals.total_miles)} />
      <Stat label="REVENUE" value={fmt$(totals.total_revenue)} color="var(--green)" />
      {totals.avg_rpm != null && <Stat label="AVG $/MI" value={`$${totals.avg_rpm}`} color="var(--amber)" />}
    </div>
  )
}

/* ── Total Revenue ──────────────────────────────────────────────── */
function TotalRevenueResult({ data }) {
  if (data.grouped) return (
    <>
      <TotalsBar totals={data.totals} />
      <table className="tbl">
        <thead><tr><th>{data.by === 'driver' ? 'DRIVER' : 'TRUCK'}</th><th className="num">LOADS</th><th className="num">MILES</th><th className="num">REVENUE</th></tr></thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={i}>
              <td style={{ fontSize: 11 }}>{r.group}</td>
              <td className="num" style={{ fontSize: 11 }}>{r.load_count}</td>
              <td className="num" style={{ fontSize: 11 }}>{fmtN(r.total_miles)}</td>
              <td className="num" style={{ color: 'var(--green)' }}>{fmt$(r.total_revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
  return (
    <>
      <TotalsBar totals={data.totals} />
      <table className="tbl">
        <thead><tr><th>LOAD #</th><th>DATE</th><th>BROKER</th><th>DRIVER</th><th>TRUCK</th><th>ROUTE</th><th className="num">MILES</th><th className="num">RATE</th><th>STATUS</th></tr></thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={i}>
              <td style={{ color: 'var(--amber)', fontFamily: 'var(--mono)', fontSize: 11 }}>{r.load_number}</td>
              <td style={{ fontSize: 10 }}>{r.date}</td>
              <td style={{ fontSize: 11 }}>{r.broker || '—'}</td>
              <td style={{ fontSize: 11 }}>{r.driver || '—'}</td>
              <td style={{ fontSize: 11 }}>{r.truck || '—'}</td>
              <td style={{ fontSize: 10, color: 'var(--ink-mute)' }}>{r.route}</td>
              <td className="num" style={{ fontSize: 11 }}>{fmtN(r.miles)}</td>
              <td className="num" style={{ color: 'var(--green)' }}>{fmt$(r.rate)}</td>
              <td style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-mute)' }}>{r.status?.toUpperCase()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

/* ── Rate per Mile ──────────────────────────────────────────────── */
function RatePerMileResult({ data }) {
  if (data.grouped) return (
    <>
      <TotalsBar totals={data.totals} />
      <table className="tbl">
        <thead><tr><th>{data.by === 'driver' ? 'DRIVER' : 'TRUCK'}</th><th className="num">LOADS</th><th className="num">MILES</th><th className="num">REVENUE</th><th className="num">AVG $/MI</th></tr></thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={i}>
              <td style={{ fontSize: 11 }}>{r.group}</td>
              <td className="num" style={{ fontSize: 11 }}>{r.load_count}</td>
              <td className="num" style={{ fontSize: 11 }}>{fmtN(r.total_miles)}</td>
              <td className="num" style={{ color: 'var(--green)' }}>{fmt$(r.total_revenue)}</td>
              <td className="num" style={{ color: 'var(--amber)' }}>{r.avg_rpm != null ? `$${r.avg_rpm}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
  return (
    <>
      <TotalsBar totals={data.totals} />
      <table className="tbl">
        <thead><tr><th>LOAD #</th><th>DATE</th><th>DRIVER</th><th>ROUTE</th><th className="num">MILES</th><th className="num">RATE</th><th className="num">$/MI</th></tr></thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={i}>
              <td style={{ color: 'var(--amber)', fontFamily: 'var(--mono)', fontSize: 11 }}>{r.load_number}</td>
              <td style={{ fontSize: 10 }}>{r.date}</td>
              <td style={{ fontSize: 11 }}>{r.driver || '—'}</td>
              <td style={{ fontSize: 10, color: 'var(--ink-mute)' }}>{r.route}</td>
              <td className="num" style={{ fontSize: 11 }}>{fmtN(r.miles)}</td>
              <td className="num" style={{ color: 'var(--green)' }}>{fmt$(r.rate)}</td>
              <td className="num" style={{ color: 'var(--amber)' }}>{r.rpm != null ? `$${r.rpm}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

/* ── Revenue by Dispatcher ──────────────────────────────────────── */
function DispatcherResult({ data }) {
  return (
    <>
      <TotalsBar totals={data.totals} />
      <table className="tbl">
        <thead><tr><th>DISPATCHER</th><th className="num">LOADS</th><th className="num">MILES</th><th className="num">REVENUE</th><th className="num">AVG $/MI</th></tr></thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={i}>
              <td style={{ fontSize: 11 }}>{r.dispatcher}</td>
              <td className="num" style={{ fontSize: 11 }}>{r.load_count}</td>
              <td className="num" style={{ fontSize: 11 }}>{fmtN(r.total_miles)}</td>
              <td className="num" style={{ color: 'var(--green)' }}>{fmt$(r.total_revenue)}</td>
              <td className="num" style={{ color: 'var(--amber)' }}>{r.avg_rpm != null ? `$${r.avg_rpm}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

/* ── Payment Summary ────────────────────────────────────────────── */
function PaymentSummaryResult({ data }) {
  return (
    <>
      <div style={{ display: 'flex', gap: 32, marginBottom: 16, padding: '10px 16px', background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
        <Stat label="SETTLEMENTS" value={data.count} />
        <Stat label="TOTAL PAID"  value={fmt$(data.total_paid)} color="var(--green)" />
      </div>
      <table className="tbl">
        <thead><tr><th>NUMBER</th><th>DATE</th><th>DRIVER</th><th>PAYABLE TO</th><th className="num">SETTLEMENT TOTAL</th><th className="num">BALANCE DUE</th><th>STATUS</th></tr></thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={i}>
              <td style={{ color: 'var(--amber)', fontFamily: 'var(--mono)', fontSize: 11 }}>{r.number}</td>
              <td style={{ fontSize: 11 }}>{r.date}</td>
              <td style={{ fontSize: 11 }}>{r.driver || '—'}</td>
              <td style={{ fontSize: 11 }}>{r.payable_to || '—'}</td>
              <td className="num" style={{ color: 'var(--green)' }}>{fmt$(r.settlement_total)}</td>
              <td className="num" style={{ color: 'var(--amber)' }}>{fmt$(r.balance_due)}</td>
              <td style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-mute)' }}>{r.status?.toUpperCase()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

/* ── Expenses ───────────────────────────────────────────────────── */
function ExpensesResult({ data }) {
  return (
    <>
      <div style={{ display: 'flex', gap: 32, marginBottom: 16, padding: '10px 16px', background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
        <Stat label="TOTAL EXPENSES" value={fmt$(data.total)} color="var(--red)" />
        {Object.entries(data.category_totals || {}).map(([cat, amt]) => (
          <Stat key={cat} label={cat.toUpperCase()} value={fmt$(amt)} />
        ))}
      </div>
      <table className="tbl">
        <thead><tr><th>DATE</th><th>CATEGORY</th><th>DRIVER</th><th>TRUCK</th><th className="num">AMOUNT</th><th>NOTES</th></tr></thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={i}>
              <td style={{ fontSize: 11 }}>{r.date}</td>
              <td style={{ fontSize: 11 }}>{r.category || '—'}</td>
              <td style={{ fontSize: 11 }}>{r.driver || '—'}</td>
              <td style={{ fontSize: 11 }}>{r.truck || '—'}</td>
              <td className="num" style={{ color: 'var(--red)' }}>{fmt$(r.amount)}</td>
              <td style={{ fontSize: 10, color: 'var(--ink-mute)' }}>{r.notes || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

/* ── Gross Profit ───────────────────────────────────────────────── */
function GrossProfitResult({ data }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 800 }}>
      <BigStat label="REVENUE"      value={fmt$(data.revenue)}      color="var(--green)" />
      <BigStat label="EXPENSES"     value={fmt$(data.expenses)}     color="var(--red)" />
      <BigStat label="FUEL COST"    value={fmt$(data.fuel_cost)}    color="var(--red)" />
      <BigStat label="GROSS PROFIT" value={fmt$(data.gross_profit)} color={data.gross_profit >= 0 ? 'var(--green)' : 'var(--red)'} />
      <BigStat label="MARGIN"       value={`${data.margin_pct}%`}   color="var(--amber)" />
      <BigStat label="LOADS"        value={data.load_count} />
      <BigStat label="TOTAL MILES"  value={fmtN(data.total_miles)} />
    </div>
  )
}

/* ── GP per Load ────────────────────────────────────────────────── */
function GPPerLoadResult({ data }) {
  return (
    <>
      <div style={{ display: 'flex', gap: 32, marginBottom: 16, padding: '10px 16px', background: 'var(--bg-elev)', border: '1px solid var(--line)' }}>
        <Stat label="TOTAL REVENUE"      value={fmt$(data.total_revenue)}      color="var(--green)" />
        <Stat label="TOTAL GROSS PROFIT" value={fmt$(data.total_gross_profit)} color={data.total_gross_profit >= 0 ? 'var(--green)' : 'var(--red)'} />
        <Stat label="AVG MARGIN"         value={`${data.avg_margin}%`}         color="var(--amber)" />
      </div>
      <table className="tbl">
        <thead><tr><th>LOAD #</th><th>DATE</th><th>BROKER</th><th>DRIVER</th><th>ROUTE</th><th className="num">MILES</th><th className="num">REVENUE</th><th className="num">DRIVER COST</th><th className="num">GROSS PROFIT</th><th className="num">MARGIN</th></tr></thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={i}>
              <td style={{ color: 'var(--amber)', fontFamily: 'var(--mono)', fontSize: 11 }}>{r.load_number}</td>
              <td style={{ fontSize: 10 }}>{r.date}</td>
              <td style={{ fontSize: 11 }}>{r.broker || '—'}</td>
              <td style={{ fontSize: 11 }}>{r.driver || '—'}</td>
              <td style={{ fontSize: 10, color: 'var(--ink-mute)' }}>{r.route}</td>
              <td className="num" style={{ fontSize: 11 }}>{fmtN(r.miles)}</td>
              <td className="num" style={{ color: 'var(--green)' }}>{fmt$(r.revenue)}</td>
              <td className="num" style={{ color: 'var(--red)' }}>{fmt$(r.driver_cost)}</td>
              <td className="num" style={{ color: r.gross_profit >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt$(r.gross_profit)}</td>
              <td className="num" style={{ color: 'var(--amber)', fontSize: 11 }}>{r.margin_pct}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

/* ── Profit & Loss ──────────────────────────────────────────────── */
function ProfitLossResult({ data }) {
  const { income, expenses, net_profit, margin_pct } = data
  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ border: '1px solid var(--line)', marginBottom: 2 }}>
        <PLHeader>INCOME</PLHeader>
        <PLRow label="Freight Revenue" value={fmt$(income.freight_revenue)} color="var(--green)" />
        <PLRow label="Other Income"    value={fmt$(income.other_income)}    color="var(--green)" />
        <PLRow label="Total Income"    value={fmt$(income.total)}           color="var(--green)" bold />
      </div>
      <div style={{ border: '1px solid var(--line)', marginBottom: 2 }}>
        <PLHeader>EXPENSES</PLHeader>
        <PLRow label="Driver Pay"    value={fmt$(expenses.driver_pay)} color="var(--red)" />
        <PLRow label="Fuel"          value={fmt$(expenses.fuel)}       color="var(--red)" />
        <PLRow label="Other"         value={fmt$(expenses.other)}      color="var(--red)" />
        <PLRow label="Total Expenses" value={fmt$(expenses.total)}     color="var(--red)" bold />
      </div>
      <div style={{ border: '1px solid var(--line-strong)', background: 'var(--bg-elev)' }}>
        <PLRow label="NET PROFIT" value={fmt$(net_profit)} color={net_profit >= 0 ? 'var(--green)' : 'var(--red)'} bold />
        <PLRow label="MARGIN"     value={`${margin_pct}%`} color="var(--amber)" />
      </div>
    </div>
  )
}

function PLHeader({ children }) {
  return <div style={{ padding: '6px 14px', background: 'var(--panel)', fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--amber)', letterSpacing: '0.1em' }}>{children}</div>
}
function PLRow({ label, value, color, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', borderTop: '1px solid var(--line)' }}>
      <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: bold ? 'var(--ink)' : 'var(--ink-dim)', fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: color || 'var(--ink)', fontWeight: bold ? 700 : 400 }}>{value}</span>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color: color || 'var(--ink)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--ink-mute)', fontFamily: 'var(--mono)', marginTop: 2, letterSpacing: '0.08em' }}>{label}</div>
    </div>
  )
}
function BigStat({ label, value, color }) {
  return (
    <div style={{ border: '1px solid var(--line)', padding: 16, background: 'var(--bg-elev)' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 20, color: color || 'var(--ink)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--ink-mute)', fontFamily: 'var(--mono)', marginTop: 6, letterSpacing: '0.1em' }}>{label}</div>
    </div>
  )
}
