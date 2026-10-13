// Trading "overview" dashboard — LIVE real Binance USDⓈ-M Futures data.
// Shell built once; pollers mutate only dynamic nodes so prices flash, the
// chart streams, the book and tape update (Sweep Perp).

import { SYMBOLS, META, INTERVAL, fetchTickers, fetchKlines, fetchDepth, fetchTrades, hhmmss } from "/market.mjs";
import { getAccount, holdQty, placeOrder } from "/wallet.mjs";

// ---------- styling (injected once) ----------
const CSS = `
.ov{--up:#16c784;--down:#ea3943;--card:#161b22;--line:#30363d;--mut:#8b949e;--acc:#4f8cff;--chip:#1f2937;--txt:#e6edf3}
.ov{display:flex;flex-direction:column;gap:16px}
.ov-top{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.ov-top h2{margin:0;font-size:22px}
.ov-top .sub{color:var(--mut);font-size:13px;margin-top:2px}
.ov-live{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:var(--mut);background:var(--card);border:1px solid var(--line);border-radius:20px;padding:6px 12px}
.ov-dot{width:8px;height:8px;border-radius:50%;background:var(--up);box-shadow:0 0 0 0 rgba(22,199,132,.6);animation:ovpulse 1.6s infinite}
.ov-dot.off{background:var(--down);animation:none}
@keyframes ovpulse{0%{box-shadow:0 0 0 0 rgba(22,199,132,.6)}70%{box-shadow:0 0 0 7px rgba(22,199,132,0)}100%{box-shadow:0 0 0 0 rgba(22,199,132,0)}}
.ov-ticker{overflow:hidden;border:1px solid var(--line);border-radius:10px;background:linear-gradient(90deg,#161b22,#13171e)}
.ov-ticker .track{display:flex;gap:26px;padding:10px 14px;white-space:nowrap;animation:ovscroll 32s linear infinite;width:max-content}
.ov-ticker:hover .track{animation-play-state:paused}
@keyframes ovscroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.ov-tk{font-size:13px;display:inline-flex;gap:7px;align-items:baseline}
.ov-tk b{font-weight:600}.ov-tk .ar{font-size:10px}
.ov-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.ov-kpi{position:relative;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;overflow:hidden}
.ov-kpi::after{content:"";position:absolute;inset:0 0 auto 0;height:2px;background:linear-gradient(90deg,transparent,var(--acc),transparent);opacity:.5}
.ov-kpi .lbl{color:var(--mut);font-size:11px;text-transform:uppercase;letter-spacing:.8px}
.ov-kpi .val{font-size:26px;font-weight:800;margin-top:8px;font-variant-numeric:tabular-nums}
.ov-kpi .chg{font-size:13px;margin-top:6px;font-weight:600}
.ov-grid{display:grid;grid-template-columns:2fr 1fr;gap:16px;align-items:start}
.ov-col{display:flex;flex-direction:column;gap:16px;min-width:0}
.ov-card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px}
.ov-card h3{margin:0 0 12px;font-size:14px;display:flex;align-items:center;justify-content:space-between}
.ov-card h3 .r{font-weight:400;color:var(--mut);font-size:12px;display:flex;gap:6px}
.ov-tfs{display:flex;gap:4px}
.ov-tf{background:var(--chip);border:1px solid var(--line);color:var(--mut);border-radius:6px;padding:3px 9px;font-size:12px;cursor:pointer}
.ov-tf.on{background:var(--acc);border-color:var(--acc);color:#fff}
.ov-chart-head{display:flex;align-items:baseline;gap:12px;margin-bottom:8px;flex-wrap:wrap}
.ov-chart-head .px{font-size:28px;font-weight:800;font-variant-numeric:tabular-nums}
.ov-sel{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.ov-pill{background:var(--chip);border:1px solid var(--line);color:var(--txt);border-radius:20px;padding:5px 12px;font-size:13px;cursor:pointer;transition:.15s}
.ov-pill:hover{border-color:var(--acc)}
.ov-pill.on{background:#0d2a52;border-color:var(--acc);color:#fff}
.ov table{width:100%;border-collapse:collapse;font-size:13px}
.ov th{color:var(--mut);font-weight:500;text-align:left;padding:7px 6px;border-bottom:1px solid var(--line);font-size:11px;text-transform:uppercase;letter-spacing:.4px}
.ov td{padding:8px 6px;border-bottom:1px solid #21262d}
.ov tr:last-child td{border-bottom:0}
.ov .num{text-align:right;font-variant-numeric:tabular-nums}
.ov .wl{cursor:pointer;transition:background .15s}
.ov .wl:hover{background:#1c2128}
.ov .wl.on{background:#11203a}
.ov .up{color:var(--up)} .ov .down{color:var(--down)}
.ov-sym{display:flex;align-items:center;gap:9px}
.ov-ic{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:700;color:#0d1117}
.ov-sym small{color:var(--mut);display:block;font-size:11px}
.ov-trade .seg{display:flex;margin-bottom:12px;border:1px solid var(--line);border-radius:8px;overflow:hidden}
.ov-trade .seg button{flex:1;background:transparent;border:0;color:var(--mut);padding:9px;font-weight:600;cursor:pointer;transition:.15s}
.ov-trade .seg button.buy.on{background:var(--up);color:#06281b}
.ov-trade .seg button.sell.on{background:var(--down);color:#2a0b0e}
.ov-field{margin-bottom:10px}
.ov-field label{display:block;font-size:11px;color:var(--mut);margin-bottom:4px}
.ov-field .inp{display:flex;align-items:center;background:#0d1117;border:1px solid var(--line);border-radius:8px;padding:2px 10px}
.ov-field .inp:focus-within{border-color:var(--acc)}
.ov-field input{flex:1;background:transparent;border:0;color:var(--txt);padding:8px 0;font:inherit;outline:none}
.ov-field .suf{color:var(--mut);font-size:12px}
.ov-pcts{display:flex;gap:6px;margin:4px 0 12px}
.ov-pcts button{flex:1;background:var(--chip);border:1px solid var(--line);color:var(--mut);border-radius:6px;padding:5px;font-size:12px;cursor:pointer}
.ov-pcts button:hover{color:var(--txt);border-color:var(--acc)}
.ov-submit{width:100%;border:0;border-radius:8px;padding:12px;font-weight:700;font-size:14px;cursor:pointer;color:#fff;transition:filter .15s}
.ov-submit:hover{filter:brightness(1.1)}
.ov-avail{font-size:12px;color:var(--mut);display:flex;justify-content:space-between;margin-bottom:12px}
.ov-ob{font-size:12px;font-variant-numeric:tabular-nums}
.ov-ob .r{position:relative;display:flex;justify-content:space-between;padding:3px 8px}
.ov-ob .r span{position:relative;z-index:2}
.ov-ob .bar{position:absolute;top:0;bottom:0;right:0;z-index:1;opacity:.14;transition:width .4s ease}
.ov-ob .spread{text-align:center;color:var(--mut);padding:7px;font-size:12px;border-block:1px solid var(--line);margin:4px 0;font-variant-numeric:tabular-nums}
.ov-alloc{display:flex;align-items:center;gap:18px}
.ov-legend{flex:1;display:flex;flex-direction:column;gap:7px;font-size:13px}
.ov-legend .li{display:flex;align-items:center;gap:8px}
.ov-legend .sw{width:10px;height:10px;border-radius:3px}
.ov-legend .li .num{margin-left:auto;color:var(--mut)}
.ov-spark{display:block}
.ov-badge{font-size:11px;padding:2px 7px;border-radius:5px;font-weight:600}
.ov-badge.long{background:rgba(22,199,132,.15);color:var(--up)}
.ov-badge.short{background:rgba(234,57,67,.15);color:var(--down)}
.ov-tr{display:flex;justify-content:space-between;font-size:12px;font-variant-numeric:tabular-nums;padding:4px 2px;border-bottom:1px solid #21262d}
.ov-tr:last-child{border-bottom:0}
.ov-tr .t{color:var(--mut)}
.ov-tr.new{animation:slidein .4s ease}
@keyframes slidein{from{opacity:0;transform:translateY(-8px);background:rgba(79,140,255,.12)}to{opacity:1;transform:none}}
.fu{animation:fu .7s ease-out}.fd{animation:fd .7s ease-out}
@keyframes fu{0%{color:var(--up);text-shadow:0 0 14px rgba(22,199,132,.8)}100%{text-shadow:none}}
@keyframes fd{0%{color:var(--down);text-shadow:0 0 14px rgba(234,57,67,.8)}100%{text-shadow:none}}
.cellflash-u{animation:cfu .7s ease-out}.cellflash-d{animation:cfd .7s ease-out}
@keyframes cfu{0%{background:rgba(22,199,132,.28)}100%{background:transparent}}
@keyframes cfd{0%{background:rgba(234,57,67,.28)}100%{background:transparent}}
.ov-pdot{animation:ovdot 1.3s ease-out infinite}
@keyframes ovdot{0%{r:3;opacity:.9}100%{r:11;opacity:0}}
.ov-toast{position:fixed;right:20px;bottom:20px;background:var(--card);border:1px solid var(--line);border-left:3px solid var(--up);border-radius:10px;padding:12px 16px;font-size:13px;box-shadow:0 8px 28px rgba(0,0,0,.45);z-index:999;animation:ovin .25s ease}
.ov-toast.sell{border-left-color:var(--down)}
@keyframes ovin{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media(max-width:1100px){.ov-grid{grid-template-columns:1fr}.ov-kpis{grid-template-columns:repeat(2,1fr)}}
`;

// ---------- format ----------
const dp = (v) => (v >= 1000 ? 2 : v >= 1 ? 3 : v >= 0.01 ? 5 : 6);
const fmt = (v, d) => (v == null || isNaN(v)) ? "—" : v.toLocaleString("en-US", { minimumFractionDigits: d ?? dp(v), maximumFractionDigits: d ?? dp(v) });
const money = (v) => "$" + fmt(v, 2);
const pctTxt = (v) => (v == null || isNaN(v)) ? "—" : (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
const compact = (v) => v >= 1e9 ? "$" + (v / 1e9).toFixed(2) + "B" : v >= 1e6 ? "$" + (v / 1e6).toFixed(1) + "M" : "$" + fmt(v, 0);

// ---------- live market state (filled from Binance) ----------
const MKT = SYMBOLS.map((x) => ({ ...x, price: null, prev: null, chg: null, high: null, low: null, vol: null, spark: [] }));
const bySym = Object.fromEntries(MKT.map((m) => [m.s, m]));
const bySymU = Object.fromEntries(MKT.map((m) => [m.sym, m]));

// demo paper portfolio lives in wallet.mjs (valued at REAL prices)
const POSITIONS = [
  { s: "BTC", side: "long",  qty: 0.15, entry: 65120.0 },
  { s: "ETH", side: "long",  qty: 1.9,  entry: 3102.4 },
  { s: "SOL", side: "short", qty: 22.0, entry: 181.2 },
];

let TRADES = [];       // real aggTrades of selected symbol (newest first)
let state = { sym: "BTC", tf: "1H", side: "buy", candles: [], depth: null };
let timers = [];
let online = false;

// ---------- SVG ----------
function sparkSVG(data, up, w = 96, h = 30) {
  if (!data || data.length < 2) return `<svg class="ov-spark" width="${w}" height="${h}"></svg>`;
  const min = Math.min(...data), max = Math.max(...data), r = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / r) * (h - 4) - 2}`).join(" ");
  return `<svg class="ov-spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline fill="none" stroke="${up ? "#16c784" : "#ea3943"}" stroke-width="1.5" points="${pts}"/></svg>`;
}

function chartSVG(candles, w = 640, h = 320) {
  if (!candles || !candles.length) return `<div style="height:300px;display:grid;place-items:center;color:#8b949e">Loading chart…</div>`;
  const pad = { l: 8, r: 64, t: 10, b: 20 }, volH = 46, gap = 8;
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b - volH - gap;
  const lo = Math.min(...candles.map((c) => c.l)), hi = Math.max(...candles.map((c) => c.h)), r = hi - lo || 1;
  const y = (v) => pad.t + ih - ((v - lo) / r) * ih;
  const n = candles.length, step = iw / n, bw = Math.max(1.5, step * 0.6);
  const volTop = pad.t + ih + gap, maxVol = Math.max(...candles.map((c) => c.v || 1));
  const cx = (i) => pad.l + i * step + step / 2;
  const linePts = candles.map((c, i) => `${cx(i)},${y(c.c)}`);
  const area = `M ${pad.l},${pad.t + ih} L ${linePts.join(" L ")} L ${cx(n - 1)},${pad.t + ih} Z`;
  let bars = "", vols = "";
  candles.forEach((c, i) => {
    const x = cx(i), up = c.c >= c.o, col = up ? "#16c784" : "#ea3943";
    const yo = y(c.o), yc = y(c.c), top = Math.min(yo, yc), bh = Math.max(1, Math.abs(yc - yo));
    bars += `<line x1="${x}" x2="${x}" y1="${y(c.h)}" y2="${y(c.l)}" stroke="${col}" stroke-width="1"/><rect x="${x - bw / 2}" y="${top}" width="${bw}" height="${bh}" fill="${col}"/>`;
    const vh = ((c.v || 1) / maxVol) * volH;
    vols += `<rect x="${x - bw / 2}" y="${volTop + volH - vh}" width="${bw}" height="${vh}" fill="${col}" opacity="0.4"/>`;
  });
  let grid = "";
  for (let g = 0; g <= 4; g++) {
    const gy = pad.t + (ih / 4) * g, val = hi - (r / 4) * g;
    grid += `<line x1="${pad.l}" x2="${pad.l + iw}" y1="${gy}" y2="${gy}" stroke="#21262d"/><text x="${pad.l + iw + 6}" y="${gy + 3}" fill="#8b949e" font-size="10">${fmt(val, val > 100 ? 0 : 2)}</text>`;
  }
  grid += `<text x="${pad.l}" y="${volTop - 2}" fill="#6b7280" font-size="9">Volume</text>`;
  const last = candles[n - 1], ly = y(last.c), lup = last.c >= last.o, lcol = lup ? "#16c784" : "#ea3943";
  const marker = `<line x1="${pad.l}" x2="${pad.l + iw}" y1="${ly}" y2="${ly}" stroke="${lcol}" stroke-width="1" stroke-dasharray="4 3" opacity="0.7"/>
    <rect x="${pad.l + iw}" y="${ly - 8}" width="${pad.r}" height="16" fill="${lcol}"/>
    <text x="${pad.l + iw + pad.r / 2}" y="${ly + 4}" text-anchor="middle" fill="#0d1117" font-size="10" font-weight="700">${fmt(last.c, last.c > 100 ? 1 : 3)}</text>
    <circle cx="${cx(n - 1)}" cy="${ly}" r="3" fill="${lcol}"/><circle class="ov-pdot" cx="${cx(n - 1)}" cy="${ly}" r="3" fill="none" stroke="${lcol}" stroke-width="2"/>`;
  return `<svg width="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="display:block">
    <defs><linearGradient id="ovgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${lcol}" stop-opacity="0.22"/><stop offset="100%" stop-color="${lcol}" stop-opacity="0"/></linearGradient></defs>
    ${grid}<path d="${area}" fill="url(#ovgrad)"/><polyline fill="none" stroke="${lcol}" stroke-width="1.3" opacity="0.65" points="${linePts.join(" ")}"/>${bars}${vols}${marker}</svg>`;
}

function donutSVG(parts, size = 120) {
  const total = parts.reduce((a, p) => a + p.v, 0) || 1;
  const c = size / 2, rad = size / 2 - 6, C = 2 * Math.PI * rad;
  let off = 0, segs = "";
  for (const p of parts) {
    const len = (p.v / total) * C;
    segs += `<circle cx="${c}" cy="${c}" r="${rad}" fill="none" stroke="${p.c}" stroke-width="12" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 ${c} ${c})" style="transition:stroke-dasharray .4s"/>`;
    off += len;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${segs}<text x="${c}" y="${c - 2}" text-anchor="middle" fill="#8b949e" font-size="10">TOTAL</text><text x="${c}" y="${c + 12}" text-anchor="middle" fill="#e6edf3" font-size="13" font-weight="700">100%</text></svg>`;
}

// ---------- derived ----------
function portfolio() {
  const acc = getAccount();
  const holdVal = Object.entries(acc.holdings).filter(([, q]) => q > 1e-12).map(([s, qty]) => {
    const coin = bySym[s] || { c: "#8b949e", s, price: 0, chg: 0 };
    return { s, qty, val: qty * (coin.price || 0), coin };
  });
  const invested = holdVal.reduce((a, h) => a + h.val, 0);
  const total = invested + acc.cash;
  const chg24 = invested ? holdVal.reduce((a, h) => a + h.val * (h.coin.chg || 0), 0) / invested : 0;
  const dayPnl = (total * chg24) / 100;
  const posPnl = POSITIONS.reduce((a, p) => a + ((bySym[p.s].price || p.entry) - p.entry) * p.qty * (p.side === "long" ? 1 : -1), 0);
  return { holdVal, invested, total, chg24, dayPnl, posPnl, cash: acc.cash };
}
function kpiDefs() {
  const P = portfolio();
  return [
    { lbl: "Portfolio Value", val: money(P.total), chg: P.chg24, note: pctTxt(P.chg24) + " (24s)" },
    { lbl: "Available Balance", val: money(P.cash), chg: 0, note: "USDT" },
    { lbl: "Daily P/L", val: (P.dayPnl < 0 ? "-$" : "$") + fmt(Math.abs(P.dayPnl), 2), chg: P.dayPnl, note: pctTxt(P.chg24) },
    { lbl: "Open Position P/L", val: (P.posPnl < 0 ? "-$" : "$") + fmt(Math.abs(P.posPnl), 2), chg: P.posPnl, note: POSITIONS.length + " pozisyon" },
  ];
}

// ---------- dynamic HTML ----------
function tickerHTML() {
  return [...MKT, ...MKT].map((m) => {
    const up = (m.chg || 0) >= 0;
    return `<span class="ov-tk"><b>${m.s}</b> <span>$${fmt(m.price)}</span> <span class="${up ? "up" : "down"}"><span class="ar">${up ? "▲" : "▼"}</span>${pctTxt(m.chg)}</span></span>`;
  }).join("");
}
function wlHTML() {
  return MKT.map((m) => `<tr class="wl ${m.s === state.sym ? "on" : ""}" data-sym="${m.s}">
    <td><div class="ov-sym"><div class="ov-ic" style="background:${m.c}">${m.s[0]}</div><div><b>${m.s}</b><small>${m.n}</small></div></div></td>
    <td class="num ${m.price > m.prev ? "cellflash-u" : m.price < m.prev ? "cellflash-d" : ""}">$${fmt(m.price)}</td>
    <td class="num ${(m.chg || 0) >= 0 ? "up" : "down"}">${pctTxt(m.chg)}</td>
    <td class="num">${sparkSVG(m.spark, (m.chg || 0) >= 0)}</td></tr>`).join("");
}
function posHTML() {
  return POSITIONS.map((p) => {
    const px = bySym[p.s].price || p.entry, dir = p.side === "long" ? 1 : -1;
    const pnl = (px - p.entry) * p.qty * dir, pnlPct = ((px - p.entry) / p.entry) * 100 * dir;
    return `<tr><td><div class="ov-sym"><div class="ov-ic" style="background:${bySym[p.s].c}">${p.s[0]}</div>
      <div><b>${p.s}/USDT</b> <span class="ov-badge ${p.side}">${p.side === "long" ? "LONG" : "SHORT"}</span></div></div></td>
      <td class="num">${p.qty}</td><td class="num">$${fmt(p.entry)}</td><td class="num">$${fmt(px)}</td>
      <td class="num ${pnl >= 0 ? "up" : "down"}">${pnl >= 0 ? "+" : "-"}$${fmt(Math.abs(pnl), 2)}<br><small>${pctTxt(pnlPct)}</small></td></tr>`;
  }).join("");
}
function obHTML() {
  const d = state.depth;
  if (!d) return `<div style="color:var(--mut);padding:10px 2px">Loading order book…</div>`;
  const asks = d.asks.slice(0, 8).reverse(), bids = d.bids.slice(0, 8);
  const maxA = Math.max(...asks.map((a) => a.amt), 0.0001), maxB = Math.max(...bids.map((b) => b.amt), 0.0001);
  const row = (r, bid, mx) => `<div class="r"><div class="bar" style="width:${(r.amt / mx) * 100}%;background:${bid ? "#16c784" : "#ea3943"}"></div><span class="${bid ? "up" : "down"}">${fmt(r.px)}</span><span>${fmt(r.amt, 3)}</span></div>`;
  const spread = (asks.length && bids.length) ? asks[asks.length - 1].px - bids[0].px : 0;
  return `${asks.map((a) => row(a, false, maxA)).join("")}<div class="spread">$${fmt(bids[0]?.px)} &nbsp;·&nbsp; spread ${fmt(spread, spread > 1 ? 2 : 4)}</div>${bids.map((b) => row(b, true, maxB)).join("")}`;
}
function tradesHTML() {
  if (!TRADES.length) return `<div style="color:var(--mut);padding:10px 2px">Loading trades…</div>`;
  return TRADES.slice(0, 15).map((t) => `<div class="ov-tr ${t.fresh ? "new" : ""}"><span class="${t.buy ? "up" : "down"}">${fmt(t.px)}</span><span>${fmt(t.amt, 3)}</span><span class="t">${hhmmss(t.ms)}</span></div>`).join("");
}
function allocParts() {
  const P = portfolio();
  return [...P.holdVal.map((h) => ({ label: h.s, v: h.val, c: h.coin.c })), { label: "Nakit", v: P.cash, c: "#4f8cff" }];
}
function legendHTML() {
  const P = portfolio();
  return allocParts().map((a) => `<div class="li"><span class="sw" style="background:${a.c}"></span>${a.label}<span class="num">${P.total ? ((a.v / P.total) * 100).toFixed(1) : "0.0"}%</span></div>`).join("");
}

// ---------- entry ----------
export async function renderOverview(main, opts = {}) {
  if (!document.getElementById("ov-css")) {
    const st = document.createElement("style"); st.id = "ov-css"; st.textContent = CSS; document.head.appendChild(st);
  }
  if (opts.sym && bySym[opts.sym]) state.sym = opts.sym;
  stopOverview();
  main.innerHTML = `<div class="ov" id="ov"></div>`;
  buildShell();
  await bootData();
  // pollers
  timers.push(setInterval(pollTickers, 1200));
  timers.push(setInterval(pollSymbol, 1500));
  timers.push(setInterval(refreshKlines, 8000));
}
export function stopOverview() { timers.forEach(clearInterval); timers = []; }

async function bootData() {
  try {
    const t = await fetchTickers(SYMBOLS.map((x) => x.sym));
    applyTickers(t);
    online = true;
  } catch { online = false; }
  // sparklines from 1h klines (parallel, once)
  await Promise.all(MKT.map(async (m) => {
    try { const k = await fetchKlines(m.sym, "1h", 24); m.spark = k.map((c) => c.c); } catch {}
  }));
  await Promise.all([refreshKlines(), pollSymbol()]);
  paintAll();
}

function applyTickers(t) {
  for (const m of MKT) {
    const d = t[m.sym]; if (!d) continue;
    m.prev = m.price; m.price = d.price; m.chg = d.chg; m.high = d.high; m.low = d.low; m.vol = d.vol;
    if (m.spark.length) m.spark = [...m.spark.slice(-23), d.price];
  }
}

async function pollTickers() {
  if (!document.getElementById("ov")) return stopOverview();
  try {
    const t = await fetchTickers(SYMBOLS.map((x) => x.sym));
    applyTickers(t); online = true;
  } catch { online = false; }
  // stream last candle to live price
  const cur = bySym[state.sym];
  if (state.candles.length && cur.price) {
    const last = state.candles[state.candles.length - 1];
    last.c = cur.price; last.h = Math.max(last.h, cur.price); last.l = Math.min(last.l, cur.price);
  }
  paintLive();
}

async function pollSymbol() {
  if (!document.getElementById("ov")) return stopOverview();
  const sym = bySym[state.sym].sym;
  try {
    const [d, tr] = await Promise.all([fetchDepth(sym, 20), fetchTrades(sym, 20)]);
    state.depth = d;
    const prevTop = TRADES[0]?.ms;
    tr.forEach((x) => (x.fresh = prevTop && x.ms > prevTop));
    TRADES = tr;
  } catch {}
  set("ovob", obHTML()); set("ovtrades", tradesHTML());
}

async function refreshKlines() {
  if (!document.getElementById("ov")) return stopOverview();
  try { state.candles = await fetchKlines(bySym[state.sym].sym, INTERVAL[state.tf], 80); set("ovchart", chartSVG(state.candles)); } catch {}
}

// ---------- paint ----------
function paintLive() {
  const cur = bySym[state.sym];
  const dot = document.querySelector(".ov-dot"); if (dot) dot.classList.toggle("off", !online);
  set("ovt", tickerHTML());
  setFlash("ovpx", "$" + fmt(cur.price), (cur.price || 0) - (cur.prev || 0));
  const chg = document.getElementById("ovchg"); if (chg) { chg.innerHTML = `${pctTxt(cur.chg)} <small style="color:var(--mut)">24s</small>`; chg.className = (cur.chg || 0) >= 0 ? "up" : "down"; }
  set("ovchart", chartSVG(state.candles));
  kpiDefs().forEach((k, i) => { setFlash(`kpi${i}v`, k.val, k.chg); const c = document.getElementById(`kpi${i}c`); if (c) { c.textContent = k.note; c.className = "chg " + (k.chg >= 0 ? "up" : "down"); } });
  set("ovpos", posHTML()); set("ovwl", wlHTML()); set("ovdonut", donutSVG(allocParts())); set("ovleg", legendHTML());
}
function paintAll() { paintLive(); set("ovob", obHTML()); set("ovtrades", tradesHTML()); }

function setFlash(id, text, dir) {
  const el = document.getElementById(id); if (!el || el.textContent === text) return;
  el.textContent = text; el.classList.remove("fu", "fd"); void el.offsetWidth; el.classList.add(dir >= 0 ? "fu" : "fd");
}
const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };

// ---------- shell ----------
function buildShell() {
  const ov = document.getElementById("ov");
  const kpis = kpiDefs().map((k, i) => `<div class="ov-kpi"><div class="lbl">${k.lbl}</div><div class="val" id="kpi${i}v">${k.val}</div><div class="chg ${k.chg >= 0 ? "up" : "down"}" id="kpi${i}c">${k.note}</div></div>`).join("");
  const tfs = Object.keys(INTERVAL).map((t) => `<span class="ov-tf ${t === state.tf ? "on" : ""}" data-tf="${t}">${t}</span>`).join("");
  const pills = MKT.map((m) => `<span class="ov-pill ${m.s === state.sym ? "on" : ""}" data-pill="${m.s}">${m.s}/USDT</span>`).join("");
  const P = portfolio();
  const avail = state.side === "buy" ? money(P.cash) + " USDT" : holdQty(state.sym) + " " + state.sym;
  ov.innerHTML = `
  <div class="ov-top"><div><h2>Overview</h2><div class="sub">Live Binance USDⓈ-M Futures verisi · paper trading</div></div>
    <div class="ov-live"><span class="ov-dot"></span><span id="ovlive">Live · ${MKT.length} markets</span></div></div>
  <div class="ov-ticker"><div class="track" id="ovt">${tickerHTML()}</div></div>
  <div class="ov-kpis">${kpis}</div>
  <div class="ov-grid">
    <div class="ov-col">
      <div class="ov-card"><div class="ov-sel" id="ovpills">${pills}</div>
        <div class="ov-chart-head"><div class="px" id="ovpx">$${fmt(bySym[state.sym].price)}</div>
          <div id="ovchg" class="up" style="font-weight:600">—</div>
          <div class="ov-tfs" id="ovtfs" style="margin-left:auto">${tfs}</div></div>
        <div id="ovchart">${chartSVG(state.candles)}</div></div>
      <div class="ov-card"><h3>Open Positions <span class="r">${POSITIONS.length} aktif</span></h3>
        <table><thead><tr><th>Sembol</th><th class="num">Amount</th><th class="num">Entry</th><th class="num">Price</th><th class="num">K/Z</th></tr></thead>
        <tbody id="ovpos">${posHTML()}</tbody></table></div>
    </div>
    <div class="ov-col">
      <div class="ov-card"><h3>Asset Allocation</h3><div class="ov-alloc"><div id="ovdonut">${donutSVG(allocParts())}</div><div class="ov-legend" id="ovleg">${legendHTML()}</div></div></div>
      <div class="ov-card ov-trade"><h3>Quick Trade · <span id="ovtsym">${state.sym}</span>/USDT</h3>
        <div class="seg" id="ovseg"><button class="buy ${state.side === "buy" ? "on" : ""}" data-side="buy">Al</button><button class="sell ${state.side === "sell" ? "on" : ""}" data-side="sell">Sat</button></div>
        <div class="ov-avail"><span>Available</span><span id="ovavail">${avail}</span></div>
        <div class="ov-field"><label>Price (USDT)</label><div class="inp"><input id="ov-price" value="${fmt(bySym[state.sym].price)}"><span class="suf">USDT</span></div></div>
        <div class="ov-field"><label>Amount</label><div class="inp"><input id="ov-amt" placeholder="0.00"><span class="suf" id="ovasuf">${state.sym}</span></div></div>
        <div class="ov-pcts">${[25, 50, 75, 100].map((p) => `<button data-pct="${p}">${p}%</button>`).join("")}</div>
        <button class="ov-submit" id="ovsubmit" style="background:${state.side === "buy" ? "var(--up)" : "var(--down)"}">${state.side === "buy" ? "Al" : "Sat"} ${state.sym}</button></div>
      <div class="ov-card"><h3>Order Book <span class="r" id="ovobsym">${state.sym}/USDT</span></h3><div class="ov-ob" id="ovob">${obHTML()}</div></div>
      <div class="ov-card"><h3>Recent Trades <span class="r" id="ovtrsym">${state.sym}/USDT</span></h3>
        <div style="display:flex;justify-content:space-between;color:var(--mut);font-size:11px;padding:0 2px 4px"><span>Price</span><span>Amount</span><span>Zaman</span></div>
        <div id="ovtrades">${tradesHTML()}</div></div>
    </div>
  </div>
  <div class="ov-card"><h3>Markets <span class="r">24 hours · live</span></h3>
    <table><thead><tr><th>Sembol</th><th class="num">Price</th><th class="num">24h %</th><th class="num">Grafik</th></tr></thead><tbody id="ovwl">${wlHTML()}</tbody></table></div>`;
  wire();
}

async function selectSymbol(sym) {
  if (sym === state.sym) return;
  state.sym = sym; state.candles = []; state.depth = null; TRADES = [];
  document.querySelectorAll("#ovpills .ov-pill").forEach((p) => p.classList.toggle("on", p.dataset.pill === sym));
  document.getElementById("ovtsym").textContent = sym;
  document.getElementById("ovasuf").textContent = sym;
  document.getElementById("ovobsym").textContent = sym + "/USDT";
  document.getElementById("ovtrsym").textContent = sym + "/USDT";
  document.getElementById("ov-price").value = fmt(bySym[sym].price);
  updateTradeSide();
  set("ovchart", chartSVG([])); set("ovob", obHTML()); set("ovtrades", tradesHTML());
  await Promise.all([refreshKlines(), pollSymbol()]);
}
function updateTradeSide() {
  const P = portfolio(), btn = document.getElementById("ovsubmit");
  btn.style.background = state.side === "buy" ? "var(--up)" : "var(--down)";
  btn.textContent = (state.side === "buy" ? "Al " : "Sat ") + state.sym;
  document.querySelectorAll("#ovseg button").forEach((b) => b.classList.toggle("on", b.dataset.side === state.side));
  document.getElementById("ovavail").textContent = state.side === "buy" ? money(P.cash) + " USDT" : holdQty(state.sym) + " " + state.sym;
}

function wire() {
  const ov = document.getElementById("ov");
  ov.querySelectorAll("[data-pill]").forEach((el) => el.onclick = () => selectSymbol(el.dataset.pill));
  ov.addEventListener("click", (e) => { const tr = e.target.closest("[data-sym]"); if (tr) selectSymbol(tr.dataset.sym); });
  ov.querySelectorAll("[data-tf]").forEach((el) => el.onclick = () => {
    state.tf = el.dataset.tf;
    document.querySelectorAll("#ovtfs .ov-tf").forEach((t) => t.classList.toggle("on", t.dataset.tf === state.tf));
    refreshKlines();
  });
  ov.querySelectorAll("[data-side]").forEach((el) => el.onclick = () => { state.side = el.dataset.side; updateTradeSide(); });
  ov.querySelectorAll("[data-pct]").forEach((el) => el.onclick = () => {
    const P = portfolio(), price = bySym[state.sym].price || 1, pct = +el.dataset.pct / 100;
    document.getElementById("ov-amt").value = state.side === "buy" ? ((P.cash * pct) / price).toFixed(4) : ((holdQty(state.sym) * pct)).toFixed(4);
  });
  document.getElementById("ovsubmit").onclick = () => {
    const price = +(document.getElementById("ov-price").value.replace(/,/g, "")) || bySym[state.sym].price;
    const amt = +(document.getElementById("ov-amt").value) || 0;
    if (amt <= 0) return toast("Please enter an amount", "sell");
    try {
      placeOrder(state.sym, state.side, amt, price);
      toast(`${state.side === "buy" ? "BUY" : "SELL"} filled · ${amt} ${state.sym} @ $${fmt(price)}`, state.side);
      document.getElementById("ov-amt").value = "";
      updateTradeSide(); paintLive();
    } catch (e) { toast(e.message || "Trade failed", "sell"); }
  };
}

function toast(msg, side) {
  document.querySelectorAll(".ov-toast").forEach((t) => t.remove());
  const el = document.createElement("div");
  el.className = "ov-toast" + (side === "sell" ? " sell" : "");
  el.innerHTML = `<b>${side === "sell" ? "🔴" : "🟢"} ${msg}</b><div style="color:var(--mut);font-size:11px;margin-top:3px">Paper trade · demo balance</div>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}
