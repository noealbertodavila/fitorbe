import { Router } from "express";
import { db, diarioMentalidadTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { detectarRiesgo } from "../lib/apoyo";

const router = Router();

// El diario es privado: solo lo lee y lo escribe su dueño (el cliente).
// Ni su coach ni el superadmin pueden verlo. La única excepción es de seguridad:
// si algo suena a crisis, el coach recibe una alerta (lib/alertas.ts) sin el texto.
const PRIVADO = { error: "El diario es privado: solo lo puede ver quien lo escribe." };

router.get("/diario/:clienteId", requireAuth, async (req, res) => {
  const me = (req as any).usuario;
  const clienteId = parseInt(String(req.params.clienteId));
  if (me.rol !== "cliente" || me.id !== clienteId) {
    res.status(403).json(PRIVADO);
    return;
  }
  const pedido = parseInt(String(req.query.limite ?? ""));
  const limite = Number.isNaN(pedido) ? 20 : Math.min(Math.max(pedido, 1), 500);
  const rows = await db
    .select()
    .from(diarioMentalidadTable)
    .where(eq(diarioMentalidadTable.clienteId, clienteId))
    .orderBy(desc(diarioMentalidadTable.fecha), desc(diarioMentalidadTable.id))
    .limit(limite);
  res.json(rows);
});

router.post("/diario", requireAuth, async (req, res) => {
  const me = (req as any).usuario;
  if (me.rol !== "cliente") {
    res.status(403).json(PRIVADO);
    return;
  }
  const { fecha, contenido, gratitud } = req.body ?? {};
  if (!contenido || !String(contenido).trim()) {
    res.status(400).json({ error: "Escribe algo en tu diario" });
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha ?? ""))) {
    res.status(400).json({ error: "Fecha no válida" });
    return;
  }
  const [created] = await db
    .insert(diarioMentalidadTable)
    .values({ clienteId: me.id, fecha: String(fecha), contenido: String(contenido).slice(0, 10000), gratitud: gratitud ? String(gratitud).slice(0, 2000) : null })
    .returning();
  // apoyo: el cliente ve de inmediato dónde pedir ayuda (988) y la coach recibe una alerta (sin el texto).
  res.status(201).json({ ...created, apoyo: detectarRiesgo(contenido, gratitud) });
});

export default router;
