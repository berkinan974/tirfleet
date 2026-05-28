/* screen-bot.jsx — Driver-side Telegram bot screens (in iOS device frame) */

/* Generic chat-app dark UI for the @TIR_PTI_BOT conversation.
   No platform logos/marks — just bubbles, time, and an input row. */

const ChatBubble = ({ from, time, children, photos, system }) => {
  const isBot = from === "bot";
  const isSys = from === "system";

  if (isSys) {
    return (
      <div style={{ textAlign: "center", margin: "16px 0" }}>
        <span style={{
          fontFamily: "-apple-system, system-ui", fontSize: 11,
          color: "rgba(255,255,255,0.45)",
          background: "rgba(255,255,255,0.06)",
          padding: "4px 10px", borderRadius: 12,
        }}>{children}</span>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: isBot ? "flex-start" : "flex-end",
      marginBottom: 6,
    }}>
      <div style={{
        maxWidth: "78%",
        background: isBot ? "#262d34" : "#3b6eb3",
        color: "#fff",
        padding: "8px 12px",
        borderRadius: 16,
        borderBottomLeftRadius: isBot ? 4 : 16,
        borderBottomRightRadius: isBot ? 16 : 4,
        fontFamily: "-apple-system, system-ui",
        fontSize: 14,
        lineHeight: 1.35,
        position: "relative",
      }}>
        {isBot && (
          <div style={{ fontSize: 12, color: "#ffb800", fontWeight: 600, marginBottom: 2 }}>
            TIR Dispatch
          </div>
        )}
        {photos && (
          <div style={{
            display: "grid",
            gridTemplateColumns: photos === 1 ? "1fr" : "1fr 1fr",
            gap: 2,
            marginBottom: children ? 6 : 0,
            marginLeft: -6, marginRight: -6, marginTop: -4,
            borderRadius: 10, overflow: "hidden",
          }}>
            {Array.from({ length: photos }).map((_, i) => (
              <div key={i} style={{
                aspectRatio: photos === 1 ? "4/3" : "1/1",
                background:
                  `repeating-linear-gradient(135deg, #1a1d20 0 6px, #15171a 6px 12px)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "rgba(255,255,255,0.4)", fontSize: 10,
                letterSpacing: "0.2em", textTransform: "uppercase",
                position: "relative",
              }}>
                {["FRONT","REAR","L-SIDE","R-SIDE","TIRE","TIRE"][i] || `IMG ${i+1}`}
                <span style={{
                  position: "absolute", top: 6, right: 8, fontSize: 9, color: "#ffb800",
                }}>{String(i+1).padStart(2,"0")}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ whiteSpace: "pre-wrap" }}>{children}</div>
        <div style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.55)",
          textAlign: "right",
          marginTop: 2,
        }}>{time}{!isBot && <span style={{ marginLeft: 4 }}>✓✓</span>}</div>
      </div>
    </div>
  );
};

const BotChatHeader = ({ subtitle = "bot · online" }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 14px",
    background: "#1c2229",
    borderBottom: "1px solid #0d1014",
    color: "#fff",
    fontFamily: "-apple-system, system-ui",
  }}>
    <span style={{ color: "#7aa8e0", fontSize: 22 }}>‹</span>
    <div style={{
      width: 34, height: 34, borderRadius: "50%",
      background: "#ffb800", color: "#0a0b0a",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Oswald, sans-serif", fontWeight: 700, fontSize: 14,
      letterSpacing: "0.04em",
    }}>TIR</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 15, fontWeight: 600 }}>TIR Dispatch</div>
      <div style={{ fontSize: 11, color: "#7aa8e0" }}>{subtitle}</div>
    </div>
    <span style={{ color: "#7aa8e0", fontSize: 18 }}>⋯</span>
  </div>
);

const BotInputRow = ({ keyboard }) => (
  <div style={{ background: "#1c2229", borderTop: "1px solid #0d1014" }}>
    {keyboard && (
      <div style={{ display: "flex", gap: 6, padding: "10px 10px 8px" }}>
        {keyboard.map((k, i) => (
          <button key={i} style={{
            flex: 1, padding: "10px 8px",
            background: "#2a323a", border: "0", borderRadius: 8,
            color: "#fff", fontSize: 14, fontFamily: "-apple-system, system-ui",
            fontWeight: 500,
          }}>{k}</button>
        ))}
      </div>
    )}
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px 10px" }}>
      <span style={{ fontSize: 22, color: "#7aa8e0" }}>＋</span>
      <div style={{
        flex: 1, background: "#0d1014", borderRadius: 18,
        padding: "8px 14px", color: "rgba(255,255,255,0.45)",
        fontFamily: "-apple-system, system-ui", fontSize: 14,
      }}>Message</div>
      <span style={{ fontSize: 22, color: "#7aa8e0" }}>🎤</span>
    </div>
  </div>
);

const BotFrame = ({ children, headerSubtitle }) => (
  <div style={{
    width: "100%", height: "100%",
    display: "flex", flexDirection: "column",
    background: "#0e1216",
    fontFamily: "-apple-system, system-ui",
  }}>
    <BotChatHeader subtitle={headerSubtitle} />
    <div style={{ flex: 1, padding: "14px 12px", overflow: "hidden", display: "flex", flexDirection: "column", gap: 0 }}>
      {children}
    </div>
  </div>
);

/* ── SCREEN 1 · /start — driver opens the bot ─────────────── */
const BotScreenStart = () => (
  <BotFrame headerSubtitle="bot · @tir_pti_bot">
    <ChatBubble from="system">May 28 · Thursday</ChatBubble>
    <ChatBubble from="bot" time="06:00">
      {"Good morning, Mehmet.\n\nIt's time for today's pre-trip inspection (PTI).\n\nSend at least 4 photos covering:\n  • front + rear\n  • both sides\n  • all four tires\n\nWhen finished, tap PTI DONE or send /pti_tamam."}
    </ChatBubble>
    <ChatBubble from="bot" time="06:00">
      {"Truck assigned · T-101 · TX·482·9JL\nLane today · DAL → PHX · 1,064 mi"}
    </ChatBubble>
    <div style={{ flex: 1 }} />
    <BotInputRow keyboard={["▸ START PTI", "STATUS"]} />
  </BotFrame>
);

/* ── SCREEN 2 · Uploading photos ──────────────────────────── */
const BotScreenUpload = () => (
  <BotFrame headerSubtitle="bot · typing…">
    <ChatBubble from="bot" time="07:38">
      {"PTI session opened.\nSend photos / videos. /pti_tamam when done."}
    </ChatBubble>
    <ChatBubble from="driver" time="07:39" photos={2}>
      {null}
    </ChatBubble>
    <ChatBubble from="bot" time="07:39">
      {"2 photos received."}
    </ChatBubble>
    <ChatBubble from="driver" time="07:41" photos={4}>
      {null}
    </ChatBubble>
    <ChatBubble from="bot" time="07:41">
      {"6 photos received. Send tire close-ups if not done."}
    </ChatBubble>
    <div style={{ flex: 1 }} />
    <BotInputRow keyboard={["✓ PTI DONE", "CANCEL"]} />
  </BotFrame>
);

/* ── SCREEN 3 · Confirmed ─────────────────────────────────── */
const BotScreenDone = () => (
  <BotFrame headerSubtitle="bot · online">
    <ChatBubble from="driver" time="07:42">/pti_tamam</ChatBubble>
    <ChatBubble from="bot" time="07:42">
      {"PTI recorded.\n\n  Ref · PTI-2026-0528-001\n  Photos · 6\n  Videos · 0\n  Submitted · 07:42 CT\n\nSafe travels."}
    </ChatBubble>
    <ChatBubble from="system">Auto-check: PASS · 6/4 photos · all angles ✓</ChatBubble>
    <ChatBubble from="bot" time="07:45">
      {"Dispatch note for today\n\n  T-101 · DAL → PHX\n  Pickup · DAL-YARD · 14:00 CT\n  Delivery · PHX-WH4 · 22:00 (Fri)\n  Rate · $3,850\n\nFuel stop suggested: TA Tucumcari (NM) · 612 mi."}
    </ChatBubble>
    <div style={{ flex: 1 }} />
    <BotInputRow keyboard={["STATUS", "REPORT ISSUE"]} />
  </BotFrame>
);

/* ── SCREEN 4 · /status check, plus reminder nudge ────────── */
const BotScreenStatus = () => (
  <BotFrame headerSubtitle="bot · online">
    <ChatBubble from="system">May 27 · Wednesday</ChatBubble>
    <ChatBubble from="driver" time="16:24">/status</ChatBubble>
    <ChatBubble from="bot" time="16:24">
      {"Status · OK\n\n  • PTI today · ✓ submitted 07:38\n  • Active load · CHI → ATL (in transit)\n  • Miles today · 287\n  • HOS remaining · 02:11"}
    </ChatBubble>
    <ChatBubble from="system">May 28 · Thursday · 08:30</ChatBubble>
    <ChatBubble from="bot" time="08:30">
      {"⚑ Reminder — you haven't sent today's PTI yet.\n\nDispatch needs photos before 09:00 CT to keep you on schedule for the PHX run.\n\nTap START PTI to begin."}
    </ChatBubble>
    <ChatBubble from="bot" time="08:30">
      {"If the truck is in the shop or you're on a rest day, reply /exempt with the reason."}
    </ChatBubble>
    <div style={{ flex: 1 }} />
    <BotInputRow keyboard={["▸ START PTI", "/EXEMPT"]} />
  </BotFrame>
);

Object.assign(window, { BotScreenStart, BotScreenUpload, BotScreenDone, BotScreenStatus });
