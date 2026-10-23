import { localDateStr } from "../lib/date-mt";
import { Router } from "express";
import { db, usuariosTable, registrosProgresoTable, checkinsDiariosTable } from "@workspace/db";
import { eq, and, like, gte, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireAuth, requireRol, limpiarCambios, puedeVerCliente } from "../middlewares/auth";

const router = Router();

router.get("/clientes", requireAuth, requireRol("coach"), async (req, res) => {
  const me = (req as any).usuario;
  const { activo, nivel, objetivo, modalidad, buscar } = req.query;

  // Cada coach ve solo a sus clientes.
  let conditions = [eq(usuariosTable.rol, "cliente"), eq(usuariosTable.coachId, me.id)];
  if (activo !== undefined)
    conditions.push(eq(usuariosTable.activo, activo === "true"));
  if (nivel) conditions.push(eq(usuariosTable.nivelFitness, String(nivel)));
  if (objetivo) conditions.push(eq(usuariosTable.objetivo, String(objetivo)));
  if (modalidad)
    conditions.push(eq(usuariosTable.modalidad, String(modalidad)));

  const clientes = await db
    .select()
    .from(usuariosTable)
    .where(and(...conditions));

  const coachMap = new Map([[me.id, me.nombre]]);

  // Get last weight and weekly adherence for each client
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  const weekAgoStr = localDateStr(weekAgo);

  const result = await Promise.all(
    clientes
      .filter((c) => !buscar || c.nombre.toLowerCase().includes(String(buscar).toLowerCase()) || c.email.toLowerCase().includes(String(buscar).toLowerCase()))
      .map(async (c) => {
        const [lastWeight] = await db
          .select({ pesoKg: registrosProgresoTable.pesoKg })
          .from(registrosProgresoTable)
          .where(eq(registrosProgresoTable.clienteId, c.id))
          .orderBy(sql`${registrosProgresoTable.fecha} DESC`)
          .limit(1);

        const checkins = await db
          .select({ porcentaje: checkinsDiariosTable.porcentajeAdherencia })
          .from(checkinsDiariosTable)
          .where(
            and(
              eq(checkinsDiariosTable.clienteId, c.id),
              gte(checkinsDiariosTable.fecha, weekAgoStr)
            )
          );

        const adherencia =
          checkins.length > 0
            ? checkins.reduce((sum, ch) => sum + (ch.porcentaje || 0), 0) /
              checkins.length
            : 0;

        const { passwordHash: _, ...safe } = c;
        return {
          ...safe,
          coachNombre: c.coachId ? coachMap.get(c.coachId) || null : null,
          ultimoPeso: lastWeight?.pesoKg || null,
          adherenciaSemana: Math.round(adherencia),
        };
      })
  );

  res.json(result);
});

router.get("/clientes/:id", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const me = (req as any).usuario;

  // El cliente solo se ve a sí mismo; el coach, solo a sus clientes.
  if (isNaN(id) || !(await puedeVerCliente(me, id))) {
    res.status(403).json({ error: "Acceso denegado" });
    return;
  }

  const [cliente] = await db
    .select()
    .from(usuariosTable)
    .where(and(eq(usuariosTable.id, id), eq(usuariosTable.rol, "cliente")))
    .limit(1);

  if (!cliente) {
    res.status(404).json({ error: "Cliente no encontrado" });
    return;
  }

  const [coach] = cliente.coachId
    ? await db
        .select()
        .from(usuariosTable)
        .where(eq(usuariosTable.id, cliente.coachId))
        .limit(1)
    : [null];

  const [lastWeight] = await db
    .select({ pesoKg: registrosProgresoTable.pesoKg })
    .from(registrosProgresoTable)
    .where(eq(registrosProgresoTable.clienteId, id))
    .orderBy(sql`${registrosProgresoTable.fecha} DESC`)
    .limit(1);

  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  const weekAgoStr = localDateStr(weekAgo);

  const checkins = await db
    .select({ porcentaje: checkinsDiariosTable.porcentajeAdherencia })
    .from(checkinsDiariosTable)
    .where(
      and(
        eq(checkinsDiariosTable.clienteId, id),
        gte(checkinsDiariosTable.fecha, weekAgoStr)
      )
    );
  const adherencia =
    checkins.length > 0
      ? checkins.reduce((sum, ch) => sum + (ch.porcentaje || 0), 0) /
        checkins.length
      : 0;

  const { passwordHash: _, ...safe } = cliente;
  res.json({
    ...safe,
    coachNombre: coach?.nombre || null,
    ultimoPeso: lastWeight?.pesoKg || null,
    adherenciaSemana: Math.round(adherencia),
  });
});

router.put("/clientes/:id", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const me = (req as any).usuario;
  if (isNaN(id) || !(await puedeVerCliente(me, id))) {
    res.status(403).json({ error: "Acceso denegado" });
    return;
  }
  const { password, passwordHash, ...body } = req.body;
  const rest = limpiarCambios(me, body);
  if (Object.keys(rest).length === 0) {
    res.status(400).json({ error: "Nada que cambiar" });
    return;
  }
  const [updated] = await db
    .update(usuariosTable)
    .set(rest)
    .where(and(eq(usuariosTable.id, id), eq(usuariosTable.rol, "cliente")))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Cliente no encontrado" });
    return;
  }
  const { passwordHash: _, ...safe } = updated;
  res.json(safe);
});

// El coach agrega un cliente nuevo; queda como cliente de ese coach.
router.post("/clientes", requireAuth, requireRol("coach"), async (req, res) => {
  const me = (req as any).usuario;
  const nombre = String(req.body?.nombre ?? "").trim();
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  if (!nombre || !email) {
    res.status(400).json({ error: "Escribe el nombre y el correo del cliente" });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "El correo no es válido" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
    return;
  }
  const [existe] = await db.select({ id: usuariosTable.id }).from(usuariosTable).where(eq(usuariosTable.email, email)).limit(1);
  if (existe) {
    res.status(409).json({ error: "Ya hay una cuenta con ese correo" });
    return;
  }
  const { nombre: _n, email: _e, password: _p, ...resto } = req.body ?? {};
  const extra = limpiarCambios(me, resto);
  const [created] = await db
    .insert(usuariosTable)
    .values({ ...(extra as object), nombre, email, passwordHash: await bcrypt.hash(password, 10), rol: "cliente", coachId: me.id, activo: true })
    .returning();
  const { passwordHash: _, ...safe } = created;
  res.status(201).json(safe);
});

// El coach activa o desactiva a uno de sus clientes (no se borra nada).
router.patch("/clientes/:id/activo", requireAuth, requireRol("coach"), async (req, res) => {
  const me = (req as any).usuario;
  const id = parseInt(String(req.params.id));
  if (isNaN(id) || !(await puedeVerCliente(me, id))) {
    res.status(403).json({ error: "Acceso denegado" });
    return;
  }
  const [u] = await db
    .update(usuariosTable)
    .set({ activo: Boolean(req.body?.activo) })
    .where(and(eq(usuariosTable.id, id), eq(usuariosTable.rol, "cliente"), eq(usuariosTable.coachId, me.id)))
    .returning();
  if (!u) {
    res.status(404).json({ error: "Cliente no encontrado" });
    return;
  }
  res.json({ id: u.id, activo: u.activo });
});

export default router;
