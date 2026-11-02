/** Fecha "YYYY-MM-DD" que cae en lunes (las semanas de planes y rutinas empiezan el lunes). */
export function esLunes(fecha: unknown): fecha is string {
  if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const d = new Date(fecha + "T12:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha && d.getUTCDay() === 1;
}

/** Copia sin las marcas de "hecho" que el cliente haya puesto (comidas o ejercicios). */
export function sinMarcas<T>(items: T): T {
  if (!Array.isArray(items)) return items;
  return items.map((it) => {
    if (!it || typeof it !== "object") return it;
    const copia: Record<string, unknown> = { ...(it as Record<string, unknown>) };
    if ("completada" in copia) copia.completada = false;
    if ("completado" in copia) copia.completado = false;
    return copia;
  }) as unknown as T;
}
