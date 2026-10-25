import { localDateStr } from "../lib/date-mt";
import { Router } from "express";
import { db, coachesTable, usuariosTable, checkinsDiariosTable, mensajesTable, checkinsEmoccionalesTable, pagosTable, registrosProgresoTable, rutinasTable, planesComidaTable } from "@workspace/db";
import { eq, and, gte, lte, sql, ne } from "drizzle-orm";
import { requireAuth, requireRol, puedeVerCliente, idsClientesDe, enLista } from "../middlewares/auth";
import { alertasEmocionales } from "../lib/alertas";

const router = Router();

router.get("/dashboard/coach", requireAuth, requireRol("coach"), async (req, res) => {
  const me = (req as any).usuario;
  const today = (req.query.fecha as string) || localDateStr();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = localDateStr(weekAgo);

  // Total active clients for this coach
  const clientesActivos = await db
    .select()
    .from(usuariosTable)
    .where(
      and(
        eq(usuariosTable.rol, "cliente"),
        eq(usuariosTable.activo, true),
        eq(usuariosTable.coachId, me.id)
      )
    );

  // Solo los clientes de este coach.
  const misIds = await idsClientesDe(me.id);

  // Weekly adherence average
  const checkins = await db
    .select({ porcentaje: checkinsDiariosTable.porcentajeAdherencia })
    .from(checkinsDiariosTable)
    .where(and(gte(checkinsDiariosTable.fecha, weekAgoStr), enLista(checkinsDiariosTable.clienteId, misIds)));
  const adherencia =
    checkins.length > 0
      ? checkins.reduce((s, c) => s + (c.porcentaje || 0), 0) / checkins.length
      : 0;

  // Unread messages
  const mensajesSinLeer = await db
    .select()
    .from(mensajesTable)
    .where(
      and(eq(mensajesTable.receptorId, me.id), eq(mensajesTable.leido, false))
    );

  // Clients without check-in today
  const checkinHoy = await db
    .select()
    .from(checkinsDiariosTable)
    .where(and(eq(checkinsDiariosTable.fecha, today), enLista(checkinsDiariosTable.clienteId, misIds)));
  const clientesConCheckin = new Set(checkinHoy.map((c) => c.clienteId));
  const sinCheckin = clientesActivos.filter(
    (c) => !clientesConCheckin.has(c.id)
  );

  // Alertas emocionales: la misma regla que la página Emocional.
  const clientesConAlertaEmocional = (await alertasEmocionales(me.id)).length;

  // Overdue payments
  const pagosVencidos = await db
    .select()
    .from(pagosTable)
    .where(and(eq(pagosTable.estado, "vencido"), enLista(pagosTable.clienteId, misIds)));
  const clientesConPagoVencido = new Set(pagosVencidos.map((p) => p.clienteId))
    .size;

  res.json({
    totalClientesActivos: clientesActivos.length,
    adherenciaPromedio: Math.round(adherencia),
    mensajesSinLeer: mensajesSinLeer.length,
    clientesSinCheckinHoy: sinCheckin.map((c) => ({ id: c.id, nombre: c.nombre })),
    clientesConAlertaEmocional,
    clientesConPagoVencido,
  });
});

// Superadmin: totales de la plataforma (sin datos privados de los clientes).
router.get("/dashboard/admin", requireAuth, requireRol("admin"), async (_req, res) => {
  const [{ clientes }] = await db.select({ clientes: sql<number>`count(*)::int` }).from(usuariosTable).where(eq(usuariosTable.rol, "cliente"));
  const [{ clientesActivos }] = await db
    .select({ clientesActivos: sql<number>`count(*)::int` })
    .from(usuariosTable)
    .where(and(eq(usuariosTable.rol, "cliente"), eq(usuariosTable.activo, true)));
  const porEstado = await db
    .select({ estado: coachesTable.estado, n: sql<number>`count(*)::int` })
    .from(coachesTable)
    .groupBy(coachesTable.estado);
  const coaches = porEstado.reduce((s, r) => s + r.n, 0);
  res.json({
    totalCoaches: coaches,
    coachesPorEstado: Object.fromEntries(porEstado.map((r) => [r.estado, r.n])),
    totalClientes: clientes,
    clientesActivos,
  });
});

router.get("/dashboard/cliente/:id", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const me = (req as any).usuario;
  if (isNaN(id) || !(await puedeVerCliente(me, id))) {
    res.status(403).json({ error: "Acceso denegado" });
    return;
  }

  // Accept client's local date for streak calculation
  const fechaHoy = (req.query.fecha as string) || localDateStr();

  const [cliente] = await db
    .select()
    .from(usuariosTable)
    .where(eq(usuariosTable.id, id))
    .limit(1);

  const saludo = `Hola, ${cliente?.nombre}`;

  // Streak — computed relative to client's local "today"
  let racha = 0;
  const checkinsOrdenados = await db
    .select()
    .from(checkinsDiariosTable)
    .where(eq(checkinsDiariosTable.clienteId, id))
    .orderBy(sql`${checkinsDiariosTable.fecha} DESC`);

  const [baseY, baseM, baseD] = fechaHoy.split("-").map(Number);
  const baseDate = new Date(Date.UTC(baseY, baseM - 1, baseD));

  for (let i = 0; i < checkinsOrdenados.length; i++) {
    const expected = new Date(baseDate);
    expected.setUTCDate(baseDate.getUTCDate() - i);
    const expectedStr = localDateStr(expected);
    if (checkinsOrdenados[i].fecha === expectedStr && checkinsOrdenados[i].porcentajeAdherencia > 0) {
      racha++;
    } else {
      break;
    }
  }

  // Last weight
  const [lastWeight] = await db
    .select()
    .from(registrosProgresoTable)
    .where(eq(registrosProgresoTable.clienteId, id))
    .orderBy(sql`${registrosProgresoTable.fecha} DESC`)
    .limit(1);

  // Rutina y plan de comida de hoy (semana que empieza el lunes; 0 = lunes).
  const diaJs = baseDate.getUTCDay();
  const diaSemana = (diaJs + 6) % 7;
  const lunesDate = new Date(baseDate);
  lunesDate.setUTCDate(baseDate.getUTCDate() - diaSemana);
  const lunes = localDateStr(lunesDate);
  const [rutinaHoy] = await db
    .select()
    .from(rutinasTable)
    .where(and(eq(rutinasTable.clienteId, id), eq(rutinasTable.semanaInicio, lunes), eq(rutinasTable.diaSemana, diaSemana), eq(rutinasTable.aprobada, true)))
    .limit(1);
  const [planComidaHoy] = await db
    .select()
    .from(planesComidaTable)
    .where(and(eq(planesComidaTable.clienteId, id), eq(planesComidaTable.semanaInicio, lunes), eq(planesComidaTable.diaSemana, diaSemana), eq(planesComidaTable.aprobada, true)))
    .limit(1);

  res.json({
    saludo,
    rachaCheckin: racha,
    ultimoPeso: lastWeight?.pesoKg || null,
    rutinaHoy: rutinaHoy ?? null,
    planComidaHoy: planComidaHoy ?? null,
    fraseMotivacional: null,
  });
});

export default router;
