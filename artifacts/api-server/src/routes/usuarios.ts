import { Router } from "express";
import { prepararCambios, guardarCambios } from "../lib/cambios-usuario";
import bcrypt from "bcryptjs";
import { db, usuariosTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth, requireRol, limpiarCambios, puedeVerCliente } from "../middlewares/auth";

/**
 * Usuarios.
 * - El superadmin ve y administra coaches y otros superadmins (no clientes).
 * - El coach edita a sus clientes; cada quien se edita a sí mismo.
 */
const router = Router();

router.get("/usuarios", requireAuth, requireRol("admin"), async (req, res) => {
  const { rol, activo } = req.query;
  const roles = rol === "coach" || rol === "admin" ? [String(rol)] : ["coach", "admin"];
  const conds = [inArray(usuariosTable.rol, roles)];
  if (activo !== undefined) conds.push(eq(usuariosTable.activo, activo === "true"));
  const rows = await db.select().from(usuariosTable).where(and(...conds));
  res.json(rows.map(({ passwordHash: _, ...u }) => u));
});

// Otro superadmin. Los coaches se crean en /superadmin/coaches.
router.post("/usuarios", requireAuth, requireRol("admin"), async (req, res) => {
  const { nombre, email, password } = req.body ?? {};
  if (!nombre || !email || !password || String(password).length < 8) {
    res.status(400).json({ error: "Datos incompletos (la contraseña necesita al menos 8 caracteres)" });
    return;
  }
  const correo = String(email).trim().toLowerCase();
  const [existe] = await db.select({ id: usuariosTable.id }).from(usuariosTable).where(eq(usuariosTable.email, correo)).limit(1);
  if (existe) {
    res.status(409).json({ error: "Ya hay una cuenta con ese correo" });
    return;
  }
  const [created] = await db
    .insert(usuariosTable)
    .values({ nombre: String(nombre), email: correo, passwordHash: await bcrypt.hash(String(password), 10), rol: "admin" })
    .returning();
  const { passwordHash: _, ...safe } = created;
  res.status(201).json(safe);
});

router.put("/usuarios/:id", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const me = (req as any).usuario;
  if (isNaN(id)) {
    res.status(400).json({ error: "Usuario no válido" });
    return;
  }
  if (me.id !== id) {
    if (me.rol === "admin") {
      const [t] = await db.select({ rol: usuariosTable.rol }).from(usuariosTable).where(eq(usuariosTable.id, id)).limit(1);
      if (!t || t.rol === "cliente") {
        res.status(403).json({ error: "Acceso denegado: los clientes los administra su coach" });
        return;
      }
    } else if (!(me.rol === "coach" && (await puedeVerCliente(me, id)))) {
      res.status(403).json({ error: "Acceso denegado" });
      return;
    }
  }
  const { password, passwordHash: _ph, ...rest } = req.body ?? {};
  const updateData: any = limpiarCambios(me, rest);
  // El superadmin no cambia roles ni mueve clientes entre coaches desde aquí.
  delete updateData.rol;
  delete updateData.coachId;
  if (password) {
    if (String(password).length < 8) {
      res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
      return;
    }
    updateData.passwordHash = await bcrypt.hash(String(password), 10);
  }
  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "Nada que cambiar" });
    return;
  }
  const problema = await prepararCambios(id, updateData);
  if (problema) {
    res.status(problema.status).json({ error: problema.error });
    return;
  }
  const { u: updated, error } = await guardarCambios(id, updateData);
  if (error) {
    res.status(400).json({ error });
    return;
  }
  if (!updated) {
    res.status(404).json({ error: "Usuario no encontrado" });
    return;
  }
  const { passwordHash: _, ...safe } = updated;
  res.json(safe);
});

// El superadmin desactiva coaches u otros superadmins (no a sí mismo).
router.delete("/usuarios/:id", requireAuth, requireRol("admin"), async (req, res) => {
  const me = (req as any).usuario;
  const id = parseInt(String(req.params.id));
  if (id === me.id) {
    res.status(400).json({ error: "No puedes desactivarte a ti mismo" });
    return;
  }
  await db
    .update(usuariosTable)
    .set({ activo: false })
    .where(and(eq(usuariosTable.id, id), inArray(usuariosTable.rol, ["coach", "admin"])));
  res.status(204).send();
});

export default router;
