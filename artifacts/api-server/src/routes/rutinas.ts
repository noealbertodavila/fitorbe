import { Router } from "express";
import { errorIA } from "../lib/error-ia";
import { db, rutinasTable, usuariosTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireRol } from "../middlewares/auth";
import { coachDelCliente } from "../lib/apoyo";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { textoDeRespuesta } from "../lib/texto-ia";
import { MODELO_IA, puedeGenerar, registrarUso } from "../lib/ia-uso";
import { analizarRutina, clienteCompleto, edadDe } from "../lib/evaluacion-ia";
import { esLunes, sinMarcas } from "../lib/semanas";

const router = Router();

// List all weeks that have rutinas for a client
router.get("/rutinas/semanas/:clienteId", requireAuth, async (req, res) => {
  const clienteId = parseInt(String(req.params.clienteId));
  const rows = await db
    .select({ semanaInicio: rutinasTable.semanaInicio, aprobada: rutinasTable.aprobada })
    .from(rutinasTable)
    .where(and(eq(rutinasTable.clienteId, clienteId), (req as any).usuario?.rol === "cliente" ? eq(rutinasTable.aprobada, true) : undefined))
    .orderBy(desc(rutinasTable.semanaInicio));

  const seen = new Set<string>();
  const semanas = rows
    .filter(r => {
      if (seen.has(r.semanaInicio)) return false;
      seen.add(r.semanaInicio);
      return true;
    })
    .map(r => ({ semanaInicio: r.semanaInicio, aprobada: r.aprobada }));

  res.json(semanas);
});

router.get("/rutinas/:clienteId/:semanaInicio", requireAuth, async (req, res) => {
  const clienteId = parseInt(String(req.params.clienteId));
  const semanaInicio = String(req.params.semanaInicio);
  const rows = await db
    .select()
    .from(rutinasTable)
    .where(and(eq(rutinasTable.clienteId, clienteId), eq(rutinasTable.semanaInicio, semanaInicio), (req as any).usuario?.rol === "cliente" ? eq(rutinasTable.aprobada, true) : undefined))
    .orderBy(rutinasTable.diaSemana);
  res.json(rows);
});

// Alias for legacy calls using singular form /api/rutina/:clienteId/:semanaInicio
router.get("/rutina/:clienteId/:semanaInicio", requireAuth, async (req, res) => {
  const clienteId = parseInt(String(req.params.clienteId));
  const semanaInicio = String(req.params.semanaInicio);
  const rows = await db
    .select()
    .from(rutinasTable)
    .where(and(eq(rutinasTable.clienteId, clienteId), eq(rutinasTable.semanaInicio, semanaInicio), (req as any).usuario?.rol === "cliente" ? eq(rutinasTable.aprobada, true) : undefined))
    .orderBy(rutinasTable.diaSemana);
  res.json(rows);
});

router.post("/rutinas", requireAuth, requireRol("coach"), async (req, res) => {
  const me = (req as any).usuario;
  const { clienteId, semanaInicio, diaSemana, ejercicios, aprobada, notas } = req.body;

  await db.delete(rutinasTable).where(
    and(eq(rutinasTable.clienteId, clienteId), eq(rutinasTable.semanaInicio, semanaInicio), eq(rutinasTable.diaSemana, diaSemana))
  );

  const [created] = await db.insert(rutinasTable).values({
    clienteId, coachId: me.id, semanaInicio, diaSemana, ejercicios, aprobada: aprobada ?? false, notas,
  }).returning();
  res.status(201).json(created);
});

// Copiar la rutina de una semana a otra, sin usar la IA (no cuesta créditos).
// Reemplaza lo que hubiera en la semana de destino.
router.post("/rutinas/copiar", requireAuth, requireRol("coach"), async (req, res) => {
  const me = (req as any).usuario;
  const clienteId = parseInt(String(req.body?.clienteId));
  const { desde, hasta } = req.body ?? {};
  const publicar = req.body?.publicar !== false;
  if (isNaN(clienteId) || !esLunes(desde) || !esLunes(hasta)) {
    res.status(400).json({ error: "Elige una semana válida (empieza en lunes)" });
    return;
  }
  if (desde === hasta) {
    res.status(400).json({ error: "Elige una semana distinta a la de la rutina" });
    return;
  }
  const origen = await db.select().from(rutinasTable)
    .where(and(eq(rutinasTable.clienteId, clienteId), eq(rutinasTable.semanaInicio, desde)));
  if (!origen.length) {
    res.status(404).json({ error: "Esa semana no tiene rutina para copiar" });
    return;
  }
  await db.transaction(async (tx) => {
    await tx.delete(rutinasTable).where(and(eq(rutinasTable.clienteId, clienteId), eq(rutinasTable.semanaInicio, hasta)));
    await tx.insert(rutinasTable).values(origen.map((d) => ({
      clienteId, coachId: me.id, semanaInicio: hasta, diaSemana: d.diaSemana,
      ejercicios: sinMarcas(d.ejercicios), aprobada: publicar, notas: d.notas,
    })));
  });
  res.status(201).json({ copiados: origen.length, semanaInicio: hasta, publicado: publicar });
});

// Rutina con IA — devuelve un BORRADOR. La app evalúa resultados y decide progresión/descarga;
// la IA arma los ejercicios. Cuenta 1 generación del mes. Con soloDia (0-6) genera un solo día.
router.post("/rutinas/generar-ai", requireAuth, requireRol("coach"), async (req, res) => {
  const me = (req as any).usuario;
  const { clienteId, semanaInicio, organizacion } = req.body ?? {};
  const soloDia = Number.isInteger(req.body?.soloDia) && req.body.soloDia >= 0 && req.body.soloDia <= 6 ? (req.body.soloDia as number) : null;

  if (!clienteId) { res.status(400).json({ error: "Se requiere clienteId" }); return; }
  const c = await clienteCompleto(Number(clienteId));
  if (!c) { res.status(404).json({ error: "Cliente no encontrado" }); return; }

  const permiso = await puedeGenerar(me.id);
  if (!permiso.ok) { res.status(permiso.status).json({ error: permiso.error }); return; }

  const edad = edadDe(c);
  const imc = c.peso && c.altura ? (c.peso / (c.altura / 100) ** 2).toFixed(1) : null;
  const diasEntrenamiento = Math.min(Math.max(c.diasDisponibles || 4, 1), 7);
  const diasDescanso = 7 - diasEntrenamiento;
  const duracionSesion = c.duracionSesion || "60min";
  const lugar = c.lugarEntrenamiento || "Gym";
  const equipamiento = c.equipamiento || "equipamiento completo";
  const analisis = await analizarRutina(c, String(semanaInicio ?? ""));
  const DIAS_N = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const salud = [c.condicionesMedicas, c.lesiones ? `lesiones: ${c.lesiones}` : "", c.zonasEvitar ? `evitar: ${c.zonasEvitar}` : ""]
    .filter((x) => x && String(x).trim()).join("; ");

  const organizacionTexto =
    organizacion === "grupo_muscular" ? "Divide por grupos musculares (p. ej. pecho+tríceps, espalda+bíceps, piernas+glúteos, hombros+core)."
    : organizacion === "dia_semana" ? "Varía el tipo de entrenamiento cada día: fuerza, cardio, movilidad, funcional."
    : organizacion === "fullbody" ? "Cada día trabaja el cuerpo completo con ejercicios compuestos."
    : organizacion === "cardio_fuerza" ? "Alterna días de cardio (LISS o HIIT) con días de fuerza."
    : organizacion === "hiit" ? "Circuitos de alta intensidad por intervalos; indica trabajo/descanso (ej. 30s/15s) en las instrucciones."
    : "Estructura variada y equilibrada.";

  const prompt = `Eres entrenador personal certificado. Arma ${soloDia === null ? "la rutina semanal" : `la rutina del ${DIAS_N[soloDia]}`} de ${c.nombre}.

CLIENTE: ${c.sexo || "sexo no indicado"}, ${edad ? `${edad} años` : "edad no indicada"}, ${c.peso ? `${c.peso} kg` : "peso ?"}${imc ? `, IMC ${imc}` : ""}. Objetivo: ${c.objetivoPrincipal || c.objetivo || "fitness general"}. Nivel: ${c.nivelFitness || "intermedio"}.
Entrena ${diasEntrenamiento} días/semana, sesiones de ${duracionSesion} en ${lugar} con ${equipamiento}. Usa solo ejercicios posibles con ese equipo.
${salud ? `SALUD Y LESIONES: ${salud}. Sé conservador: evita lo que agrave estas condiciones, prioriza técnica y control, y no sustituye la indicación de su médico.` : ""}
${analisis.bloquePrompt}
ORGANIZACIÓN: ${organizacionTexto}
${analisis.reglasCoach ? `REGLAS DEL COACH (obligatorias; si contradicen algo, mandan estas):\n${analisis.reglasCoach}` : ""}

RESPONDE SOLO con JSON válido, sin texto ni markdown:
{"dias":[{"diaSemana":${soloDia ?? 0},"ejercicios":[{"nombre":"Sentadilla con barra","series":4,"repeticiones":"10-12","descanso":"90 seg","instrucciones":"Espalda recta, baja a 90°, sube exhalando.","videoUrl":null,"grupoMuscular":"Piernas","completado":false}]}]}

REGLAS:
- ${soloDia === null
    ? `Exactamente 7 días (diaSemana 0=Lunes … 6=Domingo): ${diasEntrenamiento} con ejercicios y ${diasDescanso} de descanso con "ejercicios":[]. Reparte los descansos entre sesiones.`
    : `Solo 1 día, diaSemana ${soloDia}, con ejercicios.`}
- Cada sesión cabe en ${duracionSesion} (calentamiento 10 min + ejercicios + enfriamiento 5 min)
- Instrucciones de máximo 15 palabras; videoUrl siempre null
- Intensidad acorde al nivel ${c.nivelFitness || "intermedio"}`;

  try {
    const message = await anthropic.messages.create({
      model: MODELO_IA,
      max_tokens: soloDia === null ? 6000 : 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const texto = textoDeRespuesta(message);
    if (!texto) { res.status(502).json({ error: "La IA no devolvió texto. Intenta de nuevo." }); return; }

    const raw = texto.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) { res.status(502).json({ error: "La IA no devolvió una rutina válida. Intenta de nuevo." }); return; }
    let rutina: any;
    try { rutina = JSON.parse(jsonMatch[0]); } catch { rutina = null; }
    if (!rutina?.dias || !Array.isArray(rutina.dias)) { res.status(502).json({ error: "La rutina generada está incompleta. Intenta de nuevo." }); return; }

    await registrarUso(me.id, "generacion");
    res.json({ dias: rutina.dias, semanaInicio, analisis: { resumen: analisis.resumen } });
  } catch (error: any) {
    req.log?.error({ error: error?.message }, "Error generando rutina con AI");
    { const e = errorIA(error, "la rutina"); res.status(e.status).json({ error: e.error }); }
  }
});

export default router;
