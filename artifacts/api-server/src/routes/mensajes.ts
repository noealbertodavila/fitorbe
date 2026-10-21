import { Router } from "express";
import { db, mensajesTable, usuariosTable } from "@workspace/db";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/mensajes/conversaciones", requireAuth, async (req, res) => {
  const me = (req as any).usuario;

  // Get all distinct conversation partners
  const enviados = await db
    .select({ partnerId: mensajesTable.receptorId })
    .from(mensajesTable)
    .where(eq(mensajesTable.remitenteId, me.id));
  const recibidos = await db
    .select({ partnerId: mensajesTable.remitenteId })
    .from(mensajesTable)
    .where(eq(mensajesTable.receptorId, me.id));

  const partnerIds = new Set([
    ...enviados.map((m) => m.partnerId),
    ...recibidos.map((m) => m.partnerId),
  ]);

  const conversaciones = await Promise.all(
    [...partnerIds].map(async (partnerId) => {
      const [partner] = await db
        .select()
        .from(usuariosTable)
        .where(eq(usuariosTable.id, partnerId))
        .limit(1);

      const [ultimo] = await db
        .select()
        .from(mensajesTable)
        .where(
          or(
            and(
              eq(mensajesTable.remitenteId, me.id),
              eq(mensajesTable.receptorId, partnerId)
            ),
            and(
              eq(mensajesTable.remitenteId, partnerId),
              eq(mensajesTable.receptorId, me.id)
            )
          )
        )
        .orderBy(desc(mensajesTable.creadoEn))
        .limit(1);

      const noLeidos = await db
        .select()
        .from(mensajesTable)
        .where(
          and(
            eq(mensajesTable.remitenteId, partnerId),
            eq(mensajesTable.receptorId, me.id),
            eq(mensajesTable.leido, false)
          )
        );

      return {
        usuarioId: partnerId,
        usuarioNombre: partner?.nombre || "Usuario desconocido",
        ultimoMensaje: ultimo?.contenido || null,
        ultimaFecha: ultimo?.creadoEn?.toISOString() || null,
        noLeidos: noLeidos.length,
      };
    })
  );

  res.json(conversaciones);
});

router.get("/mensajes/no-leidos", requireAuth, async (req, res) => {
  const me = (req as any).usuario;
  const rows = await db
    .select()
    .from(mensajesTable)
    .where(
      and(
        eq(mensajesTable.receptorId, me.id),
        eq(mensajesTable.leido, false)
      )
    );
  res.json({ cantidad: rows.length });
});

router.get("/mensajes/:userId", requireAuth, async (req, res) => {
  const me = (req as any).usuario;
  // The path param is the conversation partner's ID (used by useGetMensajes hook)
  const pathUserId = parseInt(String(req.params.userId));
  // Also accept conUsuarioId as a query param for backwards compatibility
  const queryUserId = req.query.conUsuarioId ? parseInt(String(req.query.conUsuarioId)) : null;
  const otherId = queryUserId || (!isNaN(pathUserId) ? pathUserId : null);

  let rows;
  if (otherId) {
    rows = await db
      .select()
      .from(mensajesTable)
      .where(
        or(
          and(
            eq(mensajesTable.remitenteId, me.id),
            eq(mensajesTable.receptorId, otherId)
          ),
          and(
            eq(mensajesTable.remitenteId, otherId),
            eq(mensajesTable.receptorId, me.id)
          )
        )
      )
      .orderBy(mensajesTable.creadoEn);
  } else {
    rows = await db
      .select()
      .from(mensajesTable)
      .where(
        or(
          eq(mensajesTable.remitenteId, me.id),
          eq(mensajesTable.receptorId, me.id)
        )
      )
      .orderBy(desc(mensajesTable.creadoEn));
  }

  // Enrich with names
  const allUserIds = new Set([
    ...rows.map((m) => m.remitenteId),
    ...rows.map((m) => m.receptorId),
  ]);
  const users = await db.select().from(usuariosTable);
  const userMap = new Map(users.map((u) => [u.id, u.nombre]));

  const enriched = rows.map((m) => ({
    ...m,
    remitenteNombre: userMap.get(m.remitenteId) || null,
    receptorNombre: userMap.get(m.receptorId) || null,
  }));

  res.json(enriched);
});

router.post("/mensajes", requireAuth, async (req, res) => {
  const me = (req as any).usuario;
  const { receptorId, contenido } = req.body;
  const [receptor] = await db
    .select({ id: usuariosTable.id, rol: usuariosTable.rol, activo: usuariosTable.activo })
    .from(usuariosTable)
    .where(eq(usuariosTable.id, parseInt(String(receptorId))))
    .limit(1);
  // Un cliente solo le escribe a su coach o al admin, no a otros clientes.
  if (!receptor || !receptor.activo || (me.rol === "cliente" && receptor.rol === "cliente")) {
    res.status(403).json({ error: "No puedes enviar mensajes a este usuario" });
    return;
  }
  if (!contenido || !String(contenido).trim()) {
    res.status(400).json({ error: "Escribe un mensaje" });
    return;
  }
  const [created] = await db
    .insert(mensajesTable)
    .values({ remitenteId: me.id, receptorId, contenido, leido: false })
    .returning();

  const users = await db.select().from(usuariosTable);
  const userMap = new Map(users.map((u) => [u.id, u.nombre]));

  res.status(201).json({
    ...created,
    remitenteNombre: userMap.get(created.remitenteId) || null,
    receptorNombre: userMap.get(created.receptorId) || null,
  });
});

// Mark ALL unread messages for the current user as read (bulk)
router.put("/mensajes/marcar-leidos", requireAuth, async (req, res) => {
  const me = (req as any).usuario;
  await db
    .update(mensajesTable)
    .set({ leido: true })
    .where(and(eq(mensajesTable.receptorId, me.id), eq(mensajesTable.leido, false)));
  res.json({ ok: true });
});

router.put("/mensajes/:id/leido", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const me = (req as any).usuario;
  const [updated] = await db
    .update(mensajesTable)
    .set({ leido: true })
    .where(and(eq(mensajesTable.id, id), eq(mensajesTable.receptorId, me.id)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Mensaje no encontrado" });
    return;
  }
  const users = await db.select().from(usuariosTable);
  const userMap = new Map(users.map((u) => [u.id, u.nombre]));
  res.json({
    ...updated,
    remitenteNombre: userMap.get(updated.remitenteId) || null,
    receptorNombre: userMap.get(updated.receptorId) || null,
  });
});

export default router;
