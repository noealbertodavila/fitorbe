import { Router } from "express";
import { errorIA } from "../lib/error-ia";
import { db, planesComidaTable, usuariosTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireRol } from "../middlewares/auth";
import { coachDelCliente } from "../lib/apoyo";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { textoDeRespuesta } from "../lib/texto-ia";
import { MODELO_IA, puedeGenerar, registrarUso } from "../lib/ia-uso";
import { analizarNutricion, ajustarAMetas, clienteCompleto, edadDe } from "../lib/evaluacion-ia";
import { esLunes, sinMarcas } from "../lib/semanas";

const router = Router();

router.get("/planes-comida/semanas/:clienteId", requireAuth, async (req, res) => {
  const clienteId = parseInt(String(req.params.clienteId));
  const rows = await db
    .select({ semanaInicio: planesComidaTable.semanaInicio, aprobada: planesComidaTable.aprobada })
    .from(planesComidaTable)
    .where(and(eq(planesComidaTable.clienteId, clienteId), (req as any).usuario?.rol === "cliente" ? eq(planesComidaTable.aprobada, true) : undefined))
    .orderBy(desc(planesComidaTable.semanaInicio));

  const seen = new Set<string>();
  const semanas = rows.filter(r => {
    if (seen.has(r.semanaInicio)) return false;
    seen.add(r.semanaInicio);
    return true;
  }).map(r => ({ semanaInicio: r.semanaInicio, aprobada: r.aprobada }));

  res.json(semanas);
});

router.get("/planes-comida/:clienteId/:semanaInicio", requireAuth, async (req, res) => {
  const clienteId = parseInt(String(req.params.clienteId));
  const semanaInicio = String(req.params.semanaInicio);
  const rows = await db.select().from(planesComidaTable)
    .where(and(eq(planesComidaTable.clienteId, clienteId), eq(planesComidaTable.semanaInicio, semanaInicio), (req as any).usuario?.rol === "cliente" ? eq(planesComidaTable.aprobada, true) : undefined))
    .orderBy(planesComidaTable.diaSemana);
  res.json(rows);
});

router.post("/planes-comida", requireAuth, requireRol("coach"), async (req, res) => {
  const me = (req as any).usuario;
  const { clienteId, semanaInicio, diaSemana, comidas, caloriasTotal, aprobada, notas } = req.body;

  await db.delete(planesComidaTable).where(
    and(eq(planesComidaTable.clienteId, clienteId), eq(planesComidaTable.semanaInicio, semanaInicio), eq(planesComidaTable.diaSemana, diaSemana))
  );

  const [created] = await db.insert(planesComidaTable).values({
    clienteId, coachId: me.id, semanaInicio, diaSemana, comidas, caloriasTotal: caloriasTotal || 0, aprobada: aprobada ?? false, notas,
  }).returning();
  res.status(201).json(created);
});

// Copiar el plan de una semana a otra, sin usar la IA (no cuesta créditos).
// Reemplaza lo que hubiera en la semana de destino.
router.post("/planes-comida/copiar", requireAuth, requireRol("coach"), async (req, res) => {
  const me = (req as any).usuario;
  const clienteId = parseInt(String(req.body?.clienteId));
  const { desde, hasta } = req.body ?? {};
  const publicar = req.body?.publicar !== false;
  if (isNaN(clienteId) || !esLunes(desde) || !esLunes(hasta)) {
    res.status(400).json({ error: "Elige una semana válida (empieza en lunes)" });
    return;
  }
  if (desde === hasta) {
    res.status(400).json({ error: "Elige una semana distinta a la del plan" });
    return;
  }
  const origen = await db.select().from(planesComidaTable)
    .where(and(eq(planesComidaTable.clienteId, clienteId), eq(planesComidaTable.semanaInicio, desde)));
  if (!origen.length) {
    res.status(404).json({ error: "Esa semana no tiene plan para copiar" });
    return;
  }
  await db.transaction(async (tx) => {
    await tx.delete(planesComidaTable).where(and(eq(planesComidaTable.clienteId, clienteId), eq(planesComidaTable.semanaInicio, hasta)));
    await tx.insert(planesComidaTable).values(origen.map((d) => ({
      clienteId, coachId: me.id, semanaInicio: hasta, diaSemana: d.diaSemana,
      comidas: sinMarcas(d.comidas), caloriasTotal: d.caloriasTotal, aprobada: publicar, notas: d.notas,
    })));
  });
  res.status(201).json({ copiados: origen.length, semanaInicio: hasta, publicado: publicar });
});

// Attempt to recover a truncated JSON by trimming to the last valid complete object
function repairTruncatedJson(raw: string): string | null {
  // Try as-is first
  try { JSON.parse(raw); return raw; } catch { /* continue */ }

  // Walk backwards finding the last } that closes the root object
  let depth = 0;
  let inString = false;
  let escaped = false;
  let lastValidClose = -1;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\" && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{" || ch === "[") depth++;
    if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) lastValidClose = i;
    }
  }

  if (lastValidClose > 0) {
    const truncated = raw.slice(0, lastValidClose + 1);
    try { JSON.parse(truncated); return truncated; } catch { /* continue */ }
  }

  // Try finding last complete day entry — trim to last complete "diaSemana" block
  const lastDayClose = raw.lastIndexOf('"caloriasTotal"');
  if (lastDayClose > 0) {
    // Find closing braces after caloriasTotal value
    const afterVal = raw.indexOf("}", lastDayClose);
    if (afterVal > 0) {
      const trimmed = raw.slice(0, afterVal + 1) + "]}";
      try { JSON.parse(trimmed); return trimmed; } catch { /* give up */ }
    }
  }

  return null;
}

// Plan de comida con IA — devuelve un BORRADOR (no se guarda hasta que el coach lo publica).
// La app evalúa al cliente y calcula las metas; la IA solo arma el menú. Cuenta 1 generación del mes.
// Con soloDia (0-6) genera un solo día (mucho más barato que la semana completa).
router.post("/planes-comida/generar-ai", requireAuth, requireRol("coach"), async (req, res) => {
  const me = (req as any).usuario;
  const { clienteId, semanaInicio } = req.body ?? {};
  const soloDia = Number.isInteger(req.body?.soloDia) && req.body.soloDia >= 0 && req.body.soloDia <= 6 ? (req.body.soloDia as number) : null;

  if (!clienteId) { res.status(400).json({ error: "Se requiere clienteId" }); return; }
  const c = await clienteCompleto(Number(clienteId));
  if (!c) { res.status(404).json({ error: "Cliente no encontrado" }); return; }

  const permiso = await puedeGenerar(me.id);
  if (!permiso.ok) { res.status(permiso.status).json({ error: permiso.error }); return; }

  const edad = edadDe(c);
  const numComidas = c.comidasAlDia && c.comidasAlDia >= 3 && c.comidasAlDia <= 6 ? c.comidasAlDia : 5;
  const comidasNombres: Record<number, string[]> = {
    3: ["Desayuno", "Almuerzo", "Cena"],
    4: ["Desayuno", "Almuerzo", "Merienda", "Cena"],
    5: ["Desayuno", "Media Mañana", "Almuerzo", "Merienda", "Cena"],
    6: ["Desayuno", "Media Mañana", "Almuerzo", "Merienda", "Cena", "Post-Entreno"],
  };
  const nombreComidas = comidasNombres[numComidas]!.join(", ");
  const analisis = await analizarNutricion(c, String(semanaInicio ?? ""));
  const DIAS_N = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const salud = [c.condicionesMedicas, c.medicamentos ? `medicamentos: ${c.medicamentos}` : ""].filter((x) => x && String(x).trim()).join("; ");

  const prompt = `Eres nutricionista deportivo. Arma ${soloDia === null ? "el menú de 7 días" : `el menú del ${DIAS_N[soloDia]}`} para ${c.nombre}.

${analisis.bloquePrompt}

CLIENTE: ${c.sexo || "sexo no indicado"}, ${edad ? `${edad} años` : "edad no indicada"}, ${c.peso ? `${c.peso} kg` : "peso ?"}, ${c.altura ? `${c.altura} cm` : "altura ?"}. Objetivo: ${c.objetivoPrincipal || c.objetivo || "salud general"}. Entrena ${c.diasDisponibles ?? "?"} días/semana.${c.pesoMeta ? ` Peso meta: ${c.pesoMeta} kg.` : ""}
Alimentación: ${c.tipoAlimentacion || "Omnívoro"}. Alergias: ${c.alergiasAlimentarias || "ninguna"}. No come: ${c.alimentosNoConsume || "nada"}. Cocina: ${c.cocinaEnCasa || "en casa"}. Presupuesto: ${c.presupuestoAlimentacion || "moderado"}.
Comidas por día: ${numComidas} (${nombreComidas}).
${salud ? `SALUD: ${salud}. Adapta el menú de forma conservadora (p. ej. carbohidratos de bajo índice glucémico con diabetes, poca sal con presión alta). No sustituye la indicación de su médico.` : ""}
${analisis.reglasCoach ? `REGLAS DEL COACH (obligatorias; si contradicen algo de abajo, mandan estas):\n${analisis.reglasCoach}` : ""}

RESPONDE SOLO con JSON válido, sin texto ni markdown:
{"dias":[{"diaSemana":${soloDia ?? 0},"comidas":[{"nombre":"Desayuno","hora":"7:00 AM","descripcion":"Avena con plátano","ingredientes":[{"nombre":"Avena","gramos":60},{"nombre":"Leche","gramos":200}],"calorias":420,"proteinas":18,"carbohidratos":65,"grasas":9,"completada":false}]}]}

REGLAS:
- ${soloDia === null ? "Exactamente 7 días, diaSemana 0=Lunes … 6=Domingo" : `Solo 1 día, diaSemana ${soloDia}`}; exactamente ${numComidas} comidas por día
- Máximo 4 ingredientes por comida, con gramos (carnes y granos en peso cocido)
- Calorías y macros de cada comida coherentes con sus gramos; la suma del día debe dar las metas
- Descripción de máximo 6 palabras
- Alimentos latinoamericanos de fácil acceso; varía entre días; respeta alergias y lo que no come`;

  try {
    const message = await anthropic.messages.create({
      model: MODELO_IA,
      max_tokens: soloDia === null ? 8000 : 1800,
      messages: [{ role: "user", content: prompt }],
    });

    const texto = textoDeRespuesta(message);
    if (!texto) { res.status(502).json({ error: "La IA no devolvió texto. Intenta de nuevo." }); return; }

    const raw = texto.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      req.log?.error({ raw: raw.slice(0, 300) }, "AI no devolvió JSON para nutrición");
      res.status(502).json({ error: "La IA no devolvió un plan válido. Intenta de nuevo." });
      return;
    }
    let plan: any;
    try {
      plan = JSON.parse(jsonMatch[0]);
    } catch {
      const repaired = repairTruncatedJson(jsonMatch[0]);
      try { plan = repaired ? JSON.parse(repaired) : null; } catch { plan = null; }
    }
    if (!plan?.dias || !Array.isArray(plan.dias)) {
      res.status(502).json({ error: "El plan generado está incompleto. Intenta de nuevo." });
      return;
    }

    await registrarUso(me.id, "generacion");
    // La app ajusta las porciones a la meta de calorías y recalcula los totales (sin IA).
    const dias = ajustarAMetas(plan.dias, analisis.metas);
    res.json({ dias, semanaInicio, analisis: { resumen: analisis.resumen, metas: analisis.metas } });
  } catch (error: any) {
    req.log?.error({ error: error?.message }, "Error generando plan de comidas con AI");
    { const e = errorIA(error, "el plan de comida"); res.status(e.status).json({ error: e.error }); }
  }
});

export default router;
