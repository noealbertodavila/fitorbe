import { Router, type IRouter } from "express";
import { createGzip } from "node:zlib";
import { timingSafeEqual } from "node:crypto";
import { pool } from "@workspace/db";

/**
 * Respaldo de la base de datos para guardarlo FUERA de Render.
 *
 * GET /api/respaldo con la cabecera  x-respaldo-secret: <secreto>
 * El secreto es RESPALDO_SECRET (variable de Render).
 * Devuelve un JSON comprimido (gzip) con todas las tablas, tomado en una sola
 * foto de la base (transacción de solo lectura). Sin el secreto responde 404.
 *
 * Lo pide cada domingo .github/workflows/respaldo.yml y lo guarda cifrado.
 * Para restaurar: lib/db/restaurar.mjs.
 */
const router: IRouter = Router();

function secretoValido(dado: unknown): boolean {
  const s = process.env.RESPALDO_SECRET || "";
  if (s.length < 24 || typeof dado !== "string") return false;
  const a = Buffer.from(dado);
  const b = Buffer.from(s);
  return a.length === b.length && timingSafeEqual(a, b);
}

const ident = (n: string) => '"' + n.replace(/"/g, '""') + '"';

router.get("/respaldo", async (req, res, next): Promise<void> => {
  if (!secretoValido(req.headers["x-respaldo-secret"])) {
    res.status(404).json({ error: "No encontrado" });
    return;
  }
  const client = await pool.connect();
  let empezado = false;
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const { rows: tablas } = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name`,
    );

    res.setHeader("Content-Type", "application/gzip");
    res.setHeader("Content-Disposition", 'attachment; filename="fitorbe-respaldo.json.gz"');
    res.setHeader("Cache-Control", "no-store");
    const gz = createGzip();
    gz.pipe(res);
    empezado = true;
    const escribir = (s: string) =>
      new Promise<void>((ok) => (gz.write(s) ? ok() : gz.once("drain", () => ok())));

    await escribir(
      `{"formato":"fitorbe-respaldo-1","fecha":${JSON.stringify(new Date().toISOString())},"tablas":{`,
    );
    for (let i = 0; i < tablas.length; i++) {
      const nombre = tablas[i]!.table_name;
      await escribir(`${i ? "," : ""}${JSON.stringify(nombre)}:[`);
      await client.query(`DECLARE c NO SCROLL CURSOR FOR SELECT * FROM ${ident(nombre)}`);
      let primera = true;
      for (;;) {
        const { rows } = await client.query("FETCH 500 FROM c");
        if (!rows.length) break;
        for (const fila of rows) {
          await escribir((primera ? "" : ",") + JSON.stringify(fila));
          primera = false;
        }
      }
      await client.query("CLOSE c");
      await escribir("]");
    }
    await escribir("}}");
    await client.query("COMMIT");
    gz.end();
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ya cerrada */
    }
    if (!empezado) next(err);
    else res.destroy(err as Error);
  } finally {
    client.release();
  }
});

export default router;
