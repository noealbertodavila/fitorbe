import { Router, type Request } from "express";
import { db, planesPrecios, usuariosTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth, requireRol, verifyToken } from "../middlewares/auth";
import { coachPorSlugOId } from "../lib/coaches";

/**
 * Planes y precios que cada coach ofrece a SUS clientes.
 * - El coach ve y edita los suyos.
 * - El cliente ve los activos de su coach.
 * - La página pública de un coach (?coach=slug) ve sus planes activos.
 */
const router = Router();

/** Quién pide (si mandó sesión), sin obligar a iniciar sesión. */
async function quienPide(req: Request) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return null;
  try {
    const { userId } = verifyToken(h.slice(7));
    const [u] = await db.select().from(usuariosTable).where(eq(usuariosTable.id, userId)).limit(1);
    return u && u.activo ? u : null;
  } catch {
    return null;
  }
}

router.get("/planes", async (req, res) => {
  const me = await quienPide(req);
  if (me?.rol === "coach") {
    res.json(await db.select().from(planesPrecios).where(eq(planesPrecios.coachId, me.id)).orderBy(planesPrecios.id));
    return;
  }
  const coachId = me?.rol === "cliente" ? me.coachId : await coachPorSlugOId(req.query.coach);
  if (!coachId) {
    res.json([]);
    return;
  }
  res.json(
    await db
      .select()
      .from(planesPrecios)
      .where(and(eq(planesPrecios.coachId, coachId), eq(planesPrecios.activo, true)))
      .orderBy(planesPrecios.id),
  );
});

router.get("/planes/:id", requireAuth, requireRol("coach"), async (req, res) => {
  const me = (req as any).usuario;
  const id = parseInt(String(req.params.id));
  const [plan] = await db.select().from(planesPrecios).where(and(eq(planesPrecios.id, id), eq(planesPrecios.coachId, me.id))).limit(1);
  if (!plan) {
    res.status(404).json({ error: "Plan no encontrado" });
    return;
  }
  res.json(plan);
});

router.post("/planes", requireAuth, requireRol("coach"), async (req, res) => {
  const me = (req as any).usuario;
  const {
    nombre, precioMensual, precio3meses, precio6meses, descuentoPct,
    descripcion, badge, caracteristicasIncluidas, caracteristicasNoIncluidas, activo,
  } = req.body;
  if (!nombre || precioMensual === undefined) {
    res.status(400).json({ error: "Escribe el nombre y el precio mensual" });
    return;
  }
  const [created] = await db.insert(planesPrecios).values({
    coachId: me.id,
    nombre,
    precioMensual,
    precio3meses: precio3meses ?? precioMensual * 3,
    precio6meses: precio6meses ?? precioMensual * 6,
    descuentoPct: descuentoPct ?? 0,
    descripcion: descripcion ?? "",
    badge,
    caracteristicasIncluidas: caracteristicasIncluidas ?? [],
    caracteristicasNoIncluidas: caracteristicasNoIncluidas ?? [],
    activo: activo ?? true,
  }).returning();
  res.status(201).json(created);
});

router.put("/planes/:id", requireAuth, requireRol("coach"), async (req, res) => {
  const me = (req as any).usuario;
  const id = parseInt(String(req.params.id));
  const body = req.body as Record<string, unknown>;
  const allowed = [
    "nombre", "precioMensual", "precio3meses", "precio6meses", "descuentoPct",
    "descripcion", "badge", "caracteristicasIncluidas", "caracteristicasNoIncluidas", "activo",
  ] as const;
  const patch: Record<string, unknown> = { actualizadoEn: new Date() };
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, key) && body[key] !== undefined) patch[key] = body[key];
  }
  const [updated] = await db
    .update(planesPrecios)
    .set(patch as any)
    .where(and(eq(planesPrecios.id, id), eq(planesPrecios.coachId, me.id)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Plan no encontrado" });
    return;
  }
  res.json(updated);
});

router.delete("/planes/:id", requireAuth, requireRol("coach"), async (req, res) => {
  const me = (req as any).usuario;
  const id = parseInt(String(req.params.id));
  await db.update(planesPrecios).set({ activo: false }).where(and(eq(planesPrecios.id, id), eq(planesPrecios.coachId, me.id)));
  res.status(204).send();
});

export default router;
