// Zero-dependency JSON store. Swap for SQLite/Postgres when adding a driver.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DATA = path.join(process.cwd(), "data", "store.json");

export function createStore(tables) {
  let db = {};
  if (fs.existsSync(DATA)) {
    try { db = JSON.parse(fs.readFileSync(DATA, "utf8")); } catch { db = {}; }
  }
  for (const t of tables) if (!db[t]) db[t] = [];
  const save = () => {
    fs.mkdirSync(path.dirname(DATA), { recursive: true });
    fs.writeFileSync(DATA, JSON.stringify(db, null, 2));
  };
  save();
  return {
    tables: () => Object.keys(db),
    list: (t) => db[t] ?? [],
    get: (t, id) => (db[t] ?? []).find((r) => r.id === id) ?? null,
    create: (t, row) => {
      const r = { id: row.id ?? crypto.randomUUID(), ...row, _created: new Date().toISOString() };
      (db[t] ||= []).push(r); save(); return r;
    },
    update: (t, id, patch) => {
      const r = (db[t] ?? []).find((x) => x.id === id);
      if (!r) return null;
      Object.assign(r, patch, { id }); save(); return r;
    },
    remove: (t, id) => {
      const before = (db[t] ?? []).length;
      db[t] = (db[t] ?? []).filter((x) => x.id !== id); save();
      return before !== db[t].length;
    },
  };
}
