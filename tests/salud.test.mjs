// Prueba mínima: el servidor responde.
import { test } from "node:test";
import assert from "node:assert/strict";
const BASE = process.env.BASE_URL ?? "http://localhost:8080";
test("el servidor responde", async () => {
  const r = await fetch(BASE + "/api/healthz");
  assert.equal(r.status, 200);
});
