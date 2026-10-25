import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import { db, archivosTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import router from "./routes";
import { logger } from "./lib/logger";
import { UPLOADS_DIR } from "./lib/uploads-path";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin: true,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Fotos de progreso: primero se buscan en la base de datos (tabla archivos);
// si no están, en la carpeta uploads (fotos viejas de antes del cambio).
async function servirArchivo(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ruta = decodeURIComponent(req.path.replace(/^\/+/, ""));
  if (!ruta || ruta.includes("..")) return next();
  try {
    const [a] = await db.select().from(archivosTable).where(eq(archivosTable.ruta, ruta)).limit(1);
    if (!a) return next();
    res.setHeader("Content-Type", a.mime);
    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
    res.send(Buffer.from(a.datos, "base64"));
  } catch (err) {
    next(err);
  }
}
app.use("/uploads", servirArchivo, express.static(UPLOADS_DIR));
app.use("/api/uploads", servirArchivo, express.static(UPLOADS_DIR));

app.use("/api", router);

// La página (React) compilada. Fuera de Replit este mismo servidor la entrega;
// cualquier ruta que no sea /api ni /uploads devuelve index.html.
const FRONTEND_DIR = process.env.FRONTEND_DIR || path.resolve(process.cwd(), "artifacts/nahofit/dist/public");
if (fs.existsSync(path.join(FRONTEND_DIR, "index.html"))) {
  app.use(express.static(FRONTEND_DIR, { index: false, maxAge: "1h", setHeaders(res, file) {
    if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  } }));
  // La página de inicio es HTML estático (rápida y legible para Google); el resto es la app.
  const INICIO = path.join(FRONTEND_DIR, "inicio.html");
  app.get(["/", "/inicio.html"], (req, res, next) => {
    if (!fs.existsSync(INICIO)) return next();
    if (req.path === "/inicio.html") return res.redirect(301, "/");
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(INICIO);
  });
  app.get(/^\/(?!api\/|uploads\/).*/, (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(FRONTEND_DIR, "index.html"));
  });
}

export default app;
