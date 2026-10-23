import { Router } from "express";
import { db, diarioMentalidadTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { detectarRiesgo } from "../lib/apoyo";

const router = Router();

router.get("/diario/:clienteId", requireAuth, async (req, res) => {
  const clienteId = parseInt(String(req.params.clienteId));
  const limite = req.query.limite ? parseInt(String(req.query.limite)) : 10;
  const rows = await db
    .select()
    .from(diarioMentalidadTable)
    .where(eq(diarioMentalidadTable.clienteId, clienteId))
    .orderBy(desc(diarioMentalidadTable.fecha))
    .limit(limite);
  res.json(rows);
});

router.post("/diario", requireAuth, async (req, res) => {
  const me = (req as any).usuario;
  const { clienteId, fecha, contenido, gratitud } = req.body;
  const id = me.rol === "cliente" ? me.id : clienteId;
  const [created] = await db
    .insert(diarioMentalidadTable)
    .values({ clienteId: id, fecha, contenido, gratitud })
    .returning();
  // apoyo: el cliente ve de inmediato dónde pedir ayuda (988) y la coach recibe una alerta.
  res.status(201).json({ ...created, apoyo: detectarRiesgo(contenido, gratitud) });
});

export default router;
