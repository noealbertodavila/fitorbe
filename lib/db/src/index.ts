import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool(opcionesConexion(process.env.DATABASE_URL));
export const db = drizzle(pool, { schema });

export * from "./schema";

/**
 * Render a veces da la dirección con ?sslmode=require. La versión nueva de pg
 * lo toma como "verificar el certificado" y Render usa uno propio, así que
 * falla con "self-signed certificate". Aquí se conecta cifrado sin esa
 * verificación, como hace psql con sslmode=require.
 */
export function opcionesConexion(url: string) {
  const u = new URL(url);
  const modo = u.searchParams.get("sslmode");
  if (!modo || modo === "disable") return { connectionString: url };
  u.searchParams.delete("sslmode");
  return { connectionString: u.toString(), ssl: { rejectUnauthorized: false } };
}
