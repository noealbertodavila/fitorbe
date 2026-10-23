import bcrypt from "bcryptjs";
import { db, usuariosTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Primera cuenta de la coach en una base de datos nueva.
 * Si no existe ninguna cuenta de coach y están COACH_EMAIL y COACH_PASSWORD
 * (se escriben en Render, nunca en el código), se crea la cuenta.
 * Si ya hay una coach, no hace nada.
 */
export async function ensureCoach() {
  const email = process.env.COACH_EMAIL?.trim().toLowerCase();
  const password = process.env.COACH_PASSWORD;
  if (!email || !password) return;
  try {
    const [yaHay] = await db.select({ id: usuariosTable.id }).from(usuariosTable).where(eq(usuariosTable.rol, "coach")).limit(1);
    if (yaHay) return;
    await db.insert(usuariosTable).values({
      nombre: process.env.COACH_NOMBRE || "Nahomy",
      email,
      passwordHash: await bcrypt.hash(password, 10),
      rol: "coach",
    });
    logger.info({ email }, "Cuenta de coach creada");
  } catch (err) {
    logger.error({ err }, "No se pudo crear la cuenta de coach");
  }
}
