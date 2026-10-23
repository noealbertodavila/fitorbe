import bcrypt from "bcryptjs";
import { db, usuariosTable, coachesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { slugLibre } from "./coaches";

/**
 * Al arrancar:
 * 1. Si no hay superadmin y están SUPERADMIN_EMAIL y SUPERADMIN_PASSWORD
 *    (se escriben en Render, nunca en el código), crea la cuenta del superadmin.
 * 2. Cada usuario coach tiene su ficha en "coaches" (por si vino de antes).
 */
export async function ensureCoach() {
  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD;
  try {
    if (email && password) {
      const [yaHay] = await db.select({ id: usuariosTable.id }).from(usuariosTable).where(eq(usuariosTable.rol, "admin")).limit(1);
      if (!yaHay) {
        await db.insert(usuariosTable).values({
          nombre: process.env.SUPERADMIN_NOMBRE || "Superadmin",
          email,
          passwordHash: await bcrypt.hash(password, 10),
          rol: "admin",
        });
        logger.info({ email }, "Cuenta de superadmin creada");
      }
    }
    const coaches = await db.select().from(usuariosTable).where(eq(usuariosTable.rol, "coach"));
    for (const c of coaches) {
      const [ficha] = await db.select({ id: coachesTable.id }).from(coachesTable).where(eq(coachesTable.usuarioId, c.id)).limit(1);
      if (!ficha) {
        await db.insert(coachesTable).values({ usuarioId: c.id, negocio: c.nombre, slug: await slugLibre(c.nombre), estado: "activo" });
        logger.info({ coach: c.id }, "Ficha de coach creada");
      }
    }
  } catch (err) {
    logger.error({ err }, "No se pudo preparar el superadmin o las fichas de coaches");
  }
}
