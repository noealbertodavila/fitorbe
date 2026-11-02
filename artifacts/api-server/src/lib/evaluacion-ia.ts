import {
  db, usuariosTable, coachesTable, registrosProgresoTable, checkinsDiariosTable,
  checkinsEmoccionalesTable, planesComidaTable, rutinasTable,
} from "@workspace/db";
import { and, eq, gte, lt, desc } from "drizzle-orm";
import { localDateStr } from "./date-mt";

/**
 * Antes de pedirle a la IA un plan o una rutina, la app evalúa al cliente con reglas fijas
 * (método con respaldo, siempre igual) y le da a la IA metas exactas. La IA solo arma
 * el menú o los ejercicios. Así sale preciso, consistente y más barato.
 *
 * Nunca se lee el diario (es privado): de lo emocional solo se usan promedios de sueño y energía.
 */

type Cliente = typeof usuariosTable.$inferSelect;

const quitarAcentos = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const redondear = (n: number, paso = 1) => Math.round(n / paso) * paso;
const pct = (n: number) => `${Math.round(n * 100)} %`;

function edadDe(c: Cliente): number | null {
  if (!c.fechaNacimiento) return null;
  const ms = Date.now() - new Date(c.fechaNacimiento).getTime();
  const e = Math.floor(ms / (365.25 * 24 * 3600 * 1000));
  return e > 0 && e < 110 ? e : null;
}

export type Objetivo = "perdida" | "definicion" | "recomposicion" | "ganancia" | "mantenimiento";

export function objetivoDe(texto: string | null | undefined): Objetivo {
  const t = quitarAcentos(texto ?? "");
  const perder = /perder|grasa|bajar|adelgaz|peso corporal/.test(t);
  const definir = /definir|definicion|tonific/.test(t);
  const ganar = /ganar|masa|muscul|volumen|aumentar/.test(t);
  if ((perder || definir) && ganar) return "recomposicion";
  if (perder) return "perdida";
  if (definir) return "definicion";
  if (ganar) return "ganancia";
  return "mantenimiento";
}

const FACTOR_OBJETIVO: Record<Objetivo, { kcal: number; proteinaKg: number; nombre: string }> = {
  perdida: { kcal: 0.8, proteinaKg: 2.0, nombre: "pérdida de grasa (déficit 20 %)" },
  definicion: { kcal: 0.9, proteinaKg: 2.0, nombre: "definición (déficit 10 %)" },
  recomposicion: { kcal: 0.9, proteinaKg: 2.2, nombre: "recomposición (déficit 10 %, proteína alta)" },
  ganancia: { kcal: 1.1, proteinaKg: 1.8, nombre: "ganancia muscular (superávit 10 %)" },
  mantenimiento: { kcal: 1.0, proteinaKg: 1.6, nombre: "mantenimiento" },
};

/** Factor de actividad según los días que entrena por semana. */
function factorActividad(dias: number | null | undefined): number {
  const d = dias ?? 3;
  if (d <= 1) return 1.2;
  if (d <= 3) return 1.375;
  if (d <= 5) return 1.55;
  return 1.725;
}

export interface Metas { calorias: number; proteinaG: number; carbosG: number; grasaG: number }

export interface DatosResultados {
  tendenciaPeso: { porcentajeSemanal: number; desdeKg: number; hastaKg: number; semanas: number } | null;
  cintura: { desdeCm: number; hastaCm: number } | null;
  cumplimientoComidas: number | null; // 0..1
  cumplimientoEjercicio: number | null; // 0..1
  suenoPromedio: number | null;
  energiaPromedio: number | null; // 1..5
}

async function resultadosRecientes(c: Cliente): Promise<DatosResultados> {
  const hace42 = localDateStr(new Date(Date.now() - 42 * 864e5));
  const hace14 = localDateStr(new Date(Date.now() - 14 * 864e5));

  const progreso = await db
    .select({ fecha: registrosProgresoTable.fecha, peso: registrosProgresoTable.pesoKg, cintura: registrosProgresoTable.cinturaCm })
    .from(registrosProgresoTable)
    .where(and(eq(registrosProgresoTable.clienteId, c.id), gte(registrosProgresoTable.fecha, hace42)))
    .orderBy(registrosProgresoTable.fecha);
  const conPeso = progreso.filter((p) => p.peso);
  let tendenciaPeso: DatosResultados["tendenciaPeso"] = null;
  if (conPeso.length >= 2) {
    const a = conPeso[0]!, b = conPeso[conPeso.length - 1]!;
    const dias = (new Date(b.fecha).getTime() - new Date(a.fecha).getTime()) / 864e5;
    if (dias >= 10) {
      const semanas = dias / 7;
      tendenciaPeso = { porcentajeSemanal: ((b.peso! - a.peso!) / a.peso! / semanas) * 100, desdeKg: a.peso!, hastaKg: b.peso!, semanas: Math.round(semanas) };
    }
  }
  const conCintura = progreso.filter((p) => p.cintura);
  const cintura = conCintura.length >= 2 ? { desdeCm: conCintura[0]!.cintura!, hastaCm: conCintura[conCintura.length - 1]!.cintura! } : null;

  const checkins = await db
    .select({ comidas: checkinsDiariosTable.comidasCompletadas, ejercicios: checkinsDiariosTable.ejerciciosCompletados })
    .from(checkinsDiariosTable)
    .where(and(eq(checkinsDiariosTable.clienteId, c.id), gte(checkinsDiariosTable.fecha, hace14)));
  // Con menos de 4 registros en 2 semanas no se puede juzgar el cumplimiento.
  let cumplimientoComidas: number | null = null;
  let cumplimientoEjercicio: number | null = null;
  if (checkins.length >= 4) {
    const porDia = c.comidasAlDia || 5;
    const ratios = checkins.map((k) => Math.min((Array.isArray(k.comidas) ? k.comidas.length : 0) / porDia, 1));
    // Promedio de los días que registró (no se castigan los días sin registro).
    cumplimientoComidas = ratios.reduce((s, r) => s + r, 0) / ratios.length;
    const diasEntreno = checkins.filter((k) => Array.isArray(k.ejercicios) && k.ejercicios.length > 0).length;
    cumplimientoEjercicio = Math.min(diasEntreno / ((c.diasDisponibles || 3) * 2), 1);
  }

  const animo = await db
    .select({ sueno: checkinsEmoccionalesTable.horasSueno, energia: checkinsEmoccionalesTable.nivelEnergia })
    .from(checkinsEmoccionalesTable)
    .where(and(eq(checkinsEmoccionalesTable.clienteId, c.id), gte(checkinsEmoccionalesTable.fecha, hace14)));
  const prom = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
  return {
    tendenciaPeso,
    cintura,
    cumplimientoComidas,
    cumplimientoEjercicio,
    suenoPromedio: animo.length >= 3 ? prom(animo.map((a) => a.sueno)) : null,
    energiaPromedio: animo.length >= 3 ? prom(animo.map((a) => a.energia)) : null,
  };
}

async function reglasDelCoach(c: Cliente) {
  if (!c.coachId) return { nutricion: "", entrenamiento: "" };
  const [f] = await db
    .select({ n: coachesTable.reglasNutricion, e: coachesTable.reglasEntrenamiento })
    .from(coachesTable)
    .where(eq(coachesTable.usuarioId, c.coachId))
    .limit(1);
  return { nutricion: f?.n?.trim() ?? "", entrenamiento: f?.e?.trim() ?? "" };
}

function lineasResultados(r: DatosResultados): string[] {
  const out: string[] = [];
  if (r.tendenciaPeso) {
    const t = r.tendenciaPeso;
    out.push(`Peso: de ${t.desdeKg} a ${t.hastaKg} kg en ${t.semanas} semanas (${t.porcentajeSemanal >= 0 ? "+" : ""}${t.porcentajeSemanal.toFixed(2)} % por semana).`);
  }
  if (r.cintura) out.push(`Cintura: de ${r.cintura.desdeCm} a ${r.cintura.hastaCm} cm.`);
  if (r.cumplimientoComidas !== null) out.push(`Cumplió el ${pct(r.cumplimientoComidas)} de sus comidas en 2 semanas.`);
  if (r.cumplimientoEjercicio !== null) out.push(`Entrenó el ${pct(r.cumplimientoEjercicio)} de los días previstos en 2 semanas.`);
  if (r.suenoPromedio !== null) out.push(`Duerme en promedio ${r.suenoPromedio.toFixed(1)} h; energía ${r.energiaPromedio?.toFixed(1)} de 5.`);
  return out;
}

// ── Nutrición ───────────────────────────────────────────────────────────────

export interface AnalisisNutricion {
  metas: Metas | null;
  objetivo: Objetivo;
  simplificar: boolean;
  resumen: string[]; // para el coach
  bloquePrompt: string; // para la IA
  reglasCoach: string;
}

export async function analizarNutricion(c: Cliente, semanaInicio: string): Promise<AnalisisNutricion> {
  const objetivo = objetivoDe(c.objetivoPrincipal || c.objetivo);
  const f = FACTOR_OBJETIVO[objetivo];
  const resultados = await resultadosRecientes(c);
  const reglas = await reglasDelCoach(c);
  const resumen: string[] = [];
  let simplificar = false;

  // Plan anterior (para continuidad): promedio de calorías de la última semana con plan.
  const previos = await db
    .select({ semana: planesComidaTable.semanaInicio, kcal: planesComidaTable.caloriasTotal })
    .from(planesComidaTable)
    .where(and(eq(planesComidaTable.clienteId, c.id), lt(planesComidaTable.semanaInicio, semanaInicio)))
    .orderBy(desc(planesComidaTable.semanaInicio))
    .limit(14);
  const ultimaSemana = previos[0]?.semana;
  const kcalPrevias = previos.filter((p) => p.semana === ultimaSemana && p.kcal > 0).map((p) => p.kcal);
  const kcalAnterior = kcalPrevias.length ? kcalPrevias.reduce((s, k) => s + k, 0) / kcalPrevias.length : null;

  let metas: Metas | null = null;
  if (c.peso && c.altura) {
    const edad = edadDe(c) ?? 30;
    const sexo = quitarAcentos(c.sexo ?? "");
    const ajusteSexo = sexo.startsWith("m") ? 5 : sexo.startsWith("f") ? -161 : -78;
    const tmb = 10 * c.peso + 6.25 * c.altura - 5 * edad + ajusteSexo;
    const formula = tmb * factorActividad(c.diasDisponibles) * f.kcal;
    const minimo = sexo.startsWith("m") ? 1500 : 1200;

    let kcal = kcalAnterior ?? formula;
    const t = resultados.tendenciaPeso?.porcentajeSemanal ?? null;
    const adh = resultados.cumplimientoComidas;
    const bajando = objetivo === "perdida" || objetivo === "definicion" || objetivo === "recomposicion";

    if (adh !== null && adh < 0.7) {
      simplificar = true;
      resumen.push(`Cumplió solo el ${pct(adh)} de sus comidas: se mantienen las calorías y el menú se simplifica para que lo pueda seguir.`);
    } else if (bajando && t !== null && t < -1) {
      kcal *= 1.075;
      resumen.push(`Baja más de 1 % por semana (${t.toFixed(2)} %): se suben 7.5 % las calorías para cuidar el músculo.`);
    } else if (bajando && t !== null && t > -0.25 && (adh === null || adh >= 0.8)) {
      kcal *= 0.925;
      resumen.push(`No baja de peso pese a cumplir: se bajan 7.5 % las calorías.`);
    } else if (objetivo === "ganancia" && t !== null && t < 0.1 && (adh === null || adh >= 0.8)) {
      kcal *= 1.05;
      resumen.push(`No sube de peso pese a cumplir: se suben 5 % las calorías.`);
    } else if (objetivo === "ganancia" && t !== null && t > 0.5) {
      kcal *= 0.95;
      resumen.push(`Sube más de 0.5 % por semana: se bajan 5 % las calorías para ganar menos grasa.`);
    } else if (objetivo === "mantenimiento" && t !== null && Math.abs(t) > 0.5) {
      kcal *= t > 0 ? 0.95 : 1.05;
      resumen.push(`Su peso cambia más de lo esperado para mantenimiento: se ajustan 5 % las calorías.`);
    } else if (kcalAnterior && t !== null) {
      resumen.push(`Va según lo esperado: se mantienen las calorías.`);
    }

    // Nunca más de 15 % lejos de lo calculado, ni por debajo del mínimo seguro.
    kcal = Math.min(Math.max(kcal, formula * 0.85, minimo), formula * 1.15);
    kcal = redondear(kcal, 10);

    const imc = c.peso / (c.altura / 100) ** 2;
    const pesoParaProteina = imc >= 30 ? c.pesoMeta || 25 * (c.altura / 100) ** 2 : c.peso;
    const proteinaG = redondear(pesoParaProteina * f.proteinaKg);
    const keto = /keto/.test(quitarAcentos(c.tipoAlimentacion ?? ""));
    let grasaG = redondear((kcal * 0.28) / 9);
    let carbosG = redondear((kcal - proteinaG * 4 - grasaG * 9) / 4);
    if (keto) {
      carbosG = 40;
      grasaG = redondear((kcal - proteinaG * 4 - carbosG * 4) / 9);
    } else if (carbosG < 50) {
      carbosG = 50;
    }
    metas = { calorias: kcal, proteinaG, carbosG, grasaG };
    resumen.unshift(
      `Metas: ${kcal} kcal, ${proteinaG} g proteína, ${carbosG} g carbohidratos, ${grasaG} g grasa (Mifflin-St Jeor, ${f.nombre}, ${c.diasDisponibles ?? 3} días de entreno).`,
    );
  } else {
    resumen.push("Faltan peso o altura en la ficha: la IA estimará las calorías. Complétalos para metas exactas.");
  }
  if (!resultados.tendenciaPeso) resumen.push("Sin suficientes registros de peso (al menos 2 en 10 días): no se pudo evaluar el avance.");
  if (reglas.nutricion) resumen.push("Se aplicaron tus reglas de nutrición.");

  const r = lineasResultados(resultados);
  const bloquePrompt = [
    metas
      ? `METAS DIARIAS (calculadas por la app; respétalas con ±5 %): ${metas.calorias} kcal | proteína ${metas.proteinaG} g | carbohidratos ${metas.carbosG} g | grasas ${metas.grasaG} g.`
      : `METAS: calcula calorías y macros con Mifflin-St Jeor según su objetivo (${f.nombre}).`,
    r.length ? `RESULTADOS RECIENTES:\n- ${r.join("\n- ")}` : "",
    simplificar ? "CUMPLIMIENTO BAJO: usa comidas muy sencillas, de pocos ingredientes, y repite 2 o 3 desayunos y cenas durante la semana." : "",
  ].filter(Boolean).join("\n");

  return { metas, objetivo, simplificar, resumen, bloquePrompt, reglasCoach: reglas.nutricion };
}

/** Ajusta las porciones de cada día a la meta de calorías (sin IA) y recalcula los totales. */
export function ajustarAMetas(dias: any[], metas: Metas | null): any[] {
  return (Array.isArray(dias) ? dias : []).map((d) => {
    const comidas = Array.isArray(d?.comidas) ? d.comidas : [];
    const total = comidas.reduce((s: number, c: any) => s + (Number(c?.calorias) || 0), 0);
    let factor = 1;
    if (metas && total > 0) {
      const f = metas.calorias / total;
      // Solo se corrige si la diferencia es razonable; si la IA se fue muy lejos, se deja para que el coach lo vea.
      if (f >= 0.75 && f <= 1.3 && Math.abs(f - 1) > 0.03) factor = f;
    }
    const escalar = (n: unknown, paso = 1) => redondear((Number(n) || 0) * factor, paso);
    const nuevas = comidas.map((c: any) =>
      factor === 1
        ? c
        : {
            ...c,
            calorias: escalar(c.calorias),
            proteinas: escalar(c.proteinas),
            carbohidratos: escalar(c.carbohidratos),
            grasas: escalar(c.grasas),
            ingredientes: Array.isArray(c.ingredientes)
              ? c.ingredientes.map((i: any) => ({ ...i, gramos: Math.max(redondear((Number(i?.gramos) || 0) * factor, 5), 5) }))
              : c.ingredientes,
          },
    );
    const caloriasTotal = nuevas.reduce((s: number, c: any) => s + (Number(c?.calorias) || 0), 0);
    return { ...d, comidas: nuevas, caloriasTotal };
  });
}

// ── Rutinas ─────────────────────────────────────────────────────────────────

export interface AnalisisRutina { resumen: string[]; bloquePrompt: string; reglasCoach: string }

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export async function analizarRutina(c: Cliente, semanaInicio: string): Promise<AnalisisRutina> {
  const resultados = await resultadosRecientes(c);
  const reglas = await reglasDelCoach(c);
  const resumen: string[] = [];
  const indicaciones: string[] = [];

  const previas = await db
    .select({ semana: rutinasTable.semanaInicio, dia: rutinasTable.diaSemana, ejercicios: rutinasTable.ejercicios })
    .from(rutinasTable)
    .where(and(eq(rutinasTable.clienteId, c.id), lt(rutinasTable.semanaInicio, semanaInicio)))
    .orderBy(desc(rutinasTable.semanaInicio), rutinasTable.diaSemana)
    .limit(60);
  const semanasPrevias = [...new Set(previas.map((p) => p.semana))];
  const ultima = previas.filter((p) => p.semana === semanasPrevias[0]);
  const adh = resultados.cumplimientoEjercicio;

  // Semana de descarga cada 5 semanas de entrenamiento seguidas.
  const descarga = semanasPrevias.length >= 4 && (semanasPrevias.length + 1) % 5 === 0;
  if (descarga) {
    indicaciones.push("SEMANA DE DESCARGA: mismos ejercicios que la semana anterior con ~40 % menos series e intensidad moderada.");
    resumen.push(`Lleva ${semanasPrevias.length} semanas entrenando: esta es semana de descarga para recuperarse.`);
  } else if (adh !== null && adh < 0.6) {
    indicaciones.push("CUMPLIMIENTO BAJO: reduce el volumen ~20 % (menos series o un ejercicio menos por día) y usa ejercicios sencillos.");
    resumen.push(`Entrenó solo el ${pct(adh)} de los días: se baja el volumen para que la pueda cumplir.`);
  } else if (ultima.length) {
    indicaciones.push("PROGRESIÓN: conserva la mayoría de los ejercicios de la semana anterior y súbeles 1-2 repeticiones o un 2.5-5 % de carga; cambia solo 1 o 2 ejercicios para variar.");
    resumen.push(adh !== null ? `Entrenó el ${pct(adh)} de los días: se aplica progresión (más repeticiones o carga).` : "Se aplica progresión sobre la rutina anterior.");
  }
  if ((resultados.suenoPromedio !== null && resultados.suenoPromedio < 6) || (resultados.energiaPromedio !== null && resultados.energiaPromedio <= 2)) {
    indicaciones.push("RECUPERACIÓN BAJA (poco sueño o energía): no subas la intensidad esta semana.");
    resumen.push("Duerme poco o tiene energía baja: no se sube la intensidad.");
  }
  if (c.condicionesMedicas?.trim()) resumen.push("Tiene condiciones médicas: la rutina se arma de forma conservadora.");
  if (reglas.entrenamiento) resumen.push("Se aplicaron tus reglas de entrenamiento.");
  if (!ultima.length && adh === null) resumen.push("Primera rutina o sin registros: se arma con los datos de la ficha.");

  const anterior = ultima
    .filter((d) => Array.isArray(d.ejercicios) && (d.ejercicios as any[]).length)
    .map((d) => `${DIAS[d.dia] ?? d.dia}: ${(d.ejercicios as any[]).map((e) => `${e?.nombre} ${e?.series}x${e?.repeticiones}`).join(", ")}`)
    .join("\n")
    .slice(0, 1500);

  const r = lineasResultados(resultados);
  const bloquePrompt = [
    r.length ? `RESULTADOS RECIENTES:\n- ${r.join("\n- ")}` : "",
    anterior ? `RUTINA DE LA SEMANA ANTERIOR:\n${anterior}` : "",
    indicaciones.length ? `INDICACIONES:\n- ${indicaciones.join("\n- ")}` : "",
  ].filter(Boolean).join("\n");

  return { resumen, bloquePrompt, reglasCoach: reglas.entrenamiento };
}

export async function clienteCompleto(id: number): Promise<Cliente | undefined> {
  const [c] = await db.select().from(usuariosTable).where(eq(usuariosTable.id, id)).limit(1);
  return c;
}

export { edadDe };
