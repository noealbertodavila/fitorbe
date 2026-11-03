import { db, planesFitorbeTable, coachesTable, usuariosTable, historialCoachesTable } from "@workspace/db";
import { and, asc, eq, sql } from "drizzle-orm";
import { logger } from "./logger";

export type PlanFitorbe = typeof planesFitorbeTable.$inferSelect;
export const CLAVES_PLAN = ["inicial", "pro", "estudio"] as const;

/** Los mismos precios que publica fitorbe.com; luego el superadmin los cambia en el panel. */
const PLANES_INICIALES = [
  { clave: "inicial", nombre: "Inicial", precioMes: 19, precioAnio: 190, limiteIa: 0, maxClientes: 10, orden: 1 },
  { clave: "pro", nombre: "Pro", precioMes: 39, precioAnio: 390, limiteIa: 150, maxClientes: 40, orden: 2 },
  { clave: "estudio", nombre: "Estudio", precioMes: 69, precioAnio: 690, limiteIa: 400, maxClientes: null, orden: 3 },
];

/** Al arrancar: crea los planes que falten (no toca los que el superadmin ya editó). */
export async function asegurarPlanesFitorbe() {
  try {
    await db.insert(planesFitorbeTable).values(PLANES_INICIALES).onConflictDoNothing();
  } catch (err) {
    logger.error({ err }, "No se pudieron preparar los planes de Fitorbe");
  }
}

let cache: { hasta: number; planes: PlanFitorbe[] } | null = null;

export async function listaPlanes(): Promise<PlanFitorbe[]> {
  if (cache && cache.hasta > Date.now()) return cache.planes;
  const planes = await db.select().from(planesFitorbeTable).orderBy(asc(planesFitorbeTable.orden));
  cache = { hasta: Date.now() + 60_000, planes };
  return planes;
}
export const olvidarPlanes = () => { cache = null; };

/** El plan por su clave (si no existe en la base, el inicial de fábrica). */
export async function planDe(clave: string | null | undefined): Promise<PlanFitorbe> {
  const c = (clave ?? "inicial").toLowerCase();
  const planes = await listaPlanes();
  const p = planes.find((x) => x.clave === c) ?? planes.find((x) => x.clave === "inicial");
  if (p) return p;
  const f = PLANES_INICIALES.find((x) => x.clave === c) ?? PLANES_INICIALES[0];
  return { ...f, actualizadoEn: new Date() };
}

export async function clientesActivosDe(coachUsuarioId: number): Promise<number> {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(usuariosTable)
    .where(and(eq(usuariosTable.coachId, coachUsuarioId), eq(usuariosTable.rol, "cliente"), eq(usuariosTable.activo, true)));
  return Number(r?.n ?? 0);
}

/** ¿El coach puede tener un cliente activo más? Si no, el mensaje para mostrarle. */
export async function puedeAgregarCliente(coachUsuarioId: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const [c] = await db.select({ plan: coachesTable.plan }).from(coachesTable).where(eq(coachesTable.usuarioId, coachUsuarioId)).limit(1);
  const plan = await planDe(c?.plan);
  if (plan.maxClientes == null) return { ok: true };
  const activos = await clientesActivosDe(coachUsuarioId);
  if (activos < plan.maxClientes) return { ok: true };
  return {
    ok: false,
    error: `Tu plan ${plan.nombre} incluye hasta ${plan.maxClientes} clientes activos y ya los tienes. Desactiva a un cliente que ya no atiendas o pasa a un plan mayor; tus clientes actuales siguen igual.`,
  };
}

export async function anotarHistorial(coachUsuarioId: number, texto: string, autor?: string | null) {
  try {
    await db.insert(historialCoachesTable).values({ coachUsuarioId, texto: texto.slice(0, 500), autor: autor ?? null });
  } catch (err) {
    logger.warn({ err }, "No se pudo anotar el historial del coach");
  }
}

/** Último acceso del coach, como mucho una vez cada 10 minutos por coach (sin frenar la petición). */
const ultimos = new Map<number, number>();
export function marcarAcceso(coachUsuarioId: number) {
  const ahora = Date.now();
  if ((ultimos.get(coachUsuarioId) ?? 0) > ahora - 10 * 60_000) return;
  ultimos.set(coachUsuarioId, ahora);
  db.update(coachesTable).set({ ultimoAcceso: new Date() }).where(eq(coachesTable.usuarioId, coachUsuarioId)).catch(() => {});
}

/** Lo que paga al mes (el anual se reparte en 12). */
export const ingresoMensual = (p: PlanFitorbe, periodo: string | null | undefined) =>
  periodo === "anio" ? p.precioAnio / 12 : p.precioMes;
