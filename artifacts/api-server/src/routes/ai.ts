import { localDateStr } from "../lib/date-mt";
import { Router } from "express";
import { db, usuariosTable, rutinasTable, planesComidaTable, checkinsEmoccionalesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { detectarRiesgo, reglasSeguridadIA, coachDelCliente } from "../lib/apoyo";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

router.get("/ai/frase-motivacional/:clienteId", requireAuth, async (req, res) => {
  const clienteId = parseInt(String(req.params.clienteId));
  const [cliente] = await db
    .select()
    .from(usuariosTable)
    .where(eq(usuariosTable.id, clienteId))
    .limit(1);

  if (!cliente) {
    res.status(404).json({ error: "Cliente no encontrado" });
    return;
  }

  const [ultimoEstado] = await db
    .select()
    .from(checkinsEmoccionalesTable)
    .where(eq(checkinsEmoccionalesTable.clienteId, clienteId))
    .orderBy(desc(checkinsEmoccionalesTable.fecha))
    .limit(1);

  const estadoTexto = ultimoEstado
    ? `estado de ánimo ${ultimoEstado.estadoAnimo}/5, energía ${ultimoEstado.nivelEnergia}/5, durmió ${ultimoEstado.horasSueno} horas`
    : "estado desconocido";

  const prompt = `Genera una frase motivacional personalizada y corta (máximo 2 oraciones) en español para ${cliente.nombre}, 
cuyo objetivo es ${cliente.objetivo || "mejorar su salud"} y tiene ${estadoTexto}.
Responde SOLO con la frase, sin comillas ni explicaciones.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    const frase = content.type === "text" ? content.text.trim() : "¡Tú puedes lograrlo! Cada día es una nueva oportunidad para acercarte a tu meta.";
    res.json({ frase });
  } catch {
    res.json({ frase: "¡Tú puedes lograrlo! Cada día es una nueva oportunidad para acercarte a tu meta." });
  }
});

router.post("/ai/chat", requireAuth, async (req, res) => {
  const { clienteId, mensaje, historial } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const [cliente] = await db
      .select()
      .from(usuariosTable)
      .where(eq(usuariosTable.id, clienteId))
      .limit(1);

    // Get context: routine, meals, emotional state
    const today = localDateStr();
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = localDateStr(weekStart);

    const [ultimoEmocional] = await db
      .select()
      .from(checkinsEmoccionalesTable)
      .where(eq(checkinsEmoccionalesTable.clienteId, clienteId))
      .orderBy(desc(checkinsEmoccionalesTable.fecha))
      .limit(1);

    const { coach, negocio } = await coachDelCliente(clienteId);
    const systemPrompt = `Eres el asistente con inteligencia artificial de ${negocio}, que apoya a los clientes de ${coach} (su coach) en bienestar emocional, fitness y nutrición. Eres experto y empático.
Estás hablando con ${cliente?.nombre || "el cliente"}.

PERFIL DEL CLIENTE:
- Objetivo: ${cliente?.objetivo || "mejorar su salud general"}
- Nivel de fitness: ${cliente?.nivelFitness || "intermedio"}
- Lesiones/restricciones: ${cliente?.lesiones || "ninguna"}
- Modalidad: ${cliente?.modalidad || "presencial"}
- Plan: ${cliente?.planTipo || "básico"}

ESTADO EMOCIONAL RECIENTE:
${ultimoEmocional
  ? `Estado de ánimo: ${ultimoEmocional.estadoAnimo}/5, Energía: ${ultimoEmocional.nivelEnergia}/5, Horas de sueño: ${ultimoEmocional.horasSueno}`
  : "Sin datos recientes"}

INSTRUCCIONES:
- Responde en el idioma en que te escriba la persona (español o inglés)
- Sé profesional, empática y motivadora
- Responde preguntas sobre ejercicios, nutrición, técnica, motivación, manejo del estrés y sueño
- Para sustituciones de comida, sugiere alternativas saludables y accesibles
- Si el cliente reporta lesiones, modifica las recomendaciones accordingly
- Mantén respuestas concisas pero completas (máximo 3-4 párrafos)
- No uses emojis
${reglasSeguridadIA(coach)}`;

    const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
    
    if (historial && Array.isArray(historial)) {
      for (const msg of historial.slice(-10)) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: String(msg.content ?? "").slice(0, 4000) });
        }
      }
    }
    messages.push({ role: "user", content: String(mensaje ?? "").slice(0, 4000) });
    // Si escribe algo que suena a crisis, la app le muestra de inmediato cómo pedir ayuda (988).
    if (detectarRiesgo(mensaje)) res.write(`data: ${JSON.stringify({ apoyo: true })}\n\n`);

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      messages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    console.error("Error in AI chat:", error);
    res.write(`data: ${JSON.stringify({ error: "Error al procesar tu mensaje" })}\n\n`);
    res.end();
  }
});

export default router;
