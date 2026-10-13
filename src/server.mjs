// Generated API server (node:http) with real auth (scrypt + session tokens).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createStore } from "./db.mjs";
import { MODULES, MENU, PERMISSIONS, TABLES, PAGES, WIDGETS } from "./registry.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const UI = path.join(HERE, "ui");
// Auth tables (_auth_user, _auth_session) are known to the store alongside module tables.
const AUTH_TABLES = [
  { name: "_auth_user", fields: [{ name: "id" }, { name: "email" }, { name: "name" }, { name: "pass" }, { name: "created" }] },
  { name: "_auth_session", fields: [{ name: "id" }, { name: "user_id" }, { name: "created" }, { name: "expires" }] },
];
const store = createStore([...TABLES, ...AUTH_TABLES]); // TABLES carry {name, fields} for column reconcile

// market-data cache (shared across all clients) + rate-limit backoff
const MKT_CACHE = new Map();
let BINANCE_BAN_UNTIL = 0;

// ---- auth helpers ----
const WEEK = 7 * 24 * 3600 * 1000;
function hashPass(pass) {
  const salt = crypto.randomBytes(16).toString("hex");
  const h = crypto.scryptSync(String(pass), salt, 64).toString("hex");
  return salt + ":" + h;
}
function verifyPass(pass, stored) {
  const [salt, h] = String(stored || "").split(":");
  if (!salt || !h) return false;
  const h2 = crypto.scryptSync(String(pass), salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(h, "hex"), Buffer.from(h2, "hex"));
}
function userByEmail(email) {
  return store.list("_auth_user").find((u) => u.email === String(email).toLowerCase()) ?? null;
}
function newSession(userId) {
  const token = crypto.randomBytes(24).toString("hex");
  store.create("_auth_session", { id: token, user_id: userId, created: new Date().toISOString(), expires: String(Date.now() + WEEK) });
  return token;
}
function currentUser(req) {
  const tok = String(req.headers["authorization"] || "").replace(/^Bearer /, "");
  if (!tok) return null;
  const s = store.get("_auth_session", tok);
  if (!s) return null;
  if (s.expires && Number(s.expires) < Date.now()) { store.remove("_auth_session", tok); return null; }
  const u = store.get("_auth_user", s.user_id);
  return u ? { id: u.id, email: u.email, name: u.name } : null;
}
// Seed a default admin on first boot so the app is immediately usable.
if (store.list("_auth_user").length === 0) {
  store.create("_auth_user", { email: "admin@local", name: "Yönetici", pass: hashPass("admin123"), created: new Date().toISOString() });
  console.log("[auth] varsayılan kullanıcı: admin@local / admin123");
}

function send(res, code, body, type = "application/json") {
  res.writeHead(code, { "Content-Type": type, "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type,Authorization" });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve) => {
    let d = ""; req.on("data", (c) => (d += c));
    req.on("end", () => { try { resolve(d ? JSON.parse(d) : {}); } catch { resolve({}); } });
  });
}

export const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const parts = url.pathname.split("/").filter(Boolean);
  if (req.method === "OPTIONS") return send(res, 204, "");

  // ---- auth routes (public) ----
  if (url.pathname === "/api/auth/register" && req.method === "POST") {
    const { email, password, name } = await readBody(req);
    if (!email || !password) return send(res, 400, { error: "email ve şifre gerekli" });
    if (userByEmail(email)) return send(res, 409, { error: "bu e-posta zaten kayıtlı" });
    const u = store.create("_auth_user", { email: String(email).toLowerCase(), name: name || email, pass: hashPass(password), created: new Date().toISOString() });
    return send(res, 201, { token: newSession(u.id), user: { id: u.id, email: u.email, name: u.name } });
  }
  if (url.pathname === "/api/auth/login" && req.method === "POST") {
    const { email, password } = await readBody(req);
    const u = userByEmail(email);
    if (!u || !verifyPass(password, u.pass)) return send(res, 401, { error: "e-posta veya şifre hatalı" });
    return send(res, 200, { token: newSession(u.id), user: { id: u.id, email: u.email, name: u.name } });
  }
  if (url.pathname === "/api/auth/logout" && req.method === "POST") {
    const tok = String(req.headers["authorization"] || "").replace(/^Bearer /, "");
    if (tok) store.remove("_auth_session", tok);
    return send(res, 200, { ok: true });
  }
  if (url.pathname === "/api/auth/me") {
    const u = currentUser(req);
    return u ? send(res, 200, { user: u }) : send(res, 401, { error: "oturum yok" });
  }

  if (url.pathname === "/api/_meta") {
    return send(res, 200, { modules: MODULES, menu: MENU, pages: PAGES, permissions: PERMISSIONS, tables: TABLES, widgets: WIDGETS });
  }

  // ---- public market-data proxy (Binance USDⓈ-M Futures) with cache ----
  if (parts[0] === "api" && parts[1] === "market") {
    const MAP = {
      tickers: "/fapi/v1/ticker/24hr",
      price:   "/fapi/v1/ticker/price",
      klines:  "/fapi/v1/klines",
      depth:   "/fapi/v1/depth",
      trades:  "/fapi/v1/aggTrades",
    };
    const kind = parts[2], base = MAP[kind];
    if (!base) return send(res, 404, { error: "unknown market endpoint" });
    const TTL = { tickers: 2000, price: 800, klines: 6000, depth: 1500, trades: 2000 };
    const ttl = TTL[kind] ?? 2000;
    const key = kind + url.search;
    const now = Date.now();
    const hit = MKT_CACHE.get(key);
    const serveCached = (h) => { res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store", "X-Cache": "HIT" }); res.end(h.body); };
    if (hit && now - hit.ts < ttl) return serveCached(hit);           // fresh cache
    if (BINANCE_BAN_UNTIL > now) {                                    // backing off → never hit Binance
      if (hit) return serveCached(hit);
      return send(res, 503, { error: "rate-limited" });
    }
    try {
      const r = await fetch("https://fapi.binance.com" + base + url.search, { signal: AbortSignal.timeout(8000) });
      const txt = await r.text();
      if (r.status === 418 || r.status === 429) {                    // rate-limited/banned → back off, serve stale
        BINANCE_BAN_UNTIL = now + 60000;
        console.warn("[market] Binance " + r.status + " — 60s backoff");
        if (hit) return serveCached(hit);
        return send(res, 503, { error: "rate-limited" });
      }
      if (r.ok) MKT_CACHE.set(key, { ts: now, body: txt });
      res.writeHead(r.status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store", "X-Cache": "MISS" });
      return res.end(txt);
    } catch (e) {
      if (hit) return serveCached(hit);
      return send(res, 502, { error: "binance erişilemiyor", detail: String(e.message || e) });
    }
  }

  // ---- everything below requires auth ----
  const isData = url.pathname === "/api/_stats" || (parts[0] === "api" && parts[1] === "t");
  if (isData && !currentUser(req)) return send(res, 401, { error: "giriş gerekli" });

  if (url.pathname === "/api/_stats") {
    return send(res, 200, TABLES.map((t) => ({ table: t.name, count: store.list(t.name).length })));
  }
  if (parts[0] === "api" && parts[1] === "t") {
    const table = parts[2]; const id = parts[3];
    if (!TABLES.some((t) => t.name === table)) return send(res, 404, { error: "unknown table" });
    if (req.method === "GET" && !id) return send(res, 200, store.list(table));
    if (req.method === "GET" && id) return send(res, 200, store.get(table, id) ?? {});
    if (req.method === "POST") return send(res, 201, store.create(table, await readBody(req)));
    if (req.method === "PUT" && id) return send(res, 200, store.update(table, id, await readBody(req)) ?? {});
    if (req.method === "DELETE" && id) return send(res, 200, { removed: store.remove(table, id) });
    return send(res, 405, { error: "method not allowed" });
  }

  // Static UI
  let file = url.pathname === "/" ? "/index.html" : url.pathname;
  const full = path.join(UI, file);
  if (full.startsWith(UI) && fs.existsSync(full) && fs.statSync(full).isFile()) {
    const ext = path.extname(full);
    const type = ext === ".html" ? "text/html" : ext === ".mjs" || ext === ".js" ? "text/javascript" : "text/plain";
    return send(res, 200, fs.readFileSync(full, "utf8"), type);
  }
  if (!url.pathname.startsWith("/api")) return send(res, 200, fs.readFileSync(path.join(UI, "index.html"), "utf8"), "text/html");
  send(res, 404, { error: "not found" });
});

const PORT = Number(process.env.PORT || 3300);
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) server.listen(PORT, () => console.log("[app] http://127.0.0.1:" + PORT));
