import { db, usuariosTable } from "@workspace/db";
import { and, eq, ne, sql } from "drizzle-orm";

/**
 * Revisa y limpia los cambios de un perfil antes de guardarlos:
 * - un campo vacío ("") se guarda como vacío (null), así las fechas y números no fallan;
 * - el nombre no puede quedar vacío;
 * - el correo se guarda en minúsculas, debe ser válido y no estar usado por otra cuenta.
 * Devuelve el error para mostrarle a la persona, o null si todo está bien.
 */
export async function prepararCambios(id: number, cambios: Record<string, unknown>): Promise<{ status: number; error: string } | null> {
  for (const [k, v] of Object.entries(cambios)) {
    if (typeof v === "string") {
      const t = v.trim();
      cambios[k] = t === "" ? null : k === "email" ? t.toLowerCase() : v;
    }
    if (typeof v === "number" && Number.isNaN(v)) cambios[k] = null;
  }
  if ("nombre" in cambios && !cambios.nombre) return { status: 400, error: "El nombre no puede quedar vacío" };
  if ("email" in cambios) {
    const email = cambios.email as string | null;
    if (!email) return { status: 400, error: "El correo no puede quedar vacío" };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { status: 400, error: "El correo no es válido" };
    const [otro] = await db
      .select({ id: usuariosTable.id })
      .from(usuariosTable)
      .where(and(sql`lower(${usuariosTable.email}) = ${email}`, ne(usuariosTable.id, id)))
      .limit(1);
    if (otro) return { status: 409, error: "Ya hay otra cuenta con ese correo" };
  }
  return null;
}

/** Guarda los cambios; si la base de datos rechaza un dato, responde con un mensaje claro en vez de fallar. */
export async function guardarCambios(id: number, cambios: Record<string, unknown>, soloClientes = false) {
  try {
    const cond = soloClientes ? and(eq(usuariosTable.id, id), eq(usuariosTable.rol, "cliente")) : eq(usuariosTable.id, id);
    const [u] = await db.update(usuariosTable).set(cambios).where(cond).returning();
    return { u };
  } catch {
    return { error: "Revisa los datos: alguna fecha o número no tiene un formato válido." };
  }
}
