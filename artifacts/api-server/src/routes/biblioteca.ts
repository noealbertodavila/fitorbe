import { Router } from "express";
import { db, ejerciciosBibliotecaTable } from "@workspace/db";
import { eq, and, like } from "drizzle-orm";
import { requireAuth, requireRol } from "../middlewares/auth";

const router = Router();

router.get("/biblioteca-ejercicios", requireAuth, async (req, res) => {
  const { grupoMuscular, buscar } = req.query;
  const conditions = [];
  if (grupoMuscular)
    conditions.push(
      eq(ejerciciosBibliotecaTable.grupoMuscular, String(grupoMuscular))
    );
  if (buscar)
    conditions.push(like(ejerciciosBibliotecaTable.nombre, `%${buscar}%`));

  const rows =
    conditions.length > 0
      ? await db
          .select()
          .from(ejerciciosBibliotecaTable)
          .where(and(...conditions))
      : await db.select().from(ejerciciosBibliotecaTable);
  res.json(rows);
});

router.post("/biblioteca-ejercicios", requireAuth, requireRol("admin", "coach"), async (req, res) => {
  const me = (req as any).usuario;
  const { nombre, grupoMuscular, instrucciones, fotoUrl, videoUrl } = req.body;
  const [created] = await db
    .insert(ejerciciosBibliotecaTable)
    .values({
      nombre,
      grupoMuscular,
      instrucciones,
      fotoUrl,
      videoUrl,
      creadoPor: me.id,
    })
    .returning();
  res.status(201).json(created);
});

export default router;
