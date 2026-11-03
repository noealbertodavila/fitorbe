// Fitorbe: planes con precio y límites editables, límite de clientes, historial y resumen del negocio.
import { test } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL ?? "http://localhost:8080";
const uniq = "pl" + Date.now().toString(36);
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

test("planes, límite de clientes, historial y resumen del negocio", async () => {
  const SA = await login(process.env.SUPERADMIN_EMAIL, process.env.SUPERADMIN_PASSWORD);
  assert.ok(SA, "entra el superadmin");

  // Planes públicos para fitorbe.com (sin sesión) y los del panel
  const pub = await call("GET", "/planes-fitorbe");
  assert.equal(pub.status, 200);
  assert.deepEqual(pub.data.map((p) => p.clave), ["inicial", "pro", "estudio"]);
  assert.equal(pub.data.find((p) => p.clave === "inicial").ia, false);
  assert.equal(pub.data.find((p) => p.clave === "estudio").maxClientes, null);
  const planes = await call("GET", "/superadmin/planes", { token: SA });
  assert.equal(planes.status, 200);
  const estudio = planes.data.find((p) => p.clave === "estudio");

  // Editar un plan (y dejarlo como estaba)
  const ed = await call("PUT", "/superadmin/planes/estudio", { token: SA, body: { precioMes: estudio.precioMes + 1 } });
  assert.equal(ed.status, 200);
  assert.equal(ed.data.precioMes, estudio.precioMes + 1);
  assert.equal((await call("PUT", "/superadmin/planes/estudio", { token: SA, body: { precioMes: estudio.precioMes } })).status, 200);
  assert.equal((await call("PUT", "/superadmin/planes/estudio", { token: SA, body: { maxClientes: 0 } })).status, 400);
  assert.equal((await call("PUT", "/superadmin/planes/oro", { token: SA, body: { precioMes: 5 } })).status, 404);

  // Registro desde el botón del plan Pro anual: queda guardado
  const rc = await call("POST", "/auth/registro-coach", { body: { nombre: "Coach P", negocio: "Planes " + uniq, email: `c-${uniq}@prueba.test`, password: "clave-segura-1", acepta: true, plan: "pro", periodo: "anio" } });
  assert.equal(rc.status, 201);
  const coach = rc.data.token;
  const coachId = rc.data.usuario.id;
  const neg = await call("GET", "/mi-negocio", { token: coach });
  assert.equal(neg.data.plan, "pro");
  assert.equal(neg.data.periodo, "anio");
  assert.equal(neg.data.planInfo.clientesActivos, 0);
  // Coaches y clientes no tocan los planes
  assert.equal((await call("GET", "/superadmin/planes", { token: coach })).status, 403);
  assert.equal((await call("PUT", "/superadmin/planes/pro", { token: coach, body: { precioMes: 1 } })).status, 403);

  // Pasa a Inicial (máximo de clientes del plan) y activo
  const inicial = planes.data.find((p) => p.clave === "inicial");
  const pat = await call("PATCH", `/superadmin/coaches/${coachId}`, { token: SA, body: { estado: "activo", plan: "inicial", periodo: "mes" } });
  assert.equal(pat.status, 200);
  assert.equal((await call("PATCH", `/superadmin/coaches/${coachId}`, { token: SA, body: { plan: "oro" } })).status, 400);

  // Límite de clientes activos
  const ids = [];
  for (let i = 0; i < inicial.maxClientes; i++) {
    const r = await call("POST", "/clientes", { token: coach, body: { nombre: `Cli ${i}`, email: `cli${i}-${uniq}@prueba.test`, password: "clave-segura-1" } });
    assert.equal(r.status, 201, `cliente ${i}`);
    ids.push(r.data.id);
  }
  const extra = await call("POST", "/clientes", { token: coach, body: { nombre: "Extra", email: `extra-${uniq}@prueba.test`, password: "clave-segura-1" } });
  assert.equal(extra.status, 403);
  assert.equal(extra.data.code, "LIMITE_CLIENTES");
  // Desactivar uno libera el lugar; reactivarlo con el plan lleno no se puede
  assert.equal((await call("PATCH", `/clientes/${ids[0]}/activo`, { token: coach, body: { activo: false } })).status, 200);
  const otro = await call("POST", "/clientes", { token: coach, body: { nombre: "Otro", email: `otro-${uniq}@prueba.test`, password: "clave-segura-1" } });
  assert.equal(otro.status, 201);
  const re = await call("PATCH", `/clientes/${ids[0]}/activo`, { token: coach, body: { activo: true } });
  assert.equal(re.status, 403);
  assert.equal((await call("GET", "/mi-negocio", { token: coach })).data.planInfo.clientesActivos, inicial.maxClientes);

  // Historial y datos en la lista de coaches
  const hist = await call("GET", `/superadmin/coaches/${coachId}/historial`, { token: SA });
  assert.equal(hist.status, 200);
  const textos = hist.data.map((h) => h.texto).join(" | ");
  assert.match(textos, /Se registró/);
  assert.match(textos, /Plan: Pro → Inicial/);
  assert.match(textos, /Estado: Prueba → Activo/);
  assert.match(textos, /Pago: anual → mensual/);
  assert.equal((await call("GET", `/superadmin/coaches/${coachId}/historial`, { token: coach })).status, 403);
  const lista = await call("GET", "/superadmin/coaches", { token: SA });
  const yo = lista.data.find((c) => c.usuarioId === coachId);
  assert.equal(yo.iaMes, 0);
  assert.ok(yo.ultimoAcceso, "se anota el último acceso");
  assert.equal(yo.clientesActivos, inicial.maxClientes);

  // Resumen del negocio
  const dash = await call("GET", "/dashboard/admin", { token: SA });
  assert.equal(dash.status, 200);
  assert.ok(dash.data.ingresoMensual >= inicial.precioMes);
  assert.deepEqual(dash.data.porPlan.map((p) => p.clave), ["inicial", "pro", "estudio"]);
  assert.ok(Array.isArray(dash.data.pruebasPorVencer));
  assert.ok(Array.isArray(dash.data.inactivos));
  assert.equal(typeof dash.data.generacionesIaMes, "number");
});
