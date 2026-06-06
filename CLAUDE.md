# CLAUDE.md — BarManager

Onboarding notes for working in this repo. Written for an AI agent. Keep it current.

## Project summary
BarManager is a single-page restaurant/bar management web app. It gives a small team
role-based tools for: inventory tracking, monthly shift scheduling, daily opening/closing
checklists, time-off requests, team management, and announcements. Built to run entirely on
free tiers (Supabase + Netlify). All persistent data lives in Supabase; there is **no
local-storage fallback**.

## Tech stack
- **Language:** JavaScript (JSX), ES modules. No TypeScript despite `@types/*` devDeps.
- **Framework:** React 18 (`react`, `react-dom`), client-only SPA.
- **Build:** Vite 5 (`@vitejs/plugin-react`).
- **Routing:** react-router-dom 6 (`BrowserRouter`, nested routes).
- **Styling:** Tailwind CSS 3 + PostCSS + autoprefixer. Custom theme colors in `tailwind.config.js`.
- **Icons:** `@heroicons/react/24/outline`.
- **Backend:** Supabase (`@supabase/supabase-js` v2) — Auth + Postgres + Row-Level Security.
- **Hosting:** Netlify (`netlify.toml`), SPA redirect `/* -> /index.html`.
- **Runtime:** Node for build/dev tooling; app runs in the browser. No test runner installed.

## Project structure
- `src/main.jsx` — React entry; mounts `<App/>` into `#root` under StrictMode.
- `src/App.jsx` — Router + auth/role route guards (the most important file to understand flow).
- `src/lib/supabase.js` — Supabase client singleton + `TABLES` name constants.
- `src/context/AuthContext.jsx` — Auth state, session listener, profile fetch, `signIn/signUp/signOut`.
- `src/hooks/usePermissions.js` — RBAC logic and `ROLE_HIERARCHY`.
- `src/components/Layout.jsx` — Sidebar/mobile nav shell; filters nav items by role; renders `<Outlet/>`.
- `src/components/Notifications.jsx` — Toast + confirm-dialog provider; **monkey-patches `window.alert`** to route to toasts.
- `src/pages/*.jsx` — One file per route (see Entry points / route table below).
- `src/index.css` — Global styles + Tailwind layers; custom utility classes like `btn-secondary` live here.
- `migrations/` and `supabase/migrations/` — **two** SQL migration dirs (see Migrations note).
- `dist/` — build output (generated; do not edit).
- `public/_redirects`, `.netlify/secret-scan-ignore` — Netlify config artifacts.
- Docs: `README.md` (most complete), `SETUP.md`, `SPEC.md`, `RBAC_GUIDE.md`, `MANAGEMENT_GUIDE.md`,
  `BARMANAGER_USER_GUIDE.md`, `TESTING.md` (manual test plan — no automated tests exist).

## Entry points
- **`src/main.jsx`** → renders `App`.
- **`src/App.jsx`** → wraps everything in `BrowserRouter > AuthProvider > NotificationsProvider > AppRouter`.
  - `ProtectedRoute` gates on: loading → `user` (else `/login`) → `profile` loaded → `isPending/isRejected`
    (→ `/pending-approval`) → `requiredRole` via `hasRole` (else redirect to `/`).
  - Route table:
    - `/login`, `/signup` — public (redirect away if logged in).
    - `/pending-approval` — logged-in but unapproved users.
    - `/` (Layout) → index `Dashboard`; `schedule`, `checklists`, `timeoff` (any approved user);
      `inventory` and `settings` (require **manager**); `admin` (require **admin**).
- **`AuthContext`** is the source of truth for `user`, `profile`, `role`, `status`, and the `isAdmin/isManager/...` flags.

## Dev commands
- Install: `npm install`
- Run dev server: `npm run dev` (Vite, default http://localhost:5173)
- Build: `npm run build` → `dist/`
- Preview prod build: `npm run preview`
- **Lint:** none configured. **Test:** none automated — `TESTING.md` is a manual checklist.
- Deploy: push to GitHub; Netlify builds with `npm run build`, publishes `dist/`. Env vars set in Netlify dashboard.
- Env: copy `.env.example` → `.env`, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
  These are bundled client-side (anon key only); Netlify secret-scanning is intentionally relaxed for them.

## Architecture notes
- Pure client SPA → Supabase. Each page component does its own data fetching directly via the
  `supabase` client (no shared data layer / API module / react-query). Pattern per page:
  `useState` for rows + `useEffect`/`useCallback` to `supabase.from(TABLES.X).select/insert/update/delete`.
- Auth flow: Supabase Auth (email/password). On signup a DB trigger (`handle_new_user`) creates a
  `profiles` row. New users start `status='pending'` and must be approved by an admin before reaching the app.
- RBAC: roles `admin(4) > manager(3) > staff(2) > viewer(1)` (`usePermissions.ROLE_HIERARCHY`).
  `hasRole(x)` returns true only if approved AND role level ≥ x. Route guards AND nav filtering both
  use it — keep them in sync. RLS policies in `supabase/migrations` enforce access server-side too.
- Notifications: call `useNotifications().notify(msg, type)` for toasts and `confirmAction({...})`
  (returns a Promise<boolean>) instead of `window.confirm`. Legacy `alert()` calls are auto-rerouted to toasts.
- Tables (via `TABLES` const + migrations): `profiles`, `inventory_items`, `shifts`, `checklists`,
  `time_off_requests`, plus `announcements`, `roles`, `user_roles` (added by migrations; not all in `TABLES`).

## Key conventions
- One route = one file in `src/pages/`, default-exported PascalCase component matching the filename.
- Tailwind custom colors: `bar-dark`, `bar-card`, `bar-accent`, `bar-blue` — use these, not raw hex.
- Date handling in Schedule uses explicit helpers (`formatDateForSupabase`, `parseSupabaseDate`) to avoid
  TZ bugs; months are **zero-indexed in JS state but 1-indexed in date strings**. Don't mix them.
- Name matching/dedup uses `normalizeName` (trim + lowercase) — reuse it rather than ad-hoc compares.
- CSV in Inventory uses hand-rolled `parseCSV`/`csvEscape` (RFC-style quoting). Headers: `name,quantity,unit,threshold,category`.
- Gate UI by role with `usePermissions` flags; gate routes with `<ProtectedRoute requiredRole="...">`.
- Use `notify`/`confirmAction`, not native `alert`/`confirm`.

## Known issues / tech debt
- **No automated tests, no linter.** Verification is manual (`TESTING.md`). Be careful with refactors.
- `src/App.jsx` line ~82 (`settings` route) has mangled/minified JSX whitespace — works but is ugly; tidy if touched.
- **Two migration directories** (`migrations/` and `supabase/migrations/`) with overlapping/idempotent
  `ALTER TABLE` statements and some duplicated `checklists` constraints — schema is the product of running
  all of them in chronological order. Treat the live DB as source of truth; don't assume a single clean schema.
- `TABLES` const is incomplete (missing `announcements`, `roles`, `user_roles`) — some pages query table names as string literals.
- `time_off_requests` has redundant columns from schema evolution (`dates`, `days`, `month`, `year`, `name`, `user_id`).
- `Schedule.jsx` is large (~1600 lines) and holds most scheduling complexity (build month, copy week, conflict detection).
- "Copy Week" feature exists in code but its UI is intentionally hidden in the current release.

## Where to look first
- **Auth / login / approval / roles:** `AuthContext.jsx`, `usePermissions.js`, `App.jsx` (guards),
  `pages/Login.jsx`, `pages/SignUp.jsx`, `pages/PendingApproval.jsx`, `RBAC_GUIDE.md`.
- **Admin / user management:** `pages/Admin.jsx` (+ `supabase/migrations/*add_rbac*`, `*removed_status*`).
- **Inventory:** `pages/Inventory.jsx` (CSV import/export + low-stock thresholds).
- **Scheduling:** `pages/Schedule.jsx` (calendar, shifts, conflict detection, build-month).
- **Checklists:** `pages/Checklists.jsx` (+ `*add_team_checklists*` migration).
- **Time off:** `pages/TimeOff.jsx`.
- **Backup / export-import:** `pages/Settings.jsx`.
- **Nav / shell / layout:** `components/Layout.jsx`.
- **DB schema / migrations:** `migrations/` then `supabase/migrations/` (chronological by filename).

## What NOT to touch
- `node_modules/` — dependencies.
- `dist/` — build output, regenerated by `npm run build`.
- `package-lock.json` — only change via npm, never hand-edit.
- `.netlify/` and `netlify.toml` redirect/secret-scan config — change only with deploy intent.
- **Already-applied migration files** — do not edit existing SQL migrations; add a new dated file instead
  (existing ones may already be applied to the live Supabase DB).
- `.env` (not committed) — never commit real Supabase credentials.
```
