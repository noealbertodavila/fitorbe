import { localDateStr } from "../lib/date-mt";
import { Router } from "express";
import {
  db,
  rutinasTable,
  planesComidaTable,
  checkinsDiariosTable,
  checkinsEmoccionalesTable,
} from "@workspace/db";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// 0=Mon...6=Sun
function getDiaSemana(date: Date): number {
  return (date.getDay() + 6) % 7;
}

// Returns "YYYY-MM-DD" for the Monday of the given date's week
function getSemanaInicio(date: Date): string {
  const d = new Date(date);
  const diff = getDiaSemana(d);
  d.setDate(d.getDate() - diff);
  return localDateStr(d);
}

function toDateStr(date: Date): string {
  return localDateStr(date);
}

// Derive a short routine name from exercise muscle groups
function deriveRutinaNombre(ejercicios: any[]): string {
  if (!Array.isArray(ejercicios) || ejercicios.length === 0) return "Entrenamiento";
  const grupos = [...new Set(
    ejercicios
      .map(e => {
        const g = String(e.grupoMuscular || "").split(/[/,·\-]/).map(s => s.trim()).filter(Boolean);
        return g[0] || "";
      })
      .filter(Boolean)
  )].slice(0, 2);
  return grupos.length > 0 ? grupos.join(" / ") : "Entrenamiento";
}

// Determine estado for a day
function calcEstado(
  fechaStr: string,
  hoyStr: string,
  tieneRutina: boolean,
  porcentaje: number | null
): string {
  if (fechaStr > hoyStr) return "futuro";
  if (fechaStr === hoyStr) {
    if (tieneRutina && porcentaje !== null && porcentaje >= 80) return "completado";
    if (tieneRutina && porcentaje !== null && porcentaje >= 40) return "parcial";
    return "hoy";
  }
  // Past day
  if (!tieneRutina) return "descanso";
  if (porcentaje !== null && porcentaje >= 80) return "completado";
  if (porcentaje !== null && porcentaje >= 40) return "parcial";
  return "fallado";
}

// GET /api/calendario/semana/:clienteId?semana=2026-05-05  (Monday date)
router.get("/calendario/semana/:clienteId", requireAuth, async (req, res) => {
  const clienteId = parseInt(String(req.params.clienteId));
  if (isNaN(clienteId)) { res.status(400).json({ error: "clienteId inválido" }); return; }

  const semanaParam = String(req.query.semana || "");
  const semanaInicio = semanaParam.match(/^\d{4}-\d{2}-\d{2}$/)
    ? semanaParam
    : getSemanaInicio(new Date());

  // Build the 7 days of the week
  const dias7: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(`${semanaInicio}T00:00:00`);
    d.setDate(d.getDate() + i);
    dias7.push(d);
  }

  const fechaInicio = toDateStr(dias7[0]);
  const fechaFin = toDateStr(dias7[6]);
  const hoyStr = toDateStr(new Date());

  const [rutinas, planes, checkins, emocionales] = await Promise.all([
    db.select().from(rutinasTable).where(
      and(
        eq(rutinasTable.clienteId, clienteId),
        eq(rutinasTable.semanaInicio, semanaInicio)
      )
    ),
    db.select().from(planesComidaTable).where(
      and(
        eq(planesComidaTable.clienteId, clienteId),
        eq(planesComidaTable.semanaInicio, semanaInicio)
      )
    ),
    db.select().from(checkinsDiariosTable).where(
      and(
        eq(checkinsDiariosTable.clienteId, clienteId),
        gte(checkinsDiariosTable.fecha, fechaInicio),
        lte(checkinsDiariosTable.fecha, fechaFin)
      )
    ),
    db.select().from(checkinsEmoccionalesTable).where(
      and(
        eq(checkinsEmoccionalesTable.clienteId, clienteId),
        gte(checkinsEmoccionalesTable.fecha, fechaInicio),
        lte(checkinsEmoccionalesTable.fecha, fechaFin)
      )
    ),
  ]);

  const rutinaMap = new Map<number, typeof rutinas[0]>();
  rutinas.forEach(r => rutinaMap.set(r.diaSemana, r));

  const planMap = new Map<number, typeof planes[0]>();
  planes.forEach(p => planMap.set(p.diaSemana, p));

  const checkinMap = new Map<string, typeof checkins[0]>();
  checkins.forEach(c => checkinMap.set(c.fecha, c));

  const emocionalMap = new Map<string, typeof emocionales[0]>();
  emocionales.forEach(e => emocionalMap.set(e.fecha, e));

  const result = dias7.map((date, idx) => {
    const fechaStr = toDateStr(date);
    const diaSemana = idx; // 0=Mon...6=Sun

    const rutina = rutinaMap.get(diaSemana);
    const plan = planMap.get(diaSemana);
    const checkin = checkinMap.get(fechaStr);
    const emocional = emocionalMap.get(fechaStr);

    const tieneRutina = !!rutina;
    const tieneNutricion = !!plan;
    const tieneCheckin = !!checkin;
    const tieneEmocional = !!emocional;
    const porcentaje = checkin?.porcentajeAdherencia ?? null;
    const ejercicios = rutina ? (rutina.ejercicios as any[]) : [];

    return {
      fecha: fechaStr,
      diaSemana,
      tieneRutina,
      tieneNutricion,
      tieneCheckin,
      tieneEmocional,
      porcentajeAdherencia: porcentaje,
      estado: calcEstado(fechaStr, hoyStr, tieneRutina, porcentaje),
      rutinaNombre: tieneRutina ? deriveRutinaNombre(ejercicios) : null,
      caloriasTotal: plan?.caloriasTotal ?? null,
    };
  });

  res.json(result);
});

// GET /api/calendario/mes/:clienteId?mes=2026-05  (kept for legacy)
router.get("/calendario/mes/:clienteId", requireAuth, async (req, res) => {
  const clienteId = parseInt(String(req.params.clienteId));
  if (isNaN(clienteId)) { res.status(400).json({ error: "clienteId inválido" }); return; }

  const mesParam = String(req.query.mes || "");
  const [year, month] = mesParam.split("-").map(Number);
  if (!year || !month) { res.status(400).json({ error: "Parámetro mes inválido, usar YYYY-MM" }); return; }

  const primerDia = new Date(year, month - 1, 1);
  const ultimoDia = new Date(year, month, 0);
  const fechaInicio = toDateStr(primerDia);
  const fechaFin = toDateStr(ultimoDia);

  const semanas = new Set<string>();
  for (let d = new Date(primerDia); d <= ultimoDia; d.setDate(d.getDate() + 1)) {
    semanas.add(getSemanaInicio(new Date(d)));
  }
  const semanasArr = Array.from(semanas);

  const [rutinas, planes, checkins, emocionales] = await Promise.all([
    db.select().from(rutinasTable).where(
      and(eq(rutinasTable.clienteId, clienteId), inArray(rutinasTable.semanaInicio, semanasArr))
    ),
    db.select().from(planesComidaTable).where(
      and(eq(planesComidaTable.clienteId, clienteId), inArray(planesComidaTable.semanaInicio, semanasArr))
    ),
    db.select().from(checkinsDiariosTable).where(
      and(
        eq(checkinsDiariosTable.clienteId, clienteId),
        gte(checkinsDiariosTable.fecha, fechaInicio),
        lte(checkinsDiariosTable.fecha, fechaFin)
      )
    ),
    db.select().from(checkinsEmoccionalesTable).where(
      and(
        eq(checkinsEmoccionalesTable.clienteId, clienteId),
        gte(checkinsEmoccionalesTable.fecha, fechaInicio),
        lte(checkinsEmoccionalesTable.fecha, fechaFin)
      )
    ),
  ]);

  const rutinaMap = new Map<string, typeof rutinas[0]>();
  rutinas.forEach(r => rutinaMap.set(`${r.semanaInicio}:${r.diaSemana}`, r));
  const planMap = new Map<string, typeof planes[0]>();
  planes.forEach(p => planMap.set(`${p.semanaInicio}:${p.diaSemana}`, p));
  const checkinMap = new Map<string, typeof checkins[0]>();
  checkins.forEach(c => checkinMap.set(c.fecha, c));
  const emocionalMap = new Map<string, typeof emocionales[0]>();
  emocionales.forEach(e => emocionalMap.set(e.fecha, e));

  const hoyStr = toDateStr(new Date());
  const dias = [];
  for (let d = new Date(primerDia); d <= ultimoDia; d.setDate(d.getDate() + 1)) {
    const fechaStr = toDateStr(new Date(d));
    const semana = getSemanaInicio(new Date(d));
    const diaSemana = getDiaSemana(new Date(d));
    const rutina = rutinaMap.get(`${semana}:${diaSemana}`);
    const plan = planMap.get(`${semana}:${diaSemana}`);
    const checkin = checkinMap.get(fechaStr);
    const emocional = emocionalMap.get(fechaStr);
    const tieneRutina = !!rutina;
    const tieneNutricion = !!plan;
    const porcentaje = checkin?.porcentajeAdherencia ?? null;

    dias.push({
      fecha: fechaStr,
      tieneRutina,
      tieneNutricion,
      tieneCheckin: !!checkin,
      tieneEmocional: !!emocional,
      porcentajeAdherencia: porcentaje,
      estado: calcEstado(fechaStr, hoyStr, tieneRutina, porcentaje),
      rutinaNombre: tieneRutina ? deriveRutinaNombre(rutina!.ejercicios as any[]) : null,
      caloriasTotal: plan?.caloriasTotal ?? null,
    });
  }

  res.json(dias);
});

// GET /api/calendario/dia/:clienteId?fecha=2026-05-15
router.get("/calendario/dia/:clienteId", requireAuth, async (req, res) => {
  const clienteId = parseInt(String(req.params.clienteId));
  if (isNaN(clienteId)) { res.status(400).json({ error: "clienteId inválido" }); return; }

  const fecha = String(req.query.fecha || "");
  if (!fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
    res.status(400).json({ error: "Parámetro fecha inválido, usar YYYY-MM-DD" });
    return;
  }

  const date = new Date(`${fecha}T00:00:00`);
  const semana = getSemanaInicio(date);
  const diaSemana = getDiaSemana(date);

  const [rutinas, planes, checkins, emocionales] = await Promise.all([
    db.select().from(rutinasTable).where(
      and(
        eq(rutinasTable.clienteId, clienteId),
        eq(rutinasTable.semanaInicio, semana),
        eq(rutinasTable.diaSemana, diaSemana)
      )
    ).limit(1),
    db.select().from(planesComidaTable).where(
      and(
        eq(planesComidaTable.clienteId, clienteId),
        eq(planesComidaTable.semanaInicio, semana),
        eq(planesComidaTable.diaSemana, diaSemana)
      )
    ).limit(1),
    db.select().from(checkinsDiariosTable).where(
      and(
        eq(checkinsDiariosTable.clienteId, clienteId),
        eq(checkinsDiariosTable.fecha, fecha)
      )
    ).limit(1),
    db.select().from(checkinsEmoccionalesTable).where(
      and(
        eq(checkinsEmoccionalesTable.clienteId, clienteId),
        eq(checkinsEmoccionalesTable.fecha, fecha)
      )
    ).limit(1),
  ]);

  const rutina = rutinas[0] || null;
  const plan = planes[0] || null;
  const checkin = checkins[0] || null;
  const emocional = emocionales[0] || null;
  const ejercicios = rutina ? (rutina.ejercicios as any[]) : [];

  // Derive macros from comidas
  const comidas = plan ? (plan.comidas as any[]) : [];
  let macros = { proteinas: 0, carbohidratos: 0, grasas: 0 };
  comidas.forEach((c: any) => {
    macros.proteinas += Number(c.proteinas || c.protein || 0);
    macros.carbohidratos += Number(c.carbohidratos || c.carbs || 0);
    macros.grasas += Number(c.grasas || c.fat || 0);
  });

  res.json({
    fecha,
    rutina: {
      existe: !!rutina,
      nombre: rutina ? deriveRutinaNombre(ejercicios) : null,
      notas: rutina?.notas || null,
      ejercicios,
    },
    nutricion: {
      existe: !!plan,
      caloriasTotal: plan?.caloriasTotal || null,
      macros: plan ? macros : null,
      notas: plan?.notas || null,
      comidas,
    },
    checkinEmocional: {
      realizado: !!emocional,
      estadoAnimo: emocional?.estadoAnimo || null,
      nivelEnergia: emocional?.nivelEnergia || null,
      horasSueno: emocional?.horasSueno || null,
      factores: emocional?.factores || null,
      notas: emocional?.notas || null,
    },
    checkinDiario: {
      realizado: !!checkin,
      porcentajeAdherencia: checkin?.porcentajeAdherencia ?? null,
    },
  });
});

export default router;
