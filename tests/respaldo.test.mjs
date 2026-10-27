// El respaldo solo sale con el secreto, y trae todas las tablas con datos.
import { test } from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";

const BASE = process.env.BASE_URL ?? "http://localhost:8080";
const SECRETO = process.env.RESPALDO_SECRET || "prueba-respaldo-solo-para-ci-123";

test("sin secreto el respaldo no existe (404)", async () => {
  assert.equal((await fetch(BASE + "/api/respaldo")).status, 404);
  const mal = await fetch(BASE + "/api/respaldo", { headers: { "x-respaldo-secret": "x".repeat(SECRETO.length) } });
  assert.equal(mal.status, 404);
});

test("con el secreto entrega todas las tablas", async () => {
  // Que haya al menos un coach con datos.
  const r = await fetch(BASE + "/api/auth/registro-coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre: "Coach Respaldo", email: `respaldo-${Date.now()}@prueba.test`, password: "clave-segura-1", negocio: "Respaldo", acepta: true }),
  });
  assert.equal(r.status, 201, JSON.stringify(await r.clone().json().catch(() => null)));

  const res = await fetch(BASE + "/api/respaldo", { headers: { "x-respaldo-secret": SECRETO } });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "application/gzip");
  const buf = Buffer.from(await res.arrayBuffer());
  const datos = JSON.parse(zlib.gunzipSync(buf).toString("utf8"));
  assert.equal(datos.formato, "fitorbe-respaldo-1");
  const tablas = Object.keys(datos.tablas);
  assert.ok(tablas.length >= 5, "tablas: " + tablas.join(","));
  const conDatos = tablas.filter((t) => datos.tablas[t].length > 0);
  assert.ok(conDatos.length >= 1, "tablas con datos: " + conDatos.join(","));
});
