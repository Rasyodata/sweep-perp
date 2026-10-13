// Paper trading account — single source of truth, persisted to localStorage.
// Collateral is USDC (acct.cash); USDT is a second stable balance (acct.usdt).
// DEMO ONLY — no real funds move. Connect reads a real address if an injected
// wallet (MetaMask / Trust) exists, otherwise falls back to a SIMULATED wallet
// so the whole flow is testable without installing anything.

const KEY = "sweep_acct_v2";
const EMPTY = { cash: 0, usdt: 0, holdings: {}, orders: [], address: null, sim: false };

function load() { try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { ...EMPTY, holdings: {} }; } }
let acct = load();
function save() { localStorage.setItem(KEY, JSON.stringify(acct)); emit(); }

const subs = new Set();
export function onChange(fn) { subs.add(fn); return () => subs.delete(fn); }
function emit() { subs.forEach((f) => { try { f(acct); } catch {} }); }

export function getAccount() { return acct; }
export function balanceOf(asset) { return asset === "USDC" ? acct.cash : asset === "USDT" ? acct.usdt : (acct.holdings[asset] || 0); }
export function holdQty(s) { return balanceOf(s); }
export const STABLES = ["USDC", "USDT"];

function record(type, asset, amt, extra = {}) {
  acct.orders.unshift({ id: Date.now() + "-" + Math.round(Math.random() * 1e6), ts: Date.now(), type, asset, amt, ...extra });
  acct.orders = acct.orders.slice(0, 200);
}

// direct collateral adjustment (margin lock / release / realized pnl) — no order row
export function adjustUSDC(delta) { acct.cash = Math.max(0, acct.cash + delta); save(); }

export function deposit(asset, amt) {
  amt = +amt; if (!(amt > 0)) throw new Error("Invalid amount");
  if (asset === "USDC") acct.cash += amt; else if (asset === "USDT") acct.usdt += amt; else acct.holdings[asset] = (acct.holdings[asset] || 0) + amt;
  record("Deposit", asset, amt, { status: "Completed" });
  save();
}
export function withdraw(asset, amt, address) {
  amt = +amt; if (!(amt > 0)) throw new Error("Invalid amount");
  if (amt > balanceOf(asset) + 1e-9) throw new Error("Insufficient balance");
  if (!address) throw new Error("Address required");
  if (asset === "USDC") acct.cash -= amt; else if (asset === "USDT") acct.usdt -= amt; else acct.holdings[asset] -= amt;
  record("Withdrawal", asset, -amt, { status: "Beklemede", address });
  save();
}

// spot-style order (kept for compatibility); perps live in exchange.mjs
export function placeOrder(sym, side, amt, price) {
  amt = +amt; price = +price; const total = amt * price;
  if (side === "buy") { if (total > acct.cash + 1e-9) throw new Error("Insufficient USDC"); acct.cash -= total; acct.holdings[sym] = (acct.holdings[sym] || 0) + amt; }
  else { if (amt > (acct.holdings[sym] || 0) + 1e-9) throw new Error("Insufficient " + sym); acct.holdings[sym] -= amt; acct.cash += total; }
  record("Trade", sym, side === "buy" ? amt : -amt, { side, price, total, status: "Filled" });
  save(); return total;
}

function simAddr() {
  const r = () => Math.floor((Date.now() * Math.random()) % 0xffffffff).toString(16).padStart(8, "0");
  return "0x" + (r() + r() + r() + r() + r()).slice(0, 40);
}
function seedIfEmpty() {
  const tot = acct.cash + acct.usdt + Object.values(acct.holdings).reduce((a, b) => a + b, 0);
  if (tot <= 0) {
    acct.cash = 25000; acct.usdt = 10000; acct.holdings = { BTC: 0.05, ETH: 0.8, SOL: 20 };
    record("Deposit", "USDC", 25000, { status: "Completed", note: "demo seed" });
    record("Deposit", "USDT", 10000, { status: "Completed", note: "demo seed" });
  }
}

// Connect: real injected wallet if present, else a simulated wallet (symbolic balance).
export async function connectWallet() {
  let addr, sim = false;
  if (typeof window !== "undefined" && window.ethereum) {
    try {
      const a = await window.ethereum.request({ method: "eth_requestAccounts" });
      addr = a && a[0];
    } catch (e) {
      if (e && (e.code === 4001 || /reject/i.test(e.message || ""))) throw new Error("Connection rejected");
      addr = null;
    }
  }
  if (!addr) { addr = simAddr(); sim = true; }      // no injected wallet → simulate
  acct.address = addr; acct.sim = sim; seedIfEmpty(); save();
  return { address: addr, sim };
}
export function disconnectWallet() { acct.address = null; acct.sim = false; save(); }
export function isSimulated() { return !!acct.sim; }
export function resetDemo() { acct = { ...EMPTY, holdings: {} }; save(); }
