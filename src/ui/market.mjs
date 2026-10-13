// Live market data layer — proxied to Binance USDⓈ-M Futures via the app server.
// All prices/changes/candles/depth/trades are REAL Binance Futures data.

export const SYMBOLS = [
  { s: "BTC",  sym: "BTCUSDT",  n: "Bitcoin",  c: "#f7931a" },
  { s: "ETH",  sym: "ETHUSDT",  n: "Ethereum", c: "#627eea" },
  { s: "SOL",  sym: "SOLUSDT",  n: "Solana",   c: "#14f195" },
  { s: "BNB",  sym: "BNBUSDT",  n: "BNB",       c: "#f3ba2f" },
  { s: "XRP",  sym: "XRPUSDT",  n: "XRP",        c: "#4a90d9" },
  { s: "ADA",  sym: "ADAUSDT",  n: "Cardano",    c: "#0033ad" },
  { s: "DOGE", sym: "DOGEUSDT", n: "Dogecoin",   c: "#c2a633" },
  { s: "AVAX", sym: "AVAXUSDT", n: "Avalanche",  c: "#e84142" },
  { s: "LINK", sym: "LINKUSDT", n: "Chainlink",  c: "#2a5ada" },
  { s: "LTC",  sym: "LTCUSDT",  n: "Litecoin",   c: "#9fa8b0" },
];
export const META = Object.fromEntries(SYMBOLS.map((x) => [x.sym, x]));
export const INTERVAL = { "15m": "15m", "1H": "1h", "4H": "4h", "1D": "1d", "1W": "1w" };

async function j(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(path + " " + r.status);
  return r.json();
}

export async function fetchTickers(syms) {
  const q = encodeURIComponent(JSON.stringify(syms));
  const arr = await j(`/api/market/tickers?symbols=${q}`);
  const wanted = new Set(syms);
  const out = {};
  for (const t of arr) {
    if (!wanted.has(t.symbol)) continue;
    out[t.symbol] = {
      price: +t.lastPrice, chg: +t.priceChangePercent,
      high: +t.highPrice, low: +t.lowPrice,
      open: +t.openPrice, vol: +t.quoteVolume, base: +t.volume,
    };
  }
  return out;
}

export async function fetchPrice(sym) {
  const d = await j(`/api/market/price?symbol=${sym}`);
  return +d.price;
}

export async function fetchKlines(sym, interval, limit = 80) {
  const raw = await j(`/api/market/klines?symbol=${sym}&interval=${interval}&limit=${limit}`);
  return raw.map((k) => ({ t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5] }));
}

export async function fetchDepth(sym, limit = 20) {
  const d = await j(`/api/market/depth?symbol=${sym}&limit=${limit}`);
  return {
    bids: d.bids.map((x) => ({ px: +x[0], amt: +x[1] })),
    asks: d.asks.map((x) => ({ px: +x[0], amt: +x[1] })),
  };
}

export async function fetchTrades(sym, limit = 20) {
  const d = await j(`/api/market/trades?symbol=${sym}&limit=${limit}`);
  return d.map((t) => ({ px: +t.p, amt: +t.q, ms: t.T, buy: !t.m })).reverse(); // newest first
}

export function hhmmss(ms) {
  const d = new Date(ms);
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
}

// ---------- synthetic fallback (used when Binance is unreachable/rate-limited) ----------
const BASE = { BTCUSDT: 82500, ETHUSDT: 2550, SOLUSDT: 172, BNBUSDT: 589, XRPUSDT: 0.52, ADAUSDT: 0.45, DOGEUSDT: 0.139, AVAXUSDT: 36.7, LINKUSDT: 14.2, LTCUSDT: 95 };
const simState = {};
let ss = 777; const srnd = () => (ss = (ss * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
function simSeed(sym, lastReal) {
  const p = lastReal?.[sym]?.price ?? BASE[sym] ?? 1;
  if (!simState[sym]) simState[sym] = { price: p, open: p * (0.99 + srnd() * 0.02) };
  else if (lastReal?.[sym]?.price) simState[sym].price = lastReal[sym].price;
  return simState[sym];
}
export function simTickers(syms, lastReal) {
  const out = {};
  for (const s of syms) {
    const st = simSeed(s, lastReal);
    st.price = Math.max(1e-6, st.price * (1 + (srnd() - 0.5) * 0.002));
    out[s] = { price: st.price, chg: ((st.price - st.open) / st.open) * 100, high: st.price * 1.012, low: st.price * 0.988, open: st.open, vol: (BASE[s] > 100 ? 2e9 : 5e8) * (0.8 + srnd() * 0.4), base: 0 };
  }
  return out;
}
export function simPrice(sym) {
  const st = simSeed(sym, null);
  st.price = Math.max(1e-6, st.price * (1 + (srnd() - 0.5) * 0.0015));
  return st.price;
}
export function simKlines(sym, n = 90) {
  const st = simState[sym] || { price: BASE[sym] || 1 };
  let v = (st.price || 1) * 0.98, out = [];
  for (let i = 0; i < n; i++) { const o = v, d = (srnd() - 0.5) * o * 0.01, c = Math.max(1e-6, o + d), h = Math.max(o, c) * (1 + srnd() * 0.004), l = Math.min(o, c) * (1 - srnd() * 0.004); out.push({ t: Date.now() - (n - i) * 3600000, o, h, l, c, v: srnd() * 100 + 20 }); v = c; }
  out[out.length - 1].c = st.price || v;
  return out;
}
