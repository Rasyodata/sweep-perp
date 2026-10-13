// Install native deps (better-sqlite3) on first run if missing.
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
try {
  require.resolve("better-sqlite3");
} catch {
  console.log("[deps] better-sqlite3 kuruluyor (ilk çalıştırma)…");
  try {
    execSync("npm install --no-audit --no-fund", { stdio: "inherit", cwd: process.cwd() });
  } catch (e) {
    console.warn("[deps] kurulum başarısız — uygulama JSON store ile çalışacak.");
  }
}
