import Anthropic from "@anthropic-ai/sdk";

/**
 * Cliente de Claude. Fuera de Replit se usa ANTHROPIC_API_KEY (la llave propia
 * de la cuenta de Anthropic). En Replit sigue funcionando con su integración.
 * Si no hay llave, la app arranca igual y solo fallan las funciones de IA.
 */
const llavePropia = process.env.ANTHROPIC_API_KEY;
const llaveReplit = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;

export const iaDisponible = Boolean(llavePropia || llaveReplit);

export const anthropic = new Anthropic(
  llavePropia
    ? { apiKey: llavePropia }
    : { apiKey: llaveReplit || "sin-llave", baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL },
);
