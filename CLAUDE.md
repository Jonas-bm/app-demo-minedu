# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static, responsive demo ("maqueta") of **SIGATET / Sistema de Gestión ATET** for MINEDU–DITE (Peru). No backend, no build step, no framework, no dependencies. Plain HTML + CSS + vanilla JS (IIFEs attaching to `window`). Data comes from JSON files in `src/data/`; all user-generated state is persisted in `localStorage` / `sessionStorage`. All institutional data, signatures, report numbers and evaluation criteria are explicitly labelled as simulated.

The working language of the codebase, UI, comments, commits and docs is **Spanish** — match it.

## Running

No tooling. Serve the folder over HTTP (browsers block `fetch` of the JSON files over `file://`):

```
python3 -m http.server 8000     # then open http://localhost:8000/index.html
```

or VS Code Live Server. There are no tests, linters, or CI. "Testing" means manually walking the affected routes for each role and checking behaviour, console errors, responsive layout (from 320px), and basic regressions.

Demo logins (all password `demo2026`), from `src/config/credenciales.demo.js`:
`macro.demo` (Macro), `gestor.demo` (Gestor de la Información), `jefe.demo` (Jefe), `admin.demo` (Administrador).

## Architecture

### App shell and routing

- `index.html` — login. `src/assets/js/login.js` validates against `window.DEMO_USERS` plus admin-created users in `localStorage.demoAdminUsers`, writes `sessionStorage.demoSession`, then redirects to `src/pages/inicio.html`.
- `src/pages/inicio.html` — the single authenticated page: sidebar + topbar + `#module-dynamic` content area. It loads **every** module script up front via `<script>` tags (order matters — config files first, then `demo-store.js`, then `macro-contexto.js`, then feature modules, `inicio.js` last).
- `src/assets/js/inicio.js` — the router. Reads the session, builds the sidebar from `ROLE_MENUS`, and on `hashchange` calls `loadModule(hash)`. Each module is a global object exposing `render(container, isStillActive)` (the second arg is a predicate the module re-checks before async DOM writes, so a fast navigation away cancels the render). Navigation updates content, title, breadcrumb, URL hash and focus without reload.
- Route authorization lives entirely in `src/config/roles.js`: `ROLE_MENUS` (main routes per role), `DEMO_EXTRA_ROUTES` (exact/prefix sub-routes like `detalle-atet/{id}`), and `canAccessDemoRoute` / `isKnownDemoRoute`. `inicio.js` distinguishes "forbidden" (known route, wrong role) from "not-found". This is client-side demonstration only — `docs/MATRIZ_RUTAS_DEMO.md` is the audited source of truth for who can reach what.

### Roles

Four canonical roles in `src/config/roles.js` (`APP_ROLES`): `Macro`, `Gestor de la Información`, `Jefe`, `Administrador`. `normalizeDemoRole` maps aliases/accents to the canonical string. Feature modules are prefixed by audience: `jefe-*` (executive read-only dashboards), `gestor-*` (report workflow), unprefixed Macro modules (`dashboard.js`, `mis-atet.js`, `registrar-atet.js`, `entregables.js`, `historial.js`), and `admin.js` (one module rendering all `*-admin` views).

### Data and persistence

- `src/data/*.json` — `dashboard.json` (periods + deliverables), `personal.json` (seeded ATET records + assigned quota; keeps its legacy filename), `historial.json`, `catalogos.json` (regions, ámbitos, zonas, periods, states). Each module `fetch`es the JSON it needs with `../data/...` relative paths and memoizes the promise.
- `src/config/*.js` — non-secret configuration exposed on `window`: `roles.js`, `modulos.js` (view titles/descriptions), `denominacion.js`, `importacion.js`, `evaluacion.js` (the 8 evaluation products, catalogue `segundo-entregable-2025-v1`), `informe.js` (report templates).
- `src/config/demo-store.js` — `window.DEMO_STORE`, the write layer. Wraps `localStorage` keys `demoAtetRegistrations`, `demoDeliverablePresentations`, `demoEvaluations`, `demoEvaluationDrafts`, `demoReports`, `demoAtetAudit`, plus a `sessionStorage` flash message. Every mutating call also appends an audit entry. Evaluation drafts/records are filtered by `catalogoVersion` so a config bump invalidates stale local data.
- `credenciales.demo.js` (committed, public fake users) is what `index.html` actually loads. `credenciales.local.js` / `credenciales.example.js` are a legacy `.gitignore`d local-override mechanism; `.gitignore` also excludes `docs/` and `CONTEXTO_PROYECTO.md`.

### Macro context isolation (important, easy to break)

`src/assets/js/macro-contexto.js` (`window.MACRO_CONTEXT`) is the single source of truth for which data a logged-in Macro may see:

- `macro.demo` and the Gestor/Jefe read-only views → `isDemoMacro: true` → all seeded JSON shows unchanged.
- An Administrator-created Macro → `isDemoMacro: false` → sees only its `assignedQuota` (from `localStorage.demoMacroAssignments` matched by user id), the ATET it registered/imported (stamped with `macroUserId` via `stampOwnership`), and history rows it authored.

Any macro-side screen that reads `personal.json` / `dashboard.json` / `historial.json` MUST route through `MACRO_CONTEXT` (`effectivePersonal`, `effectiveDashboard`, `ownRegistrations`, `ownPresentations`, `ownEvaluations`, `isOwnAuthor`) instead of reading the JSON directly. Consumers today: `dashboard.js`, `mis-atet.js`, `historial.js`, `entregables.js`, `evaluacion.js` (render path only), `registrar-atet.js`, `importar-atet.js`, `admin.js`.

Administrator group assignment enforces a strict **1:1 macro ↔ region** relationship (`admin.js` `openMacroAssignmentModal` / `duplicateMacro` + `duplicateRegion` checks). Any change to assignment creation/editing must preserve both uniqueness checks. See AV-023 / AV-025 in `docs/MAPA_DE_CAMBIOS.md`.

### First-login password change

Admin-created users carry `contrasenaTemporal` + `debeCambiarContrasena`; `login.js` forces a password-change form on first sign-in and writes the new password back to `localStorage.demoAdminUsers`. A locally-created "Administrador" other than `admin.demo` is downgraded to `Jefe` on login.

## Conventions

- Keep HTML, CSS and JS in separate files. One IIFE per JS file, attach the public API to `window` as a frozen object.
- Responsive from 320px; sidebar collapses to an off-canvas drawer at ≤980px. Long forms use a 3-column grid (2 on medium, 1 on mobile).
- Cards are reserved for the Dashboard only — other modules start directly with their list/table.
- Never remove the session check at the top of `inicio.js` / each guarded flow.
- Do not put real passwords, real personal data, or sensitive information in JSON or JS — the app stays static and public.

## Documentation workflow (local only — `docs/` is git-ignored)

When `docs/` is present, development follows an incremental, task-by-task process:

- `docs/REQUISITOS_ETAPA_ACTUAL.md` — functional spec.
- `docs/PLAN_DESARROLLO_INCREMENTAL.md` — phases (F0–F10), task IDs, acceptance criteria.
- `docs/MAPA_DE_CAMBIOS.md` — **mandatory** changelog: one entry per task (ID, what changed, which requirement, files touched, how it was verified, decision, what's pending). Update it whenever you complete a unit of work.
- `docs/MATRIZ_RUTAS_DEMO.md`, `docs/MAPA_INFORME_CONFORMIDAD.md`, `docs/CRITERIOS_EVALUACION_DEMO.md` — audited route/permission matrix, per-field report traceability, evaluation-product rules.
- `CONTEXTO_PROYECTO.md` — running project summary; keep it current when adding a module or making a significant decision.
