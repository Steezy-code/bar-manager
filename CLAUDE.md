# CLAUDE.md — BarManager

Onboarding notes for working in this repo. Written for an AI agent. Keep it current.

## Project summary
BarManager is a single-page restaurant/bar management web app. It gives a small team
role-based tools for: inventory tracking, monthly shift scheduling, daily opening/closing
checklists, time-off requests, team management, and announcements. Built to run entirely on
free tiers (Supabase + Netlify). All persistent data lives in Supabase; there is **no
local-storage fallback** for the real backend.

**This is a public portfolio repo** (flipped from private, with a full git-history secret/PII
scrub, in mid-2026). It ships in **demo mode by default** — `VITE_DEMO_MODE` defaults to on,
which swaps the real Supabase client for an in-memory mock (`src/lib/supabaseMock.js`, seeded
from `src/lib/demoData.js`), so `npm install && npm run dev` runs the full app with zero backend
setup. Set `VITE_DEMO_MODE=false` and fill in `.env` to use a real Supabase project instead.

## Tech stack
- **Language:** JavaScript (JSX), ES modules. No TypeScript despite `@types/*` devDeps.
- **Framework:** React 18 (`react`, `react-dom`), client-only SPA.
- **Build:** Vite 8 (`@vitejs/plugin-react` 6).
- **Routing:** react-router-dom 7 (`BrowserRouter`, nested routes — classic/compat API, not the v7 data router).
- **Styling:** Tailwind CSS 3 + PostCSS + autoprefixer. Custom theme colors in `tailwind.config.js`.
- **Icons:** `@heroicons/react/24/outline`.
- **Backend:** Supabase (`@supabase/supabase-js` v2) — Auth + Postgres + Row-Level Security. Swappable
  for the in-memory mock in demo mode (see above).
- **Hosting:** Netlify (`netlify.toml`), SPA redirect `/* -> /index.html`.
- **Runtime:** Node for build/dev tooling; app runs in the browser. No test runner installed
  (`scripts/check-mock.mjs` is a small plain-Node self-check for the mock client's query builder).

## Project structure
- `src/main.jsx` — React entry; mounts `<App/>` into `#root` under StrictMode.
- `src/App.jsx` — Router + auth/role route guards (the most important file to understand flow).
- `src/lib/supabase.js` — Exports the real Supabase client or the demo mock (by `VITE_DEMO_MODE`) +
  `TABLES` name constants.
- `src/lib/supabaseMock.js` — In-memory Supabase client for demo mode (auth + chainable query builder + RPC).
- `src/lib/demoData.js` — Seed data for demo mode.
- `src/lib/csv.js` — Shared RFC-style `parseCSV`/`csvEscape`, used by Inventory and Schedule.
- `src/context/AuthContext.jsx` — Auth state, session listener, profile fetch, `signIn/signUp/signOut`.
- `src/hooks/usePermissions.js` — RBAC logic and `ROLE_HIERARCHY`.
- `src/components/Layout.jsx` — Sidebar/mobile nav shell for `/app`; filters nav items by role,
  folds overflow into a mobile "More" sheet, renders `<Outlet/>`.
- `src/components/Notifications.jsx` — Toast + confirm-dialog provider; **monkey-patches `window.alert`** to route to toasts.
- `src/pages/Landing.jsx` — Public marketing/portfolio landing page at `/`.
- `src/pages/*.jsx` — One file per route (see Entry points / route table below). `Login.jsx`,
  `SignUp.jsx`, `PendingApproval.jsx` still exist but are currently unrouted (no `/login` etc. in
  `App.jsx`) — kept for a future real-backend deployment, not reachable in the current build.
- `src/index.css` — Global styles + Tailwind layers; custom utility classes like `btn-secondary` live here.
- `migrations/` and `supabase/migrations/` — **two** SQL migration dirs (see Migrations note).
- `dist/` — build output (generated; do not edit).
- `public/_redirects`, `.netlify/secret-scan-ignore` — Netlify config artifacts.
- `.github/CODEOWNERS` — `* @Steezy-code`; required for the code-owner-review branch protection on `main`.
- `LICENSE` — MIT.
- `FINDINGS.md` — a point-in-time security/bug-hunt audit report. **Gitignored, not tracked** — kept
  locally only; purged from all of `main`'s git history before the repo went public. Don't re-add it.
- Docs: `README.md` (most complete, and the one to keep current for outside readers), `SETUP.md`,
  `SPEC.md`, `RBAC_GUIDE.md`, `MANAGEMENT_GUIDE.md`, `BARMANAGER_USER_GUIDE.md`,
  `TESTING.md` (manual test plan — no automated tests exist).

## Entry points
- **`src/main.jsx`** → renders `App`.
- **`src/App.jsx`** → wraps everything in `BrowserRouter > AuthProvider > NotificationsProvider > AppRouter`.
  - `ProtectedRoute` gates on: loading → `user` (else redirect to `/`, since `/login` isn't routed) →
    `profile` loaded → `!isApproved` (→ `/pending-approval`) → `requiredRole` via `hasRole`
    (else redirect to `/app`).
  - Route table:
    - `/` — public `Landing` page (marketing/portfolio front door; not gated).
    - `/pending-approval` — logged-in but unapproved users (only reachable with a real backend;
      the demo session is always a pre-approved admin).
    - `/app` (Layout) → index `Dashboard`; `schedule`, `checklists`, `timeoff` (any approved user);
      `inventory` and `settings` (require **manager**); `admin` (require **admin**).
  - `/login`, `/signup` are **not** in the route table currently — see `Login.jsx`/`SignUp.jsx` note above.
- **`AuthContext`** is the source of truth for `user`, `profile`, `role`, `status`, and the `isAdmin/isManager/...` flags.
  In demo mode, `supabaseMock.js`'s `auth.getSession()`/`onAuthStateChange` hand back a fixed
  pre-approved admin session, so every guard passes and every role-gated feature is reachable.

## Dev commands
- Install: `npm install`
- Run dev server: `npm run dev` (Vite, default http://localhost:5173) — demo mode by default, no `.env` needed.
- Build: `npm run build` → `dist/`
- Preview prod build: `npm run preview`
- Mock self-check: `node scripts/check-mock.mjs`
- **Lint:** none configured. **Test:** none automated — `TESTING.md` is a manual checklist.
- Deploy: push to GitHub; Netlify builds with `npm run build`, publishes `dist/`. Env vars set in Netlify dashboard.
- Env (only needed for `VITE_DEMO_MODE=false`, real-backend mode): copy `.env.example` → `.env`, set
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. These are bundled client-side (anon key only);
  Netlify secret-scanning is intentionally relaxed for them.

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
  `time_off_requests`, plus `announcements`, `roles`, `user_roles`. `TABLES` now lists all of these.
- RLS gates every read/write on `status='approved'` **and** role (migration `20260612000000`). A user
  whose status is later set to `pending`/`rejected`/`removed` loses DB access even if their role row still
  says manager/admin. Route guards (`ProtectedRoute`) mirror this: any non-approved status → `/pending-approval`.
- Backup restore runs server-side in one transaction via the `restore_operational_backup(payload)` RPC
  (migration `20260612000100`), not client-side delete-then-insert.

## Key conventions
- One route = one file in `src/pages/`, default-exported PascalCase component matching the filename.
- Tailwind custom colors: `bar-dark`, `bar-card`, `bar-accent`, `bar-blue` — use these, not raw hex.
- Date handling in Schedule uses explicit helpers (`formatDateForSupabase`, `parseSupabaseDate`) to avoid
  TZ bugs; months are **zero-indexed in JS state but 1-indexed in date strings**. Don't mix them.
- Name matching/dedup uses `normalizeName` (trim + lowercase) — reuse it rather than ad-hoc compares.
- CSV uses shared `parseCSV`/`csvEscape` in `src/lib/csv.js` (RFC-style quoting); both Inventory and Schedule
  import/export through it. Inventory headers: `name,quantity,unit,threshold,category`.
- Gate UI by role with `usePermissions` flags; gate routes with `<ProtectedRoute requiredRole="...">`.
- Use `notify`/`confirmAction`, not native `alert`/`confirm`.

## Known issues / tech debt
- **No automated tests, no linter.** Verification is manual (`TESTING.md`). Be careful with refactors.
- **Two migration directories** (`migrations/` and `supabase/migrations/`) with overlapping/idempotent
  `ALTER TABLE` statements and some duplicated `checklists` constraints — schema is the product of running
  all of them in chronological order. Treat the live DB as source of truth; don't assume a single clean schema.
- `time_off_requests` has redundant columns from schema evolution (`dates`, `days`, `month`, `year`, `name`, `user_id`).
  Stored `month` is zero-indexed (0–11), enforced by migration `20260408040000`; a 1-indexed fallback heuristic
  remains in `Schedule`/`TimeOff` reads for resilience but `clearAll` deletes by row id to stay convention-safe.
- `Schedule.jsx` is large (~1600 lines) and holds most scheduling complexity (build month, copy week, conflict detection).
- "Copy Week" feature exists in code but its UI is intentionally hidden in the current release.
- Migrations `20260612000000` (approved-status RLS) and `20260612000100` (restore RPC) are **applied to
  the live Supabase project** (verified). If you ever point this app at a *different* Supabase project,
  re-apply the full migration chain first — the client degrades safely if they're missing, but silently
  (falls back to role-only checks / client-side restore).

## Public-repo workflow
- **Per-feature branches, not a long-lived one.** Cut `feature/<name>` or `fix/<name>` off `main`, PR it
  back in, delete the branch after merge. (The repo used to funnel everything through one recurring
  `Improvements` branch across ~20 PRs — that branch is gone now; don't recreate that pattern.)
- **Branch protection on `main`:** 1 required approving review + CODEOWNERS (`.github/CODEOWNERS`),
  force-push and branch deletion blocked. `enforce_admins` is **off**, so the repo owner can bypass-merge
  their own solo PRs (`gh pr merge --admin`) — a future external contributor's PR would genuinely need
  the owner's review. Don't turn `enforce_admins` on without also removing the owner from the approval
  requirement — GitHub forbids self-approval, so that combination permanently locks a solo owner out.
- **Secret scanning, push protection, and Dependabot security updates are enabled** on the repo. Dependabot
  will open PRs for vulnerable deps automatically — test major-version bumps for real (build + actual
  browser click-through) before merging, don't merge on trust.
- If you ever need to rewrite git history again (secret leak, etc.): do it in an isolated scratch clone
  (never the live working directory), verify with `git rev-list --objects --all | grep ...` before
  pushing, force-push, then verify a *second* time via a fresh independent clone — don't trust the
  pushing clone's own view of its state.

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
- `FINDINGS.md` — gitignored on purpose; don't `git add -A` it back in.
