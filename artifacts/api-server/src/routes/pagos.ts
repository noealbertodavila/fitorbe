import { Router } from "express";
import { db, pagosTable, usuariosTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireRol } from "../middlewares/auth";

const router = Router();

// Helper to enrich pagos with clienteNombre
async function enrichPagos(rows: typeof pagosTable.$inferSelect[]) {
  const clienteIds = [...new Set(rows.map(r => r.clienteId))];
  const clientes = await db
    .select({ id: usuariosTable.id, nombre: usuariosTable.nombre })
    .from(usuariosTable)
    .where(sql`${usuariosTable.id} = ANY(ARRAY[${sql.raw(clienteIds.join(",") || "0")}]::int[])`);
  const clienteMap = new Map(clientes.map(c => [c.id, c.nombre]));
  return rows.map(p => ({ ...p, clienteNombre: clienteMap.get(p.clienteId) || null }));
}

// GET all pagos (no filter or clienteId=0)
router.get("/pagos", requireAuth, requireRol("admin", "coach"), async (_req, res) => {
  const rows = await db
    .select()
    .from(pagosTable)
    .orderBy(desc(pagosTable.fecha));
  res.json(await enrichPagos(rows));
});

// GET stats summary
router.get("/pagos/stats", requireAuth, requireRol("admin", "coach"), async (_req, res) => {
  const rows = await db.select().from(pagosTable);
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const totalMes = rows
    .filter(p => {
      const d = new Date(p.fecha + "T12:00:00");
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear && p.estado === "pagado";
    })
    .reduce((s, p) => s + Number(p.monto), 0);

  const totalAnio = rows
    .filter(p => {
      const d = new Date(p.fecha + "T12:00:00");
      return d.getFullYear() === thisYear && p.estado === "pagado";
    })
    .reduce((s, p) => s + Number(p.monto), 0);

  const pendientes = rows.filter(p => p.estado === "pendiente").length;
  const vencidos = rows.filter(p => p.estado === "vencido").length;

  // Monthly breakdown for last 6 months
  const mensual: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(thisYear, thisMonth - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    mensual[key] = 0;
  }
  rows.forEach(p => {
    if (p.estado !== "pagado") return;
    const d = new Date(p.fecha + "T12:00:00");
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (key in mensual) mensual[key] += Number(p.monto);
  });

  res.json({ totalMes, totalAnio, pendientes, vencidos, mensual });
});

// GET alertas (vencidos)
router.get("/pagos/alertas", requireAuth, requireRol("admin", "coach"), async (_req, res) => {
  const alertas = await db
    .select()
    .from(pagosTable)
    .where(eq(pagosTable.estado, "vencido"));

  const hoy = new Date();
  const enriched = await enrichPagos(alertas);
  res.json(enriched.map(p => ({
    ...p,
    diasVencido: Math.max(0, Math.floor((hoy.getTime() - new Date(p.fecha + "T12:00:00").getTime()) / 86400000)),
  })));
});

// GET pagos by clienteId (0 = all)
router.get("/pagos/:clienteId", requireAuth, async (req, res) => {
  const clienteId = parseInt(String(req.params.clienteId));
  const rows = clienteId > 0
    ? await db.select().from(pagosTable).where(eq(pagosTable.clienteId, clienteId)).orderBy(desc(pagosTable.fecha))
    : await db.select().from(pagosTable).orderBy(desc(pagosTable.fecha));
  res.json(await enrichPagos(rows));
});

// POST create pago
router.post("/pagos", requireAuth, requireRol("admin", "coach"), async (req, res) => {
  const { clienteId, fecha, monto, metodo, metodoDatos, concepto, estado, notas, proxPago } = req.body;
  const [created] = await db
    .insert(pagosTable)
    .values({
      clienteId,
      fecha,
      monto: Number(monto),
      metodo,
      metodoDatos: metodoDatos || null,
      concepto,
      estado: estado || "pagado",
      notas: notas || null,
      proxPago: proxPago || null,
    })
    .returning();
  const [cliente] = await db.select().from(usuariosTable).where(eq(usuariosTable.id, clienteId)).limit(1);
  res.status(201).json({ ...created, clienteNombre: cliente?.nombre || null });
});

// PATCH update pago state (by /pagos/:id/estado)
router.patch("/pagos/:id/estado", requireAuth, requireRol("admin", "coach"), async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { estado, notas, proxPago } = req.body;
  const updates: Record<string, any> = {};
  if (estado) updates.estado = estado;
  if (notas !== undefined) updates.notas = notas;
  if (proxPago !== undefined) updates.proxPago = proxPago;
  const [updated] = await db
    .update(pagosTable)
    .set(updates)
    .where(eq(pagosTable.id, id))
    .returning();
  res.json(updated);
});

export default router;
