import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// Igual que en src/index.ts: sslmode=require sin verificar el certificado de Render.
function credenciales(url: string) {
  const u = new URL(url);
  const modo = u.searchParams.get("sslmode");
  if (!modo || modo === "disable") return { url };
  return {
    host: u.hostname,
    port: Number(u.port || 5432),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
  };
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: credenciales(process.env.DATABASE_URL),
});
