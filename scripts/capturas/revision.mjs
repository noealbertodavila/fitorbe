// Revisión completa de Fitorbe: abre cada pantalla (coach, cliente, superadmin y públicas)
// en computadora y celular, anota errores de la página o de la API y prueba a mano
// los flujos principales (editar un cliente escribiendo letra por letra, crear cliente,
// mandar mensaje). Deja fotos y un reporte (reporte.md) en OUT.
import { chromium } from "playwright";
import fs from "node:fs";
import { sembrar } from "./datos-ejemplo.mjs";

const BASE = process.env.BASE_URL ?? "http://localhost:8080";
const OUT = process.env.OUT ?? "revision";
fs.mkdirSync(OUT, { recursive: true });

const { T, mariaId, mariaToken, u, api } = await sembrar(BASE);
const sa = await api("POST", "/auth/login", null, { email: process.env.SUPERADMIN_EMAIL, password: process.env.SUPERADMIN_PASSWORD });

const problemas = [];
const anotar = (donde, que) => { problemas.push({ donde, que }); console.log("PROBLEMA", donde, "·", que); };
const browser = await chromium.launch();

async function abrir(token, ancho, alto) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto } });
  const page = await ctx.newPage();
  page._errores = [];
  page.on("pageerror", (e) => page._errores.push("Error de la página: " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|fonts\.g/.test(m.text())) page._errores.push("Consola: " + m.text().slice(0, 200)); });
  page.on("response", (r) => {
    const url = r.url();
    if (url.startsWith(BASE + "/api") && r.status() >= 400) page._errores.push(`API ${r.request().method()} ${url.replace(BASE, "")} → ${r.status()}`);
  });
  if (token) {
    await page.goto(BASE + "/login");
    await page.evaluate((t) => localStorage.setItem("nahofit_auth_token", t), token);
  }
  return { ctx, page };
}

async function revisar(nombre, ruta, token, { ancho = 1366, alto = 860, foto = true } = {}) {
  const { ctx, page } = await abrir(token, ancho, alto);
  try {
    await page.goto(BASE + ruta, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1200);
    if (ancho < 500) {
      const sobra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (sobra > 2) anotar(`${nombre} (celular)`, `la página se sale de la pantalla ${sobra}px a lo ancho`);
    }
    const texto = await page.evaluate(() => document.body.innerText);
    if (/undefined|NaN|\[object Object\]/.test(texto)) anotar(nombre, "se ve texto raro (undefined, NaN u [object Object]) en la pantalla");
    if (foto) await page.screenshot({ path: `${OUT}/${nombre}.png`, fullPage: true });
  } catch (e) {
    anotar(nombre, "no cargó: " + e.message.split("\n")[0]);
  }
  for (const e of page._errores) anotar(nombre, e);
  await ctx.close();
}

// ── Pantallas ──
const publicas = [["publica-inicio", "/"], ["publica-login", "/login"], ["publica-registro", "/registro"], ["publica-privacidad", "/privacidad"], ["publica-terminos", "/terminos"]];
const coach = [["coach-inicio", "/coach"], ["coach-clientes", "/coach/clientes"], ["coach-cliente", `/coach/clientes/${mariaId}`], ["coach-rutinas", "/coach/rutinas"], ["coach-nutricion", "/coach/nutricion"], ["coach-emocional", "/coach/emocional"], ["coach-mensajes", "/coach/mensajes"], ["coach-reportes", "/coach/reportes"], ["coach-pagos", "/coach/pagos"], ["coach-solicitudes", "/coach/solicitudes"], ["coach-planes", "/coach/planes"], ["coach-negocio", "/coach/negocio"]];
const cliente = [["cliente-inicio", "/cliente"], ["cliente-rutina", "/cliente/rutina"], ["cliente-nutricion", "/cliente/nutricion"], ["cliente-calendario", "/cliente/calendario"], ["cliente-progreso", "/cliente/progreso"], ["cliente-emocional", "/cliente/emocional"], ["cliente-mensajes", "/cliente/mensajes"], ["cliente-pagos", "/cliente/pagos"]];
const admin = [["admin-inicio", "/admin"], ["admin-coaches", "/admin/coaches"]];

for (const [n, r] of publicas) { await revisar(n, r, null); await revisar(n + "-cel", r, null, { ancho: 390, alto: 844 }); }
for (const [n, r] of coach) { await revisar(n, r, T); await revisar(n + "-cel", r, T, { ancho: 390, alto: 844 }); }
for (const [n, r] of cliente) { await revisar(n, r, mariaToken, { ancho: 390, alto: 844 }); await revisar(n + "-pc", r, mariaToken, { foto: false }); }
for (const [n, r] of admin) { await revisar(n, r, sa?.token); await revisar(n + "-cel", r, sa?.token, { ancho: 390, alto: 844 }); }

// ── Flujo 1: el coach edita a su cliente escribiendo letra por letra ──
{
  const { ctx, page } = await abrir(T, 1366, 860);
  const donde = "Editar cliente";
  try {
    await page.goto(BASE + `/coach/clientes/${mariaId}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Editar Perfil/i }).click();
    const campo = page.locator("#ed-nombre");
    await campo.click();
    await campo.press("Control+A");
    await campo.pressSequentially("María López Ruiz", { delay: 20 });
    const valor = await campo.inputValue();
    if (valor !== "María López Ruiz") anotar(donde, `al escribir el nombre se pierde el cursor: quedó "${valor}"`);
    const tel = page.locator("#ed-telefono");
    await tel.click(); await tel.press("Control+A"); await tel.pressSequentially("8015559999", { delay: 20 });
    if ((await tel.inputValue()) !== "8015559999") anotar(donde, "al escribir el teléfono se pierde el cursor");
    const [resp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/usuarios/${mariaId}`) && r.request().method() === "PUT", { timeout: 10000 }),
      page.getByRole("button", { name: /^Guardar/i }).last().click(),
    ]);
    if (resp.status() !== 200) anotar(donde, `guardar respondió ${resp.status()}: ${(await resp.text()).slice(0, 200)}`);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/flujo-editar-cliente.png` });
    const titulo = (await page.locator("h1").first().innerText()).trim();
    if (!titulo.includes("María López Ruiz")) anotar(donde, `se guardó, pero la ficha sigue mostrando el dato viejo ("${titulo}") hasta recargar`);
    const guardado = await api("GET", `/clientes/${mariaId}`, T);
    if (guardado?.nombre !== "María López Ruiz" || guardado?.telefono !== "8015559999") anotar(donde, `no se guardó: ${guardado?.nombre} / ${guardado?.telefono}`);
  } catch (e) { anotar(donde, "no se pudo completar: " + e.message.split("\n")[0]); await page.screenshot({ path: `${OUT}/flujo-editar-cliente-error.png` }); }
  for (const e of page._errores) anotar(donde, e);
  await ctx.close();
}

// ── Flujo 2: el coach crea un cliente nuevo ──
{
  const { ctx, page } = await abrir(T, 1366, 860);
  const donde = "Nuevo cliente";
  try {
    await page.goto(BASE + "/coach/clientes", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Nuevo cliente/i }).first().click();
    await page.waitForTimeout(400);
    await page.locator("#nc-nombre").pressSequentially("Paula Nueva", { delay: 10 });
    if ((await page.locator("#nc-nombre").inputValue()) !== "Paula Nueva") anotar(donde, "al escribir el nombre se pierde el cursor");
    await page.locator("#nc-email").pressSequentially(`nueva-${u}@ejemplo.test`, { delay: 5 });
    await page.locator("#nc-pass").fill("clave-nueva-123");
    const [resp] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith("/api/clientes") && r.request().method() === "POST", { timeout: 10000 }),
      page.getByRole("button", { name: /Agregar cliente/i }).click(),
    ]);
    if (resp.status() !== 201) anotar(donde, `crear respondió ${resp.status()}: ${(await resp.text()).slice(0, 200)}`);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/flujo-nuevo-cliente.png` });
  } catch (e) { anotar(donde, "no se pudo completar: " + e.message.split("\n")[0]); await page.screenshot({ path: `${OUT}/flujo-nuevo-cliente-error.png` }); }
  for (const e of page._errores) anotar(donde, e);
  await ctx.close();
}

// ── Flujo 3: el cliente le escribe a su coach ──
{
  const { ctx, page } = await abrir(mariaToken, 390, 844);
  const donde = "Mensaje del cliente";
  try {
    await page.goto(BASE + "/cliente/mensajes", { waitUntil: "networkidle" });
    const caja = page.locator("input[placeholder*='mensaje' i], textarea[placeholder*='mensaje' i]").first();
    await caja.pressSequentially("Hola, ¿mañana a qué hora?", { delay: 10 });
    const [resp] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith("/api/mensajes") && r.request().method() === "POST", { timeout: 10000 }),
      caja.press("Enter"),
    ]);
    if (resp.status() !== 201) anotar(donde, `enviar respondió ${resp.status()}`);
  } catch (e) { anotar(donde, "no se pudo completar: " + e.message.split("\n")[0]); }
  for (const e of page._errores) anotar(donde, e);
  await ctx.close();
}

// ── Flujo 4: el cliente escribe sus medidas sin perder el cursor ──
{
  const { ctx, page } = await abrir(mariaToken, 390, 844);
  const donde = "Medidas del cliente";
  try {
    await page.goto(BASE + "/cliente/progreso", { waitUntil: "networkidle" });
    const b = page.getByRole("button", { name: /registr|nuevo|agregar/i }).first();
    if (await b.isEnabled().catch(() => false)) {
      await b.click();
      await page.waitForTimeout(400);
      const campo = page.locator("#med-cinturaCm, #med-pesoKg").first();
      if (await campo.count()) {
        await campo.pressSequentially("72.5", { delay: 20 });
        if ((await campo.inputValue()) !== "72.5") anotar(donde, "al escribir una medida se pierde el cursor");
      }
    }
  } catch (e) { anotar(donde, "no se pudo completar: " + e.message.split("\n")[0]); }
  await ctx.close();
}

await browser.close();

const unicos = [...new Map(problemas.map((p) => [p.donde + p.que, p])).values()];
const md = [
  `# Revisión completa de Fitorbe`,
  ``,
  `${coach.length + cliente.length + publicas.length + admin.length} pantallas en computadora y celular, y 4 flujos probados a mano.`,
  ``,
  unicos.length ? `## ${unicos.length} problema(s)` : `## Sin problemas`,
  ...unicos.map((p) => `- **${p.donde}**: ${p.que}`),
].join("\n");
fs.writeFileSync(`${OUT}/reporte.md`, md + "\n");
fs.writeFileSync(`${OUT}/reporte.json`, JSON.stringify(unicos, null, 2));
console.log(md);
