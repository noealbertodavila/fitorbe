import { db, coachesTable, usuariosTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { crearPlanesIniciales } from "./ensure-default-plans";

/**
 * Busca un coach por su página (slug, p. ej. "nahomy") o por su número de usuario.
 * Devuelve el id del usuario coach, o null si no existe o está suspendido.
 */
export async function coachPorSlugOId(valor: unknown): Promise<number | null> {
  const v = String(valor ?? "").trim().toLowerCase();
  if (!v) return null;
  const porId = /^\d+$/.test(v) ? Number(v) : null;
  const [c] = await db
    .select({ usuarioId: coachesTable.usuarioId, estado: coachesTable.estado, activo: usuariosTable.activo })
    .from(coachesTable)
    .innerJoin(usuariosTable, eq(usuariosTable.id, coachesTable.usuarioId))
    .where(porId ? eq(coachesTable.usuarioId, porId) : eq(coachesTable.slug, v))
    .limit(1);
  if (!c || !c.activo || c.estado === "suspendido") return null;
  return c.usuarioId;
}

/** Convierte un nombre de negocio en un slug: "NAHOFIT.LIFE" → "nahofit-life". */
export function slugDe(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "coach";
}

/** Un slug que todavía no use otro coach (agrega -2, -3…). */
export async function slugLibre(base: string): Promise<string> {
  const raiz = slugDe(base);
  for (let i = 1; i < 500; i++) {
    const s = i === 1 ? raiz : `${raiz}-${i}`;
    const [x] = await db.select({ id: coachesTable.id }).from(coachesTable).where(eq(coachesTable.slug, s)).limit(1);
    if (!x) return s;
  }
  return `${raiz}-${Date.now().toString(36)}`;
}


export const DIAS_PRUEBA = 14;

/** Fecha (AAAA-MM-DD) dentro de n días. */
export function enDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Crea un coach: su usuario, su ficha (negocio, página, prueba) y sus planes de ejemplo.
 * Lo usan el registro público y el superadmin.
 */
export async function crearCoach(datos: {
  nombre: string;
  email: string;
  password: string;
  negocio?: string;
  telefono?: string | null;
  estado?: "prueba" | "activo";
}): Promise<{ usuario: typeof usuariosTable.$inferSelect; ficha: typeof coachesTable.$inferSelect } | { error: string; status: number }> {
  const nombre = datos.nombre.trim().slice(0, 120);
  const email = datos.email.trim().toLowerCase();
  const negocio = (datos.negocio || nombre).trim().slice(0, 120);
  if (!nombre || !email) return { error: "Escribe tu nombre y tu correo", status: 400 };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "El correo no es válido", status: 400 };
  if (datos.password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres", status: 400 };
  const [existe] = await db.select({ id: usuariosTable.id }).from(usuariosTable).where(eq(usuariosTable.email, email)).limit(1);
  if (existe) return { error: "Ya hay una cuenta con ese correo", status: 409 };
  const estado = datos.estado ?? "prueba";
  const [usuario] = await db
    .insert(usuariosTable)
    .values({ nombre, email, passwordHash: await bcrypt.hash(datos.password, 10), rol: "coach", telefono: datos.telefono || null, activo: true })
    .returning();
  const [ficha] = await db
    .insert(coachesTable)
    .values({ usuarioId: usuario.id, negocio, slug: await slugLibre(negocio), estado, pruebaHasta: estado === "prueba" ? enDias(DIAS_PRUEBA) : null })
    .returning();
  await crearPlanesIniciales(usuario.id);
  return { usuario, ficha };
}
