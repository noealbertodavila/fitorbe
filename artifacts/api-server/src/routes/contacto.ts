import { Router } from "express";
import { clientIp } from "../lib/hardening";
import { db, solicitudesContactoTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth, requireRol } from "../middlewares/auth";
import { coachPorSlugOId } from "../lib/coaches";

/**
 * Formulario "Agenda tu primera sesión" de la página: guarda a la persona
 * interesada y su coach la ve en su panel (Solicitudes) para escribirle.
 */
const router = Router();

const INTERESES = ["primera_sesion", "cuerpo", "cuerpo_mente", "uno_a_uno", "otro"];
const intentos = new Map<string, number[]>();
function demasiadas(ip: string): boolean {
  const ahora = Date.now();
  const lista = (intentos.get(ip) ?? []).filter((t) => ahora - t < 60 * 60 * 1000);
  lista.push(ahora);
  intentos.set(ip, lista);
  return lista.length > 5;
}
const txt = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

router.post("/contacto", async (req, res) => {
  const b = req.body ?? {};
  // Campo trampa para robots: una persona no lo llena.
  if (txt(b.empresa, 100)) {
    res.status(201).json({ ok: true });
    return;
  }
  const nombre = txt(b.nombre, 120);
  const telefono = txt(b.telefono, 40);
  const email = txt(b.email, 254).toLowerCase();
  const interes = INTERESES.includes(String(b.interes)) ? String(b.interes) : "primera_sesion";
  const mensaje = txt(b.mensaje, 1000);
  if (!nombre) {
    res.status(400).json({ error: "Escribe tu nombre" });
    return;
  }
  if (!telefono && !email) {
    res.status(400).json({ error: "Déjanos tu WhatsApp o tu correo para escribirte" });
    return;
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Ese correo no es válido" });
    return;
  }
  if (b.acepta !== true) {
    res.status(400).json({ error: "Acepta que te contacten" });
    return;
  }
  const ip = clientIp(req);
  if (demasiadas(ip)) {
    res.status(429).json({ error: "Ya recibimos tus datos. Te escribirán pronto." });
    return;
  }
  // A qué coach va: por su página (slug) o por su número. Si no existe, no se guarda.
  const coachId = await coachPorSlugOId(b.coach);
  if (!coachId) {
    res.status(400).json({ error: "Falta indicar a qué coach va la solicitud" });
    return;
  }
  await db.insert(solicitudesContactoTable).values({
    coachId,
    nombre,
    telefono: telefono || null,
    email: email || null,
    interes,
    mensaje: mensaje || null,
    idioma: b.idioma === "en" ? "en" : "es",
  });
  res.status(201).json({ ok: true });
});

router.get("/contacto/solicitudes", requireAuth, requireRol("coach"), async (req, res) => {
  const me = (req as any).usuario;
  const rows = await db.select().from(solicitudesContactoTable).where(eq(solicitudesContactoTable.coachId, me.id)).orderBy(desc(solicitudesContactoTable.creadoEn)).limit(300);
  res.json(rows);
});

router.patch("/contacto/solicitudes/:id", requireAuth, requireRol("coach"), async (req, res) => {
  const me = (req as any).usuario;
  const id = parseInt(String(req.params.id));
  const [row] = await db
    .update(solicitudesContactoTable)
    .set({ atendida: req.body?.atendida === true })
    .where(and(eq(solicitudesContactoTable.id, id), eq(solicitudesContactoTable.coachId, me.id)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "No encontrada" });
    return;
  }
  res.json(row);
});

export default router;
