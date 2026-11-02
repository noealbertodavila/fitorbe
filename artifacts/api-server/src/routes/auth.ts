import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usuariosTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { generateToken, requireAuth, tokenRestablecer, usuarioDelTokenRestablecer, tokenRestablecerValido } from "../middlewares/auth";
import { enviarCorreo, esc } from "../lib/correo";
import { logger } from "../lib/logger";

const router = Router();

const URL_APP = () => (process.env.APP_URL || "https://fitorbe.com").replace(/\/+$/, "");

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email y contraseña requeridos" });
    return;
  }

  const [usuario] = await db
    .select()
    .from(usuariosTable)
    .where(sql`lower(${usuariosTable.email}) = ${String(email).trim().toLowerCase()}`)
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

// ¿Olvidaste tu contraseña? Paso 1: manda un enlace al correo.
// Siempre responde lo mismo, exista o no la cuenta, para no revelar qué correos están registrados.
router.post("/auth/recuperar", async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const respuesta = { mensaje: "Si ese correo tiene una cuenta, te mandamos un enlace para crear una contraseña nueva. Revisa también la carpeta de spam." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Escribe un correo válido" });
    return;
  }
  const [usuario] = await db
    .select()
    .from(usuariosTable)
    .where(sql`lower(${usuariosTable.email}) = ${email}`)
    .limit(1);
  if (usuario && usuario.activo) {
    const enlace = `${URL_APP()}/recuperar?token=${encodeURIComponent(tokenRestablecer(usuario.id, usuario.passwordHash))}`;
    const enviado = await enviarCorreo({
      to: usuario.email,
      subject: "Crea tu contraseña nueva de Fitorbe",
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;color:#1F2A26">
        <h2 style="color:#059669;margin:0 0 12px">Contraseña nueva</h2>
        <p>Hola ${esc(usuario.nombre)}:</p>
        <p>Pediste crear una contraseña nueva para entrar a Fitorbe. Toca el botón; el enlace sirve una sola vez y vence en 1 hora.</p>
        <p style="margin:24px 0"><a href="${esc(enlace)}" style="background:#10B981;color:#000;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Crear contraseña nueva</a></p>
        <p style="font-size:13px;color:#4A5753">Si no lo pediste tú, ignora este correo: tu contraseña actual sigue igual.</p>
      </div>`,
    });
    if (!enviado) logger.warn({ usuarioId: usuario.id }, "No se mandó el correo para recuperar la contraseña");
  }
  res.json(respuesta);
});

// ¿Olvidaste tu contraseña? Paso 2: con el enlace del correo se guarda la contraseña nueva.
router.post("/auth/restablecer", async (req, res) => {
  const token = String(req.body?.token ?? "");
  const password = String(req.body?.password ?? "");
  const invalido = { error: "El enlace no es válido o ya venció. Pide uno nuevo desde «¿Olvidaste tu contraseña?»." };
  if (password.length < 8) {
    res.status(400).json({ error: "La contraseña necesita al menos 8 caracteres" });
    return;
  }
  const id = usuarioDelTokenRestablecer(token);
  if (!id) {
    res.status(400).json(invalido);
    return;
  }
  const [usuario] = await db.select().from(usuariosTable).where(eq(usuariosTable.id, id)).limit(1);
  if (!usuario || !usuario.activo || !tokenRestablecerValido(token, usuario.passwordHash)) {
    res.status(400).json(invalido);
    return;
  }
  await db.update(usuariosTable).set({ passwordHash: await bcrypt.hash(password, 10) }).where(eq(usuariosTable.id, id));
  res.json({ mensaje: "Listo: ya puedes entrar con tu contraseña nueva." });
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
