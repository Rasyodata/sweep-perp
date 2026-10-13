// Build check: import generated modules to validate they load (no listening).
import { MODULES, TABLES } from "../src/registry.mjs";
await import("../src/server.mjs"); // must not start listening when imported
console.log("[build] OK — " + MODULES.length + " modules, " + TABLES.length + " tables");
