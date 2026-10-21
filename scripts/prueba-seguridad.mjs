// Prueba rápida de seguridad: un cliente no puede ver ni cambiar datos de otros.
// Uso (con el servidor de desarrollo corriendo):
//   node scripts/prueba-seguridad.mjs http://localhost:8080/api coachEmail coachPass clienteEmail clientePass
const [B = "http://localhost:8080/api", ce, cp, me_, mp] = process.argv.slice(2);
if (!ce || !cp || !me_ || !mp) {
  console.log("Faltan datos: base coachEmail coachPass clienteEmail clientePass");
  process.exit(1);
}
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };
const login = async (email, password) =>
  j(await fetch(B + "/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) }));
const H = (t) => ({ authorization: "Bearer " + t, "content-type": "application/json" });

const coach = await login(ce, cp);
const cli = await login(me_, mp);
if (!coach.token || !cli.token) { console.log("No se pudo entrar", coach, cli); process.exit(1); }
const yo = cli.usuario.id;
const lista = await j(await fetch(B + "/clientes", { headers: H(coach.token) }));
const otro = Array.isArray(lista) ? lista.find((x) => x.id !== yo) : null;

let fallas = 0;
async function check(nombre, esperado, url, opts = {}) {
  const r = await fetch(B + url, { ...opts, headers: H(opts.token || cli.token) });
  const ok = esperado.includes(r.status);
  if (!ok) fallas++;
  console.log(`${ok ? "OK   " : "FALLA"} ${nombre} → ${r.status}`);
}

console.log("coach ve", Array.isArray(lista) ? lista.length : lista, "clientes");
if (otro) {
  await check("cliente NO ve ánimo de otro", [403], `/emocional/${otro.id}`);
  await check("cliente NO ve diario de otro", [403], `/diario/${otro.id}`);
  await check("cliente NO ve progreso de otro", [403], `/progreso/${otro.id}`);
  await check("cliente NO ve rutinas de otro", [403], `/rutinas/semanas/${otro.id}`);
  await check("cliente NO escribe a otro cliente", [403], "/mensajes", { method: "POST", body: JSON.stringify({ receptorId: otro.id, contenido: "hola" }) });
}
await check("cliente ve su ánimo", [200], `/emocional/${yo}`);
await check("cliente ve su calendario", [200], `/calendario/semana/${yo}`);
await check("cliente NO lista pagos de todos", [403], "/pagos");
await check("cliente NO ve reportes", [403], "/reportes/ingresos");
await check("cliente NO crea rutinas", [403], "/rutinas", { method: "POST", body: JSON.stringify({ clienteId: yo, semanaInicio: "2026-01-05", diaSemana: 0, ejercicios: [] }) });
await fetch(B + `/clientes/${yo}`, { method: "PUT", headers: H(cli.token), body: JSON.stringify({ rol: "admin" }) });
await fetch(B + `/usuarios/${yo}`, { method: "PUT", headers: H(cli.token), body: JSON.stringify({ rol: "admin" }) });
const yoAhora = await j(await fetch(B + "/auth/me", { headers: H(cli.token) }));
const sigue = yoAhora.rol === "cliente";
if (!sigue) fallas++;
console.log(`${sigue ? "OK   " : "FALLA"} cliente NO se puede hacer admin → rol ${yoAhora.rol}`);
await check("coach ve ánimo del cliente", [200], `/emocional/${yo}`, { token: coach.token });
await check("coach ve pagos", [200], "/pagos", { token: coach.token });
console.log(fallas ? `\n${fallas} FALLAS` : "\nTodo bien");
process.exit(fallas ? 1 : 0);
