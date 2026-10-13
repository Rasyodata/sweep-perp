// Reusable inline-SVG charts (no deps). Theme colors passed via CSS vars where possible.
import { fmt } from "/util.mjs";

const UP = "#0ea371", DOWN = "#e23950", GRID = "#e8e1d3", MUT = "#8a8ca0";

// candlestick + glowing area + volume + live marker
export function candleChart(candles, { w = 680, h = 360, id = "c", lines = [] } = {}) {
  if (!candles || !candles.length) return `<div class="chart-empty">Loading chart…</div>`;
  const pad = { l: 6, r: 66, t: 10, b: 18 }, volH = 48, gap = 8;
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b - volH - gap;
  const lo = Math.min(...candles.map((c) => c.l), ...lines.map((l) => l.price)), hi = Math.max(...candles.map((c) => c.h), ...lines.map((l) => l.price)), r = hi - lo || 1;
  const y = (v) => pad.t + ih - ((v - lo) / r) * ih;
  const n = candles.length, step = iw / n, bw = Math.max(1.5, step * 0.62);
  const cx = (i) => pad.l + i * step + step / 2;
  const volTop = pad.t + ih + gap, maxVol = Math.max(...candles.map((c) => c.v || 1));
  const line = candles.map((c, i) => `${cx(i)},${y(c.c)}`);
  const area = `M ${pad.l},${pad.t + ih} L ${line.join(" L ")} L ${cx(n - 1)},${pad.t + ih} Z`;
  let bars = "", vols = "";
  candles.forEach((c, i) => {
    const x = cx(i), up = c.c >= c.o, col = up ? UP : DOWN;
    const yo = y(c.o), yc = y(c.c), top = Math.min(yo, yc), bh = Math.max(1, Math.abs(yc - yo));
    bars += `<line x1="${x}" x2="${x}" y1="${y(c.h)}" y2="${y(c.l)}" stroke="${col}" stroke-width="1"/><rect x="${x - bw / 2}" y="${top}" width="${bw}" height="${bh}" fill="${col}"/>`;
    vols += `<rect x="${x - bw / 2}" y="${volTop + volH - ((c.v || 1) / maxVol) * volH}" width="${bw}" height="${((c.v || 1) / maxVol) * volH}" fill="${col}" opacity="0.35"/>`;
  });
  let grid = "";
  for (let g = 0; g <= 4; g++) { const gy = pad.t + (ih / 4) * g, val = hi - (r / 4) * g; grid += `<line x1="${pad.l}" x2="${pad.l + iw}" y1="${gy}" y2="${gy}" stroke="${GRID}"/><text x="${pad.l + iw + 6}" y="${gy + 3}" fill="${MUT}" font-size="10">${fmt(val, val > 100 ? 0 : 2)}</text>`; }
  const last = candles[n - 1], ly = y(last.c), lup = last.c >= last.o, lc = lup ? UP : DOWN;
  const marker = `<line x1="${pad.l}" x2="${pad.l + iw}" y1="${ly}" y2="${ly}" stroke="${lc}" stroke-dasharray="4 3" opacity=".7"/><rect x="${pad.l + iw}" y="${ly - 8}" width="${pad.r}" height="16" fill="${lc}"/><text x="${pad.l + iw + pad.r / 2}" y="${ly + 4}" text-anchor="middle" fill="#0b0e14" font-size="10" font-weight="700">${fmt(last.c, last.c > 100 ? 1 : 3)}</text><circle cx="${cx(n - 1)}" cy="${ly}" r="3" fill="${lc}"/><circle class="pdot" cx="${cx(n - 1)}" cy="${ly}" r="3" fill="none" stroke="${lc}" stroke-width="2"/>`;
  return `<svg class="kxchart" data-lo="${lo}" data-hi="${hi}" data-pt="${pad.t}" data-ih="${ih}" data-vh="${h}" data-pl="${pad.l}" data-iw="${iw}" width="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="display:block"><defs><linearGradient id="g${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${lc}" stop-opacity=".2"/><stop offset="100%" stop-color="${lc}" stop-opacity="0"/></linearGradient></defs>${grid}<path d="${area}" fill="url(#g${id})"/><polyline fill="none" stroke="${lc}" stroke-width="1.3" opacity=".6" points="${line.join(" ")}"/>${bars}${vols}${priceLines(lines, y, pad.l, iw)}${marker}</svg>`;
}

// horizontal price lines (entry / liquidation) drawn inside a chart's plot area
function priceLines(lines, y, pl, iw, r2) {
  if (!lines || !lines.length) return "";
  return lines.map((L) => { const ly = y(L.price); return `<line x1="${pl}" x2="${pl + iw}" y1="${ly}" y2="${ly}" stroke="${L.color}" stroke-width="1" stroke-dasharray="5 3" opacity=".9"/><rect x="${pl + iw}" y="${ly - 7}" width="66" height="14" fill="${L.color}"/><text x="${pl + iw + 33}" y="${ly + 3.5}" text-anchor="middle" fill="#0b0e14" font-size="9" font-weight="800">${L.label}</text>`; }).join("");
}
// live streaming TICK line chart (points = [{t, p}]) with time + price axes
export function tickChart(points, { w = 680, h = 360, id = "t", lines = [] } = {}) {
  if (!points || points.length < 2) return `<div class="chart-empty">Waiting for live data…</div>`;
  const pad = { l: 6, r: 66, t: 12, b: 22 }, iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const ps = points.map((p) => p.p), extra = lines.map((l) => l.price);
  let lo = Math.min(...ps, ...extra), hi = Math.max(...ps, ...extra); const span = (hi - lo) || hi * 0.001; lo -= span * 0.12; hi += span * 0.12;
  const r = hi - lo || 1;
  const x = (i) => pad.l + (i / (points.length - 1)) * iw, y = (v) => pad.t + ih - ((v - lo) / r) * ih;
  const first = ps[0], last = ps[ps.length - 1], up = last >= first, col = up ? "#0ea371" : "#e23950";
  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.p).toFixed(1)}`);
  const area = `M ${pad.l},${pad.t + ih} L ${line.join(" L ")} L ${x(points.length - 1).toFixed(1)},${pad.t + ih} Z`;
  let grid = "";
  for (let g = 0; g <= 4; g++) { const gy = pad.t + (ih / 4) * g, val = hi - (r / 4) * g; grid += `<line x1="${pad.l}" x2="${pad.l + iw}" y1="${gy}" y2="${gy}" stroke="#e8e1d3" stroke-dasharray="2 3"/><text x="${pad.l + iw + 6}" y="${gy + 3}" fill="#8a8ca0" font-size="10">${fmt(val, val > 100 ? 1 : 3)}</text>`; }
  let tlabels = "";
  const n = points.length, steps = 5;
  for (let s = 0; s <= steps; s++) { const i = Math.round((n - 1) * s / steps); const d = new Date(points[i].t); const hh = String(d.getHours()).padStart(2, "0"), mm = String(d.getMinutes()).padStart(2, "0"), ssx = String(d.getSeconds()).padStart(2, "0"); tlabels += `<text x="${x(i)}" y="${h - 6}" fill="#8a8ca0" font-size="9" text-anchor="${s === 0 ? "start" : s === steps ? "end" : "middle"}">${hh}:${mm}:${ssx}</text>`; }
  const ly = y(last);
  const marker = `<line x1="${pad.l}" x2="${pad.l + iw}" y1="${ly}" y2="${ly}" stroke="${col}" stroke-dasharray="4 3" opacity=".6"/><rect x="${pad.l + iw}" y="${ly - 8}" width="${pad.r}" height="16" fill="${col}"/><text x="${pad.l + iw + pad.r / 2}" y="${ly + 4}" text-anchor="middle" fill="#0b0e14" font-size="10" font-weight="700">${fmt(last, last > 100 ? 1 : 3)}</text><circle cx="${x(n - 1)}" cy="${ly}" r="3.5" fill="${col}"/><circle class="pdot" cx="${x(n - 1)}" cy="${ly}" r="3" fill="none" stroke="${col}" stroke-width="2"/>`;
  return `<svg class="kxchart" data-lo="${lo}" data-hi="${hi}" data-pt="${pad.t}" data-ih="${ih}" data-vh="${h}" data-pl="${pad.l}" data-iw="${iw}" width="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="display:block"><defs><linearGradient id="tk${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${col}" stop-opacity=".18"/><stop offset="100%" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>${grid}${tlabels}<path d="${area}" fill="url(#tk${id})"/><polyline fill="none" stroke="${col}" stroke-width="1.6" points="${line.join(" ")}"/>${priceLines(lines, y, pad.l, iw)}${marker}</svg>`;
}

// smooth area/line chart for a single series
export function areaChart(data, { w = 680, h = 220, color = "#7c3aed", id = "a", fill = true } = {}) {
  if (!data || data.length < 2) return `<div class="chart-empty">—</div>`;
  const pad = { l: 6, r: 60, t: 10, b: 14 }, iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const lo = Math.min(...data), hi = Math.max(...data), r = hi - lo || 1;
  const x = (i) => pad.l + (i / (data.length - 1)) * iw, y = (v) => pad.t + ih - ((v - lo) / r) * ih;
  const pts = data.map((v, i) => `${x(i)},${y(v)}`);
  let grid = "";
  for (let g = 0; g <= 3; g++) { const gy = pad.t + (ih / 3) * g, val = hi - (r / 3) * g; grid += `<line x1="${pad.l}" x2="${pad.l + iw}" y1="${gy}" y2="${gy}" stroke="${GRID}"/><text x="${pad.l + iw + 6}" y="${gy + 3}" fill="${MUT}" font-size="10">${fmt(val, 0)}</text>`; }
  const area = `M ${pad.l},${pad.t + ih} L ${pts.join(" L ")} L ${pad.l + iw},${pad.t + ih} Z`;
  return `<svg width="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="display:block"><defs><linearGradient id="ar${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity=".28"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>${grid}${fill ? `<path d="${area}" fill="url(#ar${id})"/>` : ""}<polyline fill="none" stroke="${color}" stroke-width="1.8" points="${pts.join(" ")}"/><circle cx="${x(data.length - 1)}" cy="${y(data[data.length - 1])}" r="3" fill="${color}"/></svg>`;
}

// two stacked lines (e.g. total vs staked supply)
export function dualArea(total, staked, { w = 680, h = 220 } = {}) {
  if (!total || total.length < 2) return `<div class="chart-empty">—</div>`;
  const pad = { l: 6, r: 60, t: 10, b: 14 }, iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const hi = Math.max(...total), lo = Math.min(...staked, ...total) * 0.98, r = hi - lo || 1;
  const x = (i) => pad.l + (i / (total.length - 1)) * iw, y = (v) => pad.t + ih - ((v - lo) / r) * ih;
  const mk = (d) => d.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  let grid = "";
  for (let g = 0; g <= 3; g++) { const gy = pad.t + (ih / 3) * g; grid += `<line x1="${pad.l}" x2="${pad.l + iw}" y1="${gy}" y2="${gy}" stroke="${GRID}"/>`; }
  return `<svg width="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="display:block">${grid}<polyline fill="none" stroke="#7c3aed" stroke-width="1.8" points="${mk(total)}"/><polyline fill="none" stroke="#6366f1" stroke-width="1.8" points="${mk(staked)}"/></svg>`;
}

export function sparkline(data, up, w = 92, h = 26) {
  if (!data || data.length < 2) return "";
  const mn = Math.min(...data), mx = Math.max(...data), r = mx - mn || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - mn) / r) * (h - 4) - 2}`).join(" ");
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:inline-block;vertical-align:middle"><polyline fill="none" stroke="${up ? UP : DOWN}" stroke-width="1.5" points="${pts}"/></svg>`;
}

export function donut(parts, size = 128) {
  const total = parts.reduce((a, p) => a + p.v, 0) || 1, c = size / 2, rad = size / 2 - 7, C = 2 * Math.PI * rad;
  let off = 0, segs = "";
  for (const p of parts) { const len = (p.v / total) * C; segs += `<circle cx="${c}" cy="${c}" r="${rad}" fill="none" stroke="${p.c}" stroke-width="13" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 ${c} ${c})" style="transition:stroke-dasharray .4s"/>`; off += len; }
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${segs}<text x="${c}" y="${c + 4}" text-anchor="middle" fill="#e8ecf3" font-size="13" font-weight="700">100%</text></svg>`;
}

// liquidation heatmap — rows = price buckets, cols = time, intensity grid
export function heatmap(grid, { w = 680, h = 260, lo, hi } = {}) {
  if (!grid || !grid.length) return `<div class="chart-empty">—</div>`;
  const rows = grid.length, cols = grid[0].length, cw = w / cols, ch = h / rows;
  let cells = "";
  const max = Math.max(...grid.flat(), 0.0001);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const t = grid[r][c] / max; if (t < 0.02) continue;
    const col = t > 0.66 ? "#e23950" : t > 0.33 ? "#f0a93b" : "#6366f1";
    cells += `<rect x="${(c * cw).toFixed(1)}" y="${(r * ch).toFixed(1)}" width="${cw + 0.5}" height="${ch + 0.5}" fill="${col}" opacity="${(0.15 + t * 0.75).toFixed(2)}"/>`;
  }
  return `<svg width="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="display:block;border-radius:8px">${cells}</svg>`;
}
