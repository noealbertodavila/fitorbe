// Fitorbe: copiar un plan de comida o una rutina a otra semana, sin IA.
import { test } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL ?? "http://localhost:8080";
const uniq = "cop" + Date.now().toString(36);
async function call(method, path, { token, body } = {}) {
  const res = await fetch(BASE + "/api" + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* sin cuerpo */ }
  return { status: res.status, data };
}
const registrar = async (n) => {
  const r = await call("POST", "/auth/registro-coach", { body: { nombre: `Coach ${n}`, email: `${n}-${uniq}@prueba.test`, password: "clave-segura-1", acepta: true } });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  return r.data.token;
};

test("el coach copia plan y rutina a otra semana; el cliente la ve publicada", async () => {
  const A = await registrar("a");
  const B = await registrar("b");
  const nuevo = await call("POST", "/clientes", { token: A, body: { nombre: "Cliente C", email: `cl-${uniq}@prueba.test`, password: "clave-cliente-1" } });
  assert.equal(nuevo.status, 201, JSON.stringify(nuevo.data));
  const id = nuevo.data.id;
  const cli = (await call("POST", "/auth/login", { body: { email: `cl-${uniq}@prueba.test`, password: "clave-cliente-1" } })).data.token;
  const desde = "2026-10-26", hasta = "2026-11-02";

  for (const dia of [0, 1]) {
    const r = await call("POST", "/planes-comida", { token: A, body: { clienteId: id, semanaInicio: desde, diaSemana: dia, comidas: [{ nombre: "Desayuno", completada: true }], caloriasTotal: 400, aprobada: true } });
    assert.equal(r.status, 201, JSON.stringify(r.data));
  }
  const rr = await call("POST", "/rutinas", { token: A, body: { clienteId: id, semanaInicio: desde, diaSemana: 0, ejercicios: [{ nombre: "Sentadilla" }], aprobada: true } });
  assert.equal(rr.status, 201, JSON.stringify(rr.data));

  // Reglas: lunes válidos, semanas distintas, con algo que copiar, y solo su coach.
  assert.equal((await call("POST", "/planes-comida/copiar", { token: A, body: { clienteId: id, desde, hasta: "2026-11-04" } })).status, 400);
  assert.equal((await call("POST", "/planes-comida/copiar", { token: A, body: { clienteId: id, desde, hasta: desde } })).status, 400);
  assert.equal((await call("POST", "/planes-comida/copiar", { token: A, body: { clienteId: id, desde: "2026-10-19", hasta } })).status, 404);
  assert.equal((await call("POST", "/planes-comida/copiar", { token: B, body: { clienteId: id, desde, hasta } })).status, 403);
  assert.equal((await call("POST", "/planes-comida/copiar", { token: cli, body: { clienteId: id, desde, hasta } })).status, 403);

  const c1 = await call("POST", "/planes-comida/copiar", { token: A, body: { clienteId: id, desde, hasta, publicar: true } });
  assert.equal(c1.status, 201, JSON.stringify(c1.data));
  assert.equal(c1.data.copiados, 2);
  const c2 = await call("POST", "/rutinas/copiar", { token: A, body: { clienteId: id, desde, hasta } });
  assert.equal(c2.status, 201, JSON.stringify(c2.data));

  // El cliente ve la semana nueva publicada, sin las marcas de "hecho" de la anterior.
  const plan = await call("GET", `/planes-comida/${id}/${hasta}`, { token: cli });
  assert.equal(plan.status, 200);
  assert.equal(plan.data.length, 2);
  assert.equal(plan.data[0].comidas[0].completada, false);
  const rutina = await call("GET", `/rutinas/${id}/${hasta}`, { token: cli });
  assert.equal(rutina.data.length, 1);
  const semanas = (await call("GET", `/planes-comida/semanas/${id}`, { token: cli })).data.map((s) => s.semanaInicio);
  assert.deepEqual(semanas, [hasta, desde]);

  // Copiar como borrador: el cliente no lo ve.
  await call("POST", "/planes-comida/copiar", { token: A, body: { clienteId: id, desde, hasta: "2026-11-09", publicar: false } });
  assert.equal((await call("GET", `/planes-comida/${id}/2026-11-09`, { token: cli })).data.length, 0);
  assert.equal((await call("GET", `/planes-comida/${id}/2026-11-09`, { token: A })).data.length, 2);
});
