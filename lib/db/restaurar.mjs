// Restaura un respaldo de Fitorbe (fitorbe-respaldo-AAAA-MM-DD.json.gz) en una base VACÍA
// que ya tenga las tablas creadas.
//
//   1) Crear la base nueva y sus tablas:
//        DATABASE_URL="postgres://..." npx pnpm@10 --filter @workspace/db run push
//   2) Descifrar el respaldo (descargado de GitHub > Actions > Respaldo):
//        gpg -d fitorbe-AAAA-MM-DD.json.gz.gpg > fitorbe.json.gz
//   3) Cargarlo:
//        DATABASE_URL="postgres://..." node lib/db/restaurar.mjs fitorbe.json.gz
//
// Inserta las tablas en el orden que permitan las llaves foráneas y al final
// ajusta los contadores (id) para que los registros nuevos no choquen.
import fs from "node:fs";
import zlib from "node:zlib";
import pg from "pg";

const archivo = process.argv[2];
if (!archivo || !process.env.DATABASE_URL) {
  console.error('Uso: DATABASE_URL="postgres://..." node lib/db/restaurar.mjs respaldo.json.gz');
  process.exit(1);
}
const datos = JSON.parse(zlib.gunzipSync(fs.readFileSync(archivo)).toString("utf8"));
if (datos.formato !== "fitorbe-respaldo-1") throw new Error("No es un respaldo de Fitorbe");

const ident = (n) => '"' + String(n).replace(/"/g, '""') + '"';
// Render usa su propio certificado: se conecta con SSL sin verificarlo, como el servidor.
const url = new URL(process.env.DATABASE_URL);
const conSsl = url.searchParams.has("sslmode") || /render\.com$/.test(url.hostname);
url.searchParams.delete("sslmode");
const client = new pg.Client({
  connectionString: url.toString(),
  ssl: conSsl ? { rejectUnauthorized: false } : undefined,
});
await client.connect();

// Tipos de cada columna para convertir JSON (jsonb/json) correctamente.
const { rows: cols } = await client.query(
  `SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public'`,
);
const tipos = {};
for (const c of cols) (tipos[c.table_name] ??= {})[c.column_name] = c.data_type;

for (const t of Object.keys(datos.tablas)) {
  if (!tipos[t]) throw new Error(`La tabla ${t} no existe en la base nueva (corre primero el push)`);
  const { rows } = await client.query(`SELECT count(*)::int AS n FROM ${ident(t)}`);
  if (rows[0].n > 0) throw new Error(`La tabla ${t} ya tiene datos: usa una base vacía`);
}

async function cargar(t) {
  const filas = datos.tablas[t];
  if (!filas.length) return;
  const columnas = Object.keys(filas[0]);
  await client.query("BEGIN");
  try {
    for (let i = 0; i < filas.length; i += 200) {
      const lote = filas.slice(i, i + 200);
      const valores = [];
      const grupos = lote.map((f) => {
        const ph = columnas.map((c) => {
          let v = f[c];
          const tipo = tipos[t][c];
          if (v !== null && v !== undefined && (tipo === "json" || tipo === "jsonb")) v = JSON.stringify(v);
          valores.push(v === undefined ? null : v);
          return "$" + valores.length;
        });
        return "(" + ph.join(",") + ")";
      });
      await client.query(
        `INSERT INTO ${ident(t)} (${columnas.map(ident).join(",")}) VALUES ${grupos.join(",")}`,
        valores,
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
}

// Varias pasadas: una tabla que depende de otra entra cuando la otra ya está.
let pendientes = Object.keys(datos.tablas);
while (pendientes.length) {
  const fallidas = [];
  let ultimoError;
  for (const t of pendientes) {
    try {
      await cargar(t);
      console.log(`✓ ${t}: ${datos.tablas[t].length} filas`);
    } catch (e) {
      if (e.code !== "23503") throw e; // solo reintentar por llave foránea
      fallidas.push(t);
      ultimoError = e;
    }
  }
  if (fallidas.length === pendientes.length) throw ultimoError;
  pendientes = fallidas;
}

// Contadores de id (serial / identity).
const { rows: seqs } = await client.query(
  `SELECT table_name, column_name, pg_get_serial_sequence(quote_ident(table_name), column_name) AS seq
     FROM information_schema.columns
    WHERE table_schema = 'public' AND pg_get_serial_sequence(quote_ident(table_name), column_name) IS NOT NULL`,
);
for (const s of seqs) {
  await client.query(
    `SELECT setval($1, COALESCE((SELECT MAX(${ident(s.column_name)}) FROM ${ident(s.table_name)}), 0) + 1, false)`,
    [s.seq],
  );
}
await client.end();
console.log(`Listo: respaldo del ${datos.fecha} restaurado.`);
