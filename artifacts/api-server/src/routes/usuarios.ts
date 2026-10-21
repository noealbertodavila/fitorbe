import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usuariosTable } from "@workspace/db";
import { eq, and, ne } from "drizzle-orm";
import { requireAuth, requireRol, limpiarCambios } from "../middlewares/auth";

const router = Router();

router.get("/usuarios", requireAuth, requireRol("admin"), async (req, res) => {
  const { rol, activo } = req.query;
  let query = db.select().from(usuariosTable);
  const conditions = [];
  if (rol) conditions.push(eq(usuariosTable.rol, String(rol)));
  if (activo !== undefined)
    conditions.push(eq(usuariosTable.activo, activo === "true"));
  const rows =
    conditions.length > 0
      ? await db
          .select()
          .from(usuariosTable)
          .where(and(...conditions))
      : await db.select().from(usuariosTable);
  const safe = rows.map(({ passwordHash: _, ...u }) => u);
  res.json(safe);
});

router.post("/usuarios", requireAuth, requireRol("admin"), async (req, res) => {
  const { nombre, email, password, rol, ...rest } = req.body;
  if (!nombre || !email || !password || !rol) {
    res.status(400).json({ error: "Datos incompletos" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [created] = await db
    .insert(usuariosTable)
    .values({ nombre, email, passwordHash, rol, ...rest })
    .returning();
  const { passwordHash: _, ...safe } = created;
  res.status(201).json(safe);
});

router.put("/usuarios/:id", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const me = (req as any).usuario;

  if (me.rol === "admin") {
    // Admin can edit anyone
  } else if (me.rol === "coach") {
    // Coach can edit any client
    const [target] = await db
      .select({ id: usuariosTable.id, rol: usuariosTable.rol })
      .from(usuariosTable)
      .where(eq(usuariosTable.id, id))
      .limit(1);
    if (!target || target.rol !== "cliente") {
      res.status(403).json({ error: "Acceso denegado: solo puedes editar clientes" });
      return;
    }
  } else {
    // Cliente can only edit themselves
    if (me.id !== id) {
      res.status(403).json({ error: "Acceso denegado" });
      return;
    }
  }

  const { password, passwordHash: _ph, ...rest } = req.body;
  const updateData: any = limpiarCambios(me, rest);
  if (password) {
    updateData.passwordHash = await bcrypt.hash(password, 10);
  }
  const [updated] = await db
    .update(usuariosTable)
    .set(updateData)
    .where(eq(usuariosTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Usuario no encontrado" });
    return;
  }
  const { passwordHash: _, ...safe } = updated;
  res.json(safe);
});

router.delete(
  "/usuarios/:id",
  requireAuth,
  requireRol("admin"),
  async (req, res) => {
    const id = parseInt(String(req.params.id));
    await db
      .update(usuariosTable)
      .set({ activo: false })
      .where(eq(usuariosTable.id, id));
    res.status(204).send();
  }
);

export default router;
