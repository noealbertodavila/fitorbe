// Revisa que la política de seguridad de contenido (CSP) no bloquee nada:
// abre las pantallas con un navegador real y falla si aparece algún bloqueo
// ("Content Security Policy" / "Refused to …") o un error de la página.
// Uso: BASE_URL=http://localhost:8080 APP=obrix|fitorbe node revisar-csp.mjs
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:8080";
const APP = process.env.APP ?? "obrix";
const u = Date.now().toString(36);

async function api(method, path, body, token) {
  const r = await fetch(BASE + "/api" + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await r.json(); } catch { /* sin cuerpo */ }
  if (r.status >= 400) throw new Error(`${method} ${path} → ${r.status} ${JSON.stringify(data)}`);
  return data;
}

// Cuentas y pantallas de cada app.
async function plan() {
  if (APP === "obrix") {
    const d = await api("POST", "/auth/demo", { name: "Revisión CSP", email: `csp-${u}@prueba.test`, password: "clave-segura-1" });
    const cliente = await api("POST", "/clientes", { name: "Cliente CSP", email: `cli-${u}@prueba.test` }, d.token).catch(() => null);
    await api("POST", "/cotizaciones", {
      clientId: cliente?.id, quoteDate: "2026-10-30", validityDate: "2026-11-29", description: "Prueba",
      lineItems: [{ descripcion: "Panel", cantidad: 1, precioUnitario: 1000, total: 1000 }], subtotal: 1000, total: 1000,
      paymentPlan: [{ pct: 50, label: "Antes de comenzar" }, { pct: 50, label: "Al terminar el trabajo" }],
    }, d.token).catch((e) => console.log("aviso:", e.message));
    const login = async (page) => {
      await page.goto(BASE + "/login");
      await page.evaluate(([t, us]) => { localStorage.setItem("worktrack_token", t); localStorage.setItem("worktrack_user", JSON.stringify(us)); }, [d.token, d.user]);
    };
    return [
      { rutas: ["/", "/login", "/register", "/forgot-password", "/privacidad", "/terminos"] },
      { login, rutas: ["/dashboard", "/trabajos", "/clientes", "/horas", "/cotizaciones", "/facturas", "/settings", "/reportes", "/employees", "/jornada", "/solicitudes", "/cargos"] },
    ];
  }
  // Fitorbe: coach nuevo, un cliente suyo y el superadmin.
  const coach = await api("POST", "/auth/registro-coach", { nombre: "Coach CSP", negocio: "CSP " + u, email: `coach-${u}@prueba.test`, password: "clave-segura-1", acepta: true });
  await api("POST", "/clientes", { nombre: "Cliente CSP", email: `cli-${u}@prueba.test`, password: "clave-cliente-1" }, coach.token);
  const cli = await api("POST", "/auth/login", { email: `cli-${u}@prueba.test`, password: "clave-cliente-1" });
  const admin = process.env.SUPERADMIN_EMAIL
    ? await api("POST", "/auth/login", { email: process.env.SUPERADMIN_EMAIL, password: process.env.SUPERADMIN_PASSWORD }).catch(() => null)
    : null;
  const con = (t) => async (page) => { await page.goto(BASE + "/login"); await page.evaluate((x) => localStorage.setItem("nahofit_auth_token", x), t); };
  const p = [
    { rutas: ["/", "/login", "/registro", "/privacidad", "/terminos"] },
    { login: con(coach.token), rutas: ["/coach", "/coach/clientes", "/coach/rutinas", "/coach/nutricion", "/coach/emocional", "/coach/mensajes", "/coach/reportes", "/coach/pagos", "/coach/solicitudes", "/coach/planes", "/coach/negocio"] },
    { login: con(cli.token), rutas: ["/cliente", "/cliente/rutina", "/cliente/nutricion", "/cliente/calendario", "/cliente/progreso", "/cliente/emocional", "/cliente/mensajes", "/cliente/pagos"] },
  ];
  if (admin?.token) p.push({ login: con(admin.token), rutas: ["/admin", "/admin/coaches"] });
  return p;
}

const browser = await chromium.launch();
const problemas = [];
let paginas = 0;
for (const grupo of await plan()) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();
  let ruta = "";
  page.on("console", (m) => {
    const t = m.text();
    if (/Content Security Policy|Refused to (load|execute|apply|connect|frame)/i.test(t)) problemas.push(`${ruta}: ${t.slice(0, 300)}`);
  });
  page.on("pageerror", (e) => problemas.push(`${ruta}: error de la página: ${e.message.slice(0, 200)}`));
  if (grupo.login) await grupo.login(page);
  for (ruta of grupo.rutas) {
    await page.goto(BASE + ruta, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(400);
    paginas++;
  }
  await ctx.close();
}
await browser.close();
console.log(`Pantallas revisadas: ${paginas}`);
if (problemas.length) {
  console.log("Bloqueos o errores:\n" + [...new Set(problemas)].join("\n"));
  process.exit(1);
}
console.log("Sin bloqueos de la CSP.");
