import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, usuariosTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.SESSION_SECRET || "nahofit_secret_key";

export function generateToken(userId: number, rol: string): string {
  return jwt.sign({ userId, rol }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { userId: number; rol: string } {
  return jwt.verify(token, JWT_SECRET) as { userId: number; rol: string };
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    const [usuario] = await db
      .select()
      .from(usuariosTable)
      .where(eq(usuariosTable.id, payload.userId))
      .limit(1);

    if (!usuario || !usuario.activo) {
      res.status(401).json({ error: "Token inválido o usuario inactivo" });
      return;
    }

    (req as any).usuario = usuario;

    // Datos de un cliente: el cliente solo ve lo suyo; coach y admin, solo clientes.
    const ids = [req.params?.clienteId, req.body?.clienteId]
      .filter((v) => v !== undefined && v !== null && v !== "")
      .map((v) => parseInt(String(v)))
      .filter((n) => !isNaN(n));
    for (const clienteId of ids) {
      if (!(await puedeVerCliente(usuario, clienteId))) {
        res.status(403).json({ error: "Acceso denegado" });
        return;
      }
    }
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
}

export function requireRol(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const usuario = (req as any).usuario;
    if (!usuario || !roles.includes(usuario.rol)) {
      res.status(403).json({ error: "Acceso denegado" });
      return;
    }
    next();
  };
}

/** ¿Puede este usuario ver o cambiar los datos de este cliente? */
export async function puedeVerCliente(me: { id: number; rol: string }, clienteId: number): Promise<boolean> {
  if (me.rol === "cliente") return me.id === clienteId;
  if (me.rol !== "coach" && me.rol !== "admin") return false;
  const [c] = await db
    .select({ rol: usuariosTable.rol })
    .from(usuariosTable)
    .where(eq(usuariosTable.id, clienteId))
    .limit(1);
  return !c || c.rol === "cliente"; // si no existe, la ruta responde 404
}

/** Campos que un usuario no puede cambiarse a sí mismo (ni un coach a un cliente). */
const CAMPOS_ADMIN = ["id", "rol", "activo", "coachId", "creadoEn", "passwordHash"];
const CAMPOS_COACH = ["notasCoach", "estrategiaEntrenamiento", "prioridadesPrimerMes", "planTipo", "modalidad", "fechaInicio"];

export function limpiarCambios(me: { rol: string }, body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...body };
  if (me.rol !== "admin") for (const k of CAMPOS_ADMIN) delete out[k];
  if (me.rol === "cliente") for (const k of CAMPOS_COACH) delete out[k];
  if (me.rol === "admin") { delete out.id; delete out.passwordHash; delete out.creadoEn; }
  return out;
}
