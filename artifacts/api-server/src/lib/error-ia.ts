/**
 * Convierte un error de la IA en un mensaje claro para el coach (sin detalles técnicos).
 * 503 cuando la IA no está configurada o la llave no sirve; 502 para otros fallos.
 */
export function errorIA(error: unknown, que: string): { status: number; error: string } {
  const e = error as { status?: number; message?: string };
  const msg = String(e?.message ?? "");
  if (e?.status === 401 || e?.status === 403 || /authentication|api[- ]?key|x-api-key|sin-llave/i.test(msg)) {
    return { status: 503, error: `La IA todavía no está activa en Fitorbe, así que no se pudo generar ${que}. Puedes crearla a mano mientras tanto.` };
  }
  if (e?.status === 429 || /rate|overloaded|529/i.test(msg)) {
    return { status: 503, error: `La IA está muy ocupada en este momento. Intenta de nuevo en un minuto.` };
  }
  return { status: 502, error: `No se pudo generar ${que} con la IA. Intenta de nuevo o créala a mano.` };
}
