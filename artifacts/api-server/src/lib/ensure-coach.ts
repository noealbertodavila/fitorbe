import bcrypt from "bcryptjs";
import { db, usuariosTable, coachesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "./logger";
import { slugLibre } from "./coaches";

/**
 * Al arrancar:
 * 1. Con SUPERADMIN_EMAIL y SUPERADMIN_PASSWORD (se escriben en Render, nunca
 *    en el código) crea la cuenta del superadmin o le pone esa contraseña.
 * 2. Cada usuario coach tiene su ficha en "coaches" (por si vino de antes).
 */
export async function ensureCoach() {
  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD;
  try {
    if (email && password) {
      // La cuenta del superadmin sigue lo que diga Render: si cambias la
      // contraseña en SUPERADMIN_PASSWORD, al reiniciar queda la nueva.
      const [porCorreo] = await db.select().from(usuariosTable).where(sql`lower(${usuariosTable.email}) = ${email}`).limit(1);
      if (porCorreo) {
        const igual = await bcrypt.compare(password, porCorreo.passwordHash);
        if (!igual || porCorreo.rol !== "admin" || !porCorreo.activo) {
          await db
            .update(usuariosTable)
            .set({ passwordHash: igual ? porCorreo.passwordHash : await bcrypt.hash(password, 10), rol: "admin", activo: true })
            .where(eq(usuariosTable.id, porCorreo.id));
          logger.info({ email }, "Cuenta de superadmin actualizada");
        }
      } else {
        await db.insert(usuariosTable).values({
          nombre: process.env.SUPERADMIN_NOMBRE || "Superadmin",
          email,
          passwordHash: await bcrypt.hash(password, 10),
          rol: "admin",
        });
        logger.info({ email }, "Cuenta de superadmin creada");
      }
    } else {
      logger.warn("Faltan SUPERADMIN_EMAIL o SUPERADMIN_PASSWORD: no se preparó el superadmin");
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
