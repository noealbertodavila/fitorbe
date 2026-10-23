import { Router } from "express";
import { db, coachesTable, usuariosTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
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
  res.json(rows.map((r) => ({ ...r, clientes: mapa.get(r.usuarioId)?.total ?? 0, clientesActivos: mapa.get(r.usuarioId)?.activos ?? 0 })));
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
  });
  if ("error" in r) {
    res.status(r.status).json({ error: r.error });
    return;
  }
  res.status(201).json({ ...r.ficha, usuarioId: r.usuario.id });
});

router.patch("/superadmin/coaches/:usuarioId", requireAuth, requireRol("admin"), async (req, res) => {
  const usuarioId = parseInt(String(req.params.usuarioId));
  const b = req.body ?? {};
  const cambios: Record<string, unknown> = {};
  if (["prueba", "activo", "suspendido"].includes(b.estado)) cambios.estado = b.estado;
  if (typeof b.pruebaHasta === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.pruebaHasta)) cambios.pruebaHasta = b.pruebaHasta;
  if (typeof b.plan === "string" && b.plan.trim()) cambios.plan = b.plan.trim().slice(0, 40);
  if (typeof b.negocio === "string" && b.negocio.trim()) cambios.negocio = b.negocio.trim().slice(0, 120);
  if (typeof b.notasAdmin === "string") cambios.notasAdmin = b.notasAdmin.slice(0, 2000);
  if (!Object.keys(cambios).length) {
    res.status(400).json({ error: "Nada que cambiar" });
    return;
  }
  const [f] = await db.update(coachesTable).set(cambios).where(eq(coachesTable.usuarioId, usuarioId)).returning();
  if (!f) {
    res.status(404).json({ error: "Coach no encontrado" });
    return;
  }
  res.json(f);
});

export default router;

/** Registro público de coaches: 14 días de prueba, sin tarjeta. */
export const registroRouter = Router();
const intentos = new Map<string, number[]>();
registroRouter.post("/auth/registro-coach", async (req, res) => {
  const ip = String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "").split(",")[0].trim();
  const ahora = Date.now();
  const lista = (intentos.get(ip) ?? []).filter((t) => ahora - t < 60 * 60 * 1000);
  lista.push(ahora);
  intentos.set(ip, lista);
  if (lista.length > 5) {
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
  });
  if ("error" in r) {
    res.status(r.status).json({ error: r.error });
    return;
  }
  const { passwordHash: _, ...usuario } = r.usuario;
  res.status(201).json({ token: generateToken(r.usuario.id, r.usuario.rol), usuario, coach: r.ficha });
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
  res.json(me.rol === "coach" ? { ...publico, estado: f.estado, plan: f.plan, pruebaHasta: f.pruebaHasta } : publico);
});

registroRouter.put("/mi-negocio", requireAuth, requireRol("coach"), async (req, res) => {
  const me = (req as any).usuario;
  const b = req.body ?? {};
  const cambios: Record<string, unknown> = {};
  if (typeof b.negocio === "string" && b.negocio.trim()) cambios.negocio = b.negocio.trim().slice(0, 120);
  if (typeof b.colorPrimario === "string" && /^#[0-9a-fA-F]{6}$/.test(b.colorPrimario)) cambios.colorPrimario = b.colorPrimario;
  if (b.logo === null) cambios.logo = null;
  else if (typeof b.logo === "string" && /^data:image\/(png|jpeg|webp);base64,/.test(b.logo) && b.logo.length < 700_000) cambios.logo = b.logo;
  if (!Object.keys(cambios).length) {
    res.status(400).json({ error: "Nada que cambiar" });
    return;
  }
  const [f] = await db.update(coachesTable).set(cambios).where(and(eq(coachesTable.usuarioId, me.id))).returning();
  res.json({ negocio: f.negocio, slug: f.slug, logo: f.logo, colorPrimario: f.colorPrimario });
});
