import { db, planesPrecios } from "@workspace/db";

async function seed() {
  await db.delete(planesPrecios);

  await db.insert(planesPrecios).values([
    {
      nombre: "Básico",
      precioMensual: 59,
      precio3meses: 150.45,
      precio6meses: 283.20,
      descuentoPct: 15,
      descripcion: "Ideal para empezar tu transformación con lo esencial.",
      badge: "Para empezar",
      caracteristicasIncluidas: [
        "Rutina semanal personalizada",
        "Videos de ejercicios (YouTube)",
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
      precio3meses: 303.45,
      precio6meses: 571.20,
      descuentoPct: 15,
      descripcion: "El plan favorito de nuestros clientes. Resultados comprobados.",
      badge: "Más popular",
      caracteristicasIncluidas: [
        "Rutina semanal personalizada",
        "Videos + instrucciones escritas",
        "Ajuste semanal de rutina",
        "Plan de nutrición semanal",
        "Seguimiento emocional diario",
        "Mensajes prioritarios",
        "Chat AI Coach avanzado",
        "Registro completo de medidas",
        "Fotos de progreso",
        "Reporte PDF mensual",
      ],
      caracteristicasNoIncluidas: ["Sesiones 1 a 1 con Nahomy"],
      activo: true,
    },
    {
      nombre: "VIP",
      precioMensual: 249,
      precio3meses: 635.45,
      precio6meses: 1195.20,
      descuentoPct: 15,
      descripcion: "Experiencia completa sin límites. Acceso total a todo.",
      badge: "Todo incluido",
      caracteristicasIncluidas: [
        "Rutina 100% personalizada",
        "Videos propios de Nahomy",
        "Ajuste en tiempo real",
        "Plan de nutrición + suplementos",
        "Asesoría emocional completa",
        "Respuesta en menos de 2 horas",
        "Chat AI Coach ilimitado",
        "4 sesiones 1 a 1 por mes (video o presencial)",
        "Escaneo corporal mensual",
        "Fotos antes y después",
        "Reporte PDF completo + gráficas",
      ],
      caracteristicasNoIncluidas: [],
      activo: true,
    },
  ]);

  console.log("✅ Planes insertados: Básico, Premium, VIP");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
