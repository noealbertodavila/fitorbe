// Fotos del producto con datos de ejemplo, para la página de inicio de fitorbe.com.
// Uso en GitHub Actions (workflow "Fotos del producto"), con el servidor corriendo en BASE_URL.
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:8080";
const OUT = process.env.OUT ?? "producto";
fs.mkdirSync(OUT, { recursive: true });
import { sembrar } from "./datos-ejemplo.mjs";
const { T, mariaId, mariaToken } = await sembrar(BASE);
const maria = mariaToken ? { token: mariaToken } : null;

const browser = await chromium.launch();
async function foto(nombre, ruta, { token, ancho = 1440, alto = 900, completa = false, antes } = {}) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  if (token) {
    await page.goto(BASE + "/login");
    await page.evaluate((t) => localStorage.setItem("nahofit_auth_token", t), token);
  }
  await page.goto(BASE + ruta, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  if (antes) await antes(page);
  await page.screenshot({ path: `${OUT}/${nombre}.png`, fullPage: completa });
  await ctx.close();
}

await foto("coach-panel", "/coach", { token: T });
await foto("coach-clientes", "/coach/clientes", { token: T });
await foto("coach-cliente", `/coach/clientes/${mariaId}`, { token: T });
const elegir = (nombre) => async (p) => {
  try {
    await p.getByRole("combobox").first().click();
    await p.getByRole("option", { name: nombre }).first().click();
    await p.waitForTimeout(1500);
  } catch (e) { console.log("Aviso: no se pudo elegir", nombre, e.message); }
};
await foto("coach-emocional", "/coach/emocional", { token: T, antes: elegir("María López") });
await foto("coach-reportes", "/coach/reportes", { token: T });
await foto("coach-pagos", "/coach/pagos", { token: T });
await foto("coach-mensajes", "/coach/mensajes", { token: T });
await foto("coach-rutinas", "/coach/rutinas", { token: T, antes: elegir("María López") });
await foto("coach-nutricion", "/coach/nutricion", { token: T, antes: elegir("María López") });
await foto("coach-negocio", "/coach/negocio", { token: T });
await foto("coach-celular", "/coach", { token: T, ancho: 390, alto: 844 });
if (maria?.token) {
  await foto("cliente-panel", "/cliente", { token: maria.token, ancho: 390, alto: 844 });
  await foto("cliente-nutricion", "/cliente/nutricion", { token: maria.token, ancho: 390, alto: 844 });
  await foto("cliente-progreso", "/cliente/progreso", { token: maria.token, ancho: 390, alto: 844 });
  await foto("cliente-rutina", "/cliente/rutina", { token: maria.token, ancho: 390, alto: 844 });
  await foto("cliente-emocional", "/cliente/emocional", { token: maria.token, ancho: 390, alto: 844 });
  await foto("cliente-mensajes", "/cliente/mensajes", { token: maria.token, ancho: 390, alto: 844 });
}

await browser.close();
console.log("Listo:", fs.readdirSync(OUT).join(", "));
