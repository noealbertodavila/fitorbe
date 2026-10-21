import { localDateStr } from "../lib/date-mt";
import { Router } from "express";
import { db, checkinsDiariosTable } from "@workspace/db";
import { eq, and, gte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/checkins/:clienteId/:fecha", requireAuth, async (req, res) => {
  const clienteId = parseInt(String(req.params.clienteId));
  const fecha = String(req.params.fecha);
  const [row] = await db
    .select()
    .from(checkinsDiariosTable)
    .where(
      and(
        eq(checkinsDiariosTable.clienteId, clienteId),
        eq(checkinsDiariosTable.fecha, fecha)
      )
    )
    .limit(1);
  res.json(row || null);
});

router.post("/checkins", requireAuth, async (req, res) => {
  const me = (req as any).usuario;
  const { clienteId, fecha, ejerciciosCompletados, comidasCompletadas, porcentajeAdherencia } = req.body;
  const id = me.rol === "cliente" ? me.id : clienteId;

  // Upsert
  const existing = await db
    .select()
    .from(checkinsDiariosTable)
    .where(
      and(
        eq(checkinsDiariosTable.clienteId, id),
        eq(checkinsDiariosTable.fecha, fecha)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(checkinsDiariosTable)
      .set({ ejerciciosCompletados, comidasCompletadas, porcentajeAdherencia })
      .where(
        and(
          eq(checkinsDiariosTable.clienteId, id),
          eq(checkinsDiariosTable.fecha, fecha)
        )
      )
      .returning();
    res.status(201).json(updated);
  } else {
    const [created] = await db
      .insert(checkinsDiariosTable)
      .values({
        clienteId: id,
        fecha,
        ejerciciosCompletados: ejerciciosCompletados || [],
        comidasCompletadas: comidasCompletadas || [],
        porcentajeAdherencia: porcentajeAdherencia || 0,
      })
      .returning();
    res.status(201).json(created);
  }
});

// POST /api/checkin/ejercicio — toggle a single exercise in today's check-in
router.post("/checkin/ejercicio", requireAuth, async (req, res) => {
  const me = (req as any).usuario;
  const { clienteId, fecha, ejercicioNombre, completado } = req.body;
  const id = me.rol === "cliente" ? me.id : clienteId;

  if (!fecha || !ejercicioNombre) {
    res.status(400).json({ error: "Falta fecha o ejercicioNombre" });
    return;
  }

  const [existing] = await db
    .select()
    .from(checkinsDiariosTable)
    .where(and(eq(checkinsDiariosTable.clienteId, id), eq(checkinsDiariosTable.fecha, fecha)))
    .limit(1);

  let completados: string[] = existing ? (existing.ejerciciosCompletados as string[]) || [] : [];

  if (completado) {
    if (!completados.includes(ejercicioNombre)) completados = [...completados, ejercicioNombre];
  } else {
    completados = completados.filter(n => n !== ejercicioNombre);
  }

  // Derive adherence from the updated list length vs a reasonable total (will be updated when full save happens)
  if (existing) {
    const [updated] = await db
      .update(checkinsDiariosTable)
      .set({ ejerciciosCompletados: completados })
      .where(and(eq(checkinsDiariosTable.clienteId, id), eq(checkinsDiariosTable.fecha, fecha)))
      .returning();
    res.json(updated);
  } else {
    const [created] = await db
      .insert(checkinsDiariosTable)
      .values({
        clienteId: id,
        fecha,
        ejerciciosCompletados: completados,
        comidasCompletadas: [],
        porcentajeAdherencia: 0,
      })
      .returning();
    res.json(created);
  }
});

router.get("/checkins/semana/:clienteId", requireAuth, async (req, res) => {
  const clienteId = parseInt(String(req.params.clienteId));
  const { semanaInicio } = req.query;

  const start = semanaInicio
    ? String(semanaInicio)
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return localDateStr(d);
      })();

  const rows = await db
    .select()
    .from(checkinsDiariosTable)
    .where(
      and(
        eq(checkinsDiariosTable.clienteId, clienteId),
        gte(checkinsDiariosTable.fecha, start)
      )
    )
    .orderBy(checkinsDiariosTable.fecha);
  res.json(rows);
});

export default router;
