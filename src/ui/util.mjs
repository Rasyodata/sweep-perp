// Shared formatting helpers for the Sweep Perp SPA.
export const dp = (v) => (Math.abs(v) >= 1000 ? 2 : Math.abs(v) >= 1 ? 3 : Math.abs(v) >= 0.01 ? 5 : 6);
export const fmt = (v, d) => (v == null || isNaN(v)) ? "—" : (+v).toLocaleString("en-US", { minimumFractionDigits: d ?? dp(v), maximumFractionDigits: d ?? dp(v) });
export const money = (v, d = 2) => (v == null || isNaN(v)) ? "—" : "$" + fmt(v, d);
export const pct = (v, d = 2) => (v == null || isNaN(v)) ? "—" : (v >= 0 ? "+" : "") + (+v).toFixed(d) + "%";
export const signMoney = (v, d = 2) => (v < 0 ? "-$" : "+$") + fmt(Math.abs(v), d);
export function compact(v) {
  const a = Math.abs(v);
  if (a >= 1e12) return "$" + (v / 1e12).toFixed(2) + "T";
  if (a >= 1e9) return "$" + (v / 1e9).toFixed(2) + "B";
  if (a >= 1e6) return "$" + (v / 1e6).toFixed(2) + "M";
  if (a >= 1e3) return "$" + (v / 1e3).toFixed(1) + "K";
  return "$" + fmt(v, 0);
}
export function compactN(v) {
  const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toFixed(2) + "B";
  if (a >= 1e6) return (v / 1e6).toFixed(2) + "M";
  if (a >= 1e3) return (v / 1e3).toFixed(1) + "K";
  return fmt(v, 0);
}
export const shortAddr = (a) => a ? a.slice(0, 6) + "…" + a.slice(-4) : "";
export function ago(ms) {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return s + "s ago";
  const m = Math.floor(s / 60); if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60); if (h < 24) return h + "h " + (m % 60) + "m ago";
  return Math.floor(h / 24) + "d ago";
}
export function dur(ms) {
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d) return d + "d " + (h % 24) + "h";
  if (h) return h + "h " + (m % 60) + "m";
  return m + "m";
}
export const hhmmss = (ms) => { const d = new Date(ms); return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":"); };
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
