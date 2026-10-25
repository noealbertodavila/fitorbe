import { localDateStr } from "../lib/date-mt";
import { Router } from "express";
import { db, checkinsEmoccionalesTable, usuariosTable, diarioMentalidadTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireAuth, requireRol, idsClientesDe, enLista } from "../middlewares/auth";
import { alertasEmocionales } from "../lib/alertas";
import { detectarRiesgo } from "../lib/apoyo";

const router = Router();

router.get("/emocional/alertas", requireAuth, requireRol("coach"), async (req, res) => {
  res.json(await alertasEmocionales((req as any).usuario.id));
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
    res.status(201).json({ ...updated, apoyo: detectarRiesgo(notas) });
  } else {
    const [created] = await db
      .insert(checkinsEmoccionalesTable)
      .values({ clienteId: id, fecha, estadoAnimo, nivelEnergia, horasSueno, notas, factores: factores || null })
      .returning();
    res.status(201).json({ ...created, apoyo: detectarRiesgo(notas) });
  }
});

export default router;
