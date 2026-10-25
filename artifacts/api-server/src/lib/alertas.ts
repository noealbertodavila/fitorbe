import { db, checkinsEmoccionalesTable, usuariosTable, diarioMentalidadTable } from "@workspace/db";
import { and, gte, lte, inArray } from "drizzle-orm";
import { idsClientesDe, enLista } from "../middlewares/auth";
import { detectarRiesgo } from "./apoyo";
import { localDateStr } from "./date-mt";

export type AlertaEmocional = { clienteId: number; clienteNombre: string; diasBajos: number; ultimoEstado: number; riesgo?: boolean; fechaRiesgo?: string };

/** Días con ánimo bajo (2 o menos) en los últimos 3 días que cuentan como alerta. */
export const DIAS_BAJOS_ALERTA = 2;

/**
 * Clientes de un coach que necesitan apoyo: ánimo bajo varios días seguidos o
 * algo preocupante en su diario o en sus notas (últimos 7 días).
 * La usan la página Emocional y el panel del coach, para que siempre coincidan.
 */
export async function alertasEmocionales(coachId: number): Promise<AlertaEmocional[]> {
  const misIds = await idsClientesDe(coachId);
  if (!misIds.length) return [];
  const hace3 = new Date();
  hace3.setDate(hace3.getDate() - 3);
  const bajos = await db
    .select({ clienteId: checkinsEmoccionalesTable.clienteId, fecha: checkinsEmoccionalesTable.fecha, estadoAnimo: checkinsEmoccionalesTable.estadoAnimo })
    .from(checkinsEmoccionalesTable)
    .where(and(gte(checkinsEmoccionalesTable.fecha, localDateStr(hace3)), lte(checkinsEmoccionalesTable.estadoAnimo, 2), enLista(checkinsEmoccionalesTable.clienteId, misIds)));

  const porCliente = new Map<number, { count: number; fecha: string; ultimo: number }>();
  for (const c of bajos) {
    const f = String(c.fecha);
    const prev = porCliente.get(c.clienteId);
    if (!prev) porCliente.set(c.clienteId, { count: 1, fecha: f, ultimo: c.estadoAnimo });
    else {
      prev.count++;
      if (f > prev.fecha) { prev.fecha = f; prev.ultimo = c.estadoAnimo; }
    }
  }

  const sieteDias = new Date();
  sieteDias.setDate(sieteDias.getDate() - 7);
  const desde = localDateStr(sieteDias);
  const diarios = await db
    .select({ clienteId: diarioMentalidadTable.clienteId, fecha: diarioMentalidadTable.fecha, contenido: diarioMentalidadTable.contenido, gratitud: diarioMentalidadTable.gratitud })
    .from(diarioMentalidadTable)
    .where(and(gte(diarioMentalidadTable.fecha, desde), enLista(diarioMentalidadTable.clienteId, misIds)));
  const notas = await db
    .select({ clienteId: checkinsEmoccionalesTable.clienteId, fecha: checkinsEmoccionalesTable.fecha, notas: checkinsEmoccionalesTable.notas })
    .from(checkinsEmoccionalesTable)
    .where(and(gte(checkinsEmoccionalesTable.fecha, desde), enLista(checkinsEmoccionalesTable.clienteId, misIds)));
  const enRiesgo = new Map<number, string>();
  for (const d of diarios) if (detectarRiesgo(d.contenido, d.gratitud)) enRiesgo.set(d.clienteId, String(d.fecha));
  for (const n of notas) if (detectarRiesgo(n.notas)) enRiesgo.set(n.clienteId, String(n.fecha));

  const ids = new Set<number>([...[...porCliente].filter(([, v]) => v.count >= DIAS_BAJOS_ALERTA).map(([id]) => id), ...enRiesgo.keys()]);
  if (!ids.size) return [];
  const nombres = new Map(
    (await db.select({ id: usuariosTable.id, nombre: usuariosTable.nombre }).from(usuariosTable).where(inArray(usuariosTable.id, [...ids]))).map((u) => [u.id, u.nombre]),
  );
  const alertas: AlertaEmocional[] = [];
  for (const id of ids) {
    const b = porCliente.get(id);
    const bajo = b && b.count >= DIAS_BAJOS_ALERTA;
    const a: AlertaEmocional = { clienteId: id, clienteNombre: nombres.get(id) ?? "Cliente", diasBajos: bajo ? b!.count : 0, ultimoEstado: bajo ? b!.ultimo : 0 };
    if (enRiesgo.has(id)) Object.assign(a, { riesgo: true, fechaRiesgo: enRiesgo.get(id) });
    alertas.push(a);
  }
  return alertas.sort((x, y) => Number(!!y.riesgo) - Number(!!x.riesgo) || y.diasBajos - x.diasBajos);
}
