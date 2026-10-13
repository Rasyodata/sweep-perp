// Data layer: real SQLite via better-sqlite3 when available, else JSON store.
// Applies migrations/all.sql on boot; generic CRUD keyed by table 'id'.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createStore as jsonStore } from "./store.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let Database = null;
try { Database = (await import("better-sqlite3")).default; } catch { /* fall back to JSON */ }

const SAFE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SQL_TYPE = { uuid: "TEXT", text: "TEXT", integer: "INTEGER", numeric: "NUMERIC", boolean: "INTEGER", date: "TEXT", datetime: "TEXT", select: "TEXT", multiselect: "TEXT" };
const sqlType = (t) => SQL_TYPE[t] || "TEXT";

export function createStore(tables) {
  // Accept table names (strings) or {name, fields} objects.
  const meta = (tables || []).map((t) => (typeof t === "string" ? { name: t, fields: [] } : t));
  const names = meta.map((t) => t.name);
  if (!Database) {
    console.warn("[db] better-sqlite3 yok — JSON store'a düşülüyor (npm install ile SQLite).");
    return jsonStore(names);
  }
  fs.mkdirSync(path.join(ROOT, "data"), { recursive: true });
  const db = new Database(path.join(ROOT, "data", "app.db"));
  db.pragma("journal_mode = WAL");
  const ddlPath = path.join(ROOT, "migrations", "all.sql");
  if (fs.existsSync(ddlPath)) db.exec(fs.readFileSync(ddlPath, "utf8"));

  // Reconcile columns: add any new fields to existing tables WITHOUT data loss.
  for (const t of meta) {
    if (!SAFE.test(t.name) || !(t.fields && t.fields.length)) continue;
    try {
      const have = new Set(db.prepare("PRAGMA table_info(" + t.name + ")").all().map((c) => c.name));
      if (!have.size) continue; // table not created yet (in all.sql) — skip
      for (const f of t.fields) {
        if (SAFE.test(f.name) && !have.has(f.name)) {
          db.exec("ALTER TABLE " + t.name + " ADD COLUMN " + f.name + " " + sqlType(f.type));
        }
      }
    } catch { /* ignore */ }
  }

  const known = new Set(names.filter((t) => SAFE.test(t)));
  const colCache = {};
  const cols = (t) => (colCache[t] ||= db.prepare("PRAGMA table_info(" + t + ")").all().map((c) => c.name));
  const ok = (t) => known.has(t);

  return {
    engine: "sqlite",
    tables: () => [...known],
    list: (t) => (ok(t) ? db.prepare("SELECT * FROM " + t).all() : []),
    get: (t, id) => (ok(t) ? db.prepare("SELECT * FROM " + t + " WHERE id = ?").get(id) ?? null : null),
    create: (t, row) => {
      if (!ok(t)) throw new Error("unknown table");
      const id = row.id ?? crypto.randomUUID();
      const data = { ...row, id };
      const keys = Object.keys(data).filter((k) => cols(t).includes(k));
      db.prepare("INSERT INTO " + t + " (" + keys.join(",") + ") VALUES (" + keys.map(() => "?").join(",") + ")")
        .run(...keys.map((k) => data[k]));
      return db.prepare("SELECT * FROM " + t + " WHERE id = ?").get(id);
    },
    update: (t, id, patch) => {
      if (!ok(t)) return null;
      const keys = Object.keys(patch).filter((k) => k !== "id" && cols(t).includes(k));
      if (keys.length) db.prepare("UPDATE " + t + " SET " + keys.map((k) => k + "=?").join(",") + " WHERE id = ?")
        .run(...keys.map((k) => patch[k]), id);
      return db.prepare("SELECT * FROM " + t + " WHERE id = ?").get(id) ?? null;
    },
    remove: (t, id) => (ok(t) ? db.prepare("DELETE FROM " + t + " WHERE id = ?").run(id).changes > 0 : false),
  };
}
