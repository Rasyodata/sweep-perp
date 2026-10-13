// Exchange sub-pages (original design) — Markets, Wallet, Deposit, Withdraw, Orders.
// Live Binance data for prices; wallet.mjs for the demo paper account.
// Deposit/withdraw are DEMO ONLY — no real funds ever move.

import { SYMBOLS, fetchTickers, fetchKlines } from "/market.mjs";
import { getAccount, holdQty, deposit, withdraw, connectWallet, disconnectWallet, resetDemo, onChange } from "/wallet.mjs";

const CSS = `
.pg{--up:#16c784;--down:#ea3943;--card:#161b22;--line:#30363d;--mut:#8b949e;--acc:#4f8cff;--chip:#1f2937;--txt:#e6edf3;display:flex;flex-direction:column;gap:16px}
.pg h2{margin:0;font-size:22px}.pg .sub{color:var(--mut);font-size:13px;margin-top:2px}
.pg .top{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap}
.pg-card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px}
.pg-grid{display:grid;gap:16px}
.pg table{width:100%;border-collapse:collapse;font-size:13px}
.pg th{color:var(--mut);font-weight:500;text-align:left;padding:9px 8px;border-bottom:1px solid var(--line);font-size:11px;text-transform:uppercase;letter-spacing:.4px}
.pg td{padding:11px 8px;border-bottom:1px solid #21262d}
.pg tr:last-child td{border-bottom:0}
.pg .num{text-align:right;font-variant-numeric:tabular-nums}
.pg .up{color:var(--up)}.pg .down{color:var(--down)}
.pg .mrow{cursor:pointer;transition:background .15s}.pg .mrow:hover{background:#1c2128}
.pg-sym{display:flex;align-items:center;gap:10px}
.pg-ic{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:700;color:#0d1117}
.pg-sym small{color:var(--mut);display:block;font-size:11px}
.cellflash-u{animation:cfu .7s ease-out}.cellflash-d{animation:cfd .7s ease-out}
@keyframes cfu{0%{background:rgba(22,199,132,.28)}100%{background:transparent}}
@keyframes cfd{0%{background:rgba(234,57,67,.28)}100%{background:transparent}}
.pg input,.pg select{background:#0d1117;color:var(--txt);border:1px solid var(--line);border-radius:8px;padding:10px 12px;font:inherit;outline:none}
.pg input:focus,.pg select:focus{border-color:var(--acc)}
.pg .search{min-width:220px}
.pg-btn{background:var(--chip);border:1px solid var(--line);color:var(--txt);border-radius:8px;padding:9px 14px;font:inherit;font-weight:600;cursor:pointer;transition:.15s}
.pg-btn:hover{border-color:var(--acc)}
.pg-btn.p{background:var(--acc);border-color:var(--acc);color:#fff}
.pg-btn.g{background:var(--up);border-color:var(--up);color:#06281b}
.pg-btn.r{background:var(--down);border-color:var(--down);color:#fff}
.pg-btn.sm{padding:5px 10px;font-size:12px;font-weight:500}
.pg-hero{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px}
.pg-stat .l{color:var(--mut);font-size:11px;text-transform:uppercase;letter-spacing:.7px}
.pg-stat .v{font-size:28px;font-weight:800;margin-top:6px;font-variant-numeric:tabular-nums}
.pg-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.pg-field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
.pg-field label{font-size:12px;color:var(--mut)}
.pg-field .inp{display:flex;align-items:center;background:#0d1117;border:1px solid var(--line);border-radius:8px;padding:0 12px}
.pg-field .inp:focus-within{border-color:var(--acc)}
.pg-field .inp input{border:0;background:transparent;flex:1;padding:11px 0}
.pg-field .inp .max{color:var(--acc);cursor:pointer;font-size:12px;font-weight:600}
.pg-warn{background:rgba(243,186,47,.1);border:1px solid rgba(243,186,47,.35);color:#f3ba2f;border-radius:10px;padding:11px 14px;font-size:12.5px;line-height:1.5}
.pg-addr{display:flex;align-items:center;gap:10px;background:#0d1117;border:1px solid var(--line);border-radius:8px;padding:12px;font-family:ui-monospace,monospace;font-size:12.5px;word-break:break-all}
.pg-qr{background:#fff;padding:10px;border-radius:12px;width:168px;height:168px}
.pg-conn{display:flex;align-items:center;gap:10px;font-size:13px}
.pg-dotg{width:9px;height:9px;border-radius:50%;background:var(--up);box-shadow:0 0 8px var(--up)}
.pg-badge{font-size:11px;padding:3px 9px;border-radius:6px;font-weight:600}
.pg-badge.ok{background:rgba(22,199,132,.15);color:var(--up)}
.pg-badge.pend{background:rgba(243,186,47,.15);color:#f3ba2f}
.pg-empty{color:var(--mut);text-align:center;padding:40px;font-size:14px}
.pg-toast{position:fixed;right:20px;bottom:20px;background:var(--card);border:1px solid var(--line);border-left:3px solid var(--up);border-radius:10px;padding:12px 16px;font-size:13px;box-shadow:0 8px 28px rgba(0,0,0,.45);z-index:999;animation:ptin .25s ease}
.pg-toast.err{border-left-color:var(--down)}
@keyframes ptin{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.pg-tabs{display:flex;gap:6px;flex-wrap:wrap}
.pg-chip{background:var(--chip);border:1px solid var(--line);color:var(--txt);border-radius:8px;padding:9px 13px;cursor:pointer;font-size:13px}
.pg-chip.on{background:#0d2a52;border-color:var(--acc);color:#fff}
`;

const dp = (v) => (v >= 1000 ? 2 : v >= 1 ? 3 : v >= 0.01 ? 5 : 6);
const fmt = (v, d) => (v == null || isNaN(v)) ? "—" : (+v).toLocaleString("en-US", { minimumFractionDigits: d ?? dp(v), maximumFractionDigits: d ?? dp(v) });
const money = (v) => "$" + fmt(v, 2);
const pct = (v) => (v == null || isNaN(v)) ? "—" : (v >= 0 ? "+" : "") + (+v).toFixed(2) + "%";
const compact = (v) => v >= 1e9 ? "$" + (v / 1e9).toFixed(2) + "B" : v >= 1e6 ? "$" + (v / 1e6).toFixed(1) + "M" : "$" + fmt(v, 0);
const bySym = Object.fromEntries(SYMBOLS.map((x) => [x.s, x]));
const ASSETS = ["USDT", ...SYMBOLS.map((x) => x.s)];

function ensureCSS() { if (!document.getElementById("pg-css")) { const s = document.createElement("style"); s.id = "pg-css"; s.textContent = CSS; document.head.appendChild(s); } }
function toast(msg, err) {
  document.querySelectorAll(".pg-toast").forEach((t) => t.remove());
  const el = document.createElement("div"); el.className = "pg-toast" + (err ? " err" : "");
  el.innerHTML = `<b>${err ? "⚠️" : "✅"} ${msg}</b><div style="color:#8b949e;font-size:11px;margin-top:3px">Paper trading · demo balance</div>`;
  document.body.appendChild(el); setTimeout(() => el.remove(), 3200);
}

// deterministic faux-QR (decorative, clearly demo — not scannable)
function fauxQR(seedStr) {
  let h = 2166136261; for (const ch of seedStr) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const N = 21, cell = 148 / N; let r = h >>> 0;
  const nxt = () => (r = (Math.imul(r, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff;
  let rects = "";
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const finder = (x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7);
    const on = finder ? ((x === 0 || x === 6 || y === 0 || y === 6 || (x > 1 && x < 5 && y > 1 && y < 5)) && !(x > 6 || y > 6) ? true : (x >= N - 7 ? (x === N - 7 || x === N - 1 || y === 0 || y === 6 || (x > N - 6 && x < N - 2 && y > 1 && y < 5)) : (y >= N - 7 ? (x === 0 || x === 6 || y === N - 7 || y === N - 1 || (x > 1 && x < 5 && y > N - 6 && y < N - 2)) : false))) : nxt() > 0.5;
    if (on) rects += `<rect x="${(x * cell).toFixed(1)}" y="${(y * cell).toFixed(1)}" width="${cell.toFixed(1)}" height="${cell.toFixed(1)}" fill="#0d1117"/>`;
  }
  return `<svg class="pg-qr" viewBox="0 0 148 148">${rects}</svg>`;
}
function demoAddress(asset, seed) {
  let h = 5381; for (const ch of (asset + seed)) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  const hex = (n) => (n >>> 0).toString(16).padStart(8, "0");
  const body = Array.from({ length: 5 }, (_, i) => hex(h ^ (i * 2654435761))).join("");
  return "0x" + body.slice(0, 40);
}

// ---------- router entry ----------
let stop = null;
export const EXCHANGE_NAV = [
  { key: "markets", icon: "📈", title: "Piyasalar" },
  { key: "wallet", icon: "👛", title: "Wallet" },
  { key: "deposit", icon: "⬇️", title: "Deposit" },
  { key: "withdraw", icon: "⬆️", title: "Withdraw" },
  { key: "orders", icon: "🧾", title: "Emirlerim" },
];

export function renderExchangePage(key, main, nav) {
  ensureCSS();
  if (stop) { stop(); stop = null; }
  const R = { markets: renderMarkets, wallet: renderWallet, deposit: renderDeposit, withdraw: renderWithdraw, orders: renderOrders }[key];
  stop = R ? R(main, nav) : null;
  return stop;
}
export function stopExchangePage() { if (stop) { stop(); stop = null; } }

// ---------- Markets ----------
function renderMarkets(main, nav) {
  const rows = SYMBOLS.map((x) => ({ ...x, price: null, prev: null, chg: null, high: null, low: null, vol: null, spark: [] }));
  const byS = Object.fromEntries(rows.map((r) => [r.s, r]));
  const st = { q: "", sort: "vol" };
  main.innerHTML = `<div class="pg" id="pg">
    <div class="top"><div><h2>Markets</h2><div class="sub">Live Binance USDⓈ-M Futures · ${rows.length} pairs</div></div>
      <div class="pg-row"><input class="search" id="pgq" placeholder="Ara (BTC, ETH…)"/>
        <div class="pg-tabs"><span class="pg-chip on" data-sort="vol">Volume</span><span class="pg-chip" data-sort="gain">Gainers</span><span class="pg-chip" data-sort="lose">Düşenler</span></div></div></div>
    <div class="pg-card" style="padding:6px 10px"><table><thead><tr>
      <th>#</th><th>Pair</th><th class="num">Last Price</th><th class="num">24h %</th><th class="num">24h High</th><th class="num">24h Low</th><th class="num">Volume (USDT)</th><th class="num">Grafik</th><th></th>
    </tr></thead><tbody id="pgbody"></tbody></table></div></div>`;

  const body = () => {
    let list = rows.filter((r) => !st.q || r.s.includes(st.q) || r.n.toUpperCase().includes(st.q));
    if (st.sort === "vol") list.sort((a, b) => (b.vol || 0) - (a.vol || 0));
    if (st.sort === "gain") list.sort((a, b) => (b.chg || -999) - (a.chg || -999));
    if (st.sort === "lose") list.sort((a, b) => (a.chg || 999) - (b.chg || 999));
    document.getElementById("pgbody").innerHTML = list.map((r, i) => `<tr class="mrow" data-sym="${r.s}">
      <td style="color:var(--mut)">${i + 1}</td>
      <td><div class="pg-sym"><div class="pg-ic" style="background:${r.c}">${r.s[0]}</div><div><b>${r.s}/USDT</b><small>${r.n}</small></div></div></td>
      <td class="num ${r.price > r.prev ? "cellflash-u" : r.price < r.prev ? "cellflash-d" : ""}">$${fmt(r.price)}</td>
      <td class="num ${(r.chg || 0) >= 0 ? "up" : "down"}">${pct(r.chg)}</td>
      <td class="num">$${fmt(r.high)}</td><td class="num">$${fmt(r.low)}</td>
      <td class="num">${r.vol ? compact(r.vol) : "—"}</td>
      <td class="num">${spark(r.spark, (r.chg || 0) >= 0)}</td>
      <td class="num"><button class="pg-btn p sm" data-trade="${r.s}">Trade</button></td></tr>`).join("");
  };
  const refresh = async () => {
    try { const t = await fetchTickers(SYMBOLS.map((x) => x.sym)); for (const r of rows) { const d = t[r.sym]; if (d) { r.prev = r.price; r.price = d.price; r.chg = d.chg; r.high = d.high; r.low = d.low; r.vol = d.vol; } } body(); } catch {}
  };
  Promise.all(rows.map(async (r) => { try { const k = await fetchKlines(r.sym, "1h", 24); r.spark = k.map((c) => c.c); } catch {} })).then(body);
  refresh();
  const el = document.getElementById("pg");
  el.querySelector("#pgq").oninput = (e) => { st.q = e.target.value.toUpperCase().trim(); body(); };
  el.querySelectorAll("[data-sort]").forEach((c) => c.onclick = () => { st.sort = c.dataset.sort; el.querySelectorAll(".pg-chip").forEach((x) => x.classList.toggle("on", x === c)); body(); });
  el.addEventListener("click", (e) => { const t = e.target.closest("[data-trade]") || e.target.closest("[data-sym]"); if (t) nav("overview", { sym: t.dataset.trade || t.dataset.sym }); });
  const iv = setInterval(refresh, 1500);
  return () => clearInterval(iv);
}
function spark(data, up, w = 90, h = 28) {
  if (!data || data.length < 2) return "";
  const mn = Math.min(...data), mx = Math.max(...data), r = mx - mn || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - mn) / r) * (h - 4) - 2}`).join(" ");
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:inline-block;vertical-align:middle"><polyline fill="none" stroke="${up ? "#16c784" : "#ea3943"}" stroke-width="1.5" points="${pts}"/></svg>`;
}

// ---------- Wallet ----------
function renderWallet(main, nav) {
  const prices = {};
  const draw = () => {
    const acc = getAccount();
    const hold = Object.entries(acc.holdings).filter(([, q]) => q > 1e-12).map(([s, qty]) => {
      const c = bySym[s] || { c: "#8b949e", n: s }, p = prices[s] || 0;
      return { s, qty, n: c.n, color: c.c, price: p, val: qty * p, chg: prices["_chg_" + s] || 0 };
    });
    const invested = hold.reduce((a, h) => a + h.val, 0), total = invested + acc.cash;
    const conn = acc.address;
    main.innerHTML = `<div class="pg" id="pg">
      <div class="top"><div><h2>Wallet</h2><div class="sub">Paper trading balance · valued at real prices</div></div>
        <div class="pg-row">${conn
          ? `<div class="pg-conn"><span class="pg-dotg"></span>${conn.slice(0, 6)}…${conn.slice(-4)}</div><button class="pg-btn sm" id="pgdisc">Disconnect</button>`
          : `<button class="pg-btn p" id="pgconn">🦊 Connect Wallet</button>`}</div></div>
      <div class="pg-card"><div class="pg-hero">
        <div class="pg-stat"><div class="l">Total Assets</div><div class="v">${money(total)}</div></div>
        <div class="pg-stat"><div class="l">Available (USDT)</div><div class="v">${money(acc.cash)}</div></div>
        <div class="pg-stat"><div class="l">In Use</div><div class="v">${money(invested)}</div></div>
        <div class="pg-stat"><div class="l">Assets</div><div class="v">${hold.length}</div></div>
      </div><div class="pg-row" style="margin-top:16px"><button class="pg-btn g" id="pgdep">⬇️ Deposit</button><button class="pg-btn" id="pgwd">⬆️ Withdraw</button></div></div>
      <div class="pg-card"><table><thead><tr><th>Asset</th><th class="num">Amount</th><th class="num">Price</th><th class="num">Value</th><th class="num">24h %</th><th></th></tr></thead>
        <tbody>
        <tr><td><div class="pg-sym"><div class="pg-ic" style="background:#4f8cff">$</div><div><b>USDT</b><small>TetherUS</small></div></div></td>
          <td class="num">${fmt(acc.cash, 2)}</td><td class="num">$1.00</td><td class="num">${money(acc.cash)}</td><td class="num">—</td><td></td></tr>
        ${hold.map((h) => `<tr><td><div class="pg-sym"><div class="pg-ic" style="background:${h.color}">${h.s[0]}</div><div><b>${h.s}</b><small>${h.n}</small></div></div></td>
          <td class="num">${fmt(h.qty)}</td><td class="num">$${fmt(h.price)}</td><td class="num">${money(h.val)}</td>
          <td class="num ${h.chg >= 0 ? "up" : "down"}">${pct(h.chg)}</td>
          <td class="num"><button class="pg-btn p sm" data-trade="${h.s}">Trade</button></td></tr>`).join("")}
        </tbody></table></div></div>`;
    const el = document.getElementById("pg");
    el.querySelector("#pgdep").onclick = () => nav("deposit");
    el.querySelector("#pgwd").onclick = () => nav("withdraw");
    el.querySelectorAll("[data-trade]").forEach((b) => b.onclick = () => nav("overview", { sym: b.dataset.trade }));
    const c = el.querySelector("#pgconn"); if (c) c.onclick = async () => { try { await connectWallet(); toast("Wallet connected"); draw(); } catch (e) { toast(e.message, true); } };
    const d = el.querySelector("#pgdisc"); if (d) d.onclick = () => { disconnectWallet(); toast("Disconnected"); draw(); };
  };
  const refresh = async () => { try { const t = await fetchTickers(SYMBOLS.map((x) => x.sym)); for (const x of SYMBOLS) { if (t[x.sym]) { prices[x.s] = t[x.sym].price; prices["_chg_" + x.s] = t[x.sym].chg; } } draw(); } catch {} };
  draw(); refresh();
  const iv = setInterval(refresh, 2000);
  const un = onChange(draw);
  return () => { clearInterval(iv); un(); };
}

// ---------- Deposit ----------
function renderDeposit(main, nav) {
  const st = { asset: "USDT" };
  const draw = () => {
    const addr = demoAddress(st.asset, "sweep-deposit");
    main.innerHTML = `<div class="pg" id="pg">
      <div class="top"><div><h2>Deposit</h2><div class="sub">Select an asset and view its deposit address</div></div></div>
      <div class="pg-warn">⚠️ <b>Demo modu:</b> This is a paper-trading app. The address below is <b>not real</b>; do not send real crypto here. For testing "Add demo balance" button.</div>
      <div class="pg-card"><div class="pg-field"><label>Asset</label>
        <select id="pgasset">${ASSETS.map((a) => `<option ${a === st.asset ? "selected" : ""}>${a}</option>`).join("")}</select></div>
        <div class="pg-field"><label>Network</label><select id="pgnet"><option>BEP20 (BSC)</option><option>ERC20</option><option>TRC20</option><option>Arbitrum</option></select></div>
        <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:center">
          ${fauxQR(addr)}
          <div style="flex:1;min-width:240px">
            <label style="font-size:12px;color:var(--mut)">${st.asset} Deposit Address</label>
            <div class="pg-addr" style="margin-top:6px"><span style="flex:1" id="pgaddr">${addr}</span><button class="pg-btn sm" id="pgcopy">Kopyala</button></div>
            <div style="color:var(--mut);font-size:12px;margin-top:10px">Min. deposit: 0.0001 ${st.asset} · Est. arrival: ~1 min (demo)</div>
          </div></div></div>
      <div class="pg-card"><h3 style="margin:0 0 12px;font-size:14px">Add Demo Balance (test)</h3>
        <div class="pg-row"><input id="pgamt" placeholder="Amount" style="flex:1;min-width:160px"/>
          <button class="pg-btn g" id="pgadd">+ ${st.asset} Ekle</button></div></div></div>`;
    const el = document.getElementById("pg");
    el.querySelector("#pgasset").onchange = (e) => { st.asset = e.target.value; draw(); };
    el.querySelector("#pgcopy").onclick = () => { navigator.clipboard?.writeText(addr).then(() => toast("Address copied")).catch(() => toast("Could not copy", true)); };
    el.querySelector("#pgadd").onclick = () => {
      const v = +el.querySelector("#pgamt").value;
      try { deposit(st.asset, v); toast(`${fmt(v)} ${st.asset} demo balanceye eklendi`); draw(); } catch (e) { toast(e.message, true); }
    };
  };
  draw();
  return () => {};
}

// ---------- Withdraw ----------
function renderWithdraw(main, nav) {
  const prices = {};
  const st = { asset: "USDT" };
  const bal = () => st.asset === "USDT" ? getAccount().cash : holdQty(st.asset);
  const draw = () => {
    main.innerHTML = `<div class="pg" id="pg">
      <div class="top"><div><h2>Withdraw</h2><div class="sub">Demo çekim talebi oluştur</div></div></div>
      <div class="pg-warn">⚠️ <b>Demo modu:</b> No real transfer is made; it is only deducted from your demo balance and "Emirlerim"de kayıt olur.</div>
      <div class="pg-card" style="max-width:520px">
        <div class="pg-field"><label>Asset</label><select id="pgasset">${ASSETS.map((a) => `<option ${a === st.asset ? "selected" : ""}>${a}</option>`).join("")}</select></div>
        <div class="pg-field"><label>Network</label><select id="pgnet"><option>BEP20 (BSC)</option><option>ERC20</option><option>TRC20</option><option>Arbitrum</option></select></div>
        <div class="pg-field"><label>Withdrawal Address</label><div class="inp"><input id="pgaddr" placeholder="0x…"/></div></div>
        <div class="pg-field"><label>Amount <span style="float:right">Balance: ${fmt(bal())} ${st.asset}</span></label>
          <div class="inp"><input id="pgamt" placeholder="0.00"/><span class="max" id="pgmax">MAX</span><span style="color:var(--mut);margin-left:8px">${st.asset}</span></div></div>
        <div style="color:var(--mut);font-size:12px;margin-bottom:14px">Network ücreti: 0.0005 ${st.asset} (demo)</div>
        <button class="pg-btn r" id="pgsub" style="width:100%">Çekim Talebi Oluştur</button></div></div>`;
    const el = document.getElementById("pg");
    el.querySelector("#pgasset").onchange = (e) => { st.asset = e.target.value; draw(); };
    el.querySelector("#pgmax").onclick = () => { el.querySelector("#pgamt").value = bal(); };
    el.querySelector("#pgsub").onclick = () => {
      const amt = +el.querySelector("#pgamt").value, addr = el.querySelector("#pgaddr").value.trim();
      try { withdraw(st.asset, amt, addr); toast(`Withdrawal request created: ${fmt(amt)} ${st.asset}`); nav("orders"); } catch (e) { toast(e.message, true); }
    };
  };
  draw();
  const un = onChange(draw);
  return () => un();
}

// ---------- Orders / History ----------
function renderOrders(main, nav) {
  const draw = () => {
    const acc = getAccount();
    const fmtTs = (ms) => { const d = new Date(ms); return d.toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); };
    const rows = acc.orders.map((o) => {
      const amtStr = (o.amt >= 0 ? "+" : "") + fmt(Math.abs(o.amt)) + " " + o.asset;
      const detail = o.side ? `${o.side === "buy" ? "Buy" : "Sell"} @ $${fmt(o.price)} · ${money(o.total)}` : (o.address ? o.address.slice(0, 10) + "…" : "—");
      const st = o.status === "Beklemede" ? "pend" : "ok";
      return `<tr><td style="color:var(--mut)">${fmtTs(o.ts)}</td><td>${o.type}</td>
        <td><b>${o.asset}</b></td><td class="num ${o.amt >= 0 ? "up" : "down"}">${amtStr}</td>
        <td style="color:var(--mut)">${detail}</td><td><span class="pg-badge ${st}">${o.status || "—"}</span></td></tr>`;
    }).join("");
    main.innerHTML = `<div class="pg" id="pg">
      <div class="top"><div><h2>Orders & History</h2><div class="sub">${acc.orders.length} kayıt</div></div>
        <button class="pg-btn sm" id="pgreset">Demo hesabı sıfırla</button></div>
      <div class="pg-card" style="padding:6px 10px">${acc.orders.length
        ? `<table><thead><tr><th>Date</th><th>Type</th><th>Asset</th><th class="num">Amount</th><th>Detail</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`
        : `<div class="pg-empty">No trades yet. Buy/sell from Overview or use the Deposit page.</div>`}</div></div>`;
    const r = document.getElementById("pgreset");
    r.onclick = () => { resetDemo(); toast("Demo account reset"); draw(); };
  };
  draw();
  const un = onChange(draw);
  return () => un();
}
