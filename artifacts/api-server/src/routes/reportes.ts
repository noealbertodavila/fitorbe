import { localDateStr } from "../lib/date-mt";
import { Router } from "express";
import { db, checkinsDiariosTable, pagosTable, usuariosTable } from "@workspace/db";
import { eq, and, gte, sql, desc } from "drizzle-orm";
import { requireAuth, requireRol } from "../middlewares/auth";

const router = Router();

router.get("/reportes/adherencia", requireAuth, requireRol("admin", "coach"), async (_req, res) => {
  const clientes = await db
    .select()
    .from(usuariosTable)
    .where(eq(usuariosTable.rol, "cliente"));

  const todosCheckins = await db.select().from(checkinsDiariosTable);

  const adherenciaGlobal =
    todosCheckins.length > 0
      ? todosCheckins.reduce((s, c) => s + (c.porcentajeAdherencia || 0), 0) /
        todosCheckins.length
      : 0;

  const porCliente = await Promise.all(
    clientes.map(async (c) => {
      const checkins = todosCheckins.filter((ch) => ch.clienteId === c.id);
      const adherencia =
        checkins.length > 0
          ? checkins.reduce((s, ch) => s + (ch.porcentajeAdherencia || 0), 0) /
            checkins.length
          : 0;
      return {
        clienteId: c.id,
        clienteNombre: c.nombre,
        adherencia: Math.round(adherencia),
      };
    })
  );

  // By week (last 8 weeks)
  const porSemana = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const startStr = localDateStr(weekStart);
    const endStr = localDateStr(weekEnd);
    const weekCheckins = todosCheckins.filter(
      (c) => c.fecha >= startStr && c.fecha <= endStr
    );
    const adherencia =
      weekCheckins.length > 0
        ? weekCheckins.reduce(
            (s, c) => s + (c.porcentajeAdherencia || 0),
            0
          ) / weekCheckins.length
        : 0;
    porSemana.push({ semana: startStr, adherencia: Math.round(adherencia) });
  }

  res.json({ adherenciaGlobal: Math.round(adherenciaGlobal), porCliente, porSemana });
});

router.get("/reportes/ingresos", requireAuth, requireRol("admin", "coach"), async (_req, res) => {
  const todosPageos = await db.select().from(pagosTable);
  const now = new Date();
  const mesActual = now.getMonth();
  const anioActual = now.getFullYear();

  const totalMes = todosPageos
    .filter((p) => {
      const d = new Date(p.fecha);
      return d.getMonth() === mesActual && d.getFullYear() === anioActual && p.estado === "pagado";
    })
    .reduce((s, p) => s + (p.monto || 0), 0);

  const totalAnio = todosPageos
    .filter((p) => {
      const d = new Date(p.fecha);
      return d.getFullYear() === anioActual && p.estado === "pagado";
    })
    .reduce((s, p) => s + (p.monto || 0), 0);

  // By method
  const metodosMap = new Map<string, number>();
  todosPageos.filter((p) => p.estado === "pagado").forEach((p) => {
    metodosMap.set(p.metodo, (metodosMap.get(p.metodo) || 0) + (p.monto || 0));
  });
  const porMetodo = [...metodosMap.entries()].map(([metodo, total]) => ({
    metodo,
    total,
  }));

  // By month (last 6 months)
  const porMes = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const month = d.getMonth();
    const year = d.getFullYear();
    const total = todosPageos
      .filter((p) => {
        const pd = new Date(p.fecha);
        return pd.getMonth() === month && pd.getFullYear() === year && p.estado === "pagado";
      })
      .reduce((s, p) => s + (p.monto || 0), 0);
    const mes = `${year}-${String(month + 1).padStart(2, "0")}`;
    porMes.push({ mes, total });
  }

  res.json({ totalMes, totalAnio, porMetodo, porMes });
});

export default router;
