/* dashboard-chrome.jsx — TIR top bar, side rail, status ticker */
/* exports: TopBar, SideRail, Ticker, Clock, Stat */

const TIR_LOGO = ({ size = 22 }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
    <span style={{
      fontFamily: "var(--sans)",
      fontWeight: 700,
      fontSize: size,
      letterSpacing: "0.04em",
      color: "var(--amber)",
      lineHeight: 1,
    }}>TIR</span>
    <span style={{
      fontFamily: "var(--mono)",
      fontSize: 9,
      letterSpacing: "0.2em",
      color: "var(--ink-mute)",
      textTransform: "uppercase",
    }}>/DISPATCH·v0.4</span>
  </div>
);

const Clock = () => (
  <div style={{ display: "flex", gap: 18, alignItems: "center", fontSize: 11 }}>
    <div>
      <span className="t-mute t-tiny t-up" style={{ marginRight: 6 }}>UTC</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>22:14:08</span>
    </div>
    <div>
      <span className="t-mute t-tiny t-up" style={{ marginRight: 6 }}>CT</span>
      <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--amber)" }}>17:14:08</span>
    </div>
    <div>
      <span className="t-mute t-tiny t-up" style={{ marginRight: 6 }}>DATE</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>2026.05.28 / THU</span>
    </div>
  </div>
);

const TopBar = ({ activeTab = "overview" }) => {
  const tabs = [
    ["overview", "Overview", "F1"],
    ["pti", "PTI Inspection", "F2"],
    ["loads", "Loads / Dispatch", "F3"],
    ["fleet", "Fleet Roster", "F4"],
    ["factoring", "Factoring", "F5"],
  ];
  return (
    <div style={{ borderBottom: "1px solid var(--line)" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 16px", borderBottom: "1px solid var(--line)",
        background: "var(--bg-elev)",
      }}>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <TIR_LOGO />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="dot amber" />
            <span className="t-tiny t-up t-dim">SYS ONLINE</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="dot green" />
            <span className="t-tiny t-up t-dim">API · 200 OK</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="dot green" />
            <span className="t-tiny t-up t-dim">BOT · 18 SESS</span>
          </div>
        </div>
        <Clock />
        <div style={{ display: "flex", gap: 8 }}>
          <span className="t-tiny t-up t-mute">OPERATOR</span>
          <span className="t-tiny t-up" style={{ color: "var(--ink)" }}>M.YILMAZ · 02</span>
        </div>
      </div>
      <div style={{ display: "flex", padding: "0 16px", gap: 0, background: "var(--bg)" }}>
        {tabs.map(([id, label, key]) => {
          const on = id === activeTab;
          return (
            <div key={id} style={{
              padding: "10px 16px",
              borderRight: "1px solid var(--line)",
              borderBottom: on ? "2px solid var(--amber)" : "2px solid transparent",
              background: on ? "var(--panel)" : "transparent",
              display: "flex", gap: 10, alignItems: "center",
              cursor: "pointer",
            }}>
              <span className="t-tiny t-up" style={{ color: "var(--ink-mute)" }}>{key}</span>
              <span style={{ fontSize: 12, color: on ? "var(--amber)" : "var(--ink)", letterSpacing: "0.04em" }}>
                {label}
              </span>
            </div>
          );
        })}
        <div style={{ flex: 1 }}></div>
        <div style={{ padding: "10px 16px", display: "flex", gap: 12, alignItems: "center" }}>
          <span className="t-tiny t-up t-mute">CMD</span>
          <span style={{
            fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-dim)",
            border: "1px solid var(--line)", padding: "2px 8px"
          }}>:_</span>
        </div>
      </div>
    </div>
  );
};

const Ticker = ({ items }) => (
  <div style={{
    display: "flex", gap: 32, padding: "6px 16px",
    background: "var(--bg-elev)", borderBottom: "1px solid var(--line)",
    fontSize: 10, fontFamily: "var(--mono)", letterSpacing: "0.08em",
    color: "var(--ink-dim)", overflow: "hidden", whiteSpace: "nowrap",
  }}>
    {items.map((it, i) => (
      <span key={i} style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
        <span className="t-mute">{String(i+1).padStart(2,"0")}</span>
        <span style={{ color: it.tone === "amber" ? "var(--amber)" : it.tone === "red" ? "var(--red)" : "var(--ink-dim)" }}>
          {it.t}
        </span>
        <span>{it.body}</span>
      </span>
    ))}
  </div>
);

const Stat = ({ label, value, sub, tone = "default", spark }) => {
  const colors = {
    default: "var(--ink)",
    amber: "var(--amber)",
    green: "var(--green)",
    red: "var(--red)",
  };
  return (
    <div style={{
      padding: "14px 16px",
      borderRight: "1px solid var(--line)",
      flex: 1,
      display: "flex", flexDirection: "column", gap: 8,
      minHeight: 92,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span className="t-tiny t-up t-mute">{label}</span>
        {sub && <span className="t-tiny t-mute">{sub}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span className="t-num" style={{ fontSize: 36, color: colors[tone], lineHeight: 1 }}>{value}</span>
        {spark && <span style={{ color: "var(--ink-mute)", fontSize: 10 }}>{spark}</span>}
      </div>
    </div>
  );
};

Object.assign(window, { TopBar, Ticker, Clock, Stat, TIR_LOGO });
