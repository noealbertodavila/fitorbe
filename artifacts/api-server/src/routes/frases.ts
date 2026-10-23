import { localDateStr } from "../lib/date-mt";
import { Router } from "express";
import { db, usuariosTable, fraseDiaTable, checkinsEmoccionalesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { coachDelCliente } from "../lib/apoyo";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

const FRASES_FALLBACK = [
  "Cada día es una nueva oportunidad para ser mejor.",
  "El progreso, no la perfección, es la meta.",
  "Tu único competidor eres tú de ayer.",
  "La consistencia supera al talento.",
  "Un día a la vez, un paso a la vez.",
];

const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

router.get("/frase-motivacional/:clienteId", requireAuth, async (req, res) => {
  const clienteId = parseInt(Array.isArray(req.params.clienteId) ? req.params.clienteId[0] : req.params.clienteId);
  if (isNaN(clienteId)) { res.status(400).json({ error: "clienteId inválido" }); return; }

  const hoy = localDateStr();

  // Check if frase already exists for today
  const [existente] = await db
    .select()
    .from(fraseDiaTable)
    .where(and(eq(fraseDiaTable.clienteId, clienteId), eq(fraseDiaTable.fecha, hoy)))
    .limit(1);

  if (existente) {
    res.json({ frase: existente.frase });
    return;
  }

  // Fetch client data
  const [cliente] = await db.select().from(usuariosTable).where(eq(usuariosTable.id, clienteId)).limit(1);
  if (!cliente) { res.status(404).json({ error: "Cliente no encontrado" }); return; }

  const objetivo = (cliente as any).objetivoPrincipal || (cliente as any).objetivo;
  if (!objetivo) {
    const fallback = FRASES_FALLBACK[Math.floor(Math.random() * FRASES_FALLBACK.length)];
    res.json({ frase: fallback });
    return;
  }

  // Fetch yesterday's emotional state if available
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  const ayerStr = localDateStr(ayer);

  const [checkinAyer] = await db
    .select()
    .from(checkinsEmoccionalesTable)
    .where(and(eq(checkinsEmoccionalesTable.clienteId, clienteId), eq(checkinsEmoccionalesTable.fecha, ayerStr)))
    .limit(1);

  const estadoEmocional = checkinAyer ? `Estado emocional de ayer: estado de ánimo ${checkinAyer.estadoAnimo}/10, nivel de energía ${checkinAyer.nivelEnergia}/10` : "";

  const diaSemana = DIAS_SEMANA[new Date().getDay()];
  const nombre = cliente.nombre?.split(" ")[0] || "campeón";

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 120,
      messages: [{
        role: "user",
        content: `Eres ${(await coachDelCliente(clienteId)).coach}, coach de bienestar y fitness. Genera UNA frase motivacional muy corta (máximo 20 palabras) y personalizada para ${nombre}.

Datos:
- Objetivo: ${objetivo}
- Día de la semana: ${diaSemana}
${estadoEmocional}

La frase debe:
- Ser inspiradora y directa, en español
- Estar en segunda persona (tutéalo)
- Relacionarse con su objetivo o el día de la semana
- NO incluir comillas ni guiones al inicio
- Máximo 20 palabras

Responde ÚNICAMENTE con la frase, sin explicaciones.`,
      }],
    });

    const frase = (message.content[0] as any).text?.trim() || FRASES_FALLBACK[Math.floor(Math.random() * FRASES_FALLBACK.length)];

    // Save to DB
    await db.insert(fraseDiaTable).values({ clienteId, fecha: hoy, frase }).onConflictDoNothing();

    res.json({ frase });
  } catch {
    const fallback = FRASES_FALLBACK[Math.floor(Math.random() * FRASES_FALLBACK.length)];
    res.json({ frase: fallback });
  }
});

export default router;
