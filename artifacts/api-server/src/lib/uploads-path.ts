import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Resolve uploads dir relative to this file's location so it's consistent
// in both dev (CWD = artifacts/api-server) and prod (CWD = workspace root).
// This file lives at src/lib/uploads-path.ts, compiled to dist/lib/uploads-path.mjs.
// Going two levels up from dist/lib → dist → api-server root → uploads/
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const UPLOADS_DIR = path.resolve(__dirname, "..", "uploads");

// Ensure the base uploads directory exists at startup
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
