import { Router } from "express";
import { errorIA } from "../lib/error-ia";
import { db, rutinasTable, usuariosTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireRol } from "../middlewares/auth";
import { coachDelCliente } from "../lib/apoyo";
import { anthropic } from "@workspace/integrations-anthropic-ai";

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

// Generate rutina with AI — returns DRAFT (does not save to DB)
router.post("/rutinas/generar-ai", requireAuth, requireRol("coach"), async (req, res) => {
  const { clienteId, semanaInicio, duracionDias = 7, organizacion } = req.body;

  if (!clienteId) {
    res.status(400).json({ error: "Se requiere clienteId" });
    return;
  }

  const [c] = await db.select().from(usuariosTable).where(eq(usuariosTable.id, clienteId)).limit(1);
  if (!c) { res.status(404).json({ error: "Cliente no encontrado" }); return; }

  // Calculate age
  let edad = "";
  if (c.fechaNacimiento) {
    const diff = Date.now() - new Date(c.fechaNacimiento).getTime();
    edad = `${Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))} años`;
  }

  // Calculate IMC
  let imc = "";
  if (c.peso && c.altura) {
    const imcVal = c.peso / ((c.altura / 100) ** 2);
    imc = `${imcVal.toFixed(1)}`;
  }

  const diasEntrenamiento = c.diasDisponibles || 5;
  const diasDescanso = 7 - diasEntrenamiento;
  const duracionSesion = c.duracionSesion || "60min";
  const lugar = c.lugarEntrenamiento || "Gym";
  const equipamiento = c.equipamiento || "equipamiento completo";

  // Build example of training vs rest day distribution
  const diasNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const ejemploDias = diasNames.map((nombre, i) => {
    if (i < diasEntrenamiento) return `- ${nombre}: Entrenamiento`;
    return `- ${nombre}: DESCANSO`;
  }).join("\n");

  const { coach } = await coachDelCliente(Number(clienteId));
  const prompt = `Eres ${coach}, coach de fitness profesional. Crea un plan de entrenamiento semanal para ${c.nombre}.

PERFIL DEL CLIENTE:
- Sexo: ${c.sexo || "No especificado"}
- Edad: ${edad || "No especificada"}
- Peso: ${c.peso ? `${c.peso}kg` : "No especificado"} | Altura: ${c.altura ? `${c.altura}cm` : "No especificada"}${imc ? ` | IMC: ${imc}` : ""}
- Complexión: ${c.complexion || "No especificada"}
- Objetivo: ${c.objetivoPrincipal || c.objetivo || "fitness general"}
- Peso meta: ${c.pesoMeta ? `${c.pesoMeta}kg` : "No especificado"}
- Nivel: ${c.nivelFitness || "intermedio"}
- Días disponibles: ${diasEntrenamiento} días/semana
- Duración por sesión: ${duracionSesion}
- Horario preferido: ${c.horarioPreferido || "flexible"}
- Lugar de entrenamiento: ${lugar}
- Equipamiento: ${equipamiento}
- Lesiones/restricciones: ${c.lesiones || "ninguna"}
- Condiciones médicas: ${c.condicionesMedicas || "ninguna"}
- Zonas a evitar: ${c.zonasEvitar || "ninguna"}

DÍAS DE ENTRENAMIENTO — REGLA OBLIGATORIA:
El cliente tiene disponibilidad para entrenar EXACTAMENTE ${diasEntrenamiento} días por semana.
Los ${diasDescanso} días restantes son días de DESCANSO TOTAL — sin ejercicios.

Distribución sugerida (adapta según la organización elegida):
${ejemploDias}

Distribuye los días de entrenamiento con descanso entre sesiones para maximizar la recuperación.
Adapta el volumen: con ${diasEntrenamiento} días usa ${diasEntrenamiento <= 3 ? "mayor volumen por sesión (más series y ejercicios por día)" : diasEntrenamiento <= 4 ? "volumen moderado-alto" : "volumen distribuido moderado"}.

DURACIÓN DE SESIÓN:
Cada sesión debe caber en ${duracionSesion}. Incluye solo los ejercicios necesarios.
Cálculo aproximado: calentamiento 10min + (series × descanso × ejercicios) + enfriamiento 5min.

LUGAR Y EQUIPAMIENTO:
El cliente entrena en: ${lugar}
Equipamiento disponible: ${equipamiento}
SOLO incluir ejercicios realizables con ese equipamiento. No incluir máquinas de gym si entrena en casa.

Responde ÚNICAMENTE con este JSON, sin texto adicional, sin markdown:
{"dias":[{"diaSemana":0,"ejercicios":[{"nombre":"Sentadilla con barra","series":4,"repeticiones":"10-12","descanso":"90 seg","instrucciones":"Pies al ancho de los hombros, espalda recta, baja hasta 90 grados. Exhala al subir, inhala al bajar.","videoUrl":null,"grupoMuscular":"Cuádriceps / Glúteos","completado":false}]},{"diaSemana":1,"ejercicios":[]}]}

ORGANIZACIÓN ELEGIDA POR EL COACH:
${organizacion === "grupo_muscular"
  ? `Divide por grupos musculares: Día 1 Pecho+Tríceps · Día 2 Espalda+Bíceps · Día 3 Piernas+Glúteos · Día 4 Hombros+Core · Día 5 Fullbody. Adapta según los ${diasEntrenamiento} días disponibles.`
  : organizacion === "dia_semana"
  ? `Organiza por tipo de entrenamiento variado cada día: varía entre fuerza, cardio, movilidad, funcional.`
  : organizacion === "fullbody"
  ? `Cada día de entrenamiento trabaja el cuerpo completo con ejercicios compuestos. Varía los ejercicios entre días.`
  : organizacion === "cardio_fuerza"
  ? `Alterna días de cardio (LISS o HIIT) con días de fuerza en los ${diasEntrenamiento} días disponibles.`
  : organizacion === "hiit"
  ? `Diseña circuitos de alta intensidad por intervalos en los ${diasEntrenamiento} días. Incluye ratio trabajo:descanso en instrucciones (ej: "30seg trabajo / 15seg descanso").`
  : `Genera estructura estándar variada para los ${diasEntrenamiento} días de entrenamiento.`}

REGLAS ESTRICTAS:
- diaSemana: 0=Lunes, 1=Martes, 2=Miércoles, 3=Jueves, 4=Viernes, 5=Sábado, 6=Domingo
- Incluye EXACTAMENTE 7 objetos en el array "dias" (del 0 al 6)
- Los días de ENTRENAMIENTO: ejercicios con ejercicios completos
- Los días de DESCANSO: ejercicios debe ser un array vacío [] — NO incluyas ejercicios de movilidad ni nada
- Debe haber EXACTAMENTE ${diasEntrenamiento} días con ejercicios y EXACTAMENTE ${diasDescanso} días con ejercicios:[]
- Adapta intensidad al nivel (${c.nivelFitness || "intermedio"})
- Evita absolutamente: ${c.lesiones || "ninguna restricción"}
- El campo videoUrl debe ser siempre null — NO generes links de YouTube`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") { res.status(500).json({ error: "Respuesta inesperada del AI" }); return; }

    let raw = content.text.trim()
      .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) { res.status(500).json({ error: "El AI no devolvió JSON válido" }); return; }

    const rutina = JSON.parse(jsonMatch[0]);
    if (!rutina.dias || !Array.isArray(rutina.dias)) { res.status(500).json({ error: "Formato inválido" }); return; }

    res.json({ dias: rutina.dias, semanaInicio });
  } catch (error: any) {
    req.log?.error({ error: error?.message }, "Error generando rutina con AI");
    { const e = errorIA(error, "la rutina"); res.status(e.status).json({ error: e.error }); }
  }
});

export default router;
