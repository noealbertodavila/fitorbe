// Toma fotos de las pantallas principales de Fitorbe (para revisar el diseño).
// Uso en GitHub Actions: node scripts/capturas/capturas.mjs (con el servidor corriendo en BASE_URL).
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:8080";
const OUT = process.env.OUT ?? "capturas";
fs.mkdirSync(OUT, { recursive: true });
const u = Date.now().toString(36);
const api = async (method, path, token, body) => {
  const r = await fetch(BASE + "/api" + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return r.json().catch(() => null);
};

// Datos de ejemplo
const coach = await api("POST", "/auth/registro-coach", null, { nombre: "Ana Torres", negocio: "Bienestar con Ana", email: `ana-${u}@demo.test`, password: "clave-demo-123", acepta: true });
const T = coach.token;
for (const [n, obj] of [["María López", "Manejar el estrés y bajar 5 kg"], ["Lucía Pérez", "Dormir mejor y tener más energía"], ["Carmen Ruiz", "Ganar fuerza"]]) {
  const c = await api("POST", "/clientes", T, { nombre: n, email: `${n.split(" ")[0].toLowerCase()}-${u}@demo.test`, password: "clave-demo-123", objetivo: obj });
  await api("POST", "/pagos", T, { clienteId: c.id, fecha: new Date().toISOString().slice(0, 10), monto: 149, metodo: "zelle", concepto: "Mensualidad", estado: "pagado" });
}
await api("POST", "/contacto", null, { coach: coach.coach.slug, nombre: "Sofía Martínez", telefono: "8015550101", interes: "primera_sesion", mensaje: "Quiero empezar con el plan emocional", acepta: true });

const browser = await chromium.launch();
async function foto(nombre, ruta, { token, ancho = 1366, alto = 860, antes } = {}) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  if (token) {
    await page.goto(BASE + "/login");
    await page.evaluate((t) => localStorage.setItem("nahofit_auth_token", t), token);
  }
  await page.goto(BASE + ruta, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  if (antes) await antes(page);
  await page.screenshot({ path: `${OUT}/${nombre}.png`, fullPage: true });
  await ctx.close();
}

await foto("01-inicio", "/");
await foto("01-inicio-celular", "/", { ancho: 390, alto: 844 });
await foto("02-registro", "/registro");
await foto("03-login", "/login");
await foto("04-coach-panel", "/coach", { token: T });
await foto("05-coach-clientes", "/coach/clientes", { token: T });
await foto("06-coach-nuevo-cliente", "/coach/clientes", { token: T, antes: async (p) => { await p.getByRole("button", { name: "Nuevo cliente" }).click(); await p.waitForTimeout(500); } });
await foto("07-coach-negocio", "/coach/negocio", { token: T });
await foto("08-coach-planes", "/coach/planes", { token: T });
await foto("09-coach-solicitudes", "/coach/solicitudes", { token: T });
await foto("10-coach-celular", "/coach/clientes", { token: T, ancho: 390, alto: 844 });

const sa = await api("POST", "/auth/login", null, { email: process.env.SUPERADMIN_EMAIL, password: process.env.SUPERADMIN_PASSWORD });
await foto("11-superadmin-panel", "/admin", { token: sa.token });
await foto("12-superadmin-coaches", "/admin/coaches", { token: sa.token });

const cli = await api("POST", "/auth/login", null, { email: `maría-${u}@demo.test`, password: "clave-demo-123" });
const cliTok = cli?.token ?? (await api("POST", "/auth/login", null, { email: `maria-${u}@demo.test`, password: "clave-demo-123" }))?.token;
if (cliTok) await foto("13-cliente-panel", "/cliente", { token: cliTok, ancho: 390, alto: 844 });

// Coach suspendido: aviso de pausa
await api("PATCH", `/superadmin/coaches/${coach.usuario.id}`, sa.token, { estado: "suspendido" });
await foto("14-coach-suspendido", "/coach", { token: T });

await browser.close();
console.log("Listo:", fs.readdirSync(OUT).join(", "));
