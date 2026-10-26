// Datos de ejemplo de Fitorbe (coach "Bienestar con Ana" con 6 clientes, rutinas, comida,
// ánimo, pagos y mensajes). Lo usan producto.mjs (fotos) y revision.mjs (revisión completa).
export async function sembrar(BASE) {
  const u = Date.now().toString(36);
  const api = async (method, path, token, body) => {
    const r = await fetch(BASE + "/api" + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => null);
    if (!r.ok) console.log("Aviso", method, path, r.status, JSON.stringify(j));
    return j;
  };
  const dia = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
  const lunes = (() => { const d = new Date(); const w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return d.toISOString().slice(0, 10); })();

  // ── Coach de ejemplo ──
  const coach = await api("POST", "/auth/registro-coach", null, { nombre: "Ana Torres", negocio: "Bienestar con Ana", email: `ana-${u}@ejemplo.test`, password: "clave-demo-123", acepta: true });
  const T = coach.token;

  const clientes = [
    ["María López", "Manejar el estrés y bajar 5 kg", [86, 92, 78, 100, 88, 95, 90], [4, 4, 3, 5, 4, 4, 5], 68.4],
    ["Lucía Pérez", "Dormir mejor y tener más energía", [70, 65, 80, 75, 90, 85, 80], [3, 3, 4, 3, 4, 4, 4], 61.2],
    ["Carmen Ruiz", "Ganar fuerza", [100, 95, 100, 90, 100, 85, 95], [5, 4, 5, 5, 4, 5, 5], 57.9],
    ["Sofía Martínez", "Volver a entrenar después del embarazo", [60, 72, 55, 80, 70, 0, 65], [3, 3, 3, 3, 2, 2, 2], 72.1],
    ["Daniela Gómez", "Hábitos y autoestima", [88, 90, 84, 92, 0, 86, 94], [4, 4, 5, 4, 3, 4, 4], 64.0],
    ["Valeria Castro", "Preparación para su primera carrera de 5K", [95, 90, 100, 92, 96, 88, 98], [5, 5, 4, 5, 5, 4, 5], 59.5],
  ];
  const ids = [];
  for (const [nombre, objetivo, adh, animo, peso] of clientes) {
    const primero = nombre.split(" ")[0].normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const c = await api("POST", "/clientes", T, { nombre, email: `${primero}-${u}@ejemplo.test`, password: "clave-demo-123", objetivo, telefono: "8015550100" });
    ids.push([c.id, primero]);
    for (let i = 0; i < 7; i++) {
      // Hoy solo algunos ya hicieron su check-in.
      if (i === 0 && !["María López", "Carmen Ruiz", "Valeria Castro", "Daniela Gómez"].includes(nombre)) continue;
      if (adh[6 - i] > 0) await api("POST", "/checkins", T, { clienteId: c.id, fecha: dia(i), ejerciciosCompletados: i === 0 ? ["Sentadilla con mancuerna", "Remo con banda"] : [], comidasCompletadas: [], porcentajeAdherencia: adh[6 - i] });
      await api("POST", "/emocional", T, { clienteId: c.id, fecha: dia(i), estadoAnimo: animo[6 - i], nivelEnergia: Math.min(5, animo[6 - i]), horasSueno: 6 + (animo[6 - i] % 3), notas: "" });
    }
    for (const [n, kg] of [[28, peso + 2.4], [14, peso + 1.1], [0, peso]]) await api("POST", "/progreso", T, { clienteId: c.id, fecha: dia(n), pesoKg: kg });
    const comidas = [
      { nombre: "Desayuno", descripcion: "Avena con fruta y yogur griego", calorias: 380, proteinas: 22, carbohidratos: 52, grasas: 9, hora: "8:00" },
      { nombre: "Comida", descripcion: "Pollo a la plancha, arroz y ensalada", calorias: 560, proteinas: 42, carbohidratos: 58, grasas: 16, hora: "13:30" },
      { nombre: "Merienda", descripcion: "Manzana con crema de cacahuate", calorias: 210, proteinas: 6, carbohidratos: 24, grasas: 11, hora: "17:00" },
      { nombre: "Cena", descripcion: "Tacos de pescado con verduras", calorias: 480, proteinas: 34, carbohidratos: 44, grasas: 17, hora: "20:00" },
    ];
    for (let d = 0; d < 7; d++) await api("POST", "/planes-comida", T, { clienteId: c.id, semanaInicio: lunes, diaSemana: d, comidas, caloriasTotal: 1630, aprobada: true, notas: "" });
    await api("POST", "/pagos", T, { clienteId: c.id, fecha: dia(3), monto: 149, metodo: "zelle", concepto: "Mensualidad", estado: nombre.startsWith("Sofía") ? "pendiente" : "pagado" });
    // Rutina de la semana
    const ej = [
      { nombre: "Sentadilla con mancuerna", series: 3, repeticiones: "12", descanso: "60 s", instrucciones: "Espalda recta, baja lento.", grupoMuscular: "Piernas" },
      { nombre: "Remo con banda", series: 3, repeticiones: "15", descanso: "45 s", instrucciones: "Junta los omóplatos al jalar.", grupoMuscular: "Espalda" },
      { nombre: "Puente de glúteo", series: 3, repeticiones: "15", descanso: "45 s", instrucciones: "Aprieta arriba 2 segundos.", grupoMuscular: "Glúteos" },
      { nombre: "Plancha", series: 3, repeticiones: "30 s", descanso: "30 s", instrucciones: "Abdomen firme, respira.", grupoMuscular: "Core" },
    ];
    for (let d = 0; d < 7; d++) await api("POST", "/rutinas", T, { clienteId: c.id, semanaInicio: lunes, diaSemana: d, ejercicios: ej, aprobada: true, notas: "" });
  }
  // Mensajes y solicitudes
  const [mariaId] = ids[0];
  const maria = await api("POST", "/auth/login", null, { email: `maria-${u}@ejemplo.test`, password: "clave-demo-123" });
  await api("POST", "/mensajes", T, { receptorId: mariaId, contenido: "¡Muy bien esta semana, María! ¿Cómo te sentiste con la rutina nueva?" });
  if (maria?.token) await api("POST", "/mensajes", maria.token, { receptorId: coach.usuario.id, contenido: "¡Súper bien! Dormí mejor y tengo más energía 💪" });
  await api("POST", "/contacto", null, { coach: coach.coach.slug, nombre: "Paola Rivas", telefono: "8015550123", interes: "primera_sesion", mensaje: "Quiero empezar con el plan emocional", acepta: true });
  return { T, coach, mariaId, mariaToken: maria?.token, u, api };
}
