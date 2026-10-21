import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usuariosTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateToken, requireAuth } from "../middlewares/auth";

const router = Router();

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email y contraseña requeridos" });
    return;
  }

  const [usuario] = await db
    .select()
    .from(usuariosTable)
    .where(eq(usuariosTable.email, email))
    .limit(1);

  if (!usuario || !usuario.activo) {
    res.status(401).json({ error: "Credenciales inválidas" });
    return;
  }

  const valid = await bcrypt.compare(password, usuario.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Credenciales inválidas" });
    return;
  }

  const token = generateToken(usuario.id, usuario.rol);
  const { passwordHash: _, ...usuarioSafe } = usuario;
  res.json({ token, usuario: usuarioSafe });
});

router.post("/auth/logout", requireAuth, (_req, res) => {
  res.json({ mensaje: "Sesión cerrada correctamente" });
});

router.get("/auth/me", requireAuth, (req, res) => {
  const usuario = (req as any).usuario;
  const { passwordHash: _, ...usuarioSafe } = usuario;
  res.json(usuarioSafe);
});

export default router;
