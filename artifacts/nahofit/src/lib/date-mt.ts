// Browser-local date utilities.
// All dates are derived from the user's local system clock — works in any country or timezone.

/** Returns today's date as "YYYY-MM-DD" in the user's local timezone */
export function getFechaHoy(): string {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

/** Returns a Date object at UTC midnight representing today's local date.
 *  Safe for comparisons with date-fns and the API. */
export function getHoyMT(): Date {
  const ahora = new Date();
  return new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()));
}

/** Returns "Buenos días/tardes/noches, {nombre}" based on the user's local clock */
export function getSaludo(nombre: string): string {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) return `Buenos días, ${nombre}`;
  if (hora >= 12 && hora < 18) return `Buenas tardes, ${nombre}`;
  return `Buenas noches, ${nombre}`;
}

/** Returns "YYYY-MM-DD" for Monday of the current week in local time */
export function getLunesMT(): string {
  const hoy = new Date();
  const diaSemana = hoy.getDay(); // 0=Dom, 1=Lun, ... 6=Sab
  const diff = diaSemana === 0 ? -6 : 1 - diaSemana;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diff);
  const anio = lunes.getFullYear();
  const mes = String(lunes.getMonth() + 1).padStart(2, "0");
  const dia = String(lunes.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

/** Format a date string "YYYY-MM-DD" for display without timezone shift */
export function formatearFecha(fechaStr: string): string {
  if (!fechaStr) return "";
  const [anio, mes, dia] = fechaStr.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  return fecha.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
