import { localDateStr } from "../lib/date-mt";
import { Router } from "express";
import { db, usuariosTable, checkinsDiariosTable, mensajesTable, checkinsEmoccionalesTable, pagosTable, registrosProgresoTable } from "@workspace/db";
import { eq, and, gte, lte, sql, ne } from "drizzle-orm";
import { requireAuth, requireRol } from "../middlewares/auth";

const router = Router();

router.get("/dashboard/coach", requireAuth, requireRol("admin", "coach"), async (req, res) => {
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

  // Weekly adherence average
  const checkins = await db
    .select({ porcentaje: checkinsDiariosTable.porcentajeAdherencia })
    .from(checkinsDiariosTable)
    .where(gte(checkinsDiariosTable.fecha, weekAgoStr));
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
    .where(eq(checkinsDiariosTable.fecha, today));
  const clientesConCheckin = new Set(checkinHoy.map((c) => c.clienteId));
  const sinCheckin = clientesActivos.filter(
    (c) => !clientesConCheckin.has(c.id)
  );

  // Emotional alerts (3 consecutive low mood days)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const threeDaysAgoStr = localDateStr(threeDaysAgo);
  const checkinsMalos = await db
    .select()
    .from(checkinsEmoccionalesTable)
    .where(
      and(
        gte(checkinsEmoccionalesTable.fecha, threeDaysAgoStr),
        lte(checkinsEmoccionalesTable.estadoAnimo, 2)
      )
    );
  const clientesConAlertaMap = new Map<number, number>();
  checkinsMalos.forEach((c) => {
    clientesConAlertaMap.set(c.clienteId, (clientesConAlertaMap.get(c.clienteId) || 0) + 1);
  });
  const clientesConAlertaEmocional = [...clientesConAlertaMap.values()].filter(
    (count) => count >= 3
  ).length;

  // Overdue payments
  const pagosVencidos = await db
    .select()
    .from(pagosTable)
    .where(eq(pagosTable.estado, "vencido"));
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

router.get("/dashboard/admin", requireAuth, requireRol("admin"), async (req, res) => {
  const clientes = await db
    .select()
    .from(usuariosTable)
    .where(eq(usuariosTable.rol, "cliente"));
  const coaches = await db
    .select()
    .from(usuariosTable)
    .where(eq(usuariosTable.rol, "coach"));

  const mes = new Date();
  mes.setDate(1);
  const mesStr = localDateStr(mes);

  const clientesActivosMes = await db
    .select()
    .from(checkinsDiariosTable)
    .where(gte(checkinsDiariosTable.fecha, mesStr));
  const uniqueClientesMes = new Set(clientesActivosMes.map((c) => c.clienteId)).size;

  const pagosMes = await db
    .select()
    .from(pagosTable)
    .where(
      and(
        gte(pagosTable.fecha, mesStr),
        eq(pagosTable.estado, "pagado")
      )
    );
  const ingresosMes = pagosMes.reduce((sum, p) => sum + (p.monto || 0), 0);

  const todosCheckins = await db.select().from(checkinsDiariosTable);
  const adherenciaGlobal =
    todosCheckins.length > 0
      ? todosCheckins.reduce((s, c) => s + (c.porcentajeAdherencia || 0), 0) /
        todosCheckins.length
      : 0;

  res.json({
    totalClientes: clientes.length,
    totalCoaches: coaches.length,
    clientesActivosMes: uniqueClientesMes,
    ingresosMes,
    adherenciaGlobal: Math.round(adherenciaGlobal),
  });
});

router.get("/dashboard/cliente/:id", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const me = (req as any).usuario;
  if (me.rol === "cliente" && me.id !== id) {
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

  res.json({
    saludo,
    rachaCheckin: racha,
    ultimoPeso: lastWeight?.pesoKg || null,
    fraseMotivacional: null,
  });
});

export default router;
