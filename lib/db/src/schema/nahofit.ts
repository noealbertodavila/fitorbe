import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  real,
  timestamp,
  jsonb,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Usuarios ───────────────────────────────────────────────────────────────
export const usuariosTable = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  rol: text("rol").notNull().default("cliente"), // admin | coach | cliente

  // Datos personales
  telefono: text("telefono"),
  fechaNacimiento: text("fecha_nacimiento"),
  sexo: text("sexo"),           // Masculino | Femenino
  pais: text("pais"),
  ciudad: text("ciudad"),

  // Datos físicos
  peso: real("peso"),           // kg
  altura: real("altura"),       // cm
  grasaCorporalPct: real("grasa_corporal_pct"),
  complexion: text("complexion"), // Ectomorfo | Mesomorfo | Endomorfo

  // Objetivos (legacy + new)
  objetivo: text("objetivo"),
  objetivoPrincipal: text("objetivo_principal"),
  pesoMeta: real("peso_meta"),
  fechaMeta: text("fecha_meta"),
  nivelUrgencia: text("nivel_urgencia"), // Tranquilo | Moderado | Intensivo

  // Fitness
  lesiones: text("lesiones"),
  nivelFitness: text("nivel_fitness"), // principiante | intermedio | avanzado
  diasDisponibles: integer("dias_disponibles"),
  duracionSesion: text("duracion_sesion"),     // 30min | 45min | 60min | 90min
  horarioPreferido: text("horario_preferido"), // Mañana | Tarde | Noche | Flexible
  lugarEntrenamiento: text("lugar_entrenamiento"), // Gym | Casa | Al aire libre | Híbrido
  equipamiento: text("equipamiento"),

  // Salud
  condicionesMedicas: text("condiciones_medicas"),
  medicamentos: text("medicamentos"),
  zonasEvitar: text("zonas_evitar"),
  autorizacionMedica: text("autorizacion_medica"), // Sí | No | No aplica

  // Nutrición
  alergiasAlimentarias: text("alergias_alimentarias"),
  alimentosNoConsume: text("alimentos_no_consume"),
  tipoAlimentacion: text("tipo_alimentacion"), // Omnívoro | Vegetariano | Vegano | Keto | Paleo | Otro
  comidasAlDia: integer("comidas_al_dia"),
  cocinaEnCasa: text("cocina_en_casa"),          // Casa | Fuera | Mixto
  presupuestoAlimentacion: text("presupuesto_alimentacion"), // Básico | Moderado | Sin restricción
  suplementosActuales: text("suplementos_actuales"),
  aguaDiaria: real("agua_diaria"),               // litros

  // Estilo de vida
  ocupacion: text("ocupacion"),
  horasSueno: real("horas_sueno"),
  nivelEstres: text("nivel_estres"),  // Bajo | Moderado | Alto | Muy alto
  modalidad: text("modalidad"),       // online | presencial | híbrido
  planTipo: text("plan_tipo"),        // basico | premium | vip
  fechaInicio: text("fecha_inicio"),

  // Notas del coach
  notasCoach: text("notas_coach"),
  estrategiaEntrenamiento: text("estrategia_entrenamiento"),
  prioridadesPrimerMes: text("prioridades_primer_mes"),

  coachId: integer("coach_id"),
  activo: boolean("activo").notNull().default(true),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
});

export const insertUsuarioSchema = createInsertSchema(usuariosTable).omit({
  id: true,
  creadoEn: true,
});
export const selectUsuarioSchema = createSelectSchema(usuariosTable);
export type InsertUsuario = z.infer<typeof insertUsuarioSchema>;
export type Usuario = typeof usuariosTable.$inferSelect;

// ─── Rutinas ─────────────────────────────────────────────────────────────────
export const rutinasTable = pgTable("rutinas", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id").notNull(),
  coachId: integer("coach_id").notNull(),
  semanaInicio: text("semana_inicio").notNull(),
  diaSemana: integer("dia_semana").notNull(), // 0=lun ... 6=dom
  ejercicios: jsonb("ejercicios").notNull(),
  aprobada: boolean("aprobada").notNull().default(false),
  notas: text("notas"),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
});

export const insertRutinaSchema = createInsertSchema(rutinasTable).omit({
  id: true,
  creadoEn: true,
});
export type InsertRutina = z.infer<typeof insertRutinaSchema>;
export type Rutina = typeof rutinasTable.$inferSelect;

// ─── Biblioteca de ejercicios ─────────────────────────────────────────────────
export const ejerciciosBibliotecaTable = pgTable("ejercicios_biblioteca", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  grupoMuscular: text("grupo_muscular").notNull(),
  instrucciones: text("instrucciones").notNull(),
  fotoUrl: text("foto_url"),
  videoUrl: text("video_url"),
  creadoPor: integer("creado_por"),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
});

export const insertEjercicioSchema = createInsertSchema(ejerciciosBibliotecaTable).omit({
  id: true,
  creadoEn: true,
});
export type InsertEjercicio = z.infer<typeof insertEjercicioSchema>;
export type Ejercicio = typeof ejerciciosBibliotecaTable.$inferSelect;

// ─── Planes de comida ─────────────────────────────────────────────────────────
export const planesComidaTable = pgTable("planes_comida", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id").notNull(),
  coachId: integer("coach_id").notNull(),
  semanaInicio: text("semana_inicio").notNull(),
  diaSemana: integer("dia_semana").notNull(),
  comidas: jsonb("comidas").notNull(),
  caloriasTotal: integer("calorias_total").notNull().default(0),
  aprobada: boolean("aprobada").notNull().default(false),
  notas: text("notas"),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
});

export const insertPlanComidaSchema = createInsertSchema(planesComidaTable).omit({
  id: true,
  creadoEn: true,
});
export type InsertPlanComida = z.infer<typeof insertPlanComidaSchema>;
export type PlanComida = typeof planesComidaTable.$inferSelect;

// ─── Registros de progreso ────────────────────────────────────────────────────
export const registrosProgresoTable = pgTable("registros_progreso", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id").notNull(),
  registradoPor: integer("registrado_por"),
  fecha: date("fecha").notNull(),
  // Medidas básicas
  pesoKg: real("peso_kg"),
  grasaCorporal: real("grasa_corporal"),
  imc: real("imc"),
  // Circunferencias
  cuelloCm: real("cuello_cm"),
  pechoCm: real("pecho_cm"),
  cinturaCm: real("cintura_cm"),
  caderaCm: real("cadera_cm"),
  brazoDerCm: real("brazo_der_cm"),
  brazoIzqCm: real("brazo_izq_cm"),
  musloDerCm: real("muslo_der_cm"),
  musloIzqCm: real("muslo_izq_cm"),
  pantorrillaDerCm: real("pantorrilla_der_cm"),
  pantorrillaIzqCm: real("pantorrilla_izq_cm"),
  piernaCm: real("pierna_cm"),
  // Bioimpedancia
  masaMuscular: real("masa_muscular"),
  masaGrasaKg: real("masa_grasa_kg"),
  aguaCorporal: real("agua_corporal"),
  metabolismoBasal: integer("metabolismo_basal"),
  edadMetabolica: integer("edad_metabolica"),
  // Fotos (6 posiciones)
  fotoFrente: text("foto_frente"),
  fotoEspalda: text("foto_espalda"),
  fotoPerfilIzq: text("foto_perfil_izq"),
  fotoPerfilDer: text("foto_perfil_der"),
  fotoExtra1: text("foto_extra1"),
  fotoExtra2: text("foto_extra2"),
  // Notas
  notasCoach: text("notas_coach"),
  notasCliente: text("notas_cliente"),
  notas: text("notas"),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
});

export const insertProgresoSchema = createInsertSchema(registrosProgresoTable).omit({
  id: true,
  creadoEn: true,
});
export type InsertProgreso = z.infer<typeof insertProgresoSchema>;
export type RegistroProgreso = typeof registrosProgresoTable.$inferSelect;

// ─── Check-ins diarios ────────────────────────────────────────────────────────
export const checkinsDiariosTable = pgTable("checkins_diarios", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id").notNull(),
  fecha: date("fecha").notNull(),
  ejerciciosCompletados: jsonb("ejercicios_completados").notNull().default([]),
  comidasCompletadas: jsonb("comidas_completadas").notNull().default([]),
  porcentajeAdherencia: real("porcentaje_adherencia").notNull().default(0),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
});

export const insertCheckinSchema = createInsertSchema(checkinsDiariosTable).omit({
  id: true,
  creadoEn: true,
});
export type InsertCheckin = z.infer<typeof insertCheckinSchema>;
export type CheckinDiario = typeof checkinsDiariosTable.$inferSelect;

// ─── Check-ins emocionales ────────────────────────────────────────────────────
export const checkinsEmoccionalesTable = pgTable("checkins_emocionales", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id").notNull(),
  fecha: date("fecha").notNull(),
  estadoAnimo: integer("estado_animo").notNull(), // 1-5
  nivelEnergia: integer("nivel_energia").notNull(), // 1-5
  horasSueno: real("horas_sueno").notNull(),
  notas: text("notas"),
  factores: text("factores"), // comma-separated tags
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
});

export const insertCheckinEmocionalSchema = createInsertSchema(checkinsEmoccionalesTable).omit({
  id: true,
  creadoEn: true,
});
export type InsertCheckinEmocional = z.infer<typeof insertCheckinEmocionalSchema>;
export type CheckinEmocional = typeof checkinsEmoccionalesTable.$inferSelect;

// ─── Diario de mentalidad ─────────────────────────────────────────────────────
export const diarioMentalidadTable = pgTable("diario_mentalidad", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id").notNull(),
  fecha: date("fecha").notNull(),
  contenido: text("contenido").notNull(),
  gratitud: text("gratitud"),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
});

export const insertEntradaDiarioSchema = createInsertSchema(diarioMentalidadTable).omit({
  id: true,
  creadoEn: true,
});
export type InsertEntradaDiario = z.infer<typeof insertEntradaDiarioSchema>;
export type EntradaDiario = typeof diarioMentalidadTable.$inferSelect;

// ─── Mensajes ─────────────────────────────────────────────────────────────────
export const mensajesTable = pgTable("mensajes", {
  id: serial("id").primaryKey(),
  remitenteId: integer("remitente_id").notNull(),
  receptorId: integer("receptor_id").notNull(),
  contenido: text("contenido").notNull(),
  leido: boolean("leido").notNull().default(false),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
});

export const insertMensajeSchema = createInsertSchema(mensajesTable).omit({
  id: true,
  creadoEn: true,
});
export type InsertMensaje = z.infer<typeof insertMensajeSchema>;
export type Mensaje = typeof mensajesTable.$inferSelect;

// ─── Planes y Precios ─────────────────────────────────────────────────────────
export const planesPrecios = pgTable("planes_precios", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  precioMensual: real("precio_mensual").notNull(),
  precio3meses: real("precio_3meses").notNull(),
  precio6meses: real("precio_6meses").notNull(),
  descuentoPct: real("descuento_pct").notNull().default(0),
  descripcion: text("descripcion").notNull(),
  badge: text("badge"),
  caracteristicasIncluidas: jsonb("caracteristicas_incluidas").notNull().default([]),
  caracteristicasNoIncluidas: jsonb("caracteristicas_no_incluidas").notNull().default([]),
  activo: boolean("activo").notNull().default(true),
  actualizadoEn: timestamp("actualizado_en").defaultNow().notNull(),
});

export const insertPlanPrecioSchema = createInsertSchema(planesPrecios).omit({
  id: true,
  actualizadoEn: true,
});
export type InsertPlanPrecio = z.infer<typeof insertPlanPrecioSchema>;
export type PlanPrecio = typeof planesPrecios.$inferSelect;

// ─── Pagos ────────────────────────────────────────────────────────────────────
export const pagosTable = pgTable("pagos", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id").notNull(),
  fecha: date("fecha").notNull(),
  monto: real("monto").notNull(),
  metodo: text("metodo").notNull(), // efectivo | zelle | transferencia | stripe
  metodoDatos: jsonb("metodo_datos"), // {telefono, banco, cuenta, referencia, etc}
  concepto: text("concepto").notNull(),
  estado: text("estado").notNull().default("pagado"), // pagado | pendiente | vencido
  notas: text("notas"),
  proxPago: date("prox_pago"), // next payment due date
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
});

export const insertPagoSchema = createInsertSchema(pagosTable).omit({
  id: true,
  creadoEn: true,
});
export type InsertPago = z.infer<typeof insertPagoSchema>;
export type Pago = typeof pagosTable.$inferSelect;

// ─── Frases del día ──────────────────────────────────────────────────────────
export const fraseDiaTable = pgTable("frases_dia", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id").notNull(),
  fecha: date("fecha").notNull(),
  frase: text("frase").notNull(),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
});

export type FraseDia = typeof fraseDiaTable.$inferSelect;
