import { Router } from "express";
import { db, ejerciciosBibliotecaTable } from "@workspace/db";
import { eq, and, like, or, isNull, inArray } from "drizzle-orm";
import { usuariosTable } from "@workspace/db";
import { coachDe } from "../middlewares/auth";
import { requireAuth, requireRol } from "../middlewares/auth";

const router = Router();

router.get("/biblioteca-ejercicios", requireAuth, async (req, res) => {
  const me = (req as any).usuario;
  const { grupoMuscular, buscar } = req.query;
  // Los ejercicios de Fitorbe (sin dueño o del superadmin) y los que creó su coach.
  const admins = (await db.select({ id: usuariosTable.id }).from(usuariosTable).where(eq(usuariosTable.rol, "admin"))).map((u) => u.id);
  const coach = coachDe(me);
  const visibles = [isNull(ejerciciosBibliotecaTable.creadoPor)];
  if (admins.length) visibles.push(inArray(ejerciciosBibliotecaTable.creadoPor, admins));
  if (coach) visibles.push(eq(ejerciciosBibliotecaTable.creadoPor, coach));
  const conditions = [or(...visibles)!];
  if (grupoMuscular)
    conditions.push(
      eq(ejerciciosBibliotecaTable.grupoMuscular, String(grupoMuscular))
    );
  if (buscar)
    conditions.push(like(ejerciciosBibliotecaTable.nombre, `%${buscar}%`));

  const rows = await db.select().from(ejerciciosBibliotecaTable).where(and(...conditions));
  res.json(rows);
});

router.post("/biblioteca-ejercicios", requireAuth, requireRol("coach"), async (req, res) => {
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
