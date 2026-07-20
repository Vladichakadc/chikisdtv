# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication language

Always communicate with the user — explanations, status updates, summaries, and results — in Spanish (Colombian business context). This applies to all conversational output, not just UI copy (see the Spanish-copy note further down, which covers app strings specifically).

## Skills

Before coding or analysing anything, check the available skills list in the system-reminder and invoke the most relevant one using the Skill tool. Applicable skills for this project include (but are not limited to): `web-page-builder` and `frontend-design` for UI work, `feature-planning` before multi-file changes, `verify` after implementing a change, `code-review` for reviewing diffs, and `run` to launch and confirm the app works. Always invoke the matching skill first — do not skip it and implement directly.

## What this is

ChikisdTV is an internal management platform for an IPTV reseller business (Magis TV / Fire TV subscriptions sold in Colombia) — a CRM/back-office for the business owner and staff, not a customer-facing product. It tracks clients, plans, subscriptions, payments, devices, "bajas" (cancellations), "cuentas padre" (parent/shared accounts), screen costs, and a "planificador" (capacity/scheduling planner). There is no end-customer login or self-service portal, and none is planned — it's a single-tenant admin tool. Only the `admin` role can log into the web UI; `routes/auth.js` explicitly rejects login for any `Client` row whose `role` isn't `'admin'` (the `Client.role` enum still has a `'user'` value and ~260 legacy rows carry it from a historical import, but those accounts are inert — they exist as data, not as a feature).

Stack: Express + Sequelize (SQLite) backend, React + Vite + Tailwind frontend.

## Running the app

- Quickest: double-click / run `iniciar_aplicacion.bat` from the repo root — installs deps if missing and launches backend (port 4000) and frontend (port 5174) in separate terminals.
- Manual:
  - Backend: `cd server && npm run dev` (nodemon) or `npm start` — http://localhost:4000
  - Frontend: `cd client && npm run dev` — http://localhost:5174 (Vite dev server proxies `/api` → `http://localhost:4000`)
- Seeded admin login: `admin@chikisdtv.com` / `admin123` (created automatically on first boot if missing — see `seedAdminAndPlans()` in `server/server.js`).
- No test suite or lint config is set up in either package. To check the frontend compiles, run `cd client && npx vite build --mode development` (then remove the generated `dist/`).

## Architecture

### Backend (`server/`)

- `server.js` — app bootstrap: Helmet/CORS/JSON middleware, mounts `/api/auth` and `/api/admin`, serves `client/dist` in production, syncs Sequelize (`sequelize.sync()`) and seeds the admin user + default plans on every startup.
- `config/database.js` — single SQLite connection. DB file lives at repo root: `database.sqlite` (overridable via `DATABASE_PATH` env var).
- `config/jwt.js` — exports `JWT_SECRET` read from `process.env.JWT_SECRET`; **throws at require-time if unset** (no hardcoded fallback). `server/.env` must define it before the app will start.
- `models/` — Sequelize models, wired together in `models/index.js` (this is the only place associations are defined — read it to understand relations between entities). Core entities: `Client`, `Plan`, `Subscription`, `Payment`, `Device`. Plus business-specific tables imported from Excel: `Baja` (cancellations), `TablaCliente`, `Venta` (sales), `CuentaPadre` (shared/parent accounts), `CostoPantalla` (per-screen cost), `Planificador`. Note: `Subscription` and `Payment` are legacy — both were bulk-seeded once (2026-06-06) and are frozen since; they're not the source of truth for renewals/revenue analytics (that's `Venta`/`Planificador`/`Baja`), only for the admin CRUD pages that still read them (`SubscriptionsPage`, `PaymentsPage`).
- `routes/auth.js` — login and change-password, signed/verified with `config/jwt`. Login explicitly rejects any `Client` whose `role !== 'admin'` (403) — there is no customer-facing session type.
- `routes/admin/` — the bulk of the API, split by resource and aggregated in `routes/admin/index.js`, which applies `verifyToken` + `requireRole('admin')` to all of them via `router.use`: `dashboard.js` (stats + `/dashboard-bi` cross-module business-intelligence aggregations), `clients.js` (+ `tabla-clientes` sub-resource), `plans.js` (+ `/plans/performance`, per-plan revenue/cost/margin), `subscriptions.js`, `payments.js`, `ventasLicencia.js`, `devices.js`, `planificador.js`, `cuentasPadre.js`, `bajas.js`, `costoPantalla.js`. Several endpoints import/sync data from `.xlsx` files in `Tablas/` via the `xlsx` package (e.g. `importVentas()`).
- `middleware/authMiddleware.js` — `verifyToken`, `requireRole(role)`, `requireFreshPassword` (forces password change when `Client.mustChangePassword` is set).
- `middleware/asyncHandler.js` — wraps async route handlers so rejected promises are logged and turned into a `500` JSON response instead of needing per-route try/catch.

### Frontend (`client/`)

- Routing in `src/App.jsx`: everything lives under `/admin`, wrapped in `RequireAuth` (checks `localStorage.token`) and `DashboardLayout` — there is no separate customer-facing route tree. Admin pages under `src/pages/admin/`: DashboardHome, Clients, Plans, Subscriptions, Payments, Devices, Planificador, Bajas, CostoPantalla, CuentasPadre, VentaDispositivosPage (`/ventas-dispositivos`), plus the `Analisis*Page` family (Retención, Financiero, Dispositivos, Pagos, Clientes, Inventario, Bajas, Costo Pantalla) that pair with most operational pages as a submenu. `PlanificadorPage` has its own sub-component folder `src/pages/admin/planificador/` (StatCard, TableBits, CategoryPanel, EditModal).
- `src/config/api.js` — shared Axios instance; injects the JWT bearer token from `localStorage` on every request and force-redirects to `/login` on 401.
- `src/context/UiContext.jsx` — global UI state (sidebar open/closed, toast notifications) via React Context; consumed with `useUi()`.
- `src/layouts/DashboardLayout.jsx` — the admin shell (sidebar nav + header); `navItems` here is the single source of truth for the admin nav structure — add new admin pages both here and in `App.jsx`.
- `src/components/ui/` — shared primitives (`Button`, `Card`, `Input`, `Badge`, `DataTable`, `CurrencyInput`); prefer reusing/extending these over building new ad-hoc UI.
- `src/utils/cn.js` — `clsx` + `tailwind-merge` className helper used throughout.
- `src/utils/excelUtils.js` — client-side Excel export/import helpers used by admin pages that interact with `Tablas/*.xlsx`.
- Charts use `recharts` (e.g. `DashboardHome.jsx`'s business-intelligence sections: `ComposedChart`/`Bar`/`Cell`, `PieChart`, `ResponsiveContainer`, narrative `narrarX()` helpers that turn aggregated `/dashboard-bi` data into Spanish-language insight paragraphs rendered through `ChartInsight`).
- Tailwind theme (`tailwind.config.js`) defines the brand palette: `brand.primary` (#f97316 orange — the app's signature color), `brand.dark`, `brand.light`, `brand.accent` (slate-800 sidebar), plus `ui.*` (background/surface/border) and `state.*` (success/warning/error/info) semantic colors. Use these tokens rather than raw Tailwind colors for consistency.
- Vite dev server runs on port 5174 and proxies `/api/*` to the backend on 4000 (`vite.config.js`); `VITE_API_URL` in `client/.env` is `/api`.

## Data migration scripts

The `scratch_*.js` files at the repo root are one-off migration/inspection scripts used to import the original Excel-based bookkeeping (`Tablas/*.xlsx`) into the SQLite database (clients, subscriptions/payments/devices, bajas, costo-pantalla, etc.). They're invoked directly with `node scratch_<name>.js` (some require `--migrate`/`--analyze` flags — check the file's header comment first) and reference `server/config/database` and `server/models` directly. `run_analysis.bat` runs `scratch_analyze_db.js`. Treat these as historical/maintenance tools, not part of the running app — but they're useful references for understanding how spreadsheet columns map onto model fields (also see `bajas_columns.txt`).

## Notes

- `database.sqlite` at repo root is the live database — back it up before destructive migrations (`BACKUP_DIR` env var points at the configured backup location).
- `generar_informe.js` generates `Informe_ChikisdTV.pdf` (a technical report) using `pdfkit`.
- All UI strings and route labels are in Spanish (the business operates in Colombia) — keep new copy consistent with that.
