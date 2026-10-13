// Synthetic but live on-chain-protocol data engine for Sweep Perp.
// Mirrors the structure of an on-chain perps "house" + reward-token system.
// Prices for BTC/ETH come from real Binance data (set via updatePrices()).

let s = 12345;
const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const rr = (a, b) => a + rnd() * (b - a);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

const HANDLES = ["zentrader", "liquidK", "0xGhost", "moonboi", "apex", "degenlord", "sniper9", "valtra", "nova", "riskon", "sweepwhale", "shortking", "longlord", "pumpjack", "orbit", "vortex", "cobra", "titan", "hodlr", "wick", "fomo3d", "bagholder", "alphaseek", "cryptoyeti", "maxpain"];
function addr() { let h = Math.floor(rnd() * 0xffffffff); const hex = (n) => (n >>> 0).toString(16).padStart(8, "0"); return "0x" + hex(h) + hex(h ^ 0x9e3779b9) + hex(h * 7 >>> 0) + hex(h * 13 >>> 0) + hex(h * 17 >>> 0); }

export const PRICES = { BTC: 82500, ETH: 2550 };
export function updatePrices(p) { if (p.BTC) PRICES.BTC = p.BTC; if (p.ETH) PRICES.ETH = p.ETH; }

export const P = {
  house: { funds: 4907308, lpBalance: 4990086, openPnl: -82778, queueDebt: 0, tvl: 60300000, volume: 855e9, beforePayouts: 31314224 },
  pos: { openInterest: 819779689, openMargin: 8067963, openPositions: 1941,
    byAsset: { BTC: { long: 233e6, short: 347e6 }, ETH: { long: 155e6, short: 84.9e6 } } },
  paper: { totalSupply: 6221172821, stakedSupply: 6151771274, stakerRewards: 28284444, rewardRate: 1, rewardToken: "USDC",
    pendingRewards: 1428.15, latestDistTs: Date.now() - 60000,
    token: "0xKA4Nf0…d1c0e", stakingContract: "0xKA4Nad6…ef016" },
  series: { funds: [], beforePayouts: [], supplyTotal: [], supplyStaked: [], stakingRev: [], houseExposure: [] },
  leaderboard: [],
  activity: [],
  blocks: [],
  heatmap: [],
  blockHeight: 48364821,
};

function seedSeries() {
  const walk = (base, n, vol) => { let v = base, out = []; for (let i = 0; i < n; i++) { v *= 1 + (rnd() - 0.5) * vol; out.push(v); } return out; };
  P.series.funds = walk(P.house.funds, 60, 0.02);
  P.series.beforePayouts = walk(P.house.beforePayouts, 60, 0.015);
  P.series.supplyTotal = walk(P.paper.totalSupply * 0.98, 60, 0.004).map((v, i, a) => a[0] * (1 + i * 0.0006));
  P.series.supplyStaked = P.series.supplyTotal.map((v) => v * rr(0.975, 0.99));
  P.series.stakingRev = walk(1200, 60, 0.08);
}

function seedLeaderboard() {
  const out = [];
  for (let i = 0; i < 40; i++) {
    const asset = rnd() > 0.5 ? "BTC" : "ETH";
    const px = PRICES[asset], side = rnd() > 0.5 ? "LONG" : "SHORT";
    const lev = pick([20, 50, 100, 125, 138, 200, 250, 383, 401, 1000]);
    const entry = px * (1 + (rnd() - 0.5) * 0.02);
    const move = (rnd() * 0.03) * (side === "LONG" ? 1 : -1) * (rnd() > 0.2 ? 1 : -1);
    const exit = entry * (1 + move);
    const notional = pick([5e6, 5.5e6, 6.1e6, 7.5e6, 8e6, 9.7e6, 10e6]);
    const margin = notional / lev;
    const pnlPct = ((exit - entry) / entry) * (side === "LONG" ? 1 : -1) * lev * 100;
    const pnl = margin * pnlPct / 100;
    out.push({ user: rnd() > 0.45 ? pick(HANDLES) : addr(), isAddr: false, asset, side, lev, entry, exit, notional, margin, pnl, pnlPct,
      durMs: rr(10 * 60000, 26 * 3600000), closedTs: Date.now() - rr(60000, 24 * 3600000) });
  }
  out.sort((a, b) => b.pnl - a.pnl);
  P.leaderboard = out;
}

function seedActivity() {
  P.activity = [];
  for (let i = 0; i < 25; i++) pushActivity(Date.now() - i * rr(1000, 9000));
}
function pushActivity(ts = Date.now()) {
  P.activity.unshift({ ts, type: "LOSS CLOSE", user: addr(), amount: rr(50, 6000) });
  P.activity = P.activity.slice(0, 25);
}

function seedBlocks() {
  P.blocks = [];
  const st = ["MINED", "MINED", "FINALISING", "PROJECTED", "PROJECTED"];
  for (let i = 0; i < 5; i++) P.blocks.push({ height: P.blockHeight + i, status: st[i],
    pct: st[i] === "MINED" ? rr(30, 55) : st[i] === "FINALISING" ? 100 : st[i] === "PROJECTED" && i === 3 ? rr(2, 8) : 0,
    gas: st[i] === "PROJECTED" && i === 4 ? 0 : rr(0.12, 3) });
}

function seedHeatmap() {
  const rows = 14, cols = 40;
  P.heatmap = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => {
    const band = Math.exp(-Math.pow((r - rows / 2) / 3, 2));
    return Math.max(0, band * rr(0.2, 1) + rnd() * 0.15);
  }));
}

export function initProtocol() { seedSeries(); seedLeaderboard(); seedActivity(); seedBlocks(); seedHeatmap(); }

// evolve — call ~1/sec
let acc = 0;
export function tickProtocol() {
  const h = P.house;
  h.funds *= 1 + (rnd() - 0.5) * 0.0012; h.beforePayouts *= 1 + (rnd() - 0.5) * 0.0009;
  h.openPnl += (rnd() - 0.5) * 2000; h.volume += rr(2e6, 2e7); h.tvl *= 1 + (rnd() - 0.5) * 0.0006;
  P.pos.openPositions += Math.round((rnd() - 0.5) * 6); P.pos.openInterest *= 1 + (rnd() - 0.5) * 0.001;
  P.paper.totalSupply += rr(20, 260); P.paper.stakedSupply = P.paper.totalSupply * rr(0.985, 0.99);
  P.paper.stakerRewards += rr(5, 80); P.paper.pendingRewards += rr(1, 20);
  // exposure tracks price
  P.pos.byAsset.BTC.long *= 1 + (rnd() - 0.5) * 0.003; P.pos.byAsset.BTC.short *= 1 + (rnd() - 0.5) * 0.003;
  // series push (rolling)
  const push = (k, v) => { P.series[k] = [...P.series[k].slice(1), v]; };
  push("funds", h.funds); push("beforePayouts", h.beforePayouts);
  push("supplyTotal", P.paper.totalSupply); push("supplyStaked", P.paper.stakedSupply);
  push("stakingRev", 1200 * (1 + (rnd() - 0.5) * 0.2));
  // activity feed
  if (rnd() > 0.45) { pushActivity(); P.paper.latestDistTs = Date.now(); }
  // blocks advance occasionally
  acc++;
  if (acc % 3 === 0) {
    P.blockHeight++;
    seedBlocks();
  } else {
    const fin = P.blocks.find((b) => b.status === "MINED" && b.pct < 100); if (fin) fin.pct = Math.min(100, fin.pct + rr(4, 12));
  }
  // heatmap drift
  for (let r = 0; r < P.heatmap.length; r++) for (let c = 0; c < P.heatmap[0].length; c++) P.heatmap[r][c] = Math.max(0, P.heatmap[r][c] + (rnd() - 0.5) * 0.06);
}
