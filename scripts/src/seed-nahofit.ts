import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import {
  usuariosTable,
  rutinasTable,
  planesComidaTable,
  registrosProgresoTable,
  checkinsDiariosTable,
  checkinsEmoccionalesTable,
  diarioMentalidadTable,
  mensajesTable,
  pagosTable,
  ejerciciosBibliotecaTable,
} from "@workspace/db";

async function seed() {
  console.log("🌱 Seeding NAHOFIT database...");

  // Clear existing data in proper order
  await db.delete(mensajesTable);
  await db.delete(pagosTable);
  await db.delete(diarioMentalidadTable);
  await db.delete(checkinsEmoccionalesTable);
  await db.delete(checkinsDiariosTable);
  await db.delete(registrosProgresoTable);
  await db.delete(planesComidaTable);
  await db.delete(rutinasTable);
  await db.delete(ejerciciosBibliotecaTable);
  await db.delete(usuariosTable);

  console.log("✅ Cleared existing data");

  // Hash passwords
  const adminHash = await bcrypt.hash("admin123", 10);
  const coachHash = await bcrypt.hash("nahofit123", 10);
  const clienteHash = await bcrypt.hash("cliente123", 10);

  // Create admin
  const [admin] = await db
    .insert(usuariosTable)
    .values({
      nombre: "Administrador NAHOFIT",
      email: "admin@nahofit.life",
      passwordHash: adminHash,
      rol: "admin",
      activo: true,
    })
    .returning();

  // Create coach
  const [coach] = await db
    .insert(usuariosTable)
    .values({
      nombre: "Nahomy Fitness",
      email: "coach@nahofit.life",
      passwordHash: coachHash,
      rol: "coach",
      telefono: "+58 412-000-0001",
      activo: true,
    })
    .returning();

  console.log(`✅ Created admin (id=${admin.id}) and coach (id=${coach.id})`);

  // Create 5 demo clients
  const clientesData = [
    {
      nombre: "María García",
      email: "maria@demo.life",
      objetivo: "pérdida de peso",
      nivelFitness: "principiante",
      modalidad: "online",
      planTipo: "premium",
      telefono: "+58 412-111-1111",
      fechaNacimiento: "1992-03-15",
      lesiones: "ninguna",
    },
    {
      nombre: "Carlos Mendoza",
      email: "carlos@demo.life",
      objetivo: "ganancia muscular",
      nivelFitness: "intermedio",
      modalidad: "presencial",
      planTipo: "vip",
      telefono: "+58 414-222-2222",
      fechaNacimiento: "1988-07-22",
      lesiones: "rodilla derecha leve",
    },
    {
      nombre: "Laura Rodríguez",
      email: "laura@demo.life",
      objetivo: "tonificación",
      nivelFitness: "intermedio",
      modalidad: "online",
      planTipo: "básico",
      telefono: "+58 416-333-3333",
      fechaNacimiento: "1995-11-05",
      lesiones: "ninguna",
    },
    {
      nombre: "Andrés Torres",
      email: "andres@demo.life",
      objetivo: "resistencia cardiovascular",
      nivelFitness: "avanzado",
      modalidad: "presencial",
      planTipo: "premium",
      telefono: "+58 424-444-4444",
      fechaNacimiento: "1985-01-30",
      lesiones: "espalda baja crónica",
    },
    {
      nombre: "Sofía Martínez",
      email: "sofia@demo.life",
      objetivo: "bienestar general",
      nivelFitness: "principiante",
      modalidad: "online",
      planTipo: "básico",
      telefono: "+58 412-555-5555",
      fechaNacimiento: "1998-06-18",
      lesiones: "ninguna",
    },
  ];

  const clientes = await db
    .insert(usuariosTable)
    .values(
      clientesData.map((c) => ({
        ...c,
        passwordHash: clienteHash,
        rol: "cliente" as const,
        coachId: coach.id,
        activo: true,
      }))
    )
    .returning();

  console.log(`✅ Created ${clientes.length} demo clients`);

  // Seed exercise library
  const ejerciciosData = [
    { nombre: "Sentadilla", grupoMuscular: "Piernas", instrucciones: "Pies al ancho de hombros, baja hasta que los muslos estén paralelos al suelo, mantén la espalda recta.", videoUrl: "https://www.youtube.com/watch?v=aclHkVaku9U" },
    { nombre: "Press de Banca", grupoMuscular: "Pecho", instrucciones: "Acostado en el banco, agarra la barra con agarre más ancho que los hombros, baja hasta el pecho y empuja.", videoUrl: "https://www.youtube.com/watch?v=rT7DgCr-3pg" },
    { nombre: "Peso Muerto", grupoMuscular: "Espalda", instrucciones: "Pies al ancho de cadera, agarra la barra y levanta manteniendo la espalda recta y el core apretado.", videoUrl: "https://www.youtube.com/watch?v=op9kVnSso6Q" },
    { nombre: "Dominadas", grupoMuscular: "Espalda", instrucciones: "Agarra la barra con palmas hacia adelante, jala el cuerpo hacia arriba hasta que la barbilla supere la barra.", videoUrl: "https://www.youtube.com/watch?v=eGo4IYlbE5g" },
    { nombre: "Press Militar", grupoMuscular: "Hombros", instrucciones: "De pie o sentado, empuja la barra desde los hombros hasta arriba de la cabeza, brazos completamente extendidos.", videoUrl: "https://www.youtube.com/watch?v=2yjwXTZQDDI" },
    { nombre: "Curl de Bíceps", grupoMuscular: "Bíceps", instrucciones: "De pie, mancuernas en manos, flexiona los codos llevando las pesas hacia los hombros sin mover los codos.", videoUrl: "https://www.youtube.com/watch?v=ykJmrZ5v0Oo" },
    { nombre: "Tríceps en Polea", grupoMuscular: "Tríceps", instrucciones: "Parado frente a la polea alta, empuja hacia abajo manteniendo los codos pegados al cuerpo.", videoUrl: "https://www.youtube.com/watch?v=2-LAMcpzODU" },
    { nombre: "Plancha", grupoMuscular: "Core", instrucciones: "Apoya antebrazos y puntas de pies, mantén el cuerpo recto como una tabla, activa el abdomen.", videoUrl: "https://www.youtube.com/watch?v=pSHjTRCQxIw" },
    { nombre: "Zancadas", grupoMuscular: "Piernas", instrucciones: "Da un paso adelante, baja la rodilla trasera casi al suelo, vuelve a la posición inicial.", videoUrl: "https://www.youtube.com/watch?v=D7KaRcUTQeE" },
    { nombre: "Burpees", grupoMuscular: "Full Body", instrucciones: "Desde de pie: agáchate, pon manos en el suelo, salta a plancha, haz una flexión, salta hacia las manos y salta arriba.", videoUrl: "https://www.youtube.com/watch?v=JZQA08SlJnM" },
  ];

  const ejercicios = await db
    .insert(ejerciciosBibliotecaTable)
    .values(ejerciciosData.map((e) => ({ ...e, creadoPor: coach.id })))
    .returning();

  console.log(`✅ Created ${ejercicios.length} exercises in library`);

  // Seed routines for first client (week)
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const clienteEjemplo = clientes[0];
  const rutinasDias = [
    {
      diaSemana: 0,
      ejercicios: [
        { nombre: "Sentadilla", series: 4, repeticiones: "10-12", descanso: "90 seg", grupoMuscular: "Piernas", completado: false, instrucciones: "Pies al ancho de hombros", videoUrl: "https://www.youtube.com/watch?v=aclHkVaku9U" },
        { nombre: "Press de Banca", series: 3, repeticiones: "8-10", descanso: "90 seg", grupoMuscular: "Pecho", completado: false, instrucciones: "Agarre ancho", videoUrl: "https://www.youtube.com/watch?v=rT7DgCr-3pg" },
        { nombre: "Dominadas", series: 3, repeticiones: "6-8", descanso: "90 seg", grupoMuscular: "Espalda", completado: false, instrucciones: "Palmas hacia adelante", videoUrl: "https://www.youtube.com/watch?v=eGo4IYlbE5g" },
        { nombre: "Plancha", series: 3, repeticiones: "60 seg", descanso: "60 seg", grupoMuscular: "Core", completado: false, instrucciones: "Cuerpo recto", videoUrl: "https://www.youtube.com/watch?v=pSHjTRCQxIw" },
      ],
    },
    {
      diaSemana: 1,
      ejercicios: [
        { nombre: "Burpees", series: 4, repeticiones: "15", descanso: "60 seg", grupoMuscular: "Full Body", completado: false, instrucciones: "Técnica correcta", videoUrl: "https://www.youtube.com/watch?v=JZQA08SlJnM" },
        { nombre: "Zancadas", series: 3, repeticiones: "12 cada pierna", descanso: "60 seg", grupoMuscular: "Piernas", completado: false, instrucciones: "Rodilla alineada", videoUrl: "https://www.youtube.com/watch?v=D7KaRcUTQeE" },
      ],
    },
    {
      diaSemana: 2,
      ejercicios: [
        { nombre: "Peso Muerto", series: 4, repeticiones: "8-10", descanso: "120 seg", grupoMuscular: "Espalda", completado: false, instrucciones: "Espalda recta", videoUrl: "https://www.youtube.com/watch?v=op9kVnSso6Q" },
        { nombre: "Press Militar", series: 3, repeticiones: "10-12", descanso: "90 seg", grupoMuscular: "Hombros", completado: false, instrucciones: "Core activo", videoUrl: "https://www.youtube.com/watch?v=2yjwXTZQDDI" },
        { nombre: "Curl de Bíceps", series: 3, repeticiones: "12-15", descanso: "60 seg", grupoMuscular: "Bíceps", completado: false, instrucciones: "Sin balanceo", videoUrl: "https://www.youtube.com/watch?v=ykJmrZ5v0Oo" },
        { nombre: "Tríceps en Polea", series: 3, repeticiones: "12-15", descanso: "60 seg", grupoMuscular: "Tríceps", completado: false, instrucciones: "Codos fijos", videoUrl: "https://www.youtube.com/watch?v=2-LAMcpzODU" },
      ],
    },
  ];

  await db.insert(rutinasTable).values(
    rutinasDias.map((r) => ({
      clienteId: clienteEjemplo.id,
      coachId: coach.id,
      semanaInicio: weekStartStr,
      diaSemana: r.diaSemana,
      ejercicios: r.ejercicios,
      aprobada: true,
      notas: "Rutina de ejemplo para semana actual",
    }))
  );

  console.log("✅ Created sample routines");

  // Seed nutrition plan for first client
  const comidaDias = [0, 1, 2, 3, 4, 5, 6].map((dia) => ({
    clienteId: clienteEjemplo.id,
    coachId: coach.id,
    semanaInicio: weekStartStr,
    diaSemana: dia,
    comidas: [
      { nombre: "Desayuno", descripcion: "Avena con frutas y 2 huevos revueltos", calorias: 420, proteinas: 25, carbohidratos: 55, grasas: 12, completada: false },
      { nombre: "Media Mañana", descripcion: "Yogur griego con nueces", calorias: 180, proteinas: 12, carbohidratos: 15, grasas: 8, completada: false },
      { nombre: "Almuerzo", descripcion: "Pechuga de pollo a la plancha con arroz integral y vegetales salteados", calorias: 520, proteinas: 45, carbohidratos: 50, grasas: 14, completada: false },
      { nombre: "Merienda", descripcion: "Batido de proteína con plátano", calorias: 230, proteinas: 28, carbohidratos: 25, grasas: 5, completada: false },
      { nombre: "Cena", descripcion: "Salmón al horno con ensalada y aguacate", calorias: 450, proteinas: 40, carbohidratos: 15, grasas: 25, completada: false },
    ],
    caloriasTotal: 1800,
    aprobada: true,
    notas: "Plan de nutrición semanal",
  }));

  await db.insert(planesComidaTable).values(comidaDias);
  console.log("✅ Created sample nutrition plan");

  // Seed progress records (last 30 days)
  const progresoData = [];
  for (let i = 29; i >= 0; i--) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - i);
    if (i % 7 === 0) {
      const baseWeight = 78;
      const progress = ((29 - i) / 29) * 2;
      progresoData.push({
        clienteId: clienteEjemplo.id,
        fecha: fecha.toISOString().split("T")[0],
        pesoKg: +(baseWeight - progress + (Math.random() - 0.5) * 0.3).toFixed(1),
        grasaCorporal: +(28 - progress * 0.5 + (Math.random() - 0.5) * 0.2).toFixed(1),
        cinturaCm: +(82 - progress * 0.3).toFixed(1),
        masaMuscular: +(52 + progress * 0.3).toFixed(1),
        aguaCorporal: +(58 + progress * 0.1).toFixed(1),
        metabolismoBasal: 1650,
        notas: i === 0 ? "Medición semanal" : undefined,
      });
    }
  }

  if (progresoData.length > 0) {
    await db.insert(registrosProgresoTable).values(progresoData);
    console.log(`✅ Created ${progresoData.length} progress records`);
  }

  // Seed daily check-ins (last 14 days for all clients)
  const checkinsBulk = [];
  for (const cliente of clientes) {
    for (let i = 13; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      const adherencia = Math.floor(60 + Math.random() * 40);
      checkinsBulk.push({
        clienteId: cliente.id,
        fecha: fecha.toISOString().split("T")[0],
        ejerciciosCompletados: [0, 1, 2].filter(() => Math.random() > 0.3),
        comidasCompletadas: [0, 1, 2, 3, 4].filter(() => Math.random() > 0.2),
        porcentajeAdherencia: adherencia,
      });
    }
  }
  await db.insert(checkinsDiariosTable).values(checkinsBulk);
  console.log(`✅ Created ${checkinsBulk.length} daily check-ins`);

  // Seed emotional check-ins
  const emocionalesBulk = [];
  for (const cliente of clientes) {
    for (let i = 13; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      emocionalesBulk.push({
        clienteId: cliente.id,
        fecha: fecha.toISOString().split("T")[0],
        estadoAnimo: Math.floor(2 + Math.random() * 3) as 1 | 2 | 3 | 4 | 5,
        nivelEnergia: Math.floor(2 + Math.random() * 3) as 1 | 2 | 3 | 4 | 5,
        horasSueno: +(6 + Math.random() * 2.5).toFixed(1),
        notas: i === 0 ? "Me siento bien y motivada hoy" : undefined,
      });
    }
  }
  await db.insert(checkinsEmoccionalesTable).values(emocionalesBulk);
  console.log(`✅ Created ${emocionalesBulk.length} emotional check-ins`);

  // Seed diary entries for first client
  const diarioEntries = [];
  for (let i = 6; i >= 0; i--) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - i);
    diarioEntries.push({
      clienteId: clienteEjemplo.id,
      fecha: fecha.toISOString().split("T")[0],
      contenido: `Hoy fue un día ${i % 2 === 0 ? "excelente" : "retador"}. Completé mi rutina y me siento ${i % 2 === 0 ? "orgullosa de mi progreso" : "un poco cansada pero sigo adelante"}.`,
      gratitud: `Agradecida por ${i % 3 === 0 ? "mi salud" : i % 3 === 1 ? "mi coach y el apoyo recibido" : "la energía que tengo para entrenar"}`,
    });
  }
  await db.insert(diarioMentalidadTable).values(diarioEntries);
  console.log(`✅ Created ${diarioEntries.length} diary entries`);

  // Seed messages (coach <-> clients)
  const mensajesData = [];
  const conversaciones = [
    { clienteId: clientes[0].id, msgs: [
      { de: "coach", msg: "¡Hola María! ¿Cómo te fue con la rutina de hoy?" },
      { de: "cliente", msg: "¡Muy bien coach! Logré hacer todas las series de sentadillas 💪" },
      { de: "coach", msg: "¡Excelente! Tu progreso esta semana ha sido increíble. Sigue así." },
      { de: "cliente", msg: "Gracias! Tengo una pregunta sobre el plan de comidas..." },
    ]},
    { clienteId: clientes[1].id, msgs: [
      { de: "coach", msg: "Carlos, recuerda que mañana tenemos sesión presencial a las 7am" },
      { de: "cliente", msg: "Confirmado. ¿Traigo mis rodilleras?" },
      { de: "coach", msg: "Sí, mejor tráelas para el trabajo de piernas." },
    ]},
    { clienteId: clientes[2].id, msgs: [
      { de: "coach", msg: "Laura, vi tu check-in de hoy. ¡Qué adherencia tan alta!" },
      { de: "cliente", msg: "Estoy muy motivada este mes. El plan está funcionando." },
    ]},
  ];

  let msgTime = new Date();
  msgTime.setHours(msgTime.getHours() - 48);

  for (const conv of conversaciones) {
    for (const msg of conv.msgs) {
      msgTime = new Date(msgTime.getTime() + 1000 * 60 * 30);
      mensajesData.push({
        remitenteId: msg.de === "coach" ? coach.id : conv.clienteId,
        receptorId: msg.de === "coach" ? conv.clienteId : coach.id,
        contenido: msg.msg,
        leido: msg.de === "coach",
        creadoEn: msgTime,
      });
    }
  }

  await db.insert(mensajesTable).values(mensajesData);
  console.log(`✅ Created ${mensajesData.length} messages`);

  // Seed payments
  const pagosData = [];
  for (const cliente of clientes) {
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date();
      fecha.setMonth(fecha.getMonth() - i);
      fecha.setDate(1);
      const isLast = i === 0;
      pagosData.push({
        clienteId: cliente.id,
        fecha: fecha.toISOString().split("T")[0],
        monto: cliente.planTipo === "vip" ? 150 : cliente.planTipo === "premium" ? 100 : 60,
        metodo: ["zelle", "transferencia", "efectivo"][i % 3],
        concepto: `Mensualidad ${fecha.toLocaleString("es", { month: "long", year: "numeric" })} - Plan ${cliente.planTipo}`,
        estado: isLast && cliente.id === clientes[3].id ? "vencido" : "pagado",
        notas: null,
      });
    }
  }
  await db.insert(pagosTable).values(pagosData);
  console.log(`✅ Created ${pagosData.length} payment records`);

  console.log("\n🎉 Seed complete!");
  console.log("─────────────────────────────────────────");
  console.log("Admin:  admin@nahofit.life  / admin123");
  console.log("Coach:  coach@nahofit.life  / nahofit123");
  console.log("Cliente: maria@demo.life    / cliente123");
  console.log("─────────────────────────────────────────");
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  });
