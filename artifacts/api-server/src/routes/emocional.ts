import { localDateStr } from "../lib/date-mt";
import { Router } from "express";
import { db, checkinsEmoccionalesTable, usuariosTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireAuth, requireRol } from "../middlewares/auth";

const router = Router();

router.get("/emocional/alertas", requireAuth, requireRol("admin", "coach"), async (_req, res) => {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const threeDaysAgoStr = localDateStr(threeDaysAgo);

  const checkins = await db
    .select()
    .from(checkinsEmoccionalesTable)
    .where(
      and(
        gte(checkinsEmoccionalesTable.fecha, threeDaysAgoStr),
        lte(checkinsEmoccionalesTable.estadoAnimo, 2)
      )
    );

  const countMap = new Map<number, { count: number; last: number }>();
  checkins.forEach((c) => {
    const existing = countMap.get(c.clienteId);
    if (existing) {
      existing.count++;
      if (c.fecha > String(existing.last)) existing.last = c.estadoAnimo;
    } else {
      countMap.set(c.clienteId, { count: 1, last: c.estadoAnimo });
    }
  });

  const alertas = [];
  for (const [clienteId, { count, last }] of countMap.entries()) {
    if (count >= 2) {
      const [cliente] = await db
        .select()
        .from(usuariosTable)
        .where(eq(usuariosTable.id, clienteId))
        .limit(1);
      if (cliente) {
        alertas.push({
          clienteId,
          clienteNombre: cliente.nombre,
          diasBajos: count,
          ultimoEstado: last,
        });
      }
    }
  }

  res.json(alertas);
});

router.get("/emocional/:clienteId", requireAuth, async (req, res) => {
  const clienteId = parseInt(String(req.params.clienteId));
  if (isNaN(clienteId)) { res.status(400).json({ error: "clienteId inválido" }); return; }
  const limite = req.query.limite ? parseInt(String(req.query.limite)) : 14;
  const rows = await db
    .select()
    .from(checkinsEmoccionalesTable)
    .where(eq(checkinsEmoccionalesTable.clienteId, clienteId))
    .orderBy(desc(checkinsEmoccionalesTable.fecha))
    .limit(limite);
  res.json(rows);
});

router.post("/emocional", requireAuth, async (req, res) => {
  const me = (req as any).usuario;
  const { clienteId, fecha, estadoAnimo, nivelEnergia, horasSueno, notas, factores } = req.body;
  const id = me.rol === "cliente" ? me.id : clienteId;

  // Upsert
  const existing = await db
    .select()
    .from(checkinsEmoccionalesTable)
    .where(
      and(
        eq(checkinsEmoccionalesTable.clienteId, id),
        eq(checkinsEmoccionalesTable.fecha, fecha)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(checkinsEmoccionalesTable)
      .set({ estadoAnimo, nivelEnergia, horasSueno, notas, factores: factores || null })
      .where(
        and(
          eq(checkinsEmoccionalesTable.clienteId, id),
          eq(checkinsEmoccionalesTable.fecha, fecha)
        )
      )
      .returning();
    res.status(201).json(updated);
  } else {
    const [created] = await db
      .insert(checkinsEmoccionalesTable)
      .values({ clienteId: id, fecha, estadoAnimo, nivelEnergia, horasSueno, notas, factores: factores || null })
      .returning();
    res.status(201).json(created);
  }
});

export default router;
