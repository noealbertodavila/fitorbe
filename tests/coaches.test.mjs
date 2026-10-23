// Fitorbe: cada coach ve solo a sus clientes; el superadmin no ve datos privados.
import { test } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL ?? "http://localhost:8080";
const uniq = Date.now().toString(36);
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
async function login(email, password) {
  const r = await call("POST", "/auth/login", { body: { email, password } });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return r.data.token;
}

let SA, A, B, a1, b1, tA1, slugA, coachA, coachB;
const hoy = new Date().toISOString().slice(0, 10);

test("registro de dos coaches con prueba gratis", async () => {
  const rA = await call("POST", "/auth/registro-coach", { body: { nombre: "Coach A", email: `a-${uniq}@prueba.test`, password: "clave-segura-1", negocio: "Estudio A " + uniq, acepta: true } });
  assert.equal(rA.status, 201, JSON.stringify(rA.data));
  assert.equal(rA.data.coach.estado, "prueba");
  assert.ok(rA.data.coach.pruebaHasta > hoy);
  A = rA.data.token; slugA = rA.data.coach.slug; coachA = rA.data.usuario.id;
  const rB = await call("POST", "/auth/registro-coach", { body: { nombre: "Coach B", email: `b-${uniq}@prueba.test`, password: "clave-segura-1", acepta: true } });
  assert.equal(rB.status, 201);
  B = rB.data.token; coachB = rB.data.usuario.id;
  // Sin aceptar términos o con correo repetido, no
  assert.equal((await call("POST", "/auth/registro-coach", { body: { nombre: "X", email: `x-${uniq}@prueba.test`, password: "clave-segura-1" } })).status, 400);
  assert.equal((await call("POST", "/auth/registro-coach", { body: { nombre: "A2", email: `a-${uniq}@prueba.test`, password: "clave-segura-1", acepta: true } })).status, 409);
  SA = await login(process.env.SUPERADMIN_EMAIL, process.env.SUPERADMIN_PASSWORD);
});

test("cada coach crea a sus clientes y solo ve los suyos", async () => {
  const c1 = await call("POST", "/clientes", { token: A, body: { nombre: "Cliente de A", email: `a1-${uniq}@prueba.test`, password: "clave-cliente-1", objetivo: "bajar estrés" } });
  assert.equal(c1.status, 201, JSON.stringify(c1.data));
  assert.equal(c1.data.coachId, coachA);
  assert.equal(c1.data.rol, "cliente");
  a1 = c1.data.id;
  const c2 = await call("POST", "/clientes", { token: B, body: { nombre: "Cliente de B", email: `b1-${uniq}@prueba.test`, password: "clave-cliente-1" } });
  b1 = c2.data.id;
  // Un coach no puede crear un cliente con rol ni coach distintos
  const raro = await call("POST", "/clientes", { token: A, body: { nombre: "Raro", email: `raro-${uniq}@prueba.test`, password: "clave-cliente-1", rol: "admin", coachId: coachB } });
  assert.equal(raro.data.rol, "cliente");
  assert.equal(raro.data.coachId, coachA);
  const lista = await call("GET", "/clientes", { token: A });
  assert.equal(lista.status, 200);
  assert.ok(lista.data.every((c) => c.coachId === coachA));
  assert.ok(lista.data.some((c) => c.id === a1));
  assert.ok(!lista.data.some((c) => c.id === b1));
});

test("un coach no ve ni toca a los clientes de otro coach", async () => {
  for (const p of [`/clientes/${b1}`, `/progreso/${b1}`, `/rutinas/semanas/${b1}`, `/planes-comida/semanas/${b1}`, `/emocional/${b1}`, `/diario/${b1}`, `/pagos/${b1}`, `/dashboard/cliente/${b1}`, `/calendario/semana/${b1}`]) {
    assert.equal((await call("GET", p, { token: A })).status, 403, p);
  }
  assert.equal((await call("PUT", `/clientes/${b1}`, { token: A, body: { notasCoach: "x" } })).status, 403);
  assert.equal((await call("PUT", `/usuarios/${b1}`, { token: A, body: { nombre: "x" } })).status, 403);
  assert.equal((await call("POST", "/pagos", { token: A, body: { clienteId: b1, fecha: hoy, monto: 10, metodo: "efectivo", concepto: "x" } })).status, 403);
  assert.equal((await call("POST", "/rutinas", { token: A, body: { clienteId: b1, semanaInicio: hoy, diaSemana: 0, ejercicios: [] } })).status, 403);
  assert.equal((await call("PATCH", `/clientes/${b1}/activo`, { token: A, body: { activo: false } })).status, 403);
});

test("pagos, reportes y alertas solo con los clientes de cada coach", async () => {
  const pA = await call("POST", "/pagos", { token: A, body: { clienteId: a1, fecha: hoy, monto: 100, metodo: "zelle", concepto: "Mensualidad", estado: "vencido" } });
  assert.equal(pA.status, 201, JSON.stringify(pA.data));
  const pB = await call("POST", "/pagos", { token: B, body: { clienteId: b1, fecha: hoy, monto: 50, metodo: "efectivo", concepto: "Mensualidad" } });
  assert.equal(pB.status, 201);
  const todosA = await call("GET", "/pagos", { token: A });
  assert.ok(todosA.data.every((p) => p.clienteId === a1));
  const ceroA = await call("GET", "/pagos/0", { token: A });
  assert.ok(ceroA.data.every((p) => p.clienteId === a1));
  const statsB = await call("GET", "/pagos/stats", { token: B });
  assert.equal(statsB.data.vencidos, 0);
  // B no cambia el pago de A
  assert.equal((await call("PATCH", `/pagos/${pA.data.id}/estado`, { token: B, body: { estado: "pagado" } })).status, 404);
  const dashB = await call("GET", "/dashboard/coach", { token: B });
  assert.equal(dashB.data.clientesConPagoVencido, 0);
  const ing = await call("GET", "/reportes/ingresos", { token: B });
  assert.equal(ing.status, 200);
});

test("mensajes: coach con sus clientes, cliente solo con su coach", async () => {
  assert.equal((await call("POST", "/mensajes", { token: A, body: { receptorId: a1, contenido: "Hola" } })).status, 201);
  assert.equal((await call("POST", "/mensajes", { token: A, body: { receptorId: b1, contenido: "Hola" } })).status, 403);
  assert.equal((await call("POST", "/mensajes", { token: A, body: { receptorId: coachB, contenido: "Hola" } })).status, 403);
  tA1 = await login(`a1-${uniq}@prueba.test`, "clave-cliente-1");
  assert.equal((await call("POST", "/mensajes", { token: tA1, body: { receptorId: coachA, contenido: "Gracias" } })).status, 201);
  assert.equal((await call("POST", "/mensajes", { token: tA1, body: { receptorId: coachB, contenido: "Hola" } })).status, 403);
  assert.equal((await call("POST", "/mensajes", { token: tA1, body: { receptorId: b1, contenido: "Hola" } })).status, 403);
});

test("el cliente solo ve lo suyo", async () => {
  assert.equal((await call("GET", `/clientes/${a1}`, { token: tA1 })).status, 200);
  assert.equal((await call("GET", `/clientes/${b1}`, { token: tA1 })).status, 403);
  assert.equal((await call("GET", "/clientes", { token: tA1 })).status, 403);
  assert.equal((await call("GET", "/pagos/0", { token: tA1 })).status, 403);
  const neg = await call("GET", "/mi-negocio", { token: tA1 });
  assert.equal(neg.data.negocio, "Estudio A " + uniq);
  assert.equal(neg.data.estado, undefined);
});

test("el superadmin ve coaches pero no datos privados de los clientes", async () => {
  const lista = await call("GET", "/superadmin/coaches", { token: SA });
  assert.equal(lista.status, 200);
  const fA = lista.data.find((c) => c.usuarioId === coachA);
  assert.equal(fA.clientes, 2);
  for (const p of ["/clientes", `/clientes/${a1}`, `/progreso/${a1}`, `/emocional/${a1}`, `/diario/${a1}`, "/pagos", `/pagos/${a1}`, "/emocional/alertas", `/mensajes/${a1}`]) {
    const r = await call("GET", p, { token: SA });
    assert.ok(r.status === 403 || (Array.isArray(r.data) && r.data.length === 0), `${p} → ${r.status}`);
  }
  assert.equal((await call("PUT", `/usuarios/${a1}`, { token: SA, body: { nombre: "x" } })).status, 403);
  const us = await call("GET", "/usuarios?rol=cliente", { token: SA });
  assert.ok(us.data.every((u) => u.rol !== "cliente"));
  // Coaches y clientes no entran al panel del superadmin
  assert.equal((await call("GET", "/superadmin/coaches", { token: A })).status, 403);
  assert.equal((await call("GET", "/dashboard/admin", { token: tA1 })).status, 403);
});

test("coach suspendido o con la prueba vencida: él y sus clientes quedan en pausa", async () => {
  assert.equal((await call("PATCH", `/superadmin/coaches/${coachA}`, { token: SA, body: { estado: "suspendido" } })).status, 200);
  const r = await call("GET", "/clientes", { token: A });
  assert.equal(r.status, 403);
  assert.equal(r.data.code, "COACH_SUSPENDIDO");
  assert.equal((await call("GET", `/clientes/${a1}`, { token: tA1 })).data.code, "SERVICIO_PAUSADO");
  assert.equal((await call("GET", "/auth/me", { token: A })).status, 200);
  // B sigue normal
  assert.equal((await call("GET", "/clientes", { token: B })).status, 200);
  const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  await call("PATCH", `/superadmin/coaches/${coachA}`, { token: SA, body: { estado: "prueba", pruebaHasta: ayer } });
  assert.equal((await call("GET", "/clientes", { token: A })).data.code, "PRUEBA_VENCIDA");
  await call("PATCH", `/superadmin/coaches/${coachA}`, { token: SA, body: { estado: "activo" } });
  assert.equal((await call("GET", "/clientes", { token: A })).status, 200);
});

test("planes y solicitudes son de cada coach", async () => {
  const pA = await call("GET", "/planes", { token: A });
  assert.ok(pA.data.length >= 1);
  assert.ok(pA.data.every((p) => p.coachId === coachA));
  const pB = await call("GET", "/planes", { token: B });
  assert.ok(pB.data.every((p) => p.coachId === coachB));
  assert.equal((await call("PUT", `/planes/${pA.data[0].id}`, { token: B, body: { precioMensual: 1 } })).status, 404);
  const pub = await call("GET", `/planes?coach=${slugA}`);
  assert.ok(pub.data.length >= 1 && pub.data.every((p) => p.coachId === coachA && p.activo));
  const cli = await call("GET", "/planes", { token: tA1 });
  assert.ok(cli.data.every((p) => p.coachId === coachA));
  // Solicitud de la página del coach A
  assert.equal((await call("POST", "/contacto", { body: { coach: slugA, nombre: "Interesada", telefono: "8015550000", acepta: true } })).status, 201);
  assert.equal((await call("POST", "/contacto", { body: { nombre: "Sin coach", telefono: "8015550000", acepta: true } })).status, 400);
  const sA = await call("GET", "/contacto/solicitudes", { token: A });
  assert.ok(sA.data.some((s) => s.nombre === "Interesada"));
  const sB = await call("GET", "/contacto/solicitudes", { token: B });
  assert.ok(!sB.data.some((s) => s.nombre === "Interesada"));
  assert.equal((await call("PATCH", `/contacto/solicitudes/${sA.data[0].id}`, { token: B, body: { atendida: true } })).status, 404);
});
