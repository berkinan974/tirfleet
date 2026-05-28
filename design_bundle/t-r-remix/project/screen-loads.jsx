/* screen-loads.jsx — Loads / Dispatch board */

const LoadsScreen = () => {
  const loads = [
    { id: "L-3041", num: "RTS·48-211", broker: "TQL",            origin: "DAL · TX", dest: "PHX · AZ", pu: "05/27 14:00", del: "05/28 22:00", mi: 1064, rate: 3850, rpm: 3.62, truck: "T-101", driver: "M. Demir",    state: "rolling",  dat: "DAT·9821" },
    { id: "L-3042", num: "RTS·48-208", broker: "C.H.Robinson",   origin: "CHI · IL", dest: "ATL · GA", pu: "05/27 20:00", del: "05/29 04:00", mi: 716,  rate: 4200, rpm: 5.87, truck: "T-102", driver: "E. Kaya",     state: "rolling",  dat: "DAT·9854" },
    { id: "L-3043", num: "RTS·48-220", broker: "Echo Global",    origin: "CMH · OH", dest: "MIA · FL", pu: "05/28 19:30", del: "05/30 12:00", mi: 1218, rate: 5100, rpm: 4.19, truck: "T-103", driver: "R. Hoffman",  state: "loading",  dat: "DAT·9911" },
    { id: "L-3044", num: "—",          broker: "Coyote",         origin: "ATL · GA", dest: "CLT · NC", pu: "05/28 09:00", del: "05/28 19:00", mi: 244,  rate: 1450, rpm: 5.94, truck: "T-104", driver: "S. Yıldız",   state: "rolling",  dat: "DAT·9933" },
    { id: "L-3045", num: "RTS·48-200", broker: "TQL",            origin: "LAX · CA", dest: "PHX · AZ", pu: "05/27 08:00", del: "05/28 16:48", mi: 372,  rate: 2200, rpm: 5.91, truck: "T-105", driver: "J. Reyes",    state: "delivered",dat: "DAT·9762" },
    { id: "L-3046", num: "—",          broker: "—",              origin: "PHX · AZ", dest: "DEN · CO", pu: "05/28 06:00", del: "05/29 22:00", mi: 863,  rate: 3600, rpm: 4.17, truck: "T-108", driver: "K. Özkan",    state: "rolling",  dat: "DAT·9947" },
    { id: "L-3047", num: "—",          broker: "TQL",            origin: "MIA · FL", dest: "ORL · FL", pu: "05/30 14:00", del: "05/30 22:00", mi: 235,  rate: 980,  rpm: 4.17, truck: "T-103", driver: "R. Hoffman",  state: "pending",  dat: "—" },
    { id: "L-3048", num: "—",          broker: "Echo Global",    origin: "PHX · AZ", dest: "ELP · TX", pu: "05/29 04:00", del: "05/29 18:00", mi: 432,  rate: 1850, rpm: 4.28, truck: "T-101", driver: "M. Demir",    state: "pending",  dat: "DAT·9970" },
    { id: "L-3049", num: "—",          broker: "C.H.Robinson",   origin: "ATL · GA", dest: "NSH · TN", pu: "05/30 06:00", del: "05/30 14:00", mi: 250,  rate: 1100, rpm: 4.40, truck: "T-107", driver: "A. Thompson", state: "pending",  dat: "DAT·9988" },
    { id: "L-3036", num: "RTS·48-201", broker: "Coyote",         origin: "NSH · TN", dest: "ATL · GA", pu: "05/25 06:00", del: "05/25 14:00", mi: 250,  rate: 1100, rpm: 4.40, truck: "T-104", driver: "S. Yıldız",   state: "delivered",dat: "DAT·9701" },
  ];

  const stateTag = (s) => {
    const m = {
      rolling:   ["amber",  "ROLLING"],
      loading:   ["amber",  "LOADING"],
      delivered: ["green",  "DELIV"],
      pending:   ["",       "BOOKED"],
      cancelled: ["red",    "CANCEL"],
    };
    const [tone, lbl] = m[s];
    return <span className={`tag ${tone}`}>{lbl}</span>;
  };

  // Pipeline buckets
  const buckets = [
    { id: "available",  label: "Available",       n: 2, rev: "$0",        tone: "ink-mute" },
    { id: "pending",    label: "Booked · Pending",n: 3, rev: "$3,930",    tone: "default" },
    { id: "loading",    label: "Loading",         n: 1, rev: "$5,100",    tone: "amber" },
    { id: "rolling",    label: "In Transit",      n: 4, rev: "$13,100",   tone: "amber" },
    { id: "delivered",  label: "Delivered · WTD", n: 6, rev: "$15,320",   tone: "green" },
  ];

  return (
    <div className="tir-root tir-grid-bg" style={{ width: 1440, height: 900, display: "flex", flexDirection: "column" }}>
      <TopBar activeTab="loads" />
      <Ticker items={[
        { t: "DISPATCH", body: "10 LOADS · 4 ROLLING · 1 LOADING · 3 PENDING · 2 AVAIL", tone: "amber" },
        { t: "WTD",      body: "$28,420 GROSS · 7,841 MI · $3.62/MI",                    tone: "amber" },
        { t: "LANE",     body: "BEST · CHI→ATL @ $5.87/MI · WORST · DAL→PHX @ $3.62/MI" },
        { t: "BOARD",    body: "DAT · 142 RESULTS · 4 PINNED" },
      ]} />

      {/* Pipeline funnel */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--line)", background: "var(--panel)" }}>
        {buckets.map((b, i) => (
          <div key={b.id} style={{
            flex: 1, padding: "12px 16px",
            borderRight: i < buckets.length-1 ? "1px solid var(--line)" : "0",
            background: b.id === "rolling" ? "var(--panel-2)" : "transparent",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="t-tiny t-up t-mute">{b.label}</span>
              <span className="t-tiny t-mute">{i+1}/5</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 6 }}>
              <span className="t-num" style={{
                fontSize: 32,
                color: b.tone === "amber" ? "var(--amber)" :
                       b.tone === "green" ? "var(--green)" :
                       b.tone === "ink-mute" ? "var(--ink-mute)" : "var(--ink)"
              }}>{String(b.n).padStart(2,"0")}</span>
              <span className="t-dim t-tiny">{b.rev}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Body: Loads table + side panel */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 380px", minHeight: 0 }}>
        {/* Loads table */}
        <div style={{ display: "flex", flexDirection: "column", borderRight: "1px solid var(--line)", minHeight: 0 }}>
          <div className="panel-head" style={{ padding: "10px 16px" }}>
            <span>· LOAD BOARD · 10 RECORDS</span>
            <span className="ph-r">+ NEW LOAD &nbsp;·&nbsp; ⇣ DAT IMPORT &nbsp;·&nbsp; ⤓ EXPORT</span>
          </div>

          {/* Filter chips */}
          <div style={{ display: "flex", gap: 6, padding: "8px 16px", borderBottom: "1px solid var(--line)", background: "var(--bg-elev)" }}>
            <span className="tag solid-amber">ALL · 10</span>
            <span className="tag">PENDING · 3</span>
            <span className="tag amber">ROLLING · 4</span>
            <span className="tag">LOADING · 1</span>
            <span className="tag green">DELIV · 2</span>
            <span className="tag" style={{ marginLeft: "auto", color: "var(--ink-mute)" }}>RPM ≥ $4.00 · ON</span>
            <span className="tag">DATE · THIS WEEK</span>
          </div>

          <div style={{ flex: 1, overflow: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Load #</th>
                  <th>Broker</th>
                  <th>Lane</th>
                  <th>Pickup</th>
                  <th>Delivery</th>
                  <th className="num">Miles</th>
                  <th className="num">Rate</th>
                  <th className="num">$/MI</th>
                  <th>Truck</th>
                  <th>Driver</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loads.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <div className="t-mono">{l.id}</div>
                      <div className="t-tiny t-mute">{l.dat}</div>
                    </td>
                    <td>
                      <div>{l.broker}</div>
                      <div className="t-tiny t-mute">{l.num}</div>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ color: "var(--ink)" }}>{l.origin}</span>
                        <span style={{ color: "var(--amber)" }}>→</span>
                        <span style={{ color: "var(--ink)" }}>{l.dest}</span>
                      </div>
                    </td>
                    <td className="t-dim">{l.pu}</td>
                    <td className="t-dim">{l.del}</td>
                    <td className="num">{l.mi.toLocaleString()}</td>
                    <td className="num"><span style={{ color: "var(--ink)" }}>${l.rate.toLocaleString()}</span></td>
                    <td className="num">
                      <span style={{ color:
                        l.rpm >= 5 ? "var(--green)" :
                        l.rpm >= 4 ? "var(--amber)" : "var(--red)"
                      }}>${l.rpm.toFixed(2)}</span>
                    </td>
                    <td><span className="t-display" style={{ fontSize: 13 }}>{l.truck}</span></td>
                    <td className="t-dim">{l.driver}</td>
                    <td>{stateTag(l.state)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT PANEL — lane analytics + DAT */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div className="panel-head" style={{ padding: "10px 16px" }}>
            <span>· LANE PERFORMANCE · 30D</span>
            <span className="ph-r">$/MI</span>
          </div>
          <div style={{ padding: 14, borderBottom: "1px solid var(--line)" }}>
            {[
              { lane: "CHI → ATL", rpm: 5.87, n: 4, w: 98 },
              { lane: "ATL → CLT", rpm: 5.94, n: 6, w: 100 },
              { lane: "LAX → PHX", rpm: 5.91, n: 3, w: 99 },
              { lane: "PHX → DEN", rpm: 4.17, n: 5, w: 70 },
              { lane: "DAL → PHX", rpm: 3.62, n: 7, w: 61 },
              { lane: "CMH → MIA", rpm: 4.19, n: 2, w: 70 },
            ].map((r, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "100px 1fr 64px",
                gap: 10, alignItems: "center", padding: "6px 0",
                borderBottom: i < 5 ? "1px dashed var(--line)" : "0"
              }}>
                <span style={{ fontSize: 11, color: "var(--ink)" }}>{r.lane}</span>
                <div style={{ height: 10, background: "var(--line)", position: "relative" }}>
                  <div style={{
                    position: "absolute", inset: 0, width: `${r.w}%`,
                    background: r.rpm >= 5 ? "var(--green)" : r.rpm >= 4 ? "var(--amber)" : "var(--red)"
                  }} />
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 11, color:
                    r.rpm >= 5 ? "var(--green)" : r.rpm >= 4 ? "var(--amber)" : "var(--red)"
                  }}>${r.rpm.toFixed(2)}</span>
                  <span className="t-tiny t-mute"> · {r.n}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="panel-head" style={{ padding: "10px 16px" }}>
            <span>· DAT BOARD · PINNED</span>
            <span className="ph-r">4 LOADS</span>
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            {[
              { lane: "DEN → KCY", rate: 2400, mi: 600, rpm: 4.00, pu: "05/30 06:00", broker: "Echo" },
              { lane: "MIA → JAX", rate: 1380, mi: 350, rpm: 3.94, pu: "05/31 14:00", broker: "TQL" },
              { lane: "PHX → ABQ", rate: 1950, mi: 420, rpm: 4.64, pu: "05/29 22:00", broker: "Coyote", hot: true },
              { lane: "CLT → ATL", rate: 1450, mi: 244, rpm: 5.94, pu: "05/29 08:00", broker: "C.H.R.",  hot: true },
            ].map((r, i) => (
              <div key={i} style={{
                padding: "12px 16px", borderBottom: "1px solid var(--line)",
                background: r.hot ? "color-mix(in oklch, var(--amber) 6%, transparent)" : "transparent"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 13, color: "var(--ink)", letterSpacing: "0.04em" }}>{r.lane}</span>
                  <span className="t-num" style={{ color: r.rpm >= 4.5 ? "var(--green)" : "var(--amber)", fontSize: 14 }}>
                    ${r.rpm.toFixed(2)}<span className="t-tiny t-mute">/MI</span>
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <span className="t-tiny t-dim">{r.broker} · {r.mi}MI · ${r.rate.toLocaleString()}</span>
                  <span className="t-tiny t-mute">PU {r.pu}</span>
                </div>
                {r.hot && (
                  <div style={{ marginTop: 6 }}>
                    <span className="tag amber">▴ HOT</span>
                    <button className="btn primary" style={{ marginLeft: 8, padding: "2px 8px" }}>BOOK</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { LoadsScreen });
