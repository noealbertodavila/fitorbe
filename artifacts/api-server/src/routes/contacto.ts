import { Router } from "express";
import { db, solicitudesContactoTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAuth, requireRol } from "../middlewares/auth";

/**
 * Formulario "Agenda tu primera sesión" de la página: guarda a la persona
 * interesada y Nahomy la ve en su panel (Solicitudes) para escribirle.
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
    res.status(400).json({ error: "Acepta que Nahomy te contacte" });
    return;
  }
  const ip = String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "").split(",")[0].trim();
  if (demasiadas(ip)) {
    res.status(429).json({ error: "Ya recibimos tus datos. Nahomy te escribirá pronto." });
    return;
  }
  await db.insert(solicitudesContactoTable).values({
    nombre,
    telefono: telefono || null,
    email: email || null,
    interes,
    mensaje: mensaje || null,
    idioma: b.idioma === "en" ? "en" : "es",
  });
  res.status(201).json({ ok: true });
});

router.get("/contacto/solicitudes", requireAuth, requireRol("admin", "coach"), async (_req, res) => {
  const rows = await db.select().from(solicitudesContactoTable).orderBy(desc(solicitudesContactoTable.creadoEn)).limit(300);
  res.json(rows);
});

router.patch("/contacto/solicitudes/:id", requireAuth, requireRol("admin", "coach"), async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [row] = await db
    .update(solicitudesContactoTable)
    .set({ atendida: req.body?.atendida === true })
    .where(eq(solicitudesContactoTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "No encontrada" });
    return;
  }
  res.json(row);
});

export default router;
