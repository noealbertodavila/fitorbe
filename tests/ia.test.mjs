// Fitorbe: límites de IA por plan, metas calculadas por la app (sin IA) y reglas del coach.
import { test } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL ?? "http://localhost:8080";
const uniq = "ia" + Date.now().toString(36);
async function call(method, path, { token, body } = {}) {
  const res = await fetch(BASE + "/api" + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const texto = await res.text();
  let data = null;
  try { data = JSON.parse(texto); } catch { data = texto; }
  return { status: res.status, data };
}
const login = async (email, password) => (await call("POST", "/auth/login", { body: { email, password } })).data?.token;

test("límites por plan, metas sin IA y reglas del coach", async () => {
  const rc = await call("POST", "/auth/registro-coach", { body: { nombre: "Coach IA", email: `c-${uniq}@prueba.test`, password: "clave-segura-1", acepta: true } });
  assert.equal(rc.status, 201, JSON.stringify(rc.data));
  const coach = rc.data.token, coachId = rc.data.usuario.id;
  const sa = await login(process.env.SUPERADMIN_EMAIL, process.env.SUPERADMIN_PASSWORD);

  // En prueba: 20 generaciones.
  let uso = await call("GET", "/ia/uso", { token: coach });
  assert.equal(uso.status, 200, JSON.stringify(uso.data));
  assert.equal(uso.data.limite, 20);
  assert.equal(uso.data.usadas, 0);

  // Cliente con datos completos.
  const nuevo = await call("POST", "/clientes", { token: coach, body: { nombre: "Cliente IA", email: `cl-${uniq}@prueba.test`, password: "clave-cliente-1" } });
  assert.equal(nuevo.status, 201, JSON.stringify(nuevo.data));
  const id = nuevo.data.id;
  const ficha = { sexo: "Femenino", peso: 70, altura: 165, fechaNacimiento: "1996-01-01", diasDisponibles: 4, objetivoPrincipal: "Perder grasa corporal", condicionesMedicas: "Diabetes tipo 2" };
  const put = await call("PUT", `/clientes/${id}`, { token: coach, body: ficha });
  assert.equal(put.status, 200, JSON.stringify(put.data));

  // Metas con Mifflin-St Jeor: mujer, actividad 4 días (1.55), pérdida de grasa (-20 %).
  const edad = Math.floor((Date.now() - new Date("1996-01-01").getTime()) / (365.25 * 864e5));
  const esperadas = Math.round(((10 * 70 + 6.25 * 165 - 5 * edad - 161) * 1.55 * 0.8) / 10) * 10;
  const an = await call("GET", `/ia/analisis/${id}?tipo=nutricion&semana=2026-11-02`, { token: coach });
  assert.equal(an.status, 200, JSON.stringify(an.data));
  assert.equal(an.data.objetivo, "perdida");
  assert.equal(an.data.metas.calorias, esperadas);
  assert.equal(an.data.metas.proteinaG, 140); // 70 kg × 2 g
  assert.ok(an.data.resumen[0].startsWith("Metas:"), an.data.resumen[0]);
  const ru = await call("GET", `/ia/analisis/${id}?tipo=rutina&semana=2026-11-02`, { token: coach });
  assert.equal(ru.status, 200);
  assert.ok(ru.data.resumen.some((r) => /condiciones médicas/.test(r)), JSON.stringify(ru.data));

  // Reglas del coach: se guardan y se leen.
  const reglas = await call("PUT", "/mi-negocio", { token: coach, body: { reglasNutricion: "Sin pan ni pasta", reglasEntrenamiento: "" } });
  assert.equal(reglas.status, 200, JSON.stringify(reglas.data));
  assert.equal((await call("GET", "/mi-negocio", { token: coach })).data.reglasNutricion, "Sin pan ni pasta");

  // Plan Inicial activo: sin IA (planes, rutinas ni chat del cliente).
  assert.equal((await call("PATCH", `/superadmin/coaches/${coachId}`, { token: sa, body: { estado: "activo", plan: "inicial" } })).status, 200);
  assert.equal((await call("GET", "/ia/uso", { token: coach })).data.limite, 0);
  assert.equal((await call("POST", "/planes-comida/generar-ai", { token: coach, body: { clienteId: id, semanaInicio: "2026-11-02" } })).status, 403);
  assert.equal((await call("POST", "/rutinas/generar-ai", { token: coach, body: { clienteId: id, semanaInicio: "2026-11-02" } })).status, 403);
  const cli = await login(`cl-${uniq}@prueba.test`, "clave-cliente-1");
  const chat = await call("POST", "/ai/chat", { token: cli, body: { clienteId: id, mensaje: "Hola", historial: [] } });
  assert.match(String(chat.data), /no está incluido/);

  // Pro: 150; una generación que falla no gasta.
  assert.equal((await call("PATCH", `/superadmin/coaches/${coachId}`, { token: sa, body: { plan: "pro" } })).status, 200);
  uso = await call("GET", "/ia/uso", { token: coach });
  assert.equal(uso.data.limite, 150);
  const gen = await call("POST", "/planes-comida/generar-ai", { token: coach, body: { clienteId: id, semanaInicio: "2026-11-02", soloDia: 0 } });
  assert.notEqual(gen.status, 403);
  if (gen.status !== 200) assert.equal((await call("GET", "/ia/uso", { token: coach })).data.usadas, 0);
});
