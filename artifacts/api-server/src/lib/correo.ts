import { logger } from "./logger";

/**
 * Correos de Fitorbe por Resend (HTTPS). Variables en Render:
 *   RESEND_API_KEY      la llave de Resend (la misma cuenta de nexuvoltsolutions.com)
 *   MAIL_FROM           remitente, ej. "Fitorbe <admin@nexuvoltsolutions.com>"
 *   ADMIN_NOTIFY_EMAIL  a dónde llegan los avisos (por defecto admin@nexuvoltsolutions.com)
 * Si falta la llave, no se manda nada y se avisa en el registro (lo guardado no se pierde).
 */
export interface Correo { to: string; subject: string; html: string; replyTo?: string }

export const correoAvisos = () => process.env.ADMIN_NOTIFY_EMAIL || "admin@nexuvoltsolutions.com";

export async function enviarCorreo(c: Correo): Promise<boolean> {
  if (process.env.NODE_ENV === "test") return false;
  if (!process.env.RESEND_API_KEY) {
    logger.warn({ asunto: c.subject }, "Falta RESEND_API_KEY: no se mandó el correo");
    return false;
  }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || "Fitorbe <admin@nexuvoltsolutions.com>",
        to: [c.to],
        subject: c.subject,
        html: c.html,
        ...(c.replyTo ? { reply_to: c.replyTo } : {}),
      }),
    });
    if (!r.ok) {
      logger.error({ status: r.status, cuerpo: await r.text().catch(() => "") }, "Resend no mandó el correo");
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ err }, "No se pudo mandar el correo");
    return false;
  }
}

/** Texto seguro para meter en HTML. */
export const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
