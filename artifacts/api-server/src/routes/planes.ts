import { Router } from "express";
import { db, planesPrecios } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRol } from "../middlewares/auth";

const router = Router();

// Public: list all active plans
router.get("/planes", async (_req, res) => {
  const rows = await db.select().from(planesPrecios).orderBy(planesPrecios.id);
  res.json(rows);
});

// Admin: get single plan
router.get("/planes/:id", requireAuth, requireRol("admin"), async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [plan] = await db.select().from(planesPrecios).where(eq(planesPrecios.id, id)).limit(1);
  if (!plan) {
    res.status(404).json({ error: "Plan no encontrado" });
    return;
  }
  res.json(plan);
});

// Admin: create plan
router.post("/planes", requireAuth, requireRol("admin"), async (req, res) => {
  const {
    nombre, precioMensual, precio3meses, precio6meses, descuentoPct,
    descripcion, badge, caracteristicasIncluidas, caracteristicasNoIncluidas, activo,
  } = req.body;

  const [created] = await db.insert(planesPrecios).values({
    nombre,
    precioMensual,
    precio3meses,
    precio6meses,
    descuentoPct: descuentoPct ?? 0,
    descripcion,
    badge,
    caracteristicasIncluidas: caracteristicasIncluidas ?? [],
    caracteristicasNoIncluidas: caracteristicasNoIncluidas ?? [],
    activo: activo ?? true,
  }).returning();

  res.status(201).json(created);
});

// Admin: update plan (supports partial updates)
router.put("/planes/:id", requireAuth, requireRol("admin"), async (req, res) => {
  const id = parseInt(String(req.params.id));
  const body = req.body as Record<string, unknown>;

  const allowed = [
    "nombre", "precioMensual", "precio3meses", "precio6meses", "descuentoPct",
    "descripcion", "badge", "caracteristicasIncluidas", "caracteristicasNoIncluidas", "activo",
  ] as const;

  const patch: Record<string, unknown> = { actualizadoEn: new Date() };
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, key) && body[key] !== undefined) {
      patch[key] = body[key];
    }
  }

  const [updated] = await db
    .update(planesPrecios)
    .set(patch as any)
    .where(eq(planesPrecios.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Plan no encontrado" });
    return;
  }
  res.json(updated);
});

// Admin: delete plan
router.delete("/planes/:id", requireAuth, requireRol("admin"), async (req, res) => {
  const id = parseInt(String(req.params.id));
  await db.update(planesPrecios).set({ activo: false }).where(eq(planesPrecios.id, id));
  res.status(204).send();
});

export default router;
