import { Router } from "express";
import { clientIp } from "../lib/hardening";
import { db, coachesTable, usuariosTable, planesFitorbeTable, historialCoachesTable, usoIaTable } from "@workspace/db";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { listaPlanes, olvidarPlanes, planDe, anotarHistorial, clientesActivosDe, CLAVES_PLAN } from "../lib/planes-fitorbe";
import { localDateStr } from "../lib/date-mt";
import { requireAuth, requireRol, generateToken } from "../middlewares/auth";
import { crearCoach } from "../lib/coaches";

/**
 * Superadmin de Fitorbe: administra a los coaches (su negocio, estado y prueba).
 * Nunca ve datos privados de los clientes; solo cuántos tiene cada coach.
 */
const router = Router();

router.get("/superadmin/coaches", requireAuth, requireRol("admin"), async (_req, res) => {
  const rows = await db
    .select({
      usuarioId: usuariosTable.id,
      nombre: usuariosTable.nombre,
      email: usuariosTable.email,
      telefono: usuariosTable.telefono,
      activo: usuariosTable.activo,
      creadoEn: coachesTable.creadoEn,
      negocio: coachesTable.negocio,
      slug: coachesTable.slug,
      estado: coachesTable.estado,
      plan: coachesTable.plan,
      pruebaHasta: coachesTable.pruebaHasta,
      notasAdmin: coachesTable.notasAdmin,
      periodo: coachesTable.periodo,
      ultimoAcceso: coachesTable.ultimoAcceso,
    })
    .from(coachesTable)
    .innerJoin(usuariosTable, eq(usuariosTable.id, coachesTable.usuarioId))
    .orderBy(coachesTable.creadoEn);
  const conteos = await db
    .select({
      coachId: usuariosTable.coachId,
      total: sql<number>`count(*)::int`,
      activos: sql<number>`count(*) filter (where ${usuariosTable.activo})::int`,
    })
    .from(usuariosTable)
    .where(eq(usuariosTable.rol, "cliente"))
    .groupBy(usuariosTable.coachId);
  const mapa = new Map(conteos.map((c) => [c.coachId, c]));
  // Generaciones con IA de este mes por coach.
  const usos = await db
    .select({ usuarioId: usoIaTable.usuarioId, n: sql<number>`coalesce(sum(${usoIaTable.cantidad}), 0)::int` })
    .from(usoIaTable)
    .where(and(eq(usoIaTable.tipo, "generacion"), gte(usoIaTable.fecha, localDateStr().slice(0, 8) + "01")))
    .groupBy(usoIaTable.usuarioId);
  const iaMes = new Map(usos.map((u) => [u.usuarioId, Number(u.n)]));
  res.json(
    rows.map((r) => ({
      ...r,
      clientes: mapa.get(r.usuarioId)?.total ?? 0,
      clientesActivos: mapa.get(r.usuarioId)?.activos ?? 0,
      iaMes: iaMes.get(r.usuarioId) ?? 0,
    })),
  );
});

router.post("/superadmin/coaches", requireAuth, requireRol("admin"), async (req, res) => {
  const b = req.body ?? {};
  const r = await crearCoach({
    nombre: String(b.nombre ?? ""),
    email: String(b.email ?? ""),
    password: String(b.password ?? ""),
    negocio: b.negocio ? String(b.negocio) : undefined,
    telefono: b.telefono ? String(b.telefono) : null,
    estado: b.estado === "prueba" ? "prueba" : "activo",
    plan: typeof b.plan === "string" ? b.plan : undefined,
    periodo: typeof b.periodo === "string" ? b.periodo : undefined,
  });
  if ("error" in r) {
    res.status(r.status).json({ error: r.error });
    return;
  }
  const me = (req as any).usuario;
  await anotarHistorial(r.usuario.id, `Cuenta creada por el superadmin (${r.ficha.estado === "prueba" ? "prueba gratis" : "activo"}, plan ${(await planDe(r.ficha.plan)).nombre})`, me?.nombre);
  res.status(201).json({ ...r.ficha, usuarioId: r.usuario.id });
});

router.patch("/superadmin/coaches/:usuarioId", requireAuth, requireRol("admin"), async (req, res) => {
  const usuarioId = parseInt(String(req.params.usuarioId));
  const b = req.body ?? {};
  const cambios: Record<string, unknown> = {};
  if (["prueba", "activo", "suspendido"].includes(b.estado)) cambios.estado = b.estado;
  if (typeof b.pruebaHasta === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.pruebaHasta)) cambios.pruebaHasta = b.pruebaHasta;
  if (typeof b.plan === "string" && (CLAVES_PLAN as readonly string[]).includes(b.plan)) cambios.plan = b.plan;
  if (b.periodo === "mes" || b.periodo === "anio") cambios.periodo = b.periodo;
  if (typeof b.negocio === "string" && b.negocio.trim()) cambios.negocio = b.negocio.trim().slice(0, 120);
  if (typeof b.notasAdmin === "string") cambios.notasAdmin = b.notasAdmin.slice(0, 2000);
  if (!Object.keys(cambios).length) {
    res.status(400).json({ error: "Nada que cambiar" });
    return;
  }
  const [antes] = await db.select().from(coachesTable).where(eq(coachesTable.usuarioId, usuarioId)).limit(1);
  if (!antes) {
    res.status(404).json({ error: "Coach no encontrado" });
    return;
  }
  const [f] = await db.update(coachesTable).set(cambios).where(eq(coachesTable.usuarioId, usuarioId)).returning();
  // Historial: qué cambió y quién lo cambió.
  const me = (req as any).usuario;
  const ESTADOS: Record<string, string> = { prueba: "Prueba", activo: "Activo", suspendido: "Suspendido" };
  const PERIODOS: Record<string, string> = { mes: "mensual", anio: "anual" };
  const notas: string[] = [];
  if (cambios.estado && cambios.estado !== antes.estado) notas.push(`Estado: ${ESTADOS[antes.estado] ?? antes.estado} → ${ESTADOS[f.estado] ?? f.estado}`);
  if (cambios.plan && cambios.plan !== antes.plan) notas.push(`Plan: ${(await planDe(antes.plan)).nombre} → ${(await planDe(f.plan)).nombre}`);
  if (cambios.periodo && cambios.periodo !== antes.periodo) notas.push(`Pago: ${PERIODOS[antes.periodo] ?? antes.periodo} → ${PERIODOS[f.periodo] ?? f.periodo}`);
  if (cambios.pruebaHasta && cambios.pruebaHasta !== antes.pruebaHasta) notas.push(`Prueba hasta ${f.pruebaHasta}`);
  if (cambios.negocio && cambios.negocio !== antes.negocio) notas.push(`Negocio: ${antes.negocio} → ${f.negocio}`);
  if ("notasAdmin" in cambios && (cambios.notasAdmin || "") !== (antes.notasAdmin || "")) notas.push("Notas actualizadas");
  for (const t of notas) await anotarHistorial(usuarioId, t, me?.nombre);
  res.json(f);
});

/** Historial del coach (más reciente primero). */
router.get("/superadmin/coaches/:usuarioId/historial", requireAuth, requireRol("admin"), async (req, res) => {
  const usuarioId = parseInt(String(req.params.usuarioId));
  if (isNaN(usuarioId)) {
    res.status(400).json({ error: "Coach no válido" });
    return;
  }
  const rows = await db
    .select()
    .from(historialCoachesTable)
    .where(eq(historialCoachesTable.coachUsuarioId, usuarioId))
    .orderBy(desc(historialCoachesTable.creadoEn), desc(historialCoachesTable.id))
    .limit(100);
  res.json(rows);
});

/** Planes de Fitorbe: el superadmin ve y cambia precios y límites. */
router.get("/superadmin/planes", requireAuth, requireRol("admin"), async (_req, res) => {
  olvidarPlanes();
  res.json(await listaPlanes());
});

router.put("/superadmin/planes/:clave", requireAuth, requireRol("admin"), async (req, res) => {
  const clave = String(req.params.clave);
  if (!(CLAVES_PLAN as readonly string[]).includes(clave)) {
    res.status(404).json({ error: "Plan no encontrado" });
    return;
  }
  const b = req.body ?? {};
  const cambios: Record<string, unknown> = {};
  const num = (v: unknown, max: number) => {
    const n = Number(v);
    return v !== "" && v !== null && v !== undefined && Number.isFinite(n) && n >= 0 && n <= max ? n : undefined;
  };
  if (typeof b.nombre === "string" && b.nombre.trim()) cambios.nombre = b.nombre.trim().slice(0, 40);
  const pm = num(b.precioMes, 100000);
  const pa = num(b.precioAnio, 1000000);
  const ia = num(b.limiteIa, 100000);
  if (pm !== undefined) cambios.precioMes = Math.round(pm * 100) / 100;
  if (pa !== undefined) cambios.precioAnio = Math.round(pa * 100) / 100;
  if (ia !== undefined) cambios.limiteIa = Math.floor(ia);
  if ("maxClientes" in b) {
    if (b.maxClientes === null || b.maxClientes === "") cambios.maxClientes = null;
    else {
      const mc = num(b.maxClientes, 100000);
      if (mc === undefined || mc < 1) {
        res.status(400).json({ error: "El máximo de clientes debe ser 1 o más (vacío = sin límite)" });
        return;
      }
      cambios.maxClientes = Math.floor(mc);
    }
  }
  if (!Object.keys(cambios).length) {
    res.status(400).json({ error: "Nada que cambiar" });
    return;
  }
  const [p] = await db
    .update(planesFitorbeTable)
    .set({ ...cambios, actualizadoEn: new Date() })
    .where(eq(planesFitorbeTable.clave, clave))
    .returning();
  olvidarPlanes();
  if (!p) {
    res.status(404).json({ error: "Plan no encontrado" });
    return;
  }
  res.json(p);
});

export default router;

/** Registro público de coaches: 14 días de prueba, sin tarjeta. */
export const registroRouter = Router();
const intentos = new Map<string, number[]>();
registroRouter.post("/auth/registro-coach", async (req, res) => {
  const ip = clientIp(req);
  const ahora = Date.now();
  const lista = (intentos.get(ip) ?? []).filter((t) => ahora - t < 60 * 60 * 1000);
  lista.push(ahora);
  intentos.set(ip, lista);
  // Las pruebas automáticas (NODE_ENV=test) registran varios coaches seguidos, igual que en los demás límites.
  if (lista.length > 5 && process.env.NODE_ENV !== "test") {
    res.status(429).json({ error: "Demasiados intentos. Intenta más tarde." });
    return;
  }
  const b = req.body ?? {};
  if (String(b.empresa ?? "").trim()) {
    res.status(400).json({ error: "No se pudo crear la cuenta" }); // campo trampa para robots
    return;
  }
  if (b.acepta !== true) {
    res.status(400).json({ error: "Acepta los términos para continuar" });
    return;
  }
  const r = await crearCoach({
    nombre: String(b.nombre ?? ""),
    email: String(b.email ?? ""),
    password: String(b.password ?? ""),
    negocio: b.negocio ? String(b.negocio) : undefined,
    telefono: b.telefono ? String(b.telefono) : null,
    estado: "prueba",
    plan: typeof b.plan === "string" ? b.plan : undefined,
    periodo: typeof b.periodo === "string" ? b.periodo : undefined,
  });
  if ("error" in r) {
    res.status(r.status).json({ error: r.error });
    return;
  }
  await anotarHistorial(r.usuario.id, `Se registró en fitorbe.com (prueba gratis, eligió ${(await planDe(r.ficha.plan)).nombre}, pago ${r.ficha.periodo === "anio" ? "anual" : "mensual"})`, r.usuario.nombre);
  const { passwordHash: _, ...usuario } = r.usuario;
  res.status(201).json({ token: generateToken(r.usuario.id, r.usuario.rol), usuario, coach: r.ficha });
});

/** Planes públicos (para la página de inicio): precios y límites, sin nada privado. */
registroRouter.get("/planes-fitorbe", async (_req, res) => {
  const planes = await listaPlanes();
  res.set("Cache-Control", "public, max-age=300");
  res.json(planes.map((p) => ({ clave: p.clave, nombre: p.nombre, precioMes: p.precioMes, precioAnio: p.precioAnio, maxClientes: p.maxClientes, ia: p.limiteIa > 0, limiteIa: p.limiteIa })));
});

/** El negocio del coach: el coach ve el suyo; el cliente, el de su coach (nombre, logo, color). */
registroRouter.get("/mi-negocio", requireAuth, async (req, res) => {
  const me = (req as any).usuario;
  const coachId = me.rol === "coach" ? me.id : me.rol === "cliente" ? me.coachId : null;
  if (!coachId) {
    res.json(null);
    return;
  }
  const [f] = await db.select().from(coachesTable).where(eq(coachesTable.usuarioId, coachId)).limit(1);
  if (!f) {
    res.json(null);
    return;
  }
  const [cu] = await db.select({ nombre: usuariosTable.nombre }).from(usuariosTable).where(eq(usuariosTable.id, coachId)).limit(1);
  const publico = { negocio: f.negocio, slug: f.slug, logo: f.logo, colorPrimario: f.colorPrimario, coachId, coachNombre: cu?.nombre ?? "" };
  if (me.rol !== "coach") {
    res.json(publico);
    return;
  }
  const p = await planDe(f.plan);
  res.json({
    ...publico,
    estado: f.estado,
    plan: f.plan,
    periodo: f.periodo,
    pruebaHasta: f.pruebaHasta,
    reglasNutricion: f.reglasNutricion ?? "",
    reglasEntrenamiento: f.reglasEntrenamiento ?? "",
    planInfo: { nombre: p.nombre, precioMes: p.precioMes, precioAnio: p.precioAnio, limiteIa: p.limiteIa, maxClientes: p.maxClientes, clientesActivos: await clientesActivosDe(coachId) },
  });
});

registroRouter.put("/mi-negocio", requireAuth, requireRol("coach"), async (req, res) => {
  const me = (req as any).usuario;
  const b = req.body ?? {};
  const cambios: Record<string, unknown> = {};
  if (typeof b.negocio === "string" && b.negocio.trim()) cambios.negocio = b.negocio.trim().slice(0, 120);
  if (typeof b.colorPrimario === "string" && /^#[0-9a-fA-F]{6}$/.test(b.colorPrimario)) cambios.colorPrimario = b.colorPrimario;
  if (b.logo === null) cambios.logo = null;
  else if (typeof b.logo === "string" && /^data:image\/(png|jpeg|webp);base64,/.test(b.logo) && b.logo.length < 700_000) cambios.logo = b.logo;
  // Reglas propias del coach para la IA (texto corto; vacío = sin reglas).
  for (const k of ["reglasNutricion", "reglasEntrenamiento"] as const) {
    if (typeof b[k] === "string") cambios[k] = b[k].trim().slice(0, 1500) || null;
  }
  if (!Object.keys(cambios).length) {
    res.status(400).json({ error: "Nada que cambiar" });
    return;
  }
  const [f] = await db.update(coachesTable).set(cambios).where(and(eq(coachesTable.usuarioId, me.id))).returning();
  res.json({ negocio: f.negocio, slug: f.slug, logo: f.logo, colorPrimario: f.colorPrimario, reglasNutricion: f.reglasNutricion ?? "", reglasEntrenamiento: f.reglasEntrenamiento ?? "" });
});
