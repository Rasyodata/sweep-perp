import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../src/db.mjs";
import { TABLES } from "../src/registry.mjs";

test("store boots and applies schema", () => {
  const s = createStore(TABLES.map((t) => t.name));
  assert.ok(Array.isArray(s.tables()));
});

test("tables are queryable", () => {
  const s = createStore(TABLES.map((t) => t.name));
  assert.ok(Array.isArray(s.list("auth_session")));
});
