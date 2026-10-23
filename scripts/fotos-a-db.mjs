// Copia las fotos que están en artifacts/api-server/uploads a la tabla "archivos".
// Se corre una vez, donde estén las fotos viejas:
//   DATABASE_URL=... node scripts/fotos-a-db.mjs
// No borra nada del disco. Si una foto ya está en la tabla, la salta.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(path.resolve("lib/db/package.json"));
const pg = require("pg");

const BASE = path.resolve(process.argv[2] || "artifacts/api-server/uploads");
const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

function* archivos(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* archivos(p);
    else if (MIME[path.extname(e.name).toLowerCase()]) yield p;
  }
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
let nuevas = 0, yaEstaban = 0;
for (const p of archivos(BASE)) {
  const ruta = path.relative(BASE, p).split(path.sep).join("/");
  const m = ruta.match(/^progreso\/(\d+)\//);
  const r = await pool.query(
    "insert into archivos (ruta, mime, datos, cliente_id) values ($1,$2,$3,$4) on conflict (ruta) do nothing",
    [ruta, MIME[path.extname(p).toLowerCase()], fs.readFileSync(p).toString("base64"), m ? Number(m[1]) : null],
  );
  r.rowCount ? nuevas++ : yaEstaban++;
}
console.log(`Fotos copiadas: ${nuevas}. Ya estaban: ${yaEstaban}. Carpeta: ${BASE}`);
await pool.end();
