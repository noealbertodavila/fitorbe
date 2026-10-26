import type { Request, Response, NextFunction } from "express";

/**
 * Protecciones del servidor (seguridad, 2026-10-26):
 *  - Cabeceras de seguridad (HSTS, nosniff, anti-iframe, referrer, permisos, CSP).
 *  - Lista fija de sitios que pueden llamar a la API desde otro dominio (CORS).
 *  - Límite de peticiones por IP para rutas públicas sensibles.
 *
 * La CSP se manda en modo "solo reportar" mientras CSP_ENFORCE no sea "true":
 * el navegador avisa en la consola lo que bloquearía, sin romper nada.
 */

// IP real del visitante. Render va detrás de Cloudflare, que pone
// cf-connecting-ip y no deja que el visitante la falsifique.
export function clientIp(req: Request): string {
  const cf = req.headers["cf-connecting-ip"];
  if (typeof cf === "string" && cf) return cf.trim();
  const tci = req.headers["true-client-ip"];
  if (typeof tci === "string" && tci) return tci.trim();
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff) return xff.split(",")[0]!.trim();
  return req.socket?.remoteAddress ?? "unknown";
}

// ── CORS ────────────────────────────────────────────────────────────────────
export function allowedOrigins(base: string[]): Set<string> {
  const extra = [
    process.env.RENDER_EXTERNAL_URL,
    process.env.APP_URL,
    ...(process.env.CORS_ORIGINS ?? "").split(","),
  ];
  const all = [...base, ...extra]
    .map((o) => (o ?? "").trim().replace(/\/+$/, ""))
    .filter(Boolean);
  if (process.env.NODE_ENV !== "production") {
    all.push("http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173");
  }
  return new Set(all);
}

/** Opción `origin` para el paquete cors: solo los sitios de la lista. */
export function corsOrigin(list: Set<string>) {
  return (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    // Sin Origin = misma página, app móvil o servidor: se permite.
    if (!origin) return cb(null, true);
    cb(null, list.has(origin));
  };
}

// ── Cabeceras ───────────────────────────────────────────────────────────────
export interface HeaderOptions {
  scriptHashes?: string[];
  connectSrc?: string[];
  permissions?: string;
}

export function buildCsp(opts: HeaderOptions = {}): string {
  const hashes = (opts.scriptHashes ?? []).map((h) => `'${h}'`).join(" ");
  const connect = ["'self'", ...(opts.connectSrc ?? [])].join(" ");
  return [
    "default-src 'self'",
    `script-src 'self'${hashes ? " " + hashes : ""}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    `connect-src ${connect}`,
    "media-src 'self' data: blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function securityHeaders(opts: HeaderOptions = {}) {
  const csp = buildCsp(opts);
  const cspHeader =
    process.env.CSP_ENFORCE === "true"
      ? "Content-Security-Policy"
      : "Content-Security-Policy-Report-Only";
  const permissions =
    opts.permissions ?? "camera=(self), geolocation=(self), microphone=(), payment=(), usb=()";
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", permissions);
    res.setHeader(cspHeader, csp);
    next();
  };
}

// ── Límite de peticiones ────────────────────────────────────────────────────
interface Bucket {
  count: number;
  start: number;
}

/**
 * Permite `max` peticiones por IP cada `windowMs`. Solo cuenta POST/PUT/PATCH/DELETE.
 * Guarda en memoria: se reinicia si el servidor se reinicia (suficiente contra robots).
 */
export function rateLimit(name: string, max: number, windowMs: number, message?: string) {
  const buckets = new Map<string, Bucket>();
  let lastSweep = Date.now();
  // Las pruebas automáticas (NODE_ENV=test) hacen muchas peticiones seguidas.
  const off = process.env.NODE_ENV === "test" || process.env.RATE_LIMIT_OFF === "true";
  return (req: Request, res: Response, next: NextFunction): void => {
    if (off) return next();
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
    const now = Date.now();
    if (now - lastSweep > windowMs) {
      for (const [k, b] of buckets) if (now - b.start > windowMs) buckets.delete(k);
      lastSweep = now;
    }
    const key = `${name}:${clientIp(req)}`;
    let b = buckets.get(key);
    if (!b || now - b.start > windowMs) {
      b = { count: 0, start: now };
      buckets.set(key, b);
    }
    b.count++;
    if (b.count > max) {
      const retry = Math.ceil((windowMs - (now - b.start)) / 1000);
      res.setHeader("Retry-After", String(retry));
      res.status(429).json({
        error: message ?? `Demasiadas solicitudes. Intenta de nuevo en ${Math.ceil(retry / 60)} minutos.`,
      });
      return;
    }
    next();
  };
}
