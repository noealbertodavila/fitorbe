import { db, coachesTable, usoIaTable, usuariosTable } from "@workspace/db";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { localDateStr } from "./date-mt";

/**
 * Modelo para todo lo de IA en Fitorbe. Haiku 5.5 es el más económico y alcanza
 * para armar menús, rutinas y responder el chat. Se puede cambiar con IA_MODELO.
 */
export const MODELO_IA = process.env.IA_MODELO || "claude-haiku-5-5";

/** Generaciones con IA (planes, rutinas o un día regenerado) por mes, según el plan del coach. */
export const LIMITE_GENERACIONES: Record<string, number> = { inicial: 0, pro: 150, estudio: 400 };
/** Durante los 14 días de prueba el coach puede probar la IA con este tope. */
export const LIMITE_PRUEBA = 20;
/** Mensajes al asistente por cliente al día. */
export const LIMITE_CHAT_DIA = 20;

const hoy = () => localDateStr();
const inicioMes = () => hoy().slice(0, 8) + "01";
const finMes = () => {
  const d = new Date();
  return localDateStr(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
};

/** Plan del coach y cuántas generaciones le tocan este mes. */
export async function limiteDelCoach(coachUsuarioId: number): Promise<{ plan: string; estado: string; limite: number }> {
  const [c] = await db
    .select({ plan: coachesTable.plan, estado: coachesTable.estado })
    .from(coachesTable)
    .where(eq(coachesTable.usuarioId, coachUsuarioId))
    .limit(1);
  const plan = (c?.plan ?? "inicial").toLowerCase();
  const estado = c?.estado ?? "activo";
  // En los días de prueba todos pueden conocer la IA, con un tope pequeño.
  const limite = estado === "prueba" ? LIMITE_PRUEBA : (LIMITE_GENERACIONES[plan] ?? 0);
  return { plan, estado, limite };
}

async function sumar(usuarioId: number, tipo: string, desde: string, hasta: string): Promise<number> {
  const [r] = await db
    .select({ total: sql<number>`coalesce(sum(${usoIaTable.cantidad}), 0)::int` })
    .from(usoIaTable)
    .where(and(eq(usoIaTable.usuarioId, usuarioId), eq(usoIaTable.tipo, tipo), gte(usoIaTable.fecha, desde), lte(usoIaTable.fecha, hasta)));
  return Number(r?.total ?? 0);
}

export async function usoDelMes(coachUsuarioId: number) {
  const { plan, estado, limite } = await limiteDelCoach(coachUsuarioId);
  const usadas = await sumar(coachUsuarioId, "generacion", inicioMes(), finMes());
  return { plan, estado, limite, usadas, quedan: Math.max(limite - usadas, 0), renueva: finMes() };
}

export async function registrarUso(usuarioId: number, tipo: "generacion" | "chat") {
  await db
    .insert(usoIaTable)
    .values({ usuarioId, tipo, fecha: hoy(), cantidad: 1 })
    .onConflictDoUpdate({
      target: [usoIaTable.usuarioId, usoIaTable.tipo, usoIaTable.fecha],
      set: { cantidad: sql`${usoIaTable.cantidad} + 1` },
    });
}

/** ¿El coach puede generar otra vez? Si no, el mensaje para mostrarle. */
export async function puedeGenerar(coachUsuarioId: number): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const u = await usoDelMes(coachUsuarioId);
  if (u.limite === 0) {
    return { ok: false, status: 403, error: "Tu plan no incluye IA. Con el plan Pro o Estudio la IA te propone planes y rutinas. Mientras tanto puedes crearlos a mano o copiar una semana anterior." };
  }
  if (u.usadas >= u.limite) {
    return { ok: false, status: 429, error: `Ya usaste las ${u.limite} generaciones con IA de este mes. Puedes copiar una semana anterior o crear el plan a mano; se renuevan el 1 del próximo mes.` };
  }
  return { ok: true };
}

/** Chat del asistente: solo si el plan de su coach incluye IA y no pasó el tope del día. */
export async function puedeChatear(clienteId: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const [cli] = await db.select({ coachId: usuariosTable.coachId }).from(usuariosTable).where(eq(usuariosTable.id, clienteId)).limit(1);
  if (cli?.coachId) {
    const { limite } = await limiteDelCoach(cli.coachId);
    if (limite === 0) return { ok: false, error: "El asistente de IA no está incluido en el plan de tu coach. Puedes escribirle directamente en Mensajes." };
  }
  const hoyUsados = await sumar(clienteId, "chat", hoy(), hoy());
  if (hoyUsados >= LIMITE_CHAT_DIA) {
    return { ok: false, error: `Llegaste a los ${LIMITE_CHAT_DIA} mensajes de hoy con el asistente. Mañana puedes seguir; si es urgente, escríbele a tu coach en Mensajes.` };
  }
  return { ok: true };
}
