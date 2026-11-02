// Fitorbe: el coach le pone contraseña nueva a su cliente y "¿Olvidaste tu contraseña?".
import { test } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL ?? "http://localhost:8080";
const uniq = "rec" + Date.now().toString(36);
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
const login = (email, password) => call("POST", "/auth/login", { body: { email, password } });

let A, B, cliente;
const correoCliente = `cli-${uniq}@prueba.test`;

test("el coach le pone una contraseña nueva a su cliente", async () => {
  const rA = await call("POST", "/auth/registro-coach", { body: { nombre: "Coach A", email: `a-${uniq}@prueba.test`, password: "clave-segura-1", acepta: true } });
  assert.equal(rA.status, 201, JSON.stringify(rA.data));
  A = rA.data.token;
  const rB = await call("POST", "/auth/registro-coach", { body: { nombre: "Coach B", email: `b-${uniq}@prueba.test`, password: "clave-segura-1", acepta: true } });
  assert.equal(rB.status, 201, JSON.stringify(rB.data));
  B = rB.data.token;

  const c = await call("POST", "/clientes", { token: A, body: { nombre: "Cliente", email: correoCliente, password: "clave-vieja-1" } });
  assert.equal(c.status, 201, JSON.stringify(c.data));
  cliente = c.data.id;
  assert.equal((await login(correoCliente, "clave-vieja-1")).status, 200);

  // Muy corta, no
  assert.equal((await call("PUT", `/usuarios/${cliente}`, { token: A, body: { password: "corta" } })).status, 400);
  // Otro coach, no
  assert.equal((await call("PUT", `/usuarios/${cliente}`, { token: B, body: { password: "clave-de-b-123" } })).status, 403);
  // Su coach, sí: entra con la nueva y ya no con la vieja
  const r = await call("PUT", `/usuarios/${cliente}`, { token: A, body: { password: "clave-nueva-1" } });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.passwordHash, undefined, "nunca se devuelve la contraseña cifrada");
  assert.equal((await login(correoCliente, "clave-nueva-1")).status, 200);
  assert.equal((await login(correoCliente, "clave-vieja-1")).status, 401);
});

test("pedir enlace responde igual exista o no el correo", async () => {
  assert.equal((await call("POST", "/auth/recuperar", { body: { email: "no-es-correo" } })).status, 400);
  const existe = await call("POST", "/auth/recuperar", { body: { email: correoCliente.toUpperCase() } });
  const noExiste = await call("POST", "/auth/recuperar", { body: { email: `nadie-${uniq}@prueba.test` } });
  assert.equal(existe.status, 200);
  assert.equal(noExiste.status, 200);
  assert.deepEqual(existe.data, noExiste.data);
});

test("restablecer rechaza enlaces falsos o una sesión usada como enlace", async () => {
  const sesion = (await login(correoCliente, "clave-nueva-1")).data.token;
  for (const token of ["", "basura", sesion]) {
    const r = await call("POST", "/auth/restablecer", { body: { token, password: "clave-intrusa-1" } });
    assert.equal(r.status, 400, `token ${token.slice(0, 12)}: ${JSON.stringify(r.data)}`);
  }
  assert.equal((await call("POST", "/auth/restablecer", { body: { token: sesion, password: "x" } })).status, 400);
  // La contraseña sigue igual
  assert.equal((await login(correoCliente, "clave-nueva-1")).status, 200);
});
