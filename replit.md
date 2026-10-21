# NAHOFIT.LIFE — Workspace

## Overview

Full-stack fitness coaching platform in Spanish. pnpm monorepo with TypeScript.

## Project: NAHOFIT.LIFE

A professional fitness coaching web app with three roles: **admin**, **coach**, **cliente**.

### Brand — Verde Esmeralda
- Background: `#0A0F0D` (hsl 156 20% 5%)
- Cards/Sidebar: `#0F1A14` (hsl 147 27% 8%)
- Borders: `#1A2E20` (hsl 138 28% 14%)
- Accent: `#10B981` emerald green (hsl 160 84% 39%)
- Accent hover: `#059669`
- Text main: `#ECFDF5` (hsl 152 82% 96%)
- Muted foreground: hsl 148 22% 48%
- Primary foreground: white (#FFFFFF) — use `text-white` not `text-black` on primary buttons
- Fonts: Syne (headings) + DM Sans (body)

### Demo Accounts
| Role | Email | Password | Notes |
|------|-------|----------|-------|

### Features
- **Auth**: JWT tokens (SESSION_SECRET env var), bcryptjs password hashing
- **Rutinas**: 3-step modal (AI/manual → duration → client profile preview), draft CRUD with per-day "Regenerar IA" button, history panel
- **Nutrición**: Same 3-step modal pattern as Rutinas, draft editing with per-day regeneration, history panel
- **AI Model**: `claude-haiku-4-5` — uses full client profile (35+ fields) in prompts
- **Planes**: Admin full CRUD; Coach read-only view at `/coach/planes`; Premium card highlighted with green border
- **Client Profile**: Comprehensive 5-tab edit form (Personal, Físico, Fitness, Nutrición, Coach notes) — 35+ fields including objetivoPrincipal, diasDisponibles, duracionSesion, lugarEntrenamiento, tipoAlimentacion, comidasAlDia, etc.
- **Progreso**: Comprehensive monthly progress module — 3-step modal (Fotos/Medidas/Notas), 6-position photo uploads (multer, 5MB), full measurements (peso, grasa, IMC, 10 circumferences, 5 bioimpedance), monthly lock (1 record/month), timeline gallery with before/after comparison modal, Recharts evolution graphs (weight, body composition, circumferences). Photos saved to `uploads/progreso/{clienteId}/{yyyy-MM}/`, served from `/api/uploads/`. DB: `registros_progreso` table with all columns migrated (registradoPor, imc, brazo_der_cm, brazo_izq_cm, muslo_der_cm, muslo_izq_cm, pantorrilla_der_cm, pantorrilla_izq_cm, masa_grasa_kg, edad_metabolica, foto_frente, foto_espalda, foto_perfil_izq, foto_perfil_der, foto_extra1, foto_extra2, notas_coach, notas_cliente added via ALTER TABLE).
- **Check-ins**: Daily adherence tracking (exercises + meals)
- **Emocional**: Mood, energy, sleep tracking + mental diary
- **Mensajes**: Real-time messaging between coach and clients
- **Pagos**: Payment tracking and overdue alerts
- **Dashboard**: Role-specific dashboards for admin/coach/cliente
- **AI Chat**: Streaming AI fitness coach assistant (Nahomy persona)
- **Reportes**: Adherence charts and income reports
- **Landing Page**: Public marketing page at `/` with hero, features, how-it-works, about, pricing (loaded from API), testimonials, CTA, footer, and ES/EN language switcher
- **Timezone-agnostic dates**: Frontend uses `src/lib/date-mt.ts` helpers (`getFechaHoy()`, `getLunesMT()`, `getSaludo()`) based on browser local time. Backend does not hardcode TZ; uses UTC. Dashboard API accepts `?fecha=YYYY-MM-DD` from client for streak calculations.

### Coach Sidebar Nav
Dashboard, Clientes, Rutinas, Nutrición, Emocional, Mensajes, Reportes, Pagos, Planes y Precios

### Client Profile Fields (usuarios table)
sexo, peso, altura, grasaCorporalPct, complexion, objetivoPrincipal, pesoMeta, fechaMeta, nivelUrgencia, nivelFitness, diasDisponibles, duracionSesion, horarioPreferido, lugarEntrenamiento, equipamiento, condicionesMedicas, medicamentos, zonasEvitar, autorizacionMedica, lesiones, tipoAlimentacion, alergiasAlimentarias, alimentosNoConsume, comidasAlDia, cocinaEnCasa, presupuestoAlimentacion, suplementosActuales, aguaDiaria, ocupacion, horasSueno, nivelEstres, notasCoach, estrategiaEntrenamiento, prioridadesPrimerMes, modalidad, planTipo, fechaInicio

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/nahofit)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM (lib/db)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec in lib/api-spec)
- **AI**: Anthropic via Replit AI Integrations (lib/integrations-anthropic-ai)
- **Build**: esbuild (CJS bundle for API)

## DB Schema (lib/db/src/schema/nahofit.ts)
11 tables: `usuarios`, `rutinas`, `ejercicios_biblioteca`, `planes_comida`, `registros_progreso`, `checkins_diarios`, `checkins_emocionales`, `diario_mentalidad`, `mensajes`, `pagos`, + conversations/messages (for AI)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed:nahofit` — seed demo data

## Package Structure
- `artifacts/nahofit` — React + Vite frontend
- `artifacts/api-server` — Express API server (port from env PORT)
- `lib/db` — Drizzle ORM schemas + db client
- `lib/api-spec` — OpenAPI spec + orval codegen config
- `lib/api-zod` — Generated Zod schemas
- `lib/api-client-react` — Generated React Query hooks
- `lib/integrations-anthropic-ai` — Anthropic AI client
- `scripts` — Utility scripts (seed-nahofit.ts)

## API Routes (all under /api)
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET/POST/PUT/DELETE /api/usuarios`
- `GET/POST /api/clientes`, `GET /api/clientes/:id`
- `GET /api/dashboard/coach`, `GET /api/dashboard/admin`, `GET /api/dashboard/cliente/:id`
- `GET/POST /api/rutinas/:clienteId/:semanaInicio`, `POST /api/rutinas/generar-ai`
- `GET/POST /api/biblioteca-ejercicios`
- `GET/POST /api/planes-comida/:clienteId/:semanaInicio`, `POST /api/planes-comida/generar-ai`
- `GET/POST /api/progreso/:clienteId`
- `GET/POST /api/checkins/:clienteId/:fecha`, `GET /api/checkins/semana/:clienteId`
- `GET/POST /api/emocional/:clienteId`, `GET /api/emocional/alertas`
- `GET/POST /api/diario/:clienteId`
- `GET /api/mensajes/conversaciones`, `GET/POST /api/mensajes`, `PUT /api/mensajes/:id/leido`
- `GET /api/pagos/alertas`, `GET/POST /api/pagos/:clienteId`
- `GET /api/reportes/adherencia`, `GET /api/reportes/ingresos`
- `GET /api/ai/frase-motivacional/:clienteId`, `POST /api/ai/chat` (SSE streaming)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
