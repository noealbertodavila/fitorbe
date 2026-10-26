import { Router } from "express";
import { errorIA } from "../lib/error-ia";
import { db, planesComidaTable, usuariosTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireRol } from "../middlewares/auth";
import { coachDelCliente } from "../lib/apoyo";
import { anthropic } from "@workspace/integrations-anthropic-ai";

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

// Generate plan with AI — returns DRAFT (does not save to DB)
router.post("/planes-comida/generar-ai", requireAuth, requireRol("coach"), async (req, res) => {
  const { clienteId, semanaInicio } = req.body;

  if (!clienteId) { res.status(400).json({ error: "Se requiere clienteId" }); return; }

  const [c] = await db.select().from(usuariosTable).where(eq(usuariosTable.id, clienteId)).limit(1);
  if (!c) { res.status(404).json({ error: "Cliente no encontrado" }); return; }

  let edad = "";
  if (c.fechaNacimiento) {
    const diff = Date.now() - new Date(c.fechaNacimiento).getTime();
    edad = `${Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))} años`;
  }

  const numComidas = (c as any).comidasAlDia || 5;
  const comidasNombres: Record<number, string[]> = {
    3: ["Desayuno", "Almuerzo", "Cena"],
    4: ["Desayuno", "Almuerzo", "Merienda", "Cena"],
    5: ["Desayuno", "Media Mañana", "Almuerzo", "Merienda", "Cena"],
    6: ["Desayuno", "Media Mañana", "Almuerzo", "Merienda", "Cena", "Post-Entreno"],
  };
  const nombreComidas = (comidasNombres[numComidas] || comidasNombres[5]).join(", ");

  // Concise prompt — avoids per-ingredient macros to keep JSON small and valid
  const { coach } = await coachDelCliente(Number(clienteId));
  const prompt = `Eres ${coach}, coach de nutrición. Crea un plan de alimentación de 7 días para ${c.nombre}.

DATOS DEL CLIENTE:
- Sexo: ${(c as any).sexo || "No especificado"} | Edad: ${edad || "No especificada"}
- Peso: ${(c as any).peso ? `${(c as any).peso}kg` : "?"} | Altura: ${(c as any).altura ? `${(c as any).altura}cm` : "?"}
- Objetivo: ${(c as any).objetivoPrincipal || c.objetivo || "salud general"}
- Nivel: ${c.nivelFitness || "intermedio"}
- Tipo alimentación: ${(c as any).tipoAlimentacion || "Omnívoro"}
- Alergias: ${(c as any).alergiasAlimentarias || "ninguna"}
- No consume: ${(c as any).alimentosNoConsume || "nada"}
- Comidas/día: ${numComidas} (${nombreComidas})
- Cocina: ${(c as any).cocinaEnCasa || "En casa"}
- Presupuesto: ${(c as any).presupuestoAlimentacion || "Moderado"}

RESPONDE ÚNICAMENTE con JSON válido. Sin texto, sin markdown, sin backticks.

Estructura exacta (no agregues campos extra):
{"dias":[{"diaSemana":0,"comidas":[{"nombre":"Desayuno","hora":"7:00 AM","descripcion":"Avena con frutas y leche","ingredientes":[{"nombre":"Avena","gramos":80},{"nombre":"Leche","gramos":200},{"nombre":"Banano","gramos":100}],"calorias":420,"proteinas":18,"carbohidratos":65,"grasas":9,"completada":false}],"caloriasTotal":1900}]}

REGLAS:
- diaSemana: 0=Lunes … 6=Domingo. Exactamente 7 días
- Exactamente ${numComidas} comidas/día: ${nombreComidas}
- Máximo 4 ingredientes por comida (solo nombre y gramos, sin macros por ingrediente)
- Descripción máximo 8 palabras
- caloriasTotal = suma de calorías de todas las comidas del día
- Ajusta calorías al objetivo del cliente
- Alimentos latinoamericanos de fácil acceso
- Varía los alimentos cada día
- Respeta restricciones alimenticias`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") { res.status(500).json({ error: "Respuesta inesperada del AI" }); return; }

    // Clean response
    let raw = content.text.trim()
      .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();

    // Extract JSON object
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      req.log?.error({ raw: raw.slice(0, 300) }, "AI no devolvió JSON para nutrición");
      res.status(500).json({ error: "El AI no devolvió JSON válido. Intenta de nuevo." });
      return;
    }

    let jsonStr = jsonMatch[0];

    // Parse with repair fallback
    let plan: any;
    try {
      plan = JSON.parse(jsonStr);
    } catch (parseError: any) {
      req.log?.warn({ pos: parseError?.message, preview: jsonStr.slice(0, 400) }, "JSON truncado, intentando reparar");
      const repaired = repairTruncatedJson(jsonStr);
      if (!repaired) {
        res.status(500).json({ error: "El plan generado está incompleto. Intenta de nuevo." });
        return;
      }
      try {
        plan = JSON.parse(repaired);
        req.log?.info({ diasRecuperados: plan?.dias?.length }, "JSON reparado exitosamente");
      } catch {
        res.status(500).json({ error: "No se pudo procesar el plan. Intenta de nuevo." });
        return;
      }
    }

    if (!plan.dias || !Array.isArray(plan.dias)) {
      res.status(500).json({ error: "Formato de plan inválido. Intenta de nuevo." });
      return;
    }

    res.json({ dias: plan.dias, semanaInicio });
  } catch (error: any) {
    req.log?.error({ error: error?.message }, "Error generando plan de comidas con AI");
    { const e = errorIA(error, "el plan de comida"); res.status(e.status).json({ error: e.error }); }
  }
});

export default router;
