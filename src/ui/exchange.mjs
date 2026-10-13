// Sweep Perp — on-chain perps protocol SPA (dark theme, original design).
// Structure mirrors a Hyperliquid-style house/perps/reward-token system.
// Real Binance prices (market.mjs) + synthetic live protocol data (protocol.mjs).

import { SYMBOLS, META, INTERVAL, fetchTickers, fetchKlines, fetchPrice, fetchDepth, fetchTrades, simTickers, simKlines, simPrice } from "/market.mjs";
import { getAccount, balanceOf, adjustUSDC, deposit, withdraw, connectWallet, disconnectWallet, isSimulated, STABLES } from "/wallet.mjs";
import { P, PRICES, updatePrices, initProtocol, tickProtocol } from "/protocol.mjs";
import { candleChart, tickChart, areaChart, dualArea, sparkline, donut, heatmap } from "/charts.mjs";
import { fmt, money, pct, signMoney, compact, compactN, shortAddr, ago, dur, hhmmss, esc } from "/util.mjs";

// ---------------- theme ----------------
const CSS = `
:root{--bg:#f0e8d7;--bg2:#f8f2e6;--panel:#fffbf2;--panel2:#f3ebda;--line:#e6dcc5;--line2:#d9ccb0;--text:#2a2430;--mut:#756d73;--acc:#7c3aed;--acc2:#6366f1;--up:#0ea371;--down:#e23950;--warn:#bd7f0a}
.kx *{box-sizing:border-box}
.kx{background:var(--bg);color:var(--text);min-height:100vh;font:14px/1.45 "Public Sans",ui-sans-serif,system-ui,-apple-system,sans-serif}
.kx h2,.kx h3,.card h3,.kpi .val,.pg-stat .v,.ov-chart-head .px,.ov-kpi .val,.kx-brand,.ch-head,.hero-num{font-family:"Public Sans",ui-sans-serif,system-ui,sans-serif;letter-spacing:-.2px}
.kx a{color:inherit;text-decoration:none}
.kx-head{position:sticky;top:0;z-index:50;background:rgba(11,14,20,.86);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.kx-nav{display:flex;align-items:center;gap:12px;padding:0 24px;height:66px}
.kx-logo-svg{display:inline-flex;align-items:center;color:currentColor;margin-right:2px}.kx-logo-svg svg{height:19px;width:auto;display:block}.kx-brand{display:flex;align-items:center;gap:9px;font-weight:800;letter-spacing:.3px;margin-right:12px}
.kx-logo{width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,var(--acc),var(--acc2));display:grid;place-items:center;color:#06101f;font-weight:900}
.kx-brand small{color:var(--mut);font-weight:600;font-size:11px}
.kx-link{padding:10px 15px;border-radius:9px;color:var(--mut);font-weight:700;font-size:15px;cursor:pointer}
.kx-link:hover{color:var(--text);background:var(--panel)}
.kx-link.on{color:var(--text);background:var(--panel2)}
.kx-right{margin-left:auto;display:flex;align-items:center;gap:8px}
.kx-btn{border:1px solid var(--line2);background:var(--panel);color:var(--text);border-radius:9px;padding:8px 14px;font:inherit;font-weight:600;cursor:pointer;transition:.15s}
.kx-btn:hover{border-color:var(--acc)}
.kx-btn.acc{background:linear-gradient(135deg,var(--acc),#6f7cff);border-color:transparent;color:#06101f}
.kx-btn.g{background:var(--up);border-color:transparent;color:#052016}
.kx-btn.r{background:var(--down);border-color:transparent;color:#2a070c}
.kx-btn.sm{padding:5px 10px;font-size:12px}
.kx-btn.gho{background:transparent}
@keyframes kxscroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.kx-band{max-width:1600px;margin:0 auto;padding:0 18px;overflow:hidden;border-bottom:1px solid var(--line)}
.mktrack{display:flex;gap:46px;white-space:nowrap;width:max-content;padding:11px 0;font-size:12.5px;font-weight:700;letter-spacing:.3px;color:var(--text)}
.kx-rates,.kx-news{display:flex;align-items:center;gap:18px}
.kx-live{padding-right:4px}
.kx-rates{background:var(--panel2)}
.kx-band .wrap{flex:1;overflow:hidden}
.kx-rates .mktrack{animation:kxscroll 40s linear infinite}
.kx-news{background:linear-gradient(90deg,rgba(124,58,237,.12),rgba(99,102,241,.05),rgba(46,230,160,.07))}
.kx-news .mktrack{animation:kxscroll 48s linear infinite}
.kx-live{flex-shrink:0;display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:900;letter-spacing:1.5px;color:var(--down)}
.kx-live::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--down);box-shadow:0 0 0 0 rgba(226,57,80,.6);animation:lp 1.4s infinite}
.kx-rt{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.kx-rt .s{font-weight:800}.kx-rt .p{font-variant-numeric:tabular-nums;color:var(--text)}.kx-rt .c{font-variant-numeric:tabular-nums;font-weight:800}
.kx-newsb{color:var(--acc)}
.kx-newsb::before{background:var(--acc)!important;box-shadow:0 0 0 0 rgba(124,58,237,.6)!important;animation:lp 1.6s infinite!important}
.eq{display:inline-flex;align-items:flex-end;gap:2px;height:11px;vertical-align:middle;margin-left:2px}
.eq i{width:2.5px;height:3px;background:var(--up);border-radius:1px;animation:eqb .9s ease-in-out infinite}
.eq i:nth-child(2){animation-delay:.15s}.eq i:nth-child(3){animation-delay:.35s}.eq i:nth-child(4){animation-delay:.05s}
@keyframes eqb{0%,100%{height:3px}50%{height:11px}}
.kx-live .eq i{background:var(--down)}
.kx-wrap{padding:18px;max-width:1600px;margin:0 auto}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px}
.card h3,.ct{margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--mut);display:flex;align-items:center;justify-content:space-between;gap:8px}
.grid{display:grid;gap:14px}
.muted{color:var(--mut)} .up{color:var(--up)} .down{color:var(--down)} .warn{color:var(--warn)}
.num{font-variant-numeric:tabular-nums;text-align:right}
.kv{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #1a2130;font-size:13px}
.kv:last-child{border-bottom:0} .kv .k{color:var(--mut)} .kv .v{font-variant-numeric:tabular-nums;font-weight:600}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
table.tb{width:100%;border-collapse:collapse;font-size:13px}
.tb th{color:var(--mut);font-weight:600;text-align:left;padding:8px 8px;border-bottom:1px solid var(--line);font-size:11px;text-transform:uppercase;letter-spacing:.4px}
.tb td{padding:10px 8px;border-bottom:1px solid #1a2130}
.tb tr:last-child td{border-bottom:0}
.tb .num{text-align:right}
.badge{font-size:11px;padding:2px 7px;border-radius:5px;font-weight:700}
.badge.long,.badge.LONG{background:rgba(14,163,113,.16);color:var(--up)} .badge.short,.badge.SHORT{background:rgba(226,57,80,.16);color:var(--down)}
.lev{color:var(--mut);font-weight:600;font-size:12px}
.pill{background:var(--panel2);border:1px solid var(--line);color:var(--text);border-radius:8px;padding:6px 11px;cursor:pointer;font-size:12px;font-weight:600}
.pill.on{background:#16233f;border-color:var(--acc);color:#fff}
.seg{display:flex;border:1px solid var(--line);border-radius:9px;overflow:hidden}
.seg button{flex:1;background:transparent;border:0;color:var(--mut);padding:10px;font:inherit;font-weight:700;cursor:pointer}
.seg button.on.long{background:var(--up);color:#052016} .seg button.on.short{background:var(--down);color:#2a070c}
.fld{margin:10px 0}.fld label{display:block;font-size:11px;color:var(--mut);margin-bottom:5px}
.inp{display:flex;align-items:center;background:var(--bg2);border:1px solid var(--line);border-radius:9px;padding:0 12px}
.inp:focus-within{border-color:var(--acc)} .inp input{flex:1;background:0;border:0;color:var(--text);padding:11px 0;font:inherit;outline:0}
.inp .suf{color:var(--mut);font-size:12px}
input[type=range]{-webkit-appearance:none;width:100%;height:5px;border-radius:5px;background:linear-gradient(90deg,var(--up),var(--warn),var(--down));outline:0}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#fff;border:2px solid var(--acc);cursor:pointer}
.chart-empty{height:220px;display:grid;place-items:center;color:var(--mut);font-size:13px}
.pdot{animation:pd 1.3s ease-out infinite}@keyframes pd{0%{r:3;opacity:.9}100%{r:11;opacity:0}}
.live{display:inline-flex;align-items:center;gap:6px;color:var(--mut);font-size:11px;font-weight:700}
.live::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--up);box-shadow:0 0 0 0 rgba(14,163,113,.6);animation:lp 1.6s infinite}
@keyframes lp{0%{box-shadow:0 0 0 0 rgba(14,163,113,.6)}70%{box-shadow:0 0 0 6px rgba(14,163,113,0)}}
.fu{animation:fu .7s}.fd{animation:fd .7s}
@keyframes fu{0%{color:var(--up);text-shadow:0 0 12px rgba(14,163,113,.7)}100%{}}@keyframes fd{0%{color:var(--down);text-shadow:0 0 12px rgba(226,57,80,.7)}100%{}}
.cfu{animation:cfu .7s}.cfd{animation:cfd .7s}
@keyframes cfu{0%{background:rgba(14,163,113,.22)}100%{}}@keyframes cfd{0%{background:rgba(226,57,80,.22)}100%{}}
.wl{cursor:pointer}.wl:hover{background:#151b27}.sym{display:flex;align-items:center;gap:9px}
.ic{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:800;color:#06101f}
.sym small{color:var(--mut);display:block;font-size:11px}
.blk{border:1px solid var(--line);border-radius:10px;padding:10px;background:var(--bg2)}
.blk .bar{height:6px;border-radius:4px;background:#1c2432;overflow:hidden;margin:7px 0}
.blk .bar>i{display:block;height:100%;background:linear-gradient(90deg,var(--acc2),var(--acc))}
.st{font-size:10px;font-weight:800;letter-spacing:.5px;padding:2px 6px;border-radius:4px}
.st.MINED{background:rgba(124,58,237,.18);color:var(--acc)}.st.FINALISING{background:rgba(99,102,241,.18);color:var(--acc2)}.st.PROJECTED{background:#1c2432;color:var(--mut)}
.ov-modal{position:fixed;inset:0;background:rgba(5,8,13,.7);display:grid;place-items:center;z-index:100;animation:fin .2s}
@keyframes fin{from{opacity:0}to{opacity:1}}
.ov-modal .box{background:var(--panel);border:1px solid var(--line2);border-radius:16px;width:420px;max-width:92vw;padding:20px}
.ov-modal h3{margin:0 0 16px;display:flex;justify-content:space-between;align-items:center;font-size:15px;color:var(--text);text-transform:none;letter-spacing:0}
.x{cursor:pointer;color:var(--mut);font-size:18px}
.toast{position:fixed;right:20px;bottom:20px;background:var(--panel);border:1px solid var(--line2);border-left:3px solid var(--up);border-radius:10px;padding:12px 16px;font-size:13px;box-shadow:0 10px 30px rgba(0,0,0,.5);z-index:200;animation:fin .25s}
.toast.err{border-left-color:var(--down)}
.tabs{display:flex;gap:4px;border-bottom:1px solid var(--line);margin-bottom:4px}
.tabs .tab{padding:9px 12px;color:var(--mut);font-weight:600;cursor:pointer;border-bottom:2px solid transparent;font-size:13px}
.tabs .tab.on{color:var(--text);border-bottom-color:var(--acc)}
.empty{color:var(--mut);text-align:center;padding:38px;font-size:13px}
.liqstrip{display:flex;gap:16px;overflow:hidden;margin-top:10px;padding-top:9px;border-top:1px solid var(--line);font-size:12px;font-weight:700;white-space:nowrap;mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}
.liq{display:inline-flex;align-items:center;gap:5px}
.liq .ic{border-radius:50%;display:inline-grid;place-items:center;font-size:9px;color:#06101f;font-weight:800}
.warnbox{background:rgba(240,169,59,.1);border:1px solid rgba(240,169,59,.35);color:var(--warn);border-radius:8px;padding:8px 10px;font-size:11.5px;line-height:1.45;margin:10px 0}
.warnbox.danger{background:rgba(226,57,80,.1);border-color:rgba(226,57,80,.4);color:var(--down)}
.banner{background:linear-gradient(90deg,rgba(124,58,237,.12),rgba(99,102,241,.08));border:1px solid var(--line2);border-radius:10px;padding:9px 14px;font-size:12.5px;display:flex;align-items:center;gap:10px;margin-bottom:14px}
.banner .x{margin-left:auto;cursor:pointer;color:var(--mut)}
.ob{font-size:12px;font-variant-numeric:tabular-nums}
.ob .r{position:relative;display:flex;justify-content:space-between;padding:2.5px 8px}
.ob .r span{position:relative;z-index:2}
.ob .bar{position:absolute;top:0;bottom:0;right:0;z-index:1;opacity:.13;transition:width .3s}
.ob .mid{display:flex;justify-content:space-between;align-items:center;padding:7px 8px;border-block:1px solid var(--line);margin:3px 0;font-weight:700}
.tape .r{display:flex;justify-content:space-between;font-size:12px;font-variant-numeric:tabular-nums;padding:3px 2px;border-bottom:1px solid #161c27}
.tape .r.new{animation:tslide .4s}
@keyframes tslide{from{opacity:0;transform:translateY(-6px);background:rgba(124,58,237,.14)}to{opacity:1}}
.chartwrap{position:relative}
.cross{position:absolute;inset:0;pointer-events:none;z-index:5;display:none}
.cross .hl{position:absolute;left:0;right:66px;height:1px;background:rgba(232,236,243,.28)}
.cross .vl{position:absolute;top:0;bottom:22px;width:1px;background:rgba(232,236,243,.28)}
.hbox{position:absolute;inset:0;pointer-events:none;z-index:6}
.hdl{position:absolute;right:0;transform:translateY(-50%);pointer-events:auto;cursor:ns-resize;display:flex;align-items:center;justify-content:flex-end}
.hdl .grip{min-width:70px;height:15px;border-radius:3px;display:flex;align-items:center;justify-content:center;gap:3px;font-size:9px;font-weight:800;color:#0b0e14;box-shadow:0 1px 3px rgba(0,0,0,.25)}
.hdl.tp .grip{background:var(--up)}.hdl.sl .grip{background:var(--warn)}
.hdl.ghost{opacity:.45}.hdl:hover{opacity:1;filter:brightness(1.08)}
.hdl .grip::before{content:"⠿";opacity:.7}
.cross .ptag{position:absolute;right:0;transform:translateY(-50%);background:#2b3545;color:#e8ecf3;font-size:10px;padding:1px 5px;border-radius:3px;font-variant-numeric:tabular-nums;white-space:nowrap}
.cross .ttag{position:absolute;bottom:2px;transform:translateX(-50%);background:#2b3545;color:#e8ecf3;font-size:10px;padding:1px 5px;border-radius:3px;white-space:nowrap}
.conf .kv{font-size:13px}
.bell{position:relative}
.nbadge{position:absolute;top:-5px;right:-5px;background:var(--down);color:#fff;font-size:9px;font-weight:800;min-width:15px;height:15px;border-radius:8px;display:grid;place-items:center;padding:0 3px}
.ndrop{position:absolute;top:46px;right:14px;width:340px;max-width:92vw;background:var(--panel);border:1px solid var(--line2);border-radius:14px;box-shadow:0 14px 40px rgba(0,0,0,.55);z-index:120;overflow:hidden}
.ndrop .nh{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid var(--line)}
.ndrop .nh b{font-size:13px}.ndrop .nh a{font-size:11px;color:var(--acc);cursor:pointer}
.ndrop .nl{max-height:360px;overflow:auto}
.nitem{display:flex;gap:10px;padding:11px 14px;border-bottom:1px solid #161c27;font-size:12.5px}
.nitem.unread{background:rgba(124,58,237,.06)}
.nitem .ni{font-size:15px}.nitem .nt{color:var(--mut);font-size:10px;margin-top:3px}
.nitem .nx{color:var(--up)} .nitem.warn .nx{color:var(--warn)} .nitem.err .nx{color:var(--down)}
.nempty{padding:30px;text-align:center;color:var(--mut);font-size:12px}
.chk{display:flex;align-items:flex-start;gap:8px;font-size:12px;color:var(--mut);margin:12px 0;cursor:pointer}
.chk input{margin-top:2px}
.g2{grid-template-columns:1fr 1fr}.g3{grid-template-columns:repeat(3,1fr)}.g4{grid-template-columns:repeat(4,1fr)}
.kpis{display:grid;gap:14px}
.kpi{position:relative;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px;overflow:hidden}
.kpi::after{content:"";position:absolute;inset:0 0 auto 0;height:2px;background:linear-gradient(90deg,transparent,var(--acc),transparent);opacity:.5}
.kpi .lbl{color:var(--mut);font-size:11px;text-transform:uppercase;letter-spacing:.7px}
.kpi .val{font-size:24px;font-weight:800;margin-top:7px;font-variant-numeric:tabular-nums}
@media(max-width:1200px){.g3,.g4{grid-template-columns:1fr 1fr}.tradecols{grid-template-columns:1fr!important}}
@media(max-width:760px){.g2,.g3,.g4{grid-template-columns:1fr}.kx-link{padding:8px}}
/* ---- light-theme fixups (override dark hardcoded values) ---- */
.kx-head{background:rgba(255,255,255,.82)}
.kx-mk{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.kx-mk .l{color:var(--mut)}
.kx-mk b{color:var(--acc);font-weight:800;font-variant-numeric:tabular-nums}
.kx-mk.up b{color:var(--up)}
.kv,.tb td,.tape .r,.nitem{border-color:var(--line)}
.kv{border-bottom:1px solid var(--line)}.tb td{border-bottom:1px solid var(--line)}
.card{box-shadow:0 1px 2px rgba(20,18,40,.04)}
.wl:hover{background:#f3efe6}.wl.on{background:#efe9fe}
.pill{background:var(--panel2)}.pill.on{background:#efe9fe;border-color:var(--acc);color:#5b21b6}
.kx-btn.acc{color:#fff}.kx-btn.r{color:#fff}.kx-logo{color:#fff}
.seg button.on.short{color:#fff}
.blk{background:var(--bg2)}.blk .bar{background:#e9e3d4}
.st.MINED{background:#ede9fe;color:var(--acc)}.st.FINALISING{background:#e0e7ff;color:var(--acc2)}.st.PROJECTED{background:#efe9dd;color:var(--mut)}
.inp{background:var(--bg2)}.inp input{color:var(--text)}
.ov-modal{background:rgba(26,23,38,.4)}
.cross .ptag,.cross .ttag{background:#2b2440;color:#fff}
.cross .hl,.cross .vl{background:rgba(27,26,40,.22)}
.toast,.ndrop{box-shadow:0 10px 30px rgba(20,18,40,.14)}
input[type=range]::-webkit-slider-thumb{background:var(--acc);border-color:#fff}
/* ---- premium polish ---- */
.kx{background:radial-gradient(1100px 520px at 50% -8%, rgba(124,58,237,.08), transparent 70%), var(--bg)}
.card{border-radius:16px;box-shadow:0 1px 2px rgba(30,20,50,.04);transition:box-shadow .18s,border-color .18s,transform .18s}
.card:hover{box-shadow:0 10px 32px rgba(45,25,80,.10);border-color:var(--line2)}
.card h3{position:relative;padding-left:12px}
.card h3::before{content:"";position:absolute;left:0;top:1px;bottom:2px;width:3px;border-radius:3px;background:linear-gradient(var(--acc),var(--acc2))}
.kpi{background:linear-gradient(180deg,var(--panel),var(--panel2));box-shadow:0 2px 6px rgba(30,20,50,.05)}
.kpi::after{height:3px}
.kpi .val{font-size:28px;letter-spacing:-.4px}
.kpi .lbl{font-weight:700}
.kpi-ic{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;font-size:18px;flex-shrink:0}
.kpi-tr{font-size:11px;font-weight:700;margin-top:8px}
.kx-btn.acc{background:linear-gradient(135deg,var(--acc),var(--acc2));box-shadow:0 5px 16px rgba(124,58,237,.3);border:0;color:#fff}
.kx-btn.g{background:linear-gradient(135deg,#17c47f,var(--up));box-shadow:0 5px 16px rgba(14,163,113,.28);border:0;color:#063}
.kx-btn.r{background:linear-gradient(135deg,#ff5b73,var(--down));box-shadow:0 5px 16px rgba(226,57,80,.28);border:0;color:#fff}
.kx-btn:hover{transform:translateY(-1px)}
.tb tbody tr{transition:background .12s}.tb tbody tr:hover td{background:rgba(124,58,237,.04)}
.live{display:inline-flex;align-items:center;gap:6px;background:rgba(46,230,160,.13);color:var(--up);padding:3px 9px;border-radius:7px;font-size:10.5px;font-weight:800;letter-spacing:.6px}
.live::before{width:7px;height:7px}
.kx-logo{box-shadow:0 4px 12px rgba(124,58,237,.4)}
.kx-link.on{background:linear-gradient(180deg,transparent,rgba(124,58,237,.08));box-shadow:inset 0 -2px 0 var(--acc)}
.pill{transition:.15s}.kv{transition:background .12s}
.ov-kpi,.pg-stat{transition:box-shadow .18s}
.kx-head{background:rgba(250,248,242,.72);backdrop-filter:blur(18px) saturate(1.3);box-shadow:0 1px 0 rgba(45,25,80,.05)}
.hero-num{background:linear-gradient(120deg,var(--acc),var(--acc2) 70%);-webkit-background-clip:text;background-clip:text;color:transparent;font-family:"Public Sans",ui-sans-serif,sans-serif;font-weight:900;letter-spacing:-.5px;animation:heroPulse 3.4s ease-in-out infinite}
@keyframes heroPulse{0%,100%{filter:drop-shadow(0 1px 1px rgba(124,58,237,.08))}50%{filter:drop-shadow(0 3px 14px rgba(124,58,237,.33))}}
.pod{position:relative;overflow:hidden;background:linear-gradient(180deg,var(--panel),var(--panel2));border:1px solid var(--line2);border-radius:16px;padding:16px;box-shadow:0 2px 8px rgba(45,25,80,.05)}
.pod .top{display:flex;align-items:center;gap:10px}
.pod .medal{font-size:28px;line-height:1}
.pod .who{font-weight:800;font-size:15px}
.pod .pnl{font-size:26px;font-weight:900;font-family:"Public Sans",sans-serif;margin-top:10px;letter-spacing:-.4px}
.pod.r1{border-color:rgba(217,160,10,.45);box-shadow:0 10px 30px rgba(217,160,10,.15)}
.pod.r1::after{content:"";position:absolute;inset:0 0 auto 0;height:3px;background:linear-gradient(90deg,#f0c14b,#d98c0a)}
.pod.r2::after{content:"";position:absolute;inset:0 0 auto 0;height:3px;background:linear-gradient(90deg,#c9ccda,#9aa0b4)}
.pod.r3::after{content:"";position:absolute;inset:0 0 auto 0;height:3px;background:linear-gradient(90deg,#d8a06a,#b4784a)}
.empty{display:flex;flex-direction:column;align-items:center;gap:10px}
.empty::before{content:"◇";font-size:26px;color:var(--acc);opacity:.5}
.tr-order,#tr-order,.ov-trade{backdrop-filter:blur(4px)}
.card h3 .live{font-size:10px}
/* ---- mobile responsive ---- */
@media(max-width:900px){
  .kx-wrap{padding:10px}
  .kx-nav{flex-wrap:wrap;height:auto;padding:8px 10px;gap:6px}
  .kx-logo-svg{display:inline-flex;align-items:center;color:currentColor;margin-right:2px}.kx-logo-svg svg{height:19px;width:auto;display:block}.kx-brand{margin-right:4px;font-size:13px}.kx-brand small{display:none}.kx-logo{width:22px;height:22px}
  #kxfeed{font-size:9px}
  #kxnav{order:5;width:100%;overflow-x:auto;flex-wrap:nowrap!important;margin-top:4px;padding-bottom:2px}
  #kxnav .kx-link{white-space:nowrap;padding:7px 10px}
  .kx-right{gap:3px;margin-left:auto}.kx-right .kx-link{padding:6px 7px}
  .kx-band{display:none}
  .kx-wrap .grid[style*="grid-template"]{grid-template-columns:1fr!important}
  .g2,.g3,.g4{grid-template-columns:1fr!important}
  .kpis.g4{grid-template-columns:1fr 1fr!important}
  .tradecols{grid-template-columns:1fr!important}
  .card{overflow-x:auto}.tb{white-space:nowrap}
  .ndrop{right:6px;width:92vw}
  h2{font-size:19px}.ov-chart-head .px,.kx-chart-head .px{font-size:20px}
  .ov-modal .box{padding:16px}
}
@media(max-width:480px){
  .kpis.g4{grid-template-columns:1fr!important}
  #tr-head{gap:10px!important}
  .kx-right .kx-link[data-modal]{font-size:0;padding:6px}
  .kx-right .kx-link[data-modal]::before{font-size:13px}
  .kx-right [data-modal="deposit"]::before{content:"＋"}
  .kx-right [data-modal="withdraw"]::before{content:"－"}
}
`;

// ---------------- app state ----------------
const state = { route: "overview", sym: "BTC", tf: "Tick", side: "LONG", lev: 10, margin: 1, lbMode: "positions", lbRange: "24h", tradeTab: "Positions" };
let live = { tickers: {}, prevTickers: {}, candles: [], loop: null, onTick: null };
const PKEY = "sweep_perps_v1", HKEY = "sweep_hist_v1", NKEY = "sweep_notifs_v1", AKEY = "sweep_alarms_v1";
let perps = loadLS(PKEY, []);
let history = loadLS(HKEY, []);        // closed trades
let notifs = loadLS(NKEY, []);         // notification center
let alarms = loadLS(AKEY, []);         // price alarms
const OKEY = "sweep_orders_v1", TKEY = "sweep_twaps_v1";
let orders = loadLS(OKEY, []);         // pending limit/stop orders
let twaps = loadLS(TKEY, []);          // active TWAP jobs
const RKEY = "sweep_rewards_v1", FKEY = "sweep_follows_v1", CKEY = "sweep_challenge_v1";
let rewards = loadLS(RKEY, { claimed: [], bonusXP: 0, streak: 0, lastDaily: 0, flags: {} });
let follows = loadLS(FKEY, []);        // copy-trading subscriptions
let challenge = loadLS(CKEY, null);    // active prop-firm challenge
function rflag(k) { if (!rewards.flags[k]) { rewards.flags[k] = true; saveLS(RKEY, rewards); } }

// open a perp position (margin already reserved by the caller)
function openPosition(sym, side, margin, lev, entry, tp, sl, trail) {
  perps.unshift({ id: Date.now() + Math.floor(Math.random() * 1000), sym, side, margin, lev, entry, tp: tp || null, sl: sl || null, trail: trail || null, ts: Date.now() });
  saveLS(PKEY, perps);
}
// fill/trigger pending orders + advance TWAP jobs (called each tick)
function checkOrders() {
  for (const o of [...orders]) {
    const mark = priceOf(o.sym); if (!mark) continue;
    const long = o.side === "LONG";
    let fill = false;
    if (o.type === "limit") fill = long ? mark <= o.price : mark >= o.price;
    else if (o.type === "stop") fill = long ? mark >= o.price : mark <= o.price;
    if (fill) {
      const entry = o.type === "limit" ? o.price : mark;
      openPosition(o.sym, o.side, o.margin, o.lev, entry, o.tp, o.sl, o.trail);
      orders = orders.filter((x) => x.id !== o.id); saveLS(OKEY, orders);
      notify(`${o.type === "limit" ? "Limit" : "Stop"} order filled · ${o.side} ${o.sym} @ ${money(entry)}`, "trade");
      refreshTrade();
    }
  }
  for (const t of [...twaps]) {
    if (Date.now() < t.nextTs) continue;
    const mark = priceOf(t.sym) || t.entry;
    openPosition(t.sym, t.side, t.chunkMargin, t.lev, mark, null, null, null);
    t.done++; t.nextTs = Date.now() + t.interval;
    if (t.done >= t.chunks) { twaps = twaps.filter((x) => x.id !== t.id); notify(`TWAP completed · ${t.side} ${t.sym} · ${t.chunks} chunks`, "ok"); }
    saveLS(TKEY, twaps);
    refreshTrade();
  }
}
function cancelOrder(id) {
  const o = orders.find((x) => x.id == id); if (o) { adjustUSDC(o.margin); orders = orders.filter((x) => x.id != id); saveLS(OKEY, orders); notify(`Order cancelled · ${o.side} ${o.sym}`, "warn", true); refreshTrade(); }
  const t = twaps.find((x) => x.id == id); if (t) { adjustUSDC(t.chunkMargin * (t.chunks - t.done)); twaps = twaps.filter((x) => x.id != id); saveLS(TKEY, twaps); notify("TWAP durduruldu", "warn", true); refreshTrade(); }
}
function refreshTrade() { if (state.route === "trade") { renderOrder(); renderTradeBody(); put("tr-svg", chartSvg()); } renderRight(); }

function checkAlarms() {
  for (const a of [...alarms]) {
    const p = priceOf(a.sym); if (!p) continue;
    if ((a.dir === "above" && p >= a.price) || (a.dir === "below" && p <= a.price)) {
      notify(`🔔 Price alert · ${a.sym} ${a.dir === "above" ? "≥" : "≤"} ${money(a.price)} (live ${money(p)})`, "info");
      alarms = alarms.filter((x) => x.id !== a.id); saveLS(AKEY, alarms);
      if (state.route === "trade" && a.sym === state.sym) put("tr-svg", chartSvg());
    }
  }
}
function openAlarmModal(sym) {
  const el = document.createElement("div"); el.className = "ov-modal";
  const draw = () => {
    const px = priceOf(sym) || 1, mine = alarms.filter((a) => a.sym === sym);
    el.innerHTML = `<div class="box"><h3>${sym} · Price Alert<span class="x">✕</span></h3>
      <div class="kv"><span class="k">Live price</span><span class="v">${money(px)}</span></div>
      <div class="fld"><label>Target price</label><div class="inp"><input id="al-px" value="${fmt(px, px > 100 ? 1 : 3)}"><span class="suf">USDC</span></div></div>
      <button class="kx-btn acc" id="al-add" style="width:100%">Alarm Ekle</button>
      <div style="margin-top:14px">${mine.length ? mine.map((a) => `<div class="row" style="justify-content:space-between;padding:8px 2px;border-bottom:1px solid var(--line)"><span>${a.dir === "above" ? "▲ ≥" : "▼ ≤"} <b>${money(a.price)}</b></span><button class="kx-btn sm r" data-del="${a.id}">Sil</button></div>`).join("") : `<div class="muted" style="font-size:12px;text-align:center;padding:10px">No alerts for this pair.</div>`}</div></div>`;
    el.querySelector(".x").onclick = close;
    el.querySelector("#al-add").onclick = () => {
      const price = +el.querySelector("#al-px").value.replace(/,/g, "") || 0; if (price <= 0) return toast("Enter a valid price", true);
      alarms.unshift({ id: Date.now(), sym, price, dir: price >= (priceOf(sym) || 0) ? "above" : "below" }); saveLS(AKEY, alarms); rflag("alarm");
      toast(`${sym} alert set: ${money(price)}`); if (state.route === "trade" && sym === state.sym) put("tr-svg", chartSvg()); draw();
    };
    el.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => { alarms = alarms.filter((a) => a.id != b.dataset.del); saveLS(AKEY, alarms); if (state.route === "trade") put("tr-svg", chartSvg()); draw(); });
  };
  const close = () => el.remove();
  document.body.appendChild(el); draw(); el.onclick = (e) => { if (e.target === el) close(); };
}

// ----- funding rate (per 8h, synthetic) -----
let fundingLastBoundary = 0;
let fseed = 991; const frn = () => (fseed = (fseed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
function initFunding() {
  if (live.funding) return;
  live.funding = {}; for (const x of SYMBOLS) live.funding[x.s] = (frn() - 0.5) * 0.0004;  // ±0.02%
  fundingLastBoundary = fundingBoundary();
}
function driftFunding() { for (const s in live.funding) live.funding[s] = Math.max(-0.0009, Math.min(0.0009, live.funding[s] + (frn() - 0.5) * 0.00002)); }
const FUND_CYCLE = 8 * 3600000;
function fundingBoundary() { return Math.floor(Date.now() / FUND_CYCLE) * FUND_CYCLE; }
function nextFundingMs() { return fundingBoundary() + FUND_CYCLE - Date.now(); }
function fundingCountdown() { const s = Math.max(0, Math.floor(nextFundingMs() / 1000)); const p = (n) => String(n).padStart(2, "0"); return `${p(Math.floor(s / 3600))}:${p(Math.floor(s % 3600 / 60))}:${p(s % 60)}`; }
function applyFunding() {
  // longs pay shorts when rate > 0; adjust collateral on open positions
  let net = 0, n = 0;
  for (const p of perps) { const rate = live.funding[p.sym] || 0, notional = p.margin * p.lev; const delta = -(p.side === "LONG" ? 1 : -1) * notional * rate; net += delta; n++; }
  if (n) { adjustUSDC(net); notify(`Funding applied · ${n} positions · net ${signMoney(net)}`, net >= 0 ? "ok" : "warn"); }
}
function loadLS(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }
function saveLS(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

const EQ = '<span class="eq"><i></i><i></i><i></i><i></i></span>';
const COLOR = Object.fromEntries(SYMBOLS.map((x) => [x.s, x.c]));
const priceOf = (s) => live.tickers[META2(s)]?.price ?? (s === "BTC" ? PRICES.BTC : s === "ETH" ? PRICES.ETH : 0);
function META2(s) { const m = SYMBOLS.find((x) => x.s === s); return m ? m.sym : s + "USDT"; }

// ---------------- mount ----------------
let onLogout = null;
export function mountExchange(root, opts = {}) {
  onLogout = opts.onLogout || null;
  if (!document.getElementById("kx-css")) { const st = document.createElement("style"); st.id = "kx-css"; st.textContent = CSS; document.head.appendChild(st); }
  initProtocol(); initFunding();
  root.innerHTML = `<div class="kx"><div class="kx-head">
    <div class="kx-nav">
      <a class="kx-brand" data-go="overview"><span class="kx-logo-svg"><svg width="154" height="24" viewBox="0 0 154 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_358_145)"><path d="M12.176 23.3684C10.2693 23.394 8.36422 23.246 6.4843 22.9263C5.46617 22.7501 4.47323 22.4507 3.52737 22.0345L3.5949 22.1703L2.66523 21.5766C0.708668 20.3261 0.158302 18.2646 1.03623 15.4503L1.10313 15.2356H8.9117L8.76274 15.6455C8.68371 15.8101 8.64769 15.9921 8.65806 16.1745C8.66844 16.3569 8.72486 16.5336 8.82206 16.6882C9.17361 17.1935 10.3059 17.7891 13.7008 17.7891C14.8828 17.8088 16.0645 17.7366 17.2353 17.5731C17.8392 17.5105 18.4254 17.3324 18.9621 17.0482C19.2547 16.853 19.4751 16.5669 19.5894 16.2341C19.7693 15.7408 19.6298 15.6025 19.5844 15.5602C19.2108 15.3068 18.7758 15.1589 18.3253 15.132C17.6108 15.0057 16.375 14.8844 14.652 14.7695L13.6529 14.7063C11.9446 14.6273 10.2466 14.398 8.57845 14.0211C7.42369 13.785 6.32738 13.3215 5.35328 12.6575C3.80066 11.4859 3.45227 9.68906 4.31631 7.3118C5.11029 5.13032 6.81438 3.44779 9.38126 2.31095C12.3717 1.10881 15.5779 0.537106 18.7993 0.631583C20.5948 0.606369 22.3882 0.761888 24.1526 1.09579C25.4419 1.32304 26.6723 1.80714 27.771 2.51937C29.6278 3.82358 30.1845 5.74043 29.4259 8.21053L29.3628 8.42653H21.5485L21.6994 8.01601C21.9272 7.39516 21.7341 6.99474 21.0739 6.71685C19.7299 6.31424 18.3261 6.14882 16.9254 6.228C15.6887 6.17441 14.4507 6.29668 13.2483 6.59116C12.9902 6.64586 12.7476 6.75732 12.5379 6.91746C12.3282 7.0776 12.1567 7.28241 12.0359 7.51706C11.9096 7.86064 11.9349 8.13284 12.4613 8.34569C12.8589 8.50611 13.9022 8.73664 16.6167 8.92295L17.7938 9.00885C19.0833 9.12 19.9587 9.19832 20.634 9.27221C21.4008 9.35369 22.2119 9.47811 23.0475 9.64295C23.756 9.7713 24.4518 9.9615 25.1271 10.2114C25.6621 10.4285 26.1674 10.7125 26.6312 11.0564C27.0864 11.3757 27.4402 11.8192 27.6505 12.3341C27.8412 12.8705 27.9209 13.4402 27.8846 14.0084C27.8363 14.7425 27.678 15.465 27.415 16.152C26.9839 17.4029 26.2923 18.5479 25.386 19.5113C24.4797 20.4748 23.3793 21.2347 22.1576 21.7408C20.7502 22.3264 19.2765 22.737 17.7692 22.9636C15.9185 23.2468 14.0482 23.3821 12.176 23.3684ZM2.78009 20.9141L2.98711 21.0461C4.76694 22.183 7.8583 22.7577 12.1754 22.7577C16.2191 22.7577 19.4967 22.2272 21.9127 21.1787C23.0533 20.6987 24.0831 19.9893 24.9384 19.0945C25.7804 18.1846 26.427 17.1116 26.8382 15.9417C27.0794 15.3143 27.2256 14.6544 27.2718 13.9838C27.3043 13.499 27.2384 13.0126 27.078 12.5539C26.9088 12.1476 26.6266 11.7985 26.2651 11.5478C25.8434 11.2348 25.3838 10.9763 24.8974 10.7785C24.2573 10.5417 23.5978 10.3613 22.9263 10.2392C22.109 10.0781 21.315 9.95621 20.5665 9.87664C19.8974 9.8059 19.0258 9.72506 17.7414 9.61453L16.5719 9.52927C15.1051 9.50205 13.6473 9.29374 12.2315 8.90906C12.0671 8.8674 11.9139 8.79015 11.7826 8.68275C11.6513 8.57536 11.5452 8.44044 11.4717 8.28751C11.3982 8.13458 11.3591 7.96737 11.3573 7.79769C11.3554 7.62801 11.3908 7.45998 11.4609 7.30548C11.6102 6.98236 11.8312 6.69763 12.1072 6.47302C12.3831 6.24842 12.7067 6.08987 13.0533 6.00948C14.318 5.6928 15.6216 5.55986 16.9241 5.61474C19.0176 5.61474 20.4522 5.79032 21.31 6.15158C21.661 6.24946 21.964 6.47266 22.1617 6.77897C22.3594 7.08528 22.4381 7.45346 22.3829 7.8139H28.9077C29.4947 5.7019 29.0081 4.13116 27.4226 3.01769C25.7438 1.83853 22.843 1.24042 18.8011 1.24042C15.6657 1.14752 12.5448 1.70222 9.63309 2.8699C8.52011 3.34171 7.50116 4.01028 6.62505 4.84358C5.85483 5.59508 5.26336 6.51029 4.89444 7.52148C4.12191 9.64421 4.39394 11.1651 5.72566 12.1699C7.1104 13.2152 9.79025 13.8606 13.6907 14.088L14.6924 14.1512C16.4388 14.268 17.696 14.3924 18.4319 14.5219C19.0059 14.5662 19.5554 14.7732 20.0161 15.1187C20.1723 15.2968 20.2705 15.5184 20.2975 15.7538C20.3246 15.9892 20.2793 16.2273 20.1676 16.4362C20.0101 16.8916 19.7077 17.2828 19.3067 17.5497C18.6984 17.8877 18.0282 18.0993 17.3362 18.1718C16.1327 18.3409 14.9179 18.4158 13.7027 18.396C10.7243 18.396 8.96534 17.9539 8.3241 17.035C8.20447 16.8633 8.12106 16.669 8.07895 16.464C8.03685 16.259 8.03694 16.0475 8.07921 15.8425H1.55567C0.87845 18.1756 1.28175 19.8385 2.78073 20.9141H2.78009ZM91.5901 22.7943H72.5535L75.6499 14.2838L91.5901 22.7943ZM73.4257 22.1836H89.1495L75.985 15.1535L73.4257 22.1836ZM63.8644 22.7943H53.4978L53.2044 7.8739L42.0526 22.7943H31.6519L32.355 1.13116H39.9162L39.2901 16.3611L50.7978 1.10274L60.4828 6.18695L60.7611 16.3787L65.8052 9.02906L71.3675 11.9943L63.8644 22.7943ZM54.0968 22.1836H63.5457L70.4745 12.2122L66.0003 9.82674L60.2032 18.2741L59.8832 6.56022L51.0219 1.83032L38.6009 18.2912L39.2812 1.74379H32.9477L32.2844 22.1836H41.7516L53.785 6.08401L54.0968 22.1836Z" fill="currentColor"/><path d="M119.728 22.8063H97.5657L105.437 1.13242H127.598L125.49 6.936H110.87L110.016 9.28737H124.051L122.114 14.6204H108.079L107.215 17.0034H121.835L119.728 22.8063ZM130.079 22.7943H122.545L130.43 1.13242H147.113C148.285 1.1031 149.453 1.28736 150.559 1.67621C151.457 1.99879 152.236 2.58473 152.796 3.35748C153.333 4.14471 153.621 5.07617 153.62 6.02968C153.609 7.20386 153.384 8.36619 152.955 9.45916C152.124 11.8696 150.556 13.9574 148.474 15.4269C146.381 16.8662 143.892 17.6168 141.352 17.5743H131.981L130.079 22.7943ZM134.307 11.1878H141.814C142.586 11.2282 143.357 11.0856 144.064 10.7716C144.62 10.4229 145.027 9.88109 145.209 9.2501C145.38 8.77958 145.524 8.16568 145.229 7.91368C145.034 7.74632 144.552 7.54737 143.359 7.54737H135.63L134.307 11.1878ZM94.7237 22.7956H90.3012L75.4465 14.8629L80.4389 1.13242H102.601L100.493 6.92968H85.8668L85.0135 9.28168H99.0483L97.1107 14.6147H83.0758L82.2061 16.9977H96.8317L94.7237 22.7956ZM71.0234 12.5008L65.4643 9.53684L71.2374 1.13242H78.9298L71.0234 12.5008ZM60.5092 6.89052L50.4802 1.54232L50.8078 1.07684L60.3526 1.13242L60.5092 6.89052Z" fill="currentColor"/></g><defs><clipPath id="clip0_358_145"><rect width="154" height="24" fill="white"/></clipPath></defs></svg></span><span>Perp<br><small>on-chain perps · paper</small></span></a>
      <span id="kxfeed" class="live" style="margin-right:4px">LIVE</span>
      <div class="row" id="kxnav"></div>
      <div class="kx-right" id="kxright"></div>
    </div>
    <div class="kx-band kx-rates"><span class="kx-live">LIVE ${EQ}</span><div class="wrap"><div class="mktrack" id="kxrates">${ratesTrack()}</div></div></div>
    <div class="kx-band kx-news"><span class="kx-live kx-newsb">NEWS</span><div class="wrap"><div class="mktrack" id="kxmark">${marqueeTrack()}</div></div></div>
  </div><div class="kx-wrap" id="kxmain"></div></div>`;
  renderNav(); renderRight();
  go(state.route);
  clearInterval(live.loop);
  live.loop = setInterval(tickAll, 2000);
  tickAll();
}
export function unmountExchange() { clearInterval(live.loop); clearInterval(live.priceLoop); live.loop = null; live.onTick = null; }

const NAV = [["trade", "Trade"], ["portfolio", "Portfolio"], ["house", "House"], ["paper", "Paper"], ["leaderboard", "Leaderboard"], ["rewards", "Rewards"], ["challenge", "Challenge"], ["overview", "Overview"]];
function renderNav() {
  document.getElementById("kxnav").innerHTML = NAV.map(([k, t]) => `<a class="kx-link ${state.route === k ? "on" : ""}" data-go="${k}">${t}</a>`).join("");
  document.querySelectorAll("[data-go]").forEach((a) => a.onclick = () => go(a.dataset.go));
}
function renderRight() {
  const acc = getAccount();
  const conn = acc.address;
  document.getElementById("kxright").innerHTML =
    `<a class="kx-link" data-modal="deposit">Deposit</a><a class="kx-link" data-modal="withdraw">Withdraw</a>` +
    `<button class="kx-btn sm bell" id="kxbell" title="Notifications">🔔</button>` +
    (conn ? `<button class="kx-btn sm" id="kxaddr">🟢 ${shortAddr(conn)}${isSimulated() ? " <span class='badge long' style='margin-left:4px'>SIM</span>" : ""}</button>` : `<button class="kx-btn acc" id="kxconn">Connect</button>`) +
    (onLogout ? `<a class="kx-link" id="kxout" title="Log out">⏻</a>` : "");
  document.querySelectorAll("[data-modal]").forEach((a) => a.onclick = () => openModal(a.dataset.modal));
  const c = document.getElementById("kxconn"); if (c) c.onclick = doConnect;
  const ad = document.getElementById("kxaddr"); if (ad) ad.onclick = () => { if (confirm("Disconnect wallet?")) { disconnectWallet(); renderRight(); go(state.route); } };
  const out = document.getElementById("kxout"); if (out) out.onclick = () => onLogout && onLogout();
  const bell = document.getElementById("kxbell"); if (bell) bell.onclick = (e) => { e.stopPropagation(); toggleNotifs(); };
  updateBell();
}
async function doConnect() { try { const r = await connectWallet(); notify(r.sim ? "Simulated wallet connected · 25,000 USDC + 10,000 USDT" : "Wallet connected · " + shortAddr(r.address), "ok"); renderRight(); go(state.route); } catch (e) { toast(e.message, true); } }

function go(route) {
  state.route = route; live.onTick = null; clearInterval(live.priceLoop);
  renderNav(); renderRight();
  const main = document.getElementById("kxmain");
  ({ overview: pageOverview, trade: pageTrade, portfolio: pagePortfolio, house: pageHouse, paper: pagePaper, leaderboard: pageLeaderboard, rewards: pageRewards, challenge: pageChallenge }[route] || pageOverview)(main);
  window.scrollTo(0, 0);
}

// ---------------- live loop ----------------
async function tickAll() {
  tickProtocol(); driftFunding();
  const nb = fundingBoundary();
  if (nb > fundingLastBoundary) { fundingLastBoundary = nb; applyFunding(); }
  checkPositions(); checkOrders(); checkAlarms(); copyTick(); checkChallenge();
  try {
    const t = await fetchTickers(SYMBOLS.map((x) => x.sym));
    if (!Object.keys(t).length) throw new Error("empty");
    live.prevTickers = live.tickers; live.tickers = t; live.lastReal = t; live.feed = "live";
    updatePrices({ BTC: t.BTCUSDT?.price, ETH: t.ETHUSDT?.price });
  } catch {
    // Binance unreachable/rate-limited → synthetic feed so the UI keeps working
    const t = simTickers(SYMBOLS.map((x) => x.sym), live.lastReal);
    live.prevTickers = live.tickers; live.tickers = t; live.feed = "sim";
    updatePrices({ BTC: t.BTCUSDT?.price, ETH: t.ETHUSDT?.price });
  }
  // stream current trade candle
  if (live.candles.length && live.tickers[META2(state.sym)]) {
    const last = live.candles[live.candles.length - 1], p = live.tickers[META2(state.sym)].price;
    last.c = p; last.h = Math.max(last.h, p); last.l = Math.min(last.l, p);
  }
  const fe = document.getElementById("kxfeed");
  if (fe) { fe.textContent = live.feed === "sim" ? "SIM DATA" : "LIVE"; fe.style.opacity = live.feed === "sim" ? ".7" : "1"; }
  updateMarquee(); updateRates();
  if (live.onTick) try { live.onTick(); } catch {}
}
function setFlash(id, text, dir) { const el = document.getElementById(id); if (!el || el.textContent === text) return; el.textContent = text; el.classList.remove("fu", "fd"); void el.offsetWidth; el.classList.add(dir >= 0 ? "fu" : "fd"); }
const put = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };

// ---- live stats ticker (marquee) ----
let mkMembers = 128432, mkTrades24 = 48219, mkLiq24 = 12.4e6, mkOnline = 3184;
function marqueeItems() {
  return [
    { k: "mem", i: "👥", l: "Members", v: mkMembers.toLocaleString("en-US") },
    { k: "on", i: "🟢", l: "Online", v: mkOnline.toLocaleString("en-US"), up: 1 },
    { k: "vol", i: "📊", l: "24h Volume", v: compact(P.house.volume * 0.0012) },
    { k: "tvl", i: "💰", l: "TVL", v: compact(P.house.tvl) },
    { k: "oi", i: "📈", l: "Open Position", v: compact(P.pos.openInterest) },
    { k: "act", i: "⚡", l: "Aktif Trader", v: compactN(P.pos.openPositions * 3.2) },
    { k: "tr", i: "🔥", l: "24h Trades", v: mkTrades24.toLocaleString("en-US") },
    { k: "win", i: "🏆", l: "Today's Profit", v: signMoney(P.leaderboard[0]?.pnl || 0, 0), up: 1 },
    { k: "paid", i: "💎", l: "Profit Paid", v: compact(P.leaderboard.reduce((a, e) => a + Math.max(0, e.pnl), 0)), up: 1 },
    { k: "liq", i: "💥", l: "24h Liquidation", v: compact(mkLiq24) },
    { k: "paper", i: "🪙", l: "Paper Supply", v: compactN(P.paper.totalSupply) },
    { k: "fund", i: "🏦", l: "House Funds", v: compact(P.house.funds) },
  ];
}
function marqueeTrack() {
  const seq = marqueeItems().map((it) => `<span class="kx-mk ${it.up ? "up" : ""}"><span class="i">${it.i}</span> <span class="l">${it.l}</span> <b data-mk="${it.k}">${it.v}</b></span>`).join("");
  return seq + seq; // duplicate for seamless loop
}
function updateMarquee() {
  mkMembers += Math.floor(Math.random() * 3); mkTrades24 += Math.floor(Math.random() * 6);
  mkLiq24 *= 1 + (Math.random() - 0.5) * 0.003; mkOnline += Math.floor((Math.random() - 0.5) * 12);
  for (const it of marqueeItems()) document.querySelectorAll(`[data-mk="${it.k}"]`).forEach((el) => { if (el.textContent !== it.v) el.textContent = it.v; });
}
// live rates ticker (prices)
function rateItems() { return SYMBOLS.map((x) => { const t = live.tickers[x.sym] || {}; return { s: x.s, price: t.price, chg: t.chg }; }); }
function ratesTrack() {
  const seq = rateItems().map((r) => `<span class="kx-rt"><span class="s">${r.s}</span> <span class="p" data-rp="${r.s}">${r.price ? "$" + fmt(r.price) : "—"}</span> <span class="c ${(r.chg || 0) >= 0 ? "up" : "down"}" data-rc="${r.s}">${r.chg != null ? pct(r.chg) : ""}</span></span>`).join("");
  return seq + seq;
}
function updateRates() {
  for (const r of rateItems()) {
    const v = r.price ? "$" + fmt(r.price) : "—";
    document.querySelectorAll(`[data-rp="${r.s}"]`).forEach((el) => { if (el.textContent !== v) el.textContent = v; });
    document.querySelectorAll(`[data-rc="${r.s}"]`).forEach((el) => { el.textContent = r.chg != null ? pct(r.chg) : ""; el.className = "c " + ((r.chg || 0) >= 0 ? "up" : "down"); });
  }
}
async function loadCandles(sym) {
  try { const k = await fetchKlines(META2(sym), INTERVAL[state.tf], 90); return (k && k.length) ? k : simKlines(META2(sym)); }
  catch { return simKlines(META2(sym)); }
}

// ================= OVERVIEW (widget grid) =================
function pageOverview(main) {
  main.innerHTML = `<div class="kpis g4" id="w-kpis"></div>
  <div class="grid" style="grid-template-columns:1fr 1fr 1.2fr;margin-top:14px" id="ovg">
    <div class="grid"><div class="card" id="w-pos"></div><div class="card" id="w-paper"></div></div>
    <div class="grid"><div class="card" id="w-stats"></div><div class="card" id="w-exp"></div></div>
    <div class="grid"><div class="card" id="w-funds"></div></div>
  </div>
  <div class="grid" style="grid-template-columns:1fr 1.4fr;margin-top:14px">
    <div class="card" id="w-mkts"></div>
    <div class="card" id="w-blocks"></div>
  </div>
  <div class="grid g2" style="margin-top:14px"><div class="card" id="w-supply"></div><div class="card" id="w-rewards"></div></div>`;
  const paint = () => {
    put("w-kpis", wKpis());
    put("w-pos", wUserPositions()); put("w-paper", wPaper()); put("w-stats", wHouseStats());
    put("w-exp", wExposure()); put("w-funds", wFunds()); put("w-blocks", wBlocks());
    put("w-mkts", wMarkets()); put("w-supply", wSupply()); put("w-rewards", wRewards());
  };
  paint(); live.onTick = paint;
  main.addEventListener("click", (e) => { const r = e.target.closest("[data-mkt]"); if (r) { state.sym = r.dataset.mkt; go("trade"); } });
}
function wKpis() {
  const h = P.house;
  const items = [
    { l: "24h Volume", v: compact(h.volume * 0.0012), i: "📊", t: "+12.4%", up: 1, c: "var(--acc)" },
    { l: "TVL", v: compact(h.tvl), i: "💰", t: "+3.1%", up: 1, c: "var(--up)" },
    { l: "Open Interest (OI)", v: compact(P.pos.openInterest), i: "📈", t: "live", up: 1, c: "var(--acc2)" },
    { l: "Total Traders", v: compactN(P.pos.openPositions * 3.2), i: "👥", t: "+248 today", up: 1, c: "#d98c0a" },
  ];
  return items.map((k) => `<div class="kpi kpi-rich"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><div class="lbl">${k.l}</div><div class="val">${k.v}</div></div><div class="kpi-ic" style="background:${k.c}1f;color:${k.c}">${k.i}</div></div><div class="kpi-tr ${k.up ? "up" : "down"}">▲ ${k.t}</div></div>`).join("");
}
function wMarkets() {
  const rows = SYMBOLS.slice(0, 7).map((x) => {
    const t = live.tickers[x.sym] || {}, up = (t.chg || 0) >= 0;
    return `<tr class="wl" data-mkt="${x.s}" style="cursor:pointer"><td><div class="sym"><div class="ic" style="background:${x.c}">${x.s[0]}</div><div><b>${x.s}</b><small>${x.n}</small></div></div></td>
      <td class="num">$${fmt(t.price)}</td><td class="num ${up ? "up" : "down"}">${pct(t.chg)}</td></tr>`;
  }).join("");
  return `<h3>Markets <span class="live">LIVE ${EQ}</span></h3><table class="tb"><thead><tr><th>Pair</th><th class="num">Price</th><th class="num">24h %</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function wUserPositions() {
  const a = P.pos;
  const rows = ["BTC", "ETH"].map((s) => { const d = a.byAsset[s]; return `<tr><td>${s}</td><td class="num up">${compact(d.long)}</td><td class="num down">${compact(d.short)}</td><td class="num">${compact(d.long - d.short)}</td></tr>`; }).join("");
  const tl = a.byAsset.BTC.long + a.byAsset.ETH.long, ts = a.byAsset.BTC.short + a.byAsset.ETH.short;
  return `<h3>User Positions <span class="live">LIVE ${EQ}</span></h3>
    <div class="kv"><span class="k">Open Interest</span><span class="v">${compact(a.openInterest)}</span></div>
    <div class="kv"><span class="k">Open Margin</span><span class="v">${compact(a.openMargin)}</span></div>
    <div class="kv"><span class="k">Open Positions</span><span class="v">${compactN(a.openPositions)}</span></div>
    <table class="tb" style="margin-top:8px"><thead><tr><th></th><th class="num">Long</th><th class="num">Short</th><th class="num">Net</th></tr></thead>
    <tbody>${rows}<tr><td><b>Total</b></td><td class="num up">${compact(tl)}</td><td class="num down">${compact(ts)}</td><td class="num">${compact(tl - ts)}</td></tr></tbody></table>`;
}
function wHouseStats() {
  const h = P.house;
  return `<h3>House Stats <span class="live">LIVE ${EQ}</span></h3>
    <div class="kv"><span class="k">House Funds</span><span class="v up">${compact(h.funds)}</span></div>
    <div class="kv"><span class="k">LP Balance</span><span class="v">${compact(h.lpBalance)}</span></div>
    <div class="kv"><span class="k">Open House PnL</span><span class="v ${h.openPnl >= 0 ? "up" : "down"}">${signMoney(h.openPnl, 0)}</span></div>
    <div class="kv"><span class="k">Queue Debt</span><span class="v">$${fmt(h.queueDebt, 2)}</span></div>
    <div class="kv"><span class="k">TVL</span><span class="v">${compact(h.tvl)}</span></div>
    <div class="kv"><span class="k">Volume</span><span class="v">${compact(h.volume)}</span></div>`;
}
function wPaper() {
  const p = P.paper;
  return `<h3>Paper</h3>
    <div class="kv"><span class="k">Paper Supply</span><span class="v">${compactN(p.totalSupply)}</span></div>
    <div class="kv"><span class="k">Paper Staked</span><span class="v">${compactN(p.stakedSupply)}</span></div>
    <div class="kv"><span class="k">Staker Rewards</span><span class="v">${compact(p.stakerRewards)}</span></div>
    <div class="kv"><span class="k">Reward Token / Rate</span><span class="v">${p.rewardToken} / ${p.rewardRate}%</span></div>`;
}
function wExposure() {
  const e = P.pos.byAsset.BTC;
  return `<h3>House Exposure <span class="muted" style="font-weight:600">BTC · LIVE</span></h3>
    <div class="row" style="justify-content:space-between"><span class="up">— BTC Long</span><b class="num">${money(e.long, 0)}</b></div>
    <div class="row" style="justify-content:space-between;margin-top:6px"><span class="down">— BTC Short</span><b class="num">${money(e.short, 0)}</b></div>
    ${areaChart(P.series.funds.map((v, i) => P.series.funds[i]), { h: 150, color: "#7c3aed", id: "exp", fill: true })}`;
}
function wFunds() {
  return `<h3>House Funds <span class="live">LIVE ${EQ}</span></h3><div class="hero-num" style="font-size:30px;margin-bottom:6px">${money(P.house.funds, 0)}</div>${areaChart(P.series.funds, { h: 230, color: "#6366f1", id: "fund" })}`;
}
function wBlocks() {
  return `<h3>Sweep EVM Blocks <span class="live">LIVE ${EQ}</span></h3><div class="grid g4" style="gap:10px">${P.blocks.map((b) => `<div class="blk"><div class="row" style="justify-content:space-between"><span class="st ${b.status}">${b.status}</span><b class="num">${b.pct.toFixed(0)}%</b></div><div class="bar"><i style="width:${b.pct}%"></i></div><div class="muted" style="font-size:10px">#${b.height} · ${b.gas.toFixed(2)}M gas</div></div>`).join("")}</div>
    <div class="row" style="justify-content:space-between;margin-top:12px;font-size:12px"><span class="muted">SUBMITTED TO CHAIN <b style="color:var(--text)">${compactN(450000 + Math.floor(P.blockHeight % 1000))}</b></span><span class="muted">BLOCK BUDGET <b style="color:var(--text)">3M gas</b></span></div>`;
}
function wSupply() { return `<h3>Total Paper Supply <span class="live">LIVE ${EQ}</span></h3>${dualArea(P.series.supplyTotal, P.series.supplyStaked, { h: 180 })}<div class="row" style="gap:16px;margin-top:8px;font-size:12px"><span><b style="color:#7c3aed">—</b> Total</span><span><b style="color:#6366f1">—</b> Staked</span></div>`; }
function wTopology() {
  const assets = Object.entries(P.pos.byAsset);
  const max = Math.max(...assets.flatMap(([, d]) => [d.long, d.short]), 1);
  const rows = assets.map(([s, d]) => {
    const lw = d.long / max * 100, sw = d.short / max * 100;
    return `<div style="margin:10px 0"><div class="row" style="justify-content:space-between;font-size:12px;margin-bottom:4px"><b>${s}</b><span class="muted">net ${compact(d.long - d.short)}</span></div>
      <div style="display:flex;gap:2px;height:16px"><div style="width:${lw}%;background:var(--up);border-radius:3px 0 0 3px;opacity:.85" title="Long"></div><div style="width:${sw}%;background:var(--down);border-radius:0 3px 3px 0;opacity:.85" title="Short"></div></div>
      <div class="row" style="justify-content:space-between;font-size:10px;margin-top:3px"><span class="up">L ${compact(d.long)}</span><span class="down">S ${compact(d.short)}</span></div></div>`;
  }).join("");
  return `<h3>House Position Topology <span class="live">LIVE ${EQ}</span></h3>${rows}`;
}
function wRewards() {
  const p = P.paper;
  return `<h3>Paper Rewards</h3><div class="kv"><span class="k">Pending Rewards</span><span class="v">$${fmt(p.pendingRewards, 2)}</span></div><div class="kv"><span class="k">Latest Distribution</span><span class="v">${ago(p.latestDistTs)}</span></div><div class="kv"><span class="k">Stake Ratio</span><span class="v">${(p.stakedSupply / p.totalSupply * 100).toFixed(1)}%</span></div>${areaChart(P.series.stakingRev, { h: 120, color: "#f0a93b", id: "rev" })}`;
}

// ================= TRADE =================
const TFS = ["Tick", ...Object.keys(INTERVAL)];
async function pageTrade(main) {
  const sym = state.sym;
  const showBanner = localStorage.getItem("sweep_demo_ack") !== "1";
  main.innerHTML = `${showBanner ? `<div class="banner" id="tr-banner">🧪 <b>Paper Trading</b> — All balances and trades are virtual; no real funds are used. High leverage carries high risk. <span class="x" id="tr-bx">Got it ✕</span></div>` : ""}
  <div class="grid tradecols" style="grid-template-columns:1fr 280px 320px">
    <div class="grid">
      <div class="card" style="padding:12px 14px"><div class="row" id="tr-head" style="gap:16px"></div></div>
      <div class="card" style="padding:12px 14px">
        <div class="row" style="justify-content:space-between;margin-bottom:8px"><div class="muted" style="font-size:11px" id="tr-mode">Live Tick</div>
          <div class="row" style="gap:4px" id="tr-tfs">${TFS.map((t) => `<span class="pill ${t === state.tf ? "on" : ""}" data-tf="${t}">${t}</span>`).join("")}</div></div>
        <div class="chartwrap" id="tr-wrap"><div id="tr-svg" style="min-height:360px"><div class="chart-empty">Loading chart…</div></div>
          <div class="hbox" id="tr-handles"></div>
          <div class="cross" id="tr-cross"><div class="hl"></div><div class="vl"></div><div class="ptag"></div><div class="ttag"></div></div></div>
        <div class="liqstrip" id="tr-liq"></div>
      </div>
      <div class="card"><div class="tabs" id="tr-tabs">${["Positions", "Emirler", "History", "Status"].map((t) => `<div class="tab ${state.tradeTab === t ? "on" : ""}" data-tt="${t}">${t}</div>`).join("")}</div><div id="tr-body"></div></div>
    </div>
    <div class="grid" style="align-content:start">
      <div class="card" style="padding:12px 14px"><h3>Order Book <span class="live">LIVE ${EQ}</span></h3><div class="ob" id="tr-book"></div></div>
      <div class="card" style="padding:12px 14px"><h3>Trade Flow <span class="live">LIVE ${EQ}</span></h3>
        <div class="row" style="justify-content:space-between;color:var(--mut);font-size:10px;padding:0 2px 4px"><span>PRICE</span><span>AMOUNT</span><span>ZAMAN</span></div>
        <div class="tape" id="tr-tape"></div></div>
    </div>
    <div class="card" id="tr-order" style="align-self:start"></div>
  </div>`;
  live.candles = []; live.ticks = [];
  renderTradeHead(); renderOrder(); renderTradeBody();
  await loadChartData(sym);
  put("tr-svg", chartSvg()); renderLiqStrip();
  renderBook(); pushTape(priceOf(sym) || 1); renderTape(); bindCrosshair(); renderHandles();
  document.querySelectorAll("[data-tt]").forEach((t) => t.onclick = () => { state.tradeTab = t.dataset.tt; document.querySelectorAll("[data-tt]").forEach((x) => x.classList.toggle("on", x === t)); renderTradeBody(); });
  bindTfs();
  const bx = document.getElementById("tr-bx"); if (bx) bx.onclick = () => { localStorage.setItem("sweep_demo_ack", "1"); document.getElementById("tr-banner")?.remove(); };
  startPriceLoop();
  live.onTick = () => { renderTradeHead(true); if (state.tf !== "Tick") put("tr-svg", chartSvg()); if (state.tradeTab !== "History") renderTradeBody(); updateOrderLive(); renderHandles(); };
}
function bindTfs() {
  document.querySelectorAll("#tr-tfs [data-tf]").forEach((p) => p.onclick = async () => {
    state.tf = p.dataset.tf;
    document.querySelectorAll("#tr-tfs [data-tf]").forEach((x) => x.classList.toggle("on", x.dataset.tf === state.tf));
    const m = document.getElementById("tr-mode"); if (m) m.textContent = state.tf === "Tick" ? "Live Tick" : state.tf + " Mum";
    put("tr-svg", `<div class="chart-empty">Loading chart…</div>`);
    await loadChartData(state.sym); put("tr-svg", chartSvg());
  });
}
function chartLines() {
  return perps.filter((p) => p.sym === state.sym).flatMap((p) => {
    const ls = [{ price: p.entry, color: "#7c3aed", label: "ENTRY" }, { price: bustPrice(p.side, p.entry, p.lev), color: "#e23950", label: "LIQ." }];
    if (p.tp) ls.push({ price: p.tp, color: "#0ea371", label: "TP" });
    if (p.sl) ls.push({ price: p.sl, color: "#bd7f0a", label: "SL" });
    return ls;
  }).concat(alarms.filter((a) => a.sym === state.sym).map((a) => ({ price: a.price, color: "#6366f1", label: "🔔" })))
    .concat(orders.filter((o) => o.sym === state.sym).map((o) => ({ price: o.price, color: o.type === "limit" ? "#6366f1" : "#c2820a", label: (o.type === "limit" ? "LMT" : "STP") + " " + (o.side === "LONG" ? "▲" : "▼") })));
}
function chartSvg() {
  const lines = chartLines();
  return state.tf === "Tick" ? tickChart(live.ticks, { id: "trade", lines }) : candleChart(live.candles, { id: "trade", lines });
}
// ----- synthetic order book + trade tape (client-side, around live price) -----
let obSeed = 123; const orn = () => (obSeed = (obSeed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
function buildBook(px) {
  const tick = px * 0.00008;
  const mk = (i, bid) => { const amt = +(orn() * 2.2 + 0.05).toFixed(3); return { px: px + (bid ? -1 : 1) * tick * (i + 1) * (1 + orn() * 0.6), amt }; };
  const asks = Array.from({ length: 11 }, (_, i) => mk(i, false)).reverse();
  const bids = Array.from({ length: 11 }, (_, i) => mk(i, true));
  return { asks, bids };
}
function renderBook() {
  const px = priceOf(state.sym) || 1;
  if (!live.book) live.book = buildBook(px); else live.book = buildBook(px);
  const { asks, bids } = live.book;
  let ca = 0, cb = 0; asks.forEach((a) => a.cum = (ca += a.amt)); bids.forEach((b) => b.cum = (cb += b.amt));
  const maxA = asks[0]?.cum || 1, maxB = bids[bids.length - 1]?.cum || 1;
  const row = (r, bid, mx) => `<div class="r"><div class="bar" style="width:${(r.cum / mx) * 100}%;background:${bid ? "var(--up)" : "var(--down)"}"></div><span class="${bid ? "up" : "down"}">${fmt(r.px)}</span><span class="muted">${fmt(r.amt, 3)}</span></div>`;
  const spread = (asks.length && bids.length) ? asks[asks.length - 1].px - bids[0].px : 0;
  put("tr-book", `${asks.map((a) => row(a, false, maxA)).join("")}<div class="mid"><span class="${(live.tickers[META2(state.sym)]?.price || 0) >= (live._lastbook || 0) ? "up" : "down"}">${fmt(px)}</span><span class="muted" style="font-weight:400;font-size:11px">spread ${fmt(spread, spread > 1 ? 2 : 4)}</span></div>${bids.map((b) => row(b, true, maxB)).join("")}`);
  live._lastbook = px;
}
function pushTape(px) {
  if (!live.tape) live.tape = [];
  const k = 1 + Math.floor(orn() * 3);
  for (let i = 0; i < k; i++) live.tape.unshift({ px: px * (1 + (orn() - 0.5) * 0.0006), amt: +(orn() * 1.4 + 0.01).toFixed(3), t: Date.now(), buy: orn() > 0.5, fresh: true });
  live.tape = live.tape.slice(0, 22);
}
function renderTape() {
  if (!live.tape) return;
  put("tr-tape", live.tape.map((t) => `<div class="r ${t.fresh ? "new" : ""}"><span class="${t.buy ? "up" : "down"}">${fmt(t.px)}</span><span>${fmt(t.amt, 3)}</span><span class="muted">${hhmmss(t.t)}</span></div>`).join(""));
  live.tape.forEach((t) => (t.fresh = false));
}
function bindCrosshair() {
  const wrap = document.getElementById("tr-wrap"), cross = document.getElementById("tr-cross");
  if (!wrap || !cross) return;
  wrap.onmousemove = (e) => {
    const svg = wrap.querySelector("svg.kxchart"); if (!svg) { cross.style.display = "none"; return; }
    const rect = wrap.getBoundingClientRect(), mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const lo = +svg.dataset.lo, hi = +svg.dataset.hi, pt = +svg.dataset.pt, ih = +svg.dataset.ih, vh = +svg.dataset.vh, pl = +svg.dataset.pl, iw = +svg.dataset.iw;
    const vbw = 680; const sx = rect.width / vbw, sy = rect.height / vh;
    if (mx < pl * sx || mx > (pl + iw) * sx) { cross.style.display = "none"; return; }
    const vy = my / sy, price = lo + (1 - (vy - pt) / ih) * (hi - lo);
    cross.style.display = "block";
    cross.querySelector(".hl").style.top = my + "px";
    cross.querySelector(".vl").style.left = mx + "px";
    const pg = cross.querySelector(".ptag"); pg.style.top = my + "px"; pg.textContent = fmt(price, price > 100 ? 1 : 3);
    const tg = cross.querySelector(".ttag"); tg.style.left = mx + "px";
    // time estimate for tick chart
    if (state.tf === "Tick" && live.ticks.length) { const frac = (mx / sx - pl) / iw, idx = Math.max(0, Math.min(live.ticks.length - 1, Math.round(frac * (live.ticks.length - 1)))); tg.textContent = hhmmss(live.ticks[idx].t); }
    else tg.textContent = state.tf;
  };
  wrap.onmouseleave = () => cross.style.display = "none";
}
// ----- draggable TP/SL handles on the chart -----
function chartGeom() {
  const wrap = document.getElementById("tr-wrap"), svg = wrap?.querySelector("svg.kxchart"); if (!svg) return null;
  const rect = wrap.getBoundingClientRect(), d = svg.dataset, lo = +d.lo, hi = +d.hi, pt = +d.pt, ih = +d.ih, vh = +d.vh, sy = rect.height / vh;
  return { rect, lo, hi, yOf: (price) => (pt + ih - ((price - lo) / (hi - lo)) * ih) * sy, priceAt: (clientY) => { const vy = (clientY - rect.top) / sy; return lo + (1 - (vy - pt) / ih) * (hi - lo); } };
}
function renderHandles() {
  const box = document.getElementById("tr-handles"); if (!box) return;
  if (live._dragging) return;
  const g = chartGeom(); if (!g) { box.innerHTML = ""; return; }
  const mine = perps.filter((p) => p.sym === state.sym);
  box.innerHTML = mine.map((p) => {
    const mk = (kind) => {
      const set = kind === "tp" ? p.tp : p.sl;
      const price = set ?? (kind === "tp" ? p.entry * (p.side === "LONG" ? 1.03 : 0.97) : p.entry * (p.side === "LONG" ? 0.98 : 1.02));
      const y = g.yOf(price); if (y < 4 || y > g.rect.height - 4) return "";
      return `<div class="hdl ${kind} ${set ? "" : "ghost"}" data-hid="${p.id}:${kind}" style="top:${y}px"><div class="grip">${kind.toUpperCase()} ${fmt(price, price > 100 ? 1 : 3)}</div></div>`;
    };
    return mk("tp") + mk("sl");
  }).join("");
  box.querySelectorAll("[data-hid]").forEach((h) => h.onmousedown = (e) => startDrag(e, h));
}
function startDrag(e, handle) {
  e.preventDefault();
  const [id, kind] = handle.dataset.hid.split(":"), p = perps.find((x) => x.id == id); if (!p) return;
  live._dragging = true; handle.classList.remove("ghost");
  const grip = handle.querySelector(".grip");
  const move = (ev) => {
    const g = chartGeom(); if (!g) return;
    let price = g.priceAt(ev.clientY);
    // keep on the valid side of entry
    if (kind === "tp") price = p.side === "LONG" ? Math.max(price, p.entry * 1.0005) : Math.min(price, p.entry * 0.9995);
    else price = p.side === "LONG" ? Math.min(price, p.entry * 0.9995) : Math.max(price, p.entry * 1.0005);
    handle.style.top = g.yOf(price) + "px"; grip.textContent = `${kind.toUpperCase()} ${fmt(price, price > 100 ? 1 : 3)}`;
    handle._price = price;
  };
  const up = () => {
    document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up);
    live._dragging = false;
    if (handle._price) { p[kind] = +handle._price.toFixed(p.entry > 100 ? 2 : 4); saveLS(PKEY, perps); toast(`${p.sym} ${kind.toUpperCase()} → ${money(p[kind])}`); notify(`${p.sym} ${kind.toUpperCase()} ${money(p[kind])} set`, "ok", true); }
    put("tr-svg", chartSvg()); renderHandles(); renderTradeBody();
  };
  document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
}
async function loadChartData(sym) {
  if (state.tf === "Tick") { live.ticks = await seedTicks(sym); }
  else { live.candles = await loadCandles(sym); }
}
async function seedTicks(sym) {
  const symU = META2(sym);
  try { const k = await fetchKlines(symU, "1m", 120); if (k && k.length) return k.map((c) => ({ t: c.t, p: c.c })); } catch {}
  return simKlines(symU, 120).map((c) => ({ t: c.t, p: c.c }));
}
function startPriceLoop() {
  clearInterval(live.priceLoop);
  live.priceLoop = setInterval(async () => {
    if (state.route !== "trade") { clearInterval(live.priceLoop); return; }
    const symU = META2(state.sym);
    let p; try { p = await fetchPrice(symU); if (!p) throw 0; } catch { p = simPrice(symU); }
    live.ticks.push({ t: Date.now(), p }); if (live.ticks.length > 160) live.ticks.shift();
    if (state.tf === "Tick") put("tr-svg", chartSvg());
    setFlash("tr-px", "$" + fmt(p), p - (live._lastp || p)); live._lastp = p;
    if (live.tickers[symU]) live.tickers[symU].price = p;      // keep head/order in sync
    renderBook(); pushTape(p); renderTape();
    const fcd = document.getElementById("tr-fcd"); if (fcd) fcd.textContent = fundingCountdown();
    const ff = document.getElementById("tr-fund"); if (ff) { ff.textContent = ((live.funding?.[state.sym] || 0) * 100).toFixed(4) + "%"; ff.className = (live.funding?.[state.sym] || 0) >= 0 ? "up" : "down"; }
    checkPositions(); renderHandles();
  }, 1000);
}
function checkPositions() {
  const cross = (state.marginMode || "Isolated") === "Cross";
  if (cross && perps.length) { // account-wide liquidation when equity falls below maintenance
    const h = accountHealth();
    if (h.equity <= h.maint) { for (const p of [...perps]) closePerp(p, priceOf(p.sym) || p.entry, "liquidation"); return; }
  }
  for (const p of [...perps]) {
    const mark = priceOf(p.sym) || p.entry, bust = bustPrice(p.side, p.entry, p.lev), long = p.side === "LONG";
    if (p.trail) { // trailing stop follows favourable price
      const t = long ? mark * (1 - p.trail / 100) : mark * (1 + p.trail / 100);
      const ns = long ? Math.max(p.sl || 0, t) : Math.min(p.sl || Infinity, t);
      if (ns !== p.sl) { p.sl = ns; saveLS(PKEY, perps); }
    }
    if (!cross && ((long && mark <= bust) || (!long && mark >= bust))) { closePerp(p, bust, "liquidation"); continue; }
    if (p.tp && ((long && mark >= p.tp) || (!long && mark <= p.tp))) { closePerp(p, p.tp, "TP"); continue; }
    if (p.sl && ((long && mark <= p.sl) || (!long && mark >= p.sl))) { closePerp(p, p.sl, "SL"); continue; }
    const dist = Math.abs(mark - bust) / mark;
    if (dist < 0.012 && !p._warned) { p._warned = true; notify(`⚠️ ${p.sym} ${p.side} very close to liquidation (%${(dist * 100).toFixed(2)})`, "warn"); }
    else if (dist > 0.03) p._warned = false;
  }
}
function renderLiqStrip() {
  // live liquidation ticker (synthetic) — newest scroll in from the right
  const items = (P.activity || []).slice(0, 10).map((a) => {
    const sym = SYMBOLS[(a.user.charCodeAt(4) || 0) % SYMBOLS.length];
    return `<span class="liq"><span class="ic" style="width:16px;height:16px;background:${sym.c}">${sym.s[0]}</span> <span class="down">▼ ${compact(a.amount * 1000)}</span></span>`;
  }).join("");
  put("tr-liq", items);
}
function renderTradeHead(liveOnly) {
  const sym = state.sym, t = live.tickers[META2(sym)] || {}, prev = live.prevTickers[META2(sym)] || {};
  if (liveOnly && document.getElementById("tr-px")) { setFlash("tr-px", "$" + fmt(t.price), (t.price || 0) - (prev.price || 0)); const c = document.getElementById("tr-chg"); if (c) { c.textContent = pct(t.chg); c.className = (t.chg || 0) >= 0 ? "down up" : "down"; c.classList.toggle("up", (t.chg || 0) >= 0); } return; }
  const opts = SYMBOLS.map((x) => `<option value="${x.s}" ${x.s === sym ? "selected" : ""}>${x.s}/USDC</option>`).join("");
  put("tr-head", `<select class="pill" id="tr-sel" style="padding:8px">${opts}</select>
    <div><div class="muted" style="font-size:10px">PRICE</div><div id="tr-px" style="font-size:20px;font-weight:800">$${fmt(t.price)}</div></div>
    <div><div class="muted" style="font-size:10px">24H</div><div id="tr-chg" class="${(t.chg || 0) >= 0 ? "up" : "down"}" style="font-weight:700">${pct(t.chg)}</div></div>
    <div><div class="muted" style="font-size:10px">24H VOL</div><div style="font-weight:700">${t.vol ? compact(t.vol) : "—"}</div></div>
    <div><div class="muted" style="font-size:10px">LONG OI</div><div class="up" style="font-weight:700">${compact(P.pos.byAsset[sym]?.long || P.pos.openInterest * 0.3)}</div></div>
    <div><div class="muted" style="font-size:10px">SHORT OI</div><div class="down" style="font-weight:700">${compact(P.pos.byAsset[sym]?.short || P.pos.openInterest * 0.32)}</div></div>
    <div title="8-hour funding rate · if positive, longs pay"><div class="muted" style="font-size:10px">FUNDING / 8s</div><div style="font-weight:700"><span class="${(live.funding?.[sym] || 0) >= 0 ? "up" : "down"}" id="tr-fund">${((live.funding?.[sym] || 0) * 100).toFixed(4)}%</span> <span class="muted" style="font-size:11px" id="tr-fcd">${fundingCountdown()}</span></div></div>
    <button class="pill" id="tr-alarm" style="margin-left:auto">🔔 Alarm${alarms.filter((a) => a.sym === sym).length ? " (" + alarms.filter((a) => a.sym === sym).length + ")" : ""}</button>
    <span class="live">LIVE ${EQ}</span>`);
  const al = document.getElementById("tr-alarm"); if (al) al.onclick = () => openAlarmModal(state.sym);
  const sel = document.getElementById("tr-sel"); if (sel) sel.onchange = async () => { state.sym = sel.value; live.candles = []; live.ticks = []; renderTradeHead(); put("tr-svg", `<div class="chart-empty">Loading chart…</div>`); await loadChartData(state.sym); put("tr-svg", chartSvg()); renderOrder(); };
}
function bustPrice(side, entry, lev) { return side === "LONG" ? entry * (1 - 1 / lev) : entry * (1 + 1 / lev); }
function renderOrder() {
  const sym = state.sym, acc = getAccount(), conn = acc.address, px = priceOf(sym) || 1;
  const orderVal = state.margin * state.lev, bust = bustPrice(state.side, px, state.lev);
  put("tr-order", `
    <h3>Account Equity <span class="num" id="o-eq">${conn ? money(acc.cash + totalPerpPnl()) : "— —"}</span></h3>
    <div class="kv"><span class="k">USDC (collateral)</span><span class="v" id="o-avail">${conn ? money(acc.cash) : "— —"}</span></div>
    <div class="kv"><span class="k">USDT</span><span class="v">${conn ? money(acc.usdt) : "— —"}</span></div>
    <div class="kv"><span class="k">Margin in Use</span><span class="v">${conn ? money(perps.reduce((a, p) => a + p.margin, 0)) : "— —"}</span></div>
    <div class="kv"><span class="k">Open PnL</span><span class="v" id="o-pnl">${conn ? signMoney(totalPerpPnl()) : "— —"}</span></div>
    <div class="row" style="gap:6px;margin:12px 0 10px;align-items:center"><span class="muted" style="font-size:11px">Marj:</span><div class="seg" style="flex:1"><button class="${(state.marginMode || "Isolated") === "Isolated" ? "on long" : ""}" data-mm="Isolated" style="padding:7px;font-size:12px">Isolated</button><button class="${state.marginMode === "Cross" ? "on long" : ""}" data-mm="Cross" style="padding:7px;font-size:12px">Cross</button></div></div>
    <div class="seg" style="margin:0 0 4px"><button class="long ${state.side === "LONG" ? "on" : ""}" data-sd="LONG">↗ Long</button><button class="short ${state.side === "SHORT" ? "on" : ""}" data-sd="SHORT">↘ Short</button></div>
    <div class="row" style="gap:4px;margin-bottom:10px" id="o-types">${["Market", "Limit", "Stop", "Scale", "TWAP"].map((t) => `<span class="pill ${(state.oType || "Market") === t ? "on" : ""}" data-ot="${t}" style="padding:5px 9px;font-size:11px">${t}</span>`).join("")}</div>
    <div class="fld"><label>MARGIN (USDC)</label><div class="row" style="gap:6px;margin-bottom:6px"><span class="pill" data-mq=".5">½×</span><span class="pill" data-mq="2">2×</span><span class="pill" data-mq="max">Max</span></div>
      <div class="inp"><input id="o-margin" value="${state.margin}"><span class="suf">USDC</span></div></div>
    <div class="fld"><label>LEVERAGE MULTIPLIER <b style="float:right;color:var(--text)">${state.lev}×</b></label>
      <div class="row" style="gap:6px;margin-bottom:6px"><span class="pill" data-lq="100">100×</span><span class="pill" data-lq="1000">1000×</span></div>
      <input type="range" id="o-lev" min="1" max="1000" value="${state.lev}">
      <div class="row" style="justify-content:space-between;font-size:10px;color:var(--mut);margin-top:3px"><span>×1 Safe</span><span>Wild ×1000</span></div></div>
    ${orderPriceFields(state.oType || "Market", px)}
    <div class="fld"><label>TP / SL (opsiyonel)</label><div class="row" style="gap:6px">
      <div class="inp" style="flex:1;padding:0 8px"><input id="o-tp" placeholder="Take Profit" value="${state.tp || ""}"><span class="suf up">TP</span></div>
      <div class="inp" style="flex:1;padding:0 8px"><input id="o-sl" placeholder="Stop Loss" value="${state.sl || ""}"><span class="suf down">SL</span></div></div></div>
    <div class="kv"><span class="k">Order Value</span><span class="v" id="o-val">${money(orderVal)}</span></div>
    <div class="kv"><span class="k">Bust Price</span><span class="v" id="o-bust">${money(bust)}</span></div>
    <div class="kv"><span class="k">Distance to liquidation</span><span class="v ${Math.abs(px - bust) / px * 100 < 2 ? "down" : ""}">${(Math.abs(px - bust) / px * 100).toFixed(2)}%</span></div>
    ${conn ? (() => { const h = accountHealth(); return `<div style="margin:10px 0 4px"><div class="row" style="justify-content:space-between;font-size:11px"><span class="muted">Account Health · ${state.marginMode || "Isolated"}</span><span class="${h.ratio < .5 ? "up" : h.ratio < .8 ? "warn" : "down"}">${(h.ratio * 100).toFixed(1)}%</span></div><div style="height:7px;border-radius:5px;background:var(--panel2);overflow:hidden;margin-top:4px;border:1px solid var(--line)"><div style="height:100%;width:${Math.min(100, h.ratio * 100)}%;background:${h.ratio < .5 ? "var(--up)" : h.ratio < .8 ? "var(--warn)" : "var(--down)"};transition:width .3s"></div></div></div>`; })() : ""}
    <div id="o-warn">${levWarnBox(state.lev)}</div>
    <button class="kx-btn ${conn ? (state.side === "LONG" ? "g" : "r") : "acc"}" id="o-sub" style="width:100%;margin-top:12px;padding:12px">${conn ? ((state.oType && state.oType !== "Market" ? state.oType + " · " : "") + (state.side === "LONG" ? "Long " : "Short ") + sym) : "Connect wallet"}</button>`);
  document.querySelectorAll("[data-ot]").forEach((b) => b.onclick = () => { state.oType = b.dataset.ot; renderOrder(); });
  document.querySelectorAll("[data-mm]").forEach((b) => b.onclick = () => { state.marginMode = b.dataset.mm; renderOrder(); if (state.route === "trade") put("tr-svg", chartSvg()); });
  document.querySelectorAll("[data-sd]").forEach((b) => b.onclick = () => { state.side = b.dataset.sd; renderOrder(); });
  document.querySelectorAll("[data-mq]").forEach((b) => b.onclick = () => { const q = b.dataset.mq; state.margin = q === "max" ? Math.max(1, Math.floor(getAccount().cash)) : +(state.margin * +q).toFixed(2); renderOrder(); });
  document.querySelectorAll("[data-lq]").forEach((b) => b.onclick = () => { state.lev = +b.dataset.lq; renderOrder(); });
  const mi = document.getElementById("o-margin"); if (mi) mi.oninput = () => { state.margin = +mi.value || 0; updateOrderLive(); };
  const lv = document.getElementById("o-lev"); if (lv) lv.oninput = () => { state.lev = +lv.value; renderOrder(); };
  const tpi = document.getElementById("o-tp"); if (tpi) tpi.oninput = () => { state.tp = tpi.value; };
  const sli = document.getElementById("o-sl"); if (sli) sli.oninput = () => { state.sl = sli.value; };
  const sub = document.getElementById("o-sub"); if (sub) sub.onclick = () => submitOrder();
}
function orderPriceFields(ot, px) {
  const v = (f) => fmt(px * f, px > 100 ? 1 : 3);
  if (ot === "Limit") return `<div class="fld"><label>Limit Price</label><div class="inp"><input id="o-price" value="${v(1)}"><span class="suf">USDC</span></div></div>`;
  if (ot === "Stop") return `<div class="fld"><label>Stop (Trigger) Price</label><div class="inp"><input id="o-price" value="${v(1)}"><span class="suf">USDC</span></div></div>`;
  if (ot === "Scale") return `<div class="fld"><label>Scale · upper / lower price · order count</label><div class="row" style="gap:6px"><div class="inp" style="flex:1;padding:0 8px"><input id="o-p1" value="${v(1.01)}"></div><div class="inp" style="flex:1;padding:0 8px"><input id="o-p2" value="${v(0.99)}"></div><div class="inp" style="width:58px;padding:0 8px"><input id="o-cnt" value="5"></div></div></div>`;
  if (ot === "TWAP") return `<div class="fld"><label>TWAP · duration (min) · chunks</label><div class="row" style="gap:6px"><div class="inp" style="flex:1;padding:0 8px"><input id="o-dur" value="5"><span class="suf">min</span></div><div class="inp" style="width:64px;padding:0 8px"><input id="o-cnt" value="5"><span class="suf">×</span></div></div></div>`;
  return "";
}
function submitOrder() {
  if (!getAccount().address) return doConnect();
  const sym = state.sym, side = state.side, lev = state.lev, ot = state.oType || "Market", px = priceOf(sym) || 1;
  const m = +document.getElementById("o-margin").value || 0;
  if (m <= 0) return toast("Please enter a margin amount", true);
  const tp = +document.getElementById("o-tp").value || null, sl = +document.getElementById("o-sl").value || null;
  if (ot === "Market") {
    if (m > getAccount().cash) return toast("Insufficient USDC balance — deposit first", true);
    const err = validateTPSL(side, px, tp, sl); if (err) return toast(err, true);
    return openOrderConfirm(sym, side, m, lev, px, tp, sl);
  }
  if (ot !== "Market") rflag("limit");
  if (ot === "Limit" || ot === "Stop") {
    const price = +(document.getElementById("o-price").value || "").replace(/,/g, "") || 0;
    if (price <= 0) return toast("Enter a valid price", true);
    if (m > getAccount().cash) return toast("Insufficient USDC balance", true);
    adjustUSDC(-m);
    orders.unshift({ id: Date.now(), sym, side, type: ot.toLowerCase(), price, margin: m, lev, tp, sl, ts: Date.now() });
    saveLS(OKEY, orders); notify(`${ot} emri kuruldu · ${side} ${sym} @ ${money(price)}`, "trade"); clearOrderInputs(); refreshTrade();
    return;
  }
  if (ot === "Scale") {
    const p1 = +(document.getElementById("o-p1").value || "").replace(/,/g, "") || 0, p2 = +(document.getElementById("o-p2").value || "").replace(/,/g, "") || 0, cnt = Math.max(2, Math.min(20, +document.getElementById("o-cnt").value || 5));
    if (p1 <= 0 || p2 <= 0) return toast("Enter a valid price range", true);
    if (m > getAccount().cash) return toast("Insufficient USDC balance", true);
    adjustUSDC(-m); const hi = Math.max(p1, p2), lo = Math.min(p1, p2), each = m / cnt;
    for (let i = 0; i < cnt; i++) { const price = lo + (hi - lo) * (i / (cnt - 1)); orders.unshift({ id: Date.now() + i, sym, side, type: "limit", price, margin: each, lev, tp, sl, ts: Date.now() }); }
    saveLS(OKEY, orders); notify(`Scale · ${cnt} limit emri kuruldu · ${side} ${sym}`, "trade"); clearOrderInputs(); refreshTrade();
    return;
  }
  if (ot === "TWAP") {
    const dur = Math.max(1, +document.getElementById("o-dur").value || 5), cnt = Math.max(2, Math.min(20, +document.getElementById("o-cnt").value || 5));
    if (m > getAccount().cash) return toast("Insufficient USDC balance", true);
    adjustUSDC(-m);
    twaps.unshift({ id: Date.now(), sym, side, chunkMargin: m / cnt, lev, chunks: cnt, done: 0, interval: dur * 60000 / cnt, nextTs: Date.now(), ts: Date.now() });
    saveLS(TKEY, twaps); notify(`TWAP started · ${side} ${sym} · ${cnt} chunks / ${dur}min`, "trade"); clearOrderInputs(); refreshTrade();
    return;
  }
}
function clearOrderInputs() { state.tp = ""; state.sl = ""; }

// ---- PnL share card (original design, rendered to canvas) ----
function shareCard(pos) {
  const mark = pos.exit ?? (priceOf(pos.sym) || pos.entry), dir = pos.side === "LONG" ? 1 : -1;
  const pnl = pos.pnl ?? (pos.margin * pos.lev * ((mark - pos.entry) / pos.entry) * dir);
  const roe = pos.pnlPct ?? (pnl / pos.margin * 100), win = pnl >= 0;
  const W = 640, H = 360, c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  // background
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#15121f"); g.addColorStop(1, win ? "#0e1f1a" : "#1f1216");
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = win ? "#2ee6a0" : "#fb4d6a"; x.lineWidth = 2; x.strokeRect(10, 10, W - 20, H - 20);
  // brand
  x.fillStyle = "#8b5cf6"; x.fillRect(34, 34, 30, 30); x.fillStyle = "#fff"; x.font = "900 20px system-ui"; x.fillText("K", 42, 56);
  x.fillStyle = "#ece9f6"; x.font = "800 18px system-ui"; x.fillText("Sweep Perp", 74, 52);
  x.fillStyle = "#8c84a2"; x.font = "600 12px system-ui"; x.fillText("on-chain perps · paper", 74, 68);
  // symbol + side
  x.fillStyle = "#ece9f6"; x.font = "800 30px system-ui"; x.fillText(`${pos.sym}/USDC`, 34, 130);
  x.fillStyle = win ? "#2ee6a0" : "#fb4d6a"; x.font = "800 16px system-ui";
  x.fillText(`${pos.side}  ·  ${pos.lev}×`, 34, 158);
  // big ROE
  x.fillStyle = win ? "#2ee6a0" : "#fb4d6a"; x.font = "900 78px system-ui";
  x.fillText(`${roe >= 0 ? "+" : ""}${roe.toFixed(2)}%`, 32, 250);
  x.fillStyle = "#8c84a2"; x.font = "600 14px system-ui"; x.fillText("ROE (return on investment)", 36, 276);
  // entry/exit
  x.fillStyle = "#8c84a2"; x.font = "600 13px system-ui";
  x.fillText("Entry", 420, 150); x.fillText(pos.exit != null ? "Log out" : "Live", 420, 185); x.fillText("PnL", 420, 220);
  x.fillStyle = "#ece9f6"; x.font = "700 15px system-ui"; x.textAlign = "right";
  x.fillText("$" + fmt(pos.entry), W - 36, 150); x.fillText("$" + fmt(mark), W - 36, 185);
  x.fillStyle = win ? "#2ee6a0" : "#fb4d6a"; x.fillText(signMoney(pnl), W - 36, 220);
  x.textAlign = "left";
  x.fillStyle = "#6b647e"; x.font = "600 12px system-ui"; x.fillText("perp.sweep.finance", 34, H - 28);
  x.fillText(new Date(pos.closeTs ?? Date.now()).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }), W - 36, H - 28); x.textAlign = "left";
  const url = c.toDataURL("image/png");
  const el = document.createElement("div"); el.className = "ov-modal";
  el.innerHTML = `<div class="box" style="width:560px"><h3>Position Card · Share<span class="x">✕</span></h3>
    <img src="${url}" style="width:100%;border-radius:12px;border:1px solid var(--line)"/>
    <div class="row" style="gap:8px;margin-top:14px"><a class="kx-btn acc" href="${url}" download="sweep-${pos.sym}-pnl.png" style="flex:1;text-align:center">Download (PNG)</a><button class="kx-btn" id="sc-copy" style="flex:1">Kopyala</button></div></div>`;
  document.body.appendChild(el);
  const close = () => el.remove(); el.querySelector(".x").onclick = close; el.onclick = (e) => { if (e.target === el) close(); };
  el.querySelector("#sc-copy").onclick = async () => {
    try { const blob = await (await fetch(url)).blob(); await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); toast("Card copied to clipboard"); }
    catch { toast("Copy not supported — use Download", true); }
  };
}
function levWarnBox(lev) {
  if (lev >= 200) return `<div class="warnbox danger">🛑 Extremely high leverage (${lev}×). Fiyatta %${(100 / lev).toFixed(2)}  adverse move fully liquidates your position. Only trade with an amount you can afford to lose.</div>`;
  if (lev >= 50) return `<div class="warnbox">⚠️ High leverage (${lev}×). The liquidation price is very close to the current price — small moves can close the position.</div>`;
  if (lev >= 10) return `<div class="warnbox">ℹ️ ${lev}× leverage multiplies profit and loss by ${lev} ×.</div>`;
  return "";
}
function openOrderConfirm(sym, side, margin, lev, entry, tp, sl) {
  const bust = bustPrice(side, entry, lev), size = margin * lev / entry, dist = Math.abs(entry - bust) / entry * 100;
  const el = document.createElement("div"); el.className = "ov-modal";
  el.innerHTML = `<div class="box conf"><h3>${side} ${sym} · Position Confirmation<span class="x">✕</span></h3>
    <div class="kv"><span class="k">Side</span><span class="v ${side === "LONG" ? "up" : "down"}">${side}</span></div>
    <div class="kv"><span class="k">Sembol</span><span class="v">${sym}/USDC</span></div>
    <div class="kv"><span class="k">Margin</span><span class="v">${money(margin)} USDC</span></div>
    <div class="kv"><span class="k">Leverage</span><span class="v">${lev}×</span></div>
    <div class="kv"><span class="k">Position Size</span><span class="v">${fmt(size, 5)} ${sym} (${money(margin * lev)})</span></div>
    <div class="kv"><span class="k">Entry Price</span><span class="v">${money(entry)}</span></div>
    <div class="kv"><span class="k">Liquidation (Bust)</span><span class="v down">${money(bust)} · %${dist.toFixed(2)} uzak</span></div>
    ${tp ? `<div class="kv"><span class="k">Take Profit</span><span class="v up">${money(tp)} · ${signMoney(margin * lev * ((tp - entry) / entry) * (side === "LONG" ? 1 : -1))}</span></div>` : ""}
    ${sl ? `<div class="kv"><span class="k">Stop Loss</span><span class="v warn">${money(sl)} · ${signMoney(margin * lev * ((sl - entry) / entry) * (side === "LONG" ? 1 : -1))}</span></div>` : ""}
    ${levWarnBox(lev)}
    <label class="chk"><input type="checkbox" id="c-ack"> Riskleri anladım. Bunun <b>paper trading</b> (virtual balance), and I accept that no real funds are used.</label>
    <button class="kx-btn ${side === "LONG" ? "g" : "r"}" id="c-go" style="width:100%" disabled>Pozisyonu Aç</button></div>`;
  document.body.appendChild(el);
  const close = () => el.remove();
  el.querySelector(".x").onclick = close; el.onclick = (e) => { if (e.target === el) close(); };
  const ack = el.querySelector("#c-ack"), gob = el.querySelector("#c-go");
  ack.onchange = () => { gob.disabled = !ack.checked; gob.style.opacity = ack.checked ? "1" : ".5"; };
  gob.style.opacity = ".5";
  gob.onclick = () => {
    if (!ack.checked) return;
    if (margin > getAccount().cash) { close(); return toast("Insufficient USDC balance", true); }
    perps.unshift({ id: Date.now(), sym, side, margin, lev, entry, tp: tp || null, sl: sl || null, ts: Date.now() });
    saveLS(PKEY, perps); adjustUSDC(-margin); state.tp = ""; state.sl = "";
    close(); notify(`${side} ${sym} opened · ${money(margin)} × ${lev} · entry ${money(entry)}${tp ? " · TP " + fmt(tp) : ""}${sl ? " · SL " + fmt(sl) : ""}`, "trade"); renderOrder(); renderTradeBody(); renderRight();
  };
}
function updateOrderLive() {
  const px = priceOf(state.sym) || 1;
  setFlash("o-val", money(state.margin * state.lev), 0);
  put("o-bust", money(bustPrice(state.side, px, state.lev)));
  if (getAccount().address) { const el = document.getElementById("o-pnl"); if (el) { const v = totalPerpPnl(); el.textContent = signMoney(v); el.className = "v " + (v >= 0 ? "up" : "down"); } }
}
function perpPnl(p) { const mark = priceOf(p.sym) || p.entry; return p.margin * p.lev * ((mark - p.entry) / p.entry) * (p.side === "LONG" ? 1 : -1); }
function totalPerpPnl() { return perps.reduce((a, p) => a + perpPnl(p), 0); }
function accountHealth() {
  const acc = getAccount(), equity = acc.cash + totalPerpPnl();
  const maint = perps.reduce((a, p) => a + p.margin * p.lev * 0.005, 0); // 0.5% maintenance margin
  return { equity, maint, ratio: equity > 0 ? Math.min(1.2, maint / equity) : (maint > 0 ? 1.2 : 0) };
}
function closePerp(p, exitPx, reason) {
  const dir = p.side === "LONG" ? 1 : -1;
  const pnl = p.margin * p.lev * ((exitPx - p.entry) / p.entry) * dir, pnlPct = (pnl / p.margin) * 100;
  adjustUSDC(Math.max(0, p.margin + pnl));
  perps = perps.filter((x) => x.id !== p.id); saveLS(PKEY, perps);
  history.unshift({ sym: p.sym, side: p.side, margin: p.margin, lev: p.lev, entry: p.entry, exit: exitPx, pnl, pnlPct, openTs: p.ts, closeTs: Date.now(), reason });
  history = history.slice(0, 200); saveLS(HKEY, history);
  const icon = reason === "TP" ? "ok" : reason === "SL" ? "warn" : reason === "liquidation" ? "liq" : pnl >= 0 ? "ok" : "err";
  const tag = reason === "TP" ? "Take-Profit" : reason === "SL" ? "Stop-Loss" : reason === "liquidation" ? "LIQUIDATION 💥" : "manuel";
  notify(`${p.sym} ${p.side} closed (${tag}) · ${signMoney(pnl)} (${pct(pnlPct, 1)})`, icon);
  if (state.route === "trade") { renderTradeBody(); renderOrder(); } if (state.route === "portfolio") go("portfolio"); renderRight();
}
function renderTradeBody() {
  const conn = getAccount().address;
  if (state.tradeTab === "Status") {
    return put("tr-body", `<div class="grid g3" style="padding:8px 0"><div class="kv"><span class="k">Block Height</span><span class="v">#${P.blockHeight}</span></div><div class="kv"><span class="k">Oracle</span><span class="v up">Online</span></div><div class="kv"><span class="k">Matching</span><span class="v up">Operational</span></div><div class="kv"><span class="k">TVL</span><span class="v">${compact(P.house.tvl)}</span></div><div class="kv"><span class="k">24h Volume</span><span class="v">${compact(P.house.volume * 0.0001)}</span></div><div class="kv"><span class="k">Reward Rate</span><span class="v">${P.paper.rewardRate}% USDC</span></div></div>`);
  }
  if (!conn) return put("tr-body", `<div class="empty">Connect a wallet to see positions.</div>`);
  if (state.tradeTab === "Emirler") {
    if (!orders.length && !twaps.length) return put("tr-body", `<div class="empty">No pending orders. Create a Limit/Stop/Scale/TWAP order.</div>`);
    const orows = orders.map((o) => `<tr><td><b>${o.sym}</b></td><td><span class="badge ${o.side}">${o.side}</span></td><td>${o.type === "limit" ? "Limit" : "Stop"}</td><td class="num">${money(o.price)}</td><td class="num">${money(o.margin)}</td><td class="num lev">${o.lev}×</td><td class="num"><button class="kx-btn sm r" data-cancel="${o.id}">Cancel</button></td></tr>`).join("");
    const trows = twaps.map((t) => `<tr><td><b>${t.sym}</b></td><td><span class="badge ${t.side}">${t.side}</span></td><td>TWAP</td><td class="num muted">${t.done}/${t.chunks} chunks</td><td class="num">${money(t.chunkMargin * (t.chunks - t.done))}</td><td class="num lev">${t.lev}×</td><td class="num"><button class="kx-btn sm r" data-cancel="${t.id}">Stop</button></td></tr>`).join("");
    put("tr-body", `<table class="tb"><thead><tr><th>Asset</th><th>Side</th><th>Type</th><th class="num">Price/Status</th><th class="num">Margin</th><th class="num">Lev</th><th></th></tr></thead><tbody>${orows}${trows}</tbody></table>`);
    return document.querySelectorAll("[data-cancel]").forEach((b) => b.onclick = () => cancelOrder(b.dataset.cancel));
  }
  if (state.tradeTab === "History") {
    if (!history.length) return put("tr-body", `<div class="empty">No trade history.</div>`);
    put("tr-body", `<table class="tb"><thead><tr><th>Asset</th><th>Side</th><th class="num">Lev</th><th class="num">Entry → Exit</th><th class="num">PnL</th><th class="num">%</th><th class="num">Exit</th><th></th></tr></thead><tbody>${history.map((h, i) => `<tr><td><b>${h.sym}</b></td><td><span class="badge ${h.side}">${h.side}</span></td><td class="num lev">${h.lev}×</td><td class="num muted">${fmt(h.entry)} → ${fmt(h.exit)}</td><td class="num ${h.pnl >= 0 ? "up" : "down"}">${signMoney(h.pnl)}</td><td class="num ${h.pnlPct >= 0 ? "up" : "down"}">${pct(h.pnlPct, 1)}${h.reason ? ` <span class="muted" style="font-size:10px">${h.reason}</span>` : ""}</td><td class="num muted">${ago(h.closeTs)}</td><td class="num"><button class="kx-btn sm" data-sharehist="${i}">📤</button></td></tr>`).join("")}</tbody></table>`);
    return document.querySelectorAll("[data-sharehist]").forEach((b) => b.onclick = () => shareCard(history[+b.dataset.sharehist]));
  }
  const list = perps;
  if (!list.length) return put("tr-body", `<div class="empty">No open positions.</div>`);
  put("tr-body", `<table class="tb"><thead><tr><th>Asset</th><th>Side</th><th class="num">Size</th><th class="num">Entry</th><th class="num">Mark</th><th class="num">PnL</th><th class="num">Lev</th><th class="num">TP / SL</th><th class="num">Margin</th><th></th></tr></thead><tbody>${list.map((p) => {
    const mark = priceOf(p.sym) || p.entry, pnl = perpPnl(p), size = p.margin * p.lev / p.entry;
    const tpsl = `${p.tp ? `<span class="up">${fmt(p.tp)}</span>` : "<span class='muted'>—</span>"} / ${p.sl ? `<span class="warn">${fmt(p.sl)}</span>` : "<span class='muted'>—</span>"}`;
    return `<tr><td><b>${p.sym}</b>${p.copy ? ` <span class="badge" style="background:rgba(99,102,241,.15);color:var(--acc2);font-size:9px">COPY</span>` : ""}</td><td><span class="badge ${p.side}">${p.side}</span></td><td class="num">${fmt(size, 4)}</td><td class="num">$${fmt(p.entry)}</td><td class="num">$${fmt(mark)}</td><td class="num ${pnl >= 0 ? "up" : "down"}">${signMoney(pnl)}</td><td class="num lev">${p.lev}×</td><td class="num" style="font-size:11px">${tpsl}</td><td class="num">${money(p.margin)}</td><td class="num"><div class="row" style="gap:4px;justify-content:flex-end"><button class="kx-btn sm" data-share="${p.id}" title="Share">📤</button><button class="kx-btn sm" data-tpsl="${p.id}">TP/SL</button><button class="kx-btn sm r" data-close="${p.id}">Close</button></div></td></tr>`;
  }).join("")}</tbody></table>`);
  document.querySelectorAll("[data-close]").forEach((b) => b.onclick = () => {
    const p = perps.find((x) => x.id == b.dataset.close); if (!p) return;
    closePerp(p, priceOf(p.sym) || p.entry, "manuel");
  });
  document.querySelectorAll("[data-tpsl]").forEach((b) => b.onclick = () => openTPSL(perps.find((x) => x.id == b.dataset.tpsl)));
  document.querySelectorAll("[data-share]").forEach((b) => b.onclick = () => { const p = perps.find((x) => x.id == b.dataset.share); if (p) shareCard(p); });
}
// edit TP/SL on an open position
function openTPSL(p) {
  if (!p) return;
  const el = document.createElement("div"); el.className = "ov-modal";
  el.innerHTML = `<div class="box"><h3>${p.sym} ${p.side} · TP / SL<span class="x">✕</span></h3>
    <div class="kv"><span class="k">Entry</span><span class="v">${money(p.entry)}</span></div>
    <div class="kv"><span class="k">Live</span><span class="v">${money(priceOf(p.sym) || p.entry)}</span></div>
    <div class="fld"><label>Take Profit (${p.side === "LONG" ? "above entry" : "below entry"})</label><div class="inp"><input id="t-tp" value="${p.tp || ""}" placeholder="opsiyonel"><span class="suf up">TP</span></div></div>
    <div class="fld"><label>Stop Loss (${p.side === "LONG" ? "below entry" : "above entry"})</label><div class="inp"><input id="t-sl" value="${p.sl || ""}" placeholder="opsiyonel"><span class="suf down">SL</span></div></div>
    <div class="fld"><label>Trailing Stop (% — follows price)</label><div class="inp"><input id="t-trail" value="${p.trail || ""}" placeholder="e.g. 1.5"><span class="suf">%</span></div></div>
    <button class="kx-btn acc" id="t-go" style="width:100%">Kaydet</button></div>`;
  document.body.appendChild(el);
  const close = () => el.remove(); el.querySelector(".x").onclick = close; el.onclick = (e) => { if (e.target === el) close(); };
  el.querySelector("#t-go").onclick = () => {
    const tp = +el.querySelector("#t-tp").value || null, sl = +el.querySelector("#t-sl").value || null, trail = +el.querySelector("#t-trail").value || null;
    const err = validateTPSL(p.side, p.entry, tp, sl); if (err) return toast(err, true);
    p.tp = tp; p.sl = sl; p.trail = trail; if (tp || sl) rflag("tpsl"); saveLS(PKEY, perps); close(); notify(`${p.sym} TP/SL${trail ? "/Trailing " + trail + "%" : ""} updated`, "ok", true); toast("Kaydedildi"); renderTradeBody(); if (state.route === "trade") put("tr-svg", chartSvg());
  };
}
function validateTPSL(side, entry, tp, sl) {
  if (tp) { if (side === "LONG" && tp <= entry) return "TP must be above entry"; if (side === "SHORT" && tp >= entry) return "TP must be below entry"; }
  if (sl) { if (side === "LONG" && sl >= entry) return "SL must be below entry"; if (side === "SHORT" && sl <= entry) return "SL must be above entry"; }
  return null;
}

// ================= PORTFOLIO =================
function pfMetrics() {
  const trades = history.length, wins = history.filter((h) => h.pnl > 0).length;
  const realized = history.reduce((a, h) => a + h.pnl, 0);
  const volume = history.reduce((a, h) => a + h.margin * h.lev, 0) + perps.reduce((a, p) => a + p.margin * p.lev, 0);
  const best = history.reduce((m, h) => Math.max(m, h.pnl), 0), worst = history.reduce((m, h) => Math.min(m, h.pnl), 0);
  return { trades, wins, winRate: trades ? wins / trades * 100 : 0, realized, volume, best, worst };
}
function equitySeries() {
  const base = 25000;
  const chron = [...history].reverse();
  let eq = base, out = [base];
  for (const h of chron) { eq += h.pnl; out.push(eq); }
  while (out.length < 2) out.push(base + totalPerpPnl());
  out[out.length - 1] = eq + totalPerpPnl();
  return out;
}
function pagePortfolio(main) {
  const acc = getAccount(), conn = acc.address;
  const tabs = ["Open Positions", "Copy Trading", "Trade History", "Deposits / Withdrawals", "Staking"];
  if (!state.pfTab) state.pfTab = "Open Positions";
  main.innerHTML = `${conn ? "" : `<div class="banner" style="margin-bottom:14px">👛 Connect a wallet to see your portfolio, performance and history. <button class="kx-btn acc sm" id="pf-conn" style="margin-left:auto">Connect wallet</button></div>`}
    <div class="kpis g4" id="pf-kpis"></div>
    <div class="grid" style="grid-template-columns:1.6fr 1fr;margin-top:14px">
      <div class="card" id="pf-eq"></div>
      <div class="card" id="pf-alloc"></div>
    </div>
    <div class="grid g3" style="margin-top:14px"><div class="card" id="pf-perf"></div><div class="card" id="pf-stats"></div><div class="card" id="pf-paper"></div></div>
    <div class="card" style="margin-top:14px"><div class="tabs">${tabs.map((t) => `<div class="tab ${state.pfTab === t ? "on" : ""}" data-pf="${esc(t)}">${t}</div>`).join("")}</div><div id="pf-body"></div></div>`;
  const c = document.getElementById("pf-conn"); if (c) c.onclick = doConnect;
  const paint = () => {
    const m = pfMetrics(), eq = acc.cash + acc.usdt + totalPerpPnl();
    const kpis = [
      { l: "Equity", v: conn ? money(eq) : "— —", c: 0 },
      { l: "Open PnL", v: conn ? signMoney(totalPerpPnl()) : "— —", c: totalPerpPnl() },
      { l: "Realized PnL (all time)", v: conn ? signMoney(m.realized) : "— —", c: m.realized },
      { l: "Win Rate", v: conn ? m.winRate.toFixed(1) + "%" : "— —", c: m.winRate >= 50 ? 1 : -1, note: m.wins + "/" + m.trades },
    ];
    put("pf-kpis", kpis.map((k) => `<div class="kpi"><div class="lbl">${k.l}</div><div class="val ${k.c > 0 ? "up" : k.c < 0 ? "down" : ""}">${k.v}</div>${k.note ? `<div class="muted" style="font-size:11px;margin-top:4px">${k.note}</div>` : ""}</div>`).join(""));
    put("pf-eq", `<h3>Equity Curve <span class="live">LIVE ${EQ}</span></h3>${conn ? areaChart(equitySeries(), { h: 230, color: "#7c3aed", id: "pfeq" }) : `<div class="chart-empty">Connect a wallet</div>`}`);
    const parts = conn ? [{ label: "USDC", v: acc.cash, c: "#7c3aed" }, { label: "USDT", v: acc.usdt, c: "#6366f1" }, ...Object.entries(acc.holdings).filter(([, q]) => q > 1e-9).map(([s, q]) => ({ label: s, v: q * priceOf(s), c: COLOR[s] || "#7d8795" }))] : [];
    const tot = parts.reduce((a, p) => a + p.v, 0) || 1;
    put("pf-alloc", `<h3>Asset Allocation</h3>${conn ? `<div class="row" style="gap:16px;align-items:center"><div>${donut(parts.length ? parts : [{ label: "—", v: 1, c: "#2b3545" }])}</div><div style="flex:1;display:flex;flex-direction:column;gap:6px;font-size:12px">${parts.map((p) => `<div class="row" style="gap:7px"><span style="width:9px;height:9px;border-radius:2px;background:${p.c}"></span>${p.label}<span class="num" style="margin-left:auto;color:var(--mut)">${(p.v / tot * 100).toFixed(1)}%</span></div>`).join("")}</div></div>` : `<div class="chart-empty">Connect a wallet</div>`}`);
    put("pf-perf", `<h3>Performance</h3><div class="kv"><span class="k">Total Trades</span><span class="v">${m.trades}</span></div><div class="kv"><span class="k">Win Rate</span><span class="v ${m.winRate >= 50 ? "up" : "down"}">${m.winRate.toFixed(1)}%</span></div><div class="kv"><span class="k">Best Trade</span><span class="v up">${signMoney(m.best)}</span></div><div class="kv"><span class="k">Worst Trade</span><span class="v down">${signMoney(m.worst)}</span></div><div class="kv"><span class="k">Total Volume</span><span class="v">${compact(m.volume)}</span></div>`);
    put("pf-stats", `<h3>Account</h3><div class="kv"><span class="k">USDC</span><span class="v">${conn ? money(acc.cash) : "— —"}</span></div><div class="kv"><span class="k">USDT</span><span class="v">${conn ? money(acc.usdt) : "— —"}</span></div><div class="kv"><span class="k">Margin in Use</span><span class="v">${conn ? money(perps.reduce((a, p) => a + p.margin, 0)) : "— —"}</span></div><div class="kv"><span class="k">Open Notional</span><span class="v">${conn ? money(perps.reduce((a, p) => a + p.margin * p.lev, 0)) : "— —"}</span></div>`);
    put("pf-paper", `<h3>Paper & Rozetler</h3><div class="kv"><span class="k">Paper Balance</span><span class="v">${conn ? compactN(1240) : "— —"}</span></div><div class="kv"><span class="k">Paper Staked</span><span class="v">${conn ? compactN(820) : "— —"}</span></div><div class="kv"><span class="k">Claimable</span><span class="v">${conn ? "$" + fmt(12.4, 2) : "— —"}</span></div><div class="kv"><span class="k">Rozetler</span><span class="v">${conn ? "🥇".repeat(Math.min(3, Math.max(0, m.wins))) || "—" : "— —"}</span></div>`);
    body();
  };
  const body = () => {
    if (!conn) return put("pf-body", `<div class="empty">Connect a wallet.</div>`);
    if (state.pfTab === "Open Positions") {
      if (!perps.length) return put("pf-body", `<div class="empty">No open positions. Open a trade from the Trade page.</div>`);
      return put("pf-body", `<table class="tb"><thead><tr><th>Asset</th><th>Side</th><th class="num">Size</th><th class="num">Entry</th><th class="num">Mark</th><th class="num">PnL</th><th class="num">Lev</th><th class="num">Margin</th></tr></thead><tbody>${perps.map((p) => { const mark = priceOf(p.sym) || p.entry, pnl = perpPnl(p); return `<tr><td><b>${p.sym}</b></td><td><span class="badge ${p.side}">${p.side}</span></td><td class="num">${fmt(p.margin * p.lev / p.entry, 4)}</td><td class="num">$${fmt(p.entry)}</td><td class="num">$${fmt(mark)}</td><td class="num ${pnl >= 0 ? "up" : "down"}">${signMoney(pnl)}</td><td class="num lev">${p.lev}×</td><td class="num">${money(p.margin)}</td></tr>`; }).join("")}</tbody></table>`);
    }
    if (state.pfTab === "Copy Trading") {
      if (!follows.length) return put("pf-body", `<div class="empty">You're not copying anyone yet. Follow a trader from the Leaderboard with "Copy".</div>`);
      put("pf-body", `<table class="tb"><thead><tr><th>Trader</th><th>Asset</th><th class="num">Allocation</th><th class="num">Leverage</th><th class="num">Kopya PnL</th><th></th></tr></thead><tbody>${follows.map((f) => { const pnl = followPnl(f); return `<tr><td style="font-family:${f.trader.startsWith("0x") ? "monospace;font-size:11px" : "inherit"}">${f.trader.startsWith("0x") ? shortAddr(f.trader) : esc(f.trader)}</td><td><b>${f.asset}</b></td><td class="num">${money(f.alloc)}</td><td class="num lev">${f.lev}×</td><td class="num ${pnl >= 0 ? "up" : "down"}">${signMoney(pnl)}</td><td class="num"><button class="kx-btn sm r" data-unfollow="${f.id}">Stop</button></td></tr>`; }).join("")}</tbody></table>`);
      return document.querySelectorAll("[data-unfollow]").forEach((b) => b.onclick = () => stopFollow(b.dataset.unfollow));
    }
    if (state.pfTab === "Trade History") {
      if (!history.length) return put("pf-body", `<div class="empty">No closed trades yet.</div>`);
      return put("pf-body", `<table class="tb"><thead><tr><th>Asset</th><th>Side</th><th class="num">Lev</th><th class="num">Entry → Exit</th><th class="num">Margin</th><th class="num">PnL</th><th class="num">%</th><th class="num">Exit</th></tr></thead><tbody>${history.map((h) => `<tr><td><b>${h.sym}</b></td><td><span class="badge ${h.side}">${h.side}</span></td><td class="num lev">${h.lev}×</td><td class="num muted">${fmt(h.entry)} → ${fmt(h.exit)}</td><td class="num">${money(h.margin)}</td><td class="num ${h.pnl >= 0 ? "up" : "down"}">${signMoney(h.pnl)}</td><td class="num ${h.pnlPct >= 0 ? "up" : "down"}">${pct(h.pnlPct, 1)}</td><td class="num muted">${ago(h.closeTs)}</td></tr>`).join("")}</tbody></table>`);
    }
    if (state.pfTab === "Deposits / Withdrawals") {
      const ds = acc.orders.filter((o) => o.type === "Deposit" || o.type === "Withdrawal");
      return put("pf-body", ds.length ? `<table class="tb"><thead><tr><th>Type</th><th>Asset</th><th class="num">Amount</th><th>Status</th></tr></thead><tbody>${ds.map((o) => `<tr><td>${o.type}</td><td>${o.asset}</td><td class="num ${o.amt >= 0 ? "up" : "down"}">${(o.amt >= 0 ? "+" : "") + fmt(o.amt, 2)} ${o.asset}</td><td><span class="badge ${o.status === "Beklemede" ? "SHORT" : "LONG"}">${o.status || "—"}</span></td></tr>`).join("")}</tbody></table>` : `<div class="empty">No records.</div>`);
    }
    put("pf-body", `<div style="padding:18px"><div class="kv"><span class="k">Paper Staked</span><span class="v">${compactN(820)} PAPER</span></div><div class="kv"><span class="k">Stake Reward (total)</span><span class="v">$${fmt(312.4, 2)}</span></div><div class="kv"><span class="k">Claimable</span><span class="v up">$${fmt(12.4, 2)}</span></div><div class="row" style="margin-top:12px"><button class="kx-btn g sm" onclick="document.querySelector('[data-go=paper]')?.click()">Go to Paper page</button></div></div>`);
  };
  paint(); document.querySelectorAll("[data-pf]").forEach((t) => t.onclick = () => { state.pfTab = t.dataset.pf; document.querySelectorAll("[data-pf]").forEach((x) => x.classList.toggle("on", x === t)); body(); });
  live.onTick = () => { if (state.route === "portfolio") paint(); };
}

// ================= HOUSE =================
function pageHouse(main) {
  main.innerHTML = `<div class="grid" style="grid-template-columns:1fr 1fr 1.3fr">
    <div class="grid"><div class="card" id="h-pos"></div><div class="card" id="h-paper"></div></div>
    <div class="grid"><div class="card" id="h-stats"></div></div>
    <div class="grid"><div class="card" id="h-before"></div></div>
  </div>
  <div class="grid" style="grid-template-columns:1fr 1.3fr;margin-top:14px">
    <div class="card" id="h-exp"></div><div class="card" id="h-heat"></div>
  </div>
  <div class="grid g2" style="margin-top:14px"><div class="card" id="h-pnl"></div><div class="card" id="h-topo"></div></div>`;
  const paint = () => {
    put("h-pos", wUserPositions()); put("h-paper", wPaper()); put("h-stats", wHouseStats());
    put("h-pnl", `<h3>1% House PnL <span class="muted" style="font-weight:600">BTC</span></h3>${areaChart(P.series.beforePayouts.map((v, i) => v - P.series.beforePayouts[0]), { h: 180, color: P.house.openPnl >= 0 ? "#0ea371" : "#e23950", id: "hpnl" })}`);
    put("h-topo", wTopology());
    put("h-before", `<h3>House Before Payouts <span class="live">LIVE ${EQ}</span></h3><div class="hero-num" style="font-size:28px;margin-bottom:6px">${money(P.house.beforePayouts, 0)}</div>${areaChart(P.series.beforePayouts, { h: 200, color: "#7c3aed", id: "bp" })}`);
    put("h-exp", `<h3>House Exposure</h3><div class="row" style="justify-content:space-between"><span class="up">— BTC Long</span><b>${money(P.pos.byAsset.BTC.long, 0)}</b></div><div class="row" style="justify-content:space-between;margin:6px 0"><span class="down">— BTC Short</span><b>${money(P.pos.byAsset.BTC.short, 0)}</b></div>${areaChart(P.series.funds, { h: 150, color: "#6366f1", id: "hexp" })}`);
    put("h-heat", `<h3>Liquidation Heatmap <span class="muted" style="font-weight:600">BTC · 15m · ±5%</span></h3>${heatmap(P.heatmap, { h: 240 })}<div class="row" style="justify-content:space-between;margin-top:8px;font-size:11px"><span class="muted">$0</span><div style="flex:1;height:6px;border-radius:4px;margin:0 10px;background:linear-gradient(90deg,#6366f1,#f0a93b,#e23950)"></div><span class="muted">${compact(P.house.tvl * 1.2)}</span></div>`);
  };
  paint(); live.onTick = paint;
}

// ================= PAPER (staking) =================
function pagePaper(main) {
  const acc = getAccount(), conn = acc.address;
  main.innerHTML = `<div class="grid" style="grid-template-columns:1fr 1fr 1.3fr">
    <div class="grid">
      <div class="card"><h3>Claimable Rewards</h3><div style="font-size:24px;font-weight:800">${conn ? "$" + fmt(12.4, 2) : "— —"}</div>${conn ? `<button class="kx-btn g sm" id="pp-claim" style="margin-top:10px">Claim</button>` : `<button class="kx-btn acc" id="pp-conn" style="width:100%;margin-top:12px">Connect wallet</button>`}</div>
      <div class="card" id="pp-rewards"></div>
    </div>
    <div class="grid">
      <div class="card"><h3>Paper Staked</h3><div style="font-size:20px;font-weight:800">${conn ? compactN(820) : "— —"}</div><div class="muted" style="margin-top:4px">Paper Wallet Balance: ${conn ? compactN(420) : "— —"}</div>${conn ? `<div class="row" style="margin-top:12px"><button class="kx-btn g sm" id="pp-stake">Stake</button><button class="kx-btn sm" id="pp-unstake">Unstake</button></div>` : ""}</div>
      <div class="card" id="pp-paper"></div>
    </div>
    <div class="grid"><div class="card" id="pp-rev"></div></div>
  </div>
  <div class="grid g2" style="margin-top:14px"><div class="card" id="pp-act"></div><div class="card" id="pp-supply"></div></div>`;
  const c = document.getElementById("pp-conn"); if (c) c.onclick = doConnect;
  const cl = document.getElementById("pp-claim"); if (cl) cl.onclick = () => { deposit("USDC", 12.4); toast("12.40 USDC reward claimed"); go("paper"); };
  const stk = document.getElementById("pp-stake"); if (stk) stk.onclick = () => toast("Stake (demo) — 420 PAPER stake edildi");
  const paint = () => {
    const p = P.paper;
    put("pp-rewards", `<h3>Rewards</h3><div class="kv"><span class="k">Total Staker Rewards</span><span class="v">${compact(p.stakerRewards)}</span></div><div class="kv"><span class="k">Reward Rate</span><span class="v">0% / <b class="warn">${p.rewardRate}%</b> / 99%</span></div><div class="kv"><span class="k">Reward Token</span><span class="v">${p.rewardToken}</span></div>`);
    put("pp-paper", `<h3>Paper</h3><div class="kv"><span class="k">Total Supply</span><span class="v">${compactN(p.totalSupply)}</span></div><div class="kv"><span class="k">Staked Supply</span><span class="v">${compactN(p.stakedSupply)}</span></div><div class="kv"><span class="k">Stake Ratio</span><span class="v">${(p.stakedSupply / p.totalSupply * 100).toFixed(1)}%</span></div><div class="kv"><span class="k">Token</span><span class="v" style="font-family:monospace;font-size:11px">${p.token}</span></div><div class="kv"><span class="k">Staking Contract</span><span class="v" style="font-family:monospace;font-size:11px">${p.stakingContract}</span></div>`);
    put("pp-rev", `<h3>Staking Revenue <span class="live">LIVE ${EQ}</span></h3>${areaChart(P.series.stakingRev, { h: 160, color: "#f0a93b", id: "ppr" })}<div class="kv" style="margin-top:10px"><span class="k">Pending Rewards</span><span class="v">$${fmt(p.pendingRewards, 2)}</span></div><div class="kv"><span class="k">Latest Distribution</span><span class="v">${ago(p.latestDistTs)}</span></div>`);
    put("pp-act", `<h3>Paper Activity <span class="muted" style="font-weight:600">LAST 25</span></h3><table class="tb"><thead><tr><th>Date / Time</th><th>Type</th><th>User</th><th class="num">Amount</th></tr></thead><tbody>${P.activity.map((a) => `<tr><td class="muted">${hhmmss(a.ts)}</td><td><span class="badge SHORT">${a.type}</span></td><td style="font-family:monospace;font-size:11px">${shortAddr(a.user)}</td><td class="num">${fmt(a.amount, 2)}</td></tr>`).join("")}</tbody></table>`);
    put("pp-supply", `<h3>Total Paper Supply <span class="live">LIVE ${EQ}</span></h3>${dualArea(P.series.supplyTotal, P.series.supplyStaked, { h: 200 })}<div class="row" style="gap:16px;margin-top:8px;font-size:12px"><span><b style="color:#7c3aed">—</b> Total</span><span><b style="color:#6366f1">—</b> Staked</span></div>`);
  };
  paint(); live.onTick = paint;
}

// ================= LEADERBOARD =================
function lbAccounts() {
  const map = {};
  for (const e of P.leaderboard) {
    const k = String(e.user);
    (map[k] ||= { user: k, pnl: 0, trades: 0, wins: 0, volume: 0 });
    map[k].pnl += e.pnl; map[k].trades++; if (e.pnl > 0) map[k].wins++; map[k].volume += e.notional;
  }
  return Object.values(map).sort((a, b) => b.pnl - a.pnl);
}
function lbPodium() {
  const top = P.leaderboard.slice(0, 3); if (top.length < 3) return "";
  const med = ["🥇", "🥈", "🥉"];
  return `<div class="grid g3" style="margin:14px 0">${top.map((e, i) => `<div class="pod r${i + 1}">
    <div class="top"><span class="medal">${med[i]}</span><div><div class="who" style="font-family:${String(e.user).startsWith("0x") ? "monospace;font-size:13px" : "inherit"}">${String(e.user).startsWith("0x") ? shortAddr(e.user) : esc(e.user)}</div>
      <div class="muted" style="font-size:12px"><b>${e.asset}</b> <span class="lev">${e.lev}×</span> <span class="badge ${e.side}">${e.side}</span></div></div></div>
    <div class="pnl up">${signMoney(e.pnl, 0)}</div>
    <div class="row" style="justify-content:space-between;margin-top:6px;font-size:12px"><span class="up">${pct(e.pnlPct, 1)}</span><span class="muted">${compact(e.notional)} · ${dur(e.durMs)}</span></div>
  </div>`).join("")}</div>`;
}
function pageLeaderboard(main) {
  const totalPnl = P.leaderboard.reduce((a, e) => a + Math.max(0, e.pnl), 0);
  const totalVol = P.leaderboard.reduce((a, e) => a + e.notional, 0);
  const traders = new Set(P.leaderboard.map((e) => String(e.user))).size;
  main.innerHTML = `<div class="kpis g4" style="margin-bottom:14px">
      <div class="kpi"><div class="lbl">Total Traders</div><div class="val">${traders}</div></div>
      <div class="kpi"><div class="lbl">Total Volume</div><div class="val">${compact(totalVol)}</div></div>
      <div class="kpi"><div class="lbl">Total Realized Profit</div><div class="val up">${compact(totalPnl)}</div></div>
      <div class="kpi"><div class="lbl">Best Trade</div><div class="val up">${signMoney(P.leaderboard[0]?.pnl || 0, 0)}</div></div>
    </div>
    ${lbPodium()}
    <div class="card"><div class="row" style="justify-content:space-between;margin-bottom:12px">
      <div class="row"><div class="seg" style="width:auto"><button class="${state.lbMode === "positions" ? "on long" : ""}" data-lm="positions" style="padding:9px 16px">Positions</button><button class="${state.lbMode === "accounts" ? "on long" : ""}" data-lm="accounts" style="padding:9px 16px">Accounts</button></div>
        <div class="row" style="gap:4px">${["24h", "7d", "30d", "All"].map((r) => `<span class="pill ${state.lbRange === r ? "on" : ""}" data-lr="${r}">${r}</span>`).join("")}</div></div>
      <input class="inp" id="lb-q" placeholder="Search name or address" style="width:220px;padding:0 12px">
    </div><div id="lb-body"></div></div>`;
  const body = () => {
    const q = (document.getElementById("lb-q")?.value || "").toLowerCase();
    if (state.lbMode === "accounts") {
      let list = lbAccounts().filter((e) => !q || e.user.toLowerCase().includes(q));
      return put("lb-body", `<table class="tb"><thead><tr><th>#</th><th>Account</th><th class="num">Realize PnL</th><th class="num">Trade</th><th class="num">Kazanma %</th><th class="num">Volume</th></tr></thead><tbody>${list.map((e, i) => {
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `<span class="muted">${i + 1}</span>`;
        const tint = e.pnl > 0 ? `background:linear-gradient(90deg,rgba(14,163,113,${Math.min(.14, e.pnl / 3e6)}),transparent)` : "";
        return `<tr style="${tint}"><td>${medal}</td><td style="font-family:${e.user.startsWith("0x") ? "monospace;font-size:11px" : "inherit"}">${e.user.startsWith("0x") ? shortAddr(e.user) : esc(e.user)}</td>
          <td class="num ${e.pnl >= 0 ? "up" : "down"}"><b>${signMoney(e.pnl, 0)}</b></td><td class="num">${e.trades}</td><td class="num ${e.wins / e.trades >= .5 ? "up" : "down"}">${(e.wins / e.trades * 100).toFixed(0)}%</td><td class="num muted">${compact(e.volume)}</td></tr>`;
      }).join("")}</tbody></table>`);
    }
    let list = P.leaderboard.filter((e) => !q || String(e.user).toLowerCase().includes(q));
    put("lb-body", `<table class="tb"><thead><tr><th>#</th><th>User</th><th>Asset</th><th class="num">Notional</th><th class="num">Entry → Exit</th><th class="num">PnL</th><th class="num">%</th><th class="num">Margin</th><th class="num">Duration</th><th class="num">Closed</th><th></th></tr></thead><tbody>${list.map((e, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `<span class="muted">${i + 1}</span>`;
      const tint = e.pnl > 0 ? `background:linear-gradient(90deg,rgba(14,163,113,${Math.min(.14, e.pnl / 1.5e6)}),transparent)` : "";
      return `<tr style="${tint}"><td>${medal}</td><td style="font-family:${String(e.user).startsWith("0x") ? "monospace;font-size:11px" : "inherit"}">${String(e.user).startsWith("0x") ? shortAddr(e.user) : esc(e.user)}</td>
        <td><b>${e.asset}</b> <span class="lev">${e.lev}×</span> <span class="badge ${e.side}">${e.side}</span></td>
        <td class="num">${compact(e.notional)}</td><td class="num muted">${fmt(e.entry, 2)} → ${fmt(e.exit, 2)}</td>
        <td class="num ${e.pnl >= 0 ? "up" : "down"}"><b>${signMoney(e.pnl, 0)}</b></td><td class="num ${e.pnlPct >= 0 ? "up" : "down"}">${pct(e.pnlPct, 1)}</td>
        <td class="num">${money(e.margin, 0)}</td><td class="num muted">${dur(e.durMs)}</td><td class="num muted">${ago(e.closedTs)}</td>
        <td class="num"><button class="kx-btn sm" data-copy="${i}">Kopyala</button></td></tr>`;
    }).join("")}</tbody></table>`);
    document.querySelectorAll("[data-copy]").forEach((b) => b.onclick = () => openCopyModal(list[+b.dataset.copy]));
  };
  body();
  document.querySelectorAll("[data-lm]").forEach((b) => b.onclick = () => { state.lbMode = b.dataset.lm; go("leaderboard"); });
  document.querySelectorAll("[data-lr]").forEach((b) => b.onclick = () => { state.lbRange = b.dataset.lr; document.querySelectorAll("[data-lr]").forEach((x) => x.classList.toggle("on", x === b)); });
  const q = document.getElementById("lb-q"); if (q) q.oninput = body;
  live.onTick = () => { if (state.route === "leaderboard") body(); };
}

// ================= REWARDS (XP / quests / referral) =================
function totalVolume() { return history.reduce((a, h) => a + h.margin * h.lev, 0) + perps.reduce((a, p) => a + p.margin * p.lev, 0); }
function baseXP() { return Math.floor(totalVolume() / 500) + history.length * 20 + (getAccount().address ? 50 : 0) + (rewards.streak || 0) * 15; }
function totalXP() { return baseXP() + (rewards.bonusXP || 0); }
function xpLevel(xp) { return Math.floor(Math.sqrt(xp / 80)) + 1; }
function levelFloor(lvl) { return (lvl - 1) * (lvl - 1) * 80; }
function tierName(lvl) { return lvl >= 20 ? "Elmas 💎" : lvl >= 12 ? "Platin" : lvl >= 7 ? "Gold 🥇" : lvl >= 3 ? "Silver 🥈" : "Bronz 🥉"; }
function quests() {
  const vol = totalVolume(), trades = history.length + perps.length;
  const anyTpsl = history.some((h) => h.reason === "TP" || h.reason === "SL") || perps.some((p) => p.tp || p.sl) || rewards.flags.tpsl;
  return [
    { id: "q_first", title: "Open your first position", xp: 50, cur: Math.min(trades, 1), target: 1 },
    { id: "q_five", title: "Execute 5 trades", xp: 120, cur: Math.min(trades, 5), target: 5 },
    { id: "q_vol", title: "Reach $50K trading volume", xp: 200, cur: Math.min(vol, 50000), target: 50000, money: true },
    { id: "q_tpsl", title: "Use TP/SL on a position", xp: 80, cur: anyTpsl ? 1 : 0, target: 1 },
    { id: "q_alarm", title: "Set price alert", xp: 60, cur: (alarms.length || rewards.flags.alarm) ? 1 : 0, target: 1 },
    { id: "q_limit", title: "Create a Limit / Stop / TWAP order", xp: 90, cur: (orders.length || twaps.length || rewards.flags.limit) ? 1 : 0, target: 1 },
    { id: "q_deposit", title: "Deposit", xp: 70, cur: rewards.flags.deposit ? 1 : 0, target: 1 },
    { id: "q_copy", title: "Copy a trader", xp: 150, cur: (follows.length || rewards.flags.copy) ? 1 : 0, target: 1 },
  ];
}
function claimQuest(id) {
  const q = quests().find((x) => x.id === id); if (!q || rewards.claimed.includes(id)) return;
  if (q.cur < q.target) return toast("Task not completed yet", true);
  rewards.claimed.push(id); rewards.bonusXP += q.xp; saveLS(RKEY, rewards); notify(`Task completed · +${q.xp} XP`, "ok"); go("rewards");
}
function claimDaily() {
  const today = new Date().toDateString();
  if (rewards.lastDaily === today) return toast("You already claimed today's reward", true);
  const recent = rewards.lastDaily && (Date.now() - Date.parse(rewards.lastDaily)) < 2 * 86400000;
  rewards.streak = recent ? (rewards.streak || 0) + 1 : 1; rewards.lastDaily = today; rewards.bonusXP += 25;
  saveLS(RKEY, rewards); notify(`Daily check-in · +25 XP · ${rewards.streak} day streak 🔥`, "ok"); go("rewards");
}
function refCode() { const a = getAccount().address || "0x000000"; return "SWEEP-" + a.slice(2, 8).toUpperCase(); }
function refStats() { const a = getAccount().address || "0x0"; let h = 0; for (const c of a) h = (h * 31 + c.charCodeAt(0)) >>> 0; const invited = h % 40; return { invited, earned: invited * 12.5, xp: invited * 30 }; }

function pageRewards(main) {
  const conn = getAccount().address;
  const xp = totalXP(), lvl = xpLevel(xp), lo = levelFloor(lvl), hi = levelFloor(lvl + 1), prog = (xp - lo) / (hi - lo) * 100;
  const rs = refStats(), link = location.origin + "/?ref=" + refCode();
  const claimedDaily = rewards.lastDaily === new Date().toDateString();
  main.innerHTML = `
    <div class="card" style="background:linear-gradient(135deg,rgba(124,58,237,.14),rgba(99,102,241,.06));border-color:var(--line2)">
      <div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <div class="row" style="gap:14px;align-items:center"><div style="width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,var(--acc),var(--acc2));display:grid;place-items:center;color:#fff;font-weight:900;font-size:26px">${lvl}</div>
          <div><div style="font-size:12px;color:var(--mut);text-transform:uppercase;letter-spacing:.6px">Seviye ${lvl} · ${tierName(lvl)}</div>
            <div style="font-size:26px;font-weight:800">${compactN(xp)} XP</div></div></div>
        <div style="flex:1;min-width:220px"><div class="row" style="justify-content:space-between;font-size:11px;color:var(--mut)"><span>Seviye ${lvl}</span><span>${compactN(hi)} XP · Seviye ${lvl + 1}</span></div>
          <div style="height:9px;border-radius:6px;background:var(--panel2);overflow:hidden;margin-top:5px;border:1px solid var(--line)"><div style="height:100%;width:${Math.min(100, prog)}%;background:linear-gradient(90deg,var(--acc),var(--acc2))"></div></div></div>
      </div></div>
    <div class="kpis g4" style="margin-top:14px">
      <div class="kpi"><div class="lbl">Total XP</div><div class="val">${compactN(xp)}</div></div>
      <div class="kpi"><div class="lbl">Seviye</div><div class="val">${lvl} <span class="muted" style="font-size:13px">${tierName(lvl)}</span></div></div>
      <div class="kpi"><div class="lbl">Daily Streak</div><div class="val">${rewards.streak || 0} 🔥</div></div>
      <div class="kpi"><div class="lbl">Invited</div><div class="val">${rs.invited}</div></div>
    </div>
    <div class="grid" style="grid-template-columns:1.4fr 1fr;margin-top:14px">
      <div class="card"><h3>Tasks <span class="muted" style="font-weight:600">${quests().filter((q) => rewards.claimed.includes(q.id)).length}/${quests().length} alındı</span></h3>
        ${quests().map((q) => { const done = q.cur >= q.target, claimed = rewards.claimed.includes(q.id), pr = Math.min(100, q.cur / q.target * 100); return `<div style="padding:10px 0;border-bottom:1px solid var(--line)"><div class="row" style="justify-content:space-between"><span>${q.title}</span><b class="acc" style="color:var(--acc)">+${q.xp} XP</b></div>
          <div class="row" style="gap:10px;margin-top:6px;align-items:center"><div style="flex:1;height:6px;border-radius:4px;background:var(--panel2);overflow:hidden"><div style="height:100%;width:${pr}%;background:${done ? "var(--up)" : "var(--acc)"}"></div></div>
          <span class="muted" style="font-size:11px;white-space:nowrap">${q.money ? "$" + compactN(q.cur) + "/$" + compactN(q.target) : q.cur + "/" + q.target}</span>
          <button class="kx-btn sm ${claimed ? "" : done ? "g" : ""}" data-claimq="${q.id}" ${claimed || !done ? "disabled" : ""} style="opacity:${claimed || !done ? ".5" : "1"}">${claimed ? "Claimed ✓" : "Al"}</button></div></div>`; }).join("")}
      </div>
      <div class="grid">
        <div class="card"><h3>Daily Check-in</h3><div style="font-size:30px;font-weight:800">+25 XP</div><div class="muted" style="margin:4px 0 12px">Streak: ${rewards.streak || 0} days 🔥 — check in daily and grow your streak.</div>
          <button class="kx-btn ${claimedDaily ? "" : "acc"}" id="rw-daily" style="width:100%" ${claimedDaily ? "disabled" : ""}>${claimedDaily ? "Claimed today ✓" : "Claim Daily Reward"}</button></div>
        <div class="card"><h3>Referans Programı</h3>
          <div class="muted" style="font-size:12px;margin-bottom:8px">Invite your friends — earn a bonus of up to 10% of their trading volume + XP.</div>
          <div class="kv"><span class="k">Referans Kodun</span><span class="v">${conn ? refCode() : "— —"}</span></div>
          <div class="kv"><span class="k">Invited</span><span class="v">${rs.invited}</span></div>
          <div class="kv"><span class="k">Total Profit</span><span class="v up">${money(rs.earned)}</span></div>
          <div class="pg-addr" style="display:flex;align-items:center;gap:8px;background:var(--bg2);border:1px solid var(--line);border-radius:8px;padding:9px;margin-top:10px;font-size:11.5px;word-break:break-all"><span style="flex:1;font-family:monospace">${conn ? link : "Connect wallet"}</span><button class="kx-btn sm" id="rw-copy">Kopyala</button></div>
        </div>
      </div>
    </div>`;
  document.querySelectorAll("[data-claimq]").forEach((b) => b.onclick = () => claimQuest(b.dataset.claimq));
  const d = document.getElementById("rw-daily"); if (d) d.onclick = claimDaily;
  const c = document.getElementById("rw-copy"); if (c) c.onclick = () => { navigator.clipboard?.writeText(link).then(() => toast("Referral link copied")).catch(() => toast("Could not copy", true)); };
  live.onTick = () => { if (state.route === "rewards") { /* keep static to avoid flfilcker; xp updates on action */ } };
}

// ================= COPY TRADING =================
function startFollow(entry, alloc) {
  if (!getAccount().address) return doConnect();
  alloc = +alloc; if (!(alloc > 0)) return toast("Enter an allocation amount", true);
  if (alloc > getAccount().cash) return toast("Insufficient USDC balance", true);
  rflag("copy");
  const id = "f" + Date.now(), sym = entry.asset, side = entry.side, px = priceOf(sym) || 1, lev = Math.min(20, entry.lev);
  adjustUSDC(-alloc);
  perps.unshift({ id: Date.now() + Math.floor(Math.random() * 1000), sym, side, margin: alloc, lev, entry: px, tp: null, sl: null, trail: null, ts: Date.now(), copy: id, trader: String(entry.user) });
  saveLS(PKEY, perps);
  follows.unshift({ id, trader: String(entry.user), asset: sym, alloc, lev, realized: 0, startTs: Date.now(), nextTs: Date.now() + 10000 + Math.floor(Math.random() * 18000) });
  saveLS(FKEY, follows);
  notify(`${entry.user} copying · ${money(alloc)} allocated`, "ok"); renderRight();
}
function stopFollow(id) {
  const f = follows.find((x) => x.id === id); if (!f) return;
  for (const p of perps.filter((p) => p.copy === id)) { adjustUSDC(Math.max(0, p.margin + perpPnl(p))); perps = perps.filter((x) => x.id !== p.id); }
  saveLS(PKEY, perps); follows = follows.filter((x) => x.id !== id); saveLS(FKEY, follows);
  notify(`${f.trader} kopyalama durduruldu`, "warn", true); refreshTrade();
}
function copyTick() {
  for (const f of follows) {
    if (Date.now() < f.nextTs) continue;
    f.nextTs = Date.now() + 10000 + Math.floor(Math.random() * 18000);
    for (const p of perps.filter((p) => p.copy === f.id)) { const pnl = perpPnl(p); adjustUSDC(Math.max(0, p.margin + pnl)); f.realized = (f.realized || 0) + pnl; perps = perps.filter((x) => x.id !== p.id); }
    if (f.alloc <= getAccount().cash) { adjustUSDC(-f.alloc); const px = priceOf(f.asset) || 1, side = Math.random() > 0.45 ? "LONG" : "SHORT"; perps.unshift({ id: Date.now() + Math.floor(Math.random() * 1000), sym: f.asset, side, margin: f.alloc, lev: f.lev, entry: px, tp: null, sl: null, trail: null, ts: Date.now(), copy: f.id, trader: f.trader }); }
    saveLS(PKEY, perps); saveLS(FKEY, follows); refreshTrade();
  }
}
function followPnl(f) { return (f.realized || 0) + perps.filter((p) => p.copy === f.id).reduce((a, p) => a + perpPnl(p), 0); }
function openCopyModal(entry) {
  const el = document.createElement("div"); el.className = "ov-modal";
  el.innerHTML = `<div class="box"><h3>Kopyala · ${String(entry.user).startsWith("0x") ? shortAddr(entry.user) : esc(entry.user)}<span class="x">✕</span></h3>
    <div class="kv"><span class="k">Asset</span><span class="v">${entry.asset}/USDC</span></div>
    <div class="kv"><span class="k">Side / Leverage</span><span class="v ${entry.side === "LONG" ? "up" : "down"}">${entry.side} · ${entry.lev}× → ${Math.min(20, entry.lev)}×</span></div>
    <div class="kv"><span class="k">Trader PnL</span><span class="v up">${signMoney(entry.pnl, 0)}</span></div>
    <div class="fld" style="margin-top:10px"><label>Allocation (USDC)</label><div class="inp"><input id="cp-alloc" value="500"><span class="suf">USDC</span></div></div>
    <div class="muted" style="font-size:11px;margin-bottom:12px">Bu trader'ın işlemleri paper hesabında orantılı kopyalanır (kaldıraç maks. 20×). Demo.</div>
    <button class="kx-btn acc" id="cp-go" style="width:100%">Kopyalamaya Start</button></div>`;
  document.body.appendChild(el);
  const close = () => el.remove(); el.querySelector(".x").onclick = close; el.onclick = (e) => { if (e.target === el) close(); };
  el.querySelector("#cp-go").onclick = () => { startFollow(entry, +el.querySelector("#cp-alloc").value); close(); };
}

// ================= CHALLENGE (prop-firm evaluation) =================
const CH_SIZES = [10000, 25000, 50000, 100000];
function startChallenge(size) {
  challenge = { size, startBal: size, startTs: Date.now(), dayStamp: new Date().toDateString(), dayStartEq: size, peakEq: size, status: "active", profitPct: 8, dailyPct: 5, maxPct: 10, minDays: 3 };
  saveLS(CKEY, challenge); notify(`Challenge started · ${compact(size)} evaluation account`, "ok"); go("challenge");
}
function challengeEquity() { if (!challenge) return 0; const realized = history.filter((h) => h.closeTs >= challenge.startTs).reduce((a, h) => a + h.pnl, 0); return challenge.startBal + realized + totalPerpPnl(); }
function challengeDays() { if (!challenge) return 0; const s = new Set(); for (const h of history) if (h.closeTs >= challenge.startTs) s.add(new Date(h.openTs || h.closeTs).toDateString()); for (const p of perps) s.add(new Date(p.ts).toDateString()); return s.size; }
function checkChallenge() {
  if (!challenge || challenge.status !== "active") return;
  const eq = challengeEquity(), today = new Date().toDateString();
  if (challenge.dayStamp !== today) { challenge.dayStamp = today; challenge.dayStartEq = eq; saveLS(CKEY, challenge); }
  if (eq > challenge.peakEq) { challenge.peakEq = eq; saveLS(CKEY, challenge); }
  const fail = (reason) => { challenge.status = "failed"; challenge.reason = reason; saveLS(CKEY, challenge); notify("Challenge failed · " + reason, "err"); if (state.route === "challenge") go("challenge"); };
  if (challenge.dayStartEq - eq > challenge.startBal * challenge.dailyPct / 100) return fail("daily loss limit exceeded");
  if (eq < challenge.startBal * (1 - challenge.maxPct / 100)) return fail("maximum drawdown exceeded");
  if (eq >= challenge.startBal * (1 + challenge.profitPct / 100) && challengeDays() >= challenge.minDays) { challenge.status = "funded"; saveLS(CKEY, challenge); notify("🎉 Challenge passed! Funded account opened · 80% profit share", "ok"); if (state.route === "challenge") go("challenge"); }
}
function pageChallenge(main) {
  if (!challenge) {
    main.innerHTML = `<div class="card" style="max-width:860px;margin:0 auto">
      <h3 style="font-size:16px;text-transform:none;letter-spacing:0;color:var(--text)">Challenge (Evaluation Account)</h3>
      <div class="muted" style="margin-bottom:16px">Choose an evaluation account, follow the rules to reach the profit target, <b>funded</b> ol. (Paper · demo — ücretsiz)</div>
      <div class="grid g4" style="margin-bottom:18px">${CH_SIZES.map((s) => `<div class="card" style="text-align:center;cursor:pointer" data-buy="${s}"><div class="muted" style="font-size:11px">ACCOUNT</div><div style="font-size:26px;font-weight:800;margin:6px 0">${compact(s)}</div><button class="kx-btn acc sm" data-buy2="${s}">Start</button></div>`).join("")}</div>
      <div class="grid g3">
        <div class="card"><div class="lbl" style="color:var(--mut);font-size:11px;text-transform:uppercase">Profit Target</div><div style="font-size:22px;font-weight:800;color:var(--up)">%8</div></div>
        <div class="card"><div class="lbl" style="color:var(--mut);font-size:11px;text-transform:uppercase">Daily Max Loss</div><div style="font-size:22px;font-weight:800;color:var(--warn)">%5</div></div>
        <div class="card"><div class="lbl" style="color:var(--mut);font-size:11px;text-transform:uppercase">Total Max Drawdown</div><div style="font-size:22px;font-weight:800;color:var(--down)">%10</div></div>
      </div>
      <div class="muted" style="font-size:12px;margin-top:12px">Min. trading days: 3 · If you pass, on a funded account <b>80% profit share</b>.</div></div>`;
    main.querySelectorAll("[data-buy2]").forEach((b) => b.onclick = () => startChallenge(+b.dataset.buy2));
    return;
  }
  const paint = () => {
    const eq = challengeEquity(), pnl = eq - challenge.startBal, pnlPct = pnl / challenge.startBal * 100;
    const target = challenge.startBal * challenge.profitPct / 100, profProg = Math.max(0, Math.min(100, pnl / target * 100));
    const dailyLoss = Math.max(0, challenge.dayStartEq - eq), dailyLimit = challenge.startBal * challenge.dailyPct / 100;
    const dd = Math.max(0, challenge.startBal - eq), ddLimit = challenge.startBal * challenge.maxPct / 100;
    const days = challengeDays();
    const badge = challenge.status === "funded" ? `<span class="badge long" style="font-size:13px;padding:5px 12px">✅ FUNDED</span>` : challenge.status === "failed" ? `<span class="badge short" style="font-size:13px;padding:5px 12px">❌ FAILED</span>` : `<span class="badge" style="background:rgba(124,58,237,.15);color:var(--acc);font-size:13px;padding:5px 12px">⏳ EVALUATION</span>`;
    const bar = (label, cur, lim, color, money2) => `<div class="card"><div class="row" style="justify-content:space-between"><span class="muted" style="font-size:12px">${label}</span><span style="font-weight:700;font-size:13px">${money2 ? money(cur) : cur} / ${money2 ? money(lim) : lim}</span></div><div style="height:9px;border-radius:6px;background:var(--panel2);overflow:hidden;margin-top:7px;border:1px solid var(--line)"><div style="height:100%;width:${Math.min(100, cur / lim * 100)}%;background:${color};transition:width .3s"></div></div></div>`;
    main.innerHTML = `<div class="card" style="margin-bottom:14px"><div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div><div class="muted" style="font-size:12px">${compact(challenge.size)} Evaluation Account</div><div style="font-size:28px;font-weight:800">${money(eq)}</div>
          <div class="${pnl >= 0 ? "up" : "down"}" style="font-weight:700">${signMoney(pnl)} (${pct(pnlPct, 2)})</div></div>
        <div style="text-align:right">${badge}<div class="muted" style="font-size:12px;margin-top:8px">Trading day: <b style="color:var(--text)">${days}/${challenge.minDays}</b></div>
          ${challenge.status !== "active" ? `<button class="kx-btn sm" id="ch-reset" style="margin-top:8px">Yeni Challenge</button>` : ""}</div></div></div>
      <div class="card" style="margin-bottom:14px"><div class="row" style="justify-content:space-between"><span class="muted" style="font-size:12px">Profit Target (%${challenge.profitPct})</span><span style="font-weight:700">${money(Math.max(0, pnl))} / ${money(target)}</span></div>
        <div style="height:12px;border-radius:7px;background:var(--panel2);overflow:hidden;margin-top:7px;border:1px solid var(--line)"><div style="height:100%;width:${profProg}%;background:linear-gradient(90deg,var(--acc),var(--up))"></div></div></div>
      <div class="grid g3">
        ${bar(`Daily Loss (limit ${challenge.dailyPct})`, dailyLoss, dailyLimit, "var(--warn)", true)}
        ${bar(`Total Drawdown (limit %${challenge.maxPct})`, dd, ddLimit, "var(--down)", true)}
        ${bar("Trading Day", days, challenge.minDays, "var(--acc)", false)}
      </div>
      ${challenge.reason ? `<div class="warnbox danger" style="margin-top:14px">❌ ${challenge.reason}. You can start a new challenge.</div>` : challenge.status === "funded" ? `<div class="warnbox" style="margin-top:14px;background:rgba(46,230,160,.1);border-color:rgba(46,230,160,.4);color:var(--up)">🎉 Congratulations! You earned a funded account — keep trading with 80% profit share.</div>` : ""}
      <div class="card" style="margin-top:14px"><h3>Kurallar</h3><div class="kv"><span class="k">Profit Target</span><span class="v up">%${challenge.profitPct} (${money(target)})</span></div><div class="kv"><span class="k">Daily Max Loss</span><span class="v warn">%${challenge.dailyPct} (${money(dailyLimit)})</span></div><div class="kv"><span class="k">Total Max Drawdown</span><span class="v down">%${challenge.maxPct} (${money(ddLimit)})</span></div><div class="kv"><span class="k">Min. Trading Days</span><span class="v">${challenge.minDays}</span></div><div class="kv"><span class="k">Profit Share</span><span class="v">%80</span></div></div>`;
    const r = document.getElementById("ch-reset"); if (r) r.onclick = () => { challenge = null; saveLS(CKEY, challenge); go("challenge"); };
  };
  paint(); live.onTick = () => { if (state.route === "challenge") paint(); };
}

// ================= modals =================
function openModal(kind) {
  const acc = getAccount(), conn = acc.address;
  let asset = "USDC";
  const el = document.createElement("div"); el.className = "ov-modal";
  const render = () => {
    el.innerHTML = `<div class="box"><h3>${kind === "deposit" ? "Deposit" : "Withdraw"} ${asset}<span class="x">✕</span></h3>${!conn
      ? `<div class="empty">Connect a wallet to trade.<br><br><button class="kx-btn acc" id="m-conn">Connect wallet</button></div>`
      : `<div class="fld"><label>Asset</label><div class="seg" id="m-ast">${STABLES.map((a) => `<button class="${a === asset ? "on long" : ""}" data-ast="${a}" style="padding:9px">${a}</button>`).join("")}</div></div>
         <div class="fld"><label>Amount (${asset}) <span style="float:right" class="muted">Balance: ${fmt(balanceOf(asset), 2)}</span></label><div class="inp"><input id="m-amt" placeholder="0.00"><span class="suf" style="cursor:pointer" id="m-max">MAX</span></div></div>
         ${kind === "withdraw" ? `<div class="fld"><label>Address</label><div class="inp"><input id="m-addr" placeholder="0x…" value="${conn}"></div></div>` : ""}
         <div class="muted" style="font-size:11px;margin:4px 0 14px">⚠️ Demo mode — no real fund transfer; only your demo ${asset} balance is updated.</div>
         <button class="kx-btn ${kind === "deposit" ? "g" : "r"}" id="m-go" style="width:100%">${kind === "deposit" ? "Deposit" : "Withdraw"} ${asset}</button>`}</div>`;
    el.querySelector(".x").onclick = close;
    const mc = el.querySelector("#m-conn"); if (mc) mc.onclick = async () => { await doConnect(); close(); openModal(kind); };
    el.querySelectorAll("[data-ast]").forEach((b) => b.onclick = () => { asset = b.dataset.ast; render(); });
    const mx = el.querySelector("#m-max"); if (mx) mx.onclick = () => el.querySelector("#m-amt").value = kind === "withdraw" ? balanceOf(asset) : 1000;
    const mg = el.querySelector("#m-go"); if (mg) mg.onclick = () => {
      const amt = +el.querySelector("#m-amt").value;
      try { if (kind === "deposit") { deposit(asset, amt); rflag("deposit"); } else withdraw(asset, amt, el.querySelector("#m-addr").value.trim()); notify(`${kind === "deposit" ? "Deposit" : "Withdrawal request"} · ${fmt(amt, 2)} ${asset}`, "money"); close(); renderRight(); go(state.route); } catch (e) { toast(e.message, true); }
    };
  };
  const close = () => el.remove();
  document.body.appendChild(el); render();
  el.onclick = (e) => { if (e.target === el) close(); };
}

function toast(msg, err) {
  document.querySelectorAll(".toast").forEach((t) => t.remove());
  const el = document.createElement("div"); el.className = "toast" + (err ? " err" : "");
  el.innerHTML = `<b>${err ? "⚠️" : "✅"} ${esc(msg)}</b>`;
  document.body.appendChild(el); setTimeout(() => el.remove(), 3000);
}
// ---- notification center ----
const NICON = { ok: "✅", warn: "⚠️", err: "🛑", info: "🔔", trade: "📈", money: "💵", fund: "💸", liq: "💥" };
function notify(msg, type = "ok", silent) {
  notifs.unshift({ id: Date.now() + "-" + Math.round(Math.random() * 1e6), ts: Date.now(), type, msg, read: false });
  notifs = notifs.slice(0, 50); saveLS(NKEY, notifs);
  updateBell();
  if (!silent) toast(msg, type === "err" || type === "warn");
}
function unreadCount() { return notifs.filter((n) => !n.read).length; }
function updateBell() {
  const b = document.getElementById("kxbell"); if (!b) return;
  const u = unreadCount();
  b.querySelector(".nbadge")?.remove();
  if (u) { const s = document.createElement("span"); s.className = "nbadge"; s.textContent = u > 9 ? "9+" : u; b.appendChild(s); }
  const list = document.getElementById("kx-ndrop-list"); if (list) list.innerHTML = notifListHTML();
}
function notifListHTML() {
  if (!notifs.length) return `<div class="nempty">No notifications yet.</div>`;
  return notifs.map((n) => `<div class="nitem ${n.read ? "" : "unread"} ${n.type}"><span class="ni">${NICON[n.type] || "🔔"}</span><div><div class="nx">${esc(n.msg)}</div><div class="nt">${ago(n.ts)}</div></div></div>`).join("");
}
function toggleNotifs() {
  let d = document.getElementById("kx-ndrop");
  if (d) { d.remove(); return; }
  d = document.createElement("div"); d.className = "ndrop"; d.id = "kx-ndrop";
  d.innerHTML = `<div class="nh"><b>Notifications</b><a id="kx-nread">Mark all as read</a></div><div class="nl" id="kx-ndrop-list">${notifListHTML()}</div>`;
  document.querySelector(".kx-head").appendChild(d);
  d.querySelector("#kx-nread").onclick = () => { notifs.forEach((n) => (n.read = true)); saveLS(NKEY, notifs); updateBell(); };
  setTimeout(() => document.addEventListener("click", closeNotifs), 0);
}
function closeNotifs(e) {
  if (e.target.closest("#kx-ndrop") || e.target.closest("#kxbell")) return;
  document.getElementById("kx-ndrop")?.remove(); document.removeEventListener("click", closeNotifs);
}
