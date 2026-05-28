/* screen-overview.jsx — Dispatch overview screen */

const OverviewScreen = () => {
  const trucks = [
    { unit: "T-101", plate: "TX·482·9JL", driver: "M. Demir",    status: "in_transit", load: "DAL → PHX",  rate: 3850, eta: "+11h 22m", pti: "ok",   fuel: 68, mi: 412 },
    { unit: "T-102", plate: "IL·771·2QR", driver: "E. Kaya",     status: "in_transit", load: "CHI → ATL",  rate: 4200, eta: "+06h 14m", pti: "ok",   fuel: 41, mi: 287 },
    { unit: "T-103", plate: "OH·339·8KP", driver: "R. Hoffman",  status: "loading",    load: "CMH → MIA",  rate: 5100, eta: "PICKUP 19:30", pti: "ok",   fuel: 92, mi: 0 },
    { unit: "T-104", plate: "GA·104·6BX", driver: "S. Yıldız",   status: "in_transit", load: "ATL → CLT",  rate: 1450, eta: "+02h 41m", pti: "late", fuel: 55, mi: 198 },
    { unit: "T-105", plate: "CA·228·5MZ", driver: "J. Reyes",    status: "delivered",  load: "LAX → PHX",  rate: 2200, eta: "DELIV 16:48", pti: "ok",   fuel: 21, mi: 372 },
    { unit: "T-106", plate: "TX·919·3HD", driver: "B. Aksoy",    status: "maintenance",load: "—",          rate: 0,    eta: "BAY-3 / SHOP", pti: "skip", fuel: 12, mi: 0 },
    { unit: "T-107", plate: "FL·552·1VC", driver: "A. Thompson", status: "empty",      load: "—",          rate: 0,    eta: "AVAIL 22:00", pti: "ok",   fuel: 88, mi: 0 },
    { unit: "T-108", plate: "AZ·047·7TN", driver: "K. Özkan",    status: "in_transit", load: "PHX → DEN",  rate: 3600, eta: "+14h 02m", pti: "miss", fuel: 73, mi: 89  },
  ];

  const statusBadge = (s) => {
    const map = {
      in_transit:   ["amber",  "ROLLING"],
      loading:      ["amber",  "LOADING"],
      delivered:    ["green",  "DELIV"],
      empty:        ["",       "EMPTY"],
      maintenance:  ["red",    "SHOP"],
    };
    const [tone, label] = map[s];
    return <span className={`tag ${tone}`}>{label}</span>;
  };

  const ptiBadge = (p) => {
    if (p === "ok")   return <span className="tag green">PTI · OK</span>;
    if (p === "late") return <span className="tag amber">PTI · LATE</span>;
    if (p === "miss") return <span className="tag red">PTI · MISS</span>;
    return <span className="tag t-mute">—</span>;
  };

  const alerts = [
    { t: "22:11", tone: "red",   txt: "T-108 · K. ÖZKAN missed PTI window (08:00 CT)" },
    { t: "21:47", tone: "amber", txt: "T-104 · PTI submitted 4h late" },
    { t: "20:30", tone: "amber", txt: "T-101 · HOS clock — 02:11 remaining" },
    { t: "19:12", tone: "",      txt: "T-105 delivered LAX→PHX · $2,200" },
    { t: "18:55", tone: "",      txt: "T-103 dispatched CMH→MIA · $5,100" },
    { t: "17:30", tone: "amber", txt: "FUEL ALERT · T-105 below 25% · stop @ PHX-9" },
    { t: "16:02", tone: "",      txt: "Driver E. Kaya · check-in confirmed" },
  ];

  // PTI compliance — 14-day strip
  const ptiStrip = [7,8,8,6,8,7,8,8,5,8,8,7,8,6];

  return (
    <div className="tir-root tir-grid-bg" style={{ width: 1440, height: 900, display: "flex", flexDirection: "column" }}>
      <TopBar activeTab="overview" />
      <Ticker items={[
        { t: "DISPATCH", body: "8 UNITS · 5 ROLLING · 1 SHOP · 1 EMPTY · 1 LOADING", tone: "amber" },
        { t: "PTI",      body: "6/8 SUBMITTED · 1 LATE · 1 MISSING",                tone: "amber" },
        { t: "WTD",      body: "$28,420 GROSS · 7,841 MI · $3.62/MI" },
        { t: "RTS",      body: "12 INVOICES PENDING · $48,200" },
        { t: "WX",       body: "I-40 NM · WIND ADVISORY · GUSTS 45MPH", tone: "red" },
      ]} />

      {/* STATS ROW */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--line)", background: "var(--panel)" }}>
        <Stat label="Active Trucks"  value="06" sub="/ 08 total"   tone="amber" spark="▲ 1" />
        <Stat label="PTI Today"      value="6/8" sub="2 outstanding" tone="amber" spark="75%" />
        <Stat label="In Transit"     value="05" sub="rolling"      tone="default" spark="↗" />
        <Stat label="Gross · WTD"    value="$28,420" sub="vs $24,180 prior" tone="green" spark="+17.5%" />
        <Stat label="On-time"        value="94%" sub="last 30 days" tone="green" spark="▁▂▄▅▄▆▇▇" />
        <Stat label="Open Alerts"    value="03" sub="1 critical"   tone="red" spark="●" />
      </div>

      {/* MAIN BODY */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 460px", gap: 0, minHeight: 0 }}>
        {/* LEFT — Fleet status board */}
        <div style={{ borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div className="panel-head" style={{ borderBottom: "1px solid var(--line)", padding: "10px 16px" }}>
            <span>· FLEET STATUS BOARD · LIVE</span>
            <span className="ph-r">SORT ▾ UNIT  ·  FILTER ▾ ALL</span>
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 24 }}></th>
                  <th>Unit</th>
                  <th>Plate</th>
                  <th>Driver</th>
                  <th>Status</th>
                  <th>Lane / Position</th>
                  <th className="num">Rate</th>
                  <th>ETA</th>
                  <th>PTI</th>
                  <th>Fuel</th>
                </tr>
              </thead>
              <tbody>
                {trucks.map((t, i) => (
                  <tr key={t.unit}>
                    <td><span className="dot" style={{ background:
                      t.status === "in_transit" ? "var(--amber)" :
                      t.status === "delivered"  ? "var(--green)" :
                      t.status === "maintenance"? "var(--red)" :
                      t.status === "loading"    ? "var(--amber)" : "var(--ink-mute)"
                    }} /></td>
                    <td><span className="t-display" style={{ fontSize: 14, color: "var(--ink)" }}>{t.unit}</span></td>
                    <td className="t-dim">{t.plate}</td>
                    <td>{t.driver}</td>
                    <td>{statusBadge(t.status)}</td>
                    <td>
                      <div>{t.load}</div>
                      {t.status === "in_transit" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                          <div style={{ flex: 1, height: 2, background: "var(--line)", position: "relative" }}>
                            <div style={{ position: "absolute", inset: 0, width: `${Math.min(100, t.mi/5)}%`, background: "var(--amber)" }} />
                          </div>
                          <span className="t-tiny t-mute">{t.mi} MI</span>
                        </div>
                      )}
                    </td>
                    <td className="num">{t.rate ? `$${t.rate.toLocaleString()}` : <span className="t-mute">—</span>}</td>
                    <td className="t-dim">{t.eta}</td>
                    <td>{ptiBadge(t.pti)}</td>
                    <td className="num">
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span style={{
                          display: "inline-block", width: 28, height: 6, background: "var(--line)",
                          position: "relative"
                        }}>
                          <span style={{
                            position: "absolute", left: 0, top: 0, bottom: 0, width: `${t.fuel}%`,
                            background: t.fuel < 25 ? "var(--red)" : t.fuel < 50 ? "var(--amber)" : "var(--green)"
                          }} />
                        </span>
                        <span style={{ color: t.fuel < 25 ? "var(--red)" : "var(--ink)" }}>{t.fuel}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Lane strip — current rolling units, geographic-ish */}
          <div style={{ borderTop: "1px solid var(--line)", padding: "12px 16px", background: "var(--bg-elev)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span className="t-tiny t-up t-mute">· LANE STRIP · CONUS WEST→EAST</span>
              <span className="t-tiny t-mute">SCALE 1:8M  ·  REFRESH 30s</span>
            </div>
            <div style={{ position: "relative", height: 64, background: "var(--bg)", border: "1px solid var(--line)" }}>
              {/* Lat markers */}
              {["LAX","PHX","DEN","DAL","CMH","ATL","MIA"].map((c, i) => (
                <div key={c} style={{
                  position: "absolute", left: `${(i/6)*100}%`, top: 0, bottom: 0,
                  borderLeft: "1px dashed var(--line)", paddingLeft: 4, paddingTop: 4,
                }}>
                  <span className="t-tiny t-mute">{c}</span>
                </div>
              ))}
              {/* Routes */}
              {[
                { from: 25, to: 50, label: "T-101", y: 16 },
                { from: 62, to: 80, label: "T-102", y: 32 },
                { from: 80, to: 80, label: "T-104", y: 48 },
                { from: 25, to: 40, label: "T-108", y: 24 },
              ].map((r, i) => (
                <div key={i} style={{
                  position: "absolute", left: `${r.from}%`, top: r.y,
                  width: `${r.to - r.from}%`, height: 2, background: "var(--amber)",
                }}>
                  <span style={{
                    position: "absolute", right: -34, top: -8,
                    fontFamily: "var(--mono)", fontSize: 9, color: "var(--amber)",
                    letterSpacing: "0.08em"
                  }}>● {r.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — Alerts + PTI compliance + Quick actions */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          {/* Alerts feed */}
          <div style={{ display: "flex", flexDirection: "column", borderBottom: "1px solid var(--line)" }}>
            <div className="panel-head" style={{ padding: "10px 16px" }}>
              <span>· ALERT FEED</span>
              <span className="ph-r">07 ITEMS · SHIFT</span>
            </div>
            <div>
              {alerts.map((a, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "48px 12px 1fr",
                  padding: "8px 16px", borderBottom: "1px solid var(--line)",
                  fontSize: 11, alignItems: "baseline",
                }}>
                  <span className="t-mute" style={{ fontFamily: "var(--mono)" }}>{a.t}</span>
                  <span className="dot" style={{
                    background: a.tone === "red" ? "var(--red)" : a.tone === "amber" ? "var(--amber)" : "var(--ink-mute)"
                  }} />
                  <span style={{ color: a.tone === "red" ? "var(--red)" : a.tone === "amber" ? "var(--amber)" : "var(--ink-dim)" }}>
                    {a.txt}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* PTI Compliance bar */}
          <div style={{ borderBottom: "1px solid var(--line)" }}>
            <div className="panel-head" style={{ padding: "10px 16px" }}>
              <span>· PTI COMPLIANCE · 14D</span>
              <span className="ph-r">AVG 92.8%</span>
            </div>
            <div style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
                {ptiStrip.map((v, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{
                      width: "100%",
                      height: `${(v/8)*100}%`,
                      background: v >= 8 ? "var(--green)" : v >= 7 ? "var(--amber)" : "var(--red)",
                    }} />
                    <span className="t-tiny t-mute" style={{ fontSize: 8 }}>{14-i}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                <span className="t-tiny t-mute">14d ago</span>
                <span className="t-tiny t-mute">TODAY · 6/8</span>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ flex: 1, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="t-tiny t-up t-mute">· QUICK COMMAND</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button className="btn primary">▸ NUDGE LATE PTI</button>
              <button className="btn">+ NEW LOAD</button>
              <button className="btn">+ DISPATCH</button>
              <button className="btn">RTS BATCH</button>
              <button className="btn">DRIVER MSG</button>
              <button className="btn">EXPORT CSV</button>
            </div>
            <div style={{ marginTop: 4, padding: 10, border: "1px solid var(--line)", background: "var(--bg-elev)" }}>
              <span className="t-tiny t-up t-mute">CONSOLE</span>
              <pre style={{ margin: "6px 0 0", fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-dim)", whiteSpace: "pre-wrap" }}>
{`> nudge T-108
  ↳ telegram::send · OK · msg#48211
> tail pti --today
  6/8 OK · 1 LATE · 1 MISS
_`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { OverviewScreen });
