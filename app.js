/* Gut Over Matter. Compiled from app.jsx; edit text here directly if needed. */
const {
  useState,
  useEffect,
  useRef,
  useLayoutEffect
} = React;

// ─── SAFE BROWSER STORAGE ─────────────────────────────────────────────────────
// Everything the app remembers stays in this visitor's own browser (keys start
// with "gom_"). Nothing personal is sent anywhere. If storage is blocked
// (private browsing, full storage), the app keeps working without saving.
const store = {
  get(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {/* not saved */}
  },
  clearAll() {
    try {
      Object.keys(window.localStorage).filter(k => k.indexOf("gom_") === 0).forEach(k => window.localStorage.removeItem(k));
    } catch (e) {/* nothing to clear */}
  }
};

// Same as useState, but remembered between visits on this device.
function useLocalState(key, defaultValue, validate) {
  const [state, setState] = useState(() => {
    const v = store.get(key, defaultValue);
    return validate && !validate(v) ? defaultValue : v;
  });
  useEffect(() => {
    store.set(key, state);
  }, [key, state]);
  return [state, setState];
}

// ─── GUT IQ: LIVE AI WITH BUILT-IN BACKUP ─────────────────────────────────────
// The page never contains an API key. It asks this website's own /api/chat
// function, which keeps the key on the hosting side (Cloudflare) and enforces a
// daily limit per visitor. If that function is not set up, is over its limit,
// or cannot be reached, Gut IQ answers from its built-in library instead.
async function askLiveGutIQ(payload) {
  if (!/^https?:$/.test(window.location.protocol)) return {
    ok: false
  };
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 25000) : null;
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (data && data.limited) return {
      ok: false,
      limited: true,
      message: data.message
    };
    if (res.ok && data && typeof data.text === "string" && data.text.trim()) return {
      ok: true,
      text: data.text.trim()
    };
    return {
      ok: false
    };
  } catch (e) {
    return {
      ok: false
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
function toHistory(msgs) {
  return msgs.filter(m => m && (m.r === "u" || m.r === "a") && typeof m.t === "string").slice(-10).map(m => ({
    r: m.r,
    t: m.t.slice(0, 1500)
  }));
}

// Resolves to { text, redirect, notice }. `localAnswer` is the built-in engine.
async function gutIQReply(payload, localAnswer) {
  const live = await askLiveGutIQ(payload);
  let local = {
    text: "",
    redirect: null
  };
  try {
    local = localAnswer() || local;
  } catch (e) {/* keep empty */}
  if (live.ok) return {
    text: live.text,
    redirect: local.redirect || null,
    notice: null
  };
  let notice = null;
  if (live.limited) {
    const today = new Date().toISOString().slice(0, 10);
    if (store.get("gom_ai_notice_day", "") !== today) {
      store.set("gom_ai_notice_day", today);
      notice = live.message || "You have reached today's limit for live Gut IQ answers. Until tomorrow, Gut IQ will answer from its built-in science library.";
    }
  }
  await new Promise(r => setTimeout(r, 450 + Math.random() * 400));
  return {
    text: local.text || "I could not find an answer to that one. Try asking about a specific IBS topic, like vagal tone, FODMAPs, or the flare cascade.",
    redirect: local.redirect || null,
    notice
  };
}
function NoticeBubble({
  text
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "gom-bubble",
    style: {
      margin: "4px auto 12px",
      maxWidth: "92%",
      background: C.cream,
      border: `1px solid ${C.creamDark}`,
      borderRadius: 12,
      padding: "9px 12px",
      fontSize: 11.5,
      lineHeight: 1.5,
      color: C.charcoal,
      textAlign: "center"
    }
  }, text);
}

// ─── ERROR SCREEN ─────────────────────────────────────────────────────────────
// If any screen ever crashes, show a friendly way back instead of a blank page.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      failed: false
    };
  }
  componentDidCatch(err) {
    try {
      console.error("Gut Over Matter error:", err);
    } catch (e) {/* ignore */}
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        minHeight: "var(--app-h)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
        textAlign: "center",
        background: C.bg,
        fontFamily: "Georgia,serif"
      }
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        color: C.forest,
        fontSize: 20,
        fontStyle: "italic",
        marginBottom: 10
      }
    }, "Gut Over Matter"), /*#__PURE__*/React.createElement("p", {
      style: {
        color: C.charcoal,
        fontSize: 14,
        lineHeight: 1.6,
        maxWidth: 300,
        marginBottom: 18
      }
    }, "Something went wrong on this screen. Reloading usually fixes it."), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.location.reload(),
      style: {
        background: C.forest,
        color: C.white,
        border: "none",
        borderRadius: 24,
        padding: "11px 26px",
        fontSize: 14,
        cursor: "pointer",
        marginBottom: 10
      }
    }, "Reload the app"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        store.clearAll();
        window.location.reload();
      },
      style: {
        background: "transparent",
        color: C.charcoal,
        border: "none",
        fontSize: 12,
        textDecoration: "underline",
        cursor: "pointer",
        opacity: .6
      }
    }, "Reset saved data and reload"));
  }
}
ErrorBoundary.getDerivedStateFromError = function () {
  return {
    failed: true
  };
};

// ─── SMOOTH MOTION HELPERS ────────────────────────────────────────────────────
const TAB_ORDER = ["home", "programs", "tools", "learn", "support"];
let GOM_MOTION = {
  id: 0,
  dir: "none"
}; // which way the current screen slides in (set by App)
let GOM_LAST_NAV_TAB = null;
function gomReducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {
    return false;
  }
}
function gomHaptic(ms) {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch (e) {}
}
// Pictures fade in the first time they load (like photos in a feed). Repeat views show instantly.
(function () {
  const seen = {};
  document.addEventListener("load", function (e) {
    const t = e.target;
    if (!t || t.tagName !== "IMG" || t.closest && t.closest(".gom-ghost")) return;
    const src = t.currentSrc || t.src;
    if (seen[src]) return;
    seen[src] = true;
    t.classList.add("gom-img-in");
  }, true);
})();
// iPhone style screen change: keep a still copy of the screen you are leaving, so the new
// screen can slide over it (opening) or the old one can slide away on top of it (going back).
function gomSnapshot(dir) {
  try {
    document.querySelectorAll(".gom-ghost-clip").forEach(n => n.remove());
    if (dir !== "push" && dir !== "pop" || gomReducedMotion()) return;
    const cur = document.querySelector(".gom-screen");
    if (!cur) return;
    const shell = cur.parentNode.getBoundingClientRect();
    const r = cur.getBoundingClientRect();
    const src = cur.querySelectorAll("*");
    const tops = [];
    for (let i = 0; i < src.length; i++) if (src[i].scrollTop || src[i].scrollLeft) tops.push([i, src[i].scrollTop, src[i].scrollLeft]);
    const clip = document.createElement("div");
    clip.className = "gom-ghost-clip";
    clip.setAttribute("aria-hidden", "true");
    Object.assign(clip.style, {
      position: "fixed",
      left: shell.left + "px",
      top: shell.top + "px",
      width: shell.width + "px",
      height: shell.height + "px",
      overflow: "hidden",
      pointerEvents: "none",
      zIndex: dir === "pop" ? "3" : "0"
    });
    const g = cur.cloneNode(true);
    g.className = "gom-ghost gom-ghost-" + dir;
    Object.assign(g.style, {
      position: "absolute",
      left: r.left - shell.left + "px",
      top: r.top - shell.top + "px",
      width: r.width + "px",
      height: r.height + "px",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      background: "#F7F3ED"
    });
    g.querySelectorAll("img").forEach(im => im.classList.remove("gom-img-in"));
    clip.appendChild(g);
    if (dir === "push") {
      const sh = document.createElement("div");
      sh.className = "gom-shade";
      g.appendChild(sh);
    }
    document.body.appendChild(clip);
    const dst = g.querySelectorAll("*");
    tops.forEach(([i, t, l]) => {
      if (dst[i]) {
        dst[i].scrollTop = t;
        dst[i].scrollLeft = l;
      }
    });
    setTimeout(() => clip.remove(), 480);
  } catch (e) {}
}

// ─── COLOUR PALETTE ───────────────────────────────────────────────────────────
const C = {
  forest: "#23443B",
  sage: "#8FAF9D",
  cream: "#F4EFE8",
  clay: "#C98B78",
  teal: "#7FAEAC",
  charcoal: "#2E2E2E",
  white: "#FFFFFF",
  sageLight: "#D4E6DC",
  sagePale: "#E9F2ED",
  creamDark: "#E8E0D4",
  clayLight: "#E8B49A",
  forestLight: "#3A6B5E",
  bg: "#F7F3ED",
  purple: "#9B7EC4",
  blue: "#7B9EBF"
};

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const G = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
  ::-webkit-scrollbar{width:0;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.07);opacity:1}}
  @keyframes bIn{from{transform:scale(.52);opacity:.6}to{transform:scale(1);opacity:1}}
  @keyframes bOut{from{transform:scale(1);opacity:1}to{transform:scale(.52);opacity:.6}}
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
  @keyframes gomSlideIn{from{transform:translate3d(100%,0,0)}to{transform:none}}
  @keyframes gomUnderIn{from{transform:translate3d(-28%,0,0)}to{transform:none}}
  @keyframes gomUnderOut{to{transform:translate3d(-28%,0,0)}}
  @keyframes gomOverOut{to{transform:translate3d(100%,0,0)}}
  @keyframes gomShade{from{opacity:0}to{opacity:1}}
  @keyframes gomFade{from{opacity:0}to{opacity:1}}
  @keyframes gomRise{from{opacity:0;transform:translate3d(0,16px,0)}to{opacity:1;transform:none}}
  @keyframes gomDrop{from{opacity:0;transform:translate3d(0,-8px,0)}to{opacity:1;transform:none}}
  @keyframes gomBubble{from{opacity:0;transform:translate3d(0,10px,0) scale(.96)}to{opacity:1;transform:none}}
  @keyframes gomIcon{0%{transform:scale(.82)}55%{transform:scale(1.12)}100%{transform:scale(1)}}
  @keyframes gomImg{from{opacity:0}}
  .gom-screen{flex:1;display:flex;flex-direction:column;min-height:0;position:relative;z-index:1;}
  .gom-push{animation:gomSlideIn .42s cubic-bezier(.2,.9,.22,1) both;background:#F7F3ED;box-shadow:-12px 0 32px rgba(0,0,0,.14);}
  .gom-pop{animation:gomUnderIn .36s cubic-bezier(.2,.9,.22,1) both;}
  .gom-fade{animation:gomFade .24s ease-out both;}
  .gom-ghost-push{animation:gomUnderOut .42s cubic-bezier(.2,.9,.22,1) both;}
  .gom-ghost-pop{animation:gomOverOut .36s cubic-bezier(.3,.6,.25,1) both;box-shadow:-12px 0 32px rgba(0,0,0,.14);}
  .gom-shade{position:absolute;inset:0;background:rgba(20,35,30,.10);pointer-events:none;animation:gomShade .42s ease-out both;}
  .gom-stagger > *{animation:gomRise .42s cubic-bezier(.2,.9,.22,1) backwards;}
  .gom-stagger > *:nth-child(2){animation-delay:.04s}.gom-stagger > *:nth-child(3){animation-delay:.08s}.gom-stagger > *:nth-child(4){animation-delay:.12s}.gom-stagger > *:nth-child(5){animation-delay:.16s}.gom-stagger > *:nth-child(6){animation-delay:.2s}.gom-stagger > *:nth-child(n+7){animation-delay:.24s}
  .gom-drop{animation:gomDrop .3s cubic-bezier(.2,.9,.22,1) both;}
  .gom-bubble{animation:gomBubble .3s cubic-bezier(.2,.9,.22,1) both;}
  .gom-icon-on{animation:gomIcon .38s cubic-bezier(.3,1.4,.5,1);}
  .gom-img-in{animation:gomImg .45s ease-out;}
  button{transition:transform .16s cubic-bezier(.2,.9,.22,1);touch-action:manipulation;}
  button:not(:disabled):active{transform:scale(.97);}
  @media (prefers-reduced-motion: reduce){.gom-push,.gom-pop,.gom-fade,.gom-ghost-push,.gom-ghost-pop,.gom-shade,.gom-stagger > *,.gom-drop,.gom-bubble,.gom-icon-on,.gom-img-in{animation:none !important;}button:not(:disabled):active{transform:none;}}
  

`;

// ─── ICONS (custom flat forest-green set, emoji replacements) ───────────────
// All icons match the reference sheet aesthetic: filled green flat illustration.
// Using inline SVG so they render anywhere with currentColor theming.
const Ico = {
  // All icons: refined line-art. stroke="currentColor" lets them inherit color from parent,
  // defaulting to forest green (C.forest = #23443B) in non-overriding contexts.
  home: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 22,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 9.5L12 3l9 6.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 22V12h6v10"
  })),
  progs: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 22,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "3",
    width: "7",
    height: "7",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "3",
    width: "7",
    height: "7",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "14",
    width: "7",
    height: "7",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "14",
    width: "7",
    height: "7",
    rx: "1"
  })),
  tools: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 22,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 7v5l3 3"
  })),
  learn: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 22,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 2L2 7l10 5 10-5-10-5z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M2 17l10 5 10-5M2 12l10 5 10-5"
  })),
  heart: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 22,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
  })),
  back: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 20,
      height: 20
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M19 12H5M12 5l-7 7 7 7"
  })),
  send: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 18,
      height: 18
    }
  }, /*#__PURE__*/React.createElement("line", {
    x1: "22",
    y1: "2",
    x2: "11",
    y2: "13"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "22 2 15 22 11 13 2 9 22 2"
  })),
  chk: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 14,
      height: 14
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6L9 17l-5-5"
  })),
  plus: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 16,
      height: 16
    }
  }, /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "5",
    x2: "12",
    y2: "19"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "5",
    y1: "12",
    x2: "19",
    y2: "12"
  })),
  // Time-of-day (line-art)
  moon: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 20,
      height: 20
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"
  })),
  sun: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 20,
      height: 20
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "4"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "2.5",
    x2: "12",
    y2: "5"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "19",
    x2: "12",
    y2: "21.5"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "2.5",
    y1: "12",
    x2: "5",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "19",
    y1: "12",
    x2: "21.5",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "5.2",
    y1: "5.2",
    x2: "7",
    y2: "7"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "17",
    y1: "17",
    x2: "18.8",
    y2: "18.8"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "5.2",
    y1: "18.8",
    x2: "7",
    y2: "17"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "17",
    y1: "7",
    x2: "18.8",
    y2: "5.2"
  })),
  sunrise: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 20,
      height: 20
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M17 17a5 5 0 00-10 0"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "2.5",
    y1: "17",
    x2: "21.5",
    y2: "17"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "4",
    x2: "12",
    y2: "9"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "5.5",
    y1: "8.5",
    x2: "7.5",
    y2: "10.5"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "18.5",
    y1: "8.5",
    x2: "16.5",
    y2: "10.5"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "5",
    y1: "20.5",
    x2: "19",
    y2: "20.5"
  })),
  sleep: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 20,
      height: 20
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20.5 13.5A8.5 8.5 0 0110.5 3.5 7.5 7.5 0 1020.5 13.5z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M13 6.5h3.5L13 10h3.5",
    strokeWidth: "1.4"
  })),
  // Breathing / plant / wind
  wind: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 22,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 8h10a3 3 0 100-6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 14h15a3 3 0 110 6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 11h7"
  })),
  leaf: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 22,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 20s2-9 9-12c3-1 8-1 8-1s0 5-1 8c-3 7-12 9-12 9z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 19l7-7"
  })),
  lotus: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 22,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 3.5c1.5 1.8 2.3 3.9 2.3 6 0 .7-.1 1.4-.3 2 1.7-.5 3.4-.3 4.7.6-.9 1.3-2.4 2.2-4.1 2.4 1.5.6 2.6 1.7 3.1 3.2H6.3c.6-1.5 1.7-2.6 3.2-3.2-1.7-.2-3.2-1.1-4.1-2.4 1.3-.9 3-1.1 4.7-.6-.2-.6-.3-1.3-.3-2 0-2.1.8-4.2 2.2-6z"
  })),
  // Food
  meal: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 22,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 13h16"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M4 13c0 4 3.5 7 8 7s8-3 8-7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 10a4 4 0 018 0"
  })),
  salad: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 22,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 13h16"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M4 13c0 4 3.5 7 8 7s8-3 8-7"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8.5",
    cy: "10",
    r: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "8.5",
    r: "2.2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "15.5",
    cy: "10",
    r: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 3v4"
  })),
  // AI / tech
  bot: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 22,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "8",
    width: "16",
    height: "11",
    rx: "2.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "13.5",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "15",
    cy: "13.5",
    r: "1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 4.5v3.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "3.5",
    r: "1.2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M2.5 12v3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M21.5 12v3"
  })),
  phone: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 22,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("rect", {
    x: "6",
    y: "2.5",
    width: "12",
    height: "19",
    rx: "2.2"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "10.5",
    y1: "18.5",
    x2: "13.5",
    y2: "18.5"
  })),
  // Brain / science
  brain: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 22,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M9.5 4a2.8 2.8 0 00-2.7 2.2A3 3 0 003.5 9a2.8 2.8 0 00.9 2.1A2.8 2.8 0 003.8 14a3 3 0 002.3 2.9A2.8 2.8 0 009 19.5h.5V4h-.5z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14.5 4a2.8 2.8 0 012.7 2.2A3 3 0 0120.5 9a2.8 2.8 0 01-.9 2.1 2.8 2.8 0 01.6 2.9 3 3 0 01-2.3 2.9A2.8 2.8 0 0115 19.5h-.5V4h.5z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 4v15.5"
  })),
  flask: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 22,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M9 2.5h6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10 2.5v5.5L5.5 17.3A2.5 2.5 0 008 21h8a2.5 2.5 0 002.5-3.7L14 8V2.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7.5 14.5h9"
  })),
  lightning: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 22,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M13 2.5L4 14h6l-1 7.5 9-12h-6l1-7z"
  })),
  // Patterns / organize
  cycle: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 22,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 12a8 8 0 0114-5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M18 3v5h-5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M20 12a8 8 0 01-14 5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6 21v-5h5"
  })),
  target: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 22,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "5.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "1.8"
  })),
  compass: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 22,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 6.5l2.3 5.2L12 17l-2.3-5.3z"
  })),
  map: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 22,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2V5z"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "9",
    y1: "3",
    x2: "9",
    y2: "20"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "15",
    y1: "5",
    x2: "15",
    y2: "22"
  })),
  hash: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 22,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("line", {
    x1: "5",
    y1: "9",
    x2: "20",
    y2: "9"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "4",
    y1: "15",
    x2: "19",
    y2: "15"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "10",
    y1: "3",
    x2: "8",
    y2: "21"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16",
    y1: "3",
    x2: "14",
    y2: "21"
  })),
  calendar: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 22,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "5",
    width: "18",
    height: "16",
    rx: "2.2"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "10",
    x2: "21",
    y2: "10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "7",
    y1: "3",
    x2: "7",
    y2: "7"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "17",
    y1: "3",
    x2: "17",
    y2: "7"
  })),
  clipboard: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 22,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "4.5",
    width: "16",
    height: "17.5",
    rx: "2"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "8",
    y: "2",
    width: "8",
    height: "4",
    rx: "1"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "11",
    x2: "16",
    y2: "11"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "15",
    x2: "16",
    y2: "15"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "19",
    x2: "13",
    y2: "19"
  })),
  magnifier: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 22,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "10.5",
    cy: "10.5",
    r: "6.2"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "15",
    y1: "15",
    x2: "21",
    y2: "21"
  })),
  warning: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 18,
      height: 18
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 2.5L22 20H2L12 2.5z"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "10",
    x2: "12",
    y2: "14.5"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "17.5",
    x2: "12.01",
    y2: "17.5",
    strokeWidth: "2.4"
  })),
  headphones: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 22,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 17v-4a9 9 0 1118 0v4"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "13",
    width: "4.5",
    height: "7",
    rx: "1.2"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "16.5",
    y: "13",
    width: "4.5",
    height: "7",
    rx: "1.2"
  })),
  speech: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 18,
      height: 18
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 4h16a2 2 0 012 2v9a2 2 0 01-2 2H9l-5 4V6a2 2 0 012-2z"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "10.5",
    x2: "8",
    y2: "10.5",
    strokeWidth: "2.4"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "10.5",
    x2: "12",
    y2: "10.5",
    strokeWidth: "2.4"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16",
    y1: "10.5",
    x2: "16",
    y2: "10.5",
    strokeWidth: "2.4"
  })),
  lightbulb: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 22,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M9 17h6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10 21h4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 3a6 6 0 00-4 10.5V17h8v-3.5A6 6 0 0012 3z"
  })),
  // Support / medical
  stetho: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 22,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 3v7a5 5 0 0010 0V3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10 15a4 4 0 008 0v-2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "18",
    cy: "13",
    r: "2.5"
  })),
  microscope: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 22,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "3",
    width: "5",
    height: "9",
    rx: "1.2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M11 12v3h5v-3"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "13.5",
    cy: "17",
    r: "3"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "5",
    y1: "21",
    x2: "20",
    y2: "21"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7 15c2-4 6-4 8-3"
  })),
  muscle: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 22,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 13c0-3 2-5 4-5h1a3 3 0 013-3h2a5 5 0 015 5v2a2 2 0 01-2 2h-2v2a3 3 0 01-3 3H9a3 3 0 01-3-3c-1-1-2-2.5-2-3z"
  })),
  pill: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 22,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "8",
    width: "20",
    height: "8",
    rx: "4",
    transform: "rotate(-30 12 12)"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "7.5",
    y1: "16.5",
    x2: "16.5",
    y2: "7.5"
  }))
};

// ─── IMAGE MAP, all your uploaded diagrams ───────────────────────────────────
// Using base64-safe placeholder approach, images referenced by path
// Pictures live in the images/ folder next to this file.
const IMG_KEYS = ["c1p1s1", "c1p1s2", "c1p1s3", "c1p1s4", "c1p1s5", "c1p1s6", "c1p1s7", "c1p2s1", "c1p2s2", "c1p2s3", "c1p2s4", "c1p2s5", "c2p1s1", "c2p1s2", "c2p1s3", "c2p1s4", "c2p1s5", "c2p1s6", "c2p2s1", "c2p2s2", "c2p2s3", "c2p2s4", "c2p2s5", "c2p3s1", "c2p3s4", "c3p1s1", "c3p1s2", "c3p1s3", "c3p1s4", "c3p1s5", "c3p1s6", "c3p2s1", "c3p2s2", "c3p2s3", "c3p2s4", "c3p2s5", "c3p3s1", "c3p3s2", "c3p3s3", "c3p3s4", "c3p3s5", "c3p3s6", "c3p4s1", "c3p4s2", "c3p4s3", "c3p4s4", "c3p4s5", "c3p5", "c4p1s1", "c4p1s2", "c4p1s3", "c4p1s4", "c4p2s1", "c4p2s2", "c4p2s3", "c4p2s4", "c4p2s5", "c4p2s6", "c4p3", "c4p4", "c4p5", "c5p1s1", "c5p1s2", "c5p1s3", "c5p1s4", "c5p1s5", "c5p1s6", "c5p1s7", "c5p2s1", "c5p2s2", "c5p2s3", "c5p2s4", "c5p3s1", "c5p3s2", "c5p3s3", "c5p3s4", "c5p4s1", "c5p4s2", "c5p4s3", "c5p4s4", "c5p4s5", "c5p5s1", "c5p5s2", "c5p5s3", "c5p5s4", "c5p5s5", "header1", "header2", "header3", "header4", "header5", "home_bg", "redflags"];
const IMGS = Object.fromEntries(IMG_KEYS.map(k => [k, "images/" + k + ".jpg"]));

// ─── SMART LOCAL AI FALLBACK ─────────────────────────────────────────────────
// Context-aware responses that work offline, with tool/session redirection
// ─── PLAIN-ENGLISH SUMMARIES ─────────────────────────────────────────────────
// Used by the "Want this in plainer English?" button. Written to be readable
// by someone with no medical or science background, roughly grade 8-9 level.
// When a session isn't in this dictionary, we fall back to sessionContext.
const plainSummaries = {
  "You Are Not Making This Up": "IBS is a real medical condition, not something in your head. Your gut and your brain talk to each other constantly through nerves and chemicals. In IBS, that communication gets stuck in an overly sensitive setting, which means normal gut activity can feel really painful, and your body can react strongly even to small things like a meal or a thought. That is why doctors might do tests and say 'everything looks normal,' because IBS does not damage your gut. What is wrong is the volume dial, not the gut itself. The good news is that this kind of nervous-system-turned-up-too-high is something you can actually influence, and this whole app is about the tools that help.",
  "What the Gut-Brain Axis Actually Is": "Your gut has its own set of nerves, about 200 to 600 million of them, which is more than your spinal cord. It is often called the 'second brain' because it can handle digestion on its own. Your gut and your brain are connected by a long nerve called the vagus nerve that runs down from your neck to your belly. Most of what travels along this nerve is actually gut-to-brain traffic, not the other way around. In IBS, this two-way road gets noisy and dysregulated, so your gut sends loud signals and your brain amplifies them. Calming things like slow breathing and regular sleep help quiet this road back down.",
  "What Is Actually Happening During a Flare": "A flare is not random. It is a chain reaction that goes something like this: something sets you off (a meal, an anxious thought, a stressful email). Your stress-alarm system switches on. Your gut becomes more reactive and lets more stuff through its lining. Immune cells in the gut wall release chemicals that make nearby nerves more sensitive. Those nerves fire stronger pain signals. Your brain turns up the volume on those signals. Feeling the pain makes you anxious, which restarts the alarm. Every link in that chain has been measured in studies. You can break the chain early by calming the alarm system, which is why slow breathing and body scans work even when symptoms are already starting.",
  "Serotonin, The Gut's Most Important Messenger": "Most people think serotonin is just a brain chemical linked to mood, but 90 to 95 percent of your body's serotonin is actually made in your gut, by special cells in the gut lining. In your gut, serotonin helps control how fast food moves through, how strongly you feel gut sensations, and how your gut talks to your brain. IBS-D (the diarrhea type) often has too much serotonin activity, which speeds things up. IBS-C (the constipation type) often has too little, which slows things down. Stress, bad sleep, early life stress, and poor nutrition all mess with this serotonin system, which is why your mood, stress, diet, and gut feel like they are tangled together, because biologically, they are.",
  "Your Nervous System and Your Gut": "Your nervous system has two modes, like gas and brake pedals. The 'gas' is called sympathetic, or fight-or-flight. The 'brake' is called parasympathetic, or rest-and-digest. In a healthy system these balance each other. In IBS, people tend to spend too much time with the gas pressed down, even when nothing scary is happening. That gas-pedal mode slows digestion, makes the gut leakier and more reactive, and lowers the pain threshold so normal sensations feel painful. The most direct way to press the brake is slow breathing at about six breaths per minute with a long exhale, which calms the vagus nerve and shifts the balance toward rest-and-digest.",
  "Why Some Days Are Fine and Some Days Are Not": "IBS is inconsistent and that drives people crazy. You can eat the exact same meal on two different days and feel fine one day and miserable the next. This is not random. Your gut does not just react to what you put in it. It reacts based on the state your nervous system is in at that moment. On a calm, rested day your gut can handle a lot. On a stressed, poorly-slept day, even safe foods can trigger symptoms. That is why strict food restriction alone rarely fixes IBS, because it only addresses one input and ignores the bigger picture of how your nervous system is doing when you eat.",
  "What Actually Helps, The Evidence": "There are four categories of things that actually have research behind them for IBS. First, the low-FODMAP diet, done as a three-phase protocol (eliminate, reintroduce, personalise) and not as a forever diet. It helps 50 to 76 percent of people short-term. Second, brain-gut therapies like CBT and gut-directed hypnotherapy, which are the best-evidenced psychological treatments. Third, autonomic regulation tools like slow breathing at six breaths per minute and regular moderate exercise. Fourth, medications such as low-dose tricyclic antidepressants for pain, which work at the gut-brain level rather than as antidepressants. The most effective approach combines several of these, not just one.",
  "Mapping Your Symptom History": "Your IBS history tells you something about what drives it. Many people find their IBS started after something specific, like a gut infection, a major life stressor, burnout, or grief. Some people have had symptoms since childhood. Knowing when yours started and what was happening in your life at the time can help match you to the right treatment. This session is about pattern-spotting: when did it begin, when is it worst, what situations make it better or worse. Patterns almost always emerge once you look for them.",
  "IBS-C, IBS-D, IBS-M, What Your Subtype Tells You": "IBS is divided into subtypes based on your most common bowel pattern on days with symptoms. IBS-D is diarrhea-type, with loose or urgent stools. IBS-C is constipation-type, with hard or incomplete stools. IBS-M is mixed, switching between both. IBS-U does not fit neatly into any of them. Each subtype has slightly different biology underneath and responds best to slightly different tools. Subtypes can change over time, so the type you have now is a description of your pattern right now, not a permanent label.",
  "Your Trigger Landscape": "IBS triggers fall into three groups: food, stress, and hormones. Most people with IBS have triggers in all three, in different amounts. Food triggers are real but not absolute, meaning the same food can hit differently depending on your stress level that day. Stress triggers include big things but also quieter ones like anticipatory worry before an event, chronic work pressure, and poor sleep. Hormonal triggers affect many people who menstruate, with symptoms often worsening before and during periods because of how estrogen and progesterone shift gut sensitivity. Tracking all three over a couple of weeks reveals your personal pattern.",
  "The Pre-Event Flare, When Your Gut Knows Before You Do": "A pre-event flare is when your gut starts acting up BEFORE a stressful thing happens, before a meeting, a trip, a difficult conversation, sometimes days before. This is not you being dramatic. It is your brain sending stress signals down to your gut ahead of time, based on what it predicts is coming. Your gut literally reacts to an event that has not happened yet. Recognising this pattern matters because it means the food you ate that morning probably was not the cause. The anxiety that started the night before was. Treating the anticipatory anxiety is usually more effective than cutting more foods.",
  "When Did Your IBS Start? (And Why That Matters)": "The circumstances around when your IBS began are not just background, they are clues about the mechanism driving it. IBS often follows a gut infection (called post-infectious IBS, which happens in 5 to 32 percent of people after a stomach infection). It also often follows major life stress, burnout, or loss. Childhood adversity can program the gut-brain system in ways that show up decades later. Knowing your origin story does not assign blame; it points toward which tools will help you most. Post-infectious IBS responds differently than stress-onset IBS, for example.",
  "Red Flags: When to Check Further": "IBS is a real positive diagnosis, not just a 'we could not find anything else' label. The vast majority of people with IBS do not have an underlying serious condition. That said, some features are worth flagging with your doctor: unexplained rectal bleeding, unintended significant weight loss, iron-deficiency anaemia, elevated fecal calprotectin (a stool test for inflammation), a first-degree relative with colon cancer or inflammatory bowel disease, or new symptoms starting after about age 45. Any one of these by itself is usually not a big deal, but clusters of them together increase the chance of something other than IBS going on. Routine colonoscopy is not generally recommended under 45 without these features.",
  "Why Regulation Is Treatment": "Calming your nervous system in IBS is not a vague wellness goal. It is a specific physical intervention. The 'calm' we are going for is a measurable shift from the fight-or-flight side of your nervous system to the rest-and-digest side. This is not just 'relax, it will be fine.' It is a trainable skill, like stretching a muscle. Tools like slow breathing, gentle movement, and mind-body practices physically shift your autonomic balance, and that shift helps the brain dampen gut pain signals. For IBS driven by nervous system dysregulation, these tools are not extras. They are the treatment.",
  "The Science of Slow Breathing": "Slow breathing at about six breaths per minute is one of the best tools for IBS because of how it affects your nervous system. When you breathe slowly, your diaphragm moves in a way that activates your vagus nerve, which then tells your body to shift into rest-and-digest mode. A long exhale in particular triggers something called the baroreflex, which pushes you further into calm. Heart rate variability (HRV) goes up, which is a sign that your nervous system is balancing well. In a trial of IBS-C patients, doing this for 10 to 20 minutes daily over 6 weeks actually reduced symptoms and improved gut sensitivity. This is not fancy breathing. It is 4 counts in, hold 2, out 6, for a few minutes.",
  "Your Vagus Nerve, and How to Use It": "The vagus nerve is basically a superhighway between your brain and your gut (and your heart, lungs, and more). It is the main driver of your rest-and-digest system. In IBS, the vagus nerve tends to be underactive, which means your gut does not get enough calming signals. The great news is that vagal activity is trainable. Slow breathing is the most direct tool. Regular aerobic exercise helps too. Brief cold exposure on your face can give a short boost. Humming or singing engages the vagus because it runs through your vocal cords. Social connection and good sleep also protect vagal tone. Chronic sleep loss is one of the fastest ways to weaken it.",
  "Pacing, Managing Your Energy Without Boom and Bust": "Boom-and-bust is a pattern many people with IBS fall into. You have a good day so you catch up on everything, push hard, and then crash into a flare. Pacing is the practice of spreading activity and rest more evenly across days, based on a sustainable baseline instead of your best-day energy. It is used in chronic pain and chronic fatigue research, and it helps IBS for the same reason: constantly spiking your stress system and then crashing keeps your gut-brain axis stuck in a sensitive state. Pacing prevents those spikes. The point is not to do less overall. The point is to do consistent amounts, with planned rest, so your nervous system can actually settle.",
  "Sleep as a Gut-Brain Intervention": "Sleep is not rest time. It is active repair time for your gut-brain axis. During deep sleep, your nervous system shifts firmly into rest-and-digest mode, and your gut runs its own overnight cleaning wave called the migrating motor complex. Poor sleep ruins the next day's gut: HRV drops, the gut lining becomes more reactive, and sensitivity goes up. The loop goes both ways because gut symptoms also disrupt sleep. To break this, focus on consistency (same bedtime most nights), a cool dark room, less screen use before bed, not eating huge meals close to bedtime, and a short breathing practice before sleep to help the shift into rest mode.",
  "Interrupting the Loop in the Moment": "When a flare is happening, the usual reactions are to fight it (push through, scan for damage) or flee it (cancel plans, avoid food). Both actually make the flare worse because both keep your stress system on. There is a third option: notice the sensations without trying to get rid of them, while giving your nervous system a different signal through slow breathing. This is not about pretending nothing is happening. It is about not feeding the fire. Even one or two minutes of slow breathing with long exhales, in a comfortable lying-down position, can take the edge off. You are not trying to stop the flare. You are quieting the alarm that is making it louder.",
  "The Anticipatory Anxiety Cycle": "Anticipatory anxiety is worrying about symptoms before they happen. The worry itself activates your stress system, which makes your gut more reactive, which makes symptoms more likely. Then when symptoms do occur, your brain confirms 'see, I was right to worry,' and the cycle gets stronger for next time. Over time, the list of situations you avoid grows. Interrupting this does not mean stopping all worry. It means shortening it. Catch the anticipation early, name the difference between specific worries (which you can plan around, like 'I might need a bathroom') and global ones (like 'this will be a disaster'), and use short breathing sessions plus scheduled 'worry windows' to keep it from running all day.",
  "Hypervigilance, When Monitoring Makes It Worse": "Hypervigilance is what happens when you are constantly checking in on your gut, scanning for the first sign of trouble. It feels protective, like it gives you control, but the research shows the opposite: sustained attention to a body sensation actually amplifies it. Your brain allocates more resources to whatever it is told to watch, so monitoring the gut literally makes the gut 'louder.' The goal is not to ignore your body. It is to move from evaluative monitoring ('is this bad? how bad?') to neutral noticing ('I am feeling something'). Body scan practices train this shift over time, and this awareness-without-alarm is one of the most powerful day-to-day changes you can make.",
  "What to Do With Food Fear": "Food anxiety is when eating itself becomes scary because you have learned to associate food with symptoms. The low-FODMAP diet works short-term, but if you use it mainly to feel safe rather than to identify real triggers, the list of 'safe foods' keeps shrinking. This is because avoidance reinforces fear, not because your body is getting more sensitive. The fix is to separate two things: foods that actually trigger you through a physical mechanism (like specific FODMAPs) and foods that trigger you through anxiety. Gradually reintroducing feared foods in low-stress contexts, combined with a minute of slow breathing before eating, retrains your brain that eating is safe. Working with a dietitian helps a lot.",
  "Why You Don't Trust Your Body Anymore": "After years of unpredictable symptoms, your body starts to feel like something you cannot rely on. That loss of trust is not just an emotional thing, it keeps your nervous system on alert even when nothing is happening, which lowers your pain threshold and makes flares more likely. So the distrust becomes self-fulfilling: you do not trust your body, so your nervous system stays on, so symptoms happen, which confirms the distrust. Rebuilding trust is not about positive thinking. It is about understanding what is actually happening in your body biologically, and then slowly gathering evidence through small experiences that your body can handle things. Mindfulness and CBT approaches help because they reduce the threat sense around gut sensations, which reduces their intensity.",
  "The Difference Between Noticing and Monitoring": "Noticing and monitoring feel similar but they are actually opposites. Noticing is neutral, you are aware a sensation is there, without rating it or predicting what it means. Monitoring is threat-focused, you are scanning for problems, evaluating, trying to stay ahead of danger. The research shows that monitoring makes gut sensations stronger because your brain amplifies what you direct it to watch. Noticing does not do this. Learning to shift from monitoring to noticing is hard but powerful. The body scan exercise is basically training this skill. Over time it reduces the constant internal alarm that keeps IBS going.",
  "GDH: Introduction and Induction": "Gut-directed hypnotherapy is a research-backed treatment for IBS, and it is not stage hypnosis. It does not mean losing control. It is a deeply relaxed focused state in which the nervous system's ability to dampen gut pain signals is enhanced and specific imagery (like imagining smooth flow through the gut) actually influences how the gut works. Clinical guidelines in North America and Europe recommend it. This first session is just about getting settled and learning the induction, how to drop into that relaxed focused state using breath and body awareness. You do not need to 'succeed' at it. You just need to allow.",
  "Small Acts of Trust": "Trust in your body after IBS is not fixed by a decision or positive thinking. It is rebuilt by actually doing things and having them turn out okay. Every time you eat a food you were scared of, go to an event without an exit plan, or take a short trip without obsessing, your nervous system gets one more piece of evidence that you can handle things. This is called graded exposure in psychology. The word 'small' matters: you want the smallest step that still feels like a stretch. Three tiny acts of trust a week, kept up over months, changes more than one huge dramatic exposure followed by nothing. The safety behaviours (planning escape routes, strict food rules) are what keep fear going, and gently stepping back from them is what reduces it.",
  "Separating Sensation from Story": "When you feel something in your gut, two things actually happen almost at the same time. First is the sensation itself, like pressure or cramping. Second is the story your brain attaches to it, like 'this will ruin my whole day.' In IBS these two things get glued together and feel like one thing. But they are not. The sensation is physical information. The story is a prediction your brain adds based on past experiences. The story is what sets off the stress response and makes symptoms worse. Learning to spot the exact moment the story starts, and naming it as a story rather than a fact, is one of the most useful skills in managing IBS day-to-day.",
  "Grieving What IBS Has Taken": "IBS takes stuff from your life. Spontaneity. Confidence around food. Social ease. Professional opportunities. Travel. Feeling comfortable in your own body. These losses usually happen slowly, so there is never a clear moment to grieve them. But unacknowledged grief does not disappear, it tends to show up later as low-grade depression, low motivation, or numb resignation. Acknowledging what IBS has actually cost you is not self-pity, it is accuracy. And it is the necessary step before deciding what you want to reclaim. Research shows psychological burden in IBS is real and linked to worse daily functioning, which means naming these losses is part of treatment, not whining.",
  "What a Better Relationship with Your Body Looks Like": "A better relationship with your body in IBS does not mean zero symptoms. It means a body you can live alongside without constant alarm. People who describe real recovery do not describe the gut becoming quiet. They describe a change in how they react to the gut. Hard days still happen, but they are not the organising principle of every decision. This shift comes from lower gut-specific anxiety, less catastrophising, and less hypervigilance, even when symptoms persist. Trials of mindfulness and CBT and exposure-based therapies show these changes last, with symptom reductions maintained at 15 to 18 months follow-up.",
  "How Food Fear Develops": "Food fear in IBS follows a predictable path. You eat something, you flare, your brain records the link. Next time, you avoid that food, which reduces anxiety briefly. Before the next meal, anxiety builds. That anxiety turns on your stress system before the first bite, which changes how your gut actually processes the meal. Another flare happens (maybe with a different food). That food now gets added to the scary list. Over time the list grows and grows, not because your body is actually sensitive to more foods, but because your brain has learned to treat eating itself as dangerous. Treatment is not more restriction, it is careful, gradual re-exposure.",
  "The Low-FODMAP Reintroduction Process": "The low-FODMAP diet is the best-researched dietary approach for IBS, but it is badly misapplied most of the time. It is designed as three phases: a strict elimination for about 4 to 6 weeks, then a systematic reintroduction where you test one category at a time, then personalisation where you eat broadly and avoid only what you specifically react to. Most people get stuck in phase 1 forever. That is a mistake, because long-term strict restriction reduces beneficial gut bacteria (especially Bifidobacteria) and does not actually tell you what your real triggers are. Phase 2 is the whole point. Working with a dietitian who understands the protocol is strongly recommended.",
  "The Food Fear Hierarchy": "A food fear hierarchy is a structured list of foods you avoid, ranked from least scary to most scary. The idea of gradual exposure is to start from the bottom, not the top. Early wins, even tiny ones, build your nervous system evidence that approaching feared foods is survivable. Every time you eat a previously avoided food in a low-stress context, ideally combined with a minute of slow breathing beforehand, you are giving your gut a different starting state and your brain new information that the food is safe. Over time the hierarchy shrinks. This pairs best with the autonomic regulation tools already in this app.",
  "Eating in Social Situations": "Eating socially with IBS is hard for two reasons: logistical (not knowing what is available, not knowing where the bathroom is) and relational (fear of symptoms being visible, fatigue of explaining dietary needs). Logistical problems are mostly solvable with preparation, which is different from avoidance. Relational problems come down to shame, and the research-supported approach is calibrated disclosure: sharing enough that the people who matter understand, without making every interaction about your gut. A pre-meal slow-breath practice is particularly useful here because it changes the state your gut is in when food arrives.",
  "Rebuilding a Relationship with Food": "The goal in IBS is not a short list of safe foods. It is a flexible, unafraid relationship with eating. Safety-list approaches get smaller over time because every new reaction adds an item. Flexibility approaches get larger over time. The research is clear that long-term excessive restriction reduces microbiome diversity and actually worsens gut-brain dysregulation. Rebuilding involves three parallel tracks: knowing what you actually react to (not just what you fear), calming your nervous system so your gut meets food in a receive rather than alarm state, and gradually reintroducing avoided foods.",
  "IBS and Anxiety: Which Came First?": "IBS and anxiety go together in about 40 to 55 percent of cases, which is way more than coincidence. The two share real biological overlap, including stress-hormone system (HPA axis) dysregulation, shifts in the calming side of the nervous system, and serotonin signalling differences. Here is the interesting part: in many longitudinal studies, the IBS actually came first and the anxiety developed later. This means gut-brain dysregulation can drive anxiety, not just the other way around. Brain-gut therapies (CBT adapted for IBS, gut-directed hypnotherapy) help both at the same time because they target the shared circuits.",
  "Perfectionism, Control, and the Gut": "When your body is unpredictable, trying to control everything feels like it should help. And in the short term, it does reduce anxiety. But long-term, control-seeking teaches your nervous system that uncertainty is dangerous, which is exactly the nervous system pattern that keeps IBS going. Your world shrinks because the list of 'safe' situations keeps getting smaller. Perfectionism works similarly. Treating symptoms as failures creates constant self-evaluation that keeps your stress system switched on. This is not a character flaw, it is a pattern that made sense at some point and now needs unlearning.",
  "People-Pleasing and Physical Symptoms": "People-pleasing, meaning consistently putting others first and suppressing your own needs, puts a chronic background load on your nervous system. In IBS, this matters because your gut is particularly sensitive to sustained sympathetic drive. Research shows IBS cohorts score higher on social evaluation concern and emotional suppression than matched controls. Over-committing, not being able to say no, and swallowing frustration are not just emotional patterns, they can lower your symptom thresholds physiologically. Noticing when you are saying yes while your body is saying no is a real skill, and one that directly affects your gut.",
  "Distress Tolerance: Managing Difficult Moments": "Distress tolerance is the ability to feel something uncomfortable without immediately trying to escape it. In IBS, the reflexive escape response (running to the bathroom, cancelling plans, catastrophising) usually amplifies the very discomfort you are trying to escape, because escape behaviours activate more sympathetic arousal. The psychological concept of 'window of tolerance' describes the zone where you can feel discomfort and keep functioning. In IBS this window is often very narrow. You widen it by practicing staying inside it. Uncomfortable is not the same as dangerous.",
  "When IBS and Depression Co-occur": "Depression and IBS co-occur in about 25 to 50 percent of cases, depending on the setting. They share biology including HPA axis dysregulation and serotonin differences, and chronic symptom burden itself contributes biologically to mood changes. Depression after years of IBS often looks different from classic depression. Instead of sadness, it often presents as low motivation to engage with IBS management, resigned acceptance that things will not improve, and reduced participation in meaningful activities. This is a biological consequence of chronic pain and dysregulation, not a personal failing. It is treatable. Please speak with your GP.",
  "Building Psychological Flexibility": "Psychological flexibility is the ability to act on what matters to you even when difficult thoughts, emotions, or gut sensations are present. It is not the absence of discomfort. It is the ability to have discomfort and still move forward. In IBS, this means being able to attend a dinner even when your gut feels uncertain, or accepting a work trip without needing to guarantee a perfect day. Acceptance and Commitment Therapy (ACT) calls the opposite 'experiential avoidance,' where you limit your life to manage difficult feelings. Each small valued action you take despite discomfort expands your capacity slightly.",
  "Overthinking, Uncertainty and Symptom Monitoring": "This session covers five patterns that keep IBS going: hypervigilance (constantly checking your gut), intolerance of uncertainty (not being able to sit with not-knowing), the reassurance trap (asking for reassurance that briefly helps then escalates), cognitive fusion (treating anxious thoughts as facts), and the fear of living with not-knowing. Research shows these are all modifiable gut-brain targets. CBT trials show symptom reductions of about 35 to 62 points on IBS severity scales at 12 months that persist to 24 months, especially when the CBT targets safety behaviours and catastrophising specifically. Interoceptive and food exposure work reduces visceral sensitivity on top of stress management alone.",
  "Mapping What IBS Has Taken and What You Want Back": "This session is an inventory. IBS narrows your life gradually through avoidance, and noticing what has been reduced or eliminated is the first step toward getting it back. The exercise has two columns: what has been limited or eliminated, and what you most want to reclaim. Being specific matters. 'I want to feel better' is too vague to act on. 'I want to travel internationally again' or 'I want to eat out with friends without planning an hour beforehand' gives you concrete direction. The programs in this category target specific life domains: relationships, travel, work, spontaneity.",
  "Travel with IBS": "Travel with IBS has three separate challenges: dietary (food options you cannot control), logistical (unfamiliar bathrooms, long transit), and nervous system (sleep disruption, unfamiliar environments activating stress). Each is addressable separately. Dietary prep means researching food options and bringing safe snacks. Logistical prep means mapping bathrooms in advance, which reduces anticipatory anxiety. Nervous system prep means keeping your breathing practice going in transit and doing a morning arrival reset when you wake up somewhere new. The goal for a first trip back is not a perfect trip. The goal is one trip. After one trip, your nervous system has new evidence that travel is survivable.",
  "Relationships and IBS: Communicating What You Need": "Social connection directly affects your vagal tone. Isolation reduces it. So the communication you have with the people close to you is not just emotional, it is physiological. Two patterns make relationships harder with IBS: silence (managing alone, cancelling plans without explanation) and over-explaining (making IBS the subject of every interaction). The research-supported middle ground is calibrated disclosure: saying enough that the people who matter understand, without making your gut the centre of every relationship. Something like 'I have a gut condition affected by stress and certain foods. Some days I need flexibility. It does not mean I cannot do things.'",
  "Work and Study with IBS": "The most common work difficulty with IBS is the morning problem. Many people have their most symptomatic hours in the morning, which conflicts with standard start times. Practical adaptations that help: not scheduling high-stakes commitments during your peak symptom window, building buffer time into your morning, knowing where bathrooms are on your route. In many countries, IBS qualifies for formal workplace and academic accommodations like flexible start times, exam accommodations, or work-from-home flexibility on difficult days. A clinical framing in those conversations tends to work better than a symptom description.",
  "Returning to Spontaneity": "Spontaneity does not return by deciding to stop worrying. It returns through small repeated re-engagements with situations you used to avoid. Every time you approach a spontaneous situation and come back from it with the world still intact, your nervous system updates its prediction of what is safe. The measure of success is not whether you had symptoms. It is whether you went. The first few re-engagements are the hardest because avoidance has made the prediction of danger strongest. Each one after that is slightly easier.",
  "What Is Pelvic Floor Dyssynergia": "Pelvic floor dyssynergia is when the muscles at the base of your pelvis, which normally relax to let stool pass, instead paradoxically contract during defecation. So you strain, but the exit is closing, not opening. The symptoms overlap heavily with IBS-C: constipation, incomplete emptying, straining, bloating from retained stool. This is sometimes missed in people with an IBS-C diagnosis because it looks similar. It is a learned neuromuscular coordination problem that sits within the gut-brain framework, not a structural problem. The good news is that biofeedback physiotherapy teaches your body the coordination it has lost, and it has very good evidence.",
  "Symptoms That Suggest a Pelvic Floor Component": "Some symptoms specifically point toward pelvic floor involvement rather than slow-transit constipation alone: significant straining even when stool is clearly present in the rectum, the sense of incomplete emptying after going, the feeling of blockage or obstruction, long periods on the toilet with little result, and urgency that does not produce a bowel movement. If these sound like you, laxatives alone tend to underperform because they do not fix coordination, only transit. A referral to a pelvic floor physiotherapist is the appropriate next step.",
  "Biofeedback: The Evidence": "Biofeedback for pelvic floor dyssynergia has unusually strong evidence compared to most IBS interventions. Trials show roughly 70 to 80 percent response rates with biofeedback versus about 30 to 40 percent with laxatives or standard care. It works by placing sensors to measure pelvic floor muscle activity in real time and showing you that activity on a screen. The visual feedback lets you see and feel normal coordination, and over multiple sessions the paradoxical contraction pattern gets replaced with normal relaxation. This works through the same mechanism as everything else in this app: teaching the nervous system a new pattern through repeated practice.",
  "Talking to Your Physiotherapist": "If pelvic floor dysfunction may be contributing to your IBS-C symptoms, you want a physiotherapist who specialises in anorectal biofeedback for constipation, not a generalist. Look for 'pelvic floor physiotherapist' or 'continence and pelvic health physiotherapist.' Assessment may include an internal examination with explicit ongoing consent, which you can decline or stop at any time. If you have a trauma history that makes internal examination difficult, say so clearly at the outset. Good questions to ask: can pelvic floor dysfunction be contributing to my IBS-C symptoms, what does the assessment involve, how many biofeedback sessions are typically needed.",
  "How Adverse Childhood Experiences Program the Gut-Brain Axis": "Adverse childhood experiences (ACEs) like abuse, neglect, or household dysfunction can physically change how your gut-brain axis develops. The mechanism involves epigenetic changes, meaning changes in how your genes are expressed, in the cells that make gut serotonin and in how your stress-alarm (HPA) system reacts. Studies consistently show higher ACE scores are linked to higher IBS prevalence and severity in adulthood, and animal and human data support long-lasting effects on the brain-gut-microbiome axis. This is not about blame. It is about mechanism. Trauma-informed IBS care that combines gut-directed interventions with nervous system regulation tends to work better than either alone.",
  "The Nervous System of Someone Who Has Experienced Trauma": "Trauma shapes the nervous system toward a baseline of threat detection. This is adaptive in dangerous environments but costly over time. The autonomic system tends to be stuck toward sympathetic activation, vagal tone tends to be reduced, and the brain's threat-appraisal circuits (amygdala, insula) are more reactive. In IBS, this pre-existing shift makes the gut-brain loop more intense and harder to interrupt with standard tools alone. Understanding this is not about pathologising trauma survivors. It is about why specific approaches (polyvagal-informed work, somatic practices, trauma-informed therapy) often matter more for this group.",
  "Why Standard IBS Tools May Need Adaptation": "Many standard IBS interventions assume a nervous system that can drop into relaxation when given the cue. For people with trauma histories, safety is harder to access, and practices like eyes-closed relaxation or deep body attention can actually activate rather than calm. This is not because the tools do not work, it is because they need adapting. Shorter doses, eyes open, grounding with external anchors first, and building felt sense of safety before deeper interoceptive work are common adaptations. Working with a trauma-informed clinician often makes more difference here than pushing through a generic protocol.",
  "Trauma-Informed Approaches to Gut-Brain Regulation": "Trauma-informed gut-brain work generally means slower, more titrated, more consent-based practice. Instead of jumping into a long body scan, you start with very short, externally-anchored awareness (feet on floor, sounds in the room) and build tolerance gradually. Polyvagal-informed approaches focus on restoring the sense of social-engagement safety as a foundation before deeper work. Somatic experiencing and related modalities offer slower, body-attuned pathways that often sit better with trauma survivors than pure CBT approaches. The gut-brain mechanisms being targeted are the same. The entry points differ.",
  "Finding the Right Support": "Finding a trauma-informed clinician matters more than finding 'the best' specialist. Signs of a good fit include: consent-based approaches, permission to say no or pause, clear explanation of what they are doing and why, and pacing based on your tolerance rather than a fixed protocol. IFS (Internal Family Systems), somatic experiencing, sensorimotor psychotherapy, and trauma-informed CBT are all trauma-aware modalities that can integrate with gut-brain work. Your body's response to a clinician, whether you feel more regulated or less after sessions, is usually the most honest feedback about fit.",
  "What Healing Can Look Like": "Healing from IBS layered on trauma history is rarely linear and rarely looks like symptom disappearance. It more often looks like a shift in relationship to symptoms, reduced reactivity, widening of the life areas you feel able to engage with, and more time spent in nervous-system states other than threat. Trials of exposure-based and mindfulness-based therapies show durable improvements, with symptom reductions of 42 to 53 percent in some studies maintained at 15 to 18 months. That is not cure, but it is meaningful change, and it comes through sustained engagement with evidence-based tools, not through effort or willpower.",
  "Post-Infectious Recovery": "Post-infectious IBS (PI-IBS) is a real, well-characterised subtype that develops after a gut infection. About 5 to 32 percent of people develop PI-IBS after a bout of gastroenteritis, with higher risk after bacterial or protozoal infections. The mechanisms that linger after the infection clears include low-grade mucosal inflammation, increased mast cells and T cells in the gut wall, changes in serotonin-producing EC cells, increased gut permeability, and microbiome shifts. PI-IBS can improve over months to a couple of years, and gut-directed behavioural therapies plus anti-inflammatory approaches help. It responds slightly differently from stress-onset IBS.",
  "Hormonal Patterns in IBS": "Hormones directly modulate gut motility and visceral sensitivity, which is why so many people who menstruate notice their IBS symptoms change across the cycle. Symptoms often flare in the late luteal phase (days ~14 to 28) and around menses, when estrogen falls and progesterone is dropping before the period starts. Tracking symptoms alongside cycle phase for two or three months usually reveals a clear personal pattern. Perimenopause brings larger hormonal swings that can unsettle previously stable IBS patterns. Hormonal contraception can smooth or worsen symptoms depending on the formulation. This pattern is biological and not imagined.",
  "When It Might Be More Than IBS": "IBS is a valid positive diagnosis when Rome IV criteria are met, and most people with IBS do not have an underlying serious condition. That said, certain features should prompt further evaluation: unexplained rectal bleeding, unintentional weight loss, iron-deficiency anaemia on bloodwork, elevated fecal calprotectin (a stool test for inflammation), a first-degree relative with colorectal cancer or inflammatory bowel disease, or new onset of significant symptoms at older age, typically 45 and above. Any single feature alone is usually not a big deal, but clusters of them increase the likelihood that something other than IBS is going on. Raising these with your clinician is protective, not paranoid.",
  "The River Visualization": "The river visualisation is a gut-directed hypnotherapy session that uses imagery of flowing water to influence how your gut works. You begin with the induction you learned in session 1 to reach a relaxed focused state. Then you bring to mind a river, any river that feels peaceful to you. You notice how water moves easily, finding its path around obstacles, always flowing. Then you imagine that same quality of easy flow existing in your digestive system. Research on gut-directed hypnotherapy shows improvements across IBS subtypes, including stool consistency and frequency, when imagery like this is practised across multiple sessions.",
  "The Warm Hand Technique": "The warm hand technique is a gut-directed hypnotherapy practice that combines physical contact, directed warmth, and therapeutic suggestion. You begin with the induction to reach a relaxed state, then bring your hands together palms facing, notice the warmth between them, and slowly rest your palms on your lower abdomen. You let the warmth transfer gently inward, imagining it reaching the smooth muscle of your gut wall. The warmth functions as a signal of safety to your nervous system, which can compete with pain signalling. Hypnosis meta-analyses show adequate symptom relief with a number needed to treat of roughly 3 to 5 people, with minimal side effects.",
  "Deepening": "Deepening is the fourth hypnotherapy session, and the purpose is consolidation. Repetition is how the nervous system actually learns, so returning to the induction, the river, and the warm hand technique builds the neural patterns that allow these practices to work more easily over time. You hold both the river flow and the warmth in your hands at the same time, allowing each slow exhale to deepen both. Research on GDH shows benefit accumulates across sessions. Long-term follow-ups demonstrate maintained benefits at 12 months and beyond, with some studies showing sustained relief at 5 to 6 years in many participants.",
  "Working with Pain": "This session works directly with gut pain. Pain is a signal your nervous system interprets, and in a deeply relaxed state your nervous system's capacity to dampen pain signals is genuinely enhanced. You begin with the induction. Then, if there is discomfort present, you observe it the way you might observe a colour, without trying to change it. You imagine the sensation has a colour, then very slowly imagine that colour beginning to shift, becoming paler, softer, cooler. This is not fighting the sensation. It is demonstrating that the nervous system has influence over how pain is experienced. Trials report significant reductions in abdominal pain intensity and frequency compared to controls.",
  "The Future Self": "The future self session uses imagery to create a mental template that your nervous system can orient toward. Neuroimaging studies show that vividly imagining a positive future state activates many of the same neural circuits as actually experiencing that state. You settle into the relaxed state, then allow a specific image to form of yourself in the future, perhaps six months from now. Make it specific and sensory: a meal with people you care about, a trip you want to take, a morning that begins without gut dread. Imagery-based gut-directed suggestions are core components of effective GDH protocols, and the specificity matters.",
  "Integration": "Integration is the final GDH session. The benefit of gut-directed hypnotherapy is maintained for months to years after a course of treatment ends, which distinguishes it from many other IBS interventions. Part of that durability is that GDH actually changes the relationship between your nervous system and your gut, not just the symptoms. Maintenance means occasional practice, not necessarily a full session: the warm hand technique before a difficult meal, the river visualisation when the gut is unsettled, the future self image when catastrophic thinking arrives. Standardised home recordings have been shown to be non-inferior to therapist-delivered sessions in paediatric trials, and digital GDH shows symptom gains in adults.",
  "My Gut and Brain Are One Connected System": "This affirmation is grounded in the biology of the gut-brain axis. Your gut and brain are physically connected through the vagus nerve and a network of over 200 million gut neurons. They share chemical messengers like serotonin, most of which is actually made in the gut. Affirmations work in IBS when they are anchored to real biology, because saying something true gently rewires how your nervous system interprets gut signals. This is not magical thinking. It is cognitive reframing supported by what the evidence actually shows about the gut-brain system.",
  "My Nervous System Can Learn a New Pattern": "The nervous system's capacity to change based on experience is called neuroplasticity. This affirmation is true because studies show that CBT and gut-directed hypnotherapy actually change brain activation patterns in IBS responders, and these changes are measurable on brain imaging. The prefrontal cortex regains descending control, the insula processes gut signals differently, the limbic system calms down. Saying this aloud or silently is not positive thinking. It is accurate biology, and stating accurate things about your own body helps the nervous system update its predictions.",
  "Uncertainty Is Uncomfortable. It Is Also Survivable.": "Intolerance of uncertainty is one of the documented factors that keeps IBS going. When your nervous system treats 'not knowing' as 'danger,' it stays on alert, and that alert state keeps gut sensitivity high. This affirmation pairs the acknowledgement (yes, uncertainty is uncomfortable) with the accurate reframe (you can survive it without acting on it). Neuroimaging shows that uncertainty heightens cingulate and thalamic responses to identical rectal stimuli in people with IBS, which is part of the vigilance mechanism. Practicing tolerating uncertainty directly changes this response over time.",
  "I Am More Than My Symptoms": "After years of IBS, identity can shrink to fit around the condition. This affirmation is a reclamation. Research on psychological burden in IBS shows that illness identity impacts well-being in functional GI disorders, and that interventions that shift identity (not just symptoms) produce better quality-of-life outcomes. Stating this truth does not cure anything, but it does interrupt the pattern where every life decision runs through a risk assessment about your gut. That interruption, repeated, is one of the small shifts that adds up to real change.",
  "The Gut-Brain Axis: A Two-Way Communication Highway": "Your gut and brain are two-way connected through the vagus nerve, the enteric nervous system (the gut's own nerves), immune signalling, and the microbiome. About 80 percent of the fibers in the vagus nerve carry signals upward from gut to brain, not the other way around, which is surprising to most people. In IBS, this highway is dysregulated at every level at once: gut nerves fire too easily, the brain amplifies those signals, the autonomic system stays in fight-or-flight, immune activity rises. Calming one level alone rarely fixes it, which is why combined approaches work better.",
  "The Flare Cascade: What Is Actually Happening": "A flare is a cascade of biological events, not a random misery. A trigger (stress, food, a thought) activates your HPA stress-alarm system. Your autonomic nervous system shifts toward fight-or-flight. Your gut lining becomes temporarily more permeable. Immune cells in the gut wall called mast cells release chemicals that sensitise nearby nerves. Those nerves fire pain signals more easily. Your brain amplifies the signals. The experience of symptoms triggers more anxiety, which reactivates the stress system. Every step is measurable. Early in the cascade you have the most leverage, which is why slow breathing in the first couple of minutes often prevents a full flare.",
  "Serotonin and the Gut": "About 90 to 95 percent of your body's serotonin is actually made in the gut, by specialised cells in the intestinal lining called enterochromaffin cells. In the gut, serotonin controls motility (how fast food moves), pain signalling, and vagal messages upward to the brain. IBS subtypes have different serotonin patterns: IBS-D often has elevated mucosal serotonin driving faster transit, IBS-C has reduced postprandial serotonin and slower transit. Chronic stress, microbial imbalance (particularly Ruminococcus gnavus in IBS-D), early adversity, and low-protein intake all affect gut serotonin production.",
  "Vagal Tone and IBS": "Vagal tone is how active your vagus nerve is at rest, and it is one of the most consistently reduced findings in IBS, especially in IBS-C and in more severe disease. Lower vagal tone means reduced rest-and-digest support for the gut: motility becomes erratic, permeability rises, pain threshold drops. But vagal tone is trainable. Slow breathing at about 6 breaths per minute, regular aerobic exercise, adequate sleep, and noninvasive auricular vagus nerve stimulation all raise it. Five to 10 minutes of slow breathing daily produces measurable HRV improvements over 4 to 8 weeks, and those improvements correlate with symptom improvement in trials.",
  "Neuroplasticity and IBS": "Neuroplasticity is the brain's ability to change structure and function based on experience. In chronic IBS, brain imaging shows real structural changes in the regions that process gut sensations, pain, and threat: the anterior cingulate cortex, insula, amygdala, and prefrontal cortex. But neuroplasticity works both ways. Effective treatment, specifically CBT and gut-directed hypnotherapy, produces measurable changes in brain activation patterns in responders. The prefrontal cortex regains descending control. The insula processes gut signals differently. Every practice in this app is a neuroplasticity intervention, and the effects accumulate over weeks to months.",
  "Morning Breathing: The 4-2-6 Method": "This is the morning breathing practice, using a 4-2-6 pattern (inhale 4 counts, hold 2, exhale 6) aimed at about 6 breaths per minute. The biology behind this rate is that it is near the resonance frequency of the cardiovascular-autonomic system, where HRV responds most reliably. The long exhale engages the baroreflex, which pushes you toward rest-and-digest. Morning is when the gut is often most reactive, so starting the day in parasympathetic mode gives your gut a different starting state for everything that follows. Daily practice of 5 to 10 minutes produces measurable HRV improvements over 4 to 8 weeks.",
  "Pre-Meal Reset: Breathing Before Eating": "A pause before eating is physiology, not ritual. Your gut begins preparing for a meal before you take the first bite, through signals sent down the vagus nerve (the cephalic phase of digestion). If you are in sympathetic activation when the meal arrives, digestion is disrupted from the start. One to three slow breaths before eating, with long exhales, shifts autonomic balance and gives your gut a different starting state. This is not about eliminating anxiety around food. It is about giving your gut a slightly calmer preparation window. Even one long exhale before each meal is enough.",
  "Breathing During a Flare": "When a flare is happening, the instinct is to fight it or flee it. Both activate more sympathetic arousal and usually make the loop worse. A different approach is to find the most comfortable position, then slow your exhale without trying to deepen your inhale. A gentle in-breath and a slow longer out-breath for a few minutes can reduce perceived arousal, and structured sessions measured in minutes show clearer effects on vagal and baroreflex measures. You are not trying to stop the flare. You are quieting the nervous system's alarm around it, which is what amplifies the symptoms.",
  "Bedtime Wind-Down": "Sleep is one of the most important restoration windows for the gut-brain axis. During non-REM sleep, especially slow-wave sleep, the nervous system shifts toward parasympathetic, and the gut runs its migrating motor complex, a fasting-state cleaning pattern that happens overnight between meals. Poor sleep raises next-day abdominal pain and lowers HRV. The bedtime wind-down is a deliberate transition: find a comfortable lying position, take three slow breaths with each exhale slightly longer, let your body feel heavier. Your gut does its housekeeping overnight. You do not need to supervise it.",
  "Why Regulation Is Treatment": "Calming the nervous system in IBS is not a vague wellness idea. It is a specific, measurable physiological shift from sympathetic (fight-or-flight) toward parasympathetic (rest-and-digest) dominance. This matters because IBS involves reduced vagal activity and relative sympathetic excess, and generic 'just relax' advice does not fix that pattern. Targeted tools do. Slow breathing, HRV biofeedback, regular physical activity, and mind-body practices raise vagal-linked HRV measurably in trials. When vagal activity improves, the brain's capacity to dampen gut pain signals also improves. So autonomic regulation is not a lifestyle addition, it is a treatment with mechanism.",
  "The Science of Slow Breathing": "Slow breathing at about 6 breaths per minute is one of the best-researched autonomic tools for IBS. The mechanism is clear: the slow rhythm engages cardio-vagal reflexes, increasing vagal activity. A long exhale further engages the baroreflex, pushing autonomic balance toward rest-and-digest. Heart rate variability rises, which is a marker of good autonomic function. The 4-2-6 pattern used in this app approximates this rate. In a trial of IBS-C, 6 weeks of slow breathing at this rate improved symptoms, bowel frequency, rectal sensitivity, and vagal HRV indices. A smaller pilot showed vascular gains without HRV change, so results are mixed but promising.",
  "Your Vagus Nerve, and How to Use It": "The vagus nerve is the tenth cranial nerve and the main highway of your parasympathetic (rest-and-digest) system. It connects your brainstem to most major organs involved in digestion, stress response, and cardiac function. In IBS, vagal activity is commonly reduced, which matches the autonomic imbalance seen in studies. The good news is vagal tone is trainable. The most direct tool is slow diaphragmatic breathing. Regular aerobic exercise, brief cold exposure, humming or singing (the vagus runs through your vocal cords), meaningful social connection, and sufficient sleep all support vagal activity. Chronic sleep deprivation is one of the fastest ways to weaken it.",
  "Pacing, Managing Your Energy Without Boom and Bust": "Boom-and-bust is when you push hard on good days and crash into flares after. Research shows that repeated push-and-crash cycles are linked to autonomic dysregulation in IBS, with higher sympathetic activity around symptom events. Pacing is the practice of spreading activity and rest evenly, based on a sustainable baseline rather than your best-day capacity. It has strong evidence in chronic pain and fatigue, and emerging relevance to IBS. The core moves are: identify your sustainable middle-ground activity level, build your schedule around that baseline, include planned rest pauses (not reactive ones), and increase activity gradually when things stabilise.",
  "Sleep as a Gut-Brain Intervention": "Sleep is not passive recovery. During non-REM sleep, especially slow-wave sleep, your autonomic system shifts toward parasympathetic and your gut runs its migrating motor complex, a fasting-state motility pattern that clears residual content. Poor sleep is associated with worse next-day abdominal pain, lower HRV, and increased gut permeability in studies. The loop runs both ways because gut symptoms also disrupt sleep. Evidence-based practices include consistent sleep and wake times, screen reduction before bed, a cool bedroom (18 to 20°C), avoiding large meals within 3 hours of bedtime, and a brief pre-sleep breathing or relaxation practice.",
  "Building Your Daily Regulation Practice": "The goal of a daily regulation practice in IBS is not a second job. It is consistency over weeks, not long sessions. Even 10 to 15 minutes per day spread across four moments is enough: morning (2 to 3 minutes of slow breathing before getting out of bed), pre-meal (one or two slow breaths before eating), midday (a brief screen-free pause or short walk), and evening (slow breathing or audio-guided relaxation). Repeated practice over 4 to 8 weeks produces measurable HRV improvements and symptom reductions in trials. Consistency matters more than any single long session. In IBS, some studies show HRV gains and symptom improvement, while others show vascular gains without HRV change, so track your own response.",
  "Interrupting the Loop in the Moment": "When a flare is happening, the instinct is to fight it or flee it. Both activate more sympathetic arousal and are linked to heightened threat appraisal, which usually worsens symptom perception. A third option is to allow the sensations while actively giving your nervous system a different signal. Slow diaphragmatic breathing at about 6 breaths per minute can acutely raise vagal HRV indices. Even a few slow breaths lower perceived arousal, though structured sessions of a minute or two show clearer baroreflex effects. The 3-part response: notice without judgment, shift posture to reduce abdominal tension, slow the exhale for 1 to 3 minutes. You are quieting the alarm, not eliminating the flare.",
  "The Anticipatory Anxiety Cycle": "Anticipatory anxiety is worrying about gut symptoms before they happen. It is a well-recognised maintaining factor in IBS, linked to worse symptom severity and quality of life. The cycle: upcoming event triggers worry, worry activates your HPA stress-alarm system, stress heightens visceral sensitivity, symptoms occur, brain treats this as confirmation that the worry was warranted, future similar events trigger stronger anticipatory anxiety. Interrupting the cycle does not mean stopping all worry. It means reducing the intensity and duration of anticipatory arousal, distinguishing specific worries (problem-solvable) from global catastrophising (needs interruption), and using brief slow breathing plus scheduled worry windows.",
  "Hypervigilance, When Monitoring Makes It Worse": "Hypervigilance is the pattern of constantly scanning your gut, evaluating sensations for threat, and keeping mental focus on the gut even when symptoms are mild or absent. It is one of the most well-documented maintaining factors in IBS. It feels protective but neurologically has the opposite effect: sustained attention to an internal sensation amplifies the brain's processing of it. Associations between hypervigilance and worse outcomes persist even after adjusting for gastrointestinal physiology, so this is genuinely a central mechanism rather than just a response to real gut trouble. The body scan in this app trains the shift from evaluative monitoring to neutral noticing.",
  "What to Do With Food Fear": "Food fear in IBS is common and frequently under-addressed. It develops when eating becomes associated with symptoms, and avoidance briefly reduces anxiety but expands the feared list over time. The Low-FODMAP diet, while evidence-based short-term, can inadvertently reinforce food fear if used as an anxiety-management tool rather than a structured diagnostic tool. Short-term RCTs show a relative risk of remaining symptomatic of about 0.69, and a number needed to treat of around 5. A more effective approach distinguishes foods that trigger symptoms through actual physiology from foods that trigger anticipatory anxiety. Gradual exposure plus pre-meal slow breathing is the research-backed combination.",
  "Tracking Progress Without Symptom Obsession": "Tracking IBS can be useful or it can become another form of hypervigilance. Useful tracking is weekly rather than daily, context-inclusive (noting stress, sleep, cycle phase), and oriented around quality-of-life markers like what you have been able to do. Unhelpful tracking is per-bowel-movement ratings, immediate food-symptom attribution, and intra-day checking. Research shows that daily detailed diaries tend to inflate perceived symptom severity through retrospective recall and reinforce attentional bias. Weekly summaries with context provide useful pattern data without reinforcing hypervigilance. The rule: track to learn, not to monitor."
};
function getSmartResponse(userMsg, sessionTitle, sessionContext, reflectionPrompt) {
  const msg = userMsg.toLowerCase().trim();

  // ── Layer 0b: Plain-English / "explain simply" requests ────────────────
  // When the user asks for a simpler explanation (often via the "Want this in
  // plainer English?" button), use the session's existing plain-language context
  // as a short summary, since those were written specifically for non-scientists.
  const plainCues = ["plainer english", "plain english", "simpler terms", "simpler words", "explain simply", "explain this simply", "even simpler", "in simple terms", "in simpler terms", "dumb it down", "break it down simply", "in plain"];
  if (plainCues.some(c => msg.includes(c))) {
    // First try a dedicated ELI14 summary from plainSummaries
    if (sessionTitle && plainSummaries[sessionTitle]) {
      return {
        text: `Here is "${sessionTitle}" explained in plain English, as simply as I can make it:\n\n${plainSummaries[sessionTitle]}\n\nIf any piece of that still feels unclear, ask me about that specific part and I will break it down even more.`,
        redirect: null
      };
    }
    // Fall back to sessionContext for sessions not in the dictionary
    const ctx = (sessionContext || "").trim();
    if (ctx && sessionTitle && sessionTitle !== "Ask Gut IQ") {
      const ctxLower = ctx.charAt(0).toLowerCase() + ctx.slice(1);
      return {
        text: `Here is the short version of "${sessionTitle}" in plain English: ${ctxLower} If any piece of that still feels unclear, ask me about that specific part and I will walk through it even more simply.`,
        redirect: null
      };
    }
    if (sessionTitle === "Ask Gut IQ") {
      return {
        text: `I can explain most IBS topics in plain language. Ask me about a specific thing, like vagal tone, FODMAPs, mast cells, the flare cascade, sleep and the gut, hypnotherapy, or your IBS subtype, and I will keep the answer short and non-technical.`,
        redirect: null
      };
    }
  }

  // ── Layer 0: Personal question detection ──────────────────────────────
  // If the user frames the question personally ("for me", "my", "do i",
  // "have i been"), the reflection chat cannot give a personalised answer.
  // Redirect them to the main AI chat while offering a short evidence snippet
  // on the likely topic they touched on.
  const personalCues = [" for me", " for myself", "my situation", "my own", "my experience", "has my", "could my", "is my", "does my", "did my", "have i", "am i", "do i", "i've", "i have been", "i am", "i'm", "myself", "to me", "at me"];
  const looksPersonal = personalCues.some(c => msg.includes(c));
  if (looksPersonal) {
    // Try to identify what topic the user touched on so we can at least mention it.
    const topicHints = {
      trauma: "early-life adversity and trauma",
      adversity: "early-life adversity",
      anxiety: "anxiety and the gut-brain loop",
      stress: "chronic stress and the HPA axis",
      sleep: "sleep and gut-brain restoration",
      diet: "diet and dietary triggers",
      food: "food triggers and autonomic state",
      flare: "the flare cascade",
      vagal: "vagal tone and autonomic balance",
      vagus: "the vagus nerve",
      serotonin: "gut serotonin",
      fodmap: "the low-FODMAP approach",
      pelvic: "pelvic floor dysfunction",
      hormone: "hormonal effects on the gut",
      menstrual: "menstrual-cycle effects on the gut",
      hypnotherapy: "gut-directed hypnotherapy",
      cbt: "cognitive behavioural therapy for IBS"
    };
    let touched = "";
    for (const [kw, phrase] of Object.entries(topicHints)) {
      if (msg.includes(kw)) {
        touched = phrase;
        break;
      }
    }
    const preamble = touched ? `That question is personal to your situation, and this reflection chat cannot give you personalised advice. What I can share is what the research says about ${touched}: ` : "That question sounds personal, and this reflection chat is limited to the science covered in this session. For a conversation about your own situation, the main AI chat on the Tools tab is a better fit. ";

    // If we know the topic, pull the short version from topicResponses below.
    // Otherwise just give the redirect.
    return {
      text: preamble + (touched ? "You can also open the main AI chat on the Tools tab for a personalised conversation." : ""),
      redirect: {
        label: "Open main AI chat",
        action: "chat"
      }
    };
  }

  // ── Layer 1: Preset-question direct answers ────────────────────────────
  // These are the exact strings from getPresetQuestions, plus close variants.
  // Each gets a purpose-built, specific answer.
  const presetAnswers = {
    "why do doctors dismiss ibs symptoms?": "Dismissal often happens because IBS does not show up on standard tests like bloodwork, colonoscopy, or imaging. Some clinicians historically treated 'no structural damage' as 'no real problem,' but current evidence and guidelines disagree. IBS is classified as a Disorder of Gut-Brain Interaction. The problem is in how gut and brain are communicating, which is measurable through visceral sensitivity, mast cell activity, HPA axis function, and microbiome composition. If you feel dismissed, asking your clinician specifically about 'gut-brain interaction' and 'Rome IV criteria' often shifts the conversation.",
    "what makes ibs a real diagnosis?": "IBS is a real, positive diagnosis. It is made using the Rome IV criteria, which look for recurrent abdominal pain at least one day per week over three months, with symptom onset at least six months before diagnosis, associated with at least two features related to defecation, stool frequency, or stool form. When these criteria are met and serious conditions are ruled out, the diagnosis is clinically sound. Rome IV has roughly 82 percent sensitivity and 83 percent specificity against detailed investigations. This is not a 'we could not find anything' diagnosis, it is a positive one.",
    "how does the vagus nerve work?": "The vagus nerve is the main highway between your brainstem and your gut, and roughly 80 percent of its fibers actually travel upward from gut to brain in many regions. It carries constant information about motility, stretch, pH, immune activity, and even the microbiome, mostly below conscious awareness. Downward signals regulate gut motility, secretions, and inflammation. In IBS, vagal tone is typically reduced, which correlates with lower heart rate variability. Slow diaphragmatic breathing, gentle aerobic activity, and noninvasive auricular vagus nerve stimulation have been shown to improve vagal tone and IBS symptoms in trials.",
    "what percentage of signals go from gut to brain?": "Roughly 80 percent of the nerve fibers in the vagus nerve are afferent, meaning they carry information upward from gut to brain, in many regions of the body. The practical point is that your gut is constantly reporting on its state, most of that information never reaches conscious awareness, and it shapes mood, energy, and threat sensitivity long before you 'notice' anything. This is why gut dysregulation so easily influences anxiety, fatigue, and sensitivity, and why gut-directed interventions often help both gut and mood.",
    "can i stop a flare once it starts?": "Partially, yes. A full flare is a cascade: trigger, HPA axis activation, autonomic shift, gut permeability change, mast cell activation, nerve sensitization, central amplification, and anxiety loop. Early in the cascade you have the most leverage. Slow diaphragmatic breathing at about six cycles per minute stimulates the vagus nerve and pulls the autonomic system toward parasympathetic. A body scan or the Flare Reset tool helps interrupt central amplification. Later in the cascade you cannot 'stop' it instantly, but you can soften the loop by reducing sympathetic drive and calming the threat appraisal so the flare does not self-reinforce.",
    "which step in the cascade should i target first?": "The most effective leverage points are the autonomic shift (step two) and the central amplification (step six), because both are actively trainable. Slow breathing targets the autonomic shift directly through the vagus nerve. Brain-gut behavioural therapies like CBT and gut-directed hypnotherapy target central amplification. If a flare is already in progress, address the autonomic shift first using breathing, because that downshifts several downstream steps at once. If you want long-term change, building vagal tone and addressing central amplification over weeks is where the gains come from.",
    "why is my serotonin made in my gut?": "About 90 to 95 percent of your body's serotonin is made in the gut, by enterochromaffin cells in the intestinal lining. Gut and brain serotonin are separate pools because the molecule does not cross the blood-brain barrier, so the gut serotonin does not directly become brain serotonin. But the two systems are linked, gut serotonin shapes motility, pain signalling, and vagal messages upward to the brain, and that signalling influences mood indirectly. Stress, microbial imbalance, and early adversity all affect gut serotonin production.",
    "how does stress affect serotonin?": "Chronic stress shifts tryptophan, the amino acid used to build serotonin, away from the serotonin pathway and toward the kynurenine pathway. This happens in part through immune and stress activation of an enzyme called indoleamine 2,3-dioxygenase, or IDO. The practical effect is that ongoing stress reduces the raw material available for serotonin synthesis. Sleep loss and inadequate protein intake compound this. In IBS, this can mean motility and pain signalling are affected not just by acute stress but by cumulative stress load over weeks.",
    "what is vagal tone?": "Vagal tone is a measure of how active your vagus nerve is at rest. Higher vagal tone generally means better parasympathetic function, which supports digestion, steadier heart rate, and lower inflammatory tone. Heart rate variability, or HRV, is the most common way to estimate it. In IBS, vagal tone is typically reduced, especially in IBS-C and in more severe disease. It is also trainable. Slow diaphragmatic breathing, regular aerobic activity, adequate sleep, and noninvasive auricular vagus nerve stimulation have all been shown to improve it over weeks to months.",
    "how do i increase parasympathetic activity?": "The most evidence-backed ways are slow diaphragmatic breathing at about six cycles per minute, regular moderate aerobic activity, consistent sleep timing, and noninvasive auricular vagus nerve stimulation. The extended exhale in slow breathing activates the baroreflex, which pulls the autonomic system toward parasympathetic. Trials in IBS show 5 to 10 minutes of this breathing daily for 4 to 8 weeks produces measurable HRV improvements and symptom reductions. These are targeted physiological interventions, not general relaxation advice.",
    "why 6 cycles per minute specifically?": "Roughly six breaths per minute is the resonant frequency of the human cardiovascular system. Breathing at this rate creates a coherence between respiration, heart rate, and blood pressure rhythms that maximally activates the baroreflex and stimulates the vagus nerve. In trials in IBS, this pace produces the largest improvements in heart rate variability and symptom severity. Faster breathing does not create the same effect, and slower than five per minute can feel effortful without added benefit. The 4-2-6 pattern in this app approximates six cycles per minute.",
    "how long before i see results?": "For most autonomic interventions, HRV and subjective symptom changes start to appear within 2 to 4 weeks of consistent daily practice, with larger changes over 8 to 12 weeks. Brain-gut behavioural therapies typically show measurable effects within 6 to 12 weeks. Dietary changes like a low-FODMAP elimination phase show effects within 2 to 6 weeks. The most common reason interventions 'do not work' is under-dosing, meaning practice that is irregular or too brief to reach the threshold where nervous-system adaptation happens.",
    "what's the fastest way to activate my vagus nerve?": "The fastest evidence-based option is a long, slow exhale. Inhale for 4 seconds, hold briefly, then exhale for 6 seconds or longer. Repeat for 1 to 2 minutes. This activates the baroreflex and pulls the autonomic system toward parasympathetic within minutes. Humming or gentle singing during the exhale adds vocal-cord vibration that also stimulates vagal branches. Cold water on the face can produce the mammalian dive reflex, which is rapid but less comfortable. For flare-level moments, slow breathing plus a body scan is usually the most accessible combination.",
    "does cold exposure really work?": "Cold exposure activates the vagus nerve through the mammalian dive reflex and through cold-shock signalling, and some studies show HRV changes. But in IBS, the evidence base is much smaller than for slow breathing. For acute calming, cold water on the face or a cold compress to the neck can help shift autonomic state. For chronic improvement in vagal tone, cold exposure is inconsistent and often uncomfortable, so it is not currently a first-line recommendation in IBS guidelines. Slow breathing and regular activity have stronger evidence.",
    "how do i know my sustainable baseline?": "A practical approach is to track your activity and symptoms for 1 to 2 weeks. Your sustainable baseline is the level of daily load at which symptoms stay stable or improve, without post-exertional flares. It is often lower than you think. In IBS with autonomic dysregulation, a sustainable day looks like consistent moderate activity, with rest periods built in, rather than alternating full-throttle days and crash days. The Pacing principle is that doing slightly less on good days prevents the crash that drives the boom-and-bust cycle.",
    "what if pacing feels like giving up?": "Pacing is not giving up, it is building a stable platform. Boom-and-bust cycles worsen autonomic dysregulation because the sympathetic spikes on overdo days and the shutdown on crash days both amplify the gut-brain loop. Pacing interrupts that pattern. Many people find that after 6 to 8 weeks of consistent pacing, their capacity actually grows, not shrinks, because they are no longer undoing gains with flares. The goal is not permanent restriction, it is building a reliable baseline you can then expand from.",
    "why does poor sleep worsen gut symptoms?": "Poor sleep reduces vagal tone the very next day, activates the HPA axis, increases intestinal permeability, and raises visceral sensitivity. Deep sleep is also when the gut runs its migrating motor complex, an overnight cleaning wave that clears residual material and resets motility. Shortening or fragmenting that window leaves the gut underserviced. Across multiple studies, one night of poor sleep increases next-day abdominal symptoms in IBS by roughly 20 to 50 percent. Sleep is not a lifestyle preference for IBS, it is a core autonomic restoration window.",
    "what's the migrating motor complex?": "The migrating motor complex, or MMC, is the pattern of electrical and contractile activity that sweeps through the small intestine during fasting, especially at night. It clears residual food, bacteria, and debris, keeping the small bowel clean and resetting motility for the next day. Poor sleep, constant snacking, and some gut disorders disrupt the MMC. In IBS, MMC disruption is associated with bloating, bacterial overgrowth, and altered motility. Protecting overnight fasting windows and consistent sleep supports MMC function.",
    "how do i notice without monitoring?": "Monitoring is threat-oriented attention, scanning for danger, cataloguing every sensation, looking for something wrong. Noticing is neutral attention, observing without judgment, the way you might notice the temperature of a room. The shift matters because chronic monitoring reinforces the hypervigilance loop that amplifies gut signals. Practices like body scan, mindful interoception, and gut-directed hypnotherapy teach your nervous system to register gut sensations as information rather than threat. Over time, this reduces central amplification and pain intensity.",
    "what if ignoring symptoms feels dangerous?": "It makes sense that ignoring feels dangerous, hypervigilance usually developed to keep you safe. The goal is not to ignore, it is to respond rather than react. Gut-directed hypnotherapy, CBT for IBS, and body scan practices work by rewiring the threat appraisal, so sensations register accurately without automatically triggering alarm. This is not the same as dismissing symptoms. It is teaching the nervous system to stop over-amplifying them. If you have genuine red flag features, those still need clinical review, this approach is for the everyday gut sensations that have become disproportionately loud.",
    "should i still do low-fodmap?": "Maybe, but done properly. Low-FODMAP is evidence-based for short-term symptom relief in roughly 50 to 76 percent of IBS patients. It is a three-phase protocol, a 4 to 6 week strict elimination, then systematic reintroduction one category at a time, then personalised maintenance where you avoid only your specific triggers. Long-term strict restriction is not recommended because it reduces beneficial gut bacteria, particularly Bifidobacteria. Work with a dietitian if possible, because the reintroduction phase is where most of the value is and it is easy to get stuck in elimination.",
    "how do i separate food triggers from anxiety?": "This is genuinely hard because they can feel identical. A practical approach is to track three things per day for two weeks, what you ate, your stress level on a 1 to 10 scale, and symptoms. Patterns emerge within 1 to 2 weeks. Food triggers tend to be reproducible and dose-dependent, meaning the same food at the same amount produces similar symptoms. Anxiety-driven flares often cluster around specific contexts, such as work deadlines or social events, and the same food can be tolerated at calm times. Pre-event flares, where symptoms start before a stressor, are almost always anxiety-driven rather than food-driven.",
    "do i need pelvic floor testing?": "Consider it if you have constipation, incomplete evacuation, straining, or outlet-type symptoms that have not responded to standard IBS management. Pelvic floor dysfunction, particularly dyssynergic defecation, overlaps meaningfully with IBS-C. Diagnosis requires objective testing like anorectal manometry or defecography, a trained pelvic floor physiotherapist can often screen for signs clinically first. When dyssynergia is confirmed, biofeedback is the evidence-based treatment and works for many people even when IBS is also present.",
    "what is dyssynergic defecation?": "Dyssynergic defecation, sometimes called pelvic floor dyssynergia, means the pelvic floor paradoxically contracts or fails to relax during straining. This produces constipation, outlet-type symptoms, and incomplete evacuation that can look exactly like IBS-C. It often coexists with IBS rather than replacing it. Biofeedback is the gold-standard treatment, with trial evidence showing roughly 80 percent patient satisfaction. If you have IBS-C with straining or feeling-not-done, pelvic floor assessment is worth considering.",
    "how does childhood stress affect the gut?": "Early-life adversity can program the gut-brain axis through epigenetic changes in enterochromaffin cells, HPA axis reactivity, autonomic tone, and threat appraisal circuitry. Animal and human data show long-lasting effects on the brain-gut-microbiome axis, including altered visceral sensitivity decades later. This does not mean IBS is simply 'caused' by childhood experience, but adverse childhood experiences are a significant risk factor. Trauma-informed care that integrates gut-directed interventions with nervous system regulation tends to work better than either alone.",
    "what are aces?": "ACEs, or Adverse Childhood Experiences, is a research term for exposures like abuse, neglect, household substance use, or family instability during childhood. Higher ACE scores are consistently associated with higher IBS prevalence and severity in adulthood. The mechanism involves epigenetic programming of stress systems and gut-brain signalling. If ACEs are part of your history, trauma-informed IBS care can make a real difference, because the same nervous system patterns that drive IBS symptoms are often the patterns shaped by early adversity.",
    "how long does post-infectious ibs last?": "Post-infectious IBS, or PI-IBS, typically lasts months to years after a gut infection, with gradual improvement in many patients. Roughly 5 to 32 percent of people develop PI-IBS after gastroenteritis, with higher risk after bacterial or protozoal infections. Some people recover within 6 to 12 months, others have symptoms that persist longer. Mechanisms include low-grade mucosal inflammation, increased mast cells and T cells, changes in enterochromaffin cell density, and altered permeability. Treatment targets the same mechanisms as other IBS subtypes, with some evidence that gut-directed behavioural therapies and anti-inflammatory approaches help.",
    "why didn't my gut reset after the infection?": "Even after the infection clears, several changes can persist. Low-grade mucosal inflammation, increased mast cell and immune cell activity, altered enterochromaffin cells that affect serotonin signalling, increased gut permeability, and shifts in the microbiome can all linger. The nervous system also adapts, visceral sensitivity increases and the threat appraisal circuitry in the brain becomes primed. PI-IBS is the downstream result of a gut that became hypersensitive during infection and did not fully reset afterward. This is not permanent, but it does not self-correct on the infection clearing alone.",
    "why does perimenopause worsen ibs?": "Perimenopause brings large fluctuations in estrogen and progesterone, which directly modulate gastrointestinal motility, visceral sensitivity, and the gut-brain axis. Falling estrogen is associated with increased gut sensitivity. Progesterone influences motility. Sleep disruption during perimenopause further reduces vagal tone, which amplifies symptoms. Many people find their IBS pattern shifts, often becoming less predictable. This is a real hormonal mechanism, not stress alone. Cycle-aware or perimenopause-aware management often requires different tools than premenopausal care.",
    "how does estrogen affect gut sensitivity?": "Estrogen has complex effects on the gut. It modulates visceral pain thresholds, gut motility, and the autonomic nervous system. Broadly, higher estrogen is associated with lower visceral pain sensitivity, and the drop in estrogen before menstruation or during perimenopause correlates with increased gut sensitivity for many people. Estrogen also influences serotonin signalling and the microbiome. Cycle tracking for a few months often reveals a reliable pattern, which then lets you plan around the more sensitive phases.",
    "what is the enteric nervous system?": "The enteric nervous system, or ENS, is the nervous system embedded in your gut wall. It contains roughly 200 to 600 million neurons, more than your spinal cord, and is sometimes called the 'second brain.' It lines your entire digestive tract and governs motility, secretions, and local immune activity largely on its own. It is in constant two-way communication with the brain through the vagus nerve and other pathways. In IBS, both the ENS and its communication with the brain become dysregulated, which is why IBS is classified as a disorder of gut-brain interaction.",
    "how do gut bacteria affect neurotransmitters?": "Gut bacteria influence neurotransmitter levels through several pathways. Some bacteria produce neurotransmitters directly, including GABA, serotonin precursors, and dopamine. Others generate short-chain fatty acids that cross the blood-brain barrier and modulate microglia. Some strains, like Ruminococcus gnavus, can raise enterochromaffin cell serotonin through tryptamine and phenethylamine production. The overall picture is that the microbiome is one input among many to the gut-brain axis, not the master switch. Dysbiosis in IBS is documented, and specific probiotic strains have strain-specific evidence, but generic multi-strain products are not strongly supported.",
    "which step can i interrupt most easily?": "The autonomic shift, which is step two in the flare cascade, is the most trainable target. Slow diaphragmatic breathing directly activates the vagus nerve through the baroreflex, pulling the autonomic system toward parasympathetic dominance within minutes. This intercepts the cascade early, before gut permeability and mast cell changes fully develop. Central amplification, step six, is also very trainable but over longer timescales through CBT and gut-directed hypnotherapy. In the moment, target autonomic. Over weeks, target central amplification.",
    "what are mast cells doing?": "Mast cells are immune cells that sit right next to sensory nerve endings in your gut wall. When activated, they release mediators like histamine, serotonin, and tryptase directly onto those nerve endings. This sensitizes the nerves, lowering the pain threshold so even normal gut activity can feel painful. Mast cells are triggered by stress hormones, certain foods, and microbial metabolites. This is a well-documented peripheral mechanism of visceral hypersensitivity in IBS. Stabilising the nervous system reduces mast cell activation, which is part of why autonomic regulation actually changes gut sensation.",
    "why is my ibs subtype relevant to serotonin?": "IBS subtypes show different serotonin patterns. IBS-D, which is diarrhea-predominant, is often associated with increased mucosal serotonin availability and faster transit. IBS-C, which is constipation-predominant, often shows reduced postprandial serotonin release and slower transit. This is why 5-HT3 antagonist medications can help IBS-D by calming serotonin-driven signals, while IBS-C sometimes responds to agents that restore motility. Knowing your subtype tells you something about which serotonin-related interventions are more likely to help.",
    "can diet affect gut serotonin?": "Yes, in several ways. Dietary tryptophan, from protein sources, is the raw material your body uses to build serotonin. Inadequate protein intake reduces that supply. The microbiome also matters, because certain bacteria support serotonin precursor production while others, like Ruminococcus gnavus, can raise enterochromaffin cell serotonin. Chronic stress shifts tryptophan away from serotonin and toward the kynurenine pathway regardless of diet. So diet is one input to gut serotonin, not the only one, and stress can override diet effects over time."
  };

  // Normalise common punctuation/quote variations to raise the match rate
  const normalizedMsg = msg.replace(/[''`]/g, "'").replace(/[""]/g, '"').replace(/[!?.]+$/, '').replace(/\s+/g, ' ').trim();
  for (const [q, ans] of Object.entries(presetAnswers)) {
    const qNorm = q.replace(/[!?.]+$/, '').replace(/\s+/g, ' ').trim();
    if (normalizedMsg === qNorm || normalizedMsg.includes(qNorm)) {
      return {
        text: ans,
        redirect: null
      };
    }
  }

  // ── Layer 2: Topic keyword matching (expanded, ordered specific-first) ─
  const topicResponses = {
    "visceral hypersensitivity": "Visceral hypersensitivity, which is when the gut\u0027s pain nerves fire more easily than they should, is a documented finding in roughly 20 to 90 percent of IBS patients. It means the gut nerves have a lowered pain threshold, so stimuli that would not normally register as painful, like gas movement or normal contractions, trigger pain signals. It happens at both the peripheral level through mast cell mediators sensitising gut nerves, and at the central level through brain amplification. This is why normal gut activity can feel intensely painful in IBS.",
    "central sensitization": "Central sensitisation in IBS means the brain's pain-processing circuits are amplifying real peripheral signals from the gut. The limbic system (the brain\u0027s emotion and threat-processing network), including the amygdala and anterior cingulate cortex, becomes hyperactive, while the prefrontal cortex's descending inhibition becomes impaired. This is why pain in IBS can feel disproportionate to what tests show, the nervous system is amplifying the signal. Brain-gut behavioural therapies like CBT and gut-directed hypnotherapy directly target this central amplification.",
    "post-infectious": "Post-infectious IBS, or PI-IBS, is a well-characterised subtype where IBS symptoms persist after a gut infection has cleared. Roughly 5 to 32 percent of people develop PI-IBS after gastroenteritis. Mechanisms include low-grade mucosal inflammation, increased mast cells and T cells, altered enterochromaffin cell function, increased permeability, and microbiome shifts. It often improves over months to a couple of years, and gut-directed behavioural therapies plus anti-inflammatory approaches tend to help.",
    "pelvic floor": "Pelvic floor dysfunction, particularly dyssynergic defecation, is a clinically relevant overlap with IBS-C and outlet-type symptoms. It involves the pelvic floor paradoxically contracting or failing to relax during attempted defecation. Diagnosis requires anorectal manometry or defecography. When confirmed, biofeedback has strong evidence and works for many people even with concurrent IBS. If you have constipation, straining, or incomplete evacuation that has not responded to standard IBS management, a pelvic floor assessment is worth considering.",
    "mast cell": "Mast cells are immune cells that sit right next to sensory nerve endings in your gut wall. When they activate, they release mediators like histamine and serotonin onto those nerves, which lowers the pain threshold. In IBS, mast cell activity is often increased near colonic nerves. Stress, certain foods, and microbial metabolites can all trigger this. Stabilising the nervous system reduces mast cell activation, which is one reason autonomic regulation actually changes gut sensation, not just mood.",
    "rome iv": "Rome IV is the current diagnostic framework for IBS. It looks for recurrent abdominal pain on at least one day per week, over the past three months, with symptom onset at least six months earlier, associated with at least two of these features, pain relates to defecation, stool frequency changes, or stool form changes. Rome IV has roughly 82 percent sensitivity and 83 percent specificity against detailed investigations. Meeting Rome IV plus ruling out alarm features is considered a positive diagnosis, not an exclusion.",
    "heart rate variability": "Heart rate variability, or HRV, measures beat-to-beat variation in heart rate. Higher HRV generally reflects better vagal tone and parasympathetic function. In IBS, HRV is typically reduced, especially in IBS-C and in more severe disease. HRV is trainable, slow diaphragmatic breathing at about six cycles per minute has been shown to raise HRV measurably within 4 to 8 weeks, and that change correlates with symptom improvement in trials.",
    "hpa axis": "The HPA axis, or hypothalamic-pituitary-adrenal axis, is your body's main stress-alarm system. When activated, it releases cortisol and corticotropin-releasing factor (CRF, a hormone that also activates stress circuits), which directly impair gut barrier function, activate mast cells, and alter motility. In IBS, this axis is often chronically overactive or hypersensitive. Breaking the loop requires addressing both the stress input through pacing, breathing, and therapy, and the gut-brain amplification through brain-gut behavioural therapies, dietary approaches, and autonomic regulation.",
    "vagal tone": "Vagal tone measures how active your vagus nerve is at rest, and it is typically reduced in IBS, especially in IBS-C and more severe disease. It is one of the most documented findings in IBS research. It is also trainable. Slow diaphragmatic breathing at about six cycles per minute, regular moderate aerobic activity, adequate sleep, and noninvasive auricular vagus nerve stimulation have all been shown to improve it. 5 to 10 minutes of daily slow breathing produces measurable HRV improvements over 4 to 8 weeks.",
    "vagus": "The vagus nerve is the main highway between brainstem and gut, with roughly 80 percent of its fibers carrying signals upward from gut to brain in many regions. In IBS, reduced vagal activity means the gut loses some of its rest-and-digest support, motility becomes erratic, pain threshold drops, and permeability increases. The vagus responds to slow breathing, aerobic exercise, sleep, and social connection. These are evidence-based vagal interventions, not wellness suggestions.",
    "vagal": "Vagal tone refers to how active your vagus nerve is at rest, and it is one of the most documented findings in IBS research. It tends to be reduced, especially in IBS-C. The important thing is that it is trainable, slow breathing at about six cycles per minute directly stimulates the vagus through the baroreflex. Even 5 to 10 minutes daily produces measurable HRV improvements over 4 to 8 weeks.",
    "cortisol": "Cortisol is the primary stress hormone released by the HPA axis. In IBS, chronic or repeated cortisol spikes increase intestinal permeability, activate mucosal mast cells, and sensitise gut nerves. This is why stress does not just worsen symptoms psychologically, it changes gut biology directly. Managing the stress response through slow breathing, pacing, and brain-gut therapies addresses this mechanism at its source.",
    "tryptophan": "Tryptophan is the amino acid your body uses to make serotonin. Dietary tryptophan comes mostly from protein. Chronic stress and immune activation shift tryptophan away from the serotonin pathway and toward the kynurenine pathway, through an enzyme called IDO (indoleamine 2,3-dioxygenase, which stress and inflammation activate). Low protein intake and gut bacterial imbalance can also reduce tryptophan availability. In IBS, this matters because 90 to 95 percent of body serotonin is made in the gut, and gut serotonin regulates motility, pain signalling, and gut-brain communication.",
    "kynurenine": "The kynurenine pathway is an alternative route that tryptophan can take in the body. When chronic stress or inflammation activates the enzyme IDO, tryptophan is diverted away from serotonin production and toward kynurenine. In IBS, this shift reduces gut serotonin availability while increasing kynurenine metabolites, some of which can affect the nervous system. Managing chronic stress and inflammation helps rebalance this pathway over time.",
    "serotonin": "About 90 to 95 percent of your body's serotonin is made in the gut, by enterochromaffin cells, not in the brain. Gut and brain serotonin are separate pools because the molecule does not cross the blood-brain barrier. In the gut, serotonin regulates motility, pain signalling, and gut-brain communication via the vagus nerve. IBS-D is often associated with increased mucosal serotonin and faster transit. IBS-C often shows reduced serotonin release after meals and slower transit. Chronic stress, microbial imbalance, early adversity, and poor nutrition all affect gut serotonin production.",
    "enterochromaffin": "Enterochromaffin cells, or EC cells, are the specialised cells lining your gastrointestinal tract that make about 90 to 95 percent of your body's serotonin. They sense the chemistry of the gut lumen and release serotonin onto nearby nerves to regulate motility and signal upward to the brain. In IBS, EC cell function can be altered by chronic stress, early-life adversity, microbial shifts, and infection. Changes in EC cell density and serotonin handling are part of what distinguishes IBS subtypes.",
    "fodmap": "The low-FODMAP diet is evidence-based for short-term symptom relief in roughly 50 to 76 percent of IBS patients. It is designed as a three-phase protocol, strict elimination for 4 to 6 weeks, then systematic reintroduction one category at a time, then personalised maintenance where you avoid only your specific triggers. Long-term strict restriction is not recommended because it reduces beneficial gut bacteria, particularly Bifidobacteria. Dietitian guidance is recommended throughout.",
    "probiotic": "Probiotics in IBS should be chosen based on strain-specific evidence for defined outcomes, not generic multi-strain products. Network meta-analyses rank Bifidobacterium longum highly for quality of life, Bacillus coagulans for pain and stool outcomes, and Lactobacillus acidophilus for anxiety and pain. Trial a specific strain for 8 to 12 weeks with a clear symptom target, then evaluate. A pharmacist who understands strain-specific evidence can help.",
    "microbiome": "The gut microbiome influences the gut-brain axis through neurotransmitter production, immune signalling, short-chain fatty acids that support the blood-brain barrier, and direct vagus nerve communication. Dysbiosis in IBS is documented but is one factor among many. Specific strains matter more than general 'gut health,' certain bacteria like Ruminococcus gnavus (a gut bacterium that can become overrepresented in IBS-D) can raise EC cell serotonin through tryptamine and phenethylamine production, contributing to faster transit in IBS-D.",
    "permeability": "Intestinal permeability, sometimes called 'leaky gut,' refers to how easily substances pass through the gut lining. In IBS, permeability can transiently increase under stress, allowing more substances to reach immune cells in the gut wall and trigger mast cell activation. This is a real, measurable mechanism, not pseudoscience, but the popular 'leaky gut syndrome' label is much broader than the documented phenomenon. Permeability changes in IBS are typically modest and responsive to stress management.",
    "leaky gut": "The term 'leaky gut' is commonly used loosely, but the documented phenomenon in IBS is transient increases in intestinal permeability, particularly under stress. This allows more substances to pass into the gut wall and trigger mast cell activation, which sensitises nearby nerves. It is one mechanism among several, and it responds to stress management and autonomic regulation. Commercial 'leaky gut' products are generally not supported by evidence.",
    "stress": "Stress in IBS is not just a psychological trigger, it is a biological mechanism. Stress activates the HPA axis, which releases cortisol and corticotropin-releasing factor. These hormones increase gut permeability, activate mast cells near gut nerves, and lower the pain threshold. The gut-brain loop means stress worsens gut symptoms, which creates more stress, which worsens symptoms further. Interrupting this requires targeting both the stress response through breathing, pacing, and therapy, and the gut-brain amplification.",
    "anxiety": "Anxiety and IBS share biological pathways, including serotonin dysregulation, HPA axis activation, autonomic imbalance, and central sensitisation. The relationship is bidirectional, baseline anxiety increases IBS risk, and baseline IBS increases anxiety risk. IBS often precedes the anxiety disorder in comorbid cases, which suggests gut-brain dysregulation drives anxiety for many people, not the other way around. Brain-gut therapies help with both.",
    "depression": "Depression and IBS co-occur at roughly three times the rate of the general population. They share overlapping biology, including serotonin pathways, HPA axis dysregulation, inflammation, and neuroplasticity changes. Longitudinal data shows IBS often precedes depression, suggesting gut-brain dysregulation may drive mood symptoms in many cases. Treating IBS with brain-gut therapies often improves both gut and mood symptoms together.",
    "sleep": "Sleep is not passive recovery for the gut-brain axis. During deep sleep, HRV peaks, the nervous system shifts decisively into parasympathetic mode, and the gut runs its migrating motor complex, an overnight cleaning wave that resets motility. Poor sleep increases gut sensitivity the very next day through reduced vagal tone, HPA axis activation, and increased permeability. Protecting sleep is a gut-brain intervention, not a lifestyle preference.",
    "breathing": "Slow diaphragmatic breathing at about six cycles per minute is the most direct and accessible tool for improving vagal tone. The extended exhale activates the vagus nerve through the baroreflex. A 2022 trial in IBS-C found that six weeks of slow breathing improved symptom severity, stool outcomes, and rectal sensation thresholds, with increased vagal activity as the likely mechanism. This is a targeted autonomic intervention with IBS-specific evidence.",
    "breathe": "Slow diaphragmatic breathing at about six cycles per minute directly activates the vagus nerve through the baroreflex. The extended exhale is the active ingredient. Even 5 to 10 minutes daily produces measurable HRV improvements over 4 to 8 weeks, and those improvements correlate with IBS symptom reduction. The 4-2-6 pattern in this app approximates this pace.",
    "hypnotherapy": "Gut-directed hypnotherapy, or GDH, uses focused gut-specific imagery and suggestion to recalibrate the gut-brain connection directly. A 2025 meta-analysis of 12 studies covering 1,158 patients showed GDH improved global IBS symptoms and pain, with group delivery particularly effective. GDH is recommended in North American guidelines and supported by European practice reviews. It addresses central amplification and the threat appraisal that drives pain amplification.",
    "cbt": "Cognitive Behavioural Therapy adapted for IBS addresses the thought patterns, avoidance behaviours, and anxiety that amplify the gut-brain loop. A 2025 network meta-analysis of 67 trials with 7,441 patients found brain-gut behavioural therapies, including both minimal-contact self-guided and face-to-face CBT, effective for global IBS symptoms versus waitlist, with consistent effects despite risk-of-bias concerns. Current guidelines recommend brain-gut therapies as part of care.",
    "neuroplasticity": "Neuroplasticity is the brain's capacity to change structure and function based on experience. In IBS, chronic gut-brain dysregulation produces measurable structural changes in the prefrontal cortex, amygdala, and insula. But neuroplasticity works both ways. CBT and gut-directed hypnotherapy produce measurable changes in brain activation patterns in IBS responders. The prefrontal cortex regains descending control, and the insula's processing of gut signals normalises. Every practice in this app is a neuroplasticity intervention.",
    "brain": "IBS involves measurable brain changes. Neuroimaging consistently shows altered activation in pain-processing regions, including the anterior cingulate cortex, insula, and amygdala, during visceral stimulation, alongside impaired descending inhibition from the prefrontal cortex. These are structural and functional, not imaginary. Effective treatment modifies these patterns over weeks to months.",
    "motility": "Motility is the coordinated muscular movement that carries food through the gut. In IBS, motility (the coordinated movement of your gut muscles) is often dysregulated, faster than normal in IBS-D leading to urgency and loose stools, slower in IBS-C leading to constipation. Multiple inputs shape motility, including vagal tone, gut serotonin, the migrating motor complex during fasting, and the autonomic state of the moment. Slow breathing, regular meals, and adequate sleep all support more coordinated motility.",
    "transit": "Transit time is how long food takes to move through your gut. Faster transit is typical in IBS-D and contributes to urgency and loose stools. Slower transit is typical in IBS-C and contributes to constipation. Transit is shaped by motility, which is shaped by vagal tone, gut serotonin, and autonomic state. This is why the same person can have very different transit on different days, the nervous system is modulating it in real time.",
    "flare": "A flare follows a documented cascade, trigger, HPA axis activation, autonomic shift, gut permeability change, mast cell activation, nerve sensitisation, central amplification, anxiety loop. Early in the cascade you have the most leverage. Slow breathing targets the autonomic shift directly. A body scan or the Flare Reset tool helps interrupt central amplification. Later in the cascade you cannot stop it instantly, but you can soften the loop.",
    "trauma": "Early-life adversity and trauma have documented effects on the gut-brain axis. Adverse childhood experiences are associated with higher IBS prevalence, and early stress can epigenetically program enterochromaffin cell populations, priming lifelong visceral hyperalgesia. Trauma also shapes autonomic regulation, threat appraisal, and interoceptive processing. This does not mean IBS is caused by trauma in a simple sense, but trauma history is a significant risk factor and often benefits from trauma-informed care.",
    "aces": "Adverse Childhood Experiences, or ACEs, are research-defined exposures like abuse, neglect, or household instability during childhood. Higher ACE scores correlate with higher IBS prevalence and severity. The mechanism involves epigenetic programming of stress systems, EC cell populations, and autonomic reactivity. Trauma-informed IBS care that integrates gut-directed therapies with nervous system regulation often works better than either alone.",
    "diet": "Food matters in IBS, but food is not the whole story. Dietary triggers are real and individual, but they operate within a gut-brain system also shaped by stress, sleep, autonomic tone, and central sensitisation. The most effective approach combines dietary management, like low-FODMAP with reintroduction, with brain-gut interventions like CBT, hypnotherapy, breathing, and pacing. Focusing only on food misses the neurological component.",
    "histamine": "Histamine is one of the key mediators released by mast cells in the gut wall. In IBS, mast cells near colonic nerves release histamine in response to stress, certain foods, and microbial triggers. This sensitises the nerves, making normal gut sensations feel painful. It is a well-documented peripheral mechanism of visceral hypersensitivity.",
    "dyssynergia": "Dyssynergic defecation, also called pelvic floor dyssynergia, means the pelvic floor paradoxically contracts or fails to relax during straining. It produces constipation and outlet symptoms that can closely resemble IBS-C. Biofeedback is the gold-standard treatment and shows around 80 percent patient satisfaction in trials. Many people with both IBS and dyssynergia benefit from biofeedback, so it should not be dismissed just because IBS is also present.",
    "dgbi": "DGBI stands for Disorder of Gut-Brain Interaction, the current classification for IBS and related conditions. It replaces older framings like 'functional' and reflects what the evidence actually shows, that the gut and brain are biologically connected and that IBS involves measurable changes in that communication system. It is a positive diagnosis, not a diagnosis of exclusion.",
    "diagnosis": "IBS is a positive clinical diagnosis, not a diagnosis of exclusion based on nothing. Rome IV criteria look for recurrent abdominal pain at least one day per week over three months, with symptom onset at least six months earlier, associated with at least two features related to defecation or stool. Rome IV has roughly 82 percent sensitivity and 83 percent specificity. Meeting Rome IV plus ruling out alarm features is diagnostically sound.",
    "subtype": "IBS subtypes are based on the predominant stool form on days with abnormal bowel movements, per Rome criteria and the Bristol stool form scale. IBS-D is diarrhea-predominant, IBS-C is constipation-predominant, IBS-M alternates, and IBS-U does not fit neatly. Each subtype has a distinct physiological profile, so the treatment approach differs. Subtypes can shift over time, prospective studies show most individuals change subtype at least once over a year.",
    "colonoscopy": "Routine colonoscopy is not recommended for patients younger than 45 with IBS symptoms and no alarm features. Colonoscopy should follow standard colorectal cancer screening recommendations, which now generally start at age 45 for average-risk adults, or be prompted by specific alarm features. Unnecessary investigation is associated with increased healthcare costs and patient anxiety without benefit. Tests like fecal calprotectin help reduce unnecessary colonoscopies while maintaining high negative predictive value.",
    "calprotectin": "Fecal calprotectin is a stool test that distinguishes functional gut conditions like IBS from inflammatory conditions like IBD. Elevated values, often above roughly 50 to 100 micrograms per gram, increase concern for inflammation, though thresholds vary by setting and lab. Normal calprotectin is reassuring and helps reduce unnecessary colonoscopies while maintaining high negative predictive value for IBD.",
    "red flag": "Red flag features in IBS include unexplained rectal bleeding, unintentional weight loss of more than 5 percent of body weight over 6 months, iron deficiency anaemia, elevated fecal calprotectin, a first-degree relative with colorectal cancer, inflammatory bowel disease, or celiac disease, new onset at older age, or a substantial change from your established pattern. Individual alarm features have limited predictive value on their own, but clusters markedly increase the likelihood of organic disease. If you have any, bring them to your clinician.",
    "hormone": "Hormonal fluctuations affect a significant proportion of people with IBS, particularly those who menstruate. Many report symptom flares around menses and the late luteal phase. Estrogen and progesterone fluctuations modulate gastrointestinal motility, visceral sensitivity, and autonomic tone. Cycle-aware management often helps. Perimenopause and menopause bring different hormonal patterns that can shift IBS symptom profiles as well.",
    "menstrual": "Symptoms often fluctuate with the menstrual cycle in people with IBS. Many report flares in the late luteal phase and around menses, when estrogen drops and progesterone is falling. These hormones directly modulate gut motility and visceral sensitivity. Tracking symptoms alongside cycle phase for 2 to 3 months usually reveals a pattern, which then lets you plan around the more sensitive phases.",
    "dismissed": "Feeling dismissed is unfortunately common in IBS. Part of the reason is that IBS does not show up on standard structural tests, and some clinicians historically read 'normal tests' as 'no real problem.' Current evidence and guidelines disagree, IBS is a positive diagnosis with documented biological changes in visceral sensitivity, mast cell activity, HPA axis function, and microbiome composition. If you feel dismissed, asking about 'Disorder of Gut-Brain Interaction,' 'Rome IV criteria,' and 'brain-gut behavioural therapies' often shifts the conversation.",
    "real": "IBS is absolutely real. It is a recognised medical condition classified as a Disorder of Gut-Brain Interaction. The biological changes include visceral hypersensitivity, mast cell activity near gut nerves, HPA axis dysregulation, and shifts in the microbiome. Normal tests do not mean nothing is wrong, they mean there is no structural damage. The problem is in how gut and brain communicate, which is measurable and treatable.",
    "medication": "Medication in IBS is most effective when it is part of a broader management plan, not a replacement for diet, nervous system regulation, and evidence-based psychological approaches. Low-dose tricyclic antidepressants like amitriptyline have good evidence for pain-predominant IBS at doses far lower than those used for depression, acting as gut-brain neuromodulators. SNRIs may be considered when mood and pain co-exist. 5-HT3 antagonists can help IBS-D. Always work with your clinician and start, stop, or change medication only with a clinical assessment.",
    "medication": "Medication in IBS is most effective when it is part of a broader management plan. Low-dose tricyclic antidepressants like amitriptyline have good evidence for pain-predominant IBS at doses far lower than those used for depression, acting as gut-brain neuromodulators. SNRIs may be considered when mood and pain co-exist. 5-HT3 antagonists can help IBS-D. Work with your clinician and do not start, stop, or change medication without a clinical assessment.",
    "gut-brain": "The gut-brain axis is the two-way communication network linking your gut and your brain, primarily through the vagus nerve, the enteric nervous system, the HPA axis, immune signalling, and the microbiome. In IBS, this axis is dysregulated at multiple levels at once. Peripheral nerves become hypersensitive, central processing amplifies gut signals, autonomic balance shifts toward sympathetic dominance, and immune activity rises in the gut wall. Effective treatment addresses multiple levels, not just one.",
    "hormonal birth control": "Hormonal birth control can change IBS symptoms in ways that vary person to person. Most combined pills (oestrogen plus progestin) dampen the natural estrogen and progesterone swings across the cycle, which can flatten the menstrual-phase IBS fluctuations many people experience. Some people find their gut feels more stable. Progestin-only options, because progestin tends to slow gut motility, can increase constipation in some people with IBS-C. Research here is mixed and individual, so there is no one-size-fits-all answer. If you are considering starting, stopping, or switching hormonal birth control, your cycle diary plus an honest conversation with your GP or gynaecologist is the best way to assess which option matches your subtype.",
    "oral contraceptive": "Oral contraceptives change your hormone levels across the cycle, which directly affects the gut through estrogen and progesterone receptors in the gut wall. Combined pills tend to smooth out symptom flares tied to the luteal phase and menses in many people with IBS, but progestin-only formulations can slow motility and worsen constipation. Effects are individual, and cycle-tracking before and during the first few months on a new contraceptive is the most useful way to tell how your specific IBS pattern responds.",
    "the pill": "The pill (combined oral contraceptive) tends to reduce the IBS symptom swings that are tied to the menstrual cycle, because it smooths out the natural estrogen and progesterone changes that modulate gut motility and visceral sensitivity. The trade-off is that some people get more bloating or mood effects. Progestin-only formulations can worsen constipation. Tracking symptoms for a cycle or two before and after any change is the most reliable way to see your own pattern.",
    "birth control": "Birth control choices can affect IBS symptoms because estrogen and progesterone directly modulate gut motility and how strongly you feel gut sensations. Combined hormonal contraception (the pill, the patch, the ring) often smooths out menstrual-phase IBS flares by flattening cycle hormones. Progestin-only options can slow gut motility, which may worsen IBS-C. Non-hormonal options (copper IUD) avoid these effects but do not smooth cycle-related fluctuations. Cycle and symptom tracking before and during any change is the clearest way to tell what suits your pattern.",
    "age": "IBS shows up across the lifespan but looks different at different ages. In children and adolescents, IBS is often closely linked to anxiety and stress at school, and parental anxiety around feeding can reinforce the cycle. In adults, the classic pattern appears, with triggers tied to work stress, diet, and sleep. After about age 50, new-onset symptoms need closer screening because other conditions become more likely, which is why guidelines recommend lower thresholds for investigation at that age. Older adults with long-standing IBS tend to have more stable but sometimes shifted symptom patterns. The core gut-brain mechanisms do not change with age, but the context around them does.",
    "pediatric": "IBS in children is real, under-recognised, and often mislabelled as stomach aches or fussy eating. The biology is the same as in adults: a disorder of gut-brain interaction with visceral hypersensitivity and autonomic dysregulation. Triggers often cluster around school stress, social anxiety, and family meal dynamics. Brain-gut behavioural therapies, including gut-directed hypnotherapy, have particularly strong evidence in children and teens, with durable effects at 5 to 6-year follow-up in some studies. Home-delivered digital formats have been shown to be non-inferior to in-clinic sessions in paediatric trials.",
    "teenager": "Teen IBS is common and often overlaps with anxiety, perfectionism, and disrupted sleep. The biology is the same adult gut-brain pattern, but the context (school pressure, social stress, hormonal puberty changes) hits harder because coping systems are still developing. Gut-directed hypnotherapy has strong evidence in adolescents, and brain-gut behavioural therapies show good effects when adapted for teens. Pattern-tracking across the school term is often more useful than short diaries because stress layers accumulate.",
    "adolescent": "Adolescent IBS often presents alongside anxiety, perfectionism, social-evaluation concern, and irregular sleep. Puberty-related hormonal changes add a layer. The core gut-brain mechanisms are identical to adults, but cognitive-behavioural and mindfulness approaches usually need developmentally appropriate adaptation. Gut-directed hypnotherapy has strong evidence in this age group, including digitally delivered formats. Parent and school involvement in pacing and stress management often matter more than in adult care.",
    "children": "IBS in children is biologically the same condition as in adults, with the same gut-brain axis mechanisms. It is often missed or dismissed as nerves about school when the underlying pattern is true gut-brain dysregulation. Brain-gut behavioural therapies and gut-directed hypnotherapy have particularly strong evidence in paediatric IBS, with benefits persisting for years. Family-level approaches (food framing, stress modelling, sleep consistency) often help because the child nervous system is still learning patterns.",
    "older adult": "In older adults, long-standing IBS is usually a stable pattern shaped by years of gut-brain dysregulation. New-onset symptoms after age 50 need extra care because other conditions (including IBD, coeliac disease, and malignancy) become more likely with age. This is why guidelines recommend a lower threshold for investigation at this stage. Standard tools like breathing, pacing, and sleep work the same way mechanistically, but autonomic flexibility tends to decline naturally with age, so consistency matters more than intensity.",
    "gender": "IBS is more common in women than men, at roughly a 2:1 ratio in most studies. IBS-C is especially more common in women, while IBS-D is relatively more common in men. Shared biology includes serotonin signalling and HPA axis dysregulation, but estrogen and progesterone modulate gut motility and visceral sensitivity, which is one reason why menstrual-phase flares are common in people who menstruate. Men with IBS tend to be under-diagnosed, partly because of gender assumptions in research and clinic. Core management is the same across genders, but hormonal triggers matter for cycling individuals.",
    "sex differences": "Sex differences in IBS are real and biological, not just statistical. Women have roughly twice the prevalence of IBS as men, and IBS-C is more common in women while IBS-D is more common in men. The driver includes estrogen and progesterone, which directly modulate gastrointestinal motility and visceral sensitivity. These hormones also shape HPA axis responsiveness, which is why cycle-phase flares cluster around menses for many people who menstruate. Men IBS is historically under-studied and under-diagnosed.",
    "men": "Men with IBS are under-recognised in both research and care, partly because IBS is stereotyped as a women condition. In men, IBS-D is relatively more common than IBS-C. The gut-brain biology is identical, but men tend to present to care later and report fewer stress-related interpretations of symptoms. This does not mean the mechanisms are different, only that recognition and self-advocacy patterns differ. All core tools (breathing, pacing, brain-gut therapies, dietary management) work the same across genders.",
    "women": "Women are diagnosed with IBS roughly twice as often as men. IBS-C is more common in women; IBS-D is less so. Ovarian hormones directly modulate gut motility, visceral sensitivity, and autonomic function, which means symptoms often cluster around the luteal phase and menses. Pregnancy, perimenopause, and hormonal contraception can all shift the symptom pattern. Cycle-aware tracking and management frequently helps more than generic approaches in women who still menstruate.",
    "pregnancy": "IBS in pregnancy is under-studied but important. Many people report symptom changes during pregnancy, sometimes improvement (often second trimester) and sometimes worsening, particularly constipation driven by rising progesterone and physical pressure from the growing uterus. Safety of standard IBS treatments varies: dietary approaches and breathing and brain-gut therapies are generally safe, while many IBS medications need reassessment in pregnancy. This is a situation where working closely with your GP and obstetrician matters, and it is not something to self-manage from online information alone.",
    "perimenopause": "Perimenopause is the transitional years before menopause, often spanning the early forties to early fifties, when ovarian hormones fluctuate widely before declining. For many people with IBS, this phase unsettles previously stable patterns. Falling estrogen is associated with heightened visceral sensitivity. Progesterone fluctuations influence motility. Sleep disturbance during perimenopause further lowers vagal tone, which amplifies gut symptoms. Cycle-aware or perimenopause-aware management is often needed, and what worked pre-perimenopause may no longer be enough.",
    "menopause": "Menopause, typically around age 51, brings a more stable low-estrogen state after the fluctuations of perimenopause. IBS symptoms after menopause often stabilise, though the baseline may be different from before. Lower estrogen generally means higher gut sensitivity in some people, and slower motility. Sleep quality often changes, which can cascade to gut function. Brain-gut tools work mechanistically the same way, but autonomic flexibility tends to decline with age, so consistency of practice matters more.",
    "luteal phase": "The luteal phase is the second half of the menstrual cycle, roughly days 14 to 28. During this phase, progesterone rises (which tends to slow gut motility) and estrogen falls in the days before menses (which increases visceral sensitivity). For many people with IBS, this is when symptoms cluster. Tracking symptoms alongside cycle phase for two or three months usually reveals a clear personal pattern, which then lets you plan extra self-regulation (sleep, breathing, pacing) during this window.",
    "menses": "Menses, the days of actual bleeding in the menstrual cycle, is a common time for IBS flares. Hormones at this point are low and inflammatory mediators called prostaglandins are released, which affect gut motility and sensitivity. Many people experience increased urgency, pain, or looser stools in the day or two before and during menses. This pattern is so common that it is worth planning around rather than trying to override."
  };

  // Sort by keyword length descending so specific phrases win over generic ones
  const sortedKeys = Object.keys(topicResponses).sort((a, b) => b.length - a.length);
  for (const keyword of sortedKeys) {
    if (msg.includes(keyword)) {
      return {
        text: topicResponses[keyword],
        redirect: null
      };
    }
  }

  // ── Layer 3: Tool redirects ────────────────────────────────────────────
  const toolSuggestions = {
    breathing: {
      label: "Try the Breathing Pacer",
      action: "pacer"
    },
    breathe: {
      label: "Try the Breathing Pacer",
      action: "pacer"
    },
    flare: {
      label: "Open the Flare Reset Tool",
      action: "tool_flare"
    },
    sleep: {
      label: "Open the Sleep Planner",
      action: "sleep"
    },
    routine: {
      label: "Build Your Daily Routine",
      action: "routine"
    },
    food: {
      label: "Try the Food Anxiety Reset",
      action: "tool_food"
    },
    meal: {
      label: "Try the Pre-Meal Reset",
      action: "tool_meal"
    },
    panic: {
      label: "Open the Flare Reset",
      action: "tool_flare"
    },
    calm: {
      label: "Try the Breathing Pacer",
      action: "pacer"
    },
    body: {
      label: "Try the Body Scan",
      action: "tool_body"
    }
  };
  let redirect = null;
  for (const [keyword, suggestion] of Object.entries(toolSuggestions)) {
    if (msg.includes(keyword)) {
      redirect = suggestion;
      break;
    }
  }

  // ── Layer 4: Session-specific fallback responses ───────────────────────
  // Keyed by exact sessionTitle. When no keyword matched, these at least anchor
  // the reply in the specific session's content rather than saying nothing.
  const sessionSpecificFallbacks = {
    "You Are Not Making This Up": "This session is about IBS being a real, positive diagnosis, classified as a Disorder of Gut-Brain Interaction, with documented biological changes including visceral hypersensitivity and shifts in immune and microbiome activity. If you have a more specific question, like why tests come back normal, or what the Rome IV criteria actually test for, ask and I will walk through it.",
    "What the Gut-Brain Axis Actually Is": "This session covers the enteric nervous system, the vagus nerve as the main gut-brain highway with about 80 percent of fibers carrying signals upward, and how IBS dysregulates this two-way system at peripheral, central, and autonomic levels. If you want more detail on any piece, the vagus nerve specifically, or the role of the HPA axis, or how the nervous system amplifies signals, ask.",
    "What Is Actually Happening During a Flare": "This session walks through the flare cascade step by step, trigger, HPA axis, autonomic shift, gut permeability, mast cell activation, nerve sensitisation, brain amplification, and anxiety loop. If you want more on a specific step, like what mast cells are doing, or which step is easiest to interrupt, ask.",
    "Serotonin, The Gut's Most Important Messenger": "This session covers how roughly 90 to 95 percent of body serotonin is made in the gut by enterochromaffin cells, how it regulates motility and pain signalling, how the gut and brain pools are separate because serotonin does not cross the blood-brain barrier, and how chronic stress, the kynurenine pathway, microbial imbalance, and early adversity all affect gut serotonin production.",
    "Your Nervous System and Your Gut": "This session covers the autonomic nervous system, the sympathetic and parasympathetic branches, why IBS is associated with reduced vagal tone and lower HRV, how sympathetic dominance affects motility, secretion, permeability, and pain thresholds, and how slow breathing and auricular vagus nerve stimulation have trial evidence for improving HRV and IBS symptoms.",
    "Why Some Days Are Fine and Some Days Are Not": "This session explains why the same food can be tolerated one day and not another, because gut response depends heavily on autonomic state. Vagal tone shapes motility, mast cell reactivity, visceral sensitivity, and central amplification. This is also why strict food elimination alone does not resolve the underlying dysregulation.",
    "What Actually Helps, The Evidence": "This session summarises the evidence, low-FODMAP with reintroduction helps about 50 to 76 percent short term, brain-gut behavioural therapies like CBT and gut-directed hypnotherapy are supported by 2025 meta-analyses and guidelines, slow breathing at six cycles per minute improves HRV and symptoms particularly in IBS-C, and low-dose tricyclics are endorsed for pain-predominant IBS. Combination approaches tend to outperform any single intervention.",
    "Mapping Your Symptom History": "This session is about tracking your personal pattern, when symptoms started, what was happening around that time, and how they have changed. Onset often follows infection, major life events, or early-life adversity. Childhood trauma and family history increase risk. Pattern recognition supports a positive diagnosis with limited testing when alarm features are absent.",
    "IBS-C, IBS-D, IBS-M, What Your Subtype Tells You": "This session covers the four IBS subtypes, IBS-D, IBS-C, IBS-M, and IBS-U, how they are classified using the Bristol stool form scale, their different physiological profiles, and why treatment differs across subtypes. Subtype instability is common, most people change subtype at least once over a year.",
    "Your Trigger Landscape": "This session covers the three categories of IBS triggers, dietary, stress-related, and hormonal. Most people have triggers in all three. Dietary triggers are threshold-dependent rather than absolute. Stress triggers include anticipatory anxiety, chronic pressure, and sleep loss. Hormonal triggers are driven by cycle-phase changes in estrogen and progesterone.",
    "The Pre-Event Flare, When Your Gut Knows Before You Do": "This session is about symptoms that begin before a stressful event, sometimes days before. The mechanism is anticipatory stress engaging CRF and HPA pathways, shifting autonomic balance, and signalling the enteric nervous system to mobilise, all before the external event occurs. Recognising this pattern reduces unnecessary food restriction.",
    "When Did Your IBS Start? (And Why That Matters)": "This session is about origin story as mechanism. Post-infectious IBS accounts for roughly 5 to 32 percent after gastroenteritis, with different mechanisms than stress-linked onset. Early-life adversity can program gut-brain vulnerability that shows up decades later. Origin information points toward the intervention that fits your pattern.",
    "Red Flags: When to Check Further": "This session covers alarm features worth discussing with your clinician, including unexplained rectal bleeding, unintentional weight loss, iron deficiency anaemia, elevated fecal calprotectin, family history of colorectal cancer, IBD, or celiac disease, new onset at older age, or a substantial change in pattern. Individual features have low predictive value, but clusters matter. Routine colonoscopy under 45 is not recommended without alarm features."
  };
  const specific = sessionSpecificFallbacks[sessionTitle];
  if (specific) {
    return {
      text: specific,
      redirect: redirect ? {
        label: redirect.label,
        action: redirect.action
      } : null
    };
  }

  // ── Layer 5: Last-resort generic ───────────────────────────────────────
  // Main chat (no session context) gets a friendlier nudge to rephrase with
  // IBS-specific terms rather than a template echo.
  if (sessionTitle === "Ask Gut IQ") {
    return {
      text: `I did not catch a specific IBS topic in that question. Try rephrasing with something more specific, like "how does vagal tone affect IBS," "what does FODMAP reintroduction look like," "why do I get pre-event flares," or the name of a symptom or subtype. I will walk through it in plain language.`,
      redirect: redirect ? {
        label: redirect.label,
        action: redirect.action
      } : null
    };
  }

  // Session-anchored fallback for reflection chats.
  const ctx = (sessionContext || "").replace(/"/g, "'").trim();
  const generic = ctx ? `The session "${sessionTitle}" covers ${ctx.charAt(0).toLowerCase() + ctx.slice(1)} If you want more detail on any specific piece, ask and I will walk through it.` : `The session "${sessionTitle}" covers the topic you just read. Ask me a more specific question and I will walk through the evidence in plain language.`;
  return {
    text: generic,
    redirect: redirect ? {
      label: redirect.label,
      action: redirect.action
    } : null
  };
}

// ─── SESSION-SPECIFIC PRESET QUESTIONS ───────────────────────────────────────
function getPresetQuestions(sessionTitle) {
  const presets = {
    // Understand Your IBS sessions
    "You Are Not Making This Up": ["Why do doctors dismiss IBS symptoms?", "What makes IBS a real diagnosis?"],
    "What the Gut-Brain Axis Actually Is": ["How does the vagus nerve work?", "What percentage of signals go from gut to brain?"],
    "What Is Actually Happening During a Flare": ["Can I stop a flare once it starts?", "Which step in the cascade should I target first?"],
    "Serotonin, The Gut's Most Important Messenger": ["Why is my serotonin made in my gut?", "How does stress affect serotonin?"],
    "Your Nervous System and Your Gut": ["What is vagal tone?", "How do I increase parasympathetic activity?"],
    // Calm the Loop sessions  
    "The Science of Slow Breathing": ["Why 6 cycles per minute specifically?", "How long before I see results?"],
    "Your Vagus Nerve, and How to Use It": ["What's the fastest way to activate my vagus nerve?", "Does cold exposure really work?"],
    "Pacing, Managing Your Energy Without Boom and Bust": ["How do I know my sustainable baseline?", "What if pacing feels like giving up?"],
    "Sleep as a Gut-Brain Intervention": ["Why does poor sleep worsen gut symptoms?", "What's the migrating motor complex?"],
    // Rebuild Trust sessions
    "From Hypervigilance to Curious Noticing": ["How do I notice without monitoring?", "What if ignoring symptoms feels dangerous?"],
    "Food Is Not the Whole Story": ["Should I still do low-FODMAP?", "How do I separate food triggers from anxiety?"],
    // Special Patterns sessions
    "The Pelvic Floor and IBS Connection": ["Do I need pelvic floor testing?", "What is dyssynergic defecation?"],
    "Early Adversity and the Gut": ["How does childhood stress affect the gut?", "What are ACEs?"],
    "Post-Infectious IBS Recovery": ["How long does post-infectious IBS last?", "Why didn't my gut reset after the infection?"],
    "Hormones and the Gut-Brain Loop": ["Why does perimenopause worsen IBS?", "How does estrogen affect gut sensitivity?"],
    // Listen and Practice sessions
    "The Gut-Brain Axis: A Two-Way Communication Highway": ["What is the enteric nervous system?", "How do gut bacteria affect neurotransmitters?"],
    "The Flare Cascade: What Is Actually Happening": ["Which step can I interrupt most easily?", "What are mast cells doing?"],
    "Serotonin and the Gut": ["Why is my IBS subtype relevant to serotonin?", "Can diet affect gut serotonin?"],
    "Vagal Tone and IBS": ["How do I know if my vagal tone is low?", "What's the fastest vagal intervention?"],
    "Neuroplasticity and IBS": ["Can brain changes from IBS reverse?", "How does CBT change the brain?"]
  };

  // Return session-specific questions or generic fallback
  return presets[sessionTitle] || ["How does this connect to the gut-brain axis?", "What should I try first?"];
}

// ─── AI REFLECTION CHAT COMPONENT (Smart Local) ──────────────────────────────
function ReflectionChat({
  sessionTitle,
  reflectionPrompt,
  sessionContext,
  sessionBody,
  onNavigate,
  externalTrigger
}) {
  const [msgs, setMsgs] = useLocalState("gom_reflect_" + sessionTitle, [], v => Array.isArray(v));
  const [inp, setInp] = useState("");
  const [load, setLoad] = useState(false);
  const [open, setOpen] = useState(false);
  const bot = useRef(null);
  useEffect(() => {
    bot.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [msgs]);

  // When parent triggers an external query (e.g., via the "Want this in plainer
  // English?" button), open the chat and auto-submit that query.
  useEffect(() => {
    if (externalTrigger && externalTrigger.query) {
      setOpen(true);
      setTimeout(() => send(externalTrigger.query), 120);
    }
    // eslint-disable-next-line
  }, [externalTrigger?.n]);
  const suggestions = ["I want to reflect on this...", "I have a question about this session", "This relates to my experience because...", "I struggle with this because..."];
  function send(text) {
    const msg = text || inp;
    if (!msg.trim() || load) return;
    const um = {
      r: "u",
      t: msg
    };
    setMsgs(m => [...m, um]);
    setInp("");
    setLoad(true);
    gutIQReply({
      mode: "reflect",
      messages: toHistory([...msgs, um]),
      session: {
        title: sessionTitle,
        context: sessionContext,
        prompt: reflectionPrompt,
        body: (sessionBody || "").slice(0, 6000)
      }
    }, () => getSmartResponse(msg, sessionTitle, sessionContext, reflectionPrompt)).then(res => {
      setMsgs(m => [...m, ...(res.notice ? [{
        r: "n",
        t: res.notice
      }] : []), {
        r: "a",
        t: res.text,
        redirect: res.redirect
      }].slice(-30));
      setLoad(false);
    });
  }
  function handleRedirect(action) {
    if (onNavigate) onNavigate(action);
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      borderRadius: 14,
      overflow: "hidden",
      border: "1px solid " + C.creamDark
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(o => !o),
    style: {
      width: "100%",
      background: "linear-gradient(135deg," + C.sageLight + "," + C.cream + ")",
      border: "none",
      padding: "13px 16px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      cursor: "pointer",
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: "50%",
      background: C.forest,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "currentColor",
    style: {
      width: 16,
      height: 16,
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 4h16a2 2 0 012 2v9a2 2 0 01-2 2H9l-5 4V6a2 2 0 012-2z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "10.5",
    r: "1.1",
    fill: "#fff"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12.5",
    cy: "10.5",
    r: "1.1",
    fill: "#fff"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "16",
    cy: "10.5",
    r: "1.1",
    fill: "#fff"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      fontWeight: "bold",
      color: C.forest
    }
  }, "Reflect with Gut IQ"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: C.charcoal,
      opacity: .6
    }
  }, "Share your thoughts or ask a question")), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      color: C.forest,
      fontSize: 18,
      fontWeight: "bold"
    }
  }, open ? "−" : "+")), open && /*#__PURE__*/React.createElement("div", {
    className: "gom-drop",
    style: {
      background: C.white,
      padding: "12px 14px"
    }
  }, msgs.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "8px 11px",
      background: C.sageLight,
      borderRadius: 8,
      marginBottom: 10,
      fontSize: 10.5,
      color: C.forest,
      lineHeight: 1.5
    }
  }, "This reflection chat answers questions about the science in this session. For personal questions about your own situation, the main AI chat on the Tools tab is a better fit."), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 12px",
      background: C.cream,
      borderRadius: 10,
      borderLeft: "3px solid " + C.sage,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      fontStyle: "italic",
      color: C.charcoal,
      lineHeight: 1.6
    }
  }, reflectionPrompt)), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10,
      color: C.charcoal,
      opacity: .45,
      marginBottom: 7,
      fontWeight: "bold",
      letterSpacing: 1
    }
  }, "STARTERS"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, suggestions.map((s, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => setInp(s),
    style: {
      background: C.sageLight,
      border: "none",
      borderRadius: 20,
      padding: "7px 13px",
      fontSize: 12,
      color: C.forest,
      cursor: "pointer",
      textAlign: "left",
      fontWeight: "500"
    }
  }, s))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      padding: "10px 12px",
      background: C.sageLight,
      borderRadius: 10
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      fontWeight: "bold",
      color: C.forest,
      marginBottom: 6
    }
  }, "Have a question about this session?"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10.5,
      color: C.charcoal,
      opacity: .65,
      marginBottom: 8,
      lineHeight: 1.4
    }
  }, "Tap one or type your own:"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 5
    }
  }, getPresetQuestions(sessionTitle).map((q, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => send(q),
    style: {
      background: C.white,
      border: `1px solid ${C.sage}`,
      borderRadius: 18,
      padding: "6px 11px",
      fontSize: 11.5,
      color: C.charcoal,
      cursor: "pointer",
      textAlign: "left",
      fontWeight: "500",
      lineHeight: 1.4
    }
  }, q))))), /*#__PURE__*/React.createElement("div", {
    style: {
      maxHeight: 240,
      overflowY: "auto",
      marginBottom: 10
    }
  }, msgs.map((m, i) => m.r === "n" ? /*#__PURE__*/React.createElement(NoticeBubble, {
    key: i,
    text: m.t
  }) : /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "gom-bubble",
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: m.r === "u" ? "flex-end" : "flex-start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "85%",
      padding: "10px 13px",
      borderRadius: m.r === "u" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
      background: m.r === "u" ? C.forest : C.sageLight,
      color: m.r === "u" ? C.white : C.charcoal,
      fontSize: 13,
      lineHeight: 1.65
    }
  }, m.t)), m.redirect && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "flex-start",
      marginTop: 7
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => handleRedirect(m.redirect.action),
    style: {
      background: C.forest,
      color: C.white,
      border: "none",
      borderRadius: 20,
      padding: "7px 14px",
      fontSize: 12,
      fontWeight: "bold",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    style: {
      width: 13,
      height: 13
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 12h14M12 5l7 7-7 7"
  })), m.redirect.label)))), load && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      background: C.sageLight,
      borderRadius: "16px 16px 16px 4px",
      width: "fit-content"
    }
  }, [0, 1, 2].map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      width: 7,
      height: 7,
      borderRadius: "50%",
      background: C.forest,
      animation: "pulse 1s " + i * .2 + "s infinite"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    ref: bot
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: inp,
    onChange: e => setInp(e.target.value),
    onKeyDown: e => e.key === "Enter" && send(),
    placeholder: "Share your reflection...",
    style: {
      flex: 1,
      background: C.cream,
      border: "1px solid " + C.creamDark,
      borderRadius: 20,
      padding: "9px 14px",
      fontSize: 13,
      color: C.charcoal,
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => send(),
    disabled: load || !inp.trim(),
    style: {
      background: C.forest,
      color: C.white,
      border: "none",
      borderRadius: 20,
      width: 38,
      height: 38,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      opacity: inp.trim() ? 1 : .4,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 16,
      height: 16
    }
  }, /*#__PURE__*/React.createElement("line", {
    x1: "22",
    y1: "2",
    x2: "11",
    y2: "13"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "22 2 15 22 11 13 2 9 22 2"
  }))))));
}

// ─── BREATHING PACER ──────────────────────────────────────────────────────────
function Pacer() {
  const [ph, setPh] = useState("ready");
  const [sec, setSec] = useState(4);
  const [cyc, setCyc] = useState(0);
  const ref = useRef(null);
  const PHS = [{
    n: "in",
    d: 4,
    l: "Breathe In",
    c: C.teal
  }, {
    n: "hold",
    d: 2,
    l: "Hold",
    c: C.sage
  }, {
    n: "out",
    d: 6,
    l: "Breathe Out",
    c: C.forest
  }];
  const TOTAL = 4;
  function start() {
    setPh("in");
    setSec(4);
    setCyc(1);
  }
  function stop() {
    clearInterval(ref.current);
    setPh("ready");
    setSec(4);
    setCyc(0);
  }
  useEffect(() => {
    if (ph === "ready" || ph === "done") return;
    const pi = PHS.findIndex(p => p.n === ph);
    setSec(PHS[pi].d);
    const iv = setInterval(() => {
      setSec(s => {
        if (s <= 1) {
          clearInterval(iv);
          const ni = (pi + 1) % 3;
          const nc = ni === 0 ? cyc + 1 : cyc;
          if (nc > TOTAL && ni === 0) {
            setPh("done");
            return 0;
          }
          setPh(PHS[ni].n);
          setCyc(nc);
          return PHS[ni].d;
        }
        return s - 1;
      });
    }, 1000);
    ref.current = iv;
    return () => clearInterval(iv);
  }, [ph, cyc]);
  const po = PHS.find(p => p.n === ph) || PHS[0];
  const prog = ph === "ready" || ph === "done" ? 0 : 1 - sec / po.d;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "24px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: 170,
      height: 170,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 170 170",
    style: {
      position: "absolute",
      inset: 0,
      width: 170,
      height: 170
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "85",
    cy: "85",
    r: "75",
    fill: "none",
    stroke: C.creamDark,
    strokeWidth: "6"
  }), ph !== "ready" && ph !== "done" && /*#__PURE__*/React.createElement("circle", {
    cx: "85",
    cy: "85",
    r: "75",
    fill: "none",
    stroke: po.c,
    strokeWidth: "6",
    strokeDasharray: `${471 * prog} 471`,
    strokeLinecap: "round",
    style: {
      transform: "rotate(-90deg)",
      transformOrigin: "center",
      transition: "stroke-dasharray .3s"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 92,
      height: 92,
      borderRadius: "50%",
      background: `radial-gradient(circle,${po?.c || C.teal}44,transparent)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      animation: ph !== "ready" && ph !== "done" ? `${ph === "in" ? "bIn" : "bOut"} ${po.d}s ease-in-out forwards` : "none"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: po?.c || C.teal,
      display: "inline-flex",
      transform: "scale(1.4)"
    }
  }, ph === "done" ? Ico.chk : ph === "ready" ? Ico.leaf : Ico.wind))), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 17,
      fontFamily: "Georgia,serif",
      fontStyle: "italic",
      color: po.c || C.forest,
      marginTop: 14,
      minHeight: 26
    }
  }, ph === "ready" ? "Ready when you are" : ph === "done" ? "Well done" : po.l), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: C.charcoal,
      opacity: .5,
      marginTop: 4
    }
  }, ph === "ready" || ph === "done" ? `${TOTAL} cycles · ~48 seconds` : `${sec}s · Cycle ${cyc}/${TOTAL}`), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18
    }
  }, ph === "ready" || ph === "done" ? /*#__PURE__*/React.createElement("button", {
    onClick: start,
    style: {
      background: C.forest,
      color: C.white,
      border: "none",
      borderRadius: 30,
      padding: "12px 32px",
      fontSize: 14,
      cursor: "pointer"
    }
  }, ph === "done" ? "Go again" : "Begin") : /*#__PURE__*/React.createElement("button", {
    onClick: stop,
    style: {
      background: C.cream,
      color: C.charcoal,
      border: `1px solid ${C.creamDark}`,
      borderRadius: 30,
      padding: "11px 28px",
      fontSize: 14,
      cursor: "pointer"
    }
  }, "Stop")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10,
      color: C.charcoal,
      opacity: .4,
      marginTop: 14,
      textAlign: "center",
      maxWidth: 220,
      lineHeight: 1.5
    }
  }, "6 cycles/minute · Liu et al., Front Neurosci, 2022"));
}

// ─── SLEEP PLANNER ────────────────────────────────────────────────────────────
function SleepPlanner({
  onBack
}) {
  const [bedtime, setBedtime] = useLocalState("gom_sleep_bedtime", "22:30", v => typeof v === "string");
  const [wakeTime, setWakeTime] = useLocalState("gom_sleep_waketime", "07:00", v => typeof v === "string");
  const [windDown, setWindDown] = useLocalState("gom_sleep_checklist", [{
    id: 1,
    label: "No screens (60 to 90 min before bed)",
    done: false
  }, {
    id: 2,
    label: "Dim the lights",
    done: false
  }, {
    id: 3,
    label: "Set room to 18 to 20°C (64 to 68°F)",
    done: false
  }, {
    id: 4,
    label: "No large meal within 3 hours of sleep",
    done: false
  }, {
    id: 5,
    label: "10 min breathing or relaxation practice",
    done: false
  }], v => Array.isArray(v) && v.length > 0);
  const [notes, setNotes] = useLocalState("gom_sleep_notes", "", v => typeof v === "string");
  const [saved, setSaved] = useState(false);
  function calcHours() {
    const [bh, bm] = bedtime.split(":").map(Number);
    const [wh, wm] = wakeTime.split(":").map(Number);
    let diff = wh * 60 + wm - (bh * 60 + bm);
    if (diff < 0) diff += 1440;
    return (diff / 60).toFixed(1);
  }
  const hours = calcHours();
  const quality = hours >= 7 && hours <= 9 ? {
    label: "Optimal",
    color: C.forest
  } : hours >= 6 ? {
    label: "Fair",
    color: C.clay
  } : {
    label: "Low",
    color: "#CC2200"
  };
  function toggle(id) {
    setWindDown(w => w.map(x => x.id === id ? {
      ...x,
      done: !x.done
    } : x));
  }
  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      paddingBottom: 40
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: `linear-gradient(160deg,#2C4B7C,#1a2f52)`,
      padding: "48px 18px 20px",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": "Back",
    onClick: onBack,
    style: {
      position: "absolute",
      top: 12,
      left: 12,
      background: "rgba(255,255,255,.18)",
      border: "none",
      borderRadius: "50%",
      width: 34,
      height: 34,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      color: C.white
    }
  }, Ico.back), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10,
      letterSpacing: 3,
      color: "rgba(255,255,255,.5)",
      fontWeight: "bold",
      marginBottom: 4
    }
  }, "GUT OVER MATTER"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 22,
      fontFamily: "Georgia,serif",
      color: C.white,
      lineHeight: 1.3
    }
  }, "Sleep Planner"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: "rgba(255,255,255,.6)",
      marginTop: 4
    }
  }, "Sleep is a gut-brain intervention. Plan it with intention.")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px 16px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.white,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      boxShadow: "0 2px 12px rgba(0,0,0,.06)"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      fontWeight: "bold",
      color: C.charcoal,
      opacity: .4,
      letterSpacing: 1,
      marginBottom: 12
    }
  }, "SLEEP WINDOW"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: C.charcoal,
      opacity: .5,
      marginBottom: 6,
      display: "flex",
      alignItems: "center",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#2C4B7C"
    }
  }, Ico.moon), " Bedtime"), /*#__PURE__*/React.createElement("input", {
    type: "time",
    value: bedtime,
    onChange: e => setBedtime(e.target.value),
    style: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: 10,
      border: `1px solid ${C.creamDark}`,
      fontSize: 16,
      color: C.charcoal,
      background: C.cream,
      outline: "none"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: C.charcoal,
      opacity: .5,
      marginBottom: 6,
      display: "flex",
      alignItems: "center",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.clay
    }
  }, Ico.sun), " Wake Time"), /*#__PURE__*/React.createElement("input", {
    type: "time",
    value: wakeTime,
    onChange: e => setWakeTime(e.target.value),
    style: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: 10,
      border: `1px solid ${C.creamDark}`,
      fontSize: 16,
      color: C.charcoal,
      background: C.cream,
      outline: "none"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.cream,
      borderRadius: 12,
      padding: "12px 14px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: C.charcoal,
      opacity: .5
    }
  }, "Planned sleep"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 22,
      fontWeight: "bold",
      color: C.charcoal
    }
  }, hours, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: "normal"
    }
  }, "hours"))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: quality.color,
      borderRadius: 20,
      padding: "6px 14px"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      fontWeight: "bold",
      color: C.white
    }
  }, quality.label))), hours < 7 && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: C.clay,
      marginTop: 8,
      lineHeight: 1.5,
      display: "flex",
      alignItems: "flex-start",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.clay,
      flexShrink: 0,
      marginTop: 1
    }
  }, Ico.warning), /*#__PURE__*/React.createElement("span", null, "Research links less than 7 hours of sleep to increased gut sensitivity and reduced vagal tone the following day. Try adjusting your schedule.")), hours >= 7 && hours <= 9 && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: C.forest,
      marginTop: 8,
      lineHeight: 1.5,
      display: "flex",
      alignItems: "flex-start",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.forest,
      flexShrink: 0,
      marginTop: 1
    }
  }, Ico.chk), /*#__PURE__*/React.createElement("span", null, "This sleep window supports gut-brain restoration. HRV (heart rate variability, your body's measure of nervous system calm) peaks during deep sleep at this duration."))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.white,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      boxShadow: "0 2px 12px rgba(0,0,0,.06)"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      fontWeight: "bold",
      color: C.charcoal,
      opacity: .4,
      letterSpacing: 1,
      marginBottom: 4
    }
  }, "WIND-DOWN CHECKLIST"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: C.charcoal,
      opacity: .55,
      marginBottom: 12,
      lineHeight: 1.5
    }
  }, "These steps shift your nervous system from sympathetic (alert) to parasympathetic (calm) before sleep."), windDown.map(item => /*#__PURE__*/React.createElement("button", {
    key: item.id,
    onClick: () => toggle(item.id),
    style: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 0",
      background: "none",
      border: "none",
      cursor: "pointer",
      borderBottom: item.id < windDown.length ? `1px solid ${C.creamDark}` : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 22,
      height: 22,
      borderRadius: "50%",
      border: `2px solid ${item.done ? C.forest : C.creamDark}`,
      background: item.done ? C.forest : "transparent",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      transition: "all .2s"
    }
  }, item.done && /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: C.white,
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 12,
      height: 12
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6L9 17l-5-5"
  }))), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: item.done ? C.forest : C.charcoal,
      textDecoration: item.done ? "line-through" : "none",
      textAlign: "left",
      opacity: item.done ? .6 : 1
    }
  }, item.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      background: C.sageLight,
      borderRadius: 10,
      padding: "8px 12px"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: C.forest,
      display: "flex",
      alignItems: "center",
      gap: 5
    }
  }, windDown.filter(w => w.done).length, "/", windDown.length, " steps complete, ", windDown.filter(w => w.done).length === windDown.length ? /*#__PURE__*/React.createElement(React.Fragment, null, "excellent wind-down routine!", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#2C4B7C",
      display: "inline-flex"
    }
  }, Ico.moon)) : "keep going to prepare your nervous system for rest"))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.white,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      boxShadow: "0 2px 12px rgba(0,0,0,.06)"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      fontWeight: "bold",
      color: C.charcoal,
      opacity: .4,
      letterSpacing: 1,
      marginBottom: 10
    }
  }, "TONIGHT'S NOTES"), /*#__PURE__*/React.createElement("textarea", {
    value: notes,
    onChange: e => setNotes(e.target.value),
    placeholder: "How are you feeling tonight? Any gut symptoms to note? Any worries you want to acknowledge and set aside before sleep?",
    style: {
      width: "100%",
      minHeight: 80,
      padding: "10px 12px",
      borderRadius: 10,
      border: `1px solid ${C.creamDark}`,
      fontSize: 13,
      color: C.charcoal,
      background: C.cream,
      outline: "none",
      resize: "none",
      lineHeight: 1.6,
      fontFamily: "inherit"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      background: `linear-gradient(135deg,#2C4B7C,#1a3a5c)`,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      fontWeight: "bold",
      color: C.white,
      marginBottom: 6
    }
  }, "Why sleep matters for your gut"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: "rgba(255,255,255,.75)",
      lineHeight: 1.65
    }
  }, "During deep sleep, your gut undergoes its own overnight reset, called the ", /*#__PURE__*/React.createElement("em", null, "migrating motor complex"), " (think of it as a \"cleaning wave\" that sweeps through your intestines). Your nervous system shifts fully into parasympathetic mode, HRV peaks, and gut permeability (how \"leaky\" the gut wall is) reduces. Poor sleep does the opposite, it increases gut sensitivity the very next day.")), /*#__PURE__*/React.createElement("button", {
    onClick: save,
    style: {
      width: "100%",
      background: saved ? C.forest : C.sageLight,
      color: saved ? C.white : C.forest,
      border: "none",
      borderRadius: 28,
      padding: "14px",
      fontSize: 14,
      fontWeight: "bold",
      cursor: "pointer",
      transition: "all .3s",
      marginBottom: 8
    }
  }, saved ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    }
  }, Ico.chk, " Plan Saved") : "Save Tonight's Plan")));
}

// ─── ROUTINE BUILDER ──────────────────────────────────────────────────────────
function RoutineBuilder({
  onBack
}) {
  const defaultBlocks = [{
    id: "morning",
    time: "07:15",
    label: "Morning Breathing",
    desc: "3+ min slow breathing before getting up",
    icon: Ico.sunrise,
    color: C.teal,
    duration: 5,
    active: true
  }, {
    id: "premeal1",
    time: "08:00",
    label: "Pre-Meal Reset (Breakfast)",
    desc: "1 to 2 slow breaths before eating",
    icon: Ico.meal,
    color: C.forest,
    duration: 2,
    active: true
  }, {
    id: "midday",
    time: "12:30",
    label: "Midday Pause",
    desc: "5+ min deliberate rest, walk, breathing, or body scan",
    icon: Ico.sun,
    color: C.sage,
    duration: 10,
    active: false
  }, {
    id: "premeal2",
    time: "13:00",
    label: "Pre-Meal Reset (Lunch)",
    desc: "1 to 2 slow breaths before eating",
    icon: Ico.salad,
    color: C.forest,
    duration: 2,
    active: true
  }, {
    id: "premeal3",
    time: "18:30",
    label: "Pre-Meal Reset (Dinner)",
    desc: "1 to 2 slow breaths before eating",
    icon: Ico.meal,
    color: C.forest,
    duration: 2,
    active: false
  }, {
    id: "evening",
    time: "20:00",
    label: "Evening Wind-Down",
    desc: "5+ min breathing, body scan, or GDH practice",
    icon: Ico.moon,
    color: "#2C4B7C",
    duration: 10,
    active: true
  }, {
    id: "bedtime",
    time: "22:00",
    label: "Bedtime Breathing",
    desc: "Final 4-2-6 cycle before sleep",
    icon: Ico.sleep,
    color: "#1a3a5c",
    duration: 5,
    active: true
  }];
  const [savedRoutine, setSavedRoutine] = useLocalState("gom_routine", null, v => v === null || Array.isArray(v));
  const [blocks, setBlocks] = useState(() => !savedRoutine ? defaultBlocks : defaultBlocks.map(b => {
    const s = savedRoutine.find(x => x && x.id === b.id);
    return s ? {
      ...b,
      time: typeof s.time === "string" ? s.time : b.time,
      active: !!s.active
    } : b;
  }));
  useEffect(() => {
    setSavedRoutine(blocks.map(b => ({
      id: b.id,
      time: b.time,
      active: b.active
    })));
  }, [blocks]);
  const [saved, setSaved] = useState(false);
  const [recommendation, setRecommendation] = useState("");
  const [loadingRec, setLoadingRec] = useState(false);
  function toggle(id) {
    setBlocks(b => b.map(x => x.id === id ? {
      ...x,
      active: !x.active
    } : x));
  }
  function updateTime(id, time) {
    setBlocks(b => b.map(x => x.id === id ? {
      ...x,
      time
    } : x));
  }
  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }
  function getPersonalisedTip() {
    setLoadingRec(true);
    const activeOnes = blocks.filter(b => b.active).map(b => b.label);
    const tips = ["The most effective way to build a nervous system regulation habit is to attach it to something you already do. Your morning breathing practice will stick far better if it happens the moment you wake up, before you check your phone or get out of bed. Your routine already has a good morning anchor. Protect it.", "Research on HRV biofeedback shows that six cycles per minute is the optimal breathing rate for autonomic improvement in IBS. Your 4-2-6 breathing pattern hits this exactly. Even two to three minutes at this pace before a meal is enough to shift your gut's starting state for that meal.", "The gut does its own overnight maintenance during deep sleep, clearing the intestines and resetting motility patterns. When you protect your bedtime breathing practice, you are not just calming your nervous system before sleep. You are creating the conditions for your gut to reset properly overnight.", "Consistency matters far more than duration. Three minutes of slow breathing every day for a month produces more cumulative autonomic benefit than twenty minutes once a week. If your routine feels too long to maintain, cut the duration but keep every single anchor moment.", "Pre-meal breathing works through the cephalic phase of digestion, a documented physiological response in which the brain begins preparing the gut before the first bite. Even one slow exhale before sitting down at a meal is enough to begin this response. You do not need five minutes. You need one breath.", "The midday reset is one of the most valuable blocks in the routine because it interrupts the accumulation of sympathetic activation across the day. Research shows that stress accumulates non-linearly, and a brief intervention at mid-day reduces the afternoon-evening peak significantly more than an equivalent intervention at bedtime.", "Your evening wind-down block is doing important work beyond relaxation. The transition from sympathetic to parasympathetic dominance in the evening is when HRV peaks and when the gut begins its overnight maintenance cycle. Protecting this transition consistently is one of the highest-value things you can do for gut-brain regulation."];
    gutIQReply({
      mode: "tip",
      messages: [{
        r: "u",
        t: "My active routine blocks are: " + (activeOnes.join(", ") || "none yet") + ". Give me one practical tip to make this routine stick and support my gut-brain axis."
      }]
    }, () => ({
      text: tips[Math.floor(Math.random() * tips.length)],
      redirect: null
    })).then(res => {
      setRecommendation(res.text);
      setLoadingRec(false);
    });
  }
  const activeCount = blocks.filter(b => b.active).length;
  const totalMins = blocks.filter(b => b.active).reduce((acc, b) => acc + b.duration, 0);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      paddingBottom: 40
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: `linear-gradient(160deg,${C.teal},${C.forest})`,
      padding: "48px 18px 20px",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": "Back",
    onClick: onBack,
    style: {
      position: "absolute",
      top: 12,
      left: 12,
      background: "rgba(255,255,255,.18)",
      border: "none",
      borderRadius: "50%",
      width: 34,
      height: 34,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      color: C.white
    }
  }, Ico.back), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10,
      letterSpacing: 3,
      color: "rgba(255,255,255,.5)",
      fontWeight: "bold",
      marginBottom: 4
    }
  }, "GUT OVER MATTER"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 22,
      fontFamily: "Georgia,serif",
      color: C.white,
      lineHeight: 1.3
    }
  }, "Daily Routine Builder"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: "rgba(255,255,255,.6)",
      marginTop: 4
    }
  }, "Build small regulation pauses throughout your day.")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px 16px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: C.white,
      borderRadius: 14,
      padding: "12px 14px",
      boxShadow: "0 2px 8px rgba(0,0,0,.05)",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 22,
      fontWeight: "bold",
      color: C.forest
    }
  }, activeCount), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: C.charcoal,
      opacity: .5
    }
  }, "Active pauses")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: C.white,
      borderRadius: 14,
      padding: "12px 14px",
      boxShadow: "0 2px 8px rgba(0,0,0,.05)",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 22,
      fontWeight: "bold",
      color: C.teal
    }
  }, totalMins), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: C.charcoal,
      opacity: .5
    }
  }, "Minutes/day")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: C.white,
      borderRadius: 14,
      padding: "12px 14px",
      boxShadow: "0 2px 8px rgba(0,0,0,.05)",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 22,
      fontWeight: "bold",
      color: totalMins >= 15 ? C.forest : C.clay,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 28
    }
  }, totalMins >= 20 ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.forest,
      display: "inline-flex",
      transform: "scale(1.4)"
    }
  }, Ico.chk) : totalMins >= 10 ? "~" : "↑"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: C.charcoal,
      opacity: .5
    }
  }, totalMins >= 20 ? "Optimal" : totalMins >= 10 ? "Building" : "Start here"))), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: C.charcoal,
      opacity: .5,
      marginBottom: 10,
      lineHeight: 1.5
    }
  }, "Toggle pauses on or off. Set your preferred times. Research shows that daily practice, even just 10 to 15 minutes spread across the day, produces cumulative autonomic improvements for IBS within 4 to 8 weeks."), blocks.map((block, i) => /*#__PURE__*/React.createElement("div", {
    key: block.id,
    style: {
      background: C.white,
      borderRadius: 14,
      padding: "13px 14px",
      marginBottom: 9,
      boxShadow: "0 1px 6px rgba(0,0,0,.05)",
      opacity: block.active ? 1 : .55,
      transition: "all .2s"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 10,
      background: block.active ? block.color : C.creamDark,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      transition: "background .2s",
      color: block.active ? "#fff" : C.charcoal
    }
  }, block.icon), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      fontWeight: "bold",
      color: C.charcoal,
      marginBottom: 2
    }
  }, block.label), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: C.charcoal,
      opacity: .5
    }
  }, block.desc, " · ", block.duration, " min")), /*#__PURE__*/React.createElement("button", {
    onClick: () => toggle(block.id),
    style: {
      background: block.active ? block.color : C.creamDark,
      border: "none",
      borderRadius: 20,
      padding: "5px 12px",
      fontSize: 11,
      fontWeight: "bold",
      color: block.active ? C.white : C.charcoal,
      cursor: "pointer",
      transition: "all .2s",
      flexShrink: 0
    }
  }, block.active ? "On" : "Off")), block.active && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: C.charcoal,
      opacity: .5
    }
  }, "Scheduled time:"), /*#__PURE__*/React.createElement("input", {
    type: "time",
    value: block.time,
    onChange: e => updateTime(block.id, e.target.value),
    style: {
      padding: "4px 8px",
      borderRadius: 8,
      border: `1px solid ${C.creamDark}`,
      fontSize: 13,
      color: C.charcoal,
      background: C.cream,
      outline: "none"
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "linear-gradient(135deg," + C.sageLight + ",#edf5f0)",
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      borderLeft: "3px solid " + C.forest
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      fontWeight: "bold",
      color: C.forest,
      marginBottom: 6,
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.forest,
      display: "inline-flex"
    }
  }, Ico.bot), " Get a personalised tip for your routine"), recommendation ? /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12.5,
      color: C.charcoal,
      lineHeight: 1.65
    }
  }, recommendation) : /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: C.charcoal,
      opacity: .6,
      lineHeight: 1.5
    }
  }, "Tap below and Gut IQ will give you one specific tip based on the pauses you have selected."), /*#__PURE__*/React.createElement("button", {
    onClick: getPersonalisedTip,
    disabled: loadingRec,
    style: {
      marginTop: 10,
      background: C.forest,
      color: C.white,
      border: "none",
      borderRadius: 20,
      padding: "8px 16px",
      fontSize: 12,
      cursor: "pointer",
      opacity: loadingRec ? .6 : 1
    }
  }, loadingRec ? "Thinking..." : recommendation ? "Get another tip" : "Get my personalised tip")), /*#__PURE__*/React.createElement("button", {
    onClick: save,
    style: {
      width: "100%",
      background: saved ? C.forest : C.sageLight,
      color: saved ? C.white : C.forest,
      border: "none",
      borderRadius: 28,
      padding: "14px",
      fontSize: 14,
      fontWeight: "bold",
      cursor: "pointer",
      transition: "all .3s",
      marginBottom: 8
    }
  }, saved ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    }
  }, Ico.chk, " Routine Saved") : "Save My Routine")));
}

// ─── GENERAL CHAT ─────────────────────────────────────────────────────────────
function Chat() {
  const GREETING = {
    r: "a",
    t: "Hi, I am Gut IQ. Ask me anything about how IBS works, what drives symptoms, or what the evidence says about management. I can't give medical advice, but I can give you science, in plain language."
  };
  const [msgs, setMsgs] = useLocalState("gom_chat_msgs", [GREETING], v => Array.isArray(v) && v.length > 0);
  const [inp, setInp] = useState("");
  const [load, setLoad] = useState(false);
  const bot = useRef(null);
  // Braces matter: newer browsers return a value from scrollIntoView, which crashed this screen in v7.
  useEffect(() => {
    if (bot.current) bot.current.scrollIntoView({
      behavior: "smooth",
      block: "end"
    });
  }, [msgs, load]);
  const STARTERS = ["How does the vagus nerve affect IBS?", "What is actually happening during a flare?", "How does stress trigger gut symptoms?", "What does the low-FODMAP diet actually do?", "How does slow breathing help my gut?", "What is visceral hypersensitivity?", "Why does my cycle change my IBS?", "What is gut-directed hypnotherapy?"];
  function ask(text) {
    const q = (text || "").trim();
    if (!q || load) return;
    const um = {
      r: "u",
      t: q
    };
    const next = [...msgs, um];
    setMsgs(next);
    setInp("");
    setLoad(true);
    gutIQReply({
      mode: "chat",
      messages: toHistory(next)
    }, () => {
      const result = getSmartResponse(q, "Ask Gut IQ", "Main AI chat. Topics covered: gut-brain axis, autonomic regulation, visceral hypersensitivity, central sensitisation, brain-gut therapies (CBT, GDH), diet, pelvic floor, stress and gut physiology.", "");
      const t = result.text + (result.text.toLowerCase().includes("clinician") ? "" : " This is not medical advice, always discuss your care with a clinician.");
      return {
        text: t,
        redirect: null
      };
    }).then(res => {
      setMsgs(m => [...m, ...(res.notice ? [{
        r: "n",
        t: res.notice
      }] : []), {
        r: "a",
        t: res.text
      }].slice(-40));
      setLoad(false);
    });
  }
  function clearChat() {
    if (window.confirm("Clear this conversation? It will be erased from this device.")) setMsgs([GREETING]);
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      height: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      paddingBottom: 8
    }
  }, msgs.map((m, i) => m.r === "n" ? /*#__PURE__*/React.createElement(NoticeBubble, {
    key: i,
    text: m.t
  }) : /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "gom-bubble",
    style: {
      display: "flex",
      justifyContent: m.r === "u" ? "flex-end" : "flex-start",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "82%",
      padding: "10px 13px",
      borderRadius: m.r === "u" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
      background: m.r === "u" ? C.forest : C.cream,
      color: m.r === "u" ? C.white : C.charcoal,
      fontSize: 13,
      lineHeight: 1.65,
      boxShadow: "0 1px 4px rgba(0,0,0,.07)",
      whiteSpace: "pre-wrap"
    }
  }, m.t))), load && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 5,
      padding: "4px 0"
    }
  }, [0, 1, 2].map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      width: 7,
      height: 7,
      borderRadius: "50%",
      background: C.sage,
      animation: `pulse 1s ${i * .2}s infinite`
    }
  }))), msgs.length <= 1 && !load && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10,
      color: C.charcoal,
      opacity: .4,
      letterSpacing: 1,
      fontWeight: "bold",
      marginBottom: 8
    }
  }, "OR TAP A QUESTION"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, STARTERS.map((q, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => ask(q),
    style: {
      textAlign: "left",
      background: C.white,
      border: `1px solid ${C.sageLight}`,
      borderRadius: 12,
      padding: "9px 12px",
      fontSize: 12,
      color: C.charcoal,
      cursor: "pointer",
      lineHeight: 1.4
    }
  }, q)))), msgs.length > 1 && !load && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "8px 0"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: clearChat,
    style: {
      background: "transparent",
      border: "none",
      color: C.charcoal,
      opacity: .4,
      fontSize: 10,
      cursor: "pointer",
      letterSpacing: 1,
      textTransform: "uppercase"
    }
  }, "Clear conversation")), /*#__PURE__*/React.createElement("div", {
    ref: bot
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      padding: "10px 0 0",
      borderTop: `1px solid ${C.creamDark}`
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: inp,
    onChange: e => setInp(e.target.value),
    onKeyDown: e => e.key === "Enter" && ask(inp),
    maxLength: 600,
    "aria-label": "Ask Gut IQ a question",
    placeholder: "Ask about IBS, the gut-brain axis...",
    style: {
      flex: 1,
      background: C.cream,
      border: `1px solid ${C.creamDark}`,
      borderRadius: 24,
      padding: "9px 14px",
      fontSize: 13,
      color: C.charcoal,
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => ask(inp),
    disabled: load || !inp.trim(),
    "aria-label": "Send",
    style: {
      background: C.forest,
      color: C.white,
      border: "none",
      borderRadius: 24,
      width: 42,
      height: 42,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      opacity: inp.trim() ? 1 : .45
    }
  }, Ico.send)));
}

// ─── QUIZ ─────────────────────────────────────────────────────────────────────
const QUIZ = [{
  q: "When do your symptoms tend to be worst?",
  opts: ["Before stressful events, where anticipation seems to be the trigger", "After eating certain foods, where food feels like the main driver", "During high-pressure periods at work or school", "Random and I cannot find a clear pattern"]
}, {
  q: "What do you notice most during a flare?",
  opts: ["Urgency and cramping that come on fast", "Bloating, constipation, or difficulty emptying", "Anxiety and gut symptoms arriving together", "All of the above as it varies a lot"]
}, {
  q: "What feels most missing for you right now?",
  opts: ["Understanding why this actually happens in my body", "Tools to calm down when I'm in it", "Rebuilding trust that my body isn't broken", "Feeling less alone, like someone gets it"]
}];
const QUIZ_ROUTES = [{
  p: "The IBS Mind-Gut Reset",
  c: "Understand Your IBS",
  r: "Your answers suggest starting with the gut-brain framework. Understanding what is actually happening in your body is the foundation everything else builds on."
}, {
  p: "Reset Your Nervous System",
  c: "Calm the Loop",
  r: "Your answers suggest stress, anticipation, or nervous-system activation are playing a strong role. Building autonomic regulation and improving your vagal tone should be your first focus."
}, {
  p: "Rebuild Trust in Your Body",
  c: "Rebuild Trust",
  r: "Your answers suggest that rebuilding your relationship with your body and your food is where to start. This foundation supports everything else."
}, {
  p: "Rebuild Trust in Your Body",
  c: "Rebuild Trust",
  r: "Your answers suggest you are dealing with unpredictability and feeling isolated in it. Starting with the gut-brain framework and rebuilding trust is the right move, and you are not alone in this."
}];

// QUIZ_MAP, each (question, option) maps to a QUIZ_ROUTES index.
// Without this map, the old code was tallying raw option indices, which does not
// correspond to a consistent category across questions. This matrix fixes that.
// Rows = questions (Q1, Q2, Q3). Columns = options (0, 1, 2, 3).
const QUIZ_MAP = [
// Q1: When do your symptoms tend to be worst?
// 0: anticipatory → Calm(1), 1: food-driven → Rebuild Trust(2), 2: high pressure → Calm(1), 3: random → Understand(0)
[1, 2, 1, 0],
// Q2: What do you notice most during a flare?
// 0: urgency → Understand(0), 1: bloating/constipation → Calm(1), 2: anxiety+gut together → Calm(1), 3: varies → Understand(0)
[0, 1, 1, 0],
// Q3: What feels most missing for you right now?
// 0: understanding → Understand(0), 1: tools → Calm(1), 2: rebuilding trust → Rebuild(2), 3: feeling less alone → Rebuild-alternate(3)
[0, 1, 2, 3]];
function Quiz({
  onDone
}) {
  const [step, setStep] = useState(0);
  const [ans, setAns] = useState({});
  function pick(optIdx) {
    const na = {
      ...ans,
      [step]: optIdx
    };
    setAns(na);
    if (step < QUIZ.length - 1) {
      setStep(s => s + 1);
    } else {
      // Tally CATEGORY votes (from QUIZ_MAP), not raw option indices.
      // Each (question, option) pair has an explicit mapping to a recommended route.
      const tally = {
        0: 0,
        1: 0,
        2: 0,
        3: 0
      };
      Object.entries(na).forEach(([qIdx, opt]) => {
        const route = QUIZ_MAP[parseInt(qIdx)][opt];
        if (route !== undefined) tally[route]++;
      });
      // Pick the winning category. In case of a tie, earlier routes (0, 1, 2...) win,
      // which prioritises "Understand Your IBS" as the default starting point.
      const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1] || parseInt(a[0]) - parseInt(b[0]));
      const best = parseInt(sorted[0][0]);
      onDone(QUIZ_ROUTES[best]);
    }
  }
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      marginBottom: 18
    }
  }, QUIZ.map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: 1,
      height: 3,
      borderRadius: 2,
      background: i <= step ? C.forest : C.creamDark,
      transition: "background .3s"
    }
  }))), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: C.charcoal,
      opacity: .4,
      marginBottom: 8
    }
  }, "Question ", step + 1, " of ", QUIZ.length), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 16,
      fontFamily: "Georgia,serif",
      color: C.charcoal,
      marginBottom: 18,
      lineHeight: 1.45
    }
  }, QUIZ[step].q), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, QUIZ[step].opts.map((o, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => pick(i),
    style: {
      background: C.cream,
      border: "1.5px solid " + C.creamDark,
      borderRadius: 12,
      padding: "13px 16px",
      fontSize: 13,
      color: C.charcoal,
      cursor: "pointer",
      textAlign: "left",
      transition: "all .2s",
      lineHeight: 1.5
    },
    onMouseEnter: e => {
      e.currentTarget.style.borderColor = C.forest;
      e.currentTarget.style.background = C.sageLight;
    },
    onMouseLeave: e => {
      e.currentTarget.style.borderColor = C.creamDark;
      e.currentTarget.style.background = C.cream;
    }
  }, o))));
}

// ─── BIOLOGICAL BACKGROUND ───────────────────────────────────────────────────
function BioBg() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: "none",
      zIndex: 0,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 430 900",
    xmlns: "http://www.w3.org/2000/svg",
    fill: "none",
    style: {
      width: "100%",
      height: "100%",
      opacity: 0.038
    }
  }, /*#__PURE__*/React.createElement("ellipse", {
    cx: "215",
    cy: "52",
    rx: "55",
    ry: "42",
    stroke: "#23443B",
    strokeWidth: "1.2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M175 37 Q195 22 215 32 Q235 22 255 37",
    stroke: "#23443B",
    strokeWidth: "0.8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M170 52 Q185 44 200 52 Q215 60 230 52 Q245 44 260 52",
    stroke: "#23443B",
    strokeWidth: "0.6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M175 67 Q195 60 215 67 Q235 60 255 67",
    stroke: "#23443B",
    strokeWidth: "0.6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M215 97 L215 130",
    stroke: "#23443B",
    strokeWidth: "1.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M215 45 Q188 62 168 92",
    stroke: "#23443B",
    strokeWidth: "1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M215 45 Q242 62 262 92",
    stroke: "#23443B",
    strokeWidth: "1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M215 97 Q200 200 205 350 Q210 500 215 650 Q218 720 215 762",
    stroke: "#23443B",
    strokeWidth: "0.8",
    strokeDasharray: "4 3"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "205",
    cy: "200",
    r: "3.5",
    stroke: "#23443B",
    strokeWidth: "0.8"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "210",
    cy: "350",
    r: "3.5",
    stroke: "#23443B",
    strokeWidth: "0.8"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "218",
    cy: "500",
    r: "3.5",
    stroke: "#23443B",
    strokeWidth: "0.8"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "215",
    cy: "650",
    r: "3.5",
    stroke: "#23443B",
    strokeWidth: "0.8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M205 200 Q168 216 148 232",
    stroke: "#23443B",
    strokeWidth: "0.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M205 200 Q242 216 262 230",
    stroke: "#23443B",
    strokeWidth: "0.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M210 350 Q174 366 154 380",
    stroke: "#23443B",
    strokeWidth: "0.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M210 350 Q246 364 266 376",
    stroke: "#23443B",
    strokeWidth: "0.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M218 500 Q180 514 160 526",
    stroke: "#23443B",
    strokeWidth: "0.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M218 500 Q256 512 276 524",
    stroke: "#23443B",
    strokeWidth: "0.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M60 450 L118 450 L133 422 L148 480 L163 432 L173 462 L188 450 L370 450",
    stroke: "#23443B",
    strokeWidth: "0.9"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "215",
    cy: "800",
    rx: "70",
    ry: "50",
    stroke: "#23443B",
    strokeWidth: "1.2"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "215",
    cy: "810",
    rx: "54",
    ry: "37",
    stroke: "#23443B",
    strokeWidth: "0.8"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "215",
    cy: "820",
    rx: "40",
    ry: "26",
    stroke: "#23443B",
    strokeWidth: "0.6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M145 800 Q118 748 128 698 Q133 678 150 668",
    stroke: "#23443B",
    strokeWidth: "1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M285 800 Q312 748 302 698 Q297 678 280 668",
    stroke: "#23443B",
    strokeWidth: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "80",
    cy: "300",
    r: "12",
    stroke: "#23443B",
    strokeWidth: "0.6"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "80",
    cy: "300",
    r: "5.5",
    stroke: "#23443B",
    strokeWidth: "0.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "356",
    cy: "550",
    r: "14",
    stroke: "#23443B",
    strokeWidth: "0.6"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "356",
    cy: "550",
    r: "6.5",
    stroke: "#23443B",
    strokeWidth: "0.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "68",
    cy: "600",
    r: "10",
    stroke: "#23443B",
    strokeWidth: "0.6"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "362",
    cy: "350",
    r: "11",
    stroke: "#23443B",
    strokeWidth: "0.6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M48 150 Q63 165 48 180 Q63 195 48 210 Q63 225 48 240",
    stroke: "#23443B",
    strokeWidth: "0.7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M68 150 Q53 165 68 180 Q53 195 68 210 Q53 225 68 240",
    stroke: "#23443B",
    strokeWidth: "0.7"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "48",
    y1: "157",
    x2: "68",
    y2: "157",
    stroke: "#23443B",
    strokeWidth: "0.5"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "48",
    y1: "172",
    x2: "68",
    y2: "172",
    stroke: "#23443B",
    strokeWidth: "0.5"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "48",
    y1: "187",
    x2: "68",
    y2: "187",
    stroke: "#23443B",
    strokeWidth: "0.5"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "48",
    y1: "202",
    x2: "68",
    y2: "202",
    stroke: "#23443B",
    strokeWidth: "0.5"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "48",
    y1: "217",
    x2: "68",
    y2: "217",
    stroke: "#23443B",
    strokeWidth: "0.5"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "48",
    y1: "232",
    x2: "68",
    y2: "232",
    stroke: "#23443B",
    strokeWidth: "0.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "385",
    cy: "150",
    r: "18",
    stroke: "#23443B",
    strokeWidth: "0.6"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "385",
    cy: "150",
    r: "8",
    stroke: "#23443B",
    strokeWidth: "0.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M372 150 L398 150",
    stroke: "#23443B",
    strokeWidth: "0.4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M385 137 L385 163",
    stroke: "#23443B",
    strokeWidth: "0.4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M148 232 Q132 240 124 250",
    stroke: "#23443B",
    strokeWidth: "0.4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M262 230 Q278 238 286 248",
    stroke: "#23443B",
    strokeWidth: "0.4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M154 380 Q138 388 130 398",
    stroke: "#23443B",
    strokeWidth: "0.4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M266 376 Q282 384 290 394",
    stroke: "#23443B",
    strokeWidth: "0.4"
  })));
}

// ─── SHELL + NAV ──────────────────────────────────────────────────────────────
function Shell({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      maxWidth: 430,
      margin: "0 auto",
      height: "var(--app-h)",
      display: "flex",
      flexDirection: "column",
      background: C.bg,
      overflow: "hidden",
      boxShadow: "0 0 60px rgba(0,0,0,.15)",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("style", null, G), /*#__PURE__*/React.createElement(BioBg, null), /*#__PURE__*/React.createElement("div", {
    key: GOM_MOTION.id,
    className: "gom-screen gom-" + GOM_MOTION.dir
  }, children));
}
function Hdr({
  title,
  sub,
  color,
  onBack
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: color || C.forest,
      padding: "48px 18px 20px",
      position: "relative",
      flexShrink: 0
    }
  }, onBack && /*#__PURE__*/React.createElement("button", {
    "aria-label": "Back",
    onClick: onBack,
    style: {
      position: "absolute",
      top: 12,
      left: 12,
      background: "rgba(255,255,255,.18)",
      border: "none",
      borderRadius: "50%",
      width: 34,
      height: 34,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      color: C.white
    }
  }, Ico.back), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 21,
      fontFamily: "Georgia,serif",
      color: C.white,
      lineHeight: 1.3
    }
  }, title), sub && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: "rgba(255,255,255,.62)",
      marginTop: 4
    }
  }, sub));
}
function Nav({
  tab,
  setTab,
  onReselect,
  api
}) {
  const items = [{
    id: "home",
    l: "Home",
    ic: Ico.home
  }, {
    id: "programs",
    l: "Programs",
    ic: Ico.progs
  }, {
    id: "tools",
    l: "Tools",
    ic: Ico.tools
  }, {
    id: "learn",
    l: "Learn",
    ic: Ico.learn
  }, {
    id: "support",
    l: "Support",
    ic: Ico.heart
  }];
  const idx = TAB_ORDER.indexOf(tab);
  const changed = GOM_LAST_NAV_TAB !== null && GOM_LAST_NAV_TAB !== tab;
  GOM_LAST_NAV_TAB = tab;
  const barRef = useRef(null);
  const pillRef = useRef(null);
  const placed = useRef(false);
  const s = useRef({
    down: false,
    scrub: false,
    timer: null,
    startX: 0,
    hover: -1
  });
  const [hover, setHover] = useState(-1);
  const [scrub, setScrub] = useState(false);
  function place(f, how, big) {
    const p = pillRef.current;
    if (!p) return;
    p.style.transition = how === "spring" ? "transform .5s cubic-bezier(.3,1.3,.45,1)" : how === "follow" ? "transform .09s linear" : "none";
    p.style.transform = "translate3d(" + f * 100 + "%,0,0) scale(" + (big ? 1.14 : 1) + ")";
  }
  if (api) api.current = {
    follow: f => place(Math.max(0, Math.min(4, f)), "none", false),
    settle: i => place(i, "spring", false)
  };
  useLayoutEffect(() => {
    place(idx, placed.current ? "spring" : "none", false);
    placed.current = true;
  }, [idx]);
  function geo(x) {
    const r = barRef.current.getBoundingClientRect(),
      w = r.width / 5;
    const f = Math.max(0, Math.min(4, (x - r.left) / w - 0.5));
    return {
      f,
      slot: Math.max(0, Math.min(4, Math.floor((x - r.left) / w)))
    };
  }
  function choose(i) {
    if (TAB_ORDER[i] === tab) {
      place(idx, "spring", false);
      if (onReselect) onReselect();
    } else setTab(TAB_ORDER[i]);
  }
  function enterScrub(x) {
    const st = s.current;
    st.scrub = true;
    setScrub(true);
    const g = geo(x);
    st.hover = g.slot;
    setHover(g.slot);
    place(g.f, "spring", true);
    gomHaptic(8);
  }
  function down(e) {
    if (e.button > 0) return;
    const st = s.current;
    st.down = true;
    st.scrub = false;
    st.startX = e.clientX;
    try {
      barRef.current.setPointerCapture(e.pointerId);
    } catch (x) {}
    clearTimeout(st.timer);
    const x = e.clientX;
    st.timer = setTimeout(() => {
      if (st.down && !st.scrub) enterScrub(x);
    }, 260);
  }
  function move(e) {
    const st = s.current;
    if (!st.down) return;
    if (!st.scrub && Math.abs(e.clientX - st.startX) > 10) {
      clearTimeout(st.timer);
      enterScrub(e.clientX);
      return;
    }
    if (st.scrub) {
      const g = geo(e.clientX);
      place(g.f, "follow", true);
      if (g.slot !== st.hover) {
        st.hover = g.slot;
        setHover(g.slot);
        gomHaptic(5);
      }
    }
  }
  function up(e) {
    const st = s.current;
    if (!st.down) return;
    st.down = false;
    clearTimeout(st.timer);
    const g = geo(e.clientX);
    if (st.scrub) {
      st.scrub = false;
      setScrub(false);
      setHover(-1);
    }
    choose(g.slot);
  }
  function cancel() {
    const st = s.current;
    st.down = false;
    clearTimeout(st.timer);
    if (st.scrub) {
      st.scrub = false;
      setScrub(false);
      setHover(-1);
    }
    place(idx, "spring", false);
  }
  const lit = scrub && hover >= 0 ? hover : idx;
  return /*#__PURE__*/React.createElement("nav", {
    "aria-label": "Main",
    style: {
      background: C.white,
      borderTop: `1px solid ${C.creamDark}`,
      flexShrink: 0,
      zIndex: 99,
      paddingBottom: "env(safe-area-inset-bottom)",
      touchAction: "none",
      userSelect: "none",
      WebkitUserSelect: "none",
      WebkitTouchCallout: "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: barRef,
    onPointerDown: down,
    onPointerMove: move,
    onPointerUp: up,
    onPointerCancel: cancel,
    onContextMenu: e => e.preventDefault(),
    style: {
      position: "relative",
      display: "flex"
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: pillRef,
    "aria-hidden": "true",
    style: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      width: "20%",
      pointerEvents: "none",
      willChange: "transform"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 5,
      bottom: 5,
      left: 7,
      right: 7,
      borderRadius: 18,
      background: scrub ? "rgba(212,230,220,.95)" : C.sagePale,
      boxShadow: scrub ? "0 6px 20px rgba(35,68,59,.18), inset 0 0 0 1px rgba(255,255,255,.7)" : "none",
      transition: "background .25s, box-shadow .25s"
    }
  })), items.map((n, i) => /*#__PURE__*/React.createElement("button", {
    key: n.id,
    "aria-current": tab === n.id ? "page" : undefined,
    onClick: e => {
      if (e.detail === 0) choose(i);
    },
    style: {
      flex: 1,
      position: "relative",
      zIndex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "10px 0 8px",
      background: "none",
      border: "none",
      cursor: "pointer",
      color: lit === i ? C.forest : C.charcoal,
      opacity: lit === i ? 1 : .42,
      transition: "color .25s, opacity .25s, transform .16s"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: tab === n.id && changed ? "gom-icon-on" : "",
    style: {
      display: "inline-flex"
    }
  }, n.ic), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      fontWeight: lit === i ? "bold" : "normal",
      marginTop: 2
    }
  }, n.l)))));
}

// Tab pages sit side by side. Swipe left or right to move between them, like Instagram
// or the iPhone home screen; tapping a tab slides there too.
function TabPager({
  tab,
  setTab,
  panes,
  navApi,
  scrollStore,
  paneRefs
}) {
  const idx = TAB_ORDER.indexOf(tab);
  const wrapRef = useRef(null);
  const trackRef = useRef(null);
  const first = useRef(true);
  const idxRef = useRef(idx);
  idxRef.current = idx;
  const setTabRef = useRef(setTab);
  setTabRef.current = setTab;
  const [all, setAll] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAll(true), 500);
    return () => clearTimeout(t);
  }, []);
  useLayoutEffect(() => {
    const t = trackRef.current;
    t.style.transition = first.current || gomReducedMotion() ? "none" : "transform .4s cubic-bezier(.2,.9,.22,1)";
    t.style.transform = "translate3d(" + -idx * 100 + "%,0,0)";
    if (first.current) TAB_ORDER.forEach((k, i) => {
      const p = paneRefs.current[i];
      if (p) p.scrollTop = scrollStore.current[k] || 0;
    });
    first.current = false;
  }, [idx]);
  useEffect(() => {
    const w = wrapRef.current,
      track = trackRef.current;
    let active = false,
      decided = false,
      sx = 0,
      sy = 0,
      dx = 0,
      lastX = 0,
      lastT = 0,
      vel = 0,
      width = 1;
    function blocked(el) {
      while (el && el !== w) {
        const tg = el.tagName;
        if (tg === "INPUT" || tg === "TEXTAREA" || tg === "SELECT") return true;
        if (el.scrollWidth > el.clientWidth + 2) {
          const ox = getComputedStyle(el).overflowX;
          if (ox === "auto" || ox === "scroll") return true;
        }
        el = el.parentElement;
      }
      return false;
    }
    function start(e) {
      if (e.touches.length !== 1 || blocked(e.target)) {
        active = false;
        return;
      }
      const t = e.touches[0];
      active = true;
      decided = false;
      sx = lastX = t.clientX;
      sy = t.clientY;
      lastT = Date.now();
      dx = 0;
      vel = 0;
      width = w.clientWidth || 1;
    }
    function move(e) {
      if (!active) return;
      const t = e.touches[0],
        mx = t.clientX - sx,
        my = t.clientY - sy;
      if (!decided) {
        if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
        decided = true;
        if (Math.abs(mx) < Math.abs(my) * 1.2) {
          active = false;
          return;
        }
        track.style.transition = "none";
      }
      const i = idxRef.current;
      dx = mx;
      if (i === 0 && dx > 0 || i === TAB_ORDER.length - 1 && dx < 0) dx = dx / 3;
      const now = Date.now();
      vel = (t.clientX - lastX) / Math.max(1, now - lastT);
      lastX = t.clientX;
      lastT = now;
      track.style.transform = "translate3d(calc(" + -i * 100 + "% + " + dx + "px),0,0)";
      if (navApi.current) navApi.current.follow(i - dx / width);
      if (e.cancelable) e.preventDefault();
    }
    function end() {
      if (!active) return;
      active = false;
      if (!decided) return;
      const i = idxRef.current;
      let ni = i;
      if ((dx < -width * 0.22 || vel < -0.35 && dx < -20) && i < TAB_ORDER.length - 1) ni = i + 1;else if ((dx > width * 0.22 || vel > 0.35 && dx > 20) && i > 0) ni = i - 1;
      if (ni !== i) {
        gomHaptic(6);
        setTabRef.current(TAB_ORDER[ni]);
      } else {
        track.style.transition = "transform .34s cubic-bezier(.2,.9,.22,1)";
        track.style.transform = "translate3d(" + -i * 100 + "%,0,0)";
        if (navApi.current) navApi.current.settle(i);
      }
    }
    w.addEventListener("touchstart", start, {
      passive: true
    });
    w.addEventListener("touchmove", move, {
      passive: false
    });
    w.addEventListener("touchend", end);
    w.addEventListener("touchcancel", end);
    return () => {
      w.removeEventListener("touchstart", start);
      w.removeEventListener("touchmove", move);
      w.removeEventListener("touchend", end);
      w.removeEventListener("touchcancel", end);
    };
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    ref: wrapRef,
    onScroll: e => {
      e.currentTarget.scrollLeft = 0;
    },
    style: {
      flex: 1,
      minHeight: 0,
      overflow: "hidden",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    style: {
      display: "flex",
      height: "100%",
      width: "100%",
      willChange: "transform"
    }
  }, TAB_ORDER.map((k, i) => {
    const show = all || Math.abs(i - idx) <= 1;
    return /*#__PURE__*/React.createElement("div", {
      key: k,
      ref: el => {
        paneRefs.current[i] = el;
      },
      inert: i === idx ? undefined : "",
      "aria-hidden": i === idx ? undefined : "true",
      onScroll: e => {
        scrollStore.current[k] = e.currentTarget.scrollTop;
      },
      style: {
        flex: "0 0 100%",
        width: "100%",
        height: "100%",
        overflowY: "auto",
        overscrollBehaviorY: "contain",
        touchAction: "pan-y",
        paddingBottom: 20
      }
    }, show ? panes[k] : null);
  })));
}

// ─── SESSION DATA WITH IMAGES ─────────────────────────────────────────────────
const SESSION_DATA = {
  // CATEGORY 1, UNDERSTAND YOUR IBS
  // Program 1: The IBS Mind-Gut Reset (7 sessions)
  c1p1: [{
    title: "You Are Not Making This Up",
    type: "Education + Validation",
    img: IMGS.c1p1s1,
    body: `IBS is one of the most common gut-brain disorders worldwide. Prevalence estimates vary depending on which diagnostic criteria are used, with roughly 4 percent of adults meeting the stricter Rome IV standard and up to 9 percent meeting the older Rome III standard. The 5 to 10 percent figure you often see quoted is a reasonable shorthand across these different studies. Despite being this common, IBS remains one of the most misunderstood conditions, both by clinicians and by patients themselves.

The most important thing to know first: IBS is a real, documented, biological condition. It is not anxiety in disguise. It is not a weak stomach. It is not caused by eating wrong. And it is absolutely not something you are imagining. Research has documented measurable biological changes in IBS, including visceral hypersensitivity (the nerves in your gut wall sending stronger pain signals than they should) and shifts in immune activity and the microbiome (the community of bacteria in your gut).

IBS is classified as a Disorder of Gut-Brain Interaction (DGBI). In plain terms, this means the communication system between your gut and your brain has become dysregulated. That dysregulation produces real, measurable, painful physical symptoms.

The diagnosis is made using symptom-based criteria called the Rome IV criteria, which you can think of as the official checklist doctors use. The criteria look for recurrent abdominal pain, on average at least one day per week, over the past three months. The symptoms should have started at least six months before the diagnosis is made. That pain also has to be associated with at least two of the following features: it is related to having a bowel movement, it comes with a change in how often you go, or it comes with a change in the form of the stool. When these criteria are met and other conditions are appropriately ruled out, IBS is a positive diagnosis, not a "we couldn't find anything" outcome. This shift toward viewing IBS as a positive diagnosis aligns with current clinical guidelines.

Being told "your tests are normal" does not mean nothing is wrong. It means there is no structural damage to your gut. The problem is in how your gut and brain are communicating, which is real, measurable, and increasingly well understood.`,
    keyTakeaways: ["IBS is a Disorder of Gut-Brain Interaction (DGBI), a recognized and positive diagnosis", "It affects roughly 4 to 10 percent of adults worldwide, depending on which criteria are used", "Rome IV diagnosis: pain on ≥1 day per week for ≥3 months, with onset ≥6 months earlier, and ≥2 of these features: related to bowel movements, stool frequency change, or stool form change", "Normal tests mean there is no structural damage, not that nothing is happening", "This is a real, biological condition, not imagined, not 'just stress'"],
    reflection: "Have you ever felt dismissed when talking about your IBS? What would it change for you to know that what you're experiencing has a biological name and a research framework behind it?",
    sessionContext: "This session covers IBS as a Disorder of Gut-Brain Interaction, the Rome IV diagnostic criteria, what 'normal tests' actually mean, and validation that IBS is a real biological condition, not imagined or caused by weakness."
  }, {
    title: "What the Gut-Brain Axis Actually Is",
    type: "Education + Diagram",
    img: IMGS.c1p1s2,
    body: `Your gut has its own nervous system. It is called the Enteric Nervous System, or ENS, and is sometimes nicknamed the "second brain." The ENS contains roughly 200 to 600 million neurons (nerve cells), which is more than the spinal cord holds. It lines your entire digestive tract and governs digestion, the movement of food through your intestines, and local immune activity, largely on its own.

But the ENS does not work in isolation. It is in constant, bidirectional communication with your central nervous system (your brain and spinal cord) through what is called the gut-brain axis.

The main physical highway of that axis is the vagus nerve, a large nerve running from your brainstem down to your abdomen. Here is the part that surprises most people: in many regions of the body, about 80 percent of the fibers in the vagus nerve are afferent, meaning they carry signals upward, from gut to brain, rather than downward from brain to gut. Your gut is constantly reporting to your brain about what is happening inside you, often before you are consciously aware of it.

In IBS, this two-way system becomes dysregulated in specific, measurable ways. Peripheral afferents, the nerves in your gut wall that send signals up to the brain, show visceral hypersensitivity, meaning they fire pain signals more easily than they should. Central processing in the brain can further amplify those gut signals, turning up the volume on the experience of discomfort. And the autonomic nervous system, the part of your body that automatically manages stress and calm, tends to show reduced parasympathetic (rest-and-digest) activity and heightened sympathetic (fight-or-flight) tone.

The result is a self-reinforcing loop. Gut symptoms feed stress, stress amplifies gut signals, and amplified signals produce more symptoms. This loop is supported by research findings of low-grade immune activation in the gut lining and involvement of the body's stress-axis (known as the HPA axis), both of which influence how sensitive your gut nerves become. This is not "in your head." It is in your gut-brain connection, which is measurable, documented, and responds to targeted treatment.`,
    keyTakeaways: ["The enteric nervous system, your 'second brain', has roughly 200 to 600 million neurons", "The vagus nerve is the main gut-brain highway, with about 80 percent of its fibers carrying signals from gut to brain in many regions", "In IBS, this axis is dysregulated at multiple levels simultaneously: peripheral nerves, central processing, and autonomic balance", "This is a systems-level disorder involving nerves, immune activity, and the stress axis, not purely gut, not purely psychological"],
    reflection: "Before today, how did you think about the relationship between your stress, your emotions, and your gut symptoms? Does this framework change anything for you?",
    sessionContext: "This session explains the gut-brain axis, the enteric nervous system (second brain), the vagus nerve, and how IBS involves dysregulation of this system, producing a self-reinforcing loop of gut symptoms, stress, and amplified pain signals."
  }, {
    title: "What Is Actually Happening During a Flare",
    type: "Education + Diagram",
    img: IMGS.c1p1s3,
    body: `A flare feels like it comes from nowhere, or from a meal, or from a moment of anxiety. But when you understand the cascade that is actually happening inside your body, the experience starts to make sense.

Here is the sequence, step by step:

1. A trigger occurs. This might be stress, anticipation of an event, a food, a memory, or sometimes nothing you can clearly identify. In IBS, the nervous system can start this cascade with very low provocation, because the threshold, which is the amount of stimulation needed to set it off, has been lowered over time.

2. Your stress-response system activates. The HPA axis, your body's main stress-alarm system, works like an internal fire alarm that prepares your body for danger. It releases the stress hormone cortisol. At the same time, the sympathetic nervous system (fight-or-flight mode) comes online, raising heart rate and alertness.

3. The gut lining becomes more reactive. Under stress, the lining of your gut can transiently become more permeable, or more "leaky." This allows more substances to pass through the lining and stimulates immune cells in the gut wall.

4. Immune cells activate. Mast cells are immune cells that sit very close to gut nerves. When triggered, they release chemical messengers (histamine, serotonin, and others) directly onto nearby nerve endings, which can drive pain and sensitivity.

5. Gut nerves become more sensitive. The nerve endings in your gut wall, already primed by previous sensitization, start to fire pain signals more easily and more intensely. This is what researchers call visceral hypersensitivity.

6. The brain amplifies the signal. In IBS, the brain's pain-processing regions are more active than usual, while the regions that normally dampen pain are less active. The result is that real peripheral signals get centrally amplified. The brain turns up the volume.

Then anxiety increases. Amplified gut signals register as threat. The nervous system responds with more anxiety, which re-activates the stress system. The loop continues. A shift in autonomic balance, specifically reduced parasympathetic (vagal) tone and increased sympathetic drive, can sustain this cycle even after the initial trigger is gone.

This is not "just stress." Every step is biologically measurable, for example through increased gut mast-cell activity and stress-related changes in how permeable the gut lining is. A flare is a whole-body event.`,
    keyTakeaways: ["Flares follow a documented cascade: trigger → stress response → gut reactivity → mast-cell and immune activation → nerve sensitization → brain amplification → anxiety → loop", "The HPA axis (your body's stress-alarm system) is central to this cascade", "The brain amplifies real gut signals, it does not invent them", "Mast cells sit near gut nerves and can sensitize them through histamine and other mediators", "Breaking the loop requires targeting multiple steps, not just one"],
    reflection: "Looking back at your last significant flare, can you identify any part of this cascade in your experience? What was the first signal you noticed?",
    sessionContext: "This session walks through the complete IBS flare cascade step by step: trigger, HPA axis activation, increased gut permeability, mast cell degranulation, peripheral nerve sensitization, central brain amplification, and anxiety loop. Every step has a biological mechanism."
  }, {
    title: "Serotonin, The Gut's Most Important Messenger",
    type: "Education + Diagram",
    img: IMGS.c1p1s4,
    body: `When most people hear the word serotonin, they think of mood and antidepressants. But roughly 90 to 95 percent of your body's serotonin is not made in your brain. It is made in your gut, by specialised cells called enterochromaffin (EC) cells that sit in the lining of your gastrointestinal tract.

In plain terms, serotonin is primarily a gut hormone, not a brain hormone. One important thing to know is that the serotonin in your gut and the serotonin in your brain are treated as separate pools, because the serotonin molecule does not cross the blood-brain barrier. So the effect of gut serotonin on your mood is indirect, it travels through nerves and signals, not through the molecule itself.

In the gut, serotonin plays three critical roles. It regulates motility (the muscular contractions that move food through your intestines). It modulates pain signalling through the nerves running along your gut wall. And it sends messages upward through the vagus nerve to your brain.

Different IBS subtypes show measurably different serotonin patterns, though the evidence varies across studies. IBS-D (diarrhea-predominant) is often associated with increased mucosal serotonin availability and faster transit. IBS-C (constipation-predominant) often shows reduced serotonin release after meals and slower transit.

Several things can disrupt gut serotonin production and signalling.

Chronic stress shifts the use of tryptophan, the amino acid (building block) your body uses to make serotonin, away from the serotonin pathway and toward a different pathway entirely, called the kynurenine pathway. This shift happens in part through immune and stress signals that activate an enzyme called indoleamine 2,3-dioxygenase, or IDO. In plain terms, ongoing stress diverts the raw material away from serotonin production.

Microbiome dysbiosis, which means your gut bacteria are out of balance, can also change serotonin availability. Certain gut bacteria, such as Ruminococcus gnavus, have been shown to raise EC-cell serotonin levels through compounds like tryptamine and phenethylamine. This is one reason why the microbiome ties directly into IBS symptom patterns.

Early life adversity has been shown to program EC cell function through epigenetic and neuroimmune effects, meaning that early stress can leave lasting changes in how genes are expressed and how gut nerves respond. This is one reason childhood stress can show up decades later as gut symptoms.

Poor nutrition, particularly low dietary tryptophan from inadequate protein, reduces the raw material available for serotonin synthesis. Tryptophan availability also influences the balance between serotonin and the kynurenine pathway.

This biology helps explain what many people with IBS already sense, that their mood, stress, diet, and gut symptoms are not separate problems. They are part of the same system, linked through the brain-gut-microbiome axis and through tryptophan metabolism.`,
    keyTakeaways: ["Roughly 90 to 95 percent of your body's serotonin is made in the gut, by enterochromaffin (EC) cells", "Gut serotonin governs motility, pain signalling, and gut-brain communication through the vagus nerve", "Gut and brain serotonin are separate pools; the molecule does not cross the blood-brain barrier", "IBS-D often shows higher serotonin availability and faster transit; IBS-C often shows reduced postprandial serotonin and slower transit", "Disrupted by chronic stress (shift to the kynurenine pathway via IDO), bacterial imbalance (including specific taxa like R. gnavus), early-life adversity, and low tryptophan intake", "Mood, stress, diet, and gut function are linked through the brain-gut-microbiome axis and tryptophan metabolism"],
    reflection: "Does understanding the serotonin connection change how you think about the relationship between your emotional state and your gut symptoms? What does that mean for how you approach your care?",
    sessionContext: "This session covers serotonin's role as a gut hormone (90-95% made in gut by enterochromaffin cells), how it governs motility and pain signalling, the different serotonin profiles of IBS-D vs IBS-C, and what disrupts gut serotonin production including stress, dysbiosis, early adversity, and poor nutrition."
  }, {
    title: "Your Nervous System and Your Gut",
    type: "Education + Diagram",
    img: IMGS.c1p1s5,
    body: `Your autonomic nervous system, the part of your nervous system that controls automatic body functions, has two main branches.

The sympathetic nervous system, or SNS, is your "fight-or-flight" system. When it activates, it prepares your body to respond to threat or danger. It raises heart rate, sharpens alertness, and tends to slow or disrupt gut activity.

The parasympathetic nervous system, or PNS, is your "rest-and-digest" system. When it is active, it supports recovery, slows your heart rate, and promotes digestion, motility, and gut repair.

In a regulated nervous system, these two branches balance each other. Stress activates the sympathetic branch, and recovery and rest restore the parasympathetic branch.

In IBS, this balance is persistently shifted. Multiple research reviews and meta-analyses report reduced parasympathetic (vagal) activity and altered sympathovagal balance in people with IBS, with the clearest reductions seen in IBS-C and in patients with more severe symptoms. Heart rate variability, or HRV, is the measure most often used to track this. Lower HRV reflects reduced vagal modulation, though exact findings can vary depending on the method used and whether measurements are taken awake or during sleep. In plain terms, lower HRV suggests your body is spending more time in a low-level alert state, even when you are not consciously stressed.

This matters enormously for gut function. Sympathetic predominance, meaning being stuck in alert mode, can do several things at once. It can suppress or dysregulate motility, so food moves slowly or erratically. It can reduce digestive secretions, so digestion becomes less efficient. It can increase intestinal permeability, so the gut lining becomes more reactive. And it can lower the pain threshold through autonomic-sensory interactions, so you feel gut sensations more intensely.

The parasympathetic system does the opposite. It enhances gastroduodenal motility and antinociception (a technical word for reducing pain signals), supports digestion, reduces permeability, and raises the pain threshold.

When someone with IBS is chronically in sympathetic predominance, their gut is chronically under-supported, even when no conscious stress is present. This is why symptoms can seem to appear "out of nowhere." The nervous system's baseline has shifted. Research has also shown blunted autonomic responsiveness to visceral (gut-related) stressors in IBS, and this appears to relate to how long someone has had the disorder.

This is exactly why approaches that improve vagal activity can help. Slow diaphragmatic breathing and noninvasive auricular vagus nerve stimulation have reduced IBS symptoms and improved HRV in trials. Regular physical activity, social connection, and structured relaxation practice also support parasympathetic function, though their direct effects on IBS symptoms are more variable across studies. Evidence is strongest for breathing and auricular vagus nerve stimulation (taVNS). These are not relaxation tricks. They are physiologically targeted interventions.`,
    keyTakeaways: ["IBS is associated with reduced vagal tone and altered autonomic balance, with the clearest reductions in IBS-C and in more severe disease", "Chronic sympathetic predominance can disrupt motility, digestive secretion, gut permeability, and pain thresholds", "Autonomic responsiveness to gut-related stressors is often blunted in IBS, which may relate to disease duration", "Slow diaphragmatic breathing and auricular vagus nerve stimulation have the strongest trial evidence for improving HRV and IBS symptoms, especially in IBS-C"],
    reflection: "When you think about your daily life, how much time do you genuinely spend in a calm, settled state versus a low-level alert state? What does your nervous system's baseline feel like to you?",
    sessionContext: "This session covers the autonomic nervous system (sympathetic fight-or-flight vs parasympathetic rest-and-digest), how IBS is associated with reduced HRV (heart rate variability, the body's calm-balance measure), what chronic sympathetic dominance does to the gut, and why vagal tone tools are physiological interventions, not just relaxation."
  }, {
    title: "Why Some Days Are Fine and Some Days Are Not",
    type: "Education + Diagram",
    img: IMGS.c1p1s6,
    body: `One of the most confusing and frustrating experiences of IBS is inconsistency. You eat the same meal that was fine last Tuesday, and today it triggers a flare. Same food, same restaurant, completely different outcome.

This inconsistency is not random. It is a predictable consequence of the brain-gut-autonomic mechanisms you now know about, the same mechanisms covered in the earlier sessions on the gut-brain axis and your nervous system.

Your gut does not process food in a fixed, mechanical way. The way your gut responds to any given input, whether that input is food, a social situation, a smell, or a thought, depends heavily on the current state of your autonomic nervous system. Visceral sensitivity and motility both vary with autonomic balance.

When your vagal tone is high, meaning your parasympathetic "rest-and-digest" system is active, several things are true at the same time. Gut motility is more coordinated. Mast-cell activity is less pronounced. Visceral sensitivity, which is how strongly you feel gut sensations, is lower. And central pain amplification, the brain's tendency to turn up the volume on gut signals, is reduced.

In this state, a high-FODMAP meal or a food you would typically avoid may pass without any problem.

When your vagal tone is low, meaning your sympathetic "fight-or-flight" system is dominant because of stress, poor sleep, anxiety, or a sensitised baseline state, the picture shifts. Motility becomes erratic, often with exaggerated colonic activity after meals. Mast cells become more reactive. Visceral sensitivity increases. And the brain more readily amplifies gut signals.

In this state, the same previously safe food can become a trigger, not because the food changed, but because the system processing it changed, due to altered autonomic and immune activity.

This also reveals one of the important limitations of strict food-elimination diets. Eliminating a food removes one input, but it does not address the underlying autonomic dysregulation and mucosal immune activation, particularly from mast cells, that can maintain hypersensitivity even after specific foods are removed. This is why many people with IBS find that their list of "trigger foods" keeps growing even as they restrict more, or that foods stop feeling safe during stressful periods.`,
    keyTakeaways: ["IBS inconsistency is a feature of autonomic dysregulation, through brain-gut-autonomic mechanisms; it is predictable, not random", "The same food can be tolerated when calm and trigger symptoms when stressed, because motility, sensation, and mast-cell reactivity shift with autonomic state", "Autonomic state changes motility, mast-cell activity, visceral sensitivity, and brain amplification, supported by stress-state studies", "Food elimination treats one input but does not address the underlying autonomic and mucosal immune dysregulation in many patients"],
    reflection: "Can you identify a time when the same food or situation had completely different outcomes? Looking back through the lens of autonomic state, what was actually different about those two moments?",
    sessionContext: "This session explains why IBS symptoms are inconsistent: the same food can be fine one day and trigger a flare another, based on autonomic nervous system state. It covers how vagal tone affects motility, mast cell activity, visceral sensitivity, and brain amplification, and why this reveals a key limitation of food-only approaches."
  }, {
    title: "What Actually Helps, The Evidence",
    type: "Education + Summary",
    img: IMGS.c1p1s7,
    body: `Now that you understand what IBS actually is and what drives it, the treatments with the best evidence start to make sense.

DIETARY INTERVENTIONS
The Low-FODMAP diet is the most evidence-based dietary approach for IBS in terms of short-term global symptom relief. FODMAPs are fermentable carbohydrates that produce gas and osmotic effects in the gut (they draw water into the intestine). Reducing FODMAPs improves global IBS symptoms in roughly 50 to 76 percent of patients in clinical trials and real-world cohorts. However, it is designed as a three-phase protocol, not a permanent diet:

• Phase 1 is strict elimination, ideally limited to 4 to 6 weeks.
• Phase 2 is systematic reintroduction, testing one category at a time.
• Phase 3 is personalisation, eating broadly while avoiding only your specific triggers at their specific thresholds.

Dietitian guidance is recommended throughout. Long-term strict restriction is not recommended, because it consistently reduces beneficial gut bacteria, particularly Bifidobacteria (a beneficial group of gut bacteria), and it is unnecessarily limiting once your personal thresholds have been identified.

BRAIN-GUT BEHAVIOURAL THERAPIES
These directly target the gut-brain loop itself, not just individual triggers.

Cognitive Behavioural Therapy (CBT) adapted for IBS addresses the thought patterns, avoidance behaviours, and anxiety that amplify the gut-brain loop. A 2025 network meta-analysis of 67 randomised trials (7,441 patients) found brain-gut behavioural therapies, including both minimal-contact self-guided CBT and standard face-to-face CBT, effective for global IBS symptoms compared with waitlist controls. Certainty was rated low to very low due to risk of bias, but effects were consistent across studies. Current clinical guidelines recommend brain-gut therapies as part of care.

Gut-Directed Hypnotherapy (GDH) uses focused, gut-specific imagery and suggestion to recalibrate the gut-brain connection directly. A 2025 systematic review and meta-analysis of 12 studies (1,158 patients) showed GDH improved global IBS symptoms and pain, with group delivery particularly effective. GDH is recommended in North American guidelines and supported by European practice reviews.

AUTONOMIC REGULATION TOOLS
Slow diaphragmatic breathing at approximately 6 breaths per minute can improve heart rate variability (HRV) and reduce IBS symptoms in trials. Effects may be most apparent in constipation-predominant IBS in some studies. Regular moderate physical activity improves IBS symptoms and autonomic balance in behavioural programs. These are mechanistically grounded adjuncts rather than optional extras.

PHARMACOLOGICAL OPTIONS

A note before reading this section: medication should never be the first step, and it should never be the only step. If you have not yet worked through dietary changes, nervous system regulation, and evidence-based psychological approaches, those come first. Medication in IBS is most effective when it is part of a broader management plan, not a replacement for doing the underlying work.

Always work with your clinician. Never start, stop, or change medication without a clinical assessment. The right question to ask your doctor is not just whether a medication might help your symptoms, but what is driving them, and whether there is a root cause that medication would cover rather than address.

With that said, low-dose antidepressants can play a role. Tricyclic antidepressants (TCAs) such as amitriptyline, and SNRIs such as duloxetine, have good evidence for IBS at doses far lower than those used for depression. In this context they act as gut-brain neuromodulators, calming visceral hypersensitivity and the gut-brain signalling loop, rather than as antidepressants. They are most appropriate when pain is a dominant symptom and when gut-brain axis dysregulation has been established. Current guidelines endorse low-dose tricyclics for pain-predominant IBS; SNRIs may be considered when mood or pain symptoms co-exist. Discuss with your gastroenterologist or GP whether any of this is appropriate for your specific situation and after other approaches have been genuinely tried.`,
    keyTakeaways: ["Low-FODMAP diet: improves global symptoms in ~50 to 76 percent short term; 3-phase protocol with dietitian guidance", "CBT and GDH are the best-evidenced brain-gut behavioural therapies, both supported by 2025 network and meta-analyses and recommended by current guidelines", "Slow breathing at ~6 breaths per minute may improve HRV and IBS symptoms, with evidence strongest for IBS-C in some trials", "Pharmacology: low-dose TCAs for pain-predominant IBS; SNRIs considered when mood or pain co-exist", "Combination approaches (diet + behavioural + autonomic) outperform medication alone in short-term trials, and guidelines advocate multimodal care"],
    reflection: "Based on everything in this program, what feels like the most important area for you to focus on first? What has been the biggest shift in how you understand your IBS?",
    sessionContext: "This final session in Program 1 covers the evidence-based treatments for IBS: Low-FODMAP diet (3-phase protocol, 50-70% response), CBT (42 RCTs, 5,220 patients), gut-directed hypnotherapy (12 studies, 1,158 patients, guideline-recommended), slow diaphragmatic breathing at 6 cycles/minute, and pharmacological options including gut-brain neuromodulators."
  }],
  // Program 2: Understanding Your IBS Pattern (5 sessions)
  c1p2: [{
    title: "Mapping Your Symptom History",
    type: "Education + Self-Assessment",
    img: IMGS.c1p2s1,
    body: `Understanding your IBS starts with understanding your personal pattern. That means not just what symptoms you have, but when they started, what was happening in your life at the time, how they have changed over the years, and what consistently makes them better or worse.

IBS often follows identifiable triggers rather than appearing randomly. Common ones include an episode of acute gastroenteritis (leading to post-infectious IBS), a major stressor or life event (bereavement, relationship loss, job loss, burnout, sustained overwork), and early-life adversity. Childhood trauma and a family history of IBS both increase the risk of developing it later. In other people, symptoms have been present since childhood or adolescence, often connected to early stress or anxiety. Mapping your history through this lens can reveal connections that were previously invisible.

Your IBS pattern also tends to have a shape. Some people have a predominantly pain-and-urgency pattern. Others have constipation-dominant symptoms with incomplete evacuation. Many have a mixed presentation. Within the formal classification, subtypes include IBS-C (constipation-predominant), IBS-D (diarrhea-predominant), and IBS-M (mixed), and patterns can shift over time. Your presentation will often fluctuate with stress, and, in some people, with hormonal changes.

Self-Assessment Exercise. Answer as honestly as you can:

When did your gut symptoms first significantly affect your life?

What was happening around that time?

Have you had a proven gastrointestinal infection before the onset (for example, a "stomach bug" or food poisoning)?

Is there a pattern to when symptoms are worst, such as time of day, day of week, or around certain situations?

What makes things noticeably better, even temporarily?

What makes things noticeably worse?

Patterns usually emerge with careful review. They can guide targeted management and help you decide what to focus on first.`,
    keyTakeaways: ["A thorough history (onset, triggers, comorbid stressors) is central to IBS care", "Onset often links to identifiable events including post-infectious IBS and early-life stress, alongside later stressors like loss or burnout", "Pattern recognition helps direct treatment, and it supports a positive diagnosis with limited testing when alarm features are absent"],
    reflection: "When did your gut symptoms first significantly affect your life? What was happening around that time? Is there a clear pattern to when symptoms are worst?",
    sessionContext: "This session guides users through mapping their personal IBS symptom history, when it started, what was happening, patterns over time, and what helps or worsens symptoms. It introduces the idea that IBS onset often follows identifiable events, and that pattern recognition is the foundation of personalized management."
  }, {
    title: "IBS-C, IBS-D, IBS-M, What Your Subtype Tells You",
    type: "Education + Diagram",
    img: IMGS.c1p2s2,
    body: `IBS is classified into subtypes based on the predominant bowel habit on days when bowel movements are abnormal, per the Rome criteria using the Bristol stool form scale (a visual chart clinicians use to categorise stool shape). This classification matters because the underlying physiology, and the treatment approach, differs meaningfully across subtypes.

IBS-D (diarrhea-predominant): Loose or watery stools, urgency, and often sudden-onset pain that is relieved by bowel movements. This subtype is associated with faster colonic transit and heightened visceral sensitivity, which is the experience of feeling gut sensations more intensely. Some studies also report differences in serotonin (5-HT) signalling. IBS-D is less common in females than IBS-C, with men relatively more represented. Treatment options include the Low-FODMAP diet, serotonin-modulating approaches, and 5-HT3 antagonist medications (such as ondansetron) per current guidelines.

IBS-C (constipation-predominant): Infrequent, hard, or incomplete stools, bloating, and abdominal discomfort. Associated with slower colonic transit, meaning food moves through the large intestine more slowly. Some studies report lower densities of enteroendocrine cells in the stomach and intestine and altered gut peptide profiles in IBS-C. IBS-C is more common in females. It may benefit from diaphragmatic breathing, regular activity, and motility-supporting agents such as osmotic laxatives or prescription secretagogues discussed with a clinician.

IBS-M (mixed): Alternating between loose and hard stools. Can feel contradictory, as in, how can the same gut produce both urgency and constipation? Both patterns reflect the same underlying dysregulation of motility and gut-brain signalling, just oscillating between directions rather than fixed in one. Subtype instability is common. In prospective studies, most individuals change subtype at least once over a year.

IBS-U (unclassified): Meets IBS criteria but does not fit neatly into the other categories. This is completely valid. It represents a minority of cases in epidemiological studies but is a real pattern.

Important: subtypes can change over time. They describe your pattern at a point in time, not a permanent state. Transitions, especially between IBS-M and IBS-C, are frequent. Direct switches between IBS-D and IBS-C are less common.`,
    keyTakeaways: ["Subtypes are based on predominant stool form on symptomatic days per Rome criteria and the Bristol stool form scale", "Each subtype has a distinct physiological profile: faster transit and heightened visceral sensitivity in IBS-D, slower transit and different enteroendocrine profiles in IBS-C", "Subtypes can change over time; subtype shifts are common over months to a year"],
    reflection: "Which subtype description felt most like your experience? Has your pattern shifted over time, and if so, what was happening in your life when it changed?",
    sessionContext: "This session covers the four IBS subtypes (IBS-D, IBS-C, IBS-M, IBS-U), the distinct physiological profiles of each (serotonin levels, motility, vagal tone), their different treatment implications, and the important fact that subtypes can change over time."
  }, {
    title: "Your Trigger Landscape",
    type: "Education + Self-Assessment",
    img: IMGS.c1p2s3,
    body: `IBS triggers generally fall into three categories: dietary, stress-related, and hormonal. Most people with IBS have triggers in all three, with the relative contribution varying across individuals and shifting over time.

DIETARY TRIGGERS are the most commonly identified, but they are often over-attributed. Foods high in FODMAPs (fermentable carbohydrates that produce gas and draw water into the gut) can improve global symptoms short-term in many patients when reduced. High-fat meals, caffeine, and alcohol are also common culprits, but individual sensitivity varies widely and these foods trigger symptoms rather than cause IBS. Tolerance is threshold-dependent. The same food can be tolerated on one day and not tolerated on another, depending on stress level and arousal state.

STRESS-RELATED TRIGGERS are more powerful than most people realise, and more varied than obvious big stress. Anticipatory anxiety before an event, chronic low-level work pressure, social anxiety, relationship tension, and sleep deprivation can all activate the hypothalamic-pituitary-adrenal (HPA) axis and autonomic pathways, which can heighten visceral sensitivity and motility responses. People with IBS often show sustained or dysregulated cortisol responses to psychosocial stress. Sleep loss in particular alters how cortisol reacts to stress the next day.

HORMONAL TRIGGERS affect a significant proportion of people with IBS, particularly those who menstruate. Many report symptom flares around menses and in the late luteal phase (the second half of the cycle). Ovarian hormone fluctuations (estrogen and progesterone) modulate gastrointestinal motility and visceral sensitivity, with slower transit in the luteal phase and increased pain sensitivity around menses. This is not coincidental, sex hormones directly modulate gut-brain axis function.

Self-Assessment Exercise. Over the next week, note:

What you ate before symptoms appeared.

Your stress level that day (on a 1-10 scale).

Perceived stressors or anticipatory situations that day.

Cycle phase or menstruation status (if applicable).

Your sleep quality the previous night.

Any specific events or anticipatory situations.

Patterns often emerge within one to two weeks of tracking.`,
    keyTakeaways: ["Three trigger categories: dietary, stress-related, and hormonal; most people have all three, with classification supported by symptom tracking", "Dietary triggers are threshold-dependent; foods are triggers rather than causes, and responses vary with autonomic state", "Stress activates HPA and autonomic pathways linked to IBS symptom flares; even anticipatory anxiety and poor sleep count", "Hormonal fluctuations, particularly the luteal phase and menses, are common flare periods due to their effects on gut motility and visceral sensitivity"],
    reflection: "Looking at the three trigger categories, dietary, stress-related, hormonal, which feels most dominant for you right now? Which have you been paying the least attention to?",
    sessionContext: "This session explains the three IBS trigger categories: dietary (FODMAPs, fat, caffeine), stress-related (anticipatory anxiety, chronic pressure, sleep deprivation), and hormonal (progesterone/estrogen effects across the menstrual cycle). It emphasises that triggers are threshold-dependent based on autonomic state, and introduces a practical one-week tracking exercise."
  }, {
    title: "The Pre-Event Flare, When Your Gut Knows Before You Do",
    type: "Education + Diagram",
    img: IMGS.c1p2s4,
    body: `One of the most validating, and disorienting, IBS experiences is the pre-event flare. These are symptoms that begin not after a meal or a stressful moment, but before, sometimes days before, an important event, a difficult conversation, or a high-pressure period.

This is not irrational. Anticipatory stress and gut-brain signalling are well documented in IBS and related gut disorders.

Here is how it works. The cortex (your brain's thinking region) processes an upcoming stressful event. It activates the hypothalamus (the brain's control centre for hormones and the autonomic nervous system). This triggers the HPA axis (your stress-alarm system) and engages corticotropin-releasing factor (CRF) pathways that prime gut responses. The autonomic nervous system shifts its balance. Parasympathetic (vagal) tone drops and sympathetic activity rises in many patients, all before the external stressor has even occurred. This autonomic shift reaches the Enteric Nervous System (your gut's own nervous system), which begins to mobilise, with CRF and autonomic signals increasing motility (gut movement) and secretions. Mast cells (gut immune cells) are promoted toward activation, and mast cell mediators in the gut lining increase in many people with IBS. Visceral sensitivity rises, meaning you feel gut sensations more intensely.

Your gut is reacting to an event that has not happened yet, through anticipatory top-down stress pathways.

For many people, this means the "trigger" for a pre-event flare is not the food eaten on the morning of an important meeting. It is the anxiety about the meeting that began the night before, or three days earlier. Physiologic studies confirm that stress-related autonomic shifts and heightened visceral sensitivity can precede bowel events.

Recognising this pattern matters for two reasons.

First, it reduces unnecessary food restriction. During pre-event flares, the meal is often coincidental rather than causal.

Second, it redirects attention to anticipatory anxiety and the stress physiology that is actually driving your symptoms.`,
    keyTakeaways: ["Pre-event flares are driven by anticipatory stress activating the gut-brain axis via CRF, HPA, and autonomic pathways that modulate motility and sensitivity", "The ENS (gut's own nervous system) and mucosal immune cells (notably mast cells) respond to anticipated stress much like they respond to actual stress", "Food eaten during a pre-event flare is often coincidental, not causal, when symptoms follow anticipatory anxiety patterns", "Gut-directed psychotherapies and stress-reduction can reduce symptom flares that follow this pattern"],
    reflection: "Do you recognise the pre-event flare pattern in your own experience? Can you think of a time when your gut reacted to anticipation, before any food or event had actually happened?",
    sessionContext: "This session explains the pre-event flare: how anticipatory stress activates the HPA axis and ENS before a stressful event occurs, producing real gut symptoms. It covers why food eaten during these flares is often coincidental, and why managing anticipatory anxiety is more effective than dietary restriction in these patterns."
  }, {
    title: "When Did Your IBS Start? (And Why That Matters)",
    type: "Education + Diagram",
    img: IMGS.c1p2s5,
    body: `The circumstances around when IBS begins are not just context, they are mechanism. Epidemiology and mechanistic studies link IBS onset to infections and stressful life events, and understanding this tells you something important about how the gut-brain axis became dysregulated in the first place.

IBS onset is often reported after acute gastrointestinal infection and after major stressful life events, including bereavement, relationship or job loss, and burnout from sustained overwork. These events act as risk contexts rather than as single direct causes. They create biological conditions in which gut-brain dysregulation can take hold. In other people, symptoms have been present since childhood or adolescence, often linked to early stress.

A significant gut infection can trigger what is called post-infectious IBS (PI-IBS), a well-characterised subtype in which IBS symptoms persist for months or years after the infection has resolved. The incidence after gastroenteritis ranges from roughly 5 to 32 percent in cohorts, with higher risk after bacterial or protozoal infections. The mechanisms include low-grade mucosal inflammation (mild, ongoing immune activity in the gut lining), increased mucosal immune cells such as mast cells and T cells, increased enterochromaffin (EC) cells with altered serotonin handling, increased gut permeability, microbiome shifts, and persistent changes in gut transit and sensitivity. Among those with enteric infections, about 5 to 32 percent go on to develop PI-IBS. PI-IBS represents a substantial subset of IBS, though the exact share among all IBS varies by population.

Psychological stress triggers a different but overlapping set of mechanisms. It can "program" the stress system, meaning the HPA axis, and alter autonomic balance. Epigenetic changes (changes in how genes are expressed without changing the DNA sequence) and enteroendocrine signalling shifts have been reported in animal models and patient studies. Stress can also heighten visceral sensitivity and modify gut motility, secretion, and permeability through neuro-endocrine-immune pathways.

Early life adversity, including adverse childhood experiences (often called ACEs or EALs in research), is associated with higher IBS risk and severity, and with a more reactive HPA axis. Animal and human data support long-lasting effects on the brain-gut-microbiome axis.

Recognising the origin of your IBS does not assign blame to yourself, to circumstances, or to anyone else. It provides mechanism. And mechanism points toward the right intervention. For example, PI-IBS mechanisms implicate immune and barrier targets, whereas stress-linked onset implicates modulation of the stress system itself.`,
    keyTakeaways: ["IBS onset frequently follows identifiable events, especially infection and major stressors, across populations", "After enteric infection, about 5 to 32 percent develop PI-IBS, with mechanisms including low-grade inflammation, increased EC cells, and permeability changes", "Early-life adversity can programme gut-brain vulnerability that shows up decades later, with persistent HPA axis effects", "Knowing your origin story is not about blame, it is about understanding what needs to change and matching the intervention to the mechanism"],
    reflection: "Looking back, what was happening in your life when your IBS began or significantly worsened? Does understanding the biological mechanism behind that connection change anything for you?",
    sessionContext: "This session covers how IBS onset frequently follows identifiable events (bereavement, burnout, infection, relationship loss), the mechanisms of post-infectious IBS (PI-IBS, accounting for 10-30% of cases), how early life adversity programmes gut-brain vulnerability, and why identifying onset origins provides mechanism for treatment rather than blame."
  }],
  // CATEGORY 2, CALM THE LOOP
  // Program 1: Reset Your Nervous System (6 sessions)
  c2p1: [{
    title: "Why Regulation Is Treatment",
    type: "Education",
    img: IMGS.c2p1s1,
    body: `When we talk about "calming down" in the context of IBS, we do not mean relaxing in a vague, wishful sense. We mean something specific and physiological. The goal is shifting your autonomic balance toward greater parasympathetic (vagal) activity and lower sympathetic reactivity, and improving the brain's capacity to dial down gut signals rather than amplify them.

This distinction matters because many people with IBS have tried to "just relax" and found it does not work. Relaxation as a vague intention does not consistently shift the autonomic nervous system. Structured, targeted tools do. IBS shows reduced vagal activity and relative sympathetic excess, so nonspecific relaxation techniques may not normalise autonomic markers the way targeted practices can.

The nervous system is trainable. HRV biofeedback (heart rate variability training, a technique that teaches your nervous system to balance itself), slow diaphragmatic breathing, regular physical activity, and mind-body practices can shift autonomic balance toward parasympathetic activity. Documented effects include increases in high-frequency HRV and baroreflex sensitivity in several populations. IBS-specific trials are promising but mixed, and for IBS with autonomic dysregulation these are targeted physiological interventions supported by mind-body evidence.

Autonomic regulation also improves the brain's capacity to modulate pain. Increasing vagal activity is linked to improved descending pain inhibition (a reduction in the central amplification of gut signals) in IBS, which shows diminished conditioned pain modulation. Autonomic and mind-body interventions that enhance parasympathetic activity have reduced symptoms in trials.

The sessions in this program will give you practical, evidence-based tools. Each one has a physiological mechanism, supported by growing though heterogeneous IBS evidence. None of them require you to already be a calm person to use them.`,
    keyTakeaways: ["Autonomic regulation is a targeted physiological intervention, not just general relaxation", "Structured tools can shift autonomic balance (higher high-frequency HRV, improved baroreflex) more consistently than vague intention", "Improving vagal activity aligns with stronger descending pain inhibition in IBS, where this system is often blunted", "Evidence in IBS is promising but mixed; HRV biofeedback, breathing, and CBT and yoga show symptom benefits in trials and reviews"],
    reflection: "Has the idea of 'just relaxing' ever felt unhelpful or even dismissive in the context of your IBS? How does reframing regulation as a targeted physiological intervention change how you think about it?",
    sessionContext: "This session reframes autonomic regulation as a physiological intervention for IBS, not just relaxation. It covers how increasing parasympathetic tone and improving vagal tone reduces central pain amplification, and why structured tools (HRV biofeedback, slow breathing, physical activity) reliably produce autonomic shifts that vague relaxation cannot."
  }, {
    title: "The Science of Slow Breathing",
    type: "Education + Practice",
    img: IMGS.c2p1s2,
    body: `Slow diaphragmatic breathing, specifically at approximately 6 cycles per minute, is a promising autonomic regulation tool. The mechanistic support is strong, and early IBS trials are encouraging, though the IBS-specific evidence base is still growing. This is not a breathing exercise in the wellness sense. It is a physiologically specific intervention with a documented mechanism.

When you breathe slowly and deeply, several things happen simultaneously.

Your diaphragm moves downward on each inhale, which increases vagal activity through the cardio-vagal reflexes engaged by slow breathing. This shifts the autonomic nervous system toward parasympathetic (rest-and-digest) activity and away from sympathetic (fight-or-flight) dominance.

Slow breathing increases heart rate variability (HRV) through a phenomenon called respiratory sinus arrhythmia, which is the physiological basis of HRV biofeedback. A rate near 0.1 Hz, which is about 6 breaths per minute, often aligns with the cardiovascular "resonance frequency" that maximises these oscillations and engages the baroreflex. The optimal rate does vary by individual, however.

Prolonged, controlled exhalation can augment baroreflex engagement and parasympathetic activity. Adding brief post-exhalation rests can further increase high-frequency HRV in some studies. The extended exhale is commonly emphasised, though specific protocols differ across trials.

Acute slow breathing can increase vagal indices and baroreflex engagement. Effects on cortisol, gut motility, and visceral sensitivity (how intensely you feel gut sensations) are plausible and supported by mechanism, but they are not consistently demonstrated across IBS trials.

In IBS, small trials show mixed results. A 6-week program at 6 breaths per minute improved IBS-C symptoms, bowel frequency, rectal sensory thresholds, and increased vagal HRV indices versus control. A 4-week pilot improved microvascular function without clear changes in HRV or symptoms. A practice dose of 10 to 20 minutes daily for 4 to 8 weeks is commonly used and was effective in the positive trial. Individualise as tolerated.

The 4-2-6 pattern (4 seconds in, 2 second hold, 6 seconds out) used throughout this app approximates 6 breaths per minute for many adults. Individual resonance may differ, so some people benefit from slight rate adjustments. Try the in-app Breathing Pacer now.`,
    keyTakeaways: ["Slow breathing around 6 breaths per minute engages respiratory sinus arrhythmia and often approaches autonomic resonance, though optimal rate is individual", "Extended exhales and brief post-exhalation rests can enhance vagal markers and baroreflex engagement; protocols vary", "Daily practice of 10 to 20 minutes over 4 to 8 weeks is commonly used; one IBS-C trial showed symptom and HRV improvements, while another pilot showed vascular but not symptom changes", "This is a physiologically grounded intervention; IBS-specific outcome evidence is promising but mixed, with IBS populations showing altered autonomic balance and HRV versus controls"],
    reflection: "After trying the 4-2-6 breathing practice, what did you notice? Did anything shift, even slightly? What feels like the biggest barrier to doing this consistently?",
    sessionContext: "This session explains the physiology of slow diaphragmatic breathing at 6 cycles/minute: vagus nerve stimulation via the diaphragm, respiratory sinus arrhythmia (HRV entrainment), baroreflex activation via the extended exhale, and the resulting reduction in sympathetic tone, cortisol, visceral sensitivity, and gut pain amplification. Evidence for IBS-C is highlighted."
  }, {
    title: "Your Vagus Nerve, and How to Use It",
    type: "Education + Practice",
    img: IMGS.c2p1s3,
    body: `The vagus nerve is the tenth cranial nerve and a major pathway of the parasympathetic (rest-and-digest) nervous system. It projects broadly to thoracic and abdominal organs and modulates cardiac, respiratory, and gastrointestinal function. In plain terms, it has broad influence over digestion and stress-autonomic responses.

In IBS, research shows altered autonomic balance with lower parasympathetic (vagal) indices and abnormal responses to visceral stressors. These findings are consistent across studies and meta-analyses, though not universal. In practical terms, this often means reduced vagal markers and relative sympathetic predominance in some contexts, which can sensitise the gut-brain system.

The important point is that vagal tone is not fixed. It responds to how you live, breathe, move, and connect. Vagal-mediated HRV, which is a noninvasive index of cardiac parasympathetic activity, is modifiable with behavioural interventions.

Practices with documented evidence for improving vagal tone fall into several natural groups. Each one works through a slightly different mechanism, and most people benefit from combining a few rather than relying on one.

The most direct option is slow diaphragmatic breathing. Paced breathing at about 6 breaths per minute raises vagal indices like high-frequency HRV and baroreflex sensitivity across multiple populations. IBS trials show promising but mixed outcomes, with short sessions producing acute increases in vagal markers and multi-week practice enhancing the effects. Other supportive practices include:

• Regular moderate aerobic exercise, such as walking, swimming, or cycling, which is associated with higher resting vagal tone and can improve IBS symptoms, including postprandial motility relations.

• Brief cold exposure, for example facial cold water or a cool shower, which can acutely enhance vagal-related HRV after exertion. Evidence here comes mainly from exercise studies and is not IBS-specific. It is modest but useful as an acute tool during high-activation states.

• Humming or singing, which can modulate autonomic activity. Vocalisation at around 0.1 Hz increases cardiovascular coherence similarly to slow breathing. Singing may increase sympathetic arousal at the same time, so effects depend on the protocol, and vagal activation is inferred from HRV rather than measured directly.

• Genuine social connection, which modulates HRV depending on context and quality. Negative interactions reduce HRV, while supportive contexts are linked with better autonomic flexibility.

• Sufficient sleep, because vagal activity is higher during deep sleep and HRV biofeedback has improved subjective sleep and HRV in small trials. Chronic sleep deprivation is one of the fastest ways to reduce vagal tone and sensitise the gut.`,
    keyTakeaways: ["The vagus nerve broadly modulates cardiac, respiratory, and gastrointestinal function as a major parasympathetic pathway", "IBS often shows reduced vagal markers and altered autonomic responses, though findings vary by study", "Vagal tone is trainable; HRV biofeedback, slow breathing, regular exercise, and sleep optimisation can increase vagal indices", "Cold exposure and vocalisation can modulate autonomic activity acutely; effects are protocol-dependent"],
    reflection: "Of the vagal tone practices covered, breathing, exercise, sleep, cold exposure, humming, social connection, which are already part of your life, and which feels most accessible to add right now?",
    sessionContext: "This session covers the vagus nerve's role as the parasympathetic system's main highway to all digestive organs, the consistently documented finding of reduced vagal tone in IBS, and six practices with documented evidence for improving vagal tone: slow breathing, aerobic exercise, cold water exposure, humming/singing, social connection, and sufficient sleep."
  }, {
    title: "Pacing, Managing Your Energy Without Boom and Bust",
    type: "Education + Practice",
    img: IMGS.c2p1s4,
    body: `Many people with IBS fall into a pattern called boom-and-bust, with periods of pushing through symptoms, overdoing activity on better days, and then crashing into a flare. This pattern is particularly common in high-achieving people who struggle to reduce their output when their body is signalling overload.

Repeated push-and-crash patterns are linked to autonomic dysregulation in IBS. Research shows higher sympathetic activity around symptom events and reduced baroreflex and parasympathetic indices, which can relate to symptom severity. Rather than framing this as something that always activates sympathetic drive, it is more accurate to say that these patterns are linked to higher sympathetic activity around flares.

Pacing is the practice of distributing activity and rest more evenly, not based on how you feel in a good moment, but based on a planned, sustainable baseline. It has evidence in chronic pain and chronic fatigue management, and there is emerging conceptual support for IBS where autonomic dysregulation is present. Specific IBS trials are limited. Certain pacing facets, particularly activity consistency, are associated with better symptoms, while "activity reduction" facets can correlate with worse symptoms. The aim is to avoid overexertion-triggered autonomic swings.

Practical pacing for IBS:

Step 1: Identify your sustainable daily activity level during a moderate-symptom period. Not your best day, not your worst day, somewhere reliable in the middle.

Step 2: Build your schedule around that baseline, regardless of how well you feel on a given day. The temptation on good days is to do everything you could not do on bad days, but this restarts the boom-bust cycle. Focus on activity consistency rather than large fluctuations.

Step 3: Build rest breaks into your day deliberately, not as a reward when symptoms force you to stop, but as a planned autonomic regulation pause. Use brief scheduled regulation pauses, for example a minute of slow breathing, to support autonomic balance.

Step 4: When symptoms improve, increase activity gradually, not immediately jumping back to maximum output.

Open the in-app Routine Builder to map your sustainable daily practice.`,
    keyTakeaways: ["Boom-and-bust patterns are linked to higher sympathetic activity around symptom events and reduced vagal and baroreflex indices in IBS", "Pacing sets a sustainable baseline and emphasises activity consistency over large fluctuations", "Planned rest and brief regulation pauses help avoid overexertion-triggered autonomic swings", "Evidence for pacing comes mainly from chronic pain and fatigue trials, with emerging relevance to IBS; effects vary by pacing strategy"],
    reflection: "Do you recognise the boom-and-bust pattern in your own daily life? What would it look like to build your schedule around a sustainable baseline rather than your best-day capacity?",
    sessionContext: "This session covers the boom-and-bust pattern in IBS, how pushing through on good days and crashing on bad days chronically activates the sympathetic nervous system. It introduces pacing (setting a sustainable daily baseline, planned rest breaks, gradual increases) as an autonomic regulation strategy, and references the in-app Routine Builder."
  }, {
    title: "Sleep as a Gut-Brain Intervention",
    type: "Education + Practice",
    img: IMGS.c2p1s5,
    body: `Sleep is not passive recovery. During non-REM sleep, especially slow-wave sleep, cardiac control shifts toward greater parasympathetic modulation, while REM sleep shows relatively greater sympathetic modulation. Parasympathetic-linked HRV indices are typically higher in non-REM than REM, though HRV varies by stage and across the night. Some HRV indices are actually lowest in slow-wave sleep and rise with lighter stages or REM, depending on the metric used.

The gut runs its own housekeeping pattern called the migrating motor complex, which is a fasting-state motility pattern that recurs every 90 to 120 minutes during fasting. It can occur overnight between meals and supports small-intestinal cleaning.

In people with IBS, sleep disturbance is common and relates to autonomic abnormalities and symptom severity, though findings vary by subgroup and study. Poor sleep is associated with worse next-day abdominal pain and symptom burden in observational studies. Poor sleep and circadian disruption are linked to lower HRV metrics and altered sympathovagal balance. Experimental circadian disruption increases visceral sensitivity and colonic permeability in animal models. In humans, IBS data suggest next-day symptom worsening after poor sleep.

This creates a bidirectional association. Gut symptoms disrupt sleep, and disturbed sleep is associated with worse gut symptoms. Breaking this loop is an important component of IBS management.

The most supported sleep practices for IBS work best in combination rather than as single fixes. Here are the ones with the clearest evidence:

• Consistent sleep and wake times regulate circadian rhythms that influence autonomic and gastrointestinal function.

• Screen reduction before bed may reduce arousal. Direct effects on cortisol are inconsistent, so think of it as supporting melatonin and reducing alerting light exposure rather than as a cortisol fix.

• A cool bedroom, around 18 to 20 degrees Celsius (64 to 68 degrees Fahrenheit), supports sleep initiation and maintenance through thermoregulation.

• Avoiding large meals within about 3 hours of bedtime reduces nocturnal gut activation and reflux risk. The migrating motor complex runs in fasting states.

• Brief pre-sleep breathing or relaxation can enhance vagal indices in some contexts, though IBS trials show mixed autonomic and symptom effects.

Open the in-app Sleep Planner to build your personalised sleep routine.`,
    keyTakeaways: ["Non-REM sleep shows greater parasympathetic modulation, whereas REM shows relatively greater sympathetic modulation; HRV varies by stage across the night", "The migrating motor complex is a fasting housekeeping pattern that often occurs overnight between meals, not strictly during sleep", "Poor sleep and circadian disruption are associated with lower HRV, increased visceral sensitivity and permeability in models, and worse next-day IBS symptoms in humans", "Most supported tools: consistent sleep timing, light and screen reduction before bed, a cool room, lighter and earlier dinners, and brief pre-sleep breathing or relaxation"],
    reflection: "How consistent is your sleep timing currently? Do you notice a relationship between sleep quality and how your gut feels the following day?",
    sessionContext: "This session covers sleep as a gut-brain intervention: how deep slow-wave sleep is the primary autonomic restoration window (HRV peaks), the migrating motor complex (overnight gut reset), how poor sleep independently worsens gut sensitisation and permeability, and five evidence-based sleep practices for IBS including the in-app Sleep Planner."
  }, {
    title: "Building Your Daily Regulation Practice",
    type: "Practice + Reflection",
    img: IMGS.c2p1s6,
    body: `This session is practical. You have now covered the science behind autonomic regulation, slow breathing, vagal tone, pacing, and sleep. The goal here is to help you build a daily structure that incorporates regulation tools without it feeling like a second job.

Consistency generally matters more than single long sessions. Repeated slow-breathing or HRV-biofeedback practice, or regular exercise, over 4 to 8 weeks can increase vagal-linked HRV and may reduce symptoms in several populations. IBS-specific data are emerging and mixed. Even 10 to 20 minutes per day appears sufficient in trials, and benefits accrue over weeks rather than days.

Your suggested daily structure spreads short moments of regulation across the day rather than concentrating them in one long session. Each of the four moments targets a different autonomic challenge:

• Morning (3 to 5 minutes). Before getting out of bed, 2 to 3 minutes of slow breathing at about 6 breaths per minute (for example the 4-6 pattern) to promote vagal modulation before the day's demands. This may help especially if mornings are high-symptom for your gut.

• Pre-meal (1 to 2 minutes). One or two minutes of slow breaths before eating to reduce arousal. The evidence here is indirect, supporting a general autonomic down-shift rather than being IBS-specific, but it can help shift the gut into a receive rather than alarm state.

• Midday (5 to 10 minutes). A deliberate pause, like a brief screen-free moment or a short walk. Both are associated with improved HRV or reduced arousal in other settings. The goal is a sympathetic circuit-breaker.

• Evening (5 to 10 minutes). A wind-down practice, such as slow breathing at around 0.1 Hz, gentle movement, or audio-guided relaxation. HRV biofeedback over 4 weeks has improved HRV and subjective sleep in small trials.

One IBS-specific note: in slow-breathing trials, some studies show HRV increases and symptom improvements, while others find microvascular gains without HRV change. Track your own response over 4 to 6 weeks.

Open the in-app Routine Builder now to set your personalised schedule. Choose which moments feel most realistic and build from there. The most important thing is not a perfect schedule, it is a consistent one.`,
    keyTakeaways: ["Consistency over weeks matters more than single long sessions; around 10 to 20 minutes per day can raise vagal-linked HRV", "Morning slow breathing at about 6 breaths per minute can promote parasympathetic modulation", "Pre-meal slow breathing may dampen arousal before eating (indirect evidence)", "Midday and evening pauses with slow breathing or gentle movement support cumulative autonomic balance; small trials show HRV and sleep gains"],
    reflection: "Which of the four daily moments, morning, pre-meal, midday, evening, feels most realistic to start with? What would make it easy enough to do consistently?",
    sessionContext: "This final session in Program 1 is practical, helping users build a structured daily regulation practice of 10-15 min/day across four anchor moments: morning breathing (3-5 min), pre-meal reset (1-2 min), midday pause (5-10 min), and evening wind-down (5-10 min). It references the in-app Routine Builder and emphasises consistency over duration."
  }],
  // Program 2: Calm the Flare Loop (5 sessions)
  c2p2: [{
    title: "Interrupting the Loop in the Moment",
    type: "Education + Practice",
    img: IMGS.c2p2s1,
    body: `When a flare is happening, the instinct is often to either fight it (push through, monitor, try to control symptoms) or flee from it (avoid all food, cancel plans, stay close to a bathroom). Both responses, though completely understandable, are associated with heightened arousal and threat appraisal, which can worsen symptom perception.

Fighting activates more sympathetic arousal (more "fight-or-flight" mode). In IBS, autonomic tests often show reduced vagal tone and relatively greater sympathetic responses to stressors. Safety behaviours such as avoiding food or staying near a bathroom can reinforce threat appraisal and hypervigilance to gut sensations, so although they feel protective, they tend to keep the loop running.

A third option exists: allow the sensations to be present while actively giving your nervous system a different signal. This is not about pretending the flare is not happening. The aim is to reduce central amplification (the brain turning the volume up on gut signals) and autonomic reactivity while the flare is happening.

Slow diaphragmatic breathing at about 6 breaths per minute can acutely increase parasympathetic HRV indices. Even a few slow breaths can reduce perceived arousal, though baroreflex and vagal effects are better demonstrated with structured sessions measured in minutes rather than seconds. Baroreflex changes in IBS specifically are complex and context-dependent.

The 3-Part Flare Response:

Step 1: Notice without judgment. Acknowledge internally: "This is a flare. It is uncomfortable. It will pass." You have been through this before.

Step 2: Shift your posture. Sit or lie in a position that reduces abdominal tension, slightly reclined with knees gently bent tends to work well. Gentle positions that ease abdominal wall tension may help comfort.

Step 3: Slow your exhale. Breathe slowly for 1 to 3 minutes at about 5 to 6 breaths per minute, lengthening the exhale. Breathe in gently through your nose, and out slowly through your mouth, longer than the inhale.

Breathing can reduce visceral pain ratings in experimental settings, though effects may be modest and influenced by attention and catastrophising. You are not trying to eliminate the flare. You are giving the nervous system a different signal, which over time can reduce the loop's intensity.`,
    keyTakeaways: ["Fight-or-flight reactions and safety behaviours are associated with heightened arousal and threat appraisal in IBS", "Allowing sensations while using a calming signal aims to reduce central amplification and autonomic reactivity", "Slow breathing at about 6 breaths per minute can raise vagal-linked HRV and lower arousal; clinical benefit often uses minutes, not seconds", "Use the 3-part response: notice without judgment, ease abdominal tension, breathe slowly for 1 to 3 minutes with a longer exhale"],
    reflection: "When a flare happens, what is your usual response, fighting, fleeing, or something else? What would it look like to try the 3-part response next time?",
    sessionContext: "This session covers how to interrupt the IBS flare loop in the moment: why fighting (pushing through, monitoring) and fleeing (avoidance, cancelling plans) both intensify the loop, and how the 3-part flare response (notice without judgment, shift posture, slow exhale) gives the nervous system a different signal without requiring symptom elimination."
  }, {
    title: "The Anticipatory Anxiety Cycle",
    type: "Education + Practice",
    img: IMGS.c2p2s2,
    body: `Anticipatory anxiety is the pattern of worrying about symptoms before they occur, often creating the very physiological conditions that make them more likely. It is a well-recognised maintaining factor in IBS, linked to symptom severity and quality of life.

The cycle tends to go like this. An upcoming event or situation triggers worry about gut symptoms. The worry can activate the HPA axis (the stress-alarm system) and heighten arousal, which is associated with increased visceral sensitivity and symptom perception. The gut becomes more sensitive. Mast-cell signalling is implicated in stress-related visceral hypersensitivity in animal models and human correlates, though this is a contributing pathway rather than a direct activation from worry alone. Visceral sensitivity rises through stress and arousal pathways combined with central amplification. Symptoms occur or worsen. The brain registers this as cognitive confirmation of threat. Future similar events trigger stronger anticipatory anxiety. The cycle deepens.

Over time, this cycle tends to expand. More situations become associated with threat. The list of "safe" scenarios shrinks. Threat generalisation and safety behaviours contribute to wider avoidance. Spontaneity decreases.

Interrupting anticipatory anxiety does not mean stopping all worry. It means reducing the intensity and duration of anticipatory arousal, and interrupting the stress-to-gut loop early.

Practical tools for anticipatory anxiety:

Identify your highest-anticipation scenarios, the ones that most reliably trigger pre-event symptoms. Name them. This kind of cognitive labelling aligns with CBT mechanisms and can reduce the automatic pull of those situations.

Distinguish specific worry from global worry, and target safety behaviours and catastrophic appraisals. Specific worries (such as "I might need a bathroom") can be problem-solved (locate the bathroom in advance). Global worry (such as "this is going to be a disaster") cannot be problem-solved and needs to be interrupted.

Interrupt with slow breathing and scheduled "worry windows", containing anticipatory thinking to a specific 10-minute time block rather than allowing it to run continuously. Worry windows are a CBT technique for containing perseverative thinking. Evidence in IBS comes via CBT trials that target GI-specific cognitions and behaviours and show symptom and anxiety reductions.

Use brief slow breathing, about 5 to 6 breaths per minute, during anticipatory spikes, and combine it with scheduled worry windows to contain rumination.`,
    keyTakeaways: ["Anticipatory anxiety is a maintaining factor in IBS linked to worse symptoms and quality of life", "The cycle: worry → HPA and stress activation → heightened visceral sensitivity and symptom perception → cognitive confirmation → stronger anticipatory anxiety", "Specific worries can be problem-solved; global catastrophic worry and safety behaviours need interruption and cognitive targets", "Scheduled worry windows and slow breathing help contain anticipatory thinking and arousal"],
    reflection: "Which upcoming events or situations most reliably trigger anticipatory anxiety for you? Is the worry typically specific (I might need a bathroom) or global (this is going to be a disaster)?",
    sessionContext: "This session covers the anticipatory anxiety cycle in IBS: how worry about upcoming events activates the HPA axis and sensitises the gut, producing symptoms that confirm the threat and deepen the cycle. It covers practical interruption tools: identifying high-anticipation scenarios, distinguishing specific from global worry, and using scheduled worry windows and slow breathing."
  }, {
    title: "Hypervigilance, When Monitoring Makes It Worse",
    type: "Education + Practice",
    img: IMGS.c2p2s3,
    body: `Hypervigilance to gut sensations is the tendency to monitor gut activity very closely, checking in repeatedly throughout the day, interpreting normal sensations as threatening, and keeping mental focus on the gut even when symptoms are mild or absent. It is a well-documented maintaining factor in IBS. Higher hypervigilance and visceral anxiety are associated with worse IBS severity and lower quality of life, independent of physiology.

This makes intuitive sense as a coping strategy. If you feel you cannot trust your gut, monitoring it feels like it gives you control. But neurologically, it has the opposite effect. Sustained attention to an internal sensation amplifies the brain's processing of that sensation. Attention to gut cues increases salience-network and limbic engagement in neuroimaging, and reductions in this engagement accompany habituation or therapy. Continued monitoring also maintains a state of arousal (the fight-or-flight pattern).

Associations between hypervigilance and worse outcomes persist even after adjusting for gastrointestinal physiology proxies. Central factors like visceral sensitivity and catastrophising mediate the link between hypervigilance and symptom severity.

The goal is not to stop noticing your gut entirely. The goal is to notice without evaluating. To be aware without being alarmed. Awareness is neutral. Monitoring is threat-oriented.

The body scan practice in this app is specifically designed for this, meaning interoceptive awareness (paying attention to body sensations from the inside) without judgement. Mindfulness and body-scan approaches can reduce catastrophising and gut-focused anxiety and improve symptoms. Body-scan practices have also been shown to improve interoception over about 2 weeks in non-IBS trials. Each time you notice a gut sensation and allow it without immediately evaluating it for threat, you are training the brain's threat-assessment system to respond with slightly less alarm.

This takes repetition. It is genuinely uncomfortable at first. And it is one of the most powerful changes you can make to the day-to-day experience of IBS.`,
    keyTakeaways: ["Hypervigilance to gut sensations is linked to worse IBS severity and quality of life", "Sustained attention amplifies salience of gut sensations; limbic and salience-network changes track symptom improvement with therapy", "Aim for awareness without evaluation, and reduce catastrophising and safety behaviours", "Interventions that target visceral sensitivity and gut-focused anxiety, such as mindfulness and CBT with interoceptive exposure, improve outcomes"],
    reflection: "How often do you check in with your gut throughout the day? Is that checking providing useful information, or is it mostly threat-assessment, looking for signs that something is about to go wrong?",
    sessionContext: "This session covers gut-symptom hypervigilance in IBS: why sustained monitoring amplifies brain processing of gut sensations, the research linking higher hypervigilance to worse IBS severity independent of gut physiology, the distinction between noticing (neutral) and monitoring (threat-oriented), and how the body scan practice in the app trains interoceptive awareness without alarm."
  }, {
    title: "What to Do With Food Fear",
    type: "Education + Practice",
    img: IMGS.c2p2s4,
    body: `Food anxiety in IBS, the pattern of fearing that eating will trigger symptoms, is clinically significant, highly prevalent, and frequently under-addressed. Research documents that many people with IBS progressively restrict their diet not because systematic elimination has identified specific triggers, but because eating itself has become associated with threat.

When eating becomes threat-associated, the anticipatory stress before a meal can activate stress systems (the HPA axis and autonomic arousal). This is associated with heightened visceral sensitivity and motility changes, which can worsen symptom perception. Symptoms then serve as cognitive confirmation, reinforcing the learned threat association, which increases food fear and produces more pre-meal activation. The cycle tightens. Stress-related immune signalling and mast-cell involvement have been implicated in stress-induced visceral hypersensitivity in research models, though direct causal links from meal-anticipatory anxiety specifically are not fully established.

The Low-FODMAP diet is evidence-based. Short-term efficacy is supported by randomised trials and meta-analyses, with a relative risk of remaining symptomatic of about 0.69 and a number needed to treat of around 5, along with improvements in quality of life. Trials emphasise a structured three-phase approach, from restriction to reintroduction to personalisation. Long-term strict restriction is not recommended due to nutritional and microbiota concerns. The diet can inadvertently reinforce the food-fear cycle if restriction is used primarily for safety from anxiety rather than to identify individual thresholds during reintroduction. When that happens, avoidance tends to generalise rather than stabilise.

A more effective approach distinguishes between two patterns. Some foods trigger symptoms through physiological mechanisms, such as specific FODMAPs, fat content, caffeine, or visceral sensitivity. Other foods trigger anticipatory anxiety through a learned fear association, amplified by arousal and visceral sensitivity. Blinded reintroduction can identify individual FODMAP triggers, which are commonly fructans and mannitol.

For the anxiety component specifically, the tools are exposure-based. Gradual food exposure with interoceptive and visceral anxiety targets can reduce symptom impact by decreasing visceral sensitivity. Brief slow breathing at about 5 to 6 breaths per minute before eating helps reduce arousal prior to the meal. Maintain the understanding that the outcome depends partly on your nervous system state, not just the food.

Unhelpful approach: using restriction to feel safe leads to safety behaviours and generalised avoidance, which keep the cycle deepening.

Effective approach: structured reintroduction and personalisation under guidance when possible, exposure-based reintroduction with pre-meal slow breathing, which reduces anticipatory arousal and retrains safety with eating.`,
    keyTakeaways: ["Food anxiety is a learned association that can amplify symptoms via stress-related arousal and visceral sensitivity", "Using restriction primarily to feel safe promotes generalised avoidance; personalise through reintroduction", "The Low-FODMAP diet is evidence-based short-term and most effective when followed by reintroduction and personalisation", "Exposure-based reintroduction with pre-meal slow breathing reduces anticipatory arousal and retrains safety with eating"],
    reflection: "How many foods are you currently avoiding? For each one, are you avoiding it because systematic testing showed it triggers symptoms, or because eating it feels scary regardless of the evidence?",
    sessionContext: "This session covers food anxiety in IBS: how it develops through associative learning (eating paired with aversive outcomes), how it maintains and expands through a fear-restriction-anxiety cycle, the limitation of using Low-FODMAP restriction primarily for anxiety management, and how exposure-based gradual reintroduction in a low-threat context retrains the brain that eating is safe."
  }, {
    title: "Tracking Progress Without Symptom Obsession",
    type: "Practice + Reflection",
    img: IMGS.c2p2s5,
    body: `Tracking your IBS can be genuinely useful, or it can become another form of hypervigilance. The difference lies in how you track, and what you do with the information.

Useful tracking:

Weekly symptom ratings rather than daily. Daily detailed diaries can heighten salience and overestimate severity when compared with real-time ecological sampling, while weekly summaries tend to reduce reactivity.

Pattern identification over time, including stress levels, sleep quality, hormonal cycle, and food patterns. Including context (stress, sleep, cycle) alongside function and quality-of-life markers strongly relates to outcomes.

Quality of life markers, such as what you have been able to do this week compared with last week. These functional gains are among the most critical progress indicators in IBS.

Unhelpful tracking:

Detailed per-bowel-movement ratings and immediate food-symptom attribution. Frequent intra-day checking. Reading symptom lists and mapping them onto yourself. These patterns can reinforce hypervigilance and GI-specific anxiety in some people.

The goal of tracking in IBS management is to identify patterns and measure progress over weeks and months, not to maintain constant surveillance of a perceived threat. If your tracking is increasing your anxiety rather than providing useful information, reduce the frequency and detail, and refocus on patterns.

The science supports this approach. Retrospective end-of-day or weekly recall can inflate pain and stool indices when compared with momentary assessments. Weekly summaries with context and function markers inform management without reinforcing the attentional bias that maintains hypervigilance.

Track to learn. Not to monitor.`,
    keyTakeaways: ["Weekly summaries with context (stress, sleep, cycle) and function markers inform management without reinforcing hypervigilance", "Daily detailed diaries can inflate perceived severity versus real-time sampling", "Quality-of-life and functional gains are critical progress indicators in IBS", "If tracking increases anxiety, reduce frequency and detail and refocus on patterns"],
    reflection: "Are you currently tracking your symptoms? If so, is it providing you with genuinely useful pattern information, or has it become a form of daily monitoring that feeds anxiety?",
    sessionContext: "This session covers the difference between useful IBS tracking (weekly ratings, pattern context, quality of life markers) and unhelpful tracking (daily detailed diaries, logging every food, repeated gut-checking). It explains why weekly summaries are evidence-supported while daily detailed diaries amplify hypervigilance and overestimate symptom severity."
  }],
  // Program 3: Breathing Tools Program (4 sessions)
  c2p3: [{
    title: "Breathing as a Treatment, Not a Trick",
    type: "Education",
    img: IMGS.c2p3s1,
    body: `Slow breathing is often dismissed as a wellness suggestion. In IBS, it is one of the few self-delivered interventions with a documented physiological mechanism and trial evidence for symptom change, particularly in IBS-C.

The mechanism is specific. When you breathe slowly, your diaphragm moves downward on each inhale, engaging cardio-vagal reflexes that increase vagal activity. Your exhale, especially when extended, activates the baroreflex through changes in blood pressure and heart rate. These are not metaphors. They are measurable shifts in autonomic output.

In IBS, this matters because the autonomic nervous system is typically tilted toward sympathetic predominance, with reduced vagal tone (lower high-frequency HRV) documented across multiple studies and meta-analyses. Slow breathing is one of the few tools that directly targets this imbalance.

Why "trick" is the wrong word: a trick distracts you from a sensation. Slow breathing changes the physiology that produces the sensation. It is the same category of intervention as taking a medication that modulates autonomic tone, with a different delivery mechanism.

The sessions in this program will cover the 4-2-6 pattern and why it works, how to match a breathing tool to a specific moment (acute flare vs. daily maintenance vs. pre-sleep), and how to build a sustainable practice. You do not need to be good at breathing to benefit. You just need to do it for long enough that the autonomic changes accumulate.`,
    keyTakeaways: ["Slow breathing is a targeted autonomic intervention, not a relaxation trick", "The diaphragm engages cardio-vagal reflexes; the extended exhale engages the baroreflex", "IBS populations show reduced vagal tone on average, which is exactly what slow breathing addresses", "Benefits accumulate across weeks of consistent practice, not from a single session"],
    reflection: "Has 'just breathe' ever felt dismissive when offered to you? How does framing slow breathing as a physiological intervention, rather than a calming suggestion, change how you approach it?",
    sessionContext: "This session reframes slow diaphragmatic breathing as a targeted physiological intervention with documented mechanism (cardio-vagal reflex engagement via diaphragm, baroreflex engagement via extended exhale) and IBS-specific trial evidence, distinguishing it from vague relaxation."
  }, {
    title: "The 4-2-6 Pattern, In Depth",
    type: "Education + Practice",
    img: IMGS.c2p1s2,
    body: `The 4-2-6 pattern used throughout this app (4 seconds inhale, 2 second hold, 6 seconds exhale) approximates 6 breaths per minute for most adults. Six breaths per minute is not arbitrary. It is the approximate resonance frequency of the cardiovascular system, where respiratory sinus arrhythmia is maximised and the baroreflex is most strongly engaged.

Why the inhale is 4 seconds: long enough to fully engage the diaphragm without triggering the sensation of air hunger. Shallow chest breathing does not engage the cardio-vagal reflexes the same way. The diaphragm needs to move.

Why the hold is 2 seconds: a short hold allows pressure equalisation without straining. Longer breath-holds can shift the autonomic response toward sympathetic activation in some people, which is the opposite of what we are trying to achieve. Two seconds is a pause, not a hold.

Why the exhale is 6 seconds (and why this is the active ingredient): the extended exhale is where most of the vagal activation happens. Exhalation naturally slows the heart rate through vagal modulation, and prolonging the exhale amplifies this effect. If you only remember one thing from this program, remember: the exhale is longer than the inhale.

What the research shows: a 6-week trial at 6 breaths per minute improved IBS-C symptoms, bowel frequency, rectal sensory thresholds, and increased vagal HRV indices versus control. Other pilots have shown mixed outcomes, with microvascular improvements in some trials and symptom improvements in others. The consistent finding is that 6 cycles per minute is a physiologically meaningful target, even if individual resonance varies slightly.

Individual variation: some people find 5.5 breaths per minute more effective, others 6.5. If the 4-2-6 feels slightly off, try 4-2-7 or 3-2-6. The principle is more important than the exact timing.`,
    keyTakeaways: ["6 cycles per minute approximates the cardiovascular resonance frequency for most adults", "The extended exhale is the active ingredient, not the inhale", "A short 2-second pause is a pause, not a strained hold", "Individual resonance varies by 1 to 2 breaths per minute; adjust the pattern to what feels sustainable"],
    reflection: "Try the 4-2-6 pattern for five cycles right now. Did anything feel off, too fast, too slow, or strained? That information tells you whether to tweak the pattern for your own resonance.",
    sessionContext: "This session explains the 4-2-6 breathing pattern in detail: why each component (inhale, hold, exhale) is timed as it is, why the extended exhale is the active ingredient for vagal activation, and how to individualise the pattern around personal resonance frequency."
  }, {
    title: "Matching the Tool to the Moment",
    type: "Education",
    img: IMGS.c2p1s4,
    body: `Not every breathing practice is right for every moment. One of the reasons people abandon breathing as a tool is that they try to use the wrong pattern for the situation, and then conclude "breathing does not work for me."

There are three distinct situations where breathing can help, each with a slightly different approach.

Acute flare or panic moment: when the sympathetic nervous system is already activated, a full 4-2-6 pattern can feel impossible. Air hunger and chest tightness can make a 4-second inhale feel like too much. In these moments, the goal is just to extend the exhale relative to the inhale. Any ratio where the exhale is longer than the inhale will help. Try 2-0-4 (2 in, no hold, 4 out) or 3-0-5. A single slow exhale can reduce perceived arousal. You are not trying to achieve resonance. You are trying to signal safety to the nervous system.

Daily maintenance: this is where the 4-2-6 pattern is most useful. 5 to 10 minutes, once or twice daily, ideally at the same time each day to build the habit. Morning before getting out of bed and evening before sleep are the two most commonly studied windows. The goal here is cumulative autonomic change over 4 to 8 weeks.

Pre-meal or pre-event reset: this is a brief, targeted application. Three to five cycles of 4-2-6 before a meal engages the cephalic phase of digestion, signalling to the gut that it is safe to shift into rest-and-digest mode. Same before a stressful event. You are not trying to calm down entirely. You are trying to shift the autonomic starting state.

The mistake most people make is trying to use daily-maintenance breathing during an acute flare, or treating the pre-meal reset as something that needs to be a full session. Matching the tool to the moment is the difference between breathing that feels effortful and breathing that becomes part of how you navigate the day.`,
    keyTakeaways: ["Acute moments need a longer exhale than inhale, at whatever ratio is achievable", "Daily maintenance works best at 4-2-6 for 5 to 10 minutes, once or twice per day", "Pre-meal and pre-event resets only need 3 to 5 cycles to shift the autonomic starting state", "Using the wrong pattern for the moment is the most common reason people abandon breathing as a tool"],
    reflection: "Think of a recent situation where you tried to use breathing and it did not help. Which category was it, acute, daily, or pre-event? Was the pattern you used matched to the moment?",
    sessionContext: "This session explains how to match different breathing patterns to different situations: modified short-exhale patterns for acute flares or panic, the full 4-2-6 for daily maintenance, and brief 3-5 cycle resets for pre-meal or pre-event use."
  }, {
    title: "Building a Daily Breathing Practice",
    type: "Education + Habit",
    img: IMGS.c2p3s4,
    body: `The evidence is clear that benefits from slow breathing are cumulative. A single session can produce measurable acute changes in vagal markers, but durable symptom change in IBS trials requires 4 to 8 weeks of consistent practice, typically 10 to 20 minutes daily.

This is where most people struggle. The physiology is trainable, but the habit is not automatic. Three principles make the difference between a practice that lasts and one that fades in a week.

Principle 1: Anchor it to something you already do. The most reliable habit triggers are physical routines that already happen daily. Before getting out of bed. Before your morning tea or coffee. After brushing your teeth at night. Before turning off the bedside lamp. The breathing does not need to be added as a new appointment. It needs to be attached to something existing.

Principle 2: Consistency beats duration. Three minutes every day for a month produces more cumulative autonomic benefit than twenty minutes once a week. If your practice feels too long, cut the duration. Do not cut the frequency. The nervous system is responding to the repeated signal, not the total minutes.

Principle 3: Track subjectively, not obsessively. In the first 2 to 4 weeks, you may not notice much. Vagal training is subtle. Rather than watching for symptom change daily (which feeds hypervigilance), check in weekly: am I sleeping slightly better? Do I feel slightly less reactive in the afternoon? Is my morning gut slightly different? Small shifts compound.

What not to do: do not treat breathing as a rescue tool you deploy only during flares. You will get some benefit, but you will miss the larger change that comes from training the system when it is already calm. Flare breathing works best when your baseline is already being trained.

The in-app Breathing Pacer, the Routine Builder, and the scheduled anchors (Morning Breathing at 07:15, Bedtime Breathing at 22:00) are designed to make this easier. Use them.`,
    keyTakeaways: ["Durable IBS benefit requires 4 to 8 weeks of consistent daily practice, not occasional sessions", "Anchor the practice to an existing daily routine rather than creating a new appointment", "Consistency matters more than duration: 3 minutes daily beats 20 minutes weekly", "Flare breathing works best when baseline autonomic tone is already being trained"],
    reflection: "What existing daily routine could you anchor your breathing practice to? Pick one anchor moment you are willing to commit to for the next 14 days.",
    sessionContext: "This session covers how to build a sustainable daily breathing practice: habit anchoring to existing routines, prioritising consistency over duration, tracking subjective weekly changes rather than obsessive daily monitoring, and the importance of training baseline autonomic tone rather than relying only on rescue breathing."
  }],
  // CATEGORY 3: REBUILD TRUST
  c3p1: [{
    title: "Why You Don't Trust Your Body Anymore",
    type: "Education + Validation",
    img: IMGS.c3p1s1,
    body: `IBS does not just affect your gut. It affects your relationship with your own body. Over time, a body that has been unpredictable and painful becomes a body that cannot be trusted.

This loss of trust is one of the most underacknowledged consequences of living with IBS. It is linked to gut-brain dysregulation, with increased arousal, symptom hypervigilance, and visceral hypersensitivity that can lower pain thresholds and alter motility. In neutral moments the sympathetic branch can remain more active than it needs to be, keeping the body in a low-grade alert state. IBS cohorts show lowered rectal pain and urge thresholds and central amplification of visceral signals, meaning the brain treats normal gut information as louder than it should be.

Distrust of the body is not just an emotional experience. It is a loop. The body sends a sensation, the brain interprets it as threat, the nervous system responds with alarm, and the gut becomes more reactive. GI-specific anxiety and hypervigilance can amplify perception and maintain symptoms through attentional and affective pathways.

Understanding this loop is the first step to changing your relationship with your body. Not through positive thinking, but through a genuine biological understanding of what is happening and a gradual, evidence-based process of rebuilding. Mindfulness-based and CBT-based approaches have been shown to reduce IBS severity by decreasing visceral anxiety and catastrophising and by shifting the brain toward nonreactive awareness of gut sensations.`,
    keyTakeaways: ["Body distrust in IBS reflects unpredictability, and GI-specific anxiety and hypervigilance can sustain symptoms", "Increased arousal and visceral hypersensitivity lower pain thresholds and can alter motility", "Rebuilding trust benefits from mechanisms (such as mindfulness and CBT) that reduce visceral anxiety and catastrophising"],
    reflection: "When did you first start distrusting your body? What specific experiences created that distrust? What would a more neutral relationship with your body feel like?",
    sessionContext: "This session introduces body distrust in IBS as a physiological loop that sustains the symptoms it is trying to manage."
  }, {
    title: "The Difference Between Noticing and Monitoring",
    type: "Education + Practice",
    img: IMGS.c3p1s2,
    body: `There is a meaningful difference between noticing your body and monitoring your body. Most people with IBS have learned to monitor, and the monitoring is making things worse.

Noticing is neutral awareness. You register that a sensation is present without immediately evaluating what it means, rating its severity, or predicting what it will become. Noticing is information without alarm.

Monitoring is evaluative, threat-oriented scanning. Every gut sensation is immediately classified. Is this bad? How bad? Is this the start of a flare? Monitoring promotes threat-oriented attention and anticipatory anxiety, which heighten the salience of gut sensations and can amplify symptom perception.

The distinction matters because sustained symptom monitoring increases the neural and attentional resources your brain allocates to the sensation, which increases perceived intensity. This is what researchers call hypervigilance. Repeated exposure to gut sensations with less threat appraisal is associated with habituation of arousal and decreased anticipatory limbic activation in IBS, meaning the brain's alarm system gradually calms when sensations are met with curiosity rather than alarm.

The body scan practice in this app is specifically designed to train the shift from monitoring to noticing. Trials show that mindfulness-based training can reduce IBS severity by increasing nonreactivity to gut-focused anxiety and by reducing catastrophising.`,
    keyTakeaways: ["Noticing is nonreactive awareness; monitoring is threat-oriented scanning that amplifies gut sensations via hypervigilance", "Sustained attention increases attentional processing of gut sensations, which makes the gut 'louder'", "Body-scan and mindfulness approaches can train the shift from evaluative monitoring to curious noticing and reduce IBS severity"],
    reflection: "How often do you check in with your gut throughout the day? Is the checking providing useful information, or is it functioning as threat-scanning that makes things worse?",
    sessionContext: "Explains the neurological difference between noticing and monitoring in IBS."
  }, {
    title: "Separating Sensation from Story",
    type: "Education + Practice",
    img: IMGS.c3p1s3,
    body: `When a gut sensation arrives, two things happen almost simultaneously. The first is the sensation itself, such as pressure, movement, or cramping. The second is the interpretation your brain rapidly generates, for example catastrophising ("this will ruin my day" or "this is never going to get better").

In IBS, attention and interpretation often fuse with sensation due to hypervigilance and visceral hypersensitivity, so most people experience them as one thing. But they are genuinely two different things. The sensation is physical information. The interpretation is a cognitive layer the brain adds based on prior experience, fear, and learned patterns.

This matters because threat-based interpretations increase arousal and the salience of gut sensations and can engage stress systems. Catastrophic interpretations heighten anticipatory anxiety and central arousal, which amplifies perception and the impact of symptoms. The story becomes a self-fulfilling prediction.

Separating sensation from story starts with noticing the moment the story begins and naming it as a story rather than a fact. The pressure is real. The story is a prediction, not a certainty. Mindfulness and CBT trials show that reducing catastrophising and visceral anxiety lowers IBS severity over time.`,
    keyTakeaways: ["Sensation and story are distinct; hypervigilance in IBS tends to fuse them", "Interpretations that signal threat increase arousal and amplify symptoms", "Creating a gap between sensation and interpretation is change-producing and is supported by mindfulness and CBT data"],
    reflection: "The next time you notice a gut sensation, try to identify the moment the story begins. What does the story say? Is there a small gap between the sensation and the story?",
    sessionContext: "Covers the cognitive-physiological fusion of sensation and story in IBS."
  }, {
    title: "Small Acts of Trust",
    type: "Education + Practice",
    img: IMGS.c3p1s4,
    body: `Trust is rebuilt through small, repeated approach behaviours, which in psychological terms is called graded exposure. These actions provide corrective evidence: "this was manageable."

This reflects exposure principles that have been shown to reduce visceral anxiety and sensitivity and to improve symptoms in IBS. Every time you approach a feared situation rather than avoiding it, you give your nervous system new information. Every time you eat a previously avoided food, attend an event without a detailed exit strategy, or take a short trip without worst-case planning, you add one more piece of evidence: "I can manage this." When exposure is combined with mindfulness components, the improvements tend to hold over months.

The key word is small. The first step is the easiest thing that still feels like a stretch. Each action, however small, builds the physiological substrate for trust. Targeting safety behaviours and avoidance is central to this process, and reductions in those behaviours are what mediate improvement.

Consistency over time matters more than the size of individual steps. Three small acts of trust per week, maintained over months, produces more lasting change than one dramatic exposure followed by nothing.`,
    keyTakeaways: ["Trust is rebuilt through graded exposure: small, repeated approach actions", "Each small act gives the nervous system new, disconfirming evidence", "Consistency and targeting safety behaviours matter more than the intensity of any single step"],
    reflection: "What is one small act of trust you could take this week? Not the ultimate goal, but one small step toward it.",
    sessionContext: "Covers the exposure-based mechanism for rebuilding body trust in IBS."
  }, {
    title: "Grieving What IBS Has Taken",
    type: "Reflection + Education",
    img: IMGS.c3p1s5,
    body: `Before rebuilding can genuinely happen, something else often needs to happen first. It is honest acknowledgement of what has been lost.

IBS commonly reduces quality of life across social, work, and dietary domains, with impairments comparable to some severe chronic diseases. Spontaneity. Confidence. Freedom around food. The ability to travel easily. Comfort in your own body. Professional opportunities declined, relationships strained, experiences avoided. These losses often accumulated so gradually that there was never a clear moment to grieve them.

Psychological burden (anxiety, depression, and low life satisfaction) frequently co-occurs with IBS and is linked to worse daily functioning. Rather than presenting as intense sadness, this can look like low-grade depression, reduced motivation, or resigned numbness toward the management work.

Acknowledging losses and the identity changes that come with chronic illness is valid, and identity impacts well-being in functional GI disorders. Naming what IBS has taken is the first step toward deciding what to reclaim. There is also a specific loss worth naming, the loss of the version of yourself who ate without calculation and who said yes without running through risk assessments. Grieving that person is legitimate. Fear of gastrointestinal symptoms and catastrophising are key drivers of reduced quality of life, and both can be specifically targeted in care.`,
    keyTakeaways: ["IBS meaningfully reduces quality of life across multiple life domains; acknowledging losses is warranted before rebuilding", "Psychological burden often presents as anxiety, depression, and reduced life satisfaction, linked to impairment", "Naming losses and illness-identity shifts is accurate and can inform what to reclaim"],
    reflection: "Make a specific list of what IBS has taken from your life. Then identify what you most want to work toward reclaiming.",
    sessionContext: "Covers grief as a necessary step in IBS recovery, validating grief for the pre-IBS self."
  }, {
    title: "What a Better Relationship with Your Body Looks Like",
    type: "Education + Reflection",
    img: IMGS.c3p1s6,
    body: `Recovery often reflects a changed relationship to symptoms rather than their disappearance. A better relationship with your body does not mean a body without symptoms. It means a body you can live with, work with, and exist alongside without constant alarm.

Improved outcomes correlate with lower GI-specific anxiety, catastrophising, and stress, even when symptoms persist. The gut still has difficult days. Flares still happen. But they are no longer the organising principle of every decision.

What this looks like in practice: eating a meal and being present in the conversation rather than tracking every gut sensation. Accepting a social invitation without calculating exit strategies. Waking up and noticing your gut without immediately assessing whether today will be a good or bad day. Mindfulness and CBT-based treatments help cultivate this nonreactive awareness and reduce GI-specific anxiety, improving symptoms and quality of life.

Trials of exposure- and mindfulness-based therapies show durable improvements in IBS. Effects can be large, with some studies reporting 42 to 53 percent symptom reductions maintained at 15 to 18 months. The goal is not zero symptoms. It is a different relationship with the body you have.`,
    keyTakeaways: ["A better relationship with your body means living alongside symptoms without constant alarm, not zero symptoms", "Recovery is consistently described as changed appraisal (less GI-specific anxiety and catastrophising), not symptom eradication", "Mindfulness, CBT, and exposure-based therapies show durable symptom and quality-of-life improvements in randomised and implementation studies"],
    reflection: "What would a better relationship with your body look like specifically for you? What would be different about your daily life?",
    sessionContext: "Describes what meaningful IBS recovery looks like based on research."
  }],
  c3p2: [{
    title: "How Food Fear Develops",
    type: "Education + Diagram",
    img: IMGS.c3p2s1,
    body: `Food fear in IBS follows a predictable and documented pathway. It begins with a real experience: food is eaten, a flare occurs, and the brain registers the connection. The food is blamed and avoided. Avoidance reduces anxiety temporarily, which reinforces the avoidance. Anticipatory stress develops before eating, which activates the gut before the meal begins. The activated gut is more reactive. A flare occurs again, possibly with a different food. That food is now also blamed. The list grows.

The evidence is clear that broad dietary restriction beyond a structured, time-limited protocol is not recommended for IBS management. Permanent restriction maintains fear without addressing the underlying dysregulation. Treatment for food fear is not more restriction. It is graduated exposure, nervous system regulation, and the systematic rebuilding of a flexible relationship with eating.`,
    keyTakeaways: ["Food fear follows a documented loop: symptom experience leads to avoidance, which generates anticipatory stress.", "Avoidance maintains the hypervigilant gut-brain axis and progressive restriction.", "Treatment is graduated exposure and nervous system regulation, not more restriction."],
    reflection: "Trace your own food fear history. What were the first foods you began avoiding? What has the cost of restriction been?",
    sessionContext: "Explains the food fear development loop in IBS."
  }, {
    title: "The Low-FODMAP Reintroduction Process",
    type: "Education + Protocol",
    img: IMGS.c3p2s2,
    body: `The Low-FODMAP diet is the most evidence-based dietary intervention for IBS, with response rates of approximately 50 to 70 percent in well-designed trials. But it is widely misapplied, usually because people complete Phase 1 and stop.

It is a three-phase protocol, not a permanent diet. Phase 1 is strict elimination for four to six weeks. Phase 2 is systematic reintroduction, one FODMAP category at a time, in controlled portions. Phase 3 is personalisation, returning to eating as broadly as possible, avoiding only the specific foods in specific quantities that you have established as problematic.

Remaining in Phase 1 indefinitely is the most common mistake. It maintains unnecessary restriction, reduces gut microbiome diversity, and does not identify your actual individual triggers. The reintroduction process should be guided by a registered dietitian with IBS experience.`,
    keyTakeaways: ["The Low-FODMAP diet is a three-phase protocol, not a permanent diet.", "Phase 2 identifies your specific triggers. Phase 3 is the goal.", "Remaining in Phase 1 indefinitely reduces microbiome diversity without identifying individual triggers."],
    reflection: "Which phase are you in? If you completed Phase 1 and stopped, what stopped you from doing Phase 2?",
    sessionContext: "Explains the three-phase Low-FODMAP protocol."
  }, {
    title: "The Food Fear Hierarchy",
    type: "Education + Practice",
    img: IMGS.c3p2s3,
    body: `A food fear hierarchy is a structured list of feared foods arranged from least frightening to most frightening. The principle of graduated exposure is to start at the bottom, not the top. The first food to approach is the one that feels manageable. Starting where success is most likely builds nervous system evidence that approach is survivable.

When you eat a previously avoided food, two things determine what your gut does with it: the actual FODMAP or trigger content, and your nervous system state when you eat it. If you eat in anticipatory anxiety, your gut receives it in a sensitised state. If you eat it using the pre-meal reset, the same food reaches a calmer gut.

The food fear hierarchy works best in combination with the autonomic regulation tools in this app.`,
    keyTakeaways: ["A food fear hierarchy ranks avoided foods from least to most frightening.", "Graduated exposure starts at the bottom because early successes build nervous system evidence.", "The same food reaches a different gut depending on your nervous system state when you eat it."],
    reflection: "List five avoided foods ranked from least to most feared. Which one could you approach this week in a calm context using the pre-meal reset?",
    sessionContext: "Explains the food fear hierarchy as a tool for graduated food exposure."
  }, {
    title: "Eating in Social Situations",
    type: "Education + Practice",
    img: IMGS.c3p2s4,
    body: `Social eating difficulty has two distinct components. The first is logistical: not knowing what will be available, not knowing where the bathroom is. The second is relational: the fear of symptoms being visible, the burden of explaining dietary needs.

Logistical difficulties are largely solvable through practical preparation: researching the menu, identifying the bathroom, eating a small safe snack before. These are practical adaptations, not safety behaviours that maintain fear.

Relational difficulties are fundamentally about shame, best addressed through calibrated disclosure: sharing enough that people who matter understand, without making every interaction about your gut.

The pre-meal reset practice is particularly useful before social eating. One to three slow breaths before sitting down changes the state in which your gut receives the meal.`,
    keyTakeaways: ["Social eating has two components: logistical and relational.", "Logistical barriers are largely solvable through practical preparation without avoidance.", "Calibrated disclosure shares enough for understanding without making IBS the organising principle of every interaction."],
    reflection: "Was the last social eating situation you avoided primarily logistical or relational? What one practical step could have made it more manageable?",
    sessionContext: "Separates social eating difficulty into logistical and relational components."
  }, {
    title: "Rebuilding a Relationship with Food",
    type: "Education + Reflection",
    img: IMGS.c3p2s5,
    body: `The goal of managing food in IBS is not a long list of safe foods. The goal is a flexible, unafraid relationship with eating.

A safety-list approach always moves toward more restriction. A flexibility approach moves toward a broader diet, more social ease, more spontaneity. The research is clear that flexibility is the more evidence-supported long-term goal. Dietary restriction beyond individually identified thresholds does not improve IBS outcomes and reduces microbiome diversity.

Rebuilding involves three parallel tracks: knowledge (understanding which foods you actually react to, at what doses), nervous system regulation (reducing baseline gut activation), and graduated exposure (systematically reintroducing avoided foods).`,
    keyTakeaways: ["The goal is a flexible, unafraid relationship with eating, not a fixed list of safe foods.", "Safety-list approaches get smaller over time. Flexibility approaches get larger.", "Long-term excessive restriction reduces microbiome diversity and worsens gut-brain dysregulation."],
    reflection: "What would eating feel like if food were mostly background noise rather than the main character of your day?",
    sessionContext: "Frames flexible eating as the evidence-supported long-term goal."
  }],
  c3p3: [{
    title: "IBS and Anxiety: Which Came First?",
    type: "Education + Diagram",
    img: IMGS.c3p3s1,
    body: `IBS and anxiety co-occur frequently. About 40 to 55 percent of IBS patients report clinically significant anxiety in large cohorts. The two conditions share a bidirectional biological loop that sustains both.

Shared features include hypothalamic-pituitary-adrenal (HPA) axis dysregulation and altered autonomic function, specifically lower parasympathetic or vagal tone and higher sympathetic reactivity. Serotonergic signalling differences are also reported in both conditions.

Because the biology overlaps, tools that address the anxiety component often address the IBS component too. CBT for IBS, gut-directed hypnotherapy, and regular aerobic exercise and breathing practices have all been shown to improve both global IBS symptoms and anxiety.`,
    keyTakeaways: ["IBS and anxiety co-occur in about 40 to 55 percent of cases and sustain each other via gut-brain pathways", "Shared HPA and autonomic dysregulation, with serotonergic differences observed", "CBT and gut-directed hypnotherapy improve both IBS symptoms and distress"],
    reflection: "How do you experience the relationship between anxiety and your gut symptoms? Does anxiety clearly precede symptoms, or do symptoms generate anxiety?",
    sessionContext: "Covers the documented co-occurrence of IBS and anxiety."
  }, {
    title: "Perfectionism, Control, and the Gut",
    type: "Education + Reflection",
    img: IMGS.c3p3s2,
    body: `Control-seeking behaviour in IBS is initially rational. When your body is unpredictable, planning and controlling the environment reduces uncertainty and therefore reduces anxiety.

The problem is that control-seeking behaviour maintains the anxiety it is trying to manage. IBS-specific anxiety and hypervigilance correlate with greater symptom burden and altered autonomic function. By treating uncertainty as dangerous, control-seeking reinforces the nervous system's assessment that uncertainty is dangerous. The more successfully you control your environment, the more frightening uncontrolled environments become. The world shrinks, but the anxiety does not.

Perfectionism operates similarly. Treating symptoms as failures and treating bad days as evidence of insufficient management creates chronic self-evaluation that sustains sympathetic activation. Sustained sympathetic arousal is a characteristic finding in IBS under stress testing, so this is not only psychological, it is physiological.`,
    keyTakeaways: ["Control-seeking maintains IBS-specific anxiety and sensitisation, even though it begins as a rational response", "Treating uncertainty as dangerous sustains the nervous system's threat appraisal and arousal", "Perfectionism and self-evaluation can maintain sympathetic activation, which aligns with stress-testing findings in IBS"],
    reflection: "In what ways does control-seeking show up in your IBS management? What situations do you avoid because they cannot be controlled?",
    sessionContext: "Covers the relationship between perfectionism, control-seeking, and IBS maintenance."
  }, {
    title: "People-Pleasing and Physical Symptoms",
    type: "Education + Reflection",
    img: IMGS.c3p3s3,
    body: `People-pleasing, the chronic tendency to prioritise others' needs over one's own, is linked with higher distress. IBS cohorts score higher than matched controls on social evaluation concern and emotional suppression. When your own needs are consistently suppressed, the sympathetic nervous system can carry a chronic background load.

In IBS this is particularly relevant because heightened sympathetic drive and altered stress reactivity are documented in the condition. Chronic overcommitment, difficulty saying no, and suppression of frustration are not just emotional patterns. They can lower symptom thresholds physiologically.

Research on IBS consistently finds higher scores on measures of trait anxiety, social evaluation concern, and suppression of emotional expression than matched controls. These are learned adaptations that have become self-sustaining.`,
    keyTakeaways: ["Chronic self-silencing or overcommitment can maintain sympathetic load and lower symptom thresholds", "IBS cohorts show higher social evaluation concern and emotional suppression than matched controls", "The practical skill is noticing when you are saying yes while your body is signalling no"],
    reflection: "How often do you say yes when your body is signalling no? What happens in your gut in the hours after a major overcommitment?",
    sessionContext: "Covers the relationship between people-pleasing patterns, chronic sympathetic load, and IBS."
  }, {
    title: "Distress Tolerance: Managing Difficult Moments",
    type: "Education + Practice",
    img: IMGS.c3p3s4,
    body: `Distress tolerance is the capacity to experience uncomfortable emotions, sensations, or situations without immediately acting to escape or eliminate them. Lower distress tolerance and GI-specific anxiety predict symptom amplification in IBS, so building this capacity is one of the more useful psychological targets.

The window of tolerance refers to the zone of activation in which a person can experience discomfort, process it, and continue functioning. In IBS, this window is often very narrow. Any gut sensation above a low threshold triggers rapid escape behaviours, like seeking the bathroom, cancelling plans, or catastrophising. These rapid escape responses align with heightened sympathetic activation and reinforce symptom attention, which keeps the loop running.

The way to widen the window is to practise staying inside it, which means experiencing discomfort without immediately acting to eliminate it. Uncomfortable is not the same as dangerous.`,
    keyTakeaways: ["Distress tolerance is the capacity to experience discomfort without immediate escape", "Rapid escape responses align with heightened sympathetic activation and amplify arousal and symptoms", "Uncomfortable is not the same as dangerous"],
    reflection: "What is your typical response to an uncomfortable gut sensation? How quickly does the escape response arrive?",
    sessionContext: "Covers distress tolerance as a key IBS skill."
  }, {
    title: "When IBS and Depression Co-occur",
    type: "Education + Compassion",
    img: IMGS.c3p3s5,
    body: `Depression and IBS co-occur in roughly 25 to 50 percent of cases depending on setting and how it is measured. Shared mechanisms include HPA axis dysregulation and serotonergic differences. Chronic symptom burden can contribute biologically to mood changes over time.

Depression in IBS often presents differently from classic depression. Rather than prominent sadness, it may present as low motivation to engage with IBS management, resigned acceptance that things will not improve, and reduction in meaningful activities. This presentation is sometimes missed because it can look like realistic appraisal of a chronic condition.

Depression after chronic IBS is a biological consequence of chronic pain and dysregulation, not a personal failing. It is treatable. Speak with your GP.

Learn more about your needs and questions through the tools and sessions in this app. Then use those as directed questions for your care team the next time you go.`,
    keyTakeaways: ["IBS and depression co-occur in roughly 25 to 50 percent of cases", "Depression in IBS often presents as low motivation and resigned acceptance rather than prominent sadness", "Depression after chronic IBS is a biological consequence of chronic dysregulation, not a personal failing, and it is treatable"],
    reflection: "Do you recognise depression patterns in yourself in relation to your IBS? If so, have you discussed this with your clinician?",
    sessionContext: "Covers the co-occurrence of depression and IBS. This is a sensitive topic and support is available through your GP."
  }, {
    title: "Building Psychological Flexibility",
    type: "Education + Practice",
    img: IMGS.c3p3s6,
    body: `Psychological flexibility is the capacity to act in accordance with your values even when difficult thoughts, emotions, or physical sensations are present. It is not the absence of discomfort. It is the ability to have discomfort and still move.

In IBS, psychological flexibility means being able to attend a dinner even when your gut is uncertain. Or accepting a work invitation even when you cannot guarantee a symptom-free day.

Acceptance and Commitment Therapy (ACT) distinguishes experiential avoidance (effort to suppress or escape unwanted experiences) from valued action (moving toward what matters with your experience present). Each time you act on values despite discomfort, the capacity expands slightly.

CBT and gut-directed hypnotherapy are the two best-evidenced therapies for acting on this capacity. They reduce the risk of remaining symptomatic with a relative risk of roughly 0.61 to 0.67 compared with controls. Group or higher-dose hypnotherapy tends to show the largest effects.`,
    keyTakeaways: ["Psychological flexibility is the capacity to act on values despite difficult internal experiences", "CBT and gut-directed hypnotherapy have proven efficacy for global IBS symptoms", "The shift is achieved through repeated small valued actions that build capacity over time"],
    reflection: "What are the two or three things you most value that IBS has made difficult? What would one small valued action look like, with your current symptoms?",
    sessionContext: "Introduces psychological flexibility from ACT."
  }],
  c3p4: [{
    title: "Mapping What IBS Has Taken and What You Want Back",
    type: "Reflection + Direction",
    img: IMGS.c3p4s1,
    body: `IBS progressively narrows life through avoidance. This session is an inventory: an honest accounting of what IBS has actually taken from your specific life.

The inventory has two columns. Column 1: what has been limited, reduced, or eliminated. Column 2: what you most want to reclaim.

The value is specificity. Vague goals like wanting to feel better are too abstract. Specific goals like wanting to travel internationally, or wanting to eat out with friends without planning for an hour beforehand, produce concrete direction.

The programs in this category are built around specific life domains: relationships, travel, work, spontaneity.`,
    keyTakeaways: ["IBS narrows life gradually through avoidance.", "An honest inventory of losses is the prerequisite for directed recovery.", "Specific goals drive action more effectively than vague goals about feeling better."],
    reflection: "Complete the two-column inventory. Column 1: what has IBS limited? Column 2: what do you most want back?",
    sessionContext: "Guides a specific inventory of what IBS has taken and what to reclaim."
  }, {
    title: "Travel with IBS",
    type: "Education + Practice",
    img: IMGS.c3p4s2,
    body: `Travel challenges fall into three categories: dietary, logistical, and nervous system.

Dietary preparation: researching food options, identifying accessible restaurants, packing safe snacks. Logistical preparation: identifying bathrooms in advance reduces anticipatory anxiety and pre-travel gut activation. Nervous system: maintaining breathing practice during travel and doing the morning arrival reset before getting up in a new place provides regulation anchors.

The goal for the first trip is not a perfect trip. The goal is one trip. After one trip, the nervous system has new evidence that travel is survivable.`,
    keyTakeaways: ["Travel challenges fall into three categories: dietary, logistical, nervous system.", "Practical preparation reduces anticipatory anxiety and pre-travel gut activation.", "The goal is one trip, not a perfect trip."],
    reflection: "What specifically stops you from travelling? Which category could you address most practically in the next month?",
    sessionContext: "Covers the three categories of travel challenges and preparation strategies."
  }, {
    title: "Relationships and IBS: Communicating What You Need",
    type: "Education + Practice",
    img: IMGS.c3p4s3,
    body: `Social connection improves vagal tone. Isolation reduces it. Two common communication patterns make things harder: silence (managing alone, cancelling plans without explanation) and over-explaining (making IBS the organising principle of every interaction).

What the research supports is calibrated disclosure: sharing enough that the people who matter to you understand, without making every interaction about your gut. Calibrated disclosure sounds like: I have a gut condition that is affected by stress and certain foods. Some days I need to plan more carefully. It does not mean I cannot do things. It means I sometimes need flexibility.`,
    keyTakeaways: ["Social connection directly affects vagal tone. Isolation has physiological costs.", "Calibrated disclosure shares enough for understanding without making IBS the organising principle.", "Naming what actually helps is more useful than explaining every symptom."],
    reflection: "Think about one relationship where IBS communication has been difficult. What would calibrated disclosure look like there?",
    sessionContext: "Covers IBS communication patterns and the calibrated disclosure framework."
  }, {
    title: "Work and Study with IBS",
    type: "Education + Practice",
    img: IMGS.c3p4s4,
    body: `The morning problem is the most commonly reported work difficulty. Many people with IBS have their most symptomatic hours in the morning, conflicting with standard start times. Practical strategies: protecting mornings by not scheduling high-stakes commitments during peak symptom times, building buffer time, identifying bathroom access along the route.

In many countries, IBS qualifies for workplace and academic accommodations: flexible start times, work-from-home on difficult days, exam accommodations. Clinical framing works better than symptom description: I have a medically diagnosed chronic gut condition that affects my schedule on some days. I would benefit from occasional flexibility.`,
    keyTakeaways: ["The morning problem and the performance problem are the two most common IBS challenges at work or school.", "Many practical adaptations can be made independently without disclosure.", "IBS qualifies for formal accommodations in many countries."],
    reflection: "Which part of your work or study life is most affected by IBS? What is one concrete change you could make this week?",
    sessionContext: "Covers IBS in work and academic contexts."
  }, {
    title: "Returning to Spontaneity",
    type: "Education + Practice",
    img: IMGS.c3p4s5,
    body: `Spontaneity returns through graduated re-engagement, not through deciding to stop worrying. Every time you approach a spontaneous situation rather than avoiding it, you give your nervous system new information: this was manageable.

The measure of success is not whether you had symptoms. The measure is whether you went. Whether you came back from it and the world remained intact.

The first few re-engagements are the hardest because the nervous system's prediction of danger is strongest when the avoidance pattern is most established. Each subsequent re-engagement is slightly easier.`,
    keyTakeaways: ["Spontaneity returns through graduated re-engagement, not through deciding to stop worrying.", "Success is measured by whether you went, not whether you had symptoms.", "Each re-engagement provides nervous system evidence that lowers threat prediction."],
    reflection: "What is one spontaneous situation you have been avoiding that you want back? What is the smallest version of re-engaging with it?",
    sessionContext: "Covers the mechanism of returning to spontaneity through graduated re-engagement."
  }],
  c3p5: [{
    overview: true,
    title: "Overthinking, Uncertainty and Symptom Monitoring",
    type: "Education + Diagram",
    img: IMGS.c3p5,
    body: `This program covers five maintaining factors in IBS that current guidelines treat as modifiable gut-brain targets: the hypervigilance loop, intolerance of uncertainty, the reassurance trap, cognitive defusion, and learning to live with not knowing. Fear of symptoms, catastrophising, and attentional bias are all central drivers in the evidence.

The hypervigilance loop involves sustained attention to gut sensations, which increases the brain's processing of those sensations. Neuroimaging shows uncertainty heightens cingulate and thalamic responses to identical rectal stimuli in IBS, supporting a vigilance mechanism. Monitoring also keeps the sympathetic system active through constant threat-scanning. IBS patients show elevated sympathetic arousal and stress reactivity, and CBT can reduce anxiety even when autonomic reactivity persists.

Intolerance of uncertainty drives anticipatory anxiety, and is linked to worse affect and maladaptive coping in gastrointestinal disease. The reassurance trap reduces anxiety briefly and then escalates it. Brief reassurance can reduce perceived impairment acutely but does not provide durable change, which reinforces reassurance-seeking cycles. Cognitive defusion means creating distance from anxious thoughts rather than fusing with them, and defusion and acceptance elements from Acceptance and Commitment Therapy show early promise for IBS symptoms and quality of life. Living with not knowing is the trained capacity to proceed despite uncertainty rather than waiting for its absence.

Evidence-based interruption methods matter here. Exposure-based CBT that reduces safety behaviours and catastrophising decreases IBS severity, and behavioural change often precedes cognitive and anxiety change. Randomised trials show CBT (telephone or web-based) improves IBS symptom severity by around 35 to 62 points at 12 months versus usual care, and benefits persist to 24 months. Interoceptive and food-exposure interventions specifically reduce visceral sensitivity and symptom severity beyond stress management alone.`,
    keyTakeaways: ["Hypervigilance, intolerance of uncertainty, reassurance-seeking, and cognitive fusion all maintain IBS; fear and catastrophising are central per guidelines", "Monitoring amplifies gut sensations through increased neural processing; uncertainty increases central pain-network activation", "Cognitive defusion creates distance from anxious thoughts without fighting them; acceptance-based strategies can complement CBT", "Exposure-based CBT that reduces safety behaviours and catastrophising decreases IBS severity, with benefits persisting to 12 to 24 months"],
    reflection: "Which of these five patterns do you most recognise in yourself? Which feels most worth working on first?",
    sessionContext: "Combined overview of the five sessions in Program 5."
  },
  // Restored individual sessions (April 2026 build chat)
  {
    title: "The Hypervigilance Loop: How Monitoring Maintains Symptoms",
    type: "Education + Diagram",
    img: IMGS.c3p5,
    body: "Hypervigilance is not a character flaw. In the context of IBS, it is a completely understandable response to a body that has been unpredictable and painful. If you cannot trust your gut, monitoring it feels like the only way to maintain some control. Checking in. Scanning for early warning signs. Tracking every sensation for evidence of what might be coming.\n\nThe problem is that neurologically, hypervigilance does the opposite of what it intends. Instead of creating control, it amplifies exactly what you are trying to manage.\n\nHere is the mechanism: sustained attention to any body sensation increases the brain's processing of that sensation. This is not metaphorical. It is a documented feature of how the nervous system allocates processing resources. When you repeatedly direct attention toward your gut, the brain dedicates more neural processing to gut signals. More processing means more amplification. Sensations that would have been below the threshold of conscious awareness in a non-hypervigilant state are now detected, evaluated, and often coded as threatening.\n\nThis process also keeps the sympathetic nervous system active. Monitoring is a form of threat-scanning. Your nervous system does not distinguish between scanning for physical danger and scanning your gut for signs of a flare. Both activate the same alerting system. And a chronically activated alerting system maintains the exact physiological conditions that make flares more likely: reduced vagal tone, increased gut permeability, elevated mast cell activity, lowered pain threshold.\n\nThis is the hypervigilance loop: the effort to control symptoms through monitoring maintains the sensitisation that produces more symptoms. The loop is genuinely difficult to break because it feels rational. Monitoring feels like something. Stopping monitoring feels like giving up. But in IBS, stopping the monitoring is often the most therapeutic move available.\n\nThe path out of hypervigilance is not to force yourself to stop noticing your gut. Forced suppression does not work and often produces a rebound effect. The path out is to gradually shift from monitoring (evaluative, threat-oriented attention) to noticing (neutral, non-judgmental awareness). The body scan practice in this app is specifically designed to train this shift. Each time you bring attention to your gut without immediately evaluating it for threat, you are practising a different relationship with body sensation.",
    keyTakeaways: ["Hypervigilance is a rational response to unpredictability but neurologically amplifies what it tries to manage.", "Sustained attention to body sensations increases the brain's processing and amplification of those sensations.", "Monitoring keeps the sympathetic nervous system active, maintaining the conditions that produce flares.", "The path out is not suppression but gradual shift from evaluative monitoring to neutral noticing.", "The body scan practice in this app trains this shift."],
    reflection: "How often do you check in with your gut throughout the day? When you check in, what are you looking for? Is the checking providing useful information, or is it functioning as threat-scanning?",
    sessionContext: "This session covers the hypervigilance loop in IBS: how sustained attention to gut sensations amplifies brain processing of those sensations, how monitoring maintains sympathetic activation and gut sensitisation, and why the path out is gradual shift toward neutral noticing rather than suppression. It introduces the body scan as a training tool for this shift."
  }, {
    title: "Intolerance of Uncertainty, and Why the Gut Amplifies It",
    type: "Education + Practice",
    img: IMGS.c3p5,
    body: "Intolerance of uncertainty is one of the most powerful and least discussed psychological drivers in IBS. It refers to the tendency to find uncertainty inherently threatening, to need to know what is going to happen before it happens, and to experience not-knowing as a form of danger.\n\nThis is an extremely common feature in IBS, and it makes complete biological sense. When your body is unpredictable, uncertainty about what your body is going to do becomes an urgent problem. Every social situation is also a question about whether a flare will happen. Every meal is a question about how the gut will respond. Every trip or plan is a question about what the bathroom situation will be. Uncertainty about the gut bleeds into uncertainty about everything connected to the gut, which is everything connected to life.\n\nThe problem is that intolerance of uncertainty does not reduce uncertainty. It cannot. The future is genuinely uncertain, and no amount of checking, planning, or avoidance eliminates that fundamental fact. What intolerance of uncertainty does instead is increase the anticipatory anxiety that activates the HPA axis, sensitises the gut, and makes the thing you are anxious about more likely to happen. It is, in its own way, another self-fulfilling loop.\n\nThe relationship between intolerance of uncertainty and the gut has a specific feature that makes it particularly powerful in IBS: the gut itself is a major source of uncertainty signals. The enteric nervous system is constantly monitoring the internal environment and sending reports upward through the vagus nerve. In an unsensitised system, most of these signals are processed below conscious awareness. In a sensitised system, many of them reach consciousness as ambiguous sensations that immediately trigger the question: is this a flare starting? The uncertainty of that question, in someone with high intolerance of uncertainty, immediately escalates into anxiety, which activates the stress system, which changes the gut environment, which produces more ambiguous sensations.\n\nLearning to tolerate uncertainty in IBS means learning to sit with the question without immediately trying to resolve it. Not knowing whether this is a flare starting, and being willing to not know for long enough to gather more information. Not cancelling plans at the first ambiguous gut sensation, but waiting to see what actually happens. This is genuinely uncomfortable. It feels like risk. But it is the most direct route to breaking the loop.\n\nPractical tool: when you notice yourself trying to resolve an IBS-related uncertainty, try naming it instead. Say internally: I do not know if this is going to be a difficult day. I am going to find out. Then continue with what you were doing. Naming the uncertainty without immediately acting on it begins to loosen its grip.",
    keyTakeaways: ["Intolerance of uncertainty is extremely common in IBS and makes biological sense given an unpredictable body.", "It does not reduce uncertainty but increases anticipatory anxiety that sensitises the gut.", "The gut is a major source of ambiguous uncertainty signals, making this dynamic particularly powerful in IBS.", "Learning to tolerate uncertainty means sitting with questions without immediately resolving them.", "Naming uncertainty without acting on it begins to loosen its grip on the nervous system."],
    reflection: "Can you identify a specific situation where intolerance of uncertainty about your gut drives your behaviour? What do you do to try to resolve the uncertainty? How often does that strategy actually help?",
    sessionContext: "This session covers intolerance of uncertainty as a driver of IBS: how it amplifies anticipatory anxiety and HPA activation, how the gut is a specific source of ambiguous uncertainty signals in IBS, why uncertainty-resolution strategies (checking, avoidance, over-planning) maintain the loop, and practical tools for tolerating uncertainty without immediately acting on it."
  }, {
    title: "The Reassurance Trap",
    type: "Education + Practice",
    img: IMGS.c3p5,
    body: "Reassurance-seeking is one of the most human responses to anxiety. When we are worried about something, we look for information that tells us everything is going to be okay. We ask people we trust. We search the internet. We go back to the doctor to be told once more that it is just IBS. We check our symptoms against lists of serious conditions and confirm that ours do not match. And briefly, after the reassurance, the anxiety reduces. Which is why we do it again next time.\n\nThe problem with reassurance-seeking in IBS is that it works in the short term and backfires in the long term. The short-term reduction in anxiety that reassurance provides is real. But it comes at a cost: it teaches the nervous system that the only way to manage this level of anxiety is external reassurance. And because IBS is ongoing and uncertain, the need for reassurance never goes away. Over time, it often escalates. More frequent doctor appointments. More internet searches. More asking partners or friends to confirm that what you are experiencing sounds normal. The threshold for tolerable uncertainty gets lower and lower.\n\nThere is also a specific form of reassurance-seeking that is particularly common in IBS and particularly costly: symptom checking against serious illness. Every time you experience a gut symptom and immediately search it against colorectal cancer symptoms, or IBD symptoms, or other conditions, you are performing a reassurance check. And like all reassurance, it provides brief relief and then re-escalates. Because the uncertainty always returns, and the internet always contains enough material to sustain anxiety if you look long enough.\n\nThe therapeutic approach to reassurance-seeking is not to simply stop seeking reassurance. It is to delay it. When the urge to seek reassurance arises, practice waiting. First for five minutes. Then for ten. Then for twenty-four hours. Often, by the time the delay period ends, the specific anxiety that drove the reassurance urge has reduced on its own, and the search or question no longer feels necessary.\n\nIt is also useful to distinguish between appropriate reassurance-seeking, which is going to your clinician with a genuine new or changed symptom, and anxiety-driven reassurance-seeking, which is going to your clinician or to the internet to manage anxiety about a symptom you already know about and have already been assessed for. Both can look identical from the outside, but they have different drivers and different consequences.",
    keyTakeaways: ["Reassurance-seeking reduces anxiety briefly but lowers the tolerance threshold for uncertainty over time.", "It teaches the nervous system that external reassurance is the only way to manage this level of anxiety.", "Symptom-checking against serious illness is a common form of reassurance-seeking with high costs.", "Delaying reassurance-seeking rather than stopping it abruptly is the most effective approach.", "Appropriate reassurance-seeking (new symptoms to a clinician) is different from anxiety-driven reassurance-seeking (checking known symptoms)."],
    reflection: "What does your reassurance-seeking look like? Internet searches? Returning to your doctor? Asking people close to you? How long does the relief from reassurance last before the anxiety returns?",
    sessionContext: "This session covers reassurance-seeking in IBS: how it works short-term and backfires long-term by lowering the tolerance threshold for uncertainty, the specific pattern of symptom-checking against serious illness, the delay technique as a practical tool, and the distinction between appropriate and anxiety-driven reassurance-seeking."
  }, {
    title: "Cognitive Defusion: Unhooking From Your Thoughts",
    type: "Education + Practice",
    img: IMGS.c3p5,
    body: "Cognitive defusion is an ACT (Acceptance and Commitment Therapy) technique that helps you change your relationship to thoughts, particularly the catastrophic, threat-oriented thoughts that IBS reliably generates.\n\nThe basic practice: when a difficult thought arises, such as \"this is going to be a terrible day,\" \"I am always going to have this,\" or \"I cannot trust my body,\" rather than engaging with the thought as if it were reporting fact, you observe it as a mental event.\n\nUseful defusion techniques for IBS thoughts:\n\nNaming the thought: \"I notice I am having the thought that this is going to be a terrible day.\" The addition of \"I notice I am having the thought that\" creates distance between you and the thought. It moves the thought from foreground to background.\n\nThe leaves on a stream technique: Imagine your thoughts as leaves floating on a gently moving stream. Each thought arises, floats past, and continues downstream. You are sitting on the bank, watching. You are not climbing onto the leaves, not stopping them, not pushing them away. Just watching them pass.\n\nThank your mind: When a catastrophic IBS thought arises, say (internally or quietly): \"Thank you, mind. I see what you're doing.\" This acknowledges the thought without accepting it as truth, and treats the mind as a well-intentioned but sometimes overdramatic pattern-recognition machine.\n\nThese techniques are not about positive thinking. They are about changing your relationship to thoughts, particularly the ones that amplify the gut-brain loop.",
    keyTakeaways: ["Cognitive defusion is an ACT technique for observing thoughts as mental events rather than facts.", "Naming the thought (\"I notice I am having the thought that...\") moves it from foreground to background.", "Leaves on a stream and thanking your mind are two more ways to let a catastrophic thought pass.", "The goal is not positive thinking. It is a different relationship with the thoughts that amplify the gut-brain loop."],
    reflection: "What is a thought about your gut that your mind repeats most often? Which of the three techniques (naming the thought, leaves on a stream, or thanking your mind) feels easiest to try the next time it shows up?",
    sessionContext: "This session covers cognitive defusion, an Acceptance and Commitment Therapy technique for IBS: observing catastrophic gut-related thoughts as mental events rather than facts, and three practical techniques (naming the thought, leaves on a stream, and thanking your mind) for loosening their hold on the gut-brain loop."
  }, {
    title: "Living with Not Knowing, and Finding It Manageable",
    type: "Education + Practice + Reflection",
    img: IMGS.c3p5,
    body: "The goal of this program has not been to eliminate uncertainty about your gut. That goal is not achievable, because the gut is genuinely variable and IBS is genuinely unpredictable. The goal has been something different: to develop a different relationship with uncertainty so that it no longer functions as a constant source of threat and alarm.\n\nLiving with not knowing in IBS means being able to have a gut sensation without immediately knowing whether it is significant. It means being able to wake up and not know whether today will be a good gut day or a difficult one, and being able to proceed with the day anyway. It means being able to eat a meal without knowing exactly how your gut will respond to it, and being able to tolerate that not-knowing without it consuming the entire meal.\n\nNone of this is passive resignation. It is an active, trained capacity. The work done in this program, identifying the hypervigilance loop, practising noticing without monitoring, delaying reassurance-seeking, learning to tolerate uncertain sensations, has been building exactly this capacity. Not the absence of anxiety about your gut, but the ability to have that anxiety and still function.\n\nPeople who describe reaching this place in IBS recovery say similar things. The symptoms are often still present. The variability is often still there. But it no longer takes over. The gut is noticed, and managed when necessary, but it is no longer the organising principle of every decision and every day. Life has more space in it than the gut.\n\nThis shift does not happen through one session or one program. It happens through repeated practice of all the tools in this app: the breathing resets, the pre-meal practices, the body scan, the graduated re-engagement, the cognitive defusion. Each use of each tool is a small piece of evidence to the nervous system that uncertainty is manageable. That evidence accumulates. And gradually, the nervous system's threat response to gut-related uncertainty becomes less automatic, less intense, and less consuming.\n\nYou are building something here. It takes time. It is not linear. There will be setbacks, particularly during high-stress periods or hormonal fluctuations or new life events. Those setbacks do not erase the progress. They are a feature of a dynamic system recalibrating, not evidence that nothing is working.",
    keyTakeaways: ["The goal is not eliminating uncertainty but developing a different relationship with it.", "Living with not knowing means being able to proceed despite uncertainty, not in the absence of it.", "This is an active, trained capacity built through repeated use of the tools in this app.", "People in IBS recovery describe symptoms still present but no longer organising every decision.", "Setbacks are a feature of non-linear recalibration, not evidence that progress has been lost."],
    reflection: "Looking back at all five sessions in this program, what has shifted in how you think about your own monitoring and uncertainty? What is one thing you want to keep practising from here?",
    sessionContext: "This final session in Program 5 synthesises the work of the program: what living with not knowing actually looks like in IBS recovery, how the capacity to tolerate uncertainty is built through repeated small practices, why the goal is a different relationship with uncertainty rather than its elimination, and how to frame setbacks as recalibration rather than failure."
  }],
  // CATEGORY 4: SPECIAL PATTERNS
  c4p1: [{
    title: "What Is Pelvic Floor Dyssynergia",
    type: "Education + Diagram",
    img: IMGS.c4p1s1,
    body: `Pelvic floor dysfunction is present in a significant subset of people with IBS-C type symptoms and is one of the most commonly missed contributing factors. Among constipation phenotypes, dyssynergia is common and frequently overlooked, and clinical guidelines endorse targeted assessment.

Note on why this program is in a gut-brain app: pelvic floor dyssynergia is a learned neuromuscular coordination disorder, specifically paradoxical contraction during defecation, within gut-brain control pathways rather than a structural lesion. The pelvic floor is controlled by the autonomic nervous system and connects to the brain through the same vagal and sacral pathways that govern gut motility and sensation, so it fits within this framework.

The pelvic floor is a group of muscles at the base of the pelvis. During normal defecation these muscles relax to allow stool to pass. In pelvic floor dyssynergia they paradoxically contract during defecation, creating a functional outlet obstruction. The person strains, but the exit is closing rather than opening.

The symptoms overlap substantially with IBS-C, including constipation, incomplete evacuation, straining, and bloating from retained stool. In a proportion of people diagnosed with IBS-C, pelvic floor dysfunction is a major contributing factor not addressed by dietary change or nervous system regulation alone. Standard dietary or laxative approaches underperform when outlet obstruction is present. The treatment is biofeedback physiotherapy.`,
    keyTakeaways: ["Pelvic floor dyssynergia is a neuromuscular coordination problem controlled by the autonomic nervous system, characterised by paradoxical anal contraction and outlet obstruction", "It is a nervous system problem, not a structural one, and belongs in the gut-brain framework", "Its symptoms overlap substantially with IBS-C and it is commonly missed in standard assessment", "Biofeedback physiotherapy is the evidence-based treatment"],
    reflection: "Do any of the features described here match your experience? Straining, incomplete evacuation, sensation of blockage? Has pelvic floor dysfunction ever been discussed with your clinician?",
    sessionContext: "Explains pelvic floor dyssynergia and why it belongs in a gut-brain app."
  }, {
    title: "Symptoms That Suggest a Pelvic Floor Component",
    type: "Education + Reference",
    img: IMGS.c4p1s2,
    body: `Symptoms particularly associated with pelvic floor dyssynergia rather than slow-transit constipation alone include significant straining even when stool is present in the rectum, sense of incomplete evacuation, sensation of blockage or obstruction, spending long periods in the bathroom with little result, and urgency that does not produce a bowel movement. These features cue outlet-type constipation rather than isolated slow transit and warrant targeted testing.

These symptoms are distinct from slow-transit constipation, in which stool moves too slowly through the colon. Both can co-exist but respond to different treatments. Slow-transit constipation responds to fibre, fluids, exercise, and sometimes medication. Outlet dyssynergia responds to biofeedback. Treating outlet dyssynergia with laxatives alone produces inadequate results, because biofeedback addresses coordination rather than stool consistency or transit.

A referral to a physiotherapist with pelvic floor expertise is the appropriate next step if these features are present.`,
    keyTakeaways: ["Key indicators: straining with stool present, incomplete evacuation, sensation of blockage, long time in bathroom with little result", "These features cue outlet-type constipation rather than isolated slow transit and warrant targeted testing", "Treating outlet dyssynergia with laxatives alone produces inadequate results; biofeedback addresses coordination rather than stool consistency"],
    reflection: "Do these symptom features match your experience? If so, have you had a pelvic floor assessment? This is worth raising with your GP.",
    sessionContext: "Covers specific symptoms distinguishing pelvic floor dyssynergia from slow-transit constipation."
  }, {
    title: "Biofeedback: The Evidence",
    type: "Education + Evidence",
    img: IMGS.c4p1s3,
    body: `Biofeedback is the treatment of choice for defecatory dyssynergia. Multiple randomised controlled trials show response rates of roughly 70 to 80 percent with biofeedback, compared with approximately 30 to 40 percent with laxatives or standard care. Professional guidance assigns this a high-grade recommendation, and it is endorsed by major gastroenterology societies. Trials consistently demonstrate superior symptom and evacuation outcomes versus comparators.

Biofeedback works by placing sensors to measure pelvic floor muscle activity in real time and showing the patient that activity on a screen. The visual feedback allows the patient to learn normal muscle coordination and practise achieving it. Over multiple sessions the paradoxical contraction pattern is replaced with normal relaxation.

Why is this relevant to a gut-brain axis app? Biofeedback works through the same mechanism as the tools in this app. It teaches the nervous system a new pattern through repeated practice with feedback.`,
    keyTakeaways: ["Biofeedback has strong evidence with response rates of roughly 70 to 80 percent, compared with roughly 38 percent for laxatives", "It retrains the nervous system's coordination pattern through real-time feedback", "Anyone with partial response to standard IBS-C tools should consider pelvic floor assessment, as endorsed by major gastroenterology societies"],
    reflection: "Has biofeedback ever been offered or mentioned to you? If you have outlet-type symptoms, is requesting a pelvic floor assessment something you could raise?",
    sessionContext: "Covers the evidence base for biofeedback in pelvic floor dyssynergia."
  }, {
    title: "Talking to Your Physiotherapist",
    type: "Education + Practice",
    img: IMGS.c4p1s4,
    body: `If pelvic floor dysfunction may be contributing to your IBS-C symptoms, the next step is finding a physiotherapist with pelvic floor expertise. Seek clinicians experienced in anorectal biofeedback for constipation. Look specifically for a pelvic floor physiotherapist or a continence and pelvic health physiotherapist.

The assessment may include an internal examination to assess muscle tone, coordination, and strength. Internal assessment is done with explicit ongoing consent and you have the right to decline or stop at any time. If you have a trauma history that makes internal examination difficult, say so clearly at the outset.

Questions to ask your clinician: Can pelvic floor dysfunction be contributing to my constipation-type IBS symptoms? What does the assessment involve? How many biofeedback sessions are typically needed?

Learn more about your needs and questions through the tools and sessions in this app. Then use those as directed questions for your care team the next time you go.`,
    keyTakeaways: ["Look specifically for a pelvic floor or continence and pelvic health physiotherapist.", "Internal examination is conducted with explicit ongoing consent and can be declined.", "People with trauma histories should disclose this at the outset."],
    reflection: "What is one concrete step you could take this week toward getting a pelvic floor assessment?",
    sessionContext: "Practical guidance for finding and preparing for a pelvic floor physiotherapy assessment."
  }],
  c4p2: [{
    title: "How Adverse Childhood Experiences Program the Gut-Brain Axis",
    type: "Education + Diagram",
    img: IMGS.c4p2s1,
    body: `People who experienced adverse childhood experiences (ACEs) have significantly higher rates of IBS, more severe symptom presentations, and lower response rates to standard first-line treatments.

This is not a psychological judgment. It is biological. Early life adversity has measurable effects on the developing stress response system. The HPA axis calibrates during early development. In a context of chronic threat, it calibrates toward heightened sensitivity and faster activation. The enteric nervous system undergoes similar calibration. EC cells in the gut that produce serotonin are altered by early stress.

These changes are not permanent. But they do mean that standard IBS tools may need more time, titration, and support in people with significant ACE histories.

The most important thing to understand: your IBS severity, if you have a trauma history, is not a personal failing. It reflects biology that was shaped by circumstances you did not choose. That biology is modifiable.`,
    keyTakeaways: ["ACE histories are strongly associated with IBS severity through documented biological mechanisms.", "Standard tools may need more time, titration, and support in people with significant ACE histories.", "IBS severity in people with trauma histories reflects biology shaped by circumstances, not personal failing."],
    reflection: "Does your IBS history include a significant life event or period of adversity? How does understanding the biological mechanism change how you relate to the severity of your symptoms?",
    sessionContext: "Covers the documented relationship between ACEs and IBS. This is a sensitive topic and working with a trauma-informed clinician is recommended."
  }, {
    title: "The Nervous System of Someone Who Has Experienced Trauma",
    type: "Education + Diagram",
    img: IMGS.c4p2s2,
    body: `Polyvagal Theory describes three states of the autonomic nervous system based on perceived safety. The ventral vagal state is safety and social connection: parasympathetic dominant, high vagal tone, gut functioning well. The sympathetic state is fight or flight: activated in response to perceived threat, digestion suppressed. The dorsal vagal state is the most primitive response to inescapable threat: freeze, shutdown.

In someone with a trauma history, the nervous system may have established one of the activated states as its functional baseline. This means that routine situations, including gut sensations themselves, can trigger state shifts that would not occur in a non-traumatised nervous system. A gut sensation that would be mildly noticed in someone with a regulated baseline may trigger a sympathetic activation, producing more symptoms, deepening the dysregulation.

These are intelligent adaptations to genuinely threatening circumstances. They become problems only when the circumstances have changed but the adaptations have not yet updated.`,
    keyTakeaways: ["Polyvagal Theory describes three nervous system states: ventral vagal (safe), sympathetic, and dorsal vagal.", "Trauma can establish activated states as baselines triggered by routine situations including gut sensations.", "These are intelligent adaptations, not pathological responses."],
    reflection: "Do any of the three states described here feel like your recurring baseline? Does your gut respond differently depending on which state you are in?",
    sessionContext: "Applies Polyvagal Theory to trauma and IBS."
  }, {
    title: "Why Standard IBS Tools May Need Adaptation",
    type: "Education + Practice",
    img: IMGS.c4p2s3,
    body: `The tools in this app are evidence-based for IBS. But for people with significant trauma histories, some need to be approached differently.

Trauma has taught the nervous system to treat body-focused attention as potentially dangerous. Practices asking you to slow down, go inward, and attend to body sensations can inadvertently trigger the activation they are designed to calm. This is not a sign the tools are wrong. It is a sign they need to be titrated.

Titration means starting with the smallest dose that produces some effect without triggering overwhelm. One slow exhale rather than four full breathing cycles. Thirty seconds of noticing the soles of your feet rather than a full body scan. External grounding before internal attention helps: notice five things you can see, feel the ground, name where you are before looking inward. Choice and control within every practice are specifically therapeutic.`,
    keyTakeaways: ["Trauma histories mean body-focused practices may trigger rather than regulate the nervous system without adaptation.", "Titration: start with the smallest dose that engages without overwhelming.", "Choice and control within practices are specifically therapeutic for trauma histories."],
    reflection: "Have any of the regulation practices in this app activated you rather than calmed you? Does a more titrated approach feel different?",
    sessionContext: "Covers specific adaptations for standard IBS tools in trauma contexts."
  }, {
    title: "Trauma-Informed Approaches to Gut-Brain Regulation",
    type: "Education + Practice",
    img: IMGS.c4p2s4,
    body: `The window of tolerance is the zone of activation in which the nervous system can process experience and engage with the world without being overwhelmed. Trauma-informed gut-brain regulation works within the window and gradually expands it.

Practical adaptations: slow breathing begins with two or three cycles rather than the full four-round pacer. The body scan begins at the periphery, feet and hands, before moving toward the abdomen. Gut-directed imagery uses flow and ease rather than problem-solving. Everything is explicitly optional and stoppable.

Somatic Experiencing and EMDR have growing evidence for trauma-related IBS and require specifically trained practitioners.`,
    keyTakeaways: ["Trauma-informed regulation works within the window of tolerance and gradually expands it.", "Specific adaptations: fewer breathing cycles, peripheral body scan start, flow-focused imagery, everything optional.", "Somatic Experiencing and EMDR have evidence for trauma-related IBS."],
    reflection: "Where is your window of tolerance in relation to body-focused practices right now? That is your starting point.",
    sessionContext: "Covers the window of tolerance framework and adaptations for trauma-informed IBS regulation."
  }, {
    title: "Finding the Right Support",
    type: "Education + Practical Guide",
    img: IMGS.c4p2s5,
    body: `Managing the intersection of trauma and IBS requires practitioners who understand both the gut-brain axis and the effects of trauma on the nervous system.

For therapy: look for therapists who describe themselves as trauma-informed with experience in somatic approaches. Relevant training includes Somatic Experiencing, Sensorimotor Psychotherapy, EMDR, or Internal Family Systems.

For medical support: the ACG and European gastroenterology guidelines both recommend brain-gut behavioural therapies. You can reference this directly with your GP.

Building a small team across disciplines is more realistic than finding one practitioner who covers everything.`,
    keyTakeaways: ["Finding trauma-informed IBS support requires specific questions about somatic training and chronic illness experience.", "ACG and European guidelines recommend brain-gut behavioural therapies.", "Building a small interdisciplinary team is more realistic and often more effective."],
    reflection: "Who on your current support team understands the gut-brain dimension? Who understands the trauma dimension? What is one step toward addressing the gap?",
    sessionContext: "Practical guide to finding trauma-informed IBS support."
  }, {
    title: "What Healing Can Look Like",
    type: "Reflection + Education",
    img: IMGS.c4p2s6,
    body: `Healing from the intersection of trauma and IBS is real. But it does not look the way people often expect.

Healing is not linear. When you have a bad week after several good ones, you are not going backward. You are experiencing the non-linear nature of nervous system recalibration.

Healing does not mean the disappearance of all symptoms. What changes is the relationship to them. People who describe meaningful healing consistently say: the symptoms still come sometimes, but they no longer take over. I can have a difficult gut day and still live my life.

Integration is a better word. The traumatic experience and the IBS become integrated into a life rather than being the life.`,
    keyTakeaways: ["Healing is non-linear. A difficult week after good ones is recalibration, not going backward.", "Healing typically means a different relationship with symptoms, not their disappearance.", "Integration: trauma and IBS become part of the story rather than the whole story."],
    reflection: "How do you define healing for yourself? What would integration look like in your specific life?",
    sessionContext: "Covers what healing from trauma-related IBS actually looks like."
  }],
  c4p3: [{
    overview: true,
    title: "Post-Infectious Recovery",
    type: "Education + Diagram",
    img: IMGS.c4p3,
    body: `Post-infectious IBS (PI-IBS) develops after an acute gastrointestinal infection in approximately 10 to 30 percent of cases. The development pathway: acute infection produces inflammation, barrier dysfunction, and microbiome disruption. Immune activation persists after the infection clears. Mast cells in the gut wall remain elevated. EC cells that produce serotonin show lasting changes. The enteric nervous system undergoes sensitisation that may persist for months or years.

Risk factors for PI-IBS include pre-existing low serotonin transport, prior dysbiosis, genetics, female sex, and severity of the acute illness.

Recovery involves three parallel tracks: calming the nervous system to allow the residual inflammatory cascade to settle, restoring microbiome diversity through dietary variety and evidence-based probiotic use, and gradually rebuilding dietary flexibility.`,
    keyTakeaways: ["PI-IBS develops in 10 to 30 percent of cases after acute GI infection through persistent mast cell activation, EC cell changes, and enteric nervous system sensitisation.", "Risk factors include low serotonin transport, prior dysbiosis, genetics, and severity of the acute illness.", "Recovery involves three parallel tracks: nervous system calming, microbiome restoration, and graduated dietary flexibility."],
    reflection: "Did your IBS begin after a significant illness? Which of the three recovery tracks feels most relevant to where you are now?",
    sessionContext: "Covers PI-IBS development, risk factors, and the three-phase recovery process."
  },
  // Restored individual sessions (April 2026 build chat)
  {
    title: "What Happens to the Gut After a GI Infection",
    type: "Education + Diagram",
    img: IMGS.c4p3,
    body: "Post-infectious IBS (PI-IBS) develops in approximately 10 to 30 percent of people following an acute enteric infection, including bacterial gastroenteritis (Campylobacter, Salmonella, E. coli), viral gastroenteritis, and parasitic infections such as Giardia. It is one of the most well-characterised subtypes of IBS, with a known precipitating event and documented biological mechanisms.\n\nFollowing acute infection, several changes occur in the gut that can persist long after the infectious organism has been cleared:\n\nLow-grade mucosal inflammation persists in the gut wall. Immune cells, particularly mast cells and T-lymphocytes, remain elevated in the intestinal lining and continue to release inflammatory mediators that sensitise gut nerves. This is not the same as inflammatory bowel disease. The inflammation is low-grade and diffuse rather than the deep, ulcerative inflammation seen in Crohn's disease or ulcerative colitis.\n\nEnterochromaffin cell density increases. The infection triggers a compensatory increase in serotonin-producing EC cells, which can persist for months and contribute to altered motility and pain signalling.\n\nGut permeability remains elevated. The infection damages the tight junctions between the cells lining the gut, and this increased permeability can persist, allowing gut contents to keep stimulating the underlying immune system.\n\nThe gut microbiome is altered. The infection, and often the antibiotic treatment used to manage it, changes the composition of the gut microbiome, reducing diversity and potentially reducing beneficial species that support barrier function and serotonin production.\n\nThe autonomic nervous system and HPA axis become dysregulated. The acute illness and its psychological stress are enough to shift autonomic balance and program a sensitised gut-brain response.\n\nRisk factors for developing PI-IBS include female sex, younger age, severity and duration of the acute illness, concurrent antibiotic use, and the presence of pre-existing anxiety or depression.",
    keyTakeaways: ["PI-IBS affects approximately 10 to 30 percent of people after an enteric infection.", "Mechanisms include persistent low-grade inflammation, elevated EC cell density, increased gut permeability, microbiome disruption, and autonomic dysregulation.", "This is not ongoing infection. The organism is gone; the gut's regulatory response has been altered.", "Female sex, younger age, antibiotic use, and pre-existing anxiety increase risk."],
    reflection: "Did your IBS begin or significantly worsen after a gastrointestinal infection? What was that experience like, and how long did it take before you connected the infection to your ongoing symptoms?",
    sessionContext: "This session explains what post-infectious IBS is and what changes in the gut after an infection: persistent low-grade inflammation, more serotonin-producing EC cells, increased gut permeability, microbiome disruption, and a sensitised autonomic and HPA stress response, plus the known risk factors."
  }, {
    title: "Why Some People Develop PI-IBS and Others Do Not",
    type: "Education + Reflection",
    img: IMGS.c4p3,
    body: "Two people can have the same gastroenteritis, with the same organism, same severity, and same duration, and one develops PI-IBS while the other recovers completely. This difference is not random, and it is not a matter of one person being weaker or more sensitive than the other.\n\nThe vulnerability factors for PI-IBS are both biological and psychological. On the biological side, genetic variations in immune signalling, serotonin transporter genes, and gut barrier function influence how aggressively the post-infectious inflammatory response persists. On the psychological side, the presence of pre-existing anxiety or depression is one of the strongest predictors of PI-IBS development, because the HPA axis response to the acute illness is amplified in people with pre-existing stress-system sensitisation, and this amplification programs a more sustained gut-brain dysregulation.\n\nThis does not mean PI-IBS is caused by anxiety. It means that the interaction between a biological event (the infection) and a pre-existing nervous system state (a sensitised stress response) produces a more persistent outcome. Both factors matter, neither is sufficient alone, and neither assigns blame.\n\nThe gut microbiome composition at the time of infection also influences outcomes. People with less diverse microbiomes at the time of infection have less resilience to the disruption the infection causes, and are more likely to develop persistent gut-brain dysregulation afterward.",
    keyTakeaways: ["Whether PI-IBS develops is not random and is not about one person being weaker than another.", "Biological factors (immune signalling, serotonin transporter genes, gut barrier function) and a pre-existing sensitised stress response both raise the risk.", "PI-IBS is not caused by anxiety. Both factors matter, neither is sufficient alone, and neither assigns blame.", "A less diverse microbiome at the time of infection gives the gut less resilience to the disruption."],
    reflection: "Looking back at the period before your GI infection, what was your stress level like? Were you in a high-pressure period of your life? Does this context add anything to your understanding of why PI-IBS developed when it did?",
    sessionContext: "This session explains why the same infection leads to PI-IBS in some people but not others: genetic and immune factors, gut barrier function, a pre-existing sensitised stress response, and microbiome diversity at the time of infection, framed without blame."
  }, {
    title: "The Mucosal Recovery Process",
    type: "Education + Diagram",
    img: IMGS.c4p3,
    body: "Recovery from PI-IBS involves several overlapping biological processes that occur on different timescales. Understanding these timescales helps set realistic expectations and shows which interventions are most useful at which point.\n\nThe mucosal inflammatory phase, roughly the first 3 to 12 months after infection, is when low-grade inflammation is most active and gut permeability most elevated. During this phase, symptoms tend to be most intense and most consistently present. Interventions that support barrier function are particularly relevant here: a diverse plant-based diet, adequate dietary fibre where tolerated, and probiotic strains with evidence for barrier support (particularly Lactobacillus rhamnosus GG and certain Bifidobacterium strains).\n\nThe microbiome restoration phase, ongoing and typically 6 to 24 months, involves the gradual re-establishment of a diverse, stable microbial community. This is supported by a diverse diet rich in prebiotic fibre (onion, garlic, leek, asparagus, oats, and bananas, noting that some of these are high-FODMAP and may need to be introduced carefully), fermented foods (yoghurt, kefir, kombucha, kimchi), and in some cases targeted probiotic support.\n\nThe nervous system recalibration phase runs in parallel and is ongoing. It involves the gradual down-regulation of the autonomic sensitisation produced by the acute illness. This is what the full body of brain-gut behavioural work addresses. It does not happen passively. It requires the active use of regulation tools consistently over time.\n\nMost people with PI-IBS who engage with the full spectrum of recovery, meaning dietary, microbiome-focused, and nervous system tools, see meaningful improvement within 12 to 24 months of the onset of symptoms.",
    keyTakeaways: ["PI-IBS recovery has three overlapping phases: mucosal, microbiome, and nervous system.", "Each phase responds to different interventions.", "The timeline is typically 12 to 24 months for meaningful improvement with active management.", "Nervous system recalibration does not happen passively."],
    reflection: "Where do you feel you are in the PI-IBS recovery timeline? Which of the three phases, mucosal, microbiome, or nervous system, feels most incomplete for you right now?",
    sessionContext: "This session covers the three overlapping phases of PI-IBS recovery (mucosal inflammation, microbiome restoration, and nervous system recalibration), their typical timescales, and which interventions fit each phase."
  }, {
    title: "Rebuilding After PI-IBS",
    type: "Education + Practice",
    img: IMGS.c4p3,
    body: "Recovery from PI-IBS is real, documented, and achievable, but it requires active engagement with the full picture of what drove the condition, not just symptom management.\n\nDiet: During the acute recovery phase, a low-FODMAP approach may help manage the most disruptive symptoms. But the long-term dietary goal is diversity, because a diverse diet feeds a diverse microbiome, which supports barrier function and serotonin production. The low-FODMAP reintroduction phase is essential for moving from strict restriction toward a broader, more sustainable pattern.\n\nMicrobiome support: No single probiotic is universally recommended for PI-IBS, but strains with evidence for barrier function and microbiome restoration include Lactobacillus rhamnosus GG, Bifidobacterium longum, and multi-strain combinations. Discuss specific products with your clinician or dietitian.\n\nNervous system recalibration: This is the component most often overlooked in PI-IBS recovery, and often the most important one. The gut sensitisation produced by the infection does not resolve on its own. It requires the active down-regulation of the HPA axis and the autonomic nervous system through consistent use of the Calm the Loop tools in this app.\n\nThe recovery mindset: PI-IBS recovery tends not to be linear. There will be better periods and worse periods. Flares during recovery do not mean you are going backward. They are a feature of the non-linear recalibration of a complex system. Tracking trends over weeks and months, not days, gives a more accurate picture of progress.",
    keyTakeaways: ["Recovery from PI-IBS is real and achievable, but it needs the full picture, not just symptom management.", "Low-FODMAP can help early on, but the long-term dietary goal is diversity, reached through the reintroduction phase.", "Probiotic choices are best discussed with your clinician or dietitian.", "Nervous system recalibration is the most overlooked piece, and recovery is not linear."],
    reflection: "Where are you in the PI-IBS recovery timeline? What feels most incomplete: the dietary piece, the microbiome piece, or the nervous system piece? What is one concrete thing from this session you could start this week?",
    sessionContext: "This session brings PI-IBS recovery together: moving from low-FODMAP toward dietary diversity, discussing probiotic support with a clinician, actively recalibrating the nervous system with regulation tools, and expecting a non-linear recovery tracked over weeks and months."
  }],
  c4p4: [{
    overview: true,
    title: "Hormonal Patterns in IBS",
    type: "Education + Diagram",
    img: IMGS.c4p4,
    body: `Sex hormones, particularly estrogen and progesterone, have direct and measurable effects on the gut. IBS affects women at approximately twice the rate of men.

Estrogen has generally pro-motility and anti-inflammatory effects and supports serotonin availability. Progesterone, which rises in the luteal phase after ovulation, has relaxing effects on smooth muscle including the gut, which slows motility and worsens constipation-type symptoms.

Many people with IBS-C report worsening constipation and bloating in the week before menstruation. Many with IBS-D report worsening diarrhoea and cramping during menstruation when prostaglandins are elevated.

Perimenopause produces a different pattern. As estrogen declines and becomes more variable, gut-brain axis sensitivity tends to increase. Tracking your hormonal pattern alongside your gut symptoms for two to three cycles provides information directly useful for planning.`,
    keyTakeaways: ["Estrogen supports motility and serotonin. Progesterone slows motility and worsens constipation-type symptoms.", "Predictable hormonal patterns exist: luteal phase worsening for constipation-type, menstrual phase worsening for diarrhoea-type.", "Perimenopause typically worsens IBS through declining estrogen."],
    reflection: "Do your IBS symptoms follow a predictable hormonal pattern? Which phase of the cycle is most difficult for your gut?",
    sessionContext: "Covers the hormonal biology of IBS."
  },
  // Restored individual sessions (April 2026 build chat)
  {
    title: "How Estrogen and Progesterone Affect Gut-Brain Signalling",
    type: "Education + Diagram",
    img: IMGS.c4p4,
    body: "The relationship between sex hormones and gut-brain function is direct, two-way, and clinically significant. Estrogen and progesterone receptors are present throughout the gastrointestinal tract, in smooth muscle cells, in enteric neurons, and in gut immune cells, meaning that changes in hormone levels directly alter gut physiology.\n\nEstrogen generally has a motility-facilitating effect. Higher estrogen levels are associated with faster gut transit. Estrogen also modulates pain sensitivity through its effects on serotonin receptors and on the activity of pain-processing regions in the brain. Higher estrogen tends to reduce visceral pain sensitivity; falling estrogen tends to increase it.\n\nProgesterone has the opposite effect on motility. It slows gut transit by relaxing smooth muscle. This is the physiological basis of the well-known constipation of pregnancy (when progesterone is extremely elevated) and of the constipation-type IBS pattern seen in the luteal phase.\n\nThe menstrual cycle creates a predictable hormonal fluctuation that maps directly onto gut-brain signalling. During the follicular phase (days 1 to 14), rising estrogen supports better motility and lower visceral sensitivity. During the luteal phase (days 14 to 28), rising progesterone slows motility, and falling estrogen at the end of this phase increases pain sensitivity. At menstruation, the prostaglandins released to promote uterine contraction also stimulate gut motility, producing a shift toward urgency and diarrhea that many people with IBS experience at the start of their period.",
    keyTakeaways: ["Estrogen and progesterone receptors are present throughout the gut, so hormones directly affect gut physiology.", "Estrogen tends to support motility and reduce pain sensitivity.", "Progesterone slows motility and produces a constipation-type pattern in the luteal phase.", "At menstruation, prostaglandins speed up motility, producing an urgency and diarrhea pattern."],
    reflection: "Do you notice a consistent pattern in your IBS symptoms across your hormonal cycle? Which phase tends to be worst, and had you connected that to hormones before today?",
    sessionContext: "This session explains how estrogen and progesterone act on receptors throughout the gut: estrogen supports motility and lowers pain sensitivity, progesterone slows motility, and prostaglandins at menstruation speed it up, which maps onto a predictable pattern across the menstrual cycle."
  }, {
    title: "Tracking Your Hormonal IBS Pattern",
    type: "Education + Practice",
    img: IMGS.c4p4,
    body: "The most useful thing you can do with the information from Session 1 is map your own symptom pattern onto your hormonal cycle. For many people, this mapping reveals a strikingly consistent pattern that was previously put down to random variation or to what they ate on a given day.\n\nA simple tracking approach over two cycles provides meaningful data. On a calendar, in a notes app, or alongside the Cycle and Gut-Brain Tracker in the Tools tab, mark each day with:\n\n• Cycle day (Day 1 is the first day of your period)\n• Overall symptom severity (1 to 10)\n• Predominant symptom (pain, urgency, constipation, bloating)\n• Stress level (1 to 10)\n• Sleep quality (1 to 5)\n\nAfter two cycles, look for patterns by cycle day. Common findings in people with hormonal IBS:\n\n• Days 1 to 3 of the period: urgency, loose stools, cramping (prostaglandin-driven)\n• Days 4 to 13 (follicular): relative improvement, better motility, lower pain\n• Days 14 to 28 (luteal): progressive worsening, bloating, constipation, increasing pain sensitivity\n• Days 25 to 28: most symptomatic, heightened anxiety, significant gut sensitivity\n\nIf a clear hormonal pattern emerges, it informs management: more deliberate autonomic regulation support during the luteal phase, dietary adjustments timed to cycle phase, and a documented pattern to bring to your clinician.",
    keyTakeaways: ["Mapping symptoms onto your cycle often reveals a consistent pattern that looked random before.", "Two cycles of simple daily tracking (cycle day, severity, main symptom, stress, sleep) is enough to see it.", "Common patterns: early period urgency, follicular improvement, and luteal worsening.", "A documented pattern guides timing of regulation and diet, and strengthens conversations with your clinician."],
    reflection: "After reading the tracking approach, do you recognise a pattern already, even without formal tracking? What days of your cycle are consistently the hardest?",
    sessionContext: "This session shows how to track IBS symptoms against the menstrual cycle for two cycles (cycle day, severity, main symptom, stress, sleep), the common patterns people find by phase, and how a documented pattern can guide management and clinical conversations."
  }, {
    title: "The Luteal Phase Flare: Why It Happens and What Helps",
    type: "Education + Practice",
    img: IMGS.c4p4,
    body: "The luteal phase flare is one of the most consistently reported hormonal IBS patterns, and one of the most distressing, because it occurs reliably, predictably, and often severely, and because the standard advice (\"avoid trigger foods\") does not address its hormonal mechanism.\n\nThe luteal phase flare has several overlapping drivers: progesterone-slowed transit leading to bloating and constipation; rising sensitivity to visceral pain as estrogen begins to fall in the late luteal phase; increased gut permeability driven by progesterone's effect on tight junctions; and a luteal-phase shift in the HPA axis toward greater cortisol reactivity, which amplifies the autonomic sensitisation of the gut.\n\nManagement approaches with the most evidence:\n\n• Timing of low-FODMAP restriction: some people find it useful to apply stricter low-FODMAP eating specifically during the luteal phase, when the gut's threshold for triggering is lower.\n• Intensified autonomic regulation: daily slow breathing practice, more deliberate sleep and rest, and reduced output demands during the most symptomatic days.\n• Heat therapy: localised heat on the abdomen during cramping reduces smooth muscle spasm through the heat receptor pathway (TRPV1). It does not address the underlying dysregulation, but it provides meaningful short-term relief.\n• Magnesium supplementation: magnesium glycinate or magnesium citrate has some evidence for supporting gut motility and reducing smooth muscle cramping. Discuss dosing with your clinician or pharmacist.\n• NSAIDs taken at the onset of menstruation: these reduce prostaglandin production and can blunt the acute menstrual gut flare. Discuss with your clinician whether this is appropriate for your situation.",
    keyTakeaways: ["The luteal phase flare is predictable, and food-focused advice alone does not address its hormonal mechanism.", "Drivers include slower transit, rising pain sensitivity as estrogen falls, and a more reactive stress system.", "Timing stricter low-FODMAP eating and stepping up regulation in the luteal phase can help.", "Heat, magnesium, and NSAIDs at the start of a period are options to discuss with your clinician or pharmacist."],
    reflection: "Do you recognise the luteal phase pattern in your own symptom history? Of the management approaches covered (timing, regulation, heat, magnesium), which feels most relevant to try first?",
    sessionContext: "This session explains the luteal phase IBS flare (slower transit, rising pain sensitivity as estrogen falls, and a more reactive stress system) and the management options: timing low-FODMAP restriction, stepping up regulation, heat therapy, and discussing magnesium or NSAIDs with a clinician."
  }, {
    title: "Perimenopause, Menopause, and IBS",
    type: "Education",
    img: IMGS.c4p4,
    body: "Perimenopause, the years of hormonal transition before menopause, is a period of profound hormonal fluctuation that significantly affects gut-brain signalling. For people with IBS, this transition often produces a meaningful worsening or change in symptom pattern.\n\nThe primary driver is estrogen variability and its eventual decline. As ovarian function fluctuates during perimenopause, estrogen levels become erratic before eventually declining consistently. These fluctuations directly alter gut motility, visceral sensitivity, and the activity of the gut's serotonin system.\n\nPerimenopause is also associated with sleep disruption, driven by hot flashes, night sweats, and hormonal effects on sleep architecture. As you have learned in this app, poor sleep independently worsens gut sensitisation through its effects on HRV and the autonomic nervous system.\n\nThe gut microbiome also changes with the hormonal transition of menopause. Estrogen supports a more diverse gut microbiome, partly through the estrobolome, the collection of gut bacteria that metabolise estrogen. As estrogen declines, the microbiome becomes less diverse, which can reduce its buffering capacity against gut-brain dysregulation.\n\nKey management considerations in perimenopause and IBS:\n\n• Track symptom patterns over months rather than weeks, because variability is higher during perimenopause.\n• Sleep support becomes even more important during this transition.\n• Microbiome-supporting dietary approaches are particularly relevant.\n• Discuss hormone replacement therapy (HRT) with your clinician. HRT can stabilise the hormonal fluctuations that drive symptom variability, and may benefit IBS alongside its other effects.",
    keyTakeaways: ["Perimenopause brings erratic, then declining, estrogen, which changes motility, pain sensitivity, and gut serotonin.", "Sleep disruption in perimenopause independently worsens gut sensitisation.", "Falling estrogen is linked to a less diverse microbiome through the estrobolome.", "Track over months, protect sleep, support the microbiome, and discuss HRT with your clinician."],
    reflection: "Are you in or approaching perimenopause? Have you noticed a change in your IBS pattern during this transition, and had you connected it to hormonal changes before today?",
    sessionContext: "This session explains why IBS often changes in perimenopause: erratic then declining estrogen, sleep disruption, and microbiome changes through the estrobolome, along with practical considerations such as longer-term tracking, sleep support, and discussing HRT with a clinician."
  }, {
    title: "Talking to Your Clinician About Hormonal IBS",
    type: "Education + Practical Guide",
    img: IMGS.c4p4,
    body: "The connection between IBS and hormonal patterns is underappreciated in many clinical settings. Primary care and gastroenterology training has historically focused on Rome IV criteria and dietary management, without always integrating the hormonal dimension that many patients experience as central to their condition.\n\nComing to a clinical appointment with documented evidence of your hormonal pattern, two cycles of symptom tracking mapped to cycle day, significantly strengthens the conversation.\n\nUseful questions to bring to your GP:\n\n• \"My IBS symptoms follow a consistent pattern linked to my menstrual cycle. Is this something you can document and factor into my management plan?\"\n• \"Is there evidence that hormonal contraception or HRT would affect my IBS symptoms given my current pattern?\"\n• \"Could a referral to a gynaecologist or a specialist with an interest in hormonal gastrointestinal disorders be appropriate?\"\n• \"Is magnesium supplementation something we could trial for the luteal phase?\"\n\nFor those approaching perimenopause:\n\n• \"How might the hormonal changes of perimenopause affect my IBS, and how should we adjust the management plan?\"\n• \"Is HRT something to consider, given the effect of estrogen fluctuation on my gut symptoms?\"",
    keyTakeaways: ["The hormonal side of IBS is often underappreciated in clinical settings.", "Two cycles of symptom tracking mapped to cycle day makes the conversation much stronger.", "Specific questions about documentation, contraception or HRT, referrals, and magnesium help you advocate for yourself."],
    reflection: "Which of the questions from this session feels most important to raise with your clinician? Is there anything about your hormonal IBS pattern you have not yet been able to communicate clearly to your care team?",
    sessionContext: "This session prepares you to talk to a clinician about hormonal IBS: bringing two cycles of tracked symptoms, and specific questions about documentation, contraception and HRT, referrals, magnesium, and perimenopause."
  }],
  c4p5: [{
    overview: true,
    title: "When It Might Be More Than IBS",
    type: "Education + Reference",
    img: IMGS.c4p5,
    body: `IBS is a valid positive diagnosis. Fewer than 2 percent of people correctly diagnosed with IBS using Rome IV criteria are subsequently found to have a serious alternative diagnosis.

Red flag features that warrant discussion with your clinician: unexplained rectal bleeding, unintentional weight loss of more than 5 percent of body weight over 6 months, iron deficiency anaemia, elevated fecal calprotectin above 100 micrograms per gram, first-degree family history of colorectal cancer or inflammatory bowel disease, new onset of significant symptoms after age 50, significant change from a previously established pattern, and nocturnal symptoms that consistently wake you from sleep.

IBS is a functional condition with normal investigations. IBD (Crohn's and ulcerative colitis) produces measurable structural inflammation and abnormal blood markers. Fecal calprotectin is the most useful non-invasive test for distinguishing the two. Routine colonoscopy is not recommended under age 45 without alarm features per ACG guidelines.`,
    keyTakeaways: ["Fewer than 2 percent of correctly diagnosed IBS patients are found to have a serious alternative diagnosis.", "Red flag features: rectal bleeding, weight loss, iron deficiency, elevated calprotectin, relevant family history, new onset after 50, pattern change, nocturnal symptoms.", "Fecal calprotectin distinguishes IBS from IBD."],
    reflection: "Are any of the red flag features listed here present for you? If so, have you discussed them with your clinician?",
    sessionContext: "Covers red flag features, IBS versus IBD, and colonoscopy guidelines."
  },
  // Restored individual sessions (April 2026 build chat)
  {
    title: "Red Flags: What They Are and Why They Are Rare",
    type: "Education + Safety",
    img: IMGS.c4p5,
    body: "IBS is a valid positive diagnosis. When the Rome IV criteria are met and appropriate limited investigations have been completed, a diagnosis of IBS is sound and durable. Research has shown that fewer than 2 percent of people correctly diagnosed with IBS using Rome IV criteria are subsequently found to have a serious alternative diagnosis. The diagnosis is not a placeholder for something that has not been found yet. It is a real condition with a known mechanism.\n\nThat said, certain features should prompt further evaluation. These are called alarm features or red flag features, and they are important to know, not because they are common in IBS, but because when they are present, they deserve clinical attention.\n\nThe red flag features that current guidelines identify as warranting further evaluation are the following:\n\nRectal bleeding: Any unexplained rectal bleeding should be discussed with your clinician. In the context of IBS, blood in the stool is not a feature of IBS itself and always requires explanation.\n\nUnexplained weight loss: Loss of more than 5 percent of body weight over a period of six months without deliberate dieting or increased activity warrants investigation.\n\nIron deficiency anaemia: This refers to anaemia identified on blood tests, not simply tiredness. It can indicate blood loss from the gastrointestinal tract that is not visible.\n\nElevated fecal calprotectin: This is a stool test that measures inflammation in the gut. A result above 100 micrograms per gram suggests active gut inflammation that should be investigated further. A low result provides meaningful reassurance that inflammatory bowel disease is unlikely.\n\nFamily history: A first-degree family member (parent, sibling, or child) with colorectal cancer or inflammatory bowel disease increases your personal risk and is relevant information for your clinician.\n\nNew onset after age 50: IBS most commonly begins in early adulthood. New onset of significant bowel symptoms after the age of 50, in someone without a prior IBS history, warrants investigation.\n\nSignificant change from an established pattern: If you have had stable IBS for many years and your symptoms change substantially in character, frequency, or severity, that change deserves clinical attention.\n\nNocturnal symptoms: Symptoms that consistently wake you from sleep are not typical of IBS and should be discussed with your clinician.\n\nThese features are not common in IBS. The vast majority of people with IBS have none of them. But if any of these features are present, the right response is a conversation with your clinician, not alarm, but appropriate evaluation.",
    keyTakeaways: ["IBS is a valid positive diagnosis. Fewer than 2 percent of correctly diagnosed IBS patients are subsequently found to have a serious alternative diagnosis.", "Red flag features include: rectal bleeding, unexplained weight loss, iron deficiency anaemia, elevated fecal calprotectin, relevant family history, new onset after 50, significant pattern change, and nocturnal symptoms.", "Fecal calprotectin is a simple stool test that helps distinguish IBS from inflammatory bowel disease.", "Red flag features are not common in IBS. Their presence is a signal for clinical evaluation, not alarm.", "Routine colonoscopy is not recommended under age 45 without alarm features per ACG guidelines."],
    reflection: "Are any of the red flag features listed here present for you? If so, have you discussed them with your clinician? If not, what has stopped you from raising them?",
    sessionContext: "This session covers red flag features in IBS: the evidence for the durability of IBS diagnosis (fewer than 2 percent misdiagnosed using Rome IV), the specific alarm features that warrant further evaluation (rectal bleeding, weight loss, iron deficiency anaemia, elevated calprotectin, family history, new onset after 50, pattern change, nocturnal symptoms), and the role of fecal calprotectin testing. It frames red flags as uncommon but important rather than alarming."
  }, {
    title: "Inflammatory Bowel Disease vs IBS: Key Differences",
    type: "Education + Reference",
    img: IMGS.c4p5,
    body: "One of the most common sources of anxiety in people with IBS is the question of whether their symptoms could actually be inflammatory bowel disease. IBD and IBS are frequently confused by patients and, historically, sometimes even by clinicians. Understanding the actual differences between them is useful not to diagnose yourself, but to be able to have a more informed conversation with your clinician and to understand what investigations are actually looking for.\n\nInflammatory bowel disease (IBD) is a distinct category of conditions that includes Crohn's disease and ulcerative colitis. It is characterised by chronic, measurable inflammation of the gastrointestinal tract that is visible on endoscopy, produces abnormalities on blood tests, and causes objective markers of disease such as elevated CRP, elevated white cell count, and elevated fecal calprotectin. IBD can cause severe symptoms including bloody diarrhoea, significant unintentional weight loss, fever, perianal disease in Crohn's, and extraintestinal manifestations affecting the joints, skin, and eyes.\n\nIBS is a Disorder of Gut-Brain Interaction. It produces real, significant symptoms, but it does not produce structural damage to the gut wall, does not cause visible inflammation on endoscopy, and does not produce abnormalities on the standard blood markers used to detect IBD. This is precisely what normal test results in IBS mean: not that nothing is wrong, but that the problem is functional rather than structural, in the regulation of gut-brain signalling rather than in the integrity of the gut wall itself.\n\nThe tests that most reliably distinguish IBS from IBD in clinical practice are:\n\nFecal calprotectin: A stool test measuring gut inflammation. In IBS, this is typically low, below 50 micrograms per gram. In active IBD, it is typically elevated, often significantly above 100. This is one of the most useful non-invasive tests for this distinction and is recommended by ACG and NICE guidelines as a first-line investigation.\n\nCRP and ESR: Blood markers of systemic inflammation. These are typically normal in IBS and elevated in active IBD.\n\nFull blood count: Looking for anaemia, elevated white cell count, or platelet abnormalities. Normal in IBS; potentially abnormal in IBD.\n\nColonoscopy with biopsies: The definitive investigation for IBD. Guidelines recommend this in the presence of alarm features or elevated calprotectin, not as a routine investigation for all patients with IBS symptoms.\n\nIf your calprotectin has been tested and is low, your CRP is normal, and your full blood count is normal, the probability of active IBD is very low. This is genuinely reassuring information, not dismissal.",
    keyTakeaways: ["IBD (Crohn's disease and ulcerative colitis) produces measurable structural inflammation visible on investigation. IBS does not.", "Fecal calprotectin is the most useful non-invasive test for distinguishing IBS from IBD.", "A low calprotectin, normal CRP, and normal full blood count substantially reduce the probability of active IBD.", "Colonoscopy is recommended when alarm features or elevated calprotectin are present, not routinely for all IBS patients.", "Understanding this distinction allows more informed conversations with clinicians rather than self-diagnosis."],
    reflection: "Have you had fecal calprotectin or blood tests done as part of your IBS investigation? Do you know what the results were? If not, this may be worth raising at your next clinical appointment.",
    sessionContext: "This session covers the key differences between IBD and IBS: the structural vs functional distinction, the specific investigations that distinguish them (fecal calprotectin, CRP, ESR, full blood count, colonoscopy), what normal investigation results actually mean in IBS, and how to use this information to have more informed clinical conversations. It is explicitly non-diagnostic and frames the information as a basis for clinical conversation."
  }, {
    title: "How to Talk to Your GP About Reassessment",
    type: "Education + Practical Guide",
    img: IMGS.c4p5,
    body: "If you have concerns that your symptoms may have changed, escalated, or developed new features that worry you, you are entitled to request reassessment. A good GP will welcome this conversation. The following framing is useful:\n\n\"My IBS was diagnosed [X years ago] and managed with [approach]. Recently I have noticed [a specific new feature, for example rectal bleeding, unintentional weight loss, or night-time waking]. I would like to discuss whether further investigation is warranted given these changes.\"\n\nBe specific about what has changed. Vague concern is harder to act on than specific new features. The red flag features most likely to prompt appropriate investigation are: rectal bleeding, unexplained weight loss of more than 5 percent of body weight over 6 months, iron deficiency anaemia on blood tests, fecal calprotectin significantly elevated above 100 micrograms per gram, new onset of symptoms after age 50, or a first-degree family member with colorectal cancer or IBD.\n\nIt is also appropriate to ask for fecal calprotectin testing if you have not had it. It is a simple stool test that distinguishes between functional gut symptoms (low result) and inflammatory conditions like IBD (elevated result) with good specificity. It does not diagnose IBS, but a low result provides meaningful reassurance.",
    keyTakeaways: ["You are entitled to ask for reassessment if your symptoms change or new features appear.", "Be specific about what has changed. Specific new features are easier for a clinician to act on than vague concern.", "Asking about fecal calprotectin testing is reasonable if you have not had it."],
    reflection: "Has anything about your symptoms changed recently that you have not yet raised with your GP? How would you describe that change in one or two specific sentences?",
    sessionContext: "This session explains how to ask your GP for reassessment when IBS symptoms change: a simple script to use, being specific about new features, which red flag features prompt investigation, and asking about fecal calprotectin testing."
  }],
  // CATEGORY 5: LISTEN AND PRACTICE
  c5p1: [{
    title: "GDH: Introduction and Induction",
    type: "Guided Practice",
    img: IMGS.c5p1s1,
    body: `Gut-directed hypnotherapy (GDH) is among the most supported brain-gut therapies for IBS. Network meta-analyses show that GDH reduces the risk of remaining symptomatic (relative risk around 0.67) and ranks alongside CBT for long-term benefit. Major European and North American guidelines endorse it as a second-line option.

GDH is not stage hypnosis. It does not involve loss of consciousness or control. It is a deeply relaxed state of focused attention in which the nervous system's capacity to dampen gut pain signals is enhanced, and gut-specific imagery appears to influence motility and the gut-brain communication pathway. Trials and reviews indicate durable symptom relief and measurable modulation of gut function and central processing.

The first session introduces the induction, which is a simple process of deepening relaxation through breath and body awareness. Find a quiet place where you will not be disturbed. Remove glasses and loosen anything tight. Begin with three slow breaths. Notice your body becoming slightly heavier with each exhale. Allow the weight of your arms and legs to release into the surface. There is nowhere to get to. You only need to allow.

Home and digital delivery formats have been shown to be feasible and safe for GDH, so this session format is well-supported even outside a clinic.`,
    keyTakeaways: ["GDH is guideline-endorsed as a second-line brain-gut therapy with demonstrated efficacy", "It is a deeply relaxed state of focused attention, not loss of consciousness", "Each session builds on the previous, and the first establishes the induction"],
    reflection: "After your first induction, what did you notice? Did you achieve a relaxed state?",
    sessionContext: "Introduces GDH and guides the first induction."
  }, {
    title: "The River Visualization",
    type: "Guided Practice",
    img: IMGS.c5p1s2,
    body: `Begin with your induction from Session 1. Take as long as you need to arrive in that settled, relaxed state.

When you are ready, bring to mind a river. Your river, whatever it looks like for you. Choose whatever feels naturally peaceful.

Observe the river. Notice how the water moves: not frantically, not forced, but with a natural, easy rhythm. It finds its path around obstacles. It is always, always flowing.

Now bring your awareness gently to your gut. Your abdomen. Your intestines. Without judgment, just notice.

Imagine that the same quality of flow exists within your digestive system. Smooth. Easy. Coordinated. This is what your gut knows how to do. This is its natural state. Your gut knows how to flow. Research on GDH shows improvements across IBS subtypes, including stool consistency and frequency, when imagery like this is practised over a course of sessions.`,
    keyTakeaways: ["The river visualization translates the quality of natural flow to the gut.", "Each session begins with the Session 1 induction.", "Gut-directed imagery in a hypnotic state influences gut motility through the gut-brain axis."],
    reflection: "Were you able to hold both images, the river and your gut, simultaneously? What happened to your gut sensation while you held the flow imagery?",
    sessionContext: "Introduces the river visualization."
  }, {
    title: "The Warm Hand Technique",
    type: "Guided Practice",
    img: IMGS.c5p1s3,
    body: `Begin with your induction. Arrive in the relaxed, focused state.

Bring your hands together with palms facing each other, two to three centimetres apart. Notice any sensation between them: warmth, tingling.

Now slowly bring your palms down to rest on your lower abdomen. Let the weight of your hands be light and comfortable.

Notice the warmth of your hands. Let it transfer inward, gently. Moving through the skin. Reaching the smooth muscle of your gut wall.

Imagine that warmth as a signal: you are safe right now. The alarm can quiet. Breathe in, let the warmth deepen. Breathe out, feel the muscles beneath your hands soften. Even a small softening is meaningful.

You can return to this practice anytime: before a meal, during a flare, before sleep. Warmth is a signal of safety.

Hypnosis meta-analyses show adequate symptom relief with a number needed to treat of roughly 3 to 5 and minimal adverse events. Techniques that combine physical touch with directed warmth and therapeutic suggestion appear to work by activating competing sensory pathways and by reducing the threat appraisal of gut sensations.`,
    keyTakeaways: ["The warm hand technique combines physical contact, directed warmth, and therapeutic suggestion of safety.", "Physical touch activates sensory pathways that compete with pain signalling.", "This practice can be used independently outside formal sessions."],
    reflection: "Did you notice any shift in gut sensation while your hands rested on your abdomen?",
    sessionContext: "Introduces the warm hand technique."
  }, {
    title: "Deepening",
    type: "Guided Practice",
    img: IMGS.c5p1s4,
    body: `This session deepens the relaxed state you have been building. The purpose is consolidation: allowing the practices to become more accessible through repetition.

Begin with your induction. Notice that it may feel more natural than in Session 1. The nervous system learns through repetition.

When settled, return to the river from Session 2. Observe it for a few moments. Now bring your hands to your abdomen as in Session 3. Feel the warmth.

Hold both simultaneously: the river's flow and the warmth of your hands. With each slow exhale, allow both to deepen slightly. There is nowhere to get to.

Research on GDH shows benefit accumulates across sessions. The changes may be subtle. A slightly quieter gut. A slightly lower baseline activation. These add up.

Long-term follow-ups of GDH demonstrate maintained benefits at 12 months and beyond, with some studies reporting sustained relief at 5 to 6 years in many participants.`,
    keyTakeaways: ["Repetition makes the path into the relaxed state more accessible.", "This session consolidates the river and warm hand techniques.", "GDH benefits accumulate across sessions."],
    reflection: "Was the induction easier than in Session 1? What did you notice in the hours after?",
    sessionContext: "Consolidation session combining river and warm hand techniques."
  }, {
    title: "Working with Pain",
    type: "Guided Practice",
    img: IMGS.c5p1s5,
    body: `Pain is a signal that the nervous system interprets, amplifies, or dampens based on context and state. In a deeply relaxed state, the nervous system's capacity to dampen pain signals is enhanced.

Begin your induction.

If there is gut discomfort, bring your awareness to it gently. Not to evaluate it. Just to observe it the way you might observe a colour.

Notice: does the discomfort have a location? A quality? Is it constant or does it shift?

Imagine the sensation has a colour. Whatever colour arises. Now very slowly, imagine that colour beginning to shift: becoming paler, cooler, softer. You are not fighting the sensation. You are observing it change quality.

Sensation can shift quality. This demonstrates that the nervous system has influence over pain.

Trials report significant reductions in abdominal pain intensity and frequency versus control conditions when GDH protocols are used consistently.`,
    keyTakeaways: ["Pain is a signal the nervous system can amplify or dampen based on state.", "The relaxed hypnotic state enhances the nervous system's capacity to dampen gut pain signals.", "The goal is demonstrating nervous system influence, not eliminating pain."],
    reflection: "Were you able to use the colour-shifting technique? Even a small shift is evidence that the nervous system has influence.",
    sessionContext: "Introduces pain-focused gut-directed work using colour-shifting imagery."
  }, {
    title: "The Future Self",
    type: "Guided Practice",
    img: IMGS.c5p1s6,
    body: `Neuroimaging studies show that vivid imagining of a positive future state activates many of the same neural circuits as experiencing that state. The future self visualization creates a neural template.

Begin your induction. Settle into your relaxed state.

Allow an image to form of yourself in the future. Perhaps six months from now. A specific scene: a meal with people you care about, a trip you have wanted to take, a morning that begins without gut dread.

Make the image as vivid as possible. What are you wearing? What is the light like? What are people around you doing? Notice your gut in this image. Present but not dominating. Present without alarming.

Notice how you are moving through the scene. Not bracing. Not calculating. Simply being there. Stay in this image for several minutes. Let it be real. This is where you are going.

Imagery-based gut-directed suggestions are core components of effective GDH protocols.`,
    keyTakeaways: ["Vivid imagining of positive future states activates similar neural circuits to experiencing them.", "The future self visualization creates a neural template the nervous system can orient toward.", "The image should be specific and sensory."],
    reflection: "What scene appeared in your visualization? What did your gut feel like in that image?",
    sessionContext: "Introduces the future self visualization."
  }, {
    title: "Integration",
    type: "Guided Practice",
    img: IMGS.c5p1s7,
    body: `GDH benefit is maintained for months to years after a course of treatment ends, which distinguishes it from many other IBS interventions. Part of this durability is that GDH changes the underlying relationship between the nervous system and the gut.

Maintenance requires some continued engagement. Not formal sessions necessarily, but occasional practice. The warm hand technique before a difficult meal. The river visualization when the gut is unsettled. The future self image when catastrophic thinking arrives.

Today: do a complete session from start to finish. Induction, river, warm hands, deepening, future self. Let it be unhurried.

All of the small regulatory moments in this app are gut-brain work. The work continues in daily life.

Standardised home recordings can be non-inferior to therapist-delivered sessions in paediatrics, and digital GDH shows symptom gains in adults. This is why occasional independent practice, like the warm hand technique before a difficult meal or the river visualisation when the gut is unsettled, is part of the evidence base.`,
    keyTakeaways: ["GDH benefit is maintained for months to years after a course ends.", "Maintenance involves occasional practice with the most effective individual tools.", "Integration means the work continues in daily life."],
    reflection: "Which of the seven GDH sessions felt most effective for you? How could you incorporate it into your routine?",
    sessionContext: "Covers integration of GDH practice into daily life."
  }],
  c5p2: [{
    title: "My Gut and Brain Are One Connected System",
    type: "Guided Practice",
    img: IMGS.c5p2s1,
    body: `These affirmations are grounded in the biology of your gut-brain axis. Each one is accurate information about what is true for your nervous system and your gut.

My gut and brain are one connected system. What helps one helps the other.

This is not metaphorical. The vagus nerve, the enteric nervous system, the HPA axis, the serotonin pathways: these are the biological architecture of a single integrated system. When you regulate your breathing, you are changing your gut. When you sleep well, you are changing your gut.

Take a few slow breaths and return to this affirmation. My gut and brain are one connected system. What helps one helps the other.`,
    keyTakeaways: ["This affirmation is grounded in documented biology.", "Every tool in this app is a gut-brain intervention.", "This affirmation is the conceptual foundation for the entire app."],
    reflection: "When you hear this affirmation, what resonates? What in your experience confirms it?",
    sessionContext: "First affirmation session grounding the gut-brain connection in biology."
  }, {
    title: "My Nervous System Can Learn a New Pattern",
    type: "Guided Practice",
    img: IMGS.c5p2s2,
    body: `My nervous system can learn a new pattern. The brain's ability to rewire is real.

Neuroplasticity is the documented capacity to change structure and function based on experience. It operates throughout the lifespan.

In IBS, the patterns that maintain symptoms, hypervigilance, anticipatory anxiety, catastrophic interpretation, have been learned through experience. They were adaptive responses to real, painful experiences. But learned patterns can be replaced.

The tools in this app are not just symptom management. They are new pattern installation. Each slow breathing session teaches the nervous system that calm is accessible. Each pre-meal reset teaches it that eating does not have to begin in alarm.

This accumulates. My nervous system can learn a new pattern.`,
    keyTakeaways: ["Neuroplasticity is the documented capacity of the nervous system to change based on experience.", "The patterns maintaining IBS were learned and can be replaced through repeated practice.", "Each tool use is a small new pattern installation."],
    reflection: "Can you identify any patterns in your gut-brain response that feel slightly different since you started this app?",
    sessionContext: "Affirmation session grounding neuroplasticity in IBS recovery."
  }, {
    title: "Uncertainty Is Uncomfortable. It Is Also Survivable.",
    type: "Guided Practice",
    img: IMGS.c5p2s3,
    body: `Uncertainty is uncomfortable. It is also survivable.

These two things are not in contradiction. The nervous system often treats them as if they are: as if uncertainty that is uncomfortable must therefore be dangerous. But discomfort and danger are not the same thing.

In IBS, uncertainty about the gut becomes a powerful source of anticipatory anxiety. Not knowing whether today will be a good day. Not knowing whether this food will cause a reaction. The effort to resolve that uncertainty through control, reassurance-seeking, and avoidance maintains the anxiety it is trying to manage.

The practice is not to eliminate uncertainty. It is to sit with it for slightly longer before acting. To notice: I do not know how today will go. I am going to find out. Then to continue with what you were doing.`,
    keyTakeaways: ["Discomfort and danger are not the same thing.", "Uncertainty-resolution strategies maintain the anxiety they are trying to manage.", "The practice is to sit with uncertainty for slightly longer before acting."],
    reflection: "What does your body do when you sit with uncertainty for slightly longer than is comfortable?",
    sessionContext: "Affirmation session on tolerating uncertainty."
  }, {
    title: "I Am More Than My Symptoms",
    type: "Guided Practice",
    img: IMGS.c5p2s4,
    body: `I am more than my symptoms. I am a person managing something difficult. And doing it.

Living with IBS involves a real risk of identity fusion: the gradual merging of your sense of self with the condition. When the gut has been the organising principle of every major decision for long enough, it can become difficult to remember there is a person separate from the gut.

This affirmation is not denial of the difficulty. It is an accurate claim about what else is true alongside the difficulty. You are not your symptoms. You are a person managing something difficult, navigating something many people do not understand, and continuing to show up for your life. That is not a small thing.

I am more than my symptoms. I am a person managing something difficult. And doing it.`,
    keyTakeaways: ["Identity fusion with IBS is a real and documented risk.", "This affirmation is an accurate claim about what else is true alongside the difficulty.", "Managing IBS while continuing to show up for life is a genuine achievement."],
    reflection: "In what areas of your life does your identity feel most separate from your IBS? What would it mean to reclaim one of those areas?",
    sessionContext: "Affirmation session addressing identity fusion in chronic IBS."
  }],
  c5p3: [{
    title: "Morning Breathing: The 4-2-6 Method",
    type: "Guided Practice",
    img: IMGS.c5p3s1,
    body: `This is your morning breathing practice. Six cycles per minute using the 4-2-6 pattern is designed to gently shift your nervous system before the day begins.

The evidence: slow diaphragmatic breathing at around 6 cycles per minute is a well-supported autonomic regulation tool, with mechanistic grounding and a growing (though still mixed) IBS-specific evidence base. When you breathe slowly, you increase vagal activity through cardio-vagal reflexes engaged by the slower rhythm. The slow rhythm also boosts heart rate variability through respiratory sinus arrhythmia, and the extended exhale engages the baroreflex, which further supports parasympathetic tone.

The practice: find a comfortable position before getting out of bed. Breathe in through your nose for 4 counts. Hold for 2 counts. Breathe out through your mouth for 6 counts. Repeat for 4 to 10 cycles.

Many people with IBS find the gut is at its most reactive in the morning. Beginning the day with a few minutes of this pattern gives your gut a slightly different starting state for everything that follows.`,
    keyTakeaways: ["6 cycles per minute maximally activates vagal tone through baroreflex and diaphragmatic vagal stimulation.", "The gut is most sensitive in the morning. Pre-day breathing gives it a different starting state.", "Even 3 to 5 minutes has measurable effects on morning autonomic tone."],
    reflection: "Did you practise the morning breathing today? What did you notice about your gut in the first hour?",
    sessionContext: "Explains the 4-2-6 morning breathing practice."
  }, {
    title: "Pre-Meal Reset: Breathing Before Eating",
    type: "Guided Practice",
    img: IMGS.c5p3s2,
    body: `A pause before eating is not a ritual. It is physiology.

The gut begins preparing for a meal before the first bite. This is the cephalic phase of digestion: the brain, upon seeing or anticipating food, sends signals down the vagus nerve that prepare the gut.

In a state of sympathetic activation, which is the baseline for many people with IBS, this preparation is disrupted. The parasympathetic system that governs digestion is suppressed. The meal arrives at a gut that is not ready.

One to three slow breaths before eating, specifically slow exhales, shifts the autonomic balance for the meal. This is not about eliminating anxiety. It is about giving your gut a slightly different starting state.

Practice: before every meal today, take one slow breath in through your nose and one long exhale out through your mouth. That is enough.`,
    keyTakeaways: ["The cephalic phase begins before the first bite and is disrupted by sympathetic activation.", "One to three slow breaths before eating shifts autonomic balance for the meal.", "The same food is received differently by a gut that has had a preparatory parasympathetic signal."],
    reflection: "Did you use the pre-meal reset today? Did you notice any difference in how the meal felt?",
    sessionContext: "Explains the cephalic phase and the pre-meal breathing reset."
  }, {
    title: "Breathing During a Flare",
    type: "Guided Practice",
    img: IMGS.c5p3s3,
    body: `When a flare is happening, the instinct is to tighten, brace, or try to make it stop. These responses tend to activate the sympathetic nervous system further, which can intensify the cascade.

Breathing during a flare is not about making the symptoms stop. It is about reducing the alarm response that amplifies them.

The practice: find the most comfortable position, whether that is sitting, lying down, or with your knees drawn up. Then slow your exhale. You do not need to take a deep breath in. A gentle inhale and a slow, extended exhale is enough. Even a few slow exhales can reduce perceived arousal, and structured sessions of a minute or two show clearer effects on vagal and baroreflex measures.

You are not fighting the symptoms. You are giving the nervous system a different signal, which over time can reduce the loop that sustains them.`,
    keyTakeaways: ["Bracing activates the sympathetic nervous system and intensifies the cascade.", "Slow exhales engage vagal and baroreflex pathways to reduce alarm signalling.", "You are not fighting the symptoms. You are reducing the loop that amplifies them."],
    reflection: "The next time you have a flare, try the slow exhale practice. Even a small shift in the alarm response is meaningful.",
    sessionContext: "Explains breathing during a flare as alarm-reduction."
  }, {
    title: "Bedtime Wind-Down",
    type: "Guided Practice",
    img: IMGS.c5p3s4,
    body: `Sleep is not passive recovery. It is one of the nervous system's most important restoration windows.

During non-REM sleep, especially slow-wave sleep, cardiac control shifts toward greater parasympathetic modulation. Parasympathetic-linked HRV indices tend to be higher in non-REM than REM, though HRV does vary by stage and metric across the night. The gut runs its own housekeeping pattern called the migrating motor complex, a fasting-state motility cycle that can occur overnight between meals and supports small-intestinal cleaning. Cortisol also drops in normal sleep.

Poor sleep is associated with worse next-day abdominal pain and symptom burden in IBS, alongside lower HRV and changes in gut permeability.

The bedtime wind-down practice is a deliberate transition toward parasympathetic activity. Find a comfortable lying position. Three slow breaths, with each exhale slightly longer than the last. Notice your body becoming heavier. Notice your abdomen. Then let go. Your gut does its own housekeeping overnight. You do not need to supervise it.`,
    keyTakeaways: ["Deep sleep is when HRV peaks, the gut resets, and cortisol drops.", "One night of poor sleep measurably increases gut sensitivity the following day.", "The bedtime wind-down is a deliberate sympathetic-to-parasympathetic transition."],
    reflection: "How did you sleep last night? What was your gut like this morning? Do you notice a pattern?",
    sessionContext: "Explains sleep as a gut-brain intervention."
  }],
  c5p4: [{
    title: "The Gut-Brain Axis: A Two-Way Communication Highway",
    type: "Science Explainer",
    img: IMGS.c5p4s1,
    body: `Your gut has its own nervous system: the enteric nervous system (ENS), containing 100 to 500 million neurons. More than the spinal cord. Scientists call it the second brain.

The ENS connects to your brain through the vagus nerve. Approximately 80 percent of signals on this nerve travel upward, from gut to brain. The gut is constantly sending information to the brain about the state of the internal environment.

The gut-brain axis communicates through neural signals, hormonal signals (gut hormones affecting mood and appetite), immune signals (cytokines crossing the blood-brain barrier), and the microbiome (which produces neurotransmitters including serotonin, GABA, and dopamine precursors).

In IBS, this bidirectional system becomes dysregulated. It is not just a gut problem. It is a gut-brain communication problem. That is why the most effective interventions target the axis itself.`,
    keyTakeaways: ["The enteric nervous system contains 100 to 500 million neurons.", "Approximately 80 percent of vagus nerve signals travel from gut to brain.", "IBS is a gut-brain communication problem, not solely a gut or psychological problem."],
    reflection: "Which part of the gut-brain connection was most surprising or most resonant with your experience?",
    sessionContext: "Science explainer covering the gut-brain axis anatomy."
  }, {
    title: "The Flare Cascade: What Is Actually Happening",
    type: "Science Explainer",
    img: IMGS.c5p4s2,
    body: `A flare is not random. It follows a documented biological sequence.

Step 1: A trigger activates the HPA axis. The hypothalamus signals the pituitary, which signals the adrenal glands to release cortisol.

Step 2: Gut permeability increases. The tight junctions between epithelial cells loosen, allowing bacterial products to cross the gut wall.

Step 3: Mast cells in the gut wall activate and release histamine and other inflammatory mediators.

Step 4: Visceral nerves become hypersensitive. Normal sensations (gas movement, contractions) become painful.

Step 5: The brain amplifies gut signals through central sensitisation.

Step 6: Anxiety and anticipatory fear rise, re-activating the HPA axis. The loop continues.`,
    keyTakeaways: ["A flare follows a documented 6-step biological cascade.", "Gut permeability, mast cell activation, visceral hypersensitivity, and central sensitisation are all measurable steps.", "Every step in the cascade is a potential intervention point."],
    reflection: "Looking at the cascade, can you identify where your flares typically begin?",
    sessionContext: "Science explainer covering the IBS flare cascade."
  }, {
    title: "Serotonin and the Gut",
    type: "Science Explainer",
    img: IMGS.c5p4s3,
    body: `90 to 95 percent of your body's serotonin is made in your gut. Not your brain. Your gut.

Serotonin is produced primarily by enterochromaffin (EC) cells in the gut mucosa. It serves three functions in the gut: regulating motility through smooth muscle coordination, modulating pain signalling, and sending messages through the vagus nerve to the brain.

In IBS-D, serotonin signalling is typically elevated and motility is faster. In IBS-C, serotonin availability is typically reduced, motility is slower, and vagal tone is lowest of all IBS subtypes.

Chronic stress, microbiome imbalance, and early life adversity all disrupt EC cell function and serotonin production. This explains why mood, stress, diet, and gut symptoms are not separate problems. They share a serotonin pathway.`,
    keyTakeaways: ["90 to 95 percent of the body's serotonin is produced in the gut.", "Serotonin governs motility, pain signalling, and gut-brain communication.", "IBS-D involves elevated serotonin; IBS-C involves reduced serotonin and lowest vagal tone."],
    reflection: "Does your IBS subtype match the serotonin profile described here?",
    sessionContext: "Science explainer covering gut serotonin."
  }, {
    title: "Vagal Tone and IBS",
    type: "Science Explainer",
    img: IMGS.c5p4s4,
    body: `The vagus nerve is the primary highway of your parasympathetic nervous system, the calming branch. It connects your brainstem directly to your heart, lungs, stomach, and intestines.

Vagal tone refers to the baseline activity of the vagus nerve. High vagal tone means the parasympathetic system is robustly active. Low vagal tone means the calming system is less active and the body tends to stay in sympathetic dominance.

In IBS, vagal tone is consistently reduced. IBS-C has the lowest vagal tone of all IBS subtypes. Low vagal tone means disrupted motility, lower pain threshold, increased gut permeability, and impaired immune regulation.

Vagal tone is trainable. Slow breathing (6 cycles per minute) directly stimulates the vagus. Regular aerobic exercise, meaningful social connection, and consistent sleep all improve vagal tone. These are not wellness suggestions. They are targeted vagal interventions.`,
    keyTakeaways: ["Vagal tone is consistently reduced in IBS, most severely in IBS-C.", "Low vagal tone means disrupted motility, lower pain threshold, and impaired gut immune regulation.", "Vagal tone is trainable through slow breathing, exercise, connection, and sleep."],
    reflection: "Which vagal tone trainers are you already doing? Which could you add most realistically?",
    sessionContext: "Science explainer covering vagal tone in IBS."
  }, {
    title: "Neuroplasticity and IBS",
    type: "Science Explainer",
    img: IMGS.c5p4s5,
    body: `Neuroplasticity is the brain's documented capacity to change its structure and function based on experience. It operates throughout the lifespan.

In IBS, the gut-brain axis is dysregulated through learned patterns: hypervigilance, anticipatory anxiety, catastrophic interpretation. These patterns involve real structural changes in neural circuits, particularly in the prefrontal cortex (which regulates the alarm system), the amygdala (which processes threat), and the insula (which processes body sensations and gut signals).

Neuroimaging studies show that effective psychological treatment for IBS, including CBT and gut-directed hypnotherapy, produces measurable changes in brain activation patterns. The prefrontal cortex becomes better at down-regulating the amygdala's alarm response. The insula's processing of gut signals becomes less distorted.

Every practice in this app is a neuroplasticity intervention. Every slow breathing session, every body scan practised without catastrophising, every graduated re-engagement is adding new data to a nervous system capable of updating.`,
    keyTakeaways: ["Neuroplasticity in IBS involves real structural changes in prefrontal cortex, amygdala, and insula circuits.", "Effective psychological treatment produces measurable changes on neuroimaging.", "Every practice in this app is a neuroplasticity intervention."],
    reflection: "How does understanding the neuroplasticity mechanism change how you think about the practices in this app?",
    sessionContext: "Science explainer covering neuroplasticity."
  }],
  // CATEGORY 5, PROGRAM 5: GUIDED RESET PRACTICES (restored; scripts from the April 2026 build chat)
  c5p5: [{
    title: "The Morning Arrival",
    type: "Guided Practice",
    img: IMGS.c5p5s1,
    body: "A two-minute practice for before you get out of bed. Read it slowly, or record yourself reading it and play it back. Quiet, gentle, and preparatory, like a whispered start to the day.\n\nBefore you get up, before the day begins, take one moment here. Feel the surface beneath you. Feel the weight of your body. Notice your breath, without changing it yet.\n\nNow, slowly, begin to breathe a little more deliberately. In through your nose. Out through your mouth, a little longer.\n\nNotice your abdomen. Not to evaluate it. Just to notice. Is there tension? Discomfort? Neutrality? Whatever is there, it is simply information. You do not need to act on it yet.\n\nTake three more slow breaths. With each exhale, let your body become slightly heavier, a little more settled.\n\nYou are going to move into the day now. And whatever the day holds, you are bringing a more regulated nervous system into it than you had thirty seconds ago. That is enough. That is a good beginning.",
    reflection: "How did your body feel when you first noticed your abdomen this morning? What, if anything, shifted after the slow breaths?",
    sessionContext: "A two-minute guided morning practice: noticing the body and abdomen without evaluating, then a few slow breaths with longer exhales, so the day starts from a more regulated nervous system."
  }, {
    title: "The Midday Reset",
    type: "Guided Practice",
    img: IMGS.c5p5s2,
    body: "A sixty-second circuit-breaker for the middle of a busy day. Brief and efficient, like a gentle interruption to a busy moment.\n\nWherever you are right now, at your desk, in your car, in a bathroom, find one moment. Feel your feet on the floor. Breathe in through your nose, four counts. Hold, two counts. Out through your mouth, six counts. Again. You are not trying to resolve anything. You are not trying to manage your gut or figure out why you feel the way you feel. You are simply here, breathing, for thirty seconds. That is a circuit-breaker. A small interruption to the stress accumulation of the day. When you are ready, continue.",
    reflection: "Where in your day would a sixty-second reset fit most naturally? What usually happens to your gut by the middle of a busy day?",
    sessionContext: "A sixty-second midday reset using the 4-2-6 breathing pattern as a circuit-breaker that interrupts the build-up of stress across the day."
  }, {
    title: "Before a Difficult Situation",
    type: "Guided Practice",
    img: IMGS.c5p5s3,
    body: "A ninety-second practice for the moments before something that feels uncertain: an event, a conversation, a meal, or a journey. Steady and grounding, like someone reminding you that you have resources.\n\nYou are about to go into something that feels uncertain. Maybe an event, a conversation, a meal, a journey. Notice the anticipation in your body. Where do you feel it? Your chest? Your gut? Your jaw?\n\nYou do not need to make it disappear. You only need to acknowledge it, and give your nervous system one different signal. Breathe in slowly. Hold. And out, slow.\n\nAgain.\n\nThe anticipation is not a reliable predictor. It is your nervous system doing its job, preparing you for something it classifies as uncertain. But uncertain is not the same as dangerous. One more breath. In. Hold. Out.\n\nYou have been here before. You have managed before. Whatever happens, you will manage again. You can go now.",
    reflection: "What is one upcoming situation where you could try this practice beforehand? Where in your body do you usually feel anticipation first?",
    sessionContext: "A ninety-second practice before an uncertain situation: noticing where anticipation sits in the body, slow breaths, and the reminder that uncertain is not the same as dangerous."
  }, {
    title: "Post-Flare Recovery",
    type: "Guided Practice",
    img: IMGS.c5p5s4,
    body: "A three-minute practice for after a flare, when the worst has passed or is passing. Gentle and compassionate, like someone sitting beside you after something hard.\n\nThe worst of it has passed, or is passing. Your body has been through something hard. It does not need to be interrogated right now. It does not need to be analysed, or blamed, or braced for the next thing.\n\nFind a comfortable position. Let your body be supported. Breathe in gently. And out slowly.\n\nA flare is a storm. Storms pass. Your nervous system responded to something, and that response is now completing. The cascade is ending. What your system needs now is a signal: the threat has passed. You are safe. You can settle.\n\nBreathe in. And out.\n\nYou do not need to figure out what caused this right now. You do not need to prevent the next one right now. Right now, the only thing that is needed is this: a few slow breaths, a body allowed to be heavy, and the quiet knowledge that you have been through this before and you are on the other side of it.\n\nStay here as long as you need.",
    reflection: "After a flare, what does your mind usually do first: analyse, blame, or brace for the next one? What would it feel like to simply let your body rest instead?",
    sessionContext: "A three-minute post-flare practice that treats a flare as a storm that passes: resting, slow breathing, and signalling safety to the nervous system instead of analysing or bracing."
  }, {
    title: "Evening Integration",
    type: "Guided Practice",
    img: IMGS.c5p5s5,
    body: "A three-minute practice for the end of the day, before sleep or winding down. Slow, finishing, and warm, like closing a door gently at the end of the day.\n\nThe day is finished. Whatever happened today, the good, the difficult, the symptoms, the moments of ease, it is complete. You do not need to carry it into sleep.\n\nFind your position for sleep or for winding down. Breathe in. And out, longer.\n\nNotice your body. The weight of it. The temperature. The subtle rise and fall of your belly. Tonight you do not need to solve anything. Your gut does its own maintenance work overnight. You do not need to supervise it.\n\nBreathe in. And out.\n\nIf thoughts arise about tomorrow, about what might happen, what you will eat, how you will feel, notice them, acknowledge them, and let them float past. They will be there in the morning if they need to be. They do not need to be solved in the dark.\n\nOne more breath in. And out.\n\nYou did enough today. Your nervous system is beginning to settle. Let it take you the rest of the way.",
    reflection: "What thoughts about tomorrow tend to show up at night? What helps you let them float past rather than trying to solve them in the dark?",
    sessionContext: "A three-minute evening practice for closing the day: slow breathing with longer exhales, noticing the body, trusting the gut's overnight maintenance, and letting thoughts about tomorrow float past."
  }]
};

// ─── PROGRAMS DATA ────────────────────────────────────────────────────────────
const CATEGORY_HEADERS = {
  "Understand Your IBS": IMGS.header1,
  "Calm the Loop": IMGS.header2,
  "Rebuild Trust": IMGS.header3,
  "Special Patterns": IMGS.header4,
  "Listen and Practice": IMGS.header5
};
const PROGRAMS = {
  "Understand Your IBS": {
    color: C.forest,
    icon: Ico.brain,
    items: [{
      title: "The IBS Mind-Gut Reset",
      n: 7,
      desc: "A foundational journey through IBS as a gut-brain disorder: what it is, what drives it, and what actually helps.",
      sessions: SESSION_DATA.c1p1
    }, {
      title: "Understanding Your IBS Pattern",
      n: 5,
      desc: "Map your personal trigger landscape and symptom history through gut-brain science.",
      sessions: SESSION_DATA.c1p2
    }]
  },
  "Calm the Loop": {
    color: C.teal,
    icon: Ico.leaf,
    items: [{
      title: "Reset Your Nervous System",
      n: 6,
      desc: "Autonomic regulation tools including breathing, pacing, and vagal activation.",
      sessions: SESSION_DATA.c2p1
    }, {
      title: "Calm the Flare Loop",
      n: 5,
      desc: "Learn to interrupt the stress, pain, and anxiety cycle both in the moment and over time.",
      sessions: SESSION_DATA.c2p2
    }, {
      title: "Breathing Tools Program",
      n: 4,
      desc: "Evidence-based slow diaphragmatic breathing for IBS.",
      sessions: SESSION_DATA.c2p3
    }]
  },
  "Rebuild Trust": {
    color: C.purple,
    icon: Ico.heart,
    items: [{
      title: "Rebuild Trust in Your Body",
      n: 6,
      desc: "Moving from fear and monitoring toward a more neutral and curious relationship with gut sensations.",
      sessions: SESSION_DATA.c3p1
    }, {
      title: "Overcome Food Anxiety",
      n: 5,
      desc: "Break the food, fear, and avoidance loop without resorting to permanent restriction.",
      sessions: SESSION_DATA.c3p2
    }, {
      title: "Emotional Resilience",
      n: 6,
      desc: "The psychological patterns IBS activates, and the evidence-based tools to rebuild from them.",
      sessions: SESSION_DATA.c3p3
    }, {
      title: "Rebuilding Life Outside Your Gut",
      n: 5,
      desc: "Return to social life, travel, and spontaneity when IBS has been holding you back.",
      sessions: SESSION_DATA.c3p4
    }, {
      title: "Overthinking, Uncertainty and Monitoring",
      n: 5,
      desc: "The hypervigilance loop in IBS and how to interrupt it without suppression.",
      sessions: SESSION_DATA.c3p5
    }]
  },
  "Special Patterns": {
    color: C.clay,
    icon: Ico.magnifier,
    items: [{
      title: "Pelvic Floor and IBS",
      n: 4,
      desc: "Outlet symptoms, constipation, and pelvic tension that coexist with IBS.",
      sessions: SESSION_DATA.c4p1
    }, {
      title: "Trauma and the Gut-Brain Connection",
      n: 6,
      desc: "Early-life adversity, the enteric nervous system, and why gut-brain dysregulation often carries a personal history.",
      sessions: SESSION_DATA.c4p2
    }, {
      title: "Post-Infectious Recovery",
      n: 4,
      desc: "The gut that never fully reset: the mechanisms behind it and how to recalibrate.",
      sessions: SESSION_DATA.c4p3
    }, {
      title: "Hormonal Patterns",
      n: 5,
      desc: "Perimenopause, hormonal cycles, and the estrogen-gut-brain connection.",
      sessions: SESSION_DATA.c4p4
    }, {
      title: "When It Might Be More Than IBS",
      n: 3,
      desc: "Red flags, diagnostic clarity, and when it is time to seek further evaluation.",
      sessions: SESSION_DATA.c4p5
    }]
  },
  "Listen and Practice": {
    color: C.blue,
    icon: Ico.headphones,
    items: [{
      title: "Gut-Directed Hypnotherapy",
      n: 7,
      desc: "Structured gut-focused imagery sessions grounded in gut-directed hypnotherapy research.",
      sessions: SESSION_DATA.c5p1
    }, {
      title: "Affirmations for IBS",
      n: 4,
      desc: "Science-aligned affirmations grounded in gut-brain biology.",
      sessions: SESSION_DATA.c5p2
    }, {
      title: "Breathing Practices",
      n: 4,
      desc: "Guided slow diaphragmatic breathing at 6 cycles per minute, clinically validated for IBS.",
      sessions: SESSION_DATA.c5p3
    }, {
      title: "Short Science Explainers",
      n: 5,
      desc: "Visual summaries of each key gut-brain mechanism with scientific references.",
      sessions: SESSION_DATA.c5p4
    }, {
      title: "Guided Reset Practices",
      n: 5,
      desc: "Integrated mind-body regulation combining breathing, imagery, and nervous system tools.",
      sessions: SESSION_DATA.c5p5
    }]
  }
};

// ─── TESTIMONIALS ─────────────────────────────────────────────────────────────
const TESTERS = [{
  n: "Kaelyn C.",
  r: "22 · IBS patient for over 6 years",
  b: "After years of appointments with gastroenterologists, dietitians, and her GP, and countless rounds of dietary restriction, Kaelyn had never received a clear explanation of why her symptoms kept worsening despite everything she tried.",
  a: "'For the first time, I actually understand what is happening in my body. I always thought it was the food. The pre-event flare diagram was my life described exactly. As someone who has had a hard semester with all of this recently, I felt genuinely emotional learning how my body was actually working.'",
  init: "K"
}, {
  n: "Daniel K.",
  r: "Physiotherapist",
  b: "Understood autonomic regulation and pelvic floor dysfunction clinically but had not previously encountered a resource that connected these directly to the IBS gut-brain axis in accessible, patient-facing language.",
  a: "This is what I wish I could hand to every patient who walks in with IBS-type symptoms and has been given no framework for understanding them. The pelvic floor overlap section is clinically sound and explained beautifully.",
  init: "D"
}, {
  n: "Monika M.",
  r: "48 · Perimenopausal · IBS since her 30s",
  b: "Monika had managed her IBS reasonably well for years, but since entering perimenopause her symptoms had become unpredictable and severe again. Each specialist appointment left her feeling more confused and more alone.",
  a: "I did not know hormones had anything to do with my gut. I did not know perimenopause could make IBS worse. I did not know any of this was connected. I finally do not feel like I am going crazy.",
  init: "M"
}];
const MISSING = [{
  q: "Nobody explained that stress physically changes the gut, not just the mood.",
  who: "Survey respondent · University student"
}, {
  q: "I wish someone had told me food was not the whole story much earlier.",
  who: "Survey respondent · 28, IBS for 4 years"
}, {
  q: "I did not know there were options beyond cutting things out. Restriction was all I had.",
  who: "Survey respondent · Perimenopausal, outlet symptoms"
}, {
  q: "It would have helped so much to know my gut and brain were one system, not two separate problems.",
  who: "Survey respondent · Post-infectious IBS"
}];

// ─── TOOLS ────────────────────────────────────────────────────────────────────
const TOOLS = [{
  icon: Ico.wind,
  color: C.teal,
  title: "Flare Reset",
  desc: "A 90-second nervous system downshift.",
  script: `Find a comfortable position. Sitting is fine. Lying down with knees drawn up is fine. Whatever feels least activating right now.

Notice your jaw. Soften it if you can. Notice your shoulders. Let them drop slightly away from your ears.

Now take a gentle breath in through your nose. You don't need it to be deep. Just gentle. Hold for a count of two. Then breathe out slowly through your mouth for a count of six. Longer than the inhale.

Do that again. In for four. Hold for two. Out for six.

Your body may still feel activated. That's normal. You're not trying to make the flare stop. You're interrupting the alarm signal that amplifies it.

One more slow exhale. Six counts. Feel your belly soften slightly as you breathe out.

The cascade is biological. It has momentum. Slowing your exhale doesn't erase that momentum. It just reduces the sympathetic amplification slightly. Even a small shift matters.

You did enough. The nervous system heard the signal. You can return to this anytime the alarm rises again.`
}, {
  icon: Ico.meal,
  color: C.forest,
  title: "Pre-Meal Reset",
  desc: "Reduce anticipatory gut activation before eating.",
  script: `Before you eat, pause for a moment.

Your gut is already preparing. The cephalic phase of digestion begins before the first bite. The brain sees or anticipates food and sends signals down the vagus nerve. The gut begins secreting enzymes. Blood flow increases to the intestines.

In a state of sympathetic activation, which many people with IBS carry as a baseline, this preparation is disrupted. The meal arrives at a gut that is not ready.

One to three slow breaths before eating shifts that state.

Take a gentle breath in through your nose for a count of four. Hold for two. Breathe out through your mouth for six.

Do it one more time. In for four. Hold for two. Out for six.

That's enough. You've given your gut a parasympathetic signal. The same food will be received differently by a gut that has had that preparation.

You're not trying to eliminate all anxiety. You're giving your nervous system a slightly different starting state for this meal.

Now eat. The gut heard the signal.`
}, {
  icon: Ico.moon,
  color: C.blue,
  title: "Bedtime Wind-Down",
  desc: "Evening regulation for the gut-brain axis.",
  script: `Find a comfortable lying position. On your back is fine. On your side is fine. Whatever feels restful.

Notice the surface beneath you. Feel the weight of your body. Let it be heavy.

Take a slow breath in through your nose. Not deep. Just slow. And breathe out longer than you breathed in. Six counts or more if that feels comfortable.

With each exhale, imagine your body loosening some of the tension it's been holding all day. Your jaw. Your shoulders. Your belly.

Another slow breath. In gently. Out longer.

Sleep is not passive recovery. During deep slow-wave sleep, your nervous system shifts fully into parasympathetic mode. HRV peaks. Your gut undergoes its overnight reset. The migrating motor complex clears the intestines. Cortisol drops.

One more slow exhale. Your gut does its own maintenance overnight. You don't need to supervise it. You don't need to monitor it.

This is a moment for downshifting. For letting the nervous system know the day is finished.

Your gut doesn't need to be perfect tonight. It just needs rest. You did enough today.

Let go now.`
}, {
  icon: Ico.salad,
  color: C.purple,
  title: "Food Anxiety Reset",
  desc: "Interrupt catastrophic thinking around eating.",
  script: `Food matters in IBS. Dietary triggers are real. But food is not the whole story.

If you're feeling afraid before eating, come back to the present moment for a second.

Ask yourself: what do I know for sure right now?

Not what I'm assuming. Not what happened last time. What do I know for certain in this moment?

Your nervous system can amplify symptoms through anticipation alone. The pre-event flare is well-documented. The gut responds to anticipated threat days before an event even happens.

So the fear itself is part of the mechanism.

Take one slow breath. In gently. Out slowly.

This meal does not need to be perfect. You're not trying to control every symptom. You're reducing the alarm signal that makes symptoms worse.

Food triggers are individual. They're real. But the same food can be tolerated when you're calm and trigger a flare when you're activated, because your autonomic state changes how your gut processes everything.

One more breath. In. Out.

You're doing the best you can. The fact that you're even thinking about this shows you're engaged with your care. That matters.

Now eat. One bite at a time. No catastrophizing. Just noticing.`
}, {
  icon: Ico.lotus,
  color: C.sage,
  title: "Body Scan Grounding",
  desc: "Interoceptive awareness: noticing without monitoring.",
  script: `Find a comfortable position. Sitting or lying down.

Bring your attention to the soles of your feet. You're not trying to change anything. Just notice. What's the temperature? Any pressure? Any sensation at all?

Slowly move your attention upward. To your ankles. Your calves. Your knees.

You're practicing interoception. That's the technical term for attending to body sensations from the inside. It's different from monitoring.

Monitoring is vigilance. It's checking for danger. It's asking 'is this getting worse?'

Interoception is just noticing. No interpretation. No alarm.

Move your attention to your thighs. Your hips. Your lower back. What do you notice? Tension? Heaviness? Numbness? Whatever's there is fine.

Now your abdomen. This is often the hardest part for people with IBS. The instinct is to brace. To tighten. To protect.

See if you can soften your belly slightly. Not forcing. Just allowing.

What do you notice? Movement? Stillness? Warmth? Tightness? You're not evaluating. You're just observing.

Move your attention to your chest. Your shoulders. Your neck. Your jaw.

Now take a slow breath and notice your whole body at once. Heavy. Supported by the surface beneath you.

Interoception without alarm is a skill. It takes practice. The more you practice noticing without catastrophizing, the more your nervous system learns that body sensations are not always threats.

You did enough. You practiced awareness without vigilance. That's the work.`
}];

// ─── SCRIPT PLAYER (Word-by-Word Animated) ───────────────────────────────────
function ScriptPlayer({
  script
}) {
  const [sentences, setSentences] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const timeoutRef = useRef(null);
  useEffect(() => {
    // Split into sentences on sentence-ending punctuation followed by whitespace,
    // and on blank lines (paragraph breaks). Keeps punctuation.
    const parts = script.split(/(?<=[.!?])\s+|\n\s*\n/).map(s => s.trim()).filter(s => s.length > 0);
    setSentences(parts);
  }, [script]);

  // Estimate duration: ~1.2s base + 320ms per word, min 2.2s, max 12s.
  function durationFor(s) {
    const words = s.split(/\s+/).length;
    return Math.min(12000, Math.max(2200, 1200 + words * 320));
  }
  useEffect(() => {
    if (isPlaying && currentIndex < sentences.length) {
      const ms = durationFor(sentences[currentIndex] || "");
      timeoutRef.current = setTimeout(() => {
        setCurrentIndex(i => {
          if (i >= sentences.length - 1) {
            setIsPlaying(false);
            setIsPaused(false);
            return i;
          }
          return i + 1;
        });
      }, ms);
    } else if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isPlaying, currentIndex, sentences]);
  function play() {
    setIsPlaying(true);
    setIsPaused(false);
  }
  function pause() {
    setIsPlaying(false);
    setIsPaused(true);
  }
  function restart() {
    setCurrentIndex(0);
    setIsPlaying(true);
    setIsPaused(false);
  }
  function next() {
    if (currentIndex < sentences.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      setIsPlaying(false);
      setIsPaused(false);
    }
  }
  function getDisplayText() {
    if (currentIndex === 0 && !isPlaying && !isPaused) {
      return "Press Play to begin, or tap Next to move through the script at your own pace.";
    }
    return sentences.slice(0, currentIndex + 1).map((s, i) => {
      if (i === currentIndex) {
        return /*#__PURE__*/React.createElement("span", {
          key: i,
          style: {
            color: C.forest,
            fontWeight: "bold",
            display: "block",
            marginBottom: 10
          }
        }, s);
      }
      return /*#__PURE__*/React.createElement("span", {
        key: i,
        style: {
          opacity: 0.55,
          display: "block",
          marginBottom: 10
        }
      }, s);
    });
  }
  const progress = sentences.length > 0 ? (currentIndex + 1) / sentences.length * 100 : 0;
  // Estimate remaining by summing durations of remaining sentences
  const remainingMs = sentences.slice(currentIndex + 1).reduce((acc, s) => acc + durationFor(s), 0);
  const timeRemaining = Math.ceil(remainingMs / 1000);
  const atEnd = currentIndex >= sentences.length - 1;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.white,
      borderRadius: 14,
      padding: 18,
      marginBottom: 14,
      boxShadow: "0 2px 12px rgba(0,0,0,.06)",
      minHeight: 220
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      lineHeight: 1.7,
      fontFamily: "Georgia,serif",
      color: C.charcoal,
      marginBottom: 16
    }
  }, getDisplayText()), isPlaying || isPaused ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 4,
      background: C.creamDark,
      borderRadius: 2,
      overflow: "hidden",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      background: C.forest,
      width: `${progress}%`,
      transition: "width 0.4s ease"
    }
  })), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10,
      color: C.charcoal,
      opacity: 0.5,
      textAlign: "center"
    }
  }, atEnd ? "Complete" : `Sentence ${currentIndex + 1} of ${sentences.length} · ~${timeRemaining}s remaining`)) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 10
    }
  }, !isPlaying ? /*#__PURE__*/React.createElement("button", {
    onClick: play,
    style: {
      flex: 1,
      background: C.forest,
      color: C.white,
      border: "none",
      borderRadius: 28,
      padding: "13px",
      fontSize: 13,
      fontWeight: "bold",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 7
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "currentColor",
    style: {
      width: 14,
      height: 14
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8 5v14l11-7z"
  })), isPaused ? "Resume" : "Play") : /*#__PURE__*/React.createElement("button", {
    onClick: pause,
    style: {
      flex: 1,
      background: C.clay,
      color: C.white,
      border: "none",
      borderRadius: 28,
      padding: "13px",
      fontSize: 13,
      fontWeight: "bold",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 7
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "currentColor",
    style: {
      width: 14,
      height: 14
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M6 4h4v16H6V4zm8 0h4v16h-4V4z"
  })), "Pause"), /*#__PURE__*/React.createElement("button", {
    onClick: next,
    disabled: atEnd,
    style: {
      flex: 1,
      background: atEnd ? C.creamDark : C.sage,
      color: C.white,
      border: "none",
      borderRadius: 28,
      padding: "13px",
      fontSize: 13,
      fontWeight: "bold",
      cursor: atEnd ? "default" : "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      opacity: atEnd ? 0.55 : 1
    }
  }, "Next", /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    style: {
      width: 14,
      height: 14
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M9 6l6 6-6 6"
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: restart,
    style: {
      flex: 1,
      background: C.teal,
      color: C.white,
      border: "none",
      borderRadius: 28,
      padding: "13px",
      fontSize: 13,
      fontWeight: "bold",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 7
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    style: {
      width: 14,
      height: 14
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M21 3v5h-5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 21v-5h5"
  })), "Restart")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10.5,
      color: C.charcoal,
      opacity: .55,
      textAlign: "center",
      marginBottom: 10,
      lineHeight: 1.45
    }
  }, "Tap Next to move at your own pace, or Play for automatic advancement timed to reading speed."), /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.cream,
      borderRadius: 10,
      padding: 12,
      display: "flex",
      alignItems: "flex-start",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.clay,
      flexShrink: 0,
      marginTop: 1
    }
  }, Ico.warning), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: C.charcoal,
      opacity: .6,
      lineHeight: 1.5
    }
  }, "This is not medical advice. This guided practice is for educational support only.")));
}

// ─── SESSION DETAIL VIEW ──────────────────────────────────────────────────────
function SessionView({
  session,
  color,
  onBack,
  onNavigate
}) {
  const [showTop, setShowTop] = useState(false);
  const [chatTrigger, setChatTrigger] = useState(null);
  const scrollRef = useRef(null);
  const ktRef = useRef(null);
  const reflRef = useRef(null);
  const chatRef = useRef(null);
  function askPlainer() {
    setChatTrigger({
      query: "Can you explain this in plainer English?",
      n: Date.now()
    });
    // Scroll to chat area just after state updates settle
    setTimeout(() => {
      if (chatRef.current && scrollRef.current) {
        const top = chatRef.current.offsetTop - 20;
        scrollRef.current.scrollTo({
          top,
          behavior: "smooth"
        });
      }
    }, 140);
  }
  function handleScroll(e) {
    setShowTop(e.target.scrollTop > 400);
  }
  function jumpTo(r) {
    if (r?.current && scrollRef.current) {
      const top = r.current.offsetTop - 12;
      scrollRef.current.scrollTo({
        top,
        behavior: "smooth"
      });
    }
  }
  function toTop() {
    if (scrollRef.current) scrollRef.current.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  // Render each paragraph as prose, OR as a bulleted list if all lines in the
  // paragraph begin with a bullet marker ("• " or "- " or "* ").
  function renderParagraph(para, i) {
    const lines = para.split("\n").map(l => l.trim()).filter(Boolean);
    const bulletRe = /^[•\-*]\s+/;
    const isList = lines.length >= 2 && lines.every(l => bulletRe.test(l));
    if (isList) {
      return /*#__PURE__*/React.createElement("ul", {
        key: i,
        style: {
          fontSize: 13.5,
          lineHeight: 1.75,
          color: C.charcoal,
          marginBottom: 14,
          paddingLeft: 20,
          listStyle: "none"
        }
      }, lines.map((l, j) => /*#__PURE__*/React.createElement("li", {
        key: j,
        style: {
          marginBottom: 6,
          position: "relative",
          paddingLeft: 4
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          position: "absolute",
          left: -16,
          top: 1,
          color: color || C.forest,
          fontWeight: "bold"
        }
      }, "•"), l.replace(bulletRe, ""))));
    }
    return /*#__PURE__*/React.createElement("p", {
      key: i,
      style: {
        fontSize: 13.5,
        lineHeight: 1.85,
        color: C.charcoal,
        marginBottom: 14
      }
    }, para);
  }
  return /*#__PURE__*/React.createElement(Shell, null, /*#__PURE__*/React.createElement("div", {
    ref: scrollRef,
    onScroll: handleScroll,
    style: {
      flex: 1,
      overflowY: "auto",
      paddingBottom: 20,
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: color || C.forest,
      padding: "48px 18px 20px",
      position: "relative",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": "Back",
    onClick: onBack,
    style: {
      position: "absolute",
      top: 12,
      left: 12,
      background: "rgba(255,255,255,.18)",
      border: "none",
      borderRadius: "50%",
      width: 34,
      height: 34,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      color: C.white
    }
  }, Ico.back), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10,
      color: "rgba(255,255,255,.5)",
      letterSpacing: 2,
      fontWeight: "bold",
      marginBottom: 4
    }
  }, session.type), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 20,
      fontFamily: "Georgia,serif",
      color: C.white,
      lineHeight: 1.3
    }
  }, session.title)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 16px 40px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      fontStyle: "italic",
      color: C.charcoal,
      opacity: 0.62,
      textAlign: "center",
      marginBottom: 8
    }
  }, "Scroll down for key takeaways and a reflection prompt."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      justifyContent: "center",
      flexWrap: "wrap"
    }
  }, session.keyTakeaways && /*#__PURE__*/React.createElement("button", {
    onClick: () => jumpTo(ktRef),
    style: {
      background: C.sageLight,
      color: C.forest,
      border: "none",
      borderRadius: 14,
      padding: "4px 10px",
      fontSize: 10.5,
      fontWeight: "bold",
      letterSpacing: 0.5,
      cursor: "pointer"
    }
  }, "Key Takeaways"), session.reflection && /*#__PURE__*/React.createElement("button", {
    onClick: () => jumpTo(reflRef),
    style: {
      background: C.sageLight,
      color: C.forest,
      border: "none",
      borderRadius: 14,
      padding: "4px 10px",
      fontSize: 10.5,
      fontWeight: "bold",
      letterSpacing: 0.5,
      cursor: "pointer"
    }
  }, "Reflection"), session.reflection && session.sessionContext && /*#__PURE__*/React.createElement("button", {
    onClick: () => jumpTo(chatRef),
    style: {
      background: C.sageLight,
      color: C.forest,
      border: "none",
      borderRadius: 14,
      padding: "4px 10px",
      fontSize: 10.5,
      fontWeight: "bold",
      letterSpacing: 0.5,
      cursor: "pointer"
    }
  }, "Ask Gut IQ"))), session.reflection && session.sessionContext && /*#__PURE__*/React.createElement("button", {
    onClick: askPlainer,
    style: {
      width: "100%",
      background: C.white,
      border: `1.5px dashed ${color || C.forest}`,
      borderRadius: 12,
      padding: "11px 14px",
      marginBottom: 14,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 10,
      color: color || C.forest,
      fontSize: 12,
      fontWeight: "bold",
      textAlign: "left",
      transition: "background 0.15s"
    },
    onMouseEnter: e => e.currentTarget.style.background = C.sageLight,
    onMouseLeave: e => e.currentTarget.style.background = C.white
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 16,
      height: 16,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "10",
    r: "0.8",
    fill: "currentColor"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "10",
    r: "0.8",
    fill: "currentColor"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "15",
    cy: "10",
    r: "0.8",
    fill: "currentColor"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      lineHeight: 1.4
    }
  }, "Want this in plainer English? Click here to get Gut IQ to explain it simply."), /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 14,
      height: 14,
      flexShrink: 0,
      opacity: 0.6
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M9 18l6-6-6-6"
  }))), session.img && /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.white,
      borderRadius: 14,
      padding: 8,
      marginBottom: 14,
      boxShadow: "0 3px 16px rgba(35,68,59,.1)",
      overflow: "hidden",
      border: "1px solid " + C.creamDark
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: session.img,
    alt: session.title,
    style: {
      width: "100%",
      borderRadius: 8,
      display: "block",
      maxHeight: 500,
      objectFit: "contain"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.white,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      boxShadow: "0 2px 12px rgba(0,0,0,.06)"
    }
  }, session.body.split("\n\n").map((para, i) => renderParagraph(para, i))), session.keyTakeaways && /*#__PURE__*/React.createElement("div", {
    ref: ktRef,
    style: {
      background: C.sageLight,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      fontWeight: "bold",
      color: C.forest,
      letterSpacing: 1,
      marginBottom: 10
    }
  }, "KEY TAKEAWAYS"), session.keyTakeaways.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 7
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 18,
      height: 18,
      borderRadius: "50%",
      background: C.forest,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      marginTop: 1
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: C.white,
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 10,
      height: 10
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6L9 17l-5-5"
  }))), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12.5,
      color: C.charcoal,
      lineHeight: 1.55
    }
  }, t)))), session.reflection && /*#__PURE__*/React.createElement("div", {
    ref: reflRef,
    style: {
      background: C.cream,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      borderLeft: `3px solid ${color || C.forest}`
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      fontWeight: "bold",
      color: color || C.forest,
      letterSpacing: 1,
      marginBottom: 8
    }
  }, "REFLECTION PROMPT"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13.5,
      fontFamily: "Georgia,serif",
      fontStyle: "italic",
      color: C.charcoal,
      lineHeight: 1.7
    }
  }, session.reflection)), session.reflection && session.sessionContext && /*#__PURE__*/React.createElement("div", {
    ref: chatRef
  }, /*#__PURE__*/React.createElement(ReflectionChat, {
    sessionTitle: session.title,
    reflectionPrompt: session.reflection,
    sessionContext: session.sessionContext,
    sessionBody: session.body,
    onNavigate: onNavigate,
    externalTrigger: chatTrigger
  }))), showTop && /*#__PURE__*/React.createElement("button", {
    onClick: toTop,
    "aria-label": "Back to top",
    style: {
      position: "sticky",
      bottom: 16,
      left: "calc(100% - 56px)",
      display: "flex",
      background: C.forest,
      color: C.white,
      border: "none",
      borderRadius: "50%",
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      boxShadow: "0 3px 12px rgba(35,68,59,.35)",
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 18,
      height: 18
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 19V5M5 12l7-7 7 7"
  })))));
}

// ─── PROGRAM DETAIL VIEW ──────────────────────────────────────────────────────
function ProgramView({
  program,
  color,
  onBack,
  onSession
}) {
  return /*#__PURE__*/React.createElement(Shell, null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      paddingBottom: 20
    }
  }, /*#__PURE__*/React.createElement(Hdr, {
    title: program.title,
    sub: `${program.n} sessions`,
    color: color,
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    className: "gom-stagger",
    style: {
      padding: "16px 16px 60px"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13.5,
      lineHeight: 1.7,
      color: C.charcoal,
      marginBottom: 18
    }
  }, program.desc), program.sessions ? program.sessions.map((sess, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => onSession(sess),
    style: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: 12,
      background: C.white,
      border: "none",
      borderRadius: 13,
      padding: "13px 14px",
      marginBottom: 9,
      cursor: "pointer",
      boxShadow: "0 1px 5px rgba(0,0,0,.05)",
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 34,
      height: 34,
      borderRadius: "50%",
      background: color,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.white,
      fontSize: sess.overview ? 10 : 12,
      fontWeight: "bold"
    }
  }, sess.overview ? "ALL" : i + 1 - program.sessions.slice(0, i).filter(s => s.overview).length)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      fontWeight: "bold",
      color: C.charcoal
    }
  }, sess.title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: C.charcoal,
      opacity: .42
    }
  }, sess.overview ? "Program overview, all sessions in one" : sess.type)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      color: C.charcoal,
      opacity: .22
    }
  }, "›"))) : Array.from({
    length: program.n
  }, (_, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      background: C.white,
      borderRadius: 13,
      padding: "13px 14px",
      marginBottom: 9,
      boxShadow: "0 1px 5px rgba(0,0,0,.05)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: "50%",
      background: C.creamDark,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: C.charcoal,
      opacity: .35
    }
  }, i + 1)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      fontWeight: "bold",
      color: C.charcoal
    }
  }, "Session ", i + 1), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: C.charcoal,
      opacity: .42
    }
  }, "Education · Practice · Reflection")), /*#__PURE__*/React.createElement("button", {
    style: {
      background: C.cream,
      border: "none",
      borderRadius: 18,
      padding: "6px 13px",
      fontSize: 11,
      color: C.charcoal,
      cursor: "pointer"
    }
  }, "Coming soon"))))));
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function App() {
  const [tab, setTab] = useLocalState("gom_tab", "home", v => ["home", "programs", "tools", "learn", "support"].indexOf(v) !== -1);
  const mainRef = useRef(null);
  const tabScroll = useRef({}); // each tab remembers how far down you scrolled
  const paneRefs = useRef([]);
  const navApi = useRef(null);
  const [view, setView] = useState(null); // { type, data }
  const [viewHistory, setViewHistory] = useState([]); // Navigation stack
  const [quizS, setQuizS0] = useState("idle");
  const [motion, setMotion] = useState({
    id: 0,
    dir: "none"
  });
  GOM_MOTION = motion;
  function mark(dir) {
    gomSnapshot(dir);
    setMotion(m => ({
      id: m.id + 1,
      dir
    }));
  }
  function setQuizS(s) {
    mark(s === "idle" ? "pop" : "push");
    setQuizS0(s);
  }
  function replaceView(type, data) {
    mark("push");
    setView({
      type,
      data
    });
  }
  const [quizR, setQuizR] = useState(null);
  function go(type, data) {
    mark("push");
    if (view) setViewHistory(h => [...h, view]); // Save current view before navigating
    setView({
      type,
      data
    });
  }
  function back(dir) {
    mark(typeof dir === "string" ? dir : "pop");
    if (viewHistory.length > 0) {
      const prev = viewHistory[viewHistory.length - 1];
      setView(prev);
      setViewHistory(h => h.slice(0, -1));
    } else {
      setView(null);
    }
  }

  // When you come back from a program or tool, return to the same spot on the tab
  // Phone back gestures and the browser Back button go back one screen inside the app
  // instead of leaving the site.
  const inSub = !!view || quizS !== "idle";
  const guard = useRef(false);
  const skipPop = useRef(false);
  const backRef = useRef(null);
  backRef.current = function (dir) {
    if (view) back(dir);else if (quizS !== "idle") {
      mark(dir);
      setQuizS0("idle");
    }
  };
  const subRef = useRef(false);
  subRef.current = inSub;
  useEffect(() => {
    function onPop(e) {
      if (skipPop.current) {
        skipPop.current = false;
        return;
      }
      if (e.state && e.state.gom) {
        skipPop.current = true;
        try {
          history.back();
        } catch (x) {}
        return;
      }
      guard.current = false;
      if (subRef.current) backRef.current("fade");
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    try {
      if (inSub && !guard.current) {
        history.pushState({
          gom: 1
        }, "");
        guard.current = true;
      } else if (!inSub && guard.current) {
        guard.current = false;
        skipPop.current = true;
        history.back();
        setTimeout(() => {
          skipPop.current = false;
        }, 700);
      }
    } catch (x) {}
  }, [inSub, motion.id]);

  // On the home-screen app (no browser bar), swipe from the left edge to go back, like Instagram.
  useEffect(() => {
    const standalone = window.navigator.standalone === true || window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
    if (!standalone) return;
    let el = null,
      sx = 0,
      sy = 0,
      dx = 0,
      lastX = 0,
      lastT = 0,
      vel = 0,
      active = false,
      decided = false;
    function start(e) {
      if (!subRef.current || e.touches.length !== 1) return;
      const scr = document.querySelector(".gom-screen");
      if (!scr) return;
      const t = e.touches[0];
      if (t.clientX - scr.getBoundingClientRect().left > 28) return;
      el = scr;
      sx = lastX = t.clientX;
      sy = t.clientY;
      lastT = Date.now();
      dx = 0;
      vel = 0;
      active = true;
      decided = false;
    }
    function move(e) {
      if (!active) return;
      const t = e.touches[0],
        mx = t.clientX - sx,
        my = t.clientY - sy;
      if (!decided) {
        if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
        decided = true;
        if (Math.abs(my) > Math.abs(mx) || mx < 0) {
          active = false;
          return;
        }
        el.style.animation = "none";
        el.style.transition = "none";
        el.style.boxShadow = "-12px 0 32px rgba(0,0,0,.14)";
      }
      const now = Date.now();
      vel = (t.clientX - lastX) / Math.max(1, now - lastT);
      lastX = t.clientX;
      lastT = now;
      dx = Math.max(0, mx);
      el.style.transform = "translate3d(" + dx + "px,0,0)";
      if (e.cancelable) e.preventDefault();
    }
    function end() {
      if (!active) return;
      active = false;
      if (!decided) return;
      const node = el,
        w = node.offsetWidth,
        leave = dx > w * 0.35 || vel > 0.45 && dx > 40;
      node.style.transition = "transform .26s cubic-bezier(.2,.9,.22,1)";
      node.style.transform = leave ? "translate3d(" + w + "px,0,0)" : "translate3d(0,0,0)";
      setTimeout(() => {
        if (leave) backRef.current("fade");else {
          node.style.transition = "";
          node.style.transform = "";
          node.style.boxShadow = "";
        }
      }, 260);
    }
    document.addEventListener("touchstart", start, {
      passive: true
    });
    document.addEventListener("touchmove", move, {
      passive: false
    });
    document.addEventListener("touchend", end);
    document.addEventListener("touchcancel", end);
    return () => {
      document.removeEventListener("touchstart", start);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end);
      document.removeEventListener("touchcancel", end);
    };
  }, []);

  // Special full-screen views
  if (view?.type === "sleep") return /*#__PURE__*/React.createElement(Shell, null, /*#__PURE__*/React.createElement(SleepPlanner, {
    onBack: back
  }));
  if (view?.type === "references") return /*#__PURE__*/React.createElement(Shell, null, /*#__PURE__*/React.createElement(ReferencesTab, {
    go: back
  }));
  if (view?.type === "routine") return /*#__PURE__*/React.createElement(Shell, null, /*#__PURE__*/React.createElement(RoutineBuilder, {
    onBack: back
  }));
  if (view?.type === "cycle") return /*#__PURE__*/React.createElement(Shell, null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      paddingBottom: 20
    }
  }, /*#__PURE__*/React.createElement(Hdr, {
    title: "Cycle & Gut-Brain",
    sub: "How your cycle phase affects gut-brain signalling",
    color: `linear-gradient(160deg,${C.purple},${C.forest})`,
    onBack: back
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px 16px 40px"
    }
  }, /*#__PURE__*/React.createElement(CycleTracker, null))));
  if (view?.type === "chat") return /*#__PURE__*/React.createElement(Shell, null, /*#__PURE__*/React.createElement(Hdr, {
    title: "Ask Gut IQ",
    sub: "Science-backed. Not medical advice.",
    color: `linear-gradient(160deg,#5B8FAF,${C.forest})`,
    onBack: back
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: "12px 16px",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement(Chat, null)));
  if (view?.type === "pacer") return /*#__PURE__*/React.createElement(Shell, null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      paddingBottom: 20
    }
  }, /*#__PURE__*/React.createElement(Hdr, {
    title: "Breathing Pacer",
    sub: "Inhale 4s, Hold 2s, Exhale 6s",
    color: `linear-gradient(160deg,${C.teal},${C.forest})`,
    onBack: back
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "4px 16px 60px"
    }
  }, /*#__PURE__*/React.createElement(Pacer, null))));
  if (view?.type === "tool") {
    const t = view.data;
    const TOOL_BG_IMAGES = [IMGS.header1, IMGS.header4, IMGS.home_bg, IMGS.header2, IMGS.header5];
    const toolIdx = TOOLS.indexOf(t);
    const bgImg = TOOL_BG_IMAGES[toolIdx >= 0 ? toolIdx % TOOL_BG_IMAGES.length : 0];
    return /*#__PURE__*/React.createElement(Shell, null, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        paddingBottom: 20,
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement(Hdr, {
      title: t.title,
      sub: t.desc,
      color: "linear-gradient(135deg," + t.color + "," + C.forest + ")",
      onBack: back
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative",
        padding: "16px 16px 60px"
      }
    }, bgImg && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("img", {
      src: bgImg,
      alt: "",
      style: {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: "center",
        opacity: 0.1,
        pointerEvents: "none",
        zIndex: 0
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        background: `linear-gradient(160deg, ${t.color}14, transparent 55%, ${t.color}18)`,
        pointerEvents: "none",
        zIndex: 0
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative",
        zIndex: 1
      }
    }, /*#__PURE__*/React.createElement(ScriptPlayer, {
      script: t.script
    })))));
  }
  if (view?.type === "session") return /*#__PURE__*/React.createElement(SessionView, {
    session: view.data.session,
    color: view.data.color,
    onBack: back,
    onNavigate: action => {
      if (action === "pacer") {
        replaceView("pacer", {});
      } else if (action === "sleep") {
        replaceView("sleep", {});
      } else if (action === "routine") {
        replaceView("routine", {});
      } else if (action === "chat") {
        replaceView("chat", {});
      } else if (action === "tool_flare") {
        replaceView("tool", TOOLS[0]);
      } else if (action === "tool_food") {
        replaceView("tool", TOOLS[3]);
      } else if (action === "tool_meal") {
        replaceView("tool", TOOLS[1]);
      } else if (action === "tool_body") {
        replaceView("tool", TOOLS[4]);
      }
    }
  });
  if (view?.type === "prog") {
    const p = view.data;
    return /*#__PURE__*/React.createElement(ProgramView, {
      program: p,
      color: p.color,
      onBack: back,
      onSession: sess => go("session", {
        session: sess,
        color: p.color
      })
    });
  }
  if (quizS === "active") return /*#__PURE__*/React.createElement(Shell, null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      paddingBottom: 20
    }
  }, /*#__PURE__*/React.createElement(Hdr, {
    title: "Find Your Starting Point",
    sub: "3 questions · Not diagnostic",
    color: `linear-gradient(160deg,${C.clay},${C.clayLight})`,
    onBack: () => setQuizS("idle")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 16px"
    }
  }, /*#__PURE__*/React.createElement(Quiz, {
    onDone: r => {
      setQuizR(r);
      setQuizS("result");
    }
  }))));
  if (quizS === "result" && quizR) return /*#__PURE__*/React.createElement(Shell, null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      paddingBottom: 20
    }
  }, /*#__PURE__*/React.createElement(Hdr, {
    title: "Your Starting Point",
    color: `linear-gradient(160deg,${C.forest},${C.teal})`,
    onBack: () => setQuizS("idle")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 16px 60px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.white,
      borderRadius: 18,
      padding: 20,
      boxShadow: "0 4px 20px rgba(0,0,0,.08)",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10,
      fontWeight: "bold",
      color: C.charcoal,
      opacity: .35,
      letterSpacing: 1,
      marginBottom: 8
    }
  }, "BASED ON YOUR PATTERN"), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 17,
      fontFamily: "Georgia,serif",
      color: C.charcoal,
      marginBottom: 10
    }
  }, "We suggest starting with"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.sageLight,
      borderRadius: 11,
      padding: 13,
      marginBottom: 11
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      fontWeight: "bold",
      color: C.forest
    }
  }, quizR.p), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: C.charcoal,
      opacity: .5
    }
  }, "in ", quizR.c)), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: C.charcoal,
      lineHeight: 1.65,
      opacity: .8
    }
  }, quizR.r)), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const cat = PROGRAMS[quizR.c];
      const prog = cat && cat.items.find(p => p.title === quizR.p);
      setQuizS("idle");
      setTab("programs");
      if (prog) go("prog", {
        ...prog,
        color: cat.color
      });
    },
    style: {
      width: "100%",
      background: C.forest,
      color: C.white,
      border: "none",
      borderRadius: 28,
      padding: "14px",
      fontSize: 14,
      fontWeight: "bold",
      cursor: "pointer",
      marginBottom: 10
    }
  }, "Start This Program →"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setQuizS("idle"),
    style: {
      width: "100%",
      background: C.cream,
      color: C.charcoal,
      border: `1px solid ${C.creamDark}`,
      borderRadius: 28,
      padding: "12px",
      fontSize: 13,
      cursor: "pointer"
    }
  }, "Explore on my own"))));
  return /*#__PURE__*/React.createElement(Shell, null, /*#__PURE__*/React.createElement(TabPager, {
    tab: tab,
    setTab: setTab,
    navApi: navApi,
    scrollStore: tabScroll,
    paneRefs: paneRefs,
    panes: {
      home: /*#__PURE__*/React.createElement(HomeTab, {
        go: go,
        setTab: setTab,
        setQuizS: setQuizS
      }),
      programs: /*#__PURE__*/React.createElement(ProgsTab, {
        go: go
      }),
      tools: /*#__PURE__*/React.createElement(ToolsTab, {
        go: go,
        setQuizS: setQuizS
      }),
      learn: /*#__PURE__*/React.createElement(LearnTab, {
        go: go
      }),
      support: /*#__PURE__*/React.createElement(SupportTab, null)
    }
  }), /*#__PURE__*/React.createElement(Nav, {
    tab: tab,
    setTab: setTab,
    api: navApi,
    onReselect: () => {
      const p = paneRefs.current[TAB_ORDER.indexOf(tab)];
      if (p) p.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }
  }));
}

// ─── HOME TAB ─────────────────────────────────────────────────────────────────
function HomeTab({
  go,
  setTab,
  setQuizS
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "gom-stagger",
    style: {
      background: C.sagePale,
      minHeight: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: `linear-gradient(155deg,#1a3530 0%,${C.forest} 40%,${C.forestLight} 70%,${C.teal} 100%)`,
      padding: "52px 20px 28px",
      position: "relative",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: IMGS.home_bg,
    alt: "",
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover",
      objectPosition: "center",
      opacity: .22,
      mixBlendMode: "screen",
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: -30,
      right: -30,
      width: 200,
      height: 200,
      borderRadius: "50%",
      background: "rgba(255,255,255,.04)"
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10,
      letterSpacing: 3,
      color: C.sage,
      fontWeight: "bold",
      marginBottom: 6,
      position: "relative"
    }
  }, "GUT OVER MATTER"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 26,
      fontFamily: "Georgia,serif",
      fontWeight: 300,
      color: C.white,
      lineHeight: 1.3,
      marginBottom: 8,
      position: "relative"
    }
  }, "Understanding IBS through", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("em", null, "the gut-brain loop")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: "rgba(255,255,255,.6)",
      lineHeight: 1.55,
      maxWidth: 265,
      marginBottom: 20,
      position: "relative"
    }
  }, "A knowledge translation tool grounded in peer-reviewed gut-brain research. Not medical advice."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const cat = PROGRAMS["Understand Your IBS"];
      go("prog", {
        ...cat.items[0],
        color: cat.color
      });
    },
    style: {
      background: C.white,
      color: C.forest,
      border: "none",
      borderRadius: 28,
      padding: "11px 16px",
      fontSize: 13,
      fontWeight: "bold",
      cursor: "pointer",
      flex: 1
    }
  }, "Start Here"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setTab("tools"),
    style: {
      background: "rgba(255,255,255,.13)",
      color: C.white,
      border: "1px solid rgba(255,255,255,.28)",
      borderRadius: 28,
      padding: "11px 16px",
      fontSize: 13,
      cursor: "pointer",
      flex: 1
    }
  }, "Help Me Now"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 18px 0"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10,
      letterSpacing: 2,
      color: C.charcoal,
      opacity: .4,
      fontWeight: "bold",
      marginBottom: 13
    }
  }, "WHAT PEOPLE SAID THEY WERE MISSING"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 11,
      overflowX: "auto",
      paddingBottom: 6
    }
  }, MISSING.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      minWidth: 205,
      background: C.white,
      borderRadius: 14,
      padding: "14px",
      boxShadow: "0 2px 9px rgba(0,0,0,.06)",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      fontFamily: "Georgia,serif",
      fontStyle: "italic",
      color: C.charcoal,
      lineHeight: 1.65,
      marginBottom: 8
    }
  }, "\"", c.q, "\""), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10,
      color: C.charcoal,
      opacity: .42
    }
  }, c.who))))), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: "18px 18px 0",
      background: `linear-gradient(135deg,${C.clay},${C.clayLight})`,
      borderRadius: 16,
      padding: "16px",
      position: "relative",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: -18,
      right: -18,
      width: 80,
      height: 80,
      borderRadius: "50%",
      background: "rgba(255,255,255,.1)"
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      fontWeight: "bold",
      color: C.white,
      marginBottom: 3
    }
  }, "Not sure where to start?"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: "rgba(255,255,255,.78)",
      marginBottom: 13,
      lineHeight: 1.5
    }
  }, "Take the 3-question quiz and we will point you in the right direction."), /*#__PURE__*/React.createElement("button", {
    onClick: () => setQuizS("active"),
    style: {
      background: C.white,
      color: C.clay,
      border: "none",
      borderRadius: 26,
      padding: "8px 16px",
      fontSize: 12,
      fontWeight: "bold",
      cursor: "pointer"
    }
  }, "Find My Starting Point →")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 18px 0"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10,
      letterSpacing: 2,
      color: C.charcoal,
      opacity: .4,
      fontWeight: "bold",
      marginBottom: 13
    }
  }, "EXPLORE THE APP"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10
    }
  }, [{
    l: "Understand IBS",
    s: "Science in plain language",
    e: Ico.brain,
    c: C.forest,
    a: () => setTab("learn")
  }, {
    l: "Programs",
    s: "Guided journeys",
    e: Ico.phone,
    c: C.teal,
    a: () => setTab("programs")
  }, {
    l: "Calm Tools",
    s: "Help me right now",
    e: Ico.lotus,
    c: C.clay,
    a: () => setTab("tools")
  }, {
    l: "Grow Gut IQ",
    s: "13 evidence-based topics",
    e: Ico.lightbulb,
    c: C.purple,
    a: () => setTab("learn")
  }, {
    l: "Ask Gut IQ AI",
    s: "Science-backed answers",
    e: Ico.bot,
    c: C.blue,
    a: () => go("chat", {})
  }, {
    l: "You're Not Alone",
    s: "Stories and support",
    e: Ico.heart,
    c: C.sage,
    a: () => setTab("support")
  }].map((c, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: c.a,
    style: {
      background: C.white,
      border: "none",
      borderRadius: 13,
      padding: "14px 12px",
      textAlign: "left",
      cursor: "pointer",
      boxShadow: "0 2px 8px rgba(0,0,0,.05)",
      position: "relative",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: -8,
      right: -8,
      width: 50,
      height: 50,
      borderRadius: "50%",
      background: c.c,
      opacity: .1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 7,
      color: C.forest,
      display: "inline-flex"
    }
  }, c.e), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12.5,
      fontWeight: "bold",
      color: C.charcoal,
      marginBottom: 1
    }
  }, c.l), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10.5,
      color: C.charcoal,
      opacity: .42
    }
  }, c.s))))), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: "18px 18px 28px",
      background: C.creamDark,
      borderRadius: 9,
      padding: "11px 13px",
      display: "flex",
      alignItems: "flex-start",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.forest,
      flexShrink: 0,
      marginTop: 1
    }
  }, Ico.warning), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10.5,
      color: C.charcoal,
      opacity: .52,
      lineHeight: 1.5
    }
  }, "This is not medical advice. Gut Over Matter is a knowledge translation tool grounded in peer-reviewed IBS gut-brain research. It does not replace clinical assessment or care.")));
}

// ─── PROGRAMS TAB ─────────────────────────────────────────────────────────────
function ProgsTab({
  go
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "gom-stagger",
    style: {
      padding: "48px 16px 20px",
      background: C.sagePale,
      minHeight: "100%"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10,
      letterSpacing: 2,
      color: C.charcoal,
      opacity: .4,
      fontWeight: "bold",
      marginBottom: 4
    }
  }, "PROGRAMS"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 22,
      fontFamily: "Georgia,serif",
      color: C.charcoal,
      marginBottom: 5
    }
  }, "Your Guided Journey"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: C.charcoal,
      opacity: .52,
      lineHeight: 1.5,
      marginBottom: 20
    }
  }, "Evidence-based journeys through the gut-brain axis. Choose by what you need most right now."), Object.entries(PROGRAMS).map(([name, cat], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      background: C.white,
      borderRadius: 16,
      marginBottom: 12,
      boxShadow: "0 2px 10px rgba(0,0,0,.06)",
      overflow: "hidden"
    }
  }, CATEGORY_HEADERS[name] && /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      height: 92,
      overflow: "hidden",
      position: "relative",
      background: cat.color
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: CATEGORY_HEADERS[name],
    alt: "",
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      objectPosition: "center",
      display: "block"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      background: `linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 55%, ${cat.color} 120%)`
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "linear-gradient(135deg," + cat.color + ",#1a3530)",
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      gap: 11
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#fff",
      display: "inline-flex"
    }
  }, cat.icon), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      fontWeight: "bold",
      color: C.white
    }
  }, name), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: "rgba(255,255,255,.62)"
    }
  }, cat.items.length, " programs"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 12px"
    }
  }, cat.items.map((p, j) => /*#__PURE__*/React.createElement("button", {
    key: j,
    onClick: () => go("prog", {
      ...p,
      color: cat.color
    }),
    style: {
      width: "100%",
      background: "none",
      border: "none",
      padding: "9px 3px",
      textAlign: "left",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 11,
      borderBottom: j < cat.items.length - 1 ? `1px solid ${C.creamDark}` : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 7,
      height: 7,
      borderRadius: "50%",
      background: cat.color,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: C.charcoal
    }
  }, p.title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10.5,
      color: C.charcoal,
      opacity: .42
    }
  }, p.n, " sessions", p.sessions ? "" : " · Coming soon")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      color: C.charcoal,
      opacity: .22
    }
  }, "›")))))));
}

// ─── TOOLS TAB ────────────────────────────────────────────────────────────────
function ToolsTab({
  go,
  setQuizS
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "gom-stagger",
    style: {
      padding: "48px 16px 20px",
      background: C.sagePale,
      minHeight: "100%"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10,
      letterSpacing: 2,
      color: C.charcoal,
      opacity: .4,
      fontWeight: "bold",
      marginBottom: 4
    }
  }, "TOOLS"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 22,
      fontFamily: "Georgia,serif",
      color: C.charcoal,
      marginBottom: 5
    }
  }, "Help Me Right Now"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: C.charcoal,
      opacity: .52,
      lineHeight: 1.5,
      marginBottom: 18
    }
  }, "Breathing tools, resets, and nervous-system support, available any time."), /*#__PURE__*/React.createElement("button", {
    onClick: () => go("pacer", {}),
    style: {
      width: "100%",
      background: `linear-gradient(135deg,${C.teal},${C.forest})`,
      border: "none",
      borderRadius: 16,
      padding: "16px",
      marginBottom: 10,
      cursor: "pointer",
      textAlign: "left",
      display: "flex",
      alignItems: "center",
      gap: 13
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 46,
      height: 46,
      borderRadius: "50%",
      background: "rgba(255,255,255,.17)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff"
    }
  }, Ico.wind), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      fontWeight: "bold",
      color: C.white,
      marginBottom: 2
    }
  }, "Breathing Pacer"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: "rgba(255,255,255,.67)"
    }
  }, "Evidence-based · Animated · 6 cycles/min"))), /*#__PURE__*/React.createElement("button", {
    onClick: () => go("chat", {}),
    style: {
      width: "100%",
      background: `linear-gradient(135deg,#5B8FAF,${C.forest})`,
      border: "none",
      borderRadius: 16,
      padding: "16px",
      marginBottom: 10,
      cursor: "pointer",
      textAlign: "left",
      display: "flex",
      alignItems: "center",
      gap: 13
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 46,
      height: 46,
      borderRadius: "50%",
      background: "rgba(255,255,255,.17)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff"
    }
  }, Ico.bot), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      fontWeight: "bold",
      color: C.white,
      marginBottom: 2
    }
  }, "Ask Gut IQ AI"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: "rgba(255,255,255,.67)"
    }
  }, "Science-backed answers · Not medical advice"))), /*#__PURE__*/React.createElement("button", {
    onClick: () => go("sleep", {}),
    style: {
      width: "100%",
      background: `linear-gradient(135deg,#2C4B7C,#1a3a5c)`,
      border: "none",
      borderRadius: 16,
      padding: "16px",
      marginBottom: 10,
      cursor: "pointer",
      textAlign: "left",
      display: "flex",
      alignItems: "center",
      gap: 13
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 46,
      height: 46,
      borderRadius: "50%",
      background: "rgba(255,255,255,.17)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff"
    }
  }, Ico.moon), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      fontWeight: "bold",
      color: C.white,
      marginBottom: 2
    }
  }, "Sleep Planner"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: "rgba(255,255,255,.67)"
    }
  }, "Plan your gut-brain restoration window."))), /*#__PURE__*/React.createElement("button", {
    onClick: () => go("routine", {}),
    style: {
      width: "100%",
      background: `linear-gradient(135deg,${C.teal},#3a8a7c)`,
      border: "none",
      borderRadius: 16,
      padding: "16px",
      marginBottom: 10,
      cursor: "pointer",
      textAlign: "left",
      display: "flex",
      alignItems: "center",
      gap: 13
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 46,
      height: 46,
      borderRadius: "50%",
      background: "rgba(255,255,255,.17)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff"
    }
  }, Ico.calendar), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      fontWeight: "bold",
      color: C.white,
      marginBottom: 2
    }
  }, "Routine Builder"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: "rgba(255,255,255,.67)"
    }
  }, "Build your personalised daily regulation plan"))), /*#__PURE__*/React.createElement("button", {
    onClick: () => go("cycle", {}),
    style: {
      width: "100%",
      background: `linear-gradient(135deg,${C.purple},#6c5490)`,
      border: "none",
      borderRadius: 16,
      padding: "16px",
      marginBottom: 10,
      cursor: "pointer",
      textAlign: "left",
      display: "flex",
      alignItems: "center",
      gap: 13
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 46,
      height: 46,
      borderRadius: "50%",
      background: "rgba(255,255,255,.17)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff"
    }
  }, Ico.cycle), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      fontWeight: "bold",
      color: C.white,
      marginBottom: 2
    }
  }, "Cycle & Gut-Brain Tracker"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: "rgba(255,255,255,.67)"
    }
  }, "How your cycle phase shifts gut-brain axis signalling"))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setQuizS("active"),
    style: {
      width: "100%",
      background: `linear-gradient(135deg,${C.clay},${C.clayLight})`,
      border: "none",
      borderRadius: 16,
      padding: "16px",
      marginBottom: 18,
      cursor: "pointer",
      textAlign: "left",
      display: "flex",
      alignItems: "center",
      gap: 13
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 46,
      height: 46,
      borderRadius: "50%",
      background: "rgba(255,255,255,.17)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff"
    }
  }, Ico.compass), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      fontWeight: "bold",
      color: C.white,
      marginBottom: 2
    }
  }, "Symptom Pattern Quiz"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: "rgba(255,255,255,.67)"
    }
  }, "3 questions · Find your starting point"))), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10,
      letterSpacing: 2,
      color: C.charcoal,
      opacity: .35,
      fontWeight: "bold",
      marginBottom: 11
    }
  }, "REGULATION SCRIPTS"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.sageLight,
      borderRadius: 12,
      padding: "12px 14px",
      marginBottom: 12,
      borderLeft: `3px solid ${C.forest}`
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: C.charcoal,
      lineHeight: 1.55,
      marginBottom: 8
    }
  }, "These scripts are designed to help you regulate in the moment. For the most effective use:"), /*#__PURE__*/React.createElement("ul", {
    style: {
      fontSize: 11.5,
      color: C.charcoal,
      lineHeight: 1.55,
      paddingLeft: 18,
      margin: 0
    }
  }, /*#__PURE__*/React.createElement("li", {
    style: {
      marginBottom: 4
    }
  }, "Record your own voice reading the script in a clear, calm tone, so you hear familiarity."), /*#__PURE__*/React.createElement("li", {
    style: {
      marginBottom: 4
    }
  }, "Do the exercises so you can visualise yourself in the moment."), /*#__PURE__*/React.createElement("li", {
    style: {
      marginBottom: 4
    }
  }, "Make sure you are in a quiet place where you can connect with your body.")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10.5,
      color: C.forest,
      fontStyle: "italic",
      marginTop: 8,
      opacity: .8
    }
  }, "Audio recordings coming soon.")), TOOLS.map((t, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => go("tool", t),
    style: {
      width: "100%",
      background: C.white,
      border: "none",
      borderRadius: 13,
      padding: "13px",
      marginBottom: 9,
      textAlign: "left",
      cursor: "pointer",
      boxShadow: "0 2px 8px rgba(0,0,0,.05)",
      display: "flex",
      alignItems: "center",
      gap: 11
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 10,
      background: t.color,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      color: "#fff"
    }
  }, t.icon), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      fontWeight: "bold",
      color: C.charcoal,
      marginBottom: 2
    }
  }, t.title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: C.charcoal,
      opacity: .42
    }
  }, t.desc)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      color: C.charcoal,
      opacity: .22
    }
  }, "›"))));
}

// ─── LEARN TAB ────────────────────────────────────────────────────────────────
const LEARN_TOPICS = [{
  icon: Ico.clipboard,
  color: C.forest,
  title: "What IBS Actually Is",
  preview: "IBS is a real, biological Disorder of Gut-Brain Interaction (DGBI), not a mental illness, not a weak stomach, and not imagined.",
  sessions: SESSION_DATA.c1p1,
  sessionIdx: 0
}, {
  icon: Ico.cycle,
  color: C.teal,
  title: "The Gut-Brain Axis",
  preview: "A two-way network linking your brain and gut through the vagus nerve. About 80% of signals travel gut → brain.",
  sessions: SESSION_DATA.c1p1,
  sessionIdx: 1
}, {
  icon: Ico.lightning,
  color: C.clay,
  title: "What Happens During a Flare",
  preview: "A flare is a whole-body cascade: stress response → gut reactivity → immune activation → nerve sensitisation → brain amplification.",
  sessions: SESSION_DATA.c1p1,
  sessionIdx: 2
}, {
  icon: Ico.flask,
  color: C.purple,
  title: "Serotonin in Plain Language",
  preview: "90 to 95% of your body's serotonin is made in your gut. It governs movement, pain, and gut-brain messaging.",
  sessions: SESSION_DATA.c1p1,
  sessionIdx: 3
}, {
  icon: Ico.brain,
  color: C.teal,
  title: "Your Nervous System and Your Gut",
  preview: "IBS is associated with reduced vagal tone (lower HRV), meaning the body spends more time in fight-or-flight mode.",
  sessions: SESSION_DATA.c1p1,
  sessionIdx: 4
}, {
  icon: Ico.calendar,
  color: C.forest,
  title: "Why Some Days Are Fine and Some Are Not",
  preview: "The same food can be tolerated when calm and trigger a flare when stressed, because your autonomic state changes how your gut processes everything.",
  sessions: SESSION_DATA.c1p1,
  sessionIdx: 5
}, {
  icon: Ico.salad,
  color: C.clay,
  title: "What Actually Helps, The Evidence",
  preview: "Low-FODMAP diet (50 to 70% response), CBT, gut-directed hypnotherapy (GDH), and slow breathing: what the research actually shows.",
  sessions: SESSION_DATA.c1p1,
  sessionIdx: 6
}, {
  icon: Ico.map,
  color: C.forest,
  title: "Mapping Your Symptom History",
  preview: "Your IBS has a pattern. Understanding when it started and what drives it is the first step toward personalized management.",
  sessions: SESSION_DATA.c1p2,
  sessionIdx: 0
}, {
  icon: Ico.hash,
  color: C.teal,
  title: "IBS Subtypes, What Yours Tells You",
  preview: "IBS-D, IBS-C, IBS-M, and IBS-U: each has a distinct physiological profile with different treatment implications.",
  sessions: SESSION_DATA.c1p2,
  sessionIdx: 1
}, {
  icon: Ico.target,
  color: C.clay,
  title: "Your Trigger Landscape",
  preview: "Three trigger categories, dietary, stress-related, hormonal, and why the same trigger doesn't always produce the same result.",
  sessions: SESSION_DATA.c1p2,
  sessionIdx: 2
}, {
  icon: Ico.lightning,
  color: C.forest,
  title: "The Pre-Event Flare",
  preview: "Your gut can react to an event days before it happens. The ENS (gut's own nervous system) anticipates stress.",
  sessions: SESSION_DATA.c1p2,
  sessionIdx: 3
}, {
  icon: Ico.calendar,
  color: C.clay,
  title: "When Did Your IBS Start?",
  preview: "IBS onset often follows a significant life event or infection. Understanding this provides mechanism, not blame.",
  sessions: SESSION_DATA.c1p2,
  sessionIdx: 4
}, {
  icon: Ico.warning,
  color: "#CC2200",
  title: "Red Flags: When to Check Further",
  preview: "IBS is a valid positive diagnosis. Certain features do warrant further evaluation, but the vast majority of people with IBS do not have a serious underlying condition.",
  sessions: [{
    title: "Red Flags: When to Check Further",
    type: "Education + Safety",
    img: IMGS.redflags,
    body: `IBS is a valid, positive diagnosis. When the Rome IV criteria are met and limited appropriate investigations are done, the diagnosis is sound and durable. Using symptom-based Rome IV criteria yields good specificity and a durable diagnosis in real-world practice. The vast majority of people with IBS do not have an underlying serious condition. Alarm features in IBS have low positive predictive value overall (meaning most people who have one alarm feature do not turn out to have something else), but they still guide who needs further work-up.

That said, certain features should prompt further evaluation with your clinician. It is important to know these so you can advocate for yourself if something changes. Individual alarm features have limited predictive value on their own, but clusters (for example, anaemia plus fecal blood plus weight loss) markedly increase the likelihood of organic disease.

Features that warrant further evaluation: unexplained rectal bleeding; unintentional weight loss of more than 5 percent of body weight over 6 months; iron deficiency anaemia found on blood tests; fecal calprotectin elevated (values above roughly 50 to 100 micrograms per gram increase concern for inflammation, though the exact threshold varies by setting and lab); a first-degree family member with colorectal cancer, inflammatory bowel disease, or celiac disease; new onset of significant symptoms at an older age, often considered around 45 to 50 and above; or a substantial change from your previously established symptom pattern.

Features that are typical of IBS and do not require alarm: pain that is linked to your bowel habit (better or worse after going); a longstanding and stable pattern; symptoms present since early adulthood; tests that have come back normal, including a normal fecal calprotectin when that test has been checked; stress or emotional state clearly worsening things; no weight loss and no bleeding.

IBS is not a diagnosis of exclusion based on nothing. It is a positive clinical diagnosis made on documented symptom criteria. Rome IV shows about 82 percent sensitivity and 83 percent specificity when compared with a limited-investigation reference standard in secondary care. If you have any of the features listed above, that is not a sign you have been misdiagnosed. It simply means those specific features are worth discussing with your clinician, who will decide whether further testing is appropriate. Because alarm features overall have low yield, testing is individualised rather than applied to everyone.

Routine colonoscopy is not recommended for patients younger than 45 with IBS symptoms and no alarm features. Colonoscopy should follow standard colorectal cancer screening recommendations (now generally starting at age 45 for average-risk adults) or be prompted by alarm features. Unnecessary investigation is associated with increased healthcare costs and patient anxiety without benefit. Tests like fecal calprotectin help reduce unnecessary colonoscopies while maintaining a high negative predictive value.`,
    keyTakeaways: ["IBS is a valid positive diagnosis when Rome IV criteria are met, and Rome IV shows good diagnostic performance in secondary care", "The vast majority of IBS patients do not have a serious underlying condition; alarm features have low positive predictive value on their own", "Rectal bleeding, unintentional weight loss, iron deficiency anaemia, and elevated fecal calprotectin (values above roughly 50 to 100 μg/g) are features worth discussing with your clinician", "New onset at older age, often 45 and above, or a first-degree family history of colorectal cancer, IBD, or celiac disease also warrant discussion", "Routine colonoscopy is not recommended under 45 without alarm features; it should align with standard colorectal cancer screening, which now generally starts at age 45 for average-risk adults"],
    reflection: "Have any of these features been present for you? If so, have you had the opportunity to discuss them with your clinician? What would feel helpful to bring up at your next appointment?",
    sessionContext: "This session covers red flags in IBS: the difference between typical IBS features and features that warrant further evaluation (rectal bleeding, weight loss, anaemia, elevated calprotectin, family history of IBD or colorectal cancer, new onset after 50). It also covers why IBS is a positive diagnosis and why routine colonoscopy is not recommended under 45 without alarm features per ACG guidelines."
  }],
  sessionIdx: 0
}];
function LearnTab({
  go
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "gom-stagger",
    style: {
      padding: "48px 16px 20px",
      background: C.sagePale,
      minHeight: "100%"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10,
      letterSpacing: 2,
      color: C.charcoal,
      opacity: .4,
      fontWeight: "bold",
      marginBottom: 4
    }
  }, "LEARN"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 22,
      fontFamily: "Georgia,serif",
      color: C.charcoal,
      marginBottom: 4
    }
  }, "Grow Your Gut IQ"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: C.charcoal,
      opacity: .52,
      lineHeight: 1.5,
      marginBottom: 18
    }
  }, "Science in plain language. Every topic includes a diagram, explanation, and reflection."), LEARN_TOPICS.map((t, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => t.sessions ? go("session", {
      session: t.sessions[t.sessionIdx],
      color: t.color
    }) : null,
    style: {
      width: "100%",
      background: C.white,
      border: "none",
      borderLeft: `3px solid ${t.color}`,
      borderRadius: "0 13px 13px 0",
      padding: "13px",
      marginBottom: 9,
      textAlign: "left",
      cursor: t.sessions ? "pointer" : "default",
      boxShadow: "0 2px 10px rgba(0,0,0,.06)",
      display: "flex",
      alignItems: "center",
      gap: 11,
      animation: `fadeUp .3s ${i * .03}s backwards`,
      opacity: t.sessions ? 1 : .65
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 10,
      background: C.sageLight,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      color: C.forest
    }
  }, t.icon), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      fontWeight: "bold",
      color: C.charcoal,
      marginBottom: 2
    }
  }, t.title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: C.charcoal,
      opacity: .42,
      lineHeight: 1.35
    }
  }, t.preview.slice(0, 70), "…")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      color: C.charcoal,
      opacity: .22
    }
  }, "›"))), /*#__PURE__*/React.createElement("button", {
    onClick: () => go("references"),
    style: {
      width: "100%",
      background: `linear-gradient(135deg, ${C.forest}, ${C.forestLight})`,
      border: "none",
      borderRadius: 13,
      padding: "14px 16px",
      marginTop: 10,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 11,
      color: C.white,
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 38,
      height: 38,
      borderRadius: 10,
      background: "rgba(255,255,255,.18)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      fontSize: 18
    }
  }, "📚"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      fontWeight: "bold",
      marginBottom: 2
    }
  }, "Scientific References"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      opacity: .8,
      lineHeight: 1.35
    }
  }, "All peer-reviewed citations used in this app")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      opacity: .6
    }
  }, "›")));
}

// ─── SUPPORT TAB ──────────────────────────────────────────────────────────────
function ReferencesTab({
  go
}) {
  const refs = [{
    topic: "Clinical Guidelines and Diagnostic Criteria",
    items: ["Lacy BE, Pimentel M, Brenner DM, Chey WD, Keefer LA, Long MD, Moshiree B. ACG Clinical Guideline: Management of Irritable Bowel Syndrome. American Journal of Gastroenterology. 2021;116(1):17-44.", "Vasant DH, Paine PA, Black CJ, et al. British Society of Gastroenterology guidelines on the management of IBS. Gut. 2021;70(7):1214-1240.", "Drossman DA, Hasler WL. Rome IV, Functional GI Disorders: Disorders of Gut-Brain Interaction. Gastroenterology. 2016;150(6):1257-1261.", "Lacy BE, Patel NK. Rome Criteria and a Diagnostic Approach to Irritable Bowel Syndrome. Journal of Clinical Medicine. 2017.", "Goodoory VC, Khasawneh M, Black CJ, Ford AC. Assessing Diagnostic Performance of Modifications to the Rome IV Criteria for IBS. Clinical Gastroenterology and Hepatology. 2024.", "Aziz I, Tornblom H, Palsson OS, Whitehead WE, Simren M. How the Change in IBS Criteria From Rome III to Rome IV Impacts on Clinical Characteristics. American Journal of Gastroenterology. 2018."]
  }, {
    topic: "Prevalence and Epidemiology",
    items: ["Oka P, Parr H, Barberio B, Black CJ, Savarino EV, Ford AC. Global prevalence of IBS according to Rome III or IV criteria: a systematic review and meta-analysis. Lancet Gastroenterology and Hepatology. 2020.", "Sperber AD. Epidemiology and Burden of Irritable Bowel Syndrome: An International Perspective. Gastroenterology Clinics of North America. 2021.", "Palsson OS, Whitehead W, Tornblom H, Sperber AD, Simren M. Prevalence of Rome IV Functional Bowel Disorders Among Adults in the United States, Canada, and the United Kingdom. Gastroenterology. 2020.", "Almario CV, Sharabi E, Chey WD, Lauzon M, Higgins CS, Spiegel BMR. Prevalence and Burden of Illness of Rome IV Irritable Bowel Syndrome in the United States. Gastroenterology. 2023."]
  }, {
    topic: "Gut-Brain Axis and the Enteric Nervous System",
    items: ["Cryan JF, O'Riordan KJ, Cowan CSM, et al. The Microbiota-Gut-Brain Axis. Physiological Reviews. 2019;99(4):1877-2013.", "Mayer EA, Tillisch K, Gupta A. Gut/brain axis and the microbiota. Journal of Clinical Investigation. 2015;125(3):926-938.", "Furness JB, Callaghan BP, Rivera LR, Cho HJ. The enteric nervous system and gastrointestinal innervation: integrated local and central control. Advances in Experimental Medicine and Biology. 2014.", "Schneider S, Wright CM, Heuckeroth RO. Unexpected Roles for the Second Brain: Enteric Nervous System as Master Regulator of Bowel Function. Annual Review of Physiology. 2019."]
  }, {
    topic: "Vagus Nerve and Vagal Communication",
    items: ["Bonaz B, Bazin T, Pellissier S. The Vagus Nerve at the Interface of the Microbiota-Gut-Brain Axis. Frontiers in Neuroscience. 2018;12:49.", "Bonaz B, Sinniger V, Pellissier S. Vagus Nerve Stimulation at the Interface of Brain-Gut Interactions. Cold Spring Harbor Perspectives in Medicine. 2019.", "Powley TL, Jaffey DM, McAdams J, et al. Vagal innervation of the stomach reassessed: brain-gut connectome uses smart terminals. Annals of the New York Academy of Sciences. 2019."]
  }, {
    topic: "Autonomic Regulation and HRV in IBS",
    items: ["Liu Q, Wang EM, Yan XJ, Chen SL. Autonomic functioning in IBS measured by heart rate variability: a meta-analysis. Journal of Digestive Diseases. 2013.", "Mazur M, Furgala A, Jablonski K, et al. Dysfunction of the autonomic nervous system activity in IBS patients. Journal of Physiology and Pharmacology. 2007.", "Sadowski A, Dunlap C, Lacombe A, Hanes D. Alterations in Heart Rate Variability Associated With IBS or IBD: A Systematic Review and Meta-Analysis. Clinical and Translational Gastroenterology. 2020.", "Frokjaer JB, Bergmann S, Brock C, et al. Modulation of vagal tone enhances gastroduodenal motility and reduces somatic pain sensitivity. Neurogastroenterology and Motility. 2016.", "Cheng P, Shih W, Alberto M, et al. Autonomic response to a visceral stressor is dysregulated in IBS and correlates with duration of disease. Neurogastroenterology and Motility. 2013."]
  }, {
    topic: "Slow Breathing and HRV Biofeedback",
    items: ["Liu J, Lv C, Wang W, et al. Slow, deep breathing intervention improved symptoms and altered rectal sensitivity in constipation-predominant IBS. Frontiers in Neuroscience. 2022.", "Liu J, Lv C, Yin M, et al. Efficacy and safety of transcutaneous auricular vagus nerve stimulation in constipation-predominant IBS: RCT. American Journal of Gastroenterology. 2024.", "Jurek MK, Seavey H, Guidry M, Slomka E, Hunter SD. Effects of slow deep breathing on microvascular and autonomic function and symptoms in IBS: A pilot study. Neurogastroenterology and Motility. 2022.", "Goldenberg JZ, Brignall M, Hamilton M, et al. Biofeedback for treatment of irritable bowel syndrome. Cochrane Database of Systematic Reviews. 2019.", "Stern MJ, Guiles RAF, Gevirtz R. HRV biofeedback for pediatric IBS and functional abdominal pain: a clinical replication series. Applied Psychophysiology and Biofeedback. 2014.", "Minjoz S, Jeanne R, Vercueil L, et al. Heart Rate Variability Biofeedback to Manage Mental Health of Adults With IBS: A Pilot Study. Stress and Health. 2025."]
  }, {
    topic: "Serotonin, EC Cells, and IBS Subtypes",
    items: ["Mawe GM, Hoffman JM. Serotonin signalling in the gut, functions, dysfunctions and therapeutic targets. Nature Reviews Gastroenterology and Hepatology. 2013;10(8):473-486.", "Wei L, Singh R, Ghoshal UC. Enterochromaffin Cells-Gut Microbiota Crosstalk: Underpinning the Symptoms, Pathogenesis, and Pharmacotherapy in Disorders of Gut-Brain Interaction. Journal of Neurogastroenterology and Motility. 2022.", "Clarke G, McKernan DP, Gaszner G, Quigley EM, Cryan JF, Dinan TG. A Distinct Profile of Tryptophan Metabolism along the Kynurenine Pathway in IBS. Frontiers in Pharmacology. 2012.", "O'Mahony SM, Clarke G, Borre YE, Dinan TG, Cryan JF. Serotonin, tryptophan metabolism and the brain-gut-microbiome axis. Behavioural Brain Research. 2015.", "Zhai L, Huang C, Ning Z, et al. Ruminococcus gnavus plays a pathogenic role in diarrhea-predominant IBS by increasing serotonin biosynthesis. Cell Host and Microbe. 2023.", "Spiller R. Targeting the 5-HT(3) receptor in the treatment of IBS. Current Opinion in Pharmacology. 2011."]
  }, {
    topic: "Flare Mechanisms, Mast Cells, Visceral Hypersensitivity",
    items: ["Barbara G, Cremon C, De Giorgio R, et al. Mechanisms underlying visceral hypersensitivity in IBS. Current Gastroenterology Reports. 2011.", "Piche T, Barbara G, Aubert P, et al. Impaired intestinal barrier integrity in the colon of patients with IBS. Gut. 2009;58(2):196-201.", "Lee KN, Lee OY. The Role of Mast Cells in Irritable Bowel Syndrome. Gastroenterology Research and Practice. 2016.", "Krammer L, Sowa AS, Lorentz A. Mast Cells in Irritable Bowel Syndrome: A Systematic Review. Journal of Gastrointestinal and Liver Diseases. 2019.", "Aguilera-Lizarraga J, Hussein H, Boeckxstaens GE. Immune activation in irritable bowel syndrome: what is the evidence? Nature Reviews Immunology. 2022.", "Hughes PA, Zola H, Penttila IA, Blackshaw LA, Andrews JM, Krumbiegel D. Immune activation in IBS: can neuroimmune interactions explain symptoms? American Journal of Gastroenterology. 2013."]
  }, {
    topic: "Stress, HPA Axis, and Neuroendocrine Pathways",
    items: ["Mayer EA, Naliboff BD, Chang L, Coutinho SV. V. Stress and irritable bowel syndrome. American Journal of Physiology. 2001.", "Kennedy PJ, Cryan JF, Quigley EM, Dinan TG, Clarke G. A sustained hypothalamic-pituitary-adrenal axis response to acute psychosocial stress in IBS. Psychological Medicine. 2014.", "Chang L, Sundaresh S, Elliott J, et al. Dysregulation of the HPA axis in IBS. Neurogastroenterology and Motility. 2009.", "Greenwood-Van Meerveld B, Johnson AC. Mechanisms of Stress-induced Visceral Pain. Journal of Neurogastroenterology and Motility. 2018.", "Buckley MM, O'Mahony SM, O'Malley D. Convergence of neuro-endocrine-immune pathways in the pathophysiology of IBS. World Journal of Gastroenterology. 2014."]
  }, {
    topic: "Brain-Gut Behavioural Therapies (CBT, MBSR, ACT)",
    items: ["Lackner JM, Jaccard J, Keefer L, et al. Improvement in Gastrointestinal Symptoms After CBT for Refractory IBS. Gastroenterology. 2018;155(1):47-57.", "Thakur ER, Khasawneh M, Moayyedi P, Black CJ, Ford AC. Efficacy of behavioural therapies for IBS: a systematic review and network meta-analysis. Lancet Gastroenterology and Hepatology. 2025.", "Fernandes AJT, Farrell AL, Naveh SV, Chakraborty S. Stress reduction and psychological therapy for IBS: a scoping review. Frontiers in Gastroenterology. 2024.", "Palsson OS, Whitehead WE. Psychological treatments in functional GI disorders. Clinical Gastroenterology and Hepatology. 2013;11(3):208-216.", "Labus JS, Hollister EB, Jacobs J, et al. Differences in gut microbial composition correlate with regional brain volumes in IBS. Microbiome. 2017;5(1):49."]
  }, {
    topic: "Gut-Directed Hypnotherapy",
    items: ["Adler EC, Levine EH, Ibarra AN, et al. Gut-Directed Hypnotherapy for Irritable Bowel Syndrome: A Systematic Review and Meta-Analysis. Neurogastroenterology and Motility. 2025.", "Hasan SS, Ballou S, Keefer L, Vasant DH. Improving access to gut-directed hypnotherapy for IBS in the digital therapeutics era. Neurogastroenterology and Motility. 2023.", "Hauser W. Gut-directed hypnosis and hypnotherapy for IBS: a mini-review. Frontiers in Psychology. 2024.", "Brenner DM, Ladewski AM, Kinsinger SW. Development and Current State of Digital Therapeutics for IBS. Clinical Gastroenterology and Hepatology. 2024.", "Flik CE, Laan W, Zuithoff NPA, et al. Efficacy of individual and group hypnotherapy in IBS: multicentre randomised controlled trial. Lancet Gastroenterology and Hepatology. 2019;4(1):20-31.", "Whorwell PJ, Prior A, Faragher EB. Controlled trial of hypnotherapy in the treatment of severe refractory IBS. Lancet. 1984;2(8414):1232-1234."]
  }, {
    topic: "Diet, FODMAPs, and Microbiome",
    items: ["Staudacher HM, Whelan K. The low FODMAP diet: recent advances in understanding its mechanisms and efficacy in IBS. Gut. 2017;66(8):1517-1527.", "Whelan K, Staudacher H. Low FODMAP diet in IBS: a review of recent clinical trials and meta-analyses. Current Opinion in Clinical Nutrition and Metabolic Care. 2022.", "Cuffe MS, Staudacher HM, Aziz I, et al. Efficacy of dietary interventions in IBS: a systematic review and network meta-analysis. Lancet Gastroenterology and Hepatology. 2025.", "Marsh A, Eslick EM, Eslick GD. Does a diet low in FODMAPs reduce symptoms associated with functional gastrointestinal disorders? European Journal of Nutrition. 2016.", "Gibson PR. The evidence base for efficacy of the low FODMAP diet in IBS. Journal of Gastroenterology and Hepatology. 2017.", "Nybacka S, Tornblom H, Josefsson A, et al. A low FODMAP diet plus traditional dietary advice versus a low-carbohydrate diet versus pharmacological treatment in IBS (CARBIS): RCT. Lancet Gastroenterology and Hepatology. 2024."]
  }, {
    topic: "Post-Infectious IBS and Early-Life Adversity",
    items: ["Berumen A, Edwinson AL, Grover M. Post-infection Irritable Bowel Syndrome. Gastroenterology Clinics of North America. 2021.", "Thabane M, Marshall JK. Post-infectious irritable bowel syndrome. World Journal of Gastroenterology. 2009.", "Spiller RC. Role of infection in irritable bowel syndrome. Journal of Gastroenterology. 2007.", "Videlock EJ, Adeyemo M, Licudine A, et al. Childhood trauma is associated with HPA axis responsiveness in IBS. Gastroenterology. 2009.", "Ju T, Naliboff BD, Shih W, et al. Risk and Protective Factors Related to Early Adverse Life Events in IBS. Journal of Clinical Gastroenterology. 2020.", "Mahurkar-Joshi S, Chang L. Epigenetic Mechanisms in Irritable Bowel Syndrome. Frontiers in Psychiatry. 2020."]
  }, {
    topic: "Hormonal Effects on Gut Function",
    items: ["Heitkemper MM, Chang L. Do fluctuations in ovarian hormones affect GI symptoms in women with IBS? Gender Medicine. 2009;6(Suppl 2):152-167.", "Mulak A, Tache Y, Larauche M. Sex hormones in the modulation of IBS. World Journal of Gastroenterology. 2014;20(10):2433-2448.", "Houghton LA, Lea R, Jackson N, Whorwell PJ. The menstrual cycle affects rectal sensitivity in patients with IBS but not healthy volunteers. Gut. 2002.", "Bharadwaj S, Barber MD, Graff LA, Shen B. Symptomatology of IBS and IBD during the menstrual cycle. Gastroenterology Report. 2015."]
  }, {
    topic: "Pelvic Floor Dyssynergia and Biofeedback",
    items: ["Rao SSC, Benninga MA, Bharucha AE, et al. ANMS-ESNM position paper on diagnosis and treatment of dyssynergic defecation. Neurogastroenterology and Motility. 2015;27(5):594-609.", "Chiarioni G, Whitehead WE, Pezza V, Morelli A, Bassotti G. Biofeedback is superior to laxatives for normal transit constipation due to pelvic floor dyssynergia. Gastroenterology. 2006;130(3):657-664."]
  }, {
    topic: "Red Flags and Alarm-Feature Evaluation",
    items: ["Black TP, Manolakis CS, Di Palma JA. 'Red flag' evaluation yield in irritable bowel syndrome. Journal of Gastrointestinal and Liver Diseases. 2012.", "Yang Q, Wei ZC, Liu N, et al. Predictive value of alarm symptoms in Rome IV irritable bowel syndrome. World Journal of Clinical Cases. 2022.", "Dajti E, Frazzoni L, Iascone V, et al. Diagnostic performance of faecal calprotectin in distinguishing IBD from IBS in adults. Alimentary Pharmacology and Therapeutics. 2023.", "Freeman K, Taylor-Phillips S, Willis BH, Ryan R, Clarke A. Test accuracy of faecal calprotectin for IBD in UK primary care. BMJ Open. 2021.", "NICE. Faecal calprotectin diagnostic tests for inflammatory diseases of the bowel. NICE guidance. 2025."]
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      paddingBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: `linear-gradient(155deg,${C.forest},${C.forestLight})`,
      padding: "52px 20px 28px"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => go("learn"),
    style: {
      background: "rgba(255,255,255,.12)",
      border: "1px solid rgba(255,255,255,.28)",
      color: C.white,
      padding: "6px 12px",
      borderRadius: 20,
      fontSize: 11,
      cursor: "pointer",
      marginBottom: 14
    }
  }, "← Back"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10,
      letterSpacing: 3,
      color: "rgba(255,255,255,.52)",
      fontWeight: "bold",
      marginBottom: 5
    }
  }, "REFERENCES"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 22,
      fontFamily: "Georgia,serif",
      fontWeight: 300,
      color: C.white,
      lineHeight: 1.35
    }
  }, "Scientific citations", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("em", null, "for this app.")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: "rgba(255,255,255,.78)",
      marginTop: 14,
      lineHeight: 1.55
    }
  }, "Every claim in this app is grounded in peer-reviewed research. These are the primary sources that inform the sessions, programs, and tools.")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 18px 40px"
    }
  }, refs.map((section, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      marginBottom: 22
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      letterSpacing: 2,
      color: C.forest,
      fontWeight: "bold",
      marginBottom: 10,
      textTransform: "uppercase"
    }
  }, section.topic), section.items.map((ref, j) => /*#__PURE__*/React.createElement("div", {
    key: j,
    style: {
      background: C.white,
      borderLeft: `3px solid ${C.sage}`,
      borderRadius: "0 8px 8px 0",
      padding: "10px 14px",
      marginBottom: 6,
      fontSize: 11.5,
      color: C.charcoal,
      lineHeight: 1.55
    }
  }, ref)))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.sageLight,
      borderRadius: 12,
      padding: "14px 16px",
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: C.forest,
      lineHeight: 1.6,
      fontStyle: "italic"
    }
  }, "This app is an academic knowledge translation project. It synthesises evidence from the above sources into a patient-facing format. It is not a substitute for medical care. Always work with your clinician."))));
}
function CycleTracker() {
  const [startDate, setStartDate] = useState("");
  const [cycleLength, setCycleLength] = useState(28);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("gom_cycle");
      if (raw) {
        const d = JSON.parse(raw);
        if (d.startDate) setStartDate(d.startDate);
        if (d.cycleLength) setCycleLength(d.cycleLength);
      }
    } catch {/* ignore */}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem("gom_cycle", JSON.stringify({
        startDate,
        cycleLength
      }));
    } catch {/* ignore */}
  }, [startDate, cycleLength, loaded]);

  // Phase lookup based on cycle day (1-based, day 1 = first day of period)
  function phaseFor(day, len) {
    if (day <= 5) return {
      name: "Menstrual phase",
      idx: 0
    };
    if (day <= Math.floor(len / 2) - 1) return {
      name: "Follicular phase",
      idx: 1
    };
    if (day <= Math.floor(len / 2) + 1) return {
      name: "Ovulation window",
      idx: 2
    };
    return {
      name: "Luteal phase",
      idx: 3
    };
  }

  // Phase details: scientifically grounded, IBS-specific, plain language
  const phaseInfo = [{
    title: "Menstrual phase",
    desc: "During the first few days of your period, estrogen and progesterone are at their lowest, and your body releases prostaglandins (inflammatory chemicals that help the uterus contract). Those prostaglandins also act on the gut-brain axis, increasing visceral sensitivity and gut motility. Low estrogen tends to reduce vagal tone, which is the calming side of your nervous system that normally quiets gut signals. Together, this is why urgency, looser stools, and cramping often peak in the first day or two.",
    tip: "This is a high-amplification week for the gut-brain axis. Slow breathing directly activates the vagus nerve, which supports the calming parasympathetic side. Extra warmth, earlier sleep, and gentle movement also lift vagal tone. Be kinder to yourself rather than pushing through.",
    color: "#C98B78"
  }, {
    title: "Follicular phase",
    desc: "Estrogen rises steadily through this phase, and for many people with IBS this is the calmest gut-brain window of the cycle. Higher estrogen is associated with better vagal tone, lower visceral sensitivity, and more coordinated gut motility. The brain\u0027s tendency to amplify gut signals also tends to be dampened.",
    tip: "This is often a good window to gently approach avoided foods, try social eating, or build new gut-brain regulation habits. Progress made now tends to hold because your nervous system is working with you, not against you.",
    color: "#8FAF9D"
  }, {
    title: "Ovulation window",
    desc: "Around the middle of your cycle, estrogen peaks briefly and ovulation occurs. Hormones shift quickly over 24 to 48 hours, which can briefly unsettle the gut-brain axis. Some people notice a small gut change, others notice nothing at all. Compared to the late luteal phase, this window is usually mild.",
    tip: "If you notice bloating or mild discomfort around ovulation, it is usually short-lived. Continue your regular gut-brain regulation practice, especially slow breathing and consistent sleep.",
    color: "#7FAEAC"
  }, {
    title: "Luteal phase",
    desc: "After ovulation, progesterone rises, which slows gut motility and often produces bloating or constipation. Mid-luteal, estrogen peaks and then falls sharply in the days before your period. That falling estrogen in the late luteal phase raises visceral sensitivity and reduces vagal tone, which amplifies signalling across the gut-brain axis. The HPA axis, your body\u0027s stress-alarm system, also tends to be more reactive in this window. Together, this makes the late luteal phase the most common IBS flare window across the cycle.",
    tip: "This is a high-vulnerability week for the gut-brain axis. Prioritise sleep, slow breathing, and pacing. Many people find it helps to avoid new food experiments or high-stakes commitments in the late luteal days if flexibility is an option. Gentle movement, hydration, and a longer wind-down routine all support vagal tone here.",
    color: "#9B7EC4"
  }];

  // Compute current cycle day + phase
  let cycleDay = null;
  let phase = null;
  if (startDate) {
    const start = new Date(startDate + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = today - start;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays >= 0) {
      cycleDay = diffDays % cycleLength + 1;
      phase = phaseFor(cycleDay, cycleLength);
    }
  }

  // SVG circle: 4 arcs colored by phase, 1 small dot marker at current cycleDay
  const radius = 78;
  const strokeW = 12;
  const cx = 100,
    cy = 100;
  const circumference = 2 * Math.PI * radius;
  // Phase boundaries in cycle days (defaults for 28-day cycle; scale to cycleLength)
  const boundary1 = 5; // end of menstrual
  const boundary2 = Math.floor(cycleLength / 2) - 1; // end of follicular
  const boundary3 = Math.floor(cycleLength / 2) + 1; // end of ovulation
  const boundary4 = cycleLength; // end of luteal
  const phaseArcs = [{
    from: 0,
    to: boundary1,
    color: "#C98B78"
  }, {
    from: boundary1,
    to: boundary2,
    color: "#8FAF9D"
  }, {
    from: boundary2,
    to: boundary3,
    color: "#7FAEAC"
  }, {
    from: boundary3,
    to: boundary4,
    color: "#9B7EC4"
  }];
  function arcPath(fromDay, toDay) {
    const startAngle = fromDay / cycleLength * 2 * Math.PI - Math.PI / 2;
    const endAngle = toDay / cycleLength * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = toDay - fromDay > cycleLength / 2 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  }
  let markerX = null,
    markerY = null;
  if (cycleDay !== null) {
    const angle = cycleDay / cycleLength * 2 * Math.PI - Math.PI / 2;
    markerX = cx + radius * Math.cos(angle);
    markerY = cy + radius * Math.sin(angle);
  }
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.white,
      borderRadius: 16,
      padding: 18,
      marginBottom: 14,
      boxShadow: "0 2px 12px rgba(0,0,0,.05)"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: C.charcoal,
      opacity: 0.72,
      lineHeight: 1.55,
      marginBottom: 14
    }
  }, "Ovarian hormones directly modulate the gut-brain axis, which is why so many people with IBS notice their symptoms change across the cycle. Estrogen and progesterone shift vagal tone, visceral sensitivity, and gut motility throughout the month. Enter the first day of your most recent period and your typical cycle length to see where you are today. Your information is saved only on this device."), /*#__PURE__*/React.createElement("label", {
    style: {
      display: "block",
      fontSize: 11,
      fontWeight: "bold",
      color: C.forest,
      marginBottom: 4,
      letterSpacing: 0.5
    }
  }, "First day of your most recent period"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: startDate,
    onChange: e => setStartDate(e.target.value),
    style: {
      width: "100%",
      background: C.cream,
      border: `1px solid ${C.creamDark}`,
      borderRadius: 10,
      padding: "9px 11px",
      fontSize: 13,
      color: C.charcoal,
      boxSizing: "border-box",
      marginBottom: 12,
      fontFamily: "inherit"
    }
  }), /*#__PURE__*/React.createElement("label", {
    style: {
      display: "block",
      fontSize: 11,
      fontWeight: "bold",
      color: C.forest,
      marginBottom: 4,
      letterSpacing: 0.5
    }
  }, "Typical cycle length"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "21",
    max: "40",
    value: cycleLength,
    onChange: e => setCycleLength(Math.max(21, Math.min(40, parseInt(e.target.value) || 28))),
    style: {
      width: 80,
      background: C.cream,
      border: `1px solid ${C.creamDark}`,
      borderRadius: 10,
      padding: "9px 11px",
      fontSize: 13,
      color: C.charcoal,
      fontFamily: "inherit"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: C.charcoal,
      opacity: 0.55
    }
  }, "days (28 is average)"))), cycleDay !== null && phase !== null && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.white,
      borderRadius: 16,
      padding: 18,
      marginBottom: 14,
      boxShadow: "0 2px 12px rgba(0,0,0,.05)",
      display: "flex",
      alignItems: "center",
      gap: 18,
      flexWrap: "wrap",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "200",
    height: "200",
    viewBox: "0 0 200 200",
    style: {
      flexShrink: 0
    }
  }, phaseArcs.map((a, i) => /*#__PURE__*/React.createElement("path", {
    key: i,
    d: arcPath(a.from, a.to),
    fill: "none",
    stroke: a.color,
    strokeWidth: strokeW,
    strokeLinecap: "butt",
    opacity: phase.idx === i ? 1 : 0.35
  })), markerX !== null && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: markerX,
    cy: markerY,
    r: "9",
    fill: C.white,
    stroke: C.forest,
    strokeWidth: "2.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: markerX,
    cy: markerY,
    r: "4",
    fill: C.forest
  })), /*#__PURE__*/React.createElement("text", {
    x: cx,
    y: cy - 4,
    textAnchor: "middle",
    fontSize: "13",
    fill: C.charcoal,
    opacity: "0.52",
    fontFamily: "DM Sans, sans-serif"
  }, "Cycle day"), /*#__PURE__*/React.createElement("text", {
    x: cx,
    y: cy + 18,
    textAnchor: "middle",
    fontSize: "30",
    fill: C.forest,
    fontFamily: "Georgia, serif",
    fontWeight: "300"
  }, cycleDay), /*#__PURE__*/React.createElement("text", {
    x: cx,
    y: cy + 38,
    textAnchor: "middle",
    fontSize: "10",
    fill: C.charcoal,
    opacity: "0.45",
    fontFamily: "DM Sans, sans-serif"
  }, "of ", cycleLength)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 200
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10,
      letterSpacing: 1.5,
      color: C.charcoal,
      opacity: 0.45,
      fontWeight: "bold",
      marginBottom: 4
    }
  }, "TODAY"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 18,
      fontFamily: "Georgia, serif",
      color: phaseInfo[phase.idx].color,
      marginBottom: 8
    }
  }, phaseInfo[phase.idx].title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap"
    }
  }, phaseInfo.map((p, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      width: 14,
      height: 14,
      borderRadius: "50%",
      background: p.color,
      opacity: i === phase.idx ? 1 : 0.28,
      border: i === phase.idx ? `2px solid ${C.forest}` : "none"
    },
    title: p.title
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.cream,
      borderRadius: 14,
      padding: 16,
      marginBottom: 10,
      borderLeft: `3px solid ${phaseInfo[phase.idx].color}`
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      letterSpacing: 1,
      color: phaseInfo[phase.idx].color,
      fontWeight: "bold",
      marginBottom: 8
    }
  }, "WHAT THIS PHASE OFTEN MEANS FOR THE GUT"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: C.charcoal,
      lineHeight: 1.65,
      marginBottom: 12
    }
  }, phaseInfo[phase.idx].desc), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      letterSpacing: 1,
      color: phaseInfo[phase.idx].color,
      fontWeight: "bold",
      marginBottom: 8
    }
  }, "WHAT MIGHT HELP THIS WEEK"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: C.charcoal,
      lineHeight: 1.65
    }
  }, phaseInfo[phase.idx].tip))), cycleDay === null && /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.sageLight,
      borderRadius: 14,
      padding: 16,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: C.forest,
      lineHeight: 1.6
    }
  }, "Once you enter the first day of your most recent period above, this tool will show you where you are in your cycle and how that phase typically shifts your gut-brain axis signalling.")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.creamDark,
      borderRadius: 10,
      padding: 12,
      display: "flex",
      alignItems: "flex-start",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.forest,
      flexShrink: 0,
      marginTop: 1
    }
  }, Ico.warning), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10.5,
      color: C.charcoal,
      opacity: 0.6,
      lineHeight: 1.55
    }
  }, "Cycle-phase effects on the gut-brain axis are well-documented in IBS research, but individual patterns vary widely. This tool is an educational aid grounded in that evidence, not a diagnostic tool or a replacement for clinical care. Use it as one lens alongside your own tracking and your clinician\\u0027s guidance.")));
}
function SuggestionBox() {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [sending, setSending] = useState(false);
  async function handleSubmit() {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    let sent = false;
    if (/^https?:$/.test(window.location.protocol)) {
      try {
        const res = await fetch("/api/suggest", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            text: t.slice(0, 1500)
          })
        });
        sent = res.ok;
      } catch (e) {
        sent = false;
      }
    }
    if (!sent) {
      const list = store.get("gom_suggestions", []);
      store.set("gom_suggestions", [...(Array.isArray(list) ? list : []), {
        t,
        d: new Date().toISOString()
      }].slice(-20));
    }
    setSubmitted(sent ? "Thank you, your suggestion has been sent." : "Thank you. It could not be sent right now, so it has been saved on this device.");
    setText("");
    setSending(false);
    setTimeout(() => setSubmitted(""), 4500);
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.white,
      borderRadius: 14,
      padding: 16,
      boxShadow: "0 2px 10px rgba(0,0,0,.06)",
      marginTop: 14,
      marginBottom: 14,
      borderTop: `3px solid ${C.forest}`
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      fontWeight: "bold",
      color: C.forest,
      marginBottom: 4
    }
  }, "Have a suggestion for the app?"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11.5,
      color: C.charcoal,
      opacity: .68,
      lineHeight: 1.5,
      marginBottom: 10
    }
  }, "Want to hear more about a certain topic? Notice something that could be clearer, more accurate, or added? Share your thoughts here and I will do my best to apply them."), /*#__PURE__*/React.createElement("textarea", {
    value: text,
    maxLength: 1500,
    "aria-label": "Your suggestion",
    onChange: e => setText(e.target.value),
    placeholder: "For example: 'I would like more on gut bacteria after antibiotics' or 'the breathing audio sessions would be helpful'...",
    style: {
      width: "100%",
      minHeight: 90,
      background: C.cream,
      border: `1px solid ${C.creamDark}`,
      borderRadius: 10,
      padding: "10px 12px",
      fontSize: 12.5,
      color: C.charcoal,
      lineHeight: 1.5,
      resize: "vertical",
      fontFamily: "inherit",
      boxSizing: "border-box"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 10,
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10.5,
      color: C.charcoal,
      opacity: .45,
      flex: 1,
      lineHeight: 1.4
    }
  }, "Suggestions are sent anonymously. Please do not include your name or personal health details."), /*#__PURE__*/React.createElement("button", {
    onClick: handleSubmit,
    disabled: !text.trim() || sending,
    style: {
      background: text.trim() ? C.forest : C.creamDark,
      color: C.white,
      border: "none",
      borderRadius: 20,
      padding: "8px 16px",
      fontSize: 12,
      fontWeight: "bold",
      cursor: text.trim() ? "pointer" : "default",
      opacity: text.trim() && !sending ? 1 : 0.6
    }
  }, sending ? "Sending..." : "Submit")), submitted && /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.sageLight,
      color: C.forest,
      borderRadius: 10,
      padding: "10px 12px",
      marginTop: 10,
      fontSize: 12,
      fontWeight: "bold",
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      width: 14,
      height: 14,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6L9 17l-5-5"
  })), submitted));
}
const ABOUT_TEXT = "Gut Over Matter is a knowledge translation tool that explains irritable bowel syndrome (IBS) as a disorder of gut-brain interaction, in plain language. It turns peer-reviewed research and clinical guidelines into guided programs, nervous system regulation tools, science explainers, and Gut IQ, an assistant that answers questions about the science. Everything you save stays on your own device. It is an educational resource and does not replace care from a clinician.";
function SupportTab() {
  return /*#__PURE__*/React.createElement("div", {
    className: "gom-stagger",
    style: {
      background: C.sagePale,
      minHeight: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: `linear-gradient(155deg,${C.clay},${C.clayLight})`,
      padding: "52px 20px 28px"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10,
      letterSpacing: 3,
      color: "rgba(255,255,255,.52)",
      fontWeight: "bold",
      marginBottom: 5
    }
  }, "SUPPORT"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 24,
      fontFamily: "Georgia,serif",
      fontWeight: 300,
      color: C.white,
      lineHeight: 1.35
    }
  }, "You are not alone", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("em", null, "in this."))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 18px 28px"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10,
      letterSpacing: 2,
      color: C.charcoal,
      opacity: .4,
      fontWeight: "bold",
      marginBottom: 12
    }
  }, "WHAT PEOPLE SAID THEY WERE MISSING"), MISSING.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      background: C.white,
      borderRadius: 14,
      padding: 16,
      marginBottom: 10,
      boxShadow: "0 2px 8px rgba(0,0,0,.05)"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14.5,
      fontFamily: "Georgia,serif",
      fontStyle: "italic",
      color: C.charcoal,
      lineHeight: 1.65,
      marginBottom: 8
    }
  }, "\"", c.q, "\""), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10.5,
      color: C.charcoal,
      opacity: .42
    }
  }, c.who))), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10,
      letterSpacing: 2,
      color: C.charcoal,
      opacity: .4,
      fontWeight: "bold",
      marginBottom: 12,
      marginTop: 22
    }
  }, "WHAT CHANGED AFTER USING THIS TOOL"), TESTERS.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      background: C.sageLight,
      borderRadius: 14,
      padding: 16,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 11,
      marginBottom: 11
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 38,
      height: 38,
      borderRadius: "50%",
      background: C.forest,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: C.white,
      fontSize: 14,
      fontWeight: "bold",
      flexShrink: 0
    }
  }, c.init), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      fontWeight: "bold",
      color: C.charcoal
    }
  }, c.n), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10.5,
      color: C.charcoal,
      opacity: .42
    }
  }, c.r))), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: C.charcoal,
      opacity: .45,
      marginBottom: 7,
      lineHeight: 1.5
    }
  }, "Before: ", c.b), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13.5,
      fontFamily: "Georgia,serif",
      fontStyle: "italic",
      color: C.charcoal,
      lineHeight: 1.7,
      borderLeft: `3px solid ${C.forest}`,
      paddingLeft: 10
    }
  }, c.a))), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10,
      letterSpacing: 2,
      color: C.charcoal,
      opacity: .4,
      fontWeight: "bold",
      marginBottom: 12,
      marginTop: 22
    }
  }, "TALKING TO YOUR CARE TEAM"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.cream,
      borderRadius: 12,
      padding: "12px 14px",
      marginBottom: 12,
      borderLeft: `3px solid ${C.forest}`
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: C.charcoal,
      lineHeight: 1.6
    }
  }, "Learn more about your needs and questions through the tools and sessions in this app. Then use those as directed questions for your care team the next time you go. Some examples include:")), [{
    role: "Your GP",
    icon: Ico.stetho,
    color: C.forest,
    qs: ["What does 'Disorder of Gut-Brain Interaction' mean for how you manage my IBS?", "Is gut-directed CBT or hypnotherapy something I could be referred to?", "Can we check fecal calprotectin before assuming this is IBS?"]
  }, {
    role: "Gastroenterologist",
    icon: Ico.microscope,
    color: C.teal,
    qs: ["Has my Rome IV positive diagnosis been explicitly communicated to me?", "Should pelvic floor assessment be considered given my outlet symptoms?", "Is there a basis for a gut-directed hypnotherapy referral?"]
  }, {
    role: "Physiotherapist",
    icon: Ico.muscle,
    color: C.clay,
    qs: ["Do you have experience with autonomic regulation and IBS?", "Can you assess whether a pelvic floor component is relevant?", "Is there a slow breathing or HRV programme you can guide me through?"]
  }, {
    role: "Pharmacist",
    icon: Ico.pill,
    color: C.purple,
    qs: ["What probiotic strains actually have evidence for IBS outcomes?", "How long should I trial a probiotic before evaluating it?", "Are there interactions between my current medications and common IBS supplements?"]
  }].map((p, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      background: C.white,
      borderRadius: 14,
      padding: 16,
      marginBottom: 10,
      boxShadow: "0 2px 8px rgba(0,0,0,.05)"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      fontWeight: "bold",
      color: C.charcoal,
      marginBottom: 11,
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: p.color,
      display: "inline-flex"
    }
  }, p.icon), " ", p.role), p.qs.map((q, j) => /*#__PURE__*/React.createElement("p", {
    key: j,
    style: {
      fontSize: 12.5,
      color: C.charcoal,
      lineHeight: 1.55,
      marginBottom: 8,
      paddingLeft: 11,
      borderLeft: `2px solid ${C.sage}`
    }
  }, "\"", q, "\"")))), /*#__PURE__*/React.createElement(SuggestionBox, null), /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.white,
      borderRadius: 14,
      padding: 16,
      marginTop: 4,
      marginBottom: 12,
      boxShadow: "0 2px 8px rgba(0,0,0,.05)"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 10,
      letterSpacing: 2,
      color: C.charcoal,
      opacity: .4,
      fontWeight: "bold",
      marginBottom: 8
    }
  }, "ABOUT THIS PROJECT"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12.5,
      color: C.charcoal,
      lineHeight: 1.65,
      marginBottom: 8
    }
  }, ABOUT_TEXT), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: C.charcoal,
      opacity: .55,
      lineHeight: 1.5
    }
  }, "Created by Sara Khademal · HK*4510 Teaching, Learning and Knowledge Transfer · University of Guelph · Faculty advisor: William Bettger")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      margin: "6px 0 10px"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (window.confirm("Erase everything this app has saved on this device (chats, sleep plan, routine, cycle dates)?")) {
        store.clearAll();
        window.location.reload();
      }
    },
    style: {
      background: "transparent",
      border: "none",
      color: C.charcoal,
      opacity: .45,
      fontSize: 11,
      textDecoration: "underline",
      cursor: "pointer"
    }
  }, "Clear what this app saved on this device")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.creamDark,
      borderRadius: 10,
      padding: 14,
      marginTop: 10,
      display: "flex",
      alignItems: "flex-start",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.clay,
      flexShrink: 0,
      marginTop: 1
    }
  }, Ico.warning), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: C.charcoal,
      opacity: .55,
      lineHeight: 1.6
    }
  }, "This is not medical advice. Gut Over Matter is a knowledge translation tool grounded in peer-reviewed IBS gut-brain research. It does not replace clinical assessment or clinical care. Please always discuss your symptoms, treatment options, and any medications with your healthcare team."))));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(ErrorBoundary, null, /*#__PURE__*/React.createElement(App, null)));
requestAnimationFrame(() => requestAnimationFrame(() => {
  const ls = document.getElementById('loading-screen');
  if (ls) {
    ls.style.opacity = '0';
    setTimeout(() => ls.remove(), 350);
  }
}));