import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, usuariosTable, coachesTable } from "@workspace/db";
import { eq, and, inArray, sql, type SQL, type AnyColumn } from "drizzle-orm";

// La clave que firma las sesiones. En producción es obligatoria: sin ella
// cualquiera podría fabricar una sesión (antes había un valor fijo público).
const JWT_SECRET =
  process.env.SESSION_SECRET ||
  (process.env.NODE_ENV === "production" ? "" : "fitorbe-solo-desarrollo");
if (!JWT_SECRET) {
  throw new Error("Falta SESSION_SECRET: ponla en las variables de Render antes de arrancar.");
}

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

    // Coach suspendido o con la prueba vencida: él y sus clientes no pueden usar la app
    // (sí pueden ver su sesión y el estado de su cuenta).
    const pausa = await pausaDelCoach(usuario);
    if (pausa && !RUTAS_LIBRES.some((r) => req.originalUrl.split("?")[0].endsWith(r))) {
      res.status(403).json(pausa);
      return;
    }

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

const RUTAS_LIBRES = ["/auth/me", "/auth/logout", "/mi-negocio"];

/** Si el servicio del coach (de este usuario) está en pausa, el motivo; si no, null. */
async function pausaDelCoach(u: { id: number; rol: string; coachId: number | null }): Promise<{ code: string; error: string } | null> {
  const coachId = u.rol === "coach" ? u.id : u.rol === "cliente" ? u.coachId : null;
  if (!coachId) return null;
  const [f] = await db
    .select({ estado: coachesTable.estado, pruebaHasta: coachesTable.pruebaHasta })
    .from(coachesTable)
    .where(eq(coachesTable.usuarioId, coachId))
    .limit(1);
  if (!f) return null;
  const hoy = new Date().toISOString().slice(0, 10);
  const vencida = f.estado === "prueba" && !!f.pruebaHasta && String(f.pruebaHasta) < hoy;
  if (f.estado !== "suspendido" && !vencida) return null;
  if (u.rol === "coach") {
    return vencida
      ? { code: "PRUEBA_VENCIDA", error: "Elige un plan para seguir usando Fitorbe. Tus datos y los de tus clientes están guardados." }
      : { code: "COACH_SUSPENDIDO", error: "Escríbenos para reactivarla. Tus datos y los de tus clientes están guardados." };
  }
  return { code: "SERVICIO_PAUSADO", error: "Por ahora no puedes entrar a la app. Escríbele a tu coach para más información; tus datos están guardados." };
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

/**
 * Roles en Fitorbe:
 *  - "admin": el superadmin de la plataforma. Administra coaches; NO ve datos
 *    privados de los clientes (rutinas, ánimo, diario, fotos, pagos, mensajes).
 *  - "coach": cada coach ve y maneja solo a SUS clientes (usuarios.coachId = coach).
 *  - "cliente": solo ve lo suyo.
 */
export const esSuperadmin = (u: { rol?: string } | null | undefined) => u?.rol === "admin";

/** ¿Puede este usuario ver o cambiar los datos de este cliente? */
export async function puedeVerCliente(me: { id: number; rol: string }, clienteId: number): Promise<boolean> {
  if (me.rol === "cliente") return me.id === clienteId;
  if (me.rol !== "coach") return false; // el superadmin no ve datos privados de clientes
  const [c] = await db
    .select({ rol: usuariosTable.rol, coachId: usuariosTable.coachId })
    .from(usuariosTable)
    .where(eq(usuariosTable.id, clienteId))
    .limit(1);
  if (!c) return true; // no existe: la ruta responde 404
  return c.rol === "cliente" && c.coachId === me.id;
}

/** Los ids de los clientes de un coach (activos e inactivos). */
export async function idsClientesDe(coachId: number): Promise<number[]> {
  const rows = await db
    .select({ id: usuariosTable.id })
    .from(usuariosTable)
    .where(and(eq(usuariosTable.rol, "cliente"), eq(usuariosTable.coachId, coachId)));
  return rows.map((r) => r.id);
}

/** Condición "la columna está en esta lista" que no falla con la lista vacía. */
export function enLista(col: AnyColumn, ids: number[]): SQL {
  return ids.length ? inArray(col, ids) : sql`false`;
}

/** El coach al que pertenece este usuario (el coach es su propio coach). */
export function coachDe(me: { id: number; rol: string; coachId?: number | null }): number | null {
  if (me.rol === "coach") return me.id;
  if (me.rol === "cliente") return me.coachId ?? null;
  return null;
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
