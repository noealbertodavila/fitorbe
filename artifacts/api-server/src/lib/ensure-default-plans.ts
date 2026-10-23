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
      "Sesiones 1 a 1 con tu coach",
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
      "Sesiones 1 a 1 con tu coach",
    ],
    activo: true,
  },
  {
    nombre: "VIP",
    precioMensual: 249,
    precio3meses: 672,
    precio6meses: 1254,
    descuentoPct: 10,
    descripcion: "Experiencia completa 1 a 1 con tu coach",
    badge: "Todo incluido",
    caracteristicasIncluidas: [
      "Rutina 100% personalizada",
      "Videos propios de tu coach",
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

/**
 * Planes de ejemplo para un coach nuevo (los puede cambiar o borrar en "Planes").
 * Cada coach tiene sus propios planes; no hay planes compartidos.
 */
export async function crearPlanesIniciales(coachId: number) {
  try {
    const [ya] = await db.select({ id: planesPrecios.id }).from(planesPrecios).where(eq(planesPrecios.coachId, coachId)).limit(1);
    if (ya) return;
    await db.insert(planesPrecios).values(DEFAULT_PLANS.map((p) => ({ ...p, coachId })));
  } catch (err) {
    logger.error({ err, coachId }, "No se pudieron crear los planes iniciales");
  }
}

/** Ya no se crean planes globales al arrancar (cada coach tiene los suyos). */
export async function ensureDefaultPlans() {}
