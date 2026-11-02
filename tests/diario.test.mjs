// Fitorbe: el diario es privado — solo su dueño lo lee y lo escribe.
import { test } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL ?? "http://localhost:8080";
const uniq = "dia" + Date.now().toString(36);
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
const login = async (email, password) => (await call("POST", "/auth/login", { body: { email, password } })).data?.token;

test("solo el cliente ve y escribe su diario; ni su coach ni el superadmin", async () => {
  const rc = await call("POST", "/auth/registro-coach", { body: { nombre: "Coach D", email: `c-${uniq}@prueba.test`, password: "clave-segura-1", acepta: true } });
  assert.equal(rc.status, 201, JSON.stringify(rc.data));
  const coach = rc.data.token;
  const nuevo = await call("POST", "/clientes", { token: coach, body: { nombre: "Cliente D", email: `cl-${uniq}@prueba.test`, password: "clave-cliente-1" } });
  assert.equal(nuevo.status, 201, JSON.stringify(nuevo.data));
  const id = nuevo.data.id;
  const cli = await login(`cl-${uniq}@prueba.test`, "clave-cliente-1");

  for (const [fecha, contenido] of [["2026-10-30", "Primer día"], ["2026-10-31", "Segundo día"], ["2026-11-01", "Tercer día"]]) {
    const r = await call("POST", "/diario", { token: cli, body: { clienteId: id, fecha, contenido, gratitud: "salud" } });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    assert.equal(r.data.clienteId, id);
  }
  // El cliente ve todo su historial, del más nuevo al más viejo, y puede pedir menos.
  const todo = await call("GET", `/diario/${id}?limite=50`, { token: cli });
  assert.equal(todo.status, 200);
  assert.deepEqual(todo.data.map((e) => e.fecha), ["2026-11-01", "2026-10-31", "2026-10-30"]);
  assert.equal((await call("GET", `/diario/${id}?limite=2`, { token: cli })).data.length, 2);

  // Su coach no puede leerlo ni escribirle.
  assert.equal((await call("GET", `/diario/${id}`, { token: coach })).status, 403);
  assert.equal((await call("POST", "/diario", { token: coach, body: { clienteId: id, fecha: "2026-11-01", contenido: "x" } })).status, 403);
  // El superadmin tampoco.
  const sa = await login(process.env.SUPERADMIN_EMAIL, process.env.SUPERADMIN_PASSWORD);
  assert.ok(sa, "login del superadmin");
  assert.equal((await call("GET", `/diario/${id}`, { token: sa })).status, 403);
  // Vacío o con fecha rara, no.
  assert.equal((await call("POST", "/diario", { token: cli, body: { fecha: "2026-11-01", contenido: "  " } })).status, 400);
  assert.equal((await call("POST", "/diario", { token: cli, body: { fecha: "ayer", contenido: "hola" } })).status, 400);
});
