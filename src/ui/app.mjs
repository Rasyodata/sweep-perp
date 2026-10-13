// Auth shell: public landing (pre-login) → mounts the Sweep Perp SPA after login.
import { mountExchange, unmountExchange } from "/exchange.mjs";
import { renderLanding, stopLanding } from "/landing.mjs";
let META = null, USER = null;
const token = () => localStorage.getItem("token") || "";

async function api(p, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (opts.body) headers["Content-Type"] = "application/json";
  if (token()) headers["Authorization"] = "Bearer " + token();
  const r = await fetch(p, { ...opts, headers });
  if (r.status === 401 && !p.startsWith("/api/auth")) { localStorage.removeItem("token"); showLanding(); throw new Error("401"); }
  return r.json();
}

function showLanding() {
  stopLanding();
  const main = document.getElementById("main");
  main.style.padding = "0"; main.style.width = "100%";
  renderLanding(main, {
    doLogin: async (email, password, mode, name) => {
      const body = { email, password }; if (mode === "register") body.name = name || email;
      const r = await api("/api/auth/" + (mode === "login" ? "login" : "register"), { method: "POST", body: JSON.stringify(body) });
      if (r && r.token) { stopLanding(); localStorage.setItem("token", r.token); boot(); return null; }
      return { error: (r && r.error) || "login failed" };
    },
  });
}

function mountApp() {
  stopLanding();
  const aside = document.querySelector("aside"); if (aside) aside.style.display = "none";
  const main = document.getElementById("main");
  main.style.padding = "0"; main.style.width = "100%";
  async function logout() {
    unmountExchange();
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem("token");
    showLanding();
  }
  mountExchange(main, { onLogout: logout });
}

async function boot() {
  META = await api("/api/_meta");
  if (!token()) return showLanding();
  try {
    const me = await fetch("/api/auth/me", { headers: { Authorization: "Bearer " + token() } });
    if (!me.ok) { localStorage.removeItem("token"); return showLanding(); }
    USER = (await me.json()).user;
    mountApp();
  } catch { showLanding(); }
}
boot();
