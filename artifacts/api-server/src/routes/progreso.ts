import { localDateStr } from "../lib/date-mt";
import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { db, registrosProgresoTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, puedeVerCliente } from "../middlewares/auth";
import { UPLOADS_DIR } from "../lib/uploads-path";

const router = Router();

// ─── Multer config ────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const me = (req as any).usuario;
    const clienteId = me?.rol === "cliente" ? me.id : parseInt(String(req.body.clienteId)) || me?.id;
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const dir = path.join(UPLOADS_DIR, "progreso", String(clienteId), yearMonth);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${file.fieldname}_${Date.now()}_${crypto.randomBytes(12).toString("hex")}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (["image/jpeg", "image/png", "image/jpg", "image/webp"].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten imágenes JPG/PNG"));
    }
  },
});

const FOTO_FIELDS = [
  { name: "fotoFrente", maxCount: 1 },
  { name: "fotoEspalda", maxCount: 1 },
  { name: "fotoPerfilIzq", maxCount: 1 },
  { name: "fotoPerfilDer", maxCount: 1 },
  { name: "fotoExtra1", maxCount: 1 },
  { name: "fotoExtra2", maxCount: 1 },
];

// ─── GET all progreso for a client ───────────────────────────────────────────
router.get("/progreso/:clienteId", requireAuth, async (req, res) => {
  if (req.params.clienteId === "comparacion") {
    res.status(400).json({ error: "Use /progreso/:clienteId/comparacion" });
    return;
  }
  const clienteId = parseInt(String(req.params.clienteId));
  const limite = req.query.limite ? parseInt(String(req.query.limite)) : 60;
  const rows = await db
    .select()
    .from(registrosProgresoTable)
    .where(eq(registrosProgresoTable.clienteId, clienteId))
    .orderBy(desc(registrosProgresoTable.fecha))
    .limit(limite);
  res.json(rows);
});

// ─── GET comparison between two records ──────────────────────────────────────
router.get("/progreso/:clienteId/comparacion", requireAuth, async (req, res) => {
  const clienteId = parseInt(String(req.params.clienteId));
  const r1 = parseInt(String(req.query.r1));
  const r2 = parseInt(String(req.query.r2));
  if (!r1 || !r2) { res.status(400).json({ error: "Parámetros r1 y r2 requeridos" }); return; }

  const [rec1, rec2] = await Promise.all([
    db.select().from(registrosProgresoTable).where(and(eq(registrosProgresoTable.id, r1), eq(registrosProgresoTable.clienteId, clienteId))).then(r => r[0]),
    db.select().from(registrosProgresoTable).where(and(eq(registrosProgresoTable.id, r2), eq(registrosProgresoTable.clienteId, clienteId))).then(r => r[0]),
  ]);

  if (!rec1 || !rec2) { res.status(404).json({ error: "Registro no encontrado" }); return; }
  res.json({ registro1: rec1, registro2: rec2 });
});

// ─── POST create progreso (multipart/form-data with optional photos) ──────────
router.post("/progreso", requireAuth, upload.fields(FOTO_FIELDS), async (req, res) => {
  const me = (req as any).usuario;
  const files = (req as any).files as Record<string, Express.Multer.File[]> | undefined;
  const clienteId = me.rol === "cliente" ? me.id : parseInt(String(req.body.clienteId));
  if (isNaN(clienteId) || !(await puedeVerCliente(me, clienteId))) {
    res.status(403).json({ error: "Acceso denegado" });
    return;
  }

  const photoUrls: Record<string, string> = {};
  if (files) {
    for (const field of Object.keys(files)) {
      const file = files[field]?.[0];
      if (file) {
        const rel = path.relative(UPLOADS_DIR, file.path).replace(/\\/g, "/");
        photoUrls[field] = `/uploads/${rel}`;
      }
    }
  }

  const num = (v: any) => (v !== undefined && v !== "" && v !== null ? parseFloat(String(v)) : undefined);
  const int = (v: any) => (v !== undefined && v !== "" && v !== null ? parseInt(String(v)) : undefined);

  const values: any = {
    clienteId,
    registradoPor: me.id,
    fecha: req.body.fecha || localDateStr(),
    pesoKg: num(req.body.pesoKg),
    grasaCorporal: num(req.body.grasaCorporal),
    imc: num(req.body.imc),
    cuelloCm: num(req.body.cuelloCm),
    pechoCm: num(req.body.pechoCm),
    cinturaCm: num(req.body.cinturaCm),
    caderaCm: num(req.body.caderaCm),
    brazoDerCm: num(req.body.brazoDerCm),
    brazoIzqCm: num(req.body.brazoIzqCm),
    musloDerCm: num(req.body.musloDerCm),
    musloIzqCm: num(req.body.musloIzqCm),
    pantorrillaDerCm: num(req.body.pantorrillaDerCm),
    pantorrillaIzqCm: num(req.body.pantorrillaIzqCm),
    masaMuscular: num(req.body.masaMuscular),
    masaGrasaKg: num(req.body.masaGrasaKg),
    aguaCorporal: num(req.body.aguaCorporal),
    metabolismoBasal: int(req.body.metabolismoBasal),
    edadMetabolica: int(req.body.edadMetabolica),
    notasCliente: req.body.notasCliente || undefined,
    notasCoach: req.body.notasCoach || undefined,
    notas: req.body.notas || undefined,
    fotoFrente: photoUrls.fotoFrente,
    fotoEspalda: photoUrls.fotoEspalda,
    fotoPerfilIzq: photoUrls.fotoPerfilIzq,
    fotoPerfilDer: photoUrls.fotoPerfilDer,
    fotoExtra1: photoUrls.fotoExtra1,
    fotoExtra2: photoUrls.fotoExtra2,
  };

  // Strip undefined to let DB defaults apply
  Object.keys(values).forEach(k => { if (values[k] === undefined) delete values[k]; });

  const [created] = await db
    .insert(registrosProgresoTable)
    .values(values)
    .returning();

  res.status(201).json(created);
});

export default router;
