import { localDateStr } from "../lib/date-mt";
import { Router } from "express";
import { db, usuariosTable, registrosProgresoTable, checkinsDiariosTable } from "@workspace/db";
import { eq, and, like, gte, sql } from "drizzle-orm";
import { requireAuth, requireRol, limpiarCambios } from "../middlewares/auth";

const router = Router();

router.get("/clientes", requireAuth, requireRol("admin", "coach"), async (req, res) => {
  const me = (req as any).usuario;
  const { activo, nivel, objetivo, modalidad, buscar } = req.query;

  let conditions = [eq(usuariosTable.rol, "cliente")];

  // Coaches only see their own clients
  if (me.rol === "coach") {
    conditions.push(eq(usuariosTable.coachId, me.id));
  }
  if (activo !== undefined)
    conditions.push(eq(usuariosTable.activo, activo === "true"));
  if (nivel) conditions.push(eq(usuariosTable.nivelFitness, String(nivel)));
  if (objetivo) conditions.push(eq(usuariosTable.objetivo, String(objetivo)));
  if (modalidad)
    conditions.push(eq(usuariosTable.modalidad, String(modalidad)));

  const clientes = await db
    .select()
    .from(usuariosTable)
    .where(and(...conditions));

  // Get coaches names
  const coaches = await db
    .select()
    .from(usuariosTable)
    .where(eq(usuariosTable.rol, "coach"));
  const coachMap = new Map(coaches.map((c) => [c.id, c.nombre]));

  // Get last weight and weekly adherence for each client
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  const weekAgoStr = localDateStr(weekAgo);

  const result = await Promise.all(
    clientes
      .filter((c) => !buscar || c.nombre.toLowerCase().includes(String(buscar).toLowerCase()) || c.email.toLowerCase().includes(String(buscar).toLowerCase()))
      .map(async (c) => {
        const [lastWeight] = await db
          .select({ pesoKg: registrosProgresoTable.pesoKg })
          .from(registrosProgresoTable)
          .where(eq(registrosProgresoTable.clienteId, c.id))
          .orderBy(sql`${registrosProgresoTable.fecha} DESC`)
          .limit(1);

        const checkins = await db
          .select({ porcentaje: checkinsDiariosTable.porcentajeAdherencia })
          .from(checkinsDiariosTable)
          .where(
            and(
              eq(checkinsDiariosTable.clienteId, c.id),
              gte(checkinsDiariosTable.fecha, weekAgoStr)
            )
          );

        const adherencia =
          checkins.length > 0
            ? checkins.reduce((sum, ch) => sum + (ch.porcentaje || 0), 0) /
              checkins.length
            : 0;

        const { passwordHash: _, ...safe } = c;
        return {
          ...safe,
          coachNombre: c.coachId ? coachMap.get(c.coachId) || null : null,
          ultimoPeso: lastWeight?.pesoKg || null,
          adherenciaSemana: Math.round(adherencia),
        };
      })
  );

  res.json(result);
});

router.get("/clientes/:id", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const me = (req as any).usuario;

  // Clients can only see themselves
  if (me.rol === "cliente" && me.id !== id) {
    res.status(403).json({ error: "Acceso denegado" });
    return;
  }

  const [cliente] = await db
    .select()
    .from(usuariosTable)
    .where(and(eq(usuariosTable.id, id), eq(usuariosTable.rol, "cliente")))
    .limit(1);

  if (!cliente) {
    res.status(404).json({ error: "Cliente no encontrado" });
    return;
  }

  const [coach] = cliente.coachId
    ? await db
        .select()
        .from(usuariosTable)
        .where(eq(usuariosTable.id, cliente.coachId))
        .limit(1)
    : [null];

  const [lastWeight] = await db
    .select({ pesoKg: registrosProgresoTable.pesoKg })
    .from(registrosProgresoTable)
    .where(eq(registrosProgresoTable.clienteId, id))
    .orderBy(sql`${registrosProgresoTable.fecha} DESC`)
    .limit(1);

  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  const weekAgoStr = localDateStr(weekAgo);

  const checkins = await db
    .select({ porcentaje: checkinsDiariosTable.porcentajeAdherencia })
    .from(checkinsDiariosTable)
    .where(
      and(
        eq(checkinsDiariosTable.clienteId, id),
        gte(checkinsDiariosTable.fecha, weekAgoStr)
      )
    );
  const adherencia =
    checkins.length > 0
      ? checkins.reduce((sum, ch) => sum + (ch.porcentaje || 0), 0) /
        checkins.length
      : 0;

  const { passwordHash: _, ...safe } = cliente;
  res.json({
    ...safe,
    coachNombre: coach?.nombre || null,
    ultimoPeso: lastWeight?.pesoKg || null,
    adherenciaSemana: Math.round(adherencia),
  });
});

router.put("/clientes/:id", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const me = (req as any).usuario;
  if (me.rol === "cliente" && me.id !== id) {
    res.status(403).json({ error: "Acceso denegado" });
    return;
  }
  const { password, passwordHash, ...body } = req.body;
  const rest = limpiarCambios(me, body);
  if (Object.keys(rest).length === 0) {
    res.status(400).json({ error: "Nada que cambiar" });
    return;
  }
  const [updated] = await db
    .update(usuariosTable)
    .set(rest)
    .where(and(eq(usuariosTable.id, id), eq(usuariosTable.rol, "cliente")))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Cliente no encontrado" });
    return;
  }
  const { passwordHash: _, ...safe } = updated;
  res.json(safe);
});

export default router;
