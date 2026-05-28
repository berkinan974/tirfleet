/* screen-fleet.jsx — Fleet roster: trucks + drivers + license/expiry tracking */

const FleetScreen = () => {
  const trucks = [
    { unit: "T-101", plate: "TX·482·9JL", make: "Peterbilt", model: "579",  year: 2022, miles: 184_220, status: "active",      driver: "M. Demir",     vin: "1XPBD49X1ND123841" },
    { unit: "T-102", plate: "IL·771·2QR", make: "Freightliner", model: "Cascadia", year: 2021, miles: 248_910, status: "active", driver: "E. Kaya",      vin: "3AKJHHDR8MSMR2987" },
    { unit: "T-103", plate: "OH·339·8KP", make: "Kenworth", model: "T680",  year: 2023, miles: 92_140,  status: "active",      driver: "R. Hoffman",   vin: "1XKYD49X0PJ994201" },
    { unit: "T-104", plate: "GA·104·6BX", make: "Volvo",    model: "VNL760",year: 2020, miles: 312_840, status: "active",      driver: "S. Yıldız",    vin: "4V4NC9EH8LN221455" },
    { unit: "T-105", plate: "CA·228·5MZ", make: "Peterbilt", model: "579",  year: 2022, miles: 158_320, status: "active",      driver: "J. Reyes",     vin: "1XPBD49X3ND109283" },
    { unit: "T-106", plate: "TX·919·3HD", make: "Kenworth", model: "T880",  year: 2019, miles: 421_220, status: "maintenance", driver: "B. Aksoy",     vin: "1NKZL40X9KJ301122" },
    { unit: "T-107", plate: "FL·552·1VC", make: "Freightliner", model: "Cascadia", year: 2024, miles: 41_120,  status: "active", driver: "A. Thompson",  vin: "3AKJHHDR9PSMS8821" },
    { unit: "T-108", plate: "AZ·047·7TN", make: "Peterbilt", model: "389",  year: 2018, miles: 488_700, status: "active",      driver: "K. Özkan",     vin: "1XPXD49X3JD881003" },
  ];

  const drivers = [
    { id: 1, name: "Mehmet Demir",     phone: "+1·312·555·0184", tg: "@m_demir84",   license: "TX-CDL·D1148290",  exp: "2028.03.14", truck: "T-101", flag: "TR/US" },
    { id: 2, name: "Emre Kaya",        phone: "+1·773·555·0211", tg: "@ekaya_drv",   license: "IL-CDL·K0048772",  exp: "2027.09.22", truck: "T-102", flag: "TR/US" },
    { id: 3, name: "Ryan Hoffman",     phone: "+1·614·555·0339", tg: "@rhoffman",    license: "OH-CDL·H7820114",  exp: "2026.11.04", truck: "T-103", flag: "US", warn: true },
    { id: 4, name: "Selçuk Yıldız",    phone: "+1·404·555·0410", tg: "@s_yildiz",    license: "GA-CDL·Y3001882",  exp: "2029.01.18", truck: "T-104", flag: "TR/US" },
    { id: 5, name: "Javier Reyes",     phone: "+1·310·555·0220", tg: "@jreyes",      license: "CA-CDL·R8821471",  exp: "2027.07.30", truck: "T-105", flag: "US" },
    { id: 6, name: "Burak Aksoy",      phone: "+1·281·555·0901", tg: "@b_aksoy",     license: "TX-CDL·A2200118",  exp: "2026.06.12", truck: "T-106", flag: "TR/US", warn: true },
    { id: 7, name: "Aaron Thompson",   phone: "+1·305·555·0551", tg: "@athompson",   license: "FL-CDL·T0094218",  exp: "2030.02.09", truck: "T-107", flag: "US" },
    { id: 8, name: "Koray Özkan",      phone: "+1·602·555·0470", tg: "—",            license: "AZ-CDL·O1148902",  exp: "2028.10.27", truck: "T-108", flag: "TR/US", noTg: true },
  ];

  // Maintenance / compliance calendar — items expiring soon
  const calendar = [
    { d: "JUN 06", days: 9,  unit: "T-106", task: "DOT ANNUAL INSPECTION",  tone: "red" },
    { d: "JUN 12", days: 15, unit: "DRV-6", task: "B. AKSOY · CDL RENEW",   tone: "red" },
    { d: "JUN 21", days: 24, unit: "T-104", task: "OIL + FILTER · 312K MI", tone: "amber" },
    { d: "JUL 04", days: 37, unit: "T-101", task: "TIRE ROTATION",          tone: "amber" },
    { d: "JUL 18", days: 51, unit: "—",     task: "IFTA Q2 FILING",         tone: "amber" },
    { d: "AUG 02", days: 66, unit: "T-108", task: "TRANS SERVICE",          tone: "" },
    { d: "NOV 04", days: 160,unit: "DRV-3", task: "R. HOFFMAN · CDL RENEW", tone: "" },
  ];

  return (
    <div className="tir-root tir-grid-bg" style={{ width: 1440, height: 900, display: "flex", flexDirection: "column" }}>
      <TopBar activeTab="fleet" />
      <Ticker items={[
        { t: "FLEET",       body: "08 TRUCKS · 07 ACTIVE · 01 SHOP · AVG AGE 3.4Y", tone: "amber" },
        { t: "DRIVERS",     body: "08 DRIVERS · 07 TG·BOUND · 01 UNBOUND",          tone: "amber" },
        { t: "COMPLIANCE",  body: "2 ITEMS DUE ≤ 14D · CDL · DOT",                   tone: "red" },
        { t: "INSURANCE",   body: "PROGRESSIVE · POL #C-44821 · EXP 12.31.2026" },
      ]} />

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1.2fr 1fr 360px", minHeight: 0 }}>
        {/* TRUCKS */}
        <div style={{ borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div className="panel-head" style={{ padding: "10px 16px" }}>
            <span>· TRUCK ROSTER · 8 UNITS</span>
            <span className="ph-r">+ ADD UNIT</span>
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Plate</th>
                  <th>Make / Model</th>
                  <th className="num">YR</th>
                  <th className="num">Odometer</th>
                  <th>Status</th>
                  <th>Assigned</th>
                </tr>
              </thead>
              <tbody>
                {trucks.map((t) => (
                  <tr key={t.unit}>
                    <td>
                      <div className="t-display" style={{ fontSize: 15, color: "var(--ink)" }}>{t.unit}</div>
                      <div className="t-tiny t-mute" style={{ marginTop: 2 }}>{t.vin}</div>
                    </td>
                    <td className="t-dim">{t.plate}</td>
                    <td>
                      <div>{t.make}</div>
                      <div className="t-tiny t-mute">{t.model}</div>
                    </td>
                    <td className="num">{t.year}</td>
                    <td className="num">
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                        <span style={{ color: t.miles > 400_000 ? "var(--amber)" : "var(--ink)" }}>
                          {t.miles.toLocaleString()}
                        </span>
                        <span style={{ width: 56, height: 3, background: "var(--line)", marginTop: 4, position: "relative" }}>
                          <span style={{
                            position: "absolute", inset: 0, width: `${Math.min(100, (t.miles/500_000)*100)}%`,
                            background: t.miles > 400_000 ? "var(--amber)" : "var(--green)"
                          }} />
                        </span>
                      </div>
                    </td>
                    <td>
                      {t.status === "active" && <span className="tag green">ACTIVE</span>}
                      {t.status === "maintenance" && <span className="tag red">SHOP</span>}
                    </td>
                    <td className="t-dim">{t.driver}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Fleet age + utilization */}
          <div style={{ borderTop: "1px solid var(--line)", padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, background: "var(--bg-elev)" }}>
            <div>
              <div className="t-tiny t-up t-mute" style={{ marginBottom: 6 }}>AVG ODO</div>
              <div className="t-num" style={{ fontSize: 26, color: "var(--ink)" }}>243K<span className="t-tiny t-mute"> MI</span></div>
            </div>
            <div>
              <div className="t-tiny t-up t-mute" style={{ marginBottom: 6 }}>UTILIZATION · 30D</div>
              <div className="t-num" style={{ fontSize: 26, color: "var(--green)" }}>78<span className="t-tiny t-mute">%</span></div>
            </div>
            <div>
              <div className="t-tiny t-up t-mute" style={{ marginBottom: 6 }}>AVG FLEET AGE</div>
              <div className="t-num" style={{ fontSize: 26, color: "var(--ink)" }}>3.4<span className="t-tiny t-mute"> YR</span></div>
            </div>
          </div>
        </div>

        {/* DRIVERS */}
        <div style={{ borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div className="panel-head" style={{ padding: "10px 16px" }}>
            <span>· DRIVER ROSTER · 8 ACTIVE</span>
            <span className="ph-r">+ ADD DRIVER</span>
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            {drivers.map((d) => (
              <div key={d.id} style={{
                padding: "14px 16px", borderBottom: "1px solid var(--line)",
                display: "grid", gridTemplateColumns: "40px 1fr auto", gap: 12, alignItems: "center",
              }}>
                <div style={{
                  width: 36, height: 36, border: "1px solid var(--line-strong)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--sans)", fontSize: 14, color: "var(--amber)",
                  background: "var(--bg-elev)",
                }}>
                  {d.name.split(" ").map(p => p[0]).slice(0,2).join("")}
                </div>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                    <span style={{ color: "var(--ink)", fontSize: 13 }}>{d.name}</span>
                    <span className="t-tiny t-mute">DRV·{String(d.id).padStart(3,"0")}</span>
                    <span className="tag" style={{
                      borderColor: "var(--line-strong)", color: "var(--ink-dim)",
                      padding: "1px 5px", fontSize: 9
                    }}>{d.flag}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <span className="t-tiny t-dim">{d.phone}</span>
                    <span className="t-tiny t-mute">·</span>
                    <span className="t-tiny" style={{ color: d.noTg ? "var(--red)" : "var(--ink-dim)" }}>
                      {d.tg}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <span className="t-tiny t-mute">CDL</span>
                    <span className="t-tiny t-dim">{d.license}</span>
                    <span className="t-tiny t-mute">·</span>
                    <span className="t-tiny t-mute">EXP</span>
                    <span className="t-tiny" style={{ color: d.warn ? "var(--amber)" : "var(--ink-dim)" }}>{d.exp}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="t-display" style={{ fontSize: 15, color: "var(--amber)" }}>{d.truck}</div>
                  {d.warn && <div className="tag amber" style={{ marginTop: 4 }}>CDL ≤ 6MO</div>}
                  {d.noTg && <div className="tag red" style={{ marginTop: 4 }}>NO TG</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COMPLIANCE CALENDAR */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div className="panel-head" style={{ padding: "10px 16px" }}>
            <span>· COMPLIANCE · NEXT 180D</span>
            <span className="ph-r">7 ITEMS</span>
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            {calendar.map((c, i) => (
              <div key={i} style={{
                padding: "14px 16px", borderBottom: "1px solid var(--line)",
                display: "grid", gridTemplateColumns: "64px 1fr 32px", gap: 12, alignItems: "center",
                borderLeft:
                  c.tone === "red"   ? "2px solid var(--red)" :
                  c.tone === "amber" ? "2px solid var(--amber)" : "2px solid transparent",
              }}>
                <div>
                  <div className="t-display" style={{ fontSize: 14, color:
                    c.tone === "red"   ? "var(--red)" :
                    c.tone === "amber" ? "var(--amber)" : "var(--ink)"
                  }}>{c.d}</div>
                  <div className="t-tiny t-mute">+{c.days}d</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--ink)" }}>{c.task}</div>
                  <div className="t-tiny t-mute" style={{ marginTop: 2 }}>{c.unit}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ color: "var(--ink-mute)", fontFamily: "var(--mono)", fontSize: 14 }}>›</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid var(--line)", padding: 14, background: "var(--bg-elev)" }}>
            <div className="t-tiny t-up t-mute" style={{ marginBottom: 8 }}>INSURANCE · ACTIVE</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11 }}>
              <span className="t-mute">Carrier</span>      <span>Progressive Commercial</span>
              <span className="t-mute">Policy</span>       <span className="t-mono">C-44821</span>
              <span className="t-mute">Premium / mo</span> <span>$4,820</span>
              <span className="t-mute">Liability</span>    <span>$1,000,000</span>
              <span className="t-mute">Cargo</span>        <span>$100,000</span>
              <span className="t-mute">Expires</span>      <span style={{ color: "var(--amber)" }}>2026.12.31</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { FleetScreen });
