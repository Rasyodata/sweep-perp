// Public landing page (pre-login).
import { P, initProtocol, tickProtocol } from "/protocol.mjs";
import { SYMBOLS, fetchTickers, simTickers } from "/market.mjs";
import { compact, compactN, money, pct, fmt, signMoney, shortAddr, esc } from "/util.mjs";

const CSS = `
.lp{--bg:#f0e8d7;--bg2:#faf4e8;--panel:#fffbf2;--line:#e6dcc5;--line2:#d9ccb0;--text:#262131;--mut:#726c78;--acc:#7c3aed;--acc2:#6366f1;--up:#0ea371;--down:#e23950;
  min-height:100vh;background:radial-gradient(1200px 600px at 50% -10%,rgba(124,58,237,.12),transparent 60%),var(--bg);color:var(--text);
  font:15px/1.5 "Public Sans",ui-sans-serif,system-ui,sans-serif;padding-bottom:40px}
.lp *{box-sizing:border-box}
.lp-top{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;padding:20px 22px}
.lp-brand{display:flex;align-items:center;gap:11px;font-weight:800;font-size:17px}
.lp-logo-svg{display:inline-flex;align-items:center;color:#171326;margin-right:2px}.lp-logo-svg svg{height:22px;width:auto;display:block}.lp-perp-w{font-weight:800;font-size:17px}.lp-logo{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,var(--acc),var(--acc2));display:grid;place-items:center;color:#fff;font-weight:900;box-shadow:0 5px 16px rgba(124,58,237,.4)}
.lp-brand small{display:block;color:var(--mut);font-weight:600;font-size:11px}
.lp-ghost{color:var(--text);font-weight:700;cursor:pointer;padding:9px 16px;border:1px solid var(--line2);border-radius:10px;background:var(--panel)}
.lp-ghost:hover{border-color:var(--acc)}
.lp-rates{max-width:1200px;margin:0 auto;overflow:hidden;border:1px solid var(--line);border-radius:12px;background:var(--panel);padding:0 14px}
.lp-rates .t{display:flex;gap:34px;white-space:nowrap;width:max-content;padding:9px 0;font-weight:700;font-size:12.5px;animation:lpscroll 40s linear infinite}
@keyframes lpscroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.lp-rt{display:inline-flex;gap:6px;align-items:center}.lp-rt .s{font-weight:800}.lp-rt .p{font-variant-numeric:tabular-nums}
.lp-hero{max-width:1200px;margin:28px auto 0;padding:0 22px;display:grid;grid-template-columns:1.25fr .85fr;gap:36px;align-items:center}
.lp-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(14,163,113,.12);color:var(--up);font-weight:800;font-size:12.5px;padding:6px 12px;border-radius:20px}
.lp-badge::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--up);box-shadow:0 0 0 0 rgba(14,163,113,.5);animation:lppulse 1.6s infinite}
@keyframes lppulse{70%{box-shadow:0 0 0 7px rgba(14,163,113,0)}}
.lp h1{font-size:50px;line-height:1.05;font-weight:900;letter-spacing:-1.5px;margin:16px 0 14px}
.lp h1 .grad{background:linear-gradient(120deg,var(--acc),var(--acc2));-webkit-background-clip:text;background-clip:text;color:transparent}
.lp-sub{font-size:17px;color:var(--mut);max-width:560px;margin:0 0 24px}
.lp-cta{gap:12px}
.lp-btn{padding:14px 26px;border-radius:12px;font-weight:800;font-size:15px;cursor:pointer;border:1px solid var(--line2);background:var(--panel);color:var(--text);transition:.15s}
.lp-btn:hover{transform:translateY(-1px)}
.lp-btn.primary{background:linear-gradient(135deg,var(--acc),var(--acc2));color:#fff;border:0;box-shadow:0 8px 22px rgba(124,58,237,.35)}
.lp-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px}
.lp-chip{display:inline-flex;align-items:center;gap:6px;background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:7px 13px;font-size:12.5px;font-weight:700;color:var(--mut)}
.lp-card{background:rgba(255,251,242,.8);backdrop-filter:blur(14px);border:1px solid var(--line2);border-radius:18px;padding:24px;box-shadow:0 20px 50px rgba(45,25,80,.12)}
.lp-card h3{margin:0 0 4px;font-size:19px;font-weight:800}
.lp-card .sub{color:var(--mut);font-size:13px;margin-bottom:16px}
.lp-field{margin-bottom:12px}
.lp-field label{display:block;font-size:12px;color:var(--mut);margin-bottom:5px;font-weight:600}
.lp-field input{width:100%;background:var(--bg2);border:1px solid var(--line2);border-radius:10px;padding:12px 13px;font:inherit;color:var(--text);outline:0}
.lp-field input:focus{border-color:var(--acc)}
.lp-err{color:var(--down);font-size:13px;min-height:18px;text-align:center}
.lp-sub2{text-align:center;margin-top:12px;font-size:13px}.lp-sub2 a{color:var(--acc);cursor:pointer;font-weight:700}
.lp-hint{text-align:center;color:var(--mut);font-size:11.5px;margin-top:10px}
.lp-stats{max-width:1200px;margin:40px auto 0;padding:0 22px;display:grid;grid-template-columns:repeat(6,1fr);gap:14px}
.lp-stat{background:linear-gradient(180deg,var(--panel),var(--bg2));border:1px solid var(--line);border-radius:16px;padding:16px;box-shadow:0 2px 8px rgba(45,25,80,.05)}
.lp-stat .ic{font-size:18px}.lp-stat .l{color:var(--mut);font-size:11px;text-transform:uppercase;letter-spacing:.6px;font-weight:700;margin-top:6px}
.lp-stat .v{font-size:23px;font-weight:900;letter-spacing:-.4px;margin-top:3px;font-variant-numeric:tabular-nums}
.lp-sec-t{max-width:1200px;margin:40px auto 14px;padding:0 22px;font-size:20px;font-weight:800}
.lp-top3{max-width:1200px;margin:0 auto;padding:0 22px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.lp-pod{position:relative;overflow:hidden;background:linear-gradient(180deg,var(--panel),var(--bg2));border:1px solid var(--line2);border-radius:16px;padding:16px;box-shadow:0 4px 14px rgba(45,25,80,.06)}
.lp-pod .top{display:flex;align-items:center;gap:10px}.lp-pod .medal{font-size:26px}.lp-pod .who{font-weight:800}
.lp-pod .pnl{font-size:24px;font-weight:900;color:var(--up);margin-top:10px;font-variant-numeric:tabular-nums}
.lp-pod.r1::after{content:"";position:absolute;inset:0 0 auto 0;height:3px;background:linear-gradient(90deg,#f0c14b,#d98c0a)}
.lp-pod.r2::after{content:"";position:absolute;inset:0 0 auto 0;height:3px;background:linear-gradient(90deg,#c9ccda,#9aa0b4)}
.lp-pod.r3::after{content:"";position:absolute;inset:0 0 auto 0;height:3px;background:linear-gradient(90deg,#d8a06a,#b4784a)}
.badge{font-size:11px;padding:2px 7px;border-radius:5px;font-weight:700}.badge.LONG{background:rgba(14,163,113,.15);color:var(--up)}.badge.SHORT{background:rgba(226,57,80,.15);color:var(--down)}
.lp .up{color:var(--up)}.lp .down{color:var(--down)}.lp .lev{color:var(--mut);font-weight:700;font-size:12px}
.lp-steps{max-width:1200px;margin:0 auto;padding:0 22px;display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.lp-step{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:18px}
.lp-step .n{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,var(--acc),var(--acc2));color:#fff;font-weight:900;display:grid;place-items:center;font-size:16px}
.lp-step h4,.lp-feat h4{margin:12px 0 6px;font-size:16px;font-weight:800}
.lp-step p,.lp-feat p{margin:0;color:var(--mut);font-size:13.5px;line-height:1.5}
.lp-feats{max-width:1200px;margin:0 auto;padding:0 22px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.lp-feat{background:linear-gradient(180deg,var(--panel),var(--bg2));border:1px solid var(--line);border-radius:16px;padding:18px;transition:box-shadow .18s,transform .18s}
.lp-feat:hover{box-shadow:0 12px 32px rgba(45,25,80,.1);transform:translateY(-2px)}
.lp-feat .fi{width:46px;height:46px;border-radius:13px;display:grid;place-items:center;font-size:22px;background:rgba(124,58,237,.1)}
.lp-foot{max-width:1200px;margin:44px auto 0;padding:0 22px;color:var(--mut);font-size:12px;text-align:center}
@media(max-width:900px){.lp-hero{grid-template-columns:1fr}.lp-stats,.lp-steps,.lp-feats{grid-template-columns:repeat(2,1fr)}.lp-top3{grid-template-columns:1fr}.lp h1{font-size:36px}}
`;

let mem = 128432, online = 3184, trades24 = 48219, tick = { t: null }, last = {};

export function renderLanding(main, opts = {}) {
  if (!document.getElementById("lp-css")) { const s = document.createElement("style"); s.id = "lp-css"; s.textContent = CSS; document.head.appendChild(s); }
  const aside = document.querySelector("aside"); if (aside) aside.style.display = "none";
  initProtocol();
  main.innerHTML = view("login");
  wire(opts);
  clearInterval(tick.t);
  tick.t = setInterval(step, 1200);
  step();
}
export function stopLanding() { clearInterval(tick.t); tick.t = null; }

function stats() {
  const h = P.house;
  return [
    { k: "mem", ic: "👥", l: "Members", v: mem.toLocaleString("en-US") },
    { k: "on", ic: "🟢", l: "Online", v: online.toLocaleString("en-US") },
    { k: "vol", ic: "📊", l: "24h Volume", v: compact(h.volume * 0.0012) },
    { k: "tvl", ic: "💰", l: "TVL", v: compact(h.tvl) },
    { k: "oi", ic: "📈", l: "Open Position", v: compact(P.pos.openInterest) },
    { k: "paid", ic: "💎", l: "Profit Paid", v: compact(P.leaderboard.reduce((a, e) => a + Math.max(0, e.pnl), 0)) },
  ];
}
function ratesHTML() {
  const seq = SYMBOLS.map((x) => { const t = last[x.sym] || {}; const up = (t.chg || 0) >= 0; return `<span class="lp-rt"><span class="s">${x.s}</span> <span class="p" data-lrp="${x.s}">${t.price ? "$" + fmt(t.price) : "—"}</span> <span class="${up ? "up" : "down"}" data-lrc="${x.s}">${t.chg != null ? pct(t.chg) : ""}</span></span>`; }).join("");
  return seq + seq;
}
function view() {
  const top = P.leaderboard.slice(0, 3), med = ["🥇", "🥈", "🥉"];
  return `<div class="lp" id="lp">
    <div class="lp-top"><div class="lp-brand"><span class="lp-logo-svg"><svg width="154" height="24" viewBox="0 0 154 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_358_145)"><path d="M12.176 23.3684C10.2693 23.394 8.36422 23.246 6.4843 22.9263C5.46617 22.7501 4.47323 22.4507 3.52737 22.0345L3.5949 22.1703L2.66523 21.5766C0.708668 20.3261 0.158302 18.2646 1.03623 15.4503L1.10313 15.2356H8.9117L8.76274 15.6455C8.68371 15.8101 8.64769 15.9921 8.65806 16.1745C8.66844 16.3569 8.72486 16.5336 8.82206 16.6882C9.17361 17.1935 10.3059 17.7891 13.7008 17.7891C14.8828 17.8088 16.0645 17.7366 17.2353 17.5731C17.8392 17.5105 18.4254 17.3324 18.9621 17.0482C19.2547 16.853 19.4751 16.5669 19.5894 16.2341C19.7693 15.7408 19.6298 15.6025 19.5844 15.5602C19.2108 15.3068 18.7758 15.1589 18.3253 15.132C17.6108 15.0057 16.375 14.8844 14.652 14.7695L13.6529 14.7063C11.9446 14.6273 10.2466 14.398 8.57845 14.0211C7.42369 13.785 6.32738 13.3215 5.35328 12.6575C3.80066 11.4859 3.45227 9.68906 4.31631 7.3118C5.11029 5.13032 6.81438 3.44779 9.38126 2.31095C12.3717 1.10881 15.5779 0.537106 18.7993 0.631583C20.5948 0.606369 22.3882 0.761888 24.1526 1.09579C25.4419 1.32304 26.6723 1.80714 27.771 2.51937C29.6278 3.82358 30.1845 5.74043 29.4259 8.21053L29.3628 8.42653H21.5485L21.6994 8.01601C21.9272 7.39516 21.7341 6.99474 21.0739 6.71685C19.7299 6.31424 18.3261 6.14882 16.9254 6.228C15.6887 6.17441 14.4507 6.29668 13.2483 6.59116C12.9902 6.64586 12.7476 6.75732 12.5379 6.91746C12.3282 7.0776 12.1567 7.28241 12.0359 7.51706C11.9096 7.86064 11.9349 8.13284 12.4613 8.34569C12.8589 8.50611 13.9022 8.73664 16.6167 8.92295L17.7938 9.00885C19.0833 9.12 19.9587 9.19832 20.634 9.27221C21.4008 9.35369 22.2119 9.47811 23.0475 9.64295C23.756 9.7713 24.4518 9.9615 25.1271 10.2114C25.6621 10.4285 26.1674 10.7125 26.6312 11.0564C27.0864 11.3757 27.4402 11.8192 27.6505 12.3341C27.8412 12.8705 27.9209 13.4402 27.8846 14.0084C27.8363 14.7425 27.678 15.465 27.415 16.152C26.9839 17.4029 26.2923 18.5479 25.386 19.5113C24.4797 20.4748 23.3793 21.2347 22.1576 21.7408C20.7502 22.3264 19.2765 22.737 17.7692 22.9636C15.9185 23.2468 14.0482 23.3821 12.176 23.3684ZM2.78009 20.9141L2.98711 21.0461C4.76694 22.183 7.8583 22.7577 12.1754 22.7577C16.2191 22.7577 19.4967 22.2272 21.9127 21.1787C23.0533 20.6987 24.0831 19.9893 24.9384 19.0945C25.7804 18.1846 26.427 17.1116 26.8382 15.9417C27.0794 15.3143 27.2256 14.6544 27.2718 13.9838C27.3043 13.499 27.2384 13.0126 27.078 12.5539C26.9088 12.1476 26.6266 11.7985 26.2651 11.5478C25.8434 11.2348 25.3838 10.9763 24.8974 10.7785C24.2573 10.5417 23.5978 10.3613 22.9263 10.2392C22.109 10.0781 21.315 9.95621 20.5665 9.87664C19.8974 9.8059 19.0258 9.72506 17.7414 9.61453L16.5719 9.52927C15.1051 9.50205 13.6473 9.29374 12.2315 8.90906C12.0671 8.8674 11.9139 8.79015 11.7826 8.68275C11.6513 8.57536 11.5452 8.44044 11.4717 8.28751C11.3982 8.13458 11.3591 7.96737 11.3573 7.79769C11.3554 7.62801 11.3908 7.45998 11.4609 7.30548C11.6102 6.98236 11.8312 6.69763 12.1072 6.47302C12.3831 6.24842 12.7067 6.08987 13.0533 6.00948C14.318 5.6928 15.6216 5.55986 16.9241 5.61474C19.0176 5.61474 20.4522 5.79032 21.31 6.15158C21.661 6.24946 21.964 6.47266 22.1617 6.77897C22.3594 7.08528 22.4381 7.45346 22.3829 7.8139H28.9077C29.4947 5.7019 29.0081 4.13116 27.4226 3.01769C25.7438 1.83853 22.843 1.24042 18.8011 1.24042C15.6657 1.14752 12.5448 1.70222 9.63309 2.8699C8.52011 3.34171 7.50116 4.01028 6.62505 4.84358C5.85483 5.59508 5.26336 6.51029 4.89444 7.52148C4.12191 9.64421 4.39394 11.1651 5.72566 12.1699C7.1104 13.2152 9.79025 13.8606 13.6907 14.088L14.6924 14.1512C16.4388 14.268 17.696 14.3924 18.4319 14.5219C19.0059 14.5662 19.5554 14.7732 20.0161 15.1187C20.1723 15.2968 20.2705 15.5184 20.2975 15.7538C20.3246 15.9892 20.2793 16.2273 20.1676 16.4362C20.0101 16.8916 19.7077 17.2828 19.3067 17.5497C18.6984 17.8877 18.0282 18.0993 17.3362 18.1718C16.1327 18.3409 14.9179 18.4158 13.7027 18.396C10.7243 18.396 8.96534 17.9539 8.3241 17.035C8.20447 16.8633 8.12106 16.669 8.07895 16.464C8.03685 16.259 8.03694 16.0475 8.07921 15.8425H1.55567C0.87845 18.1756 1.28175 19.8385 2.78073 20.9141H2.78009ZM91.5901 22.7943H72.5535L75.6499 14.2838L91.5901 22.7943ZM73.4257 22.1836H89.1495L75.985 15.1535L73.4257 22.1836ZM63.8644 22.7943H53.4978L53.2044 7.8739L42.0526 22.7943H31.6519L32.355 1.13116H39.9162L39.2901 16.3611L50.7978 1.10274L60.4828 6.18695L60.7611 16.3787L65.8052 9.02906L71.3675 11.9943L63.8644 22.7943ZM54.0968 22.1836H63.5457L70.4745 12.2122L66.0003 9.82674L60.2032 18.2741L59.8832 6.56022L51.0219 1.83032L38.6009 18.2912L39.2812 1.74379H32.9477L32.2844 22.1836H41.7516L53.785 6.08401L54.0968 22.1836Z" fill="currentColor"/><path d="M119.728 22.8063H97.5657L105.437 1.13242H127.598L125.49 6.936H110.87L110.016 9.28737H124.051L122.114 14.6204H108.079L107.215 17.0034H121.835L119.728 22.8063ZM130.079 22.7943H122.545L130.43 1.13242H147.113C148.285 1.1031 149.453 1.28736 150.559 1.67621C151.457 1.99879 152.236 2.58473 152.796 3.35748C153.333 4.14471 153.621 5.07617 153.62 6.02968C153.609 7.20386 153.384 8.36619 152.955 9.45916C152.124 11.8696 150.556 13.9574 148.474 15.4269C146.381 16.8662 143.892 17.6168 141.352 17.5743H131.981L130.079 22.7943ZM134.307 11.1878H141.814C142.586 11.2282 143.357 11.0856 144.064 10.7716C144.62 10.4229 145.027 9.88109 145.209 9.2501C145.38 8.77958 145.524 8.16568 145.229 7.91368C145.034 7.74632 144.552 7.54737 143.359 7.54737H135.63L134.307 11.1878ZM94.7237 22.7956H90.3012L75.4465 14.8629L80.4389 1.13242H102.601L100.493 6.92968H85.8668L85.0135 9.28168H99.0483L97.1107 14.6147H83.0758L82.2061 16.9977H96.8317L94.7237 22.7956ZM71.0234 12.5008L65.4643 9.53684L71.2374 1.13242H78.9298L71.0234 12.5008ZM60.5092 6.89052L50.4802 1.54232L50.8078 1.07684L60.3526 1.13242L60.5092 6.89052Z" fill="currentColor"/></g><defs><clipPath id="clip0_358_145"><rect width="154" height="24" fill="white"/></clipPath></defs></svg></span><div class="lp-perp-w">Perp<small>on-chain perps · paper</small></div></div>
      <a class="lp-ghost" id="lp-tolog">Log In</a></div>
    <div style="max-width:1200px;margin:10px auto 0;padding:0 22px"><div class="lp-rates"><div class="t" id="lp-rates">${ratesHTML()}</div></div></div>
    <div class="lp-hero">
      <div class="lp-left">
        <div class="lp-badge"><span id="lp-badge">${mem.toLocaleString("en-US")} members · ${online.toLocaleString("en-US")} online</span></div>
        <h1>On-chain perps.<br><span class="grad">1000× kaldıraç.</span> Sıfır risk.</h1>
        <p class="lp-sub">Paper trading with real Binance prices. Open trades, read the order book, climb the ranks, pass the Challenge and <b>funded</b> — without spending any real money.</p>
        <div class="row lp-cta" style="display:flex"><button class="lp-btn primary" id="lp-start">Get Started →</button><button class="lp-btn" id="lp-login2">Log In</button></div>
        <div class="lp-chips">${["⚡ 1000× leverage", "📖 Live order book", "🎯 TP/SL · Trailing", "🏆 Leaderboard", "🏦 Challenge → Funded", "🪙 Paper reward token"].map((c) => `<span class="lp-chip">${c}</span>`).join("")}</div>
      </div>
      <div class="lp-card" id="lp-card"></div>
    </div>
    <div class="lp-stats" id="lp-stats">${stats().map((s) => `<div class="lp-stat"><div class="ic">${s.ic}</div><div class="l">${s.l}</div><div class="v" data-ls="${s.k}">${s.v}</div></div>`).join("")}</div>
    <div class="lp-sec-t">🏆 Günün en iyi trader'ları</div>
    <div class="lp-top3">${top.map((e, i) => `<div class="lp-pod r${i + 1}"><div class="top"><span class="medal">${med[i]}</span><div><div class="who" style="font-family:${String(e.user).startsWith("0x") ? "monospace;font-size:13px" : "inherit"}">${String(e.user).startsWith("0x") ? shortAddr(e.user) : esc(e.user)}</div><div class="muted" style="color:var(--mut);font-size:12px"><b>${e.asset}</b> <span class="lev">${e.lev}×</span> <span class="badge ${e.side}">${e.side}</span></div></div></div><div class="pnl">${signMoney(e.pnl, 0)}</div><div class="row" style="display:flex;justify-content:space-between;margin-top:6px;font-size:12px"><span class="up">${pct(e.pnlPct, 1)}</span><span style="color:var(--mut)">${compact(e.notional)}</span></div></div>`).join("")}</div>
    <div class="lp-sec-t">⚙️ Nasıl çalışır?</div>
    <div class="lp-steps">${[
      ["1", "Create account", "Sign up free in seconds — connect with email or a wallet (MetaMask/Trust)."],
      ["2", "Add collateral", "Deposit your USDC/USDT demo balance. Fully virtual — you never spend real money."],
      ["3", "Open trade", "Open positions with up to 1000× leverage — Long/Short, Limit/Stop/TWAP, TP/SL and trailing."],
      ["4", "Climb & Get Funded", "Climb the Leaderboard, pass the Challenge, earn 80% profit share on a funded account."],
    ].map((s) => `<div class="lp-step"><div class="n">${s[0]}</div><h4>${s[1]}</h4><p>${s[2]}</p></div>`).join("")}</div>
    <div class="lp-sec-t">✨ Özellikler</div>
    <div class="lp-feats">${[
      ["📊", "Live Binance Futures", "Real prices, live order book, trade flow and candle/tick charts."],
      ["⚡", "1000× Leverage", "Isolated & cross margin, bust price, account-health meter and risk warnings."],
      ["🎯", "Advanced Orders", "Market · Limit · Stop · Scale · TWAP + TP/SL, drag-from-chart trailing & price alerts."],
      ["🏆", "Leaderboard & Copy", "See the best traders, copy with one click and auto-mirror their trades."],
      ["🏦", "Challenge → Funded", "Hit the profit target, pass daily/total drawdown rules; earn a funded account."],
      ["🪙", "Paper Rewards", "Earn XP & points by trading, complete tasks, stake Paper tokens and earn USDC rewards."],
    ].map((f) => `<div class="lp-feat"><div class="fi">${f[0]}</div><h4>${f[1]}</h4><p>${f[2]}</p></div>`).join("")}</div>
    <div class="lp-foot">Sweep Perp · Paper trading — no real funds are used.</div>
  </div>`;
}
function loginCard(mode = "login") {
  return `<h3>${mode === "login" ? "Welcome back" : "Create account"}</h3><div class="sub">${mode === "login" ? "Log in to access the dashboard." : "Start in a few seconds — free."}</div>
    <div class="lp-err" id="lp-err"></div>
    ${mode === "register" ? `<div class="lp-field"><label>Full Name</label><input id="lp-name" placeholder="Your name"></div>` : ""}
    <div class="lp-field"><label>E-posta</label><input id="lp-email" value="${mode === "login" ? "admin@local" : ""}" placeholder="E-posta"></div>
    <div class="lp-field"><label>Password</label><input id="lp-pass" type="password" value="${mode === "login" ? "admin123" : ""}" placeholder="Password"></div>
    <button class="lp-btn primary" id="lp-go" style="width:100%">${mode === "login" ? "Log In" : "Create Account"}</button>
    <div class="lp-sub2">${mode === "login" ? "Don't have an account? <a id='lp-tog'>Sign up</a>" : "Already a member? <a id='lp-tog'>Log in</a>"}</div>
    ${mode === "login" ? `<div class="lp-hint">Demo: admin@local / admin123</div>` : ""}`;
}
function wire(opts, mode = "login") {
  const card = document.getElementById("lp-card"); if (card) card.innerHTML = loginCard(mode);
  const scrollCard = () => document.getElementById("lp-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
  document.getElementById("lp-tolog").onclick = scrollCard;
  const l2 = document.getElementById("lp-login2"); if (l2) l2.onclick = scrollCard;
  const st = document.getElementById("lp-start"); if (st) st.onclick = () => { wire(opts, "register"); scrollCard(); };
  const tog = document.getElementById("lp-tog"); if (tog) tog.onclick = () => wire(opts, mode === "login" ? "register" : "login");
  const go = document.getElementById("lp-go"); if (go) go.onclick = async () => {
    const email = document.getElementById("lp-email").value, pass = document.getElementById("lp-pass").value;
    const name = document.getElementById("lp-name")?.value;
    const err = document.getElementById("lp-err"); err.textContent = "";
    try { const r = await opts.doLogin(email, pass, mode, name); if (r && r.error) err.textContent = r.error; }
    catch { err.textContent = "connection error"; }
  };
}
async function step() {
  if (!document.getElementById("lp")) return stopLanding();
  tickProtocol();
  mem += Math.floor(Math.random() * 3); trades24 += Math.floor(Math.random() * 6); online += Math.floor((Math.random() - 0.5) * 14);
  try { const t = await fetchTickers(SYMBOLS.map((x) => x.sym)); if (Object.keys(t).length) last = t; else throw 0; } catch { last = simTickers(SYMBOLS.map((x) => x.sym), last); }
  const set = (sel, v) => document.querySelectorAll(sel).forEach((el) => { if (el.textContent !== v) el.textContent = v; });
  for (const s of stats()) set(`[data-ls="${s.k}"]`, s.v);
  const b = document.getElementById("lp-badge"); if (b) b.textContent = `${mem.toLocaleString("en-US")} members · ${online.toLocaleString("en-US")} online`;
  for (const x of SYMBOLS) { const t = last[x.sym] || {}; set(`[data-lrp="${x.s}"]`, t.price ? "$" + fmt(t.price) : "—"); document.querySelectorAll(`[data-lrc="${x.s}"]`).forEach((el) => { el.textContent = t.chg != null ? pct(t.chg) : ""; el.className = (t.chg || 0) >= 0 ? "up" : "down"; }); }
}
