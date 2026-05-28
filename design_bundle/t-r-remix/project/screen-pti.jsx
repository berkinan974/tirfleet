/* screen-pti.jsx — PTI inspection review screen */

const PTIScreen = () => {
  const drivers = [
    { id: 1, name: "M. Demir",     unit: "T-101", time: "07:42",  state: "ok",      mediaN: 6, selected: false },
    { id: 2, name: "E. Kaya",      unit: "T-102", time: "07:58",  state: "ok",      mediaN: 5 },
    { id: 3, name: "R. Hoffman",   unit: "T-103", time: "08:14",  state: "ok",      mediaN: 8, selected: true },
    { id: 4, name: "S. Yıldız",    unit: "T-104", time: "11:32",  state: "late",    mediaN: 4 },
    { id: 5, name: "J. Reyes",     unit: "T-105", time: "07:21",  state: "ok",      mediaN: 7 },
    { id: 6, name: "B. Aksoy",     unit: "T-106", time: "—",      state: "skip",    mediaN: 0 },
    { id: 7, name: "A. Thompson",  unit: "T-107", time: "08:02",  state: "ok",      mediaN: 5 },
    { id: 8, name: "K. Özkan",     unit: "T-108", time: "—",      state: "miss",    mediaN: 0 },
  ];

  const ptiSlots = [
    { label: "FRONT", note: "" },
    { label: "REAR", note: "" },
    { label: "L-SIDE", note: "" },
    { label: "R-SIDE", note: "" },
    { label: "TIRE FL", note: "" },
    { label: "TIRE FR", note: "" },
    { label: "TIRE RL", note: "" },
    { label: "TIRE RR", note: "" },
  ];

  return (
    <div className="tir-root tir-grid-bg" style={{ width: 1440, height: 900, display: "flex", flexDirection: "column" }}>
      <TopBar activeTab="pti" />
      <Ticker items={[
        { t: "PTI", body: "WINDOW · 06:00 → 09:00 CT · DAILY", tone: "amber" },
        { t: "TODAY", body: "6 OK · 1 LATE · 1 MISS · 1 EXEMPT" },
        { t: "POLICY", body: "MIN 4 PHOTOS · FSMA 49 CFR §392.7" },
      ]} />

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "360px 1fr 320px", minHeight: 0 }}>
        {/* LEFT — driver list */}
        <div style={{ borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column" }}>
          <div className="panel-head" style={{ padding: "10px 16px" }}>
            <span>· ROSTER · {drivers.length} DRIVERS</span>
            <span className="ph-r">2026.05.28</span>
          </div>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--line)", display: "flex", gap: 6 }}>
            <span className="tag amber">ALL · 8</span>
            <span className="tag green">OK · 6</span>
            <span className="tag amber">LATE · 1</span>
            <span className="tag red">MISS · 1</span>
          </div>
          {drivers.map((d) => {
            const tone =
              d.state === "ok"   ? "var(--green)" :
              d.state === "late" ? "var(--amber)" :
              d.state === "miss" ? "var(--red)" : "var(--ink-mute)";
            return (
              <div key={d.id} style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--line)",
                background: d.selected ? "var(--panel-2)" : "transparent",
                borderLeft: d.selected ? "2px solid var(--amber)" : "2px solid transparent",
                display: "grid", gridTemplateColumns: "28px 1fr auto", gap: 12, alignItems: "center",
                cursor: "pointer",
              }}>
                <span className="dot" style={{ background: tone }} />
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                    <span style={{ color: d.selected ? "var(--amber)" : "var(--ink)" }}>{d.name}</span>
                    <span className="t-tiny t-mute">DRV·{String(d.id).padStart(3,"0")}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <span className="t-tiny t-dim">{d.unit}</span>
                    <span className="t-tiny t-mute">·</span>
                    <span className="t-tiny t-dim">{d.time}</span>
                    {d.mediaN > 0 && <>
                      <span className="t-tiny t-mute">·</span>
                      <span className="t-tiny t-dim">{d.mediaN} PHOTO</span>
                    </>}
                  </div>
                </div>
                <div>
                  {d.state === "ok"   && <span className="tag green">OK</span>}
                  {d.state === "late" && <span className="tag amber">LATE</span>}
                  {d.state === "miss" && <span className="tag red">MISS</span>}
                  {d.state === "skip" && <span className="tag">SHOP</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* CENTER — selected PTI report */}
        <div style={{ display: "flex", flexDirection: "column", borderRight: "1px solid var(--line)" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", background: "var(--bg-elev)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="t-tiny t-up t-mute" style={{ marginBottom: 4 }}>PTI REPORT · PTI-2026-0528-003</div>
                <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
                  <span className="t-display" style={{ fontSize: 28, color: "var(--ink)" }}>R. HOFFMAN</span>
                  <span className="t-num" style={{ fontSize: 22, color: "var(--amber)" }}>T-103</span>
                  <span className="t-dim">OH·339·8KP</span>
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
                  <span className="t-tiny t-up t-dim">SUB · 08:14:22 CT</span>
                  <span className="t-tiny t-up t-dim">TG#48207</span>
                  <span className="t-tiny t-up t-dim">8 MEDIA · 2 VIDEO · 6 PHOTO</span>
                  <span className="t-tiny t-up t-dim">GPS · CMH-YARD</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn primary">✓ APPROVE</button>
                <button className="btn">⚑ FLAG</button>
                <button className="btn">✕ REJECT</button>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, padding: 20, overflow: "hidden" }}>
            <div className="t-tiny t-up t-mute" style={{ marginBottom: 12 }}>· INSPECTION MEDIA · 8 ITEMS</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {ptiSlots.map((s, i) => (
                <div key={i} className="photo-slot" style={{ aspectRatio: "4/3" }}>
                  <div style={{ position: "absolute", top: 6, left: 8, fontSize: 9, color: "var(--amber)", letterSpacing: "0.16em" }}>
                    {String(i+1).padStart(2,"0")}
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div>{s.label}</div>
                    <div className="t-tiny t-mute" style={{ marginTop: 4 }}>IMG · 1920×1440</div>
                  </div>
                  <div style={{ position: "absolute", bottom: 6, right: 8, fontSize: 9, color: "var(--ink-mute)" }}>
                    08:14
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ border: "1px solid var(--line)", padding: 12 }}>
                <div className="t-tiny t-up t-mute" style={{ marginBottom: 6 }}>DRIVER NOTE</div>
                <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                  "Right rear tire pressure low — added air at TA Columbus. Brake light bracket loose, taped for now, need shop look."
                </div>
              </div>
              <div style={{ border: "1px solid var(--line)", padding: 12 }}>
                <div className="t-tiny t-up t-mute" style={{ marginBottom: 6 }}>AUTO-CHECK</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 11 }}>
                  <span className="t-dim">Photo count</span><span style={{ color: "var(--green)" }}>8 / ≥4 ✓</span>
                  <span className="t-dim">All angles</span><span style={{ color: "var(--green)" }}>F·R·L·R ✓</span>
                  <span className="t-dim">Tire close-ups</span><span style={{ color: "var(--green)" }}>4 / 4 ✓</span>
                  <span className="t-dim">EXIF time</span><span style={{ color: "var(--green)" }}>WITHIN 14m ✓</span>
                  <span className="t-dim">GPS match</span><span style={{ color: "var(--amber)" }}>±240m</span>
                  <span className="t-dim">Blurry frames</span><span style={{ color: "var(--green)" }}>0 ✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — telegram thread + audit log */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div className="panel-head" style={{ padding: "10px 16px" }}>
            <span>· TELEGRAM THREAD</span>
            <span className="ph-r">@TIR_PTI_BOT</span>
          </div>
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10, fontSize: 11, borderBottom: "1px solid var(--line)" }}>
            {[
              { who: "BOT", t: "06:00", msg: "Good morning. Time for today's PTI. Send 4+ photos covering front, rear, both sides, and tires." },
              { who: "DRV", t: "08:09", msg: "[6 photos · 2 videos]" },
              { who: "DRV", t: "08:14", msg: "/pti_tamam" },
              { who: "BOT", t: "08:14", msg: "PTI recorded. 8 files received. Safe travels." },
              { who: "DISP", t: "08:18", msg: "@hoffman → tire pressure note seen, BAY-2 will inspect tomorrow morning before dispatch." },
            ].map((m, i) => (
              <div key={i} style={{
                borderLeft: m.who === "BOT" ? "2px solid var(--amber)" : m.who === "DRV" ? "2px solid var(--green)" : "2px solid var(--blue)",
                paddingLeft: 10,
              }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <span className="t-tiny t-up" style={{
                    color: m.who === "BOT" ? "var(--amber)" : m.who === "DRV" ? "var(--green)" : "var(--blue)"
                  }}>{m.who}</span>
                  <span className="t-tiny t-mute">{m.t}</span>
                </div>
                <div style={{ color: "var(--ink-dim)", marginTop: 2 }}>{m.msg}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)" }} className="panel-head">
            <span>· AUDIT LOG</span>
            <span className="ph-r">12 EVENTS</span>
          </div>
          <div style={{ padding: 12, fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-dim)" }}>
{`08:14:22  pti.create        driver=3 truck=3
08:14:22  media.write       8 files / 14.2MB
08:14:23  exif.verify       PASS  ±14m
08:14:23  gps.match         WARN  ±240m
08:14:23  pti.mark_valid    auto
08:14:24  telegram.ack      msg#48207
08:18:11  dispatch.comment  u=02 "see bay-2..."
08:18:12  notify.driver     telegram
08:18:12  alerts.create     T-103 tire-pressure
`}
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ borderTop: "1px solid var(--line)", padding: "12px 16px", background: "var(--bg-elev)" }}>
            <div className="t-tiny t-up t-mute" style={{ marginBottom: 8 }}>NUDGE OUTSTANDING</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn primary" style={{ flex: 1 }}>▸ NUDGE K. ÖZKAN</button>
              <button className="btn" style={{ flex: 1 }}>BROADCAST</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { PTIScreen });
