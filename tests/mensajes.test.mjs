// Fitorbe: el coach ve cuántos mensajes sin leer tiene y el aviso por correo no rompe el envío.
import { test } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL ?? "http://localhost:8080";
const uniq = "msj" + Date.now().toString(36);
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

test("el cliente escribe y su coach ve los mensajes sin leer", async () => {
  const rc = await call("POST", "/auth/registro-coach", { body: { nombre: "Coach M", email: `c-${uniq}@prueba.test`, password: "clave-segura-1", acepta: true } });
  assert.equal(rc.status, 201, JSON.stringify(rc.data));
  const coach = rc.data.token;
  const coachId = rc.data.usuario.id;
  const nuevo = await call("POST", "/clientes", { token: coach, body: { nombre: "Cliente M", email: `cl-${uniq}@prueba.test`, password: "clave-cliente-1" } });
  assert.equal(nuevo.status, 201, JSON.stringify(nuevo.data));
  const cli = (await call("POST", "/auth/login", { body: { email: `cl-${uniq}@prueba.test`, password: "clave-cliente-1" } })).data.token;

  assert.equal((await call("GET", "/mensajes/no-leidos", { token: coach })).data.cantidad, 0);
  // Dos mensajes seguidos: el segundo no vuelve a avisar por correo, pero ambos se guardan.
  for (const contenido of ["Hola coach", "¿Me ayudas con la rutina?"]) {
    const r = await call("POST", "/mensajes", { token: cli, body: { receptorId: coachId, contenido } });
    assert.equal(r.status, 201, JSON.stringify(r.data));
  }
  assert.equal((await call("GET", "/mensajes/no-leidos", { token: coach })).data.cantidad, 2);

});
