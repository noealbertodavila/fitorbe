import { Router } from "express";
import { db, interesadosTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAuth, requireRol } from "../middlewares/auth";
import { enviarCorreo, correoAvisos, esc } from "../lib/correo";

/**
 * Formulario de fitorbe.com: coaches interesados en la plataforma.
 * Se guarda y llega por correo al equipo de Fitorbe; el superadmin lo ve en su panel.
 */
const router = Router();

const PLANES = ["inicial", "pro", "estudio", "no_se"];
const intentos = new Map<string, number[]>();
function demasiadas(ip: string): boolean {
  const ahora = Date.now();
  const lista = (intentos.get(ip) ?? []).filter((t) => ahora - t < 60 * 60 * 1000);
  lista.push(ahora);
  intentos.set(ip, lista);
  return lista.length > 5;
}
const txt = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

router.post("/interesados", async (req, res) => {
  const b = req.body ?? {};
  if (txt(b.empresa, 100)) { res.status(201).json({ ok: true }); return; } // trampa para robots
  const nombre = txt(b.nombre, 120);
  const email = txt(b.email, 254).toLowerCase();
  const telefono = txt(b.telefono, 40);
  const negocio = txt(b.negocio, 120);
  const clientes = txt(b.clientes, 30);
  const plan = PLANES.includes(String(b.plan)) ? String(b.plan) : "no_se";
  const mensaje = txt(b.mensaje, 1500);
  if (!nombre) { res.status(400).json({ error: "Escribe tu nombre" }); return; }
  if (!email && !telefono) { res.status(400).json({ error: "Déjanos tu correo o tu WhatsApp para responderte" }); return; }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { res.status(400).json({ error: "Ese correo no es válido" }); return; }
  const ip = String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "").split(",")[0].trim();
  if (demasiadas(ip)) { res.status(429).json({ error: "Ya recibimos tus datos. Te escribiremos pronto." }); return; }

  const [fila] = await db.insert(interesadosTable).values({ nombre, email: email || null, telefono: telefono || null, negocio: negocio || null, clientes: clientes || null, plan, mensaje: mensaje || null }).returning();

  const nombrePlan: Record<string, string> = { inicial: "Inicial ($19)", pro: "Pro ($39)", estudio: "Estudio ($69)", no_se: "Aún no sabe" };
  const wa = telefono.replace(/\D/g, "");
  const filas = [
    ["Nombre", esc(nombre)],
    ["Correo", email ? `<a href="mailto:${esc(email)}">${esc(email)}</a>` : "—"],
    ["WhatsApp", telefono ? `${esc(telefono)}${wa.length >= 10 ? ` · <a href="https://wa.me/${wa.length === 10 ? "1" + wa : wa}">abrir chat</a>` : ""}` : "—"],
    ["Negocio", esc(negocio) || "—"],
    ["Clientes", esc(clientes) || "—"],
    ["Plan", nombrePlan[plan]],
    ["Mensaje", esc(mensaje).replace(/\n/g, "<br>") || "—"],
  ];
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;color:#0F1715">
    <h2 style="margin:0 0 4px">Nuevo coach interesado en Fitorbe</h2>
    <p style="color:#4A5753;margin:0 0 16px">Llegó desde el formulario de fitorbe.com.</p>
    <table style="border-collapse:collapse;width:100%">${filas.map(([k, v]) => `<tr><td style="padding:8px 12px 8px 0;color:#4A5753;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:8px 0;border-bottom:1px solid #E3E8E6">${v}</td></tr>`).join("")}</table>
  </div>`;
  const enviado = await enviarCorreo({ to: correoAvisos(), subject: `Nuevo coach interesado: ${nombre}${negocio ? " · " + negocio : ""}`, html, replyTo: email || undefined });
  if (enviado) await db.update(interesadosTable).set({ correoEnviado: true }).where(eq(interesadosTable.id, fila.id));
  res.status(201).json({ ok: true });
});

router.get("/superadmin/interesados", requireAuth, requireRol("admin"), async (_req, res) => {
  res.json(await db.select().from(interesadosTable).orderBy(desc(interesadosTable.creadoEn)).limit(200));
});

router.patch("/superadmin/interesados/:id", requireAuth, requireRol("admin"), async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [f] = await db.update(interesadosTable).set({ atendido: req.body?.atendido !== false }).where(eq(interesadosTable.id, id)).returning();
  if (!f) { res.status(404).json({ error: "No encontrado" }); return; }
  res.json(f);
});

export default router;
