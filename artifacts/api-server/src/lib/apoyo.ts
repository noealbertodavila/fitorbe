/**
 * Señales de que alguien puede estar en crisis (pensar en hacerse daño o en
 * quitarse la vida) en lo que escribe en el diario, en las notas del ánimo o en
 * el chat. No es un diagnóstico: solo sirve para mostrarle de inmediato dónde
 * pedir ayuda (línea 988) y avisarle a su coach.
 */
const SENALES: RegExp[] = [
  // Español
  /suicid/i,
  /quitarme la vida/i,
  /\bmatarme\b/i,
  /\bno quiero (seguir )?vivir\b/i,
  /\bquiero morir(me)?\b(?!\s+de\s+(la\s+)?(risa|hambre|sueño|calor|frío|frio|vergüenza|verguenza|ganas|amor|cansancio))/i,
  /\bme quiero morir\b(?!\s+de\s+(la\s+)?(risa|hambre|sueño|calor|frío|frio|vergüenza|verguenza|ganas|amor|cansancio))/i,
  /\bmejor (estar|estaría) muert[oa]\b/i,
  /\bhacerme daño\b/i,
  /\blastimarme\b/i,
  /\bcortarme\b(?!\s+(el|la|los|las|un|una)\s)/i,
  /autolesi/i,
  /no vale la pena (seguir|vivir)/i,
  /\bacabar con todo\b/i,
  /\bdesaparecer para siempre\b/i,
  // Inglés
  /\bkill myself\b/i,
  /\bend my life\b/i,
  /\bwant to die\b/i,
  /\bself[- ]?harm/i,
  /\bhurt myself\b/i,
  /\bcut myself\b/i,
  /\bbetter off dead\b/i,
  /\bno reason to live\b/i,
];

export function detectarRiesgo(...textos: unknown[]): boolean {
  const t = textos.filter((x) => typeof x === "string").join("\n");
  if (!t.trim()) return false;
  return SENALES.some((re) => re.test(t));
}

/** Instrucciones de seguridad para la IA (se agregan al prompt del chat). */
export const REGLAS_SEGURIDAD_IA = `
SEGURIDAD (obligatorio):
- Eres un asistente con inteligencia artificial que ayuda a la coach Nahomy. No eres Nahomy ni una persona; si te preguntan, dilo con claridad.
- No eres médico, nutriólogo clínico ni terapeuta. No diagnostiques. Ante dolor fuerte, mareos, lesiones o síntomas médicos, recomienda ver a un profesional de salud.
- Si la persona menciona pensamientos de hacerse daño, de quitarse la vida o que está en crisis: responde con calma y empatía, no la juzgues, dile que no está sola, y pídele que llame o mande mensaje al 988 (Línea de Crisis y Suicidio, EE. UU., 24 horas, en español e inglés) o al 911 si está en peligro inmediato, y que también hable con Nahomy o con alguien de confianza. No des consejos de dieta, calorías ni ejercicio en esa respuesta.
- Si menciona dejar de comer, vomitar a propósito, usar laxantes para bajar de peso o castigarse con ejercicio: no des cifras de calorías, metas de peso ni planes; responde con empatía y recomiéndale hablar con un profesional de salud y con Nahomy.
- Nunca des dietas por debajo de lo saludable ni metas de pérdida de peso extremas.`;
