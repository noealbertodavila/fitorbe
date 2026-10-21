import { db, planesPrecios } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const DEFAULT_PLANS = [
  {
    nombre: "Básico",
    precioMensual: 59,
    precio3meses: 159,
    precio6meses: 300,
    descuentoPct: 10,
    descripcion: "Ideal para quienes inician su transformación",
    badge: "Para empezar",
    caracteristicasIncluidas: [
      "Rutina semanal personalizada",
      "Videos de ejercicios YouTube",
      "Ajuste mensual de rutina",
      "Mensajes por la app",
      "Chat AI Coach",
      "Registro de peso y medidas",
    ],
    caracteristicasNoIncluidas: [
      "Plan de nutrición",
      "Seguimiento emocional",
      "Sesiones 1 a 1 con Nahomy",
      "Fotos de progreso",
      "Reporte PDF mensual",
    ],
    activo: true,
  },
  {
    nombre: "Premium",
    precioMensual: 119,
    precio3meses: 321,
    precio6meses: 606,
    descuentoPct: 10,
    descripcion: "Entrenamiento + nutrición para resultados reales",
    badge: "Más popular",
    caracteristicasIncluidas: [
      "Rutina semanal personalizada",
      "Videos + instrucciones escritas detalladas",
      "Ajuste semanal de rutina",
      "Plan de nutrición semanal completo",
      "Seguimiento emocional diario",
      "Mensajes prioritarios con el coach",
      "Chat AI Coach avanzado",
      "Registro completo de medidas corporales",
      "Fotos de progreso mensuales",
      "Reporte PDF mensual con gráficas",
    ],
    caracteristicasNoIncluidas: [
      "Sesiones 1 a 1 con Nahomy",
    ],
    activo: true,
  },
  {
    nombre: "VIP",
    precioMensual: 249,
    precio3meses: 672,
    precio6meses: 1254,
    descuentoPct: 10,
    descripcion: "Experiencia completa 1 a 1 con Nahomy",
    badge: "Todo incluido",
    caracteristicasIncluidas: [
      "Rutina 100% personalizada",
      "Videos propios de Nahomy",
      "Ajuste de rutina en tiempo real",
      "Plan de nutrición + guía de suplementos",
      "Asesoría emocional completa",
      "Respuesta del coach en menos de 2 horas",
      "Chat AI Coach ilimitado",
      "4 sesiones 1 a 1 por mes (video o presencial)",
      "Escaneo corporal mensual completo",
      "Fotos antes y después organizadas",
      "Reporte PDF completo + gráficas de evolución",
    ],
    caracteristicasNoIncluidas: [],
    activo: true,
  },
];

// Plans that were created as tests and should be removed
const PLANS_TO_DELETE = ["vacaciones", "test", "prueba"];

export async function ensureDefaultPlans() {
  try {
    // Remove known test/garbage plans
    for (const name of PLANS_TO_DELETE) {
      const rows = await db
        .select({ id: planesPrecios.id })
        .from(planesPrecios)
        .where(eq(planesPrecios.nombre, name));
      if (rows.length > 0) {
        await db.delete(planesPrecios).where(eq(planesPrecios.nombre, name));
        logger.info({ name }, "Removed test plan");
      }
    }

    // Check which official plans already exist by name
    const existing = await db.select({ nombre: planesPrecios.nombre }).from(planesPrecios);
    const existingNames = new Set(existing.map(p => p.nombre));

    // Insert only missing official plans
    const missing = DEFAULT_PLANS.filter(p => !existingNames.has(p.nombre));
    if (missing.length > 0) {
      await db.insert(planesPrecios).values(missing);
      logger.info({ inserted: missing.map(p => p.nombre) }, "Default plans inserted");
    }
  } catch (err) {
    logger.error({ err }, "Failed to ensure default plans");
  }
}
