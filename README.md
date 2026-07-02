# BarManager - Restaurant Management App

A free, full‑featured restaurant management system built with React, Supabase, and deployable on Netlify.

> 🍻 **Try it live, no setup required:** the app ships in **demo mode** by default — an in-memory mock stands
> in for Supabase, seeded with realistic sample data, so `npm install && npm run dev` gives you the full app
> (scheduling, inventory, checklists, admin/RBAC, backup restore) with nothing to configure. See
> [Demo mode](#demo-mode) below. Point it at a real Supabase project only when you want persistence.

> 📘 **User guide:** For a friendly, step‑by‑step guide tailored to bar managers and staff, see [BARMANAGER_USER_GUIDE.md](BARMANAGER_USER_GUIDE.md).

## 🚀 Features

### Core Modules
- 📦 **Inventory Tracking** – Track stock levels, low‑stock alerts, add/edit/remove items, export/import JSON.
- 📅 **Shift Scheduling** – Monthly calendar view, add/delete shifts, conflict detection, mobile‑optimized UI.
- ✅ **Daily Checklists** – Opening/closing checklists, per‑user completion tracking.
- 🏝️ **Time Off Requests** – Staff request time off, managers approve/deny, approved days appear on schedule.
- 👥 **Team Management** – Role‑based access (Admin, Manager, Staff, Viewer) with hierarchical permissions.

### 🔐 RBAC & Security
- **Four roles** with hierarchical permissions (Admin > Manager > Staff > Viewer).
- **Protected routes** – each page requires a minimum role.
- **Pending approval flow** – new users require admin approval before accessing the app.
- **Supabase Auth** – email/password login, automatic profile creation via database trigger.
- **Row‑Level Security (RLS)** – every policy requires **both** an approved account status **and** the
  right role (`supabase/migrations/20260612000000_require_approved_status.sql`). A user later set to
  `pending`/`rejected`/`removed` loses database access immediately, even if their role row still says
  manager/admin — the client route guards mirror this so the UI and the database enforce the same rule.
- **Atomic backup restore** – restore runs server‑side in one transaction via a `SECURITY DEFINER` RPC
  (`restore_operational_backup`, `supabase/migrations/20260612000100_restore_backup_rpc.sql`), so a
  failed import can't leave the database half‑restored.

### 📅 Schedule Management
- **Conflict detection** – prevents overlapping shifts for the same staff member.
- **Mobile usability** – touch‑friendly controls, responsive calendar grid.
- **Build Month** – pattern‑based shift generation, copy shifts from previous month, clear all shifts/time‑off.
- **Copy week** – copy a week’s shifts to another month with conflict detection (UI hidden in current release).
- **Export/Import** – CSV export for shifts, JSON backup/restore for inventory.

### 🛠️ Admin Panel
- **User management** – list all users, edit roles/status inline, approve pending sign‑ups.
- **Transfer admin role** – safely transfer admin privileges to another user.
- **Soft‑delete users** – mark users as “removed” (hidden by default, can be restored).
- **Show removed toggle** – toggle visibility of removed users.
- **Improved error handling** – clear messages when database constraints require migrations.

### 🗃️ Data Management
- **Supabase‑backed** – all data stored in Supabase tables, no local‑storage fallback.
- **Migration‑ready** – SQL migration scripts for schema upgrades (run in order).
- **Export/Import** – full‑database backup and restore via JSON.
- **Environment variables** – Supabase URL and anon key configured via `.env`.

### 📱 Mobile Usability
- **Responsive design** – works on phones, tablets, and desktops.
- **Touch‑friendly** – larger tap targets, swipe‑friendly calendar navigation.
- **Optimized layouts** – stacked cards on mobile, grid on larger screens.

## 📌 Recent Updates (2026‑07‑02)

- **Demo mode** – the app runs entirely on an in‑memory mock Supabase client by default
  (`src/lib/supabaseMock.js`, seeded from `src/lib/demoData.js`), so it's explorable with zero backend setup.
  Set `VITE_DEMO_MODE=false` to use a real Supabase project instead. A new landing page (`/`) introduces the
  project; the app itself now lives under `/app`.
- **Security hardening** – closed a gap where a `removed`/`rejected` account could keep database access if
  its role row still said manager/admin; RLS now requires `status='approved'` on every policy, not just role.
  Backup restore rewritten as an atomic RPC (see RBAC & Security above). Full findings in [FINDINGS.md](FINDINGS.md).
- **Schedule correctness** – date construction now clamps to the real length of the target month (no more
  invalid dates like `2026-02-31`), CSV import/export share one RFC‑style parser across Inventory and
  Schedule, and "Build Month" snapshots the month before replacing it so a failed insert can't wipe it.
- **Accessibility & mobile nav** – the mobile bottom nav no longer drops Settings/Admin (and Admin's
  pending‑approvals badge) once a role has more than 4 nav items — they now live in a "More" sheet. Status
  rows carry a tinted icon swatch instead of color alone, and text links were re‑checked against WCAG AA
  contrast on their actual backgrounds.

## 📌 Previous Updates (2026‑04‑21)

The `feature/rbac‑login‑vibes` branch has been merged into `main`. All RBAC and Supabase features are now live, plus the following enhancements:

- **Conflict detection** – added to schedule builder and copy‑week operations.
- **Mobile usability improvements** – better touch targets, responsive calendar.
- **Copy week persistence** – copy‑week shifts are now saved to Supabase with conflict detection.
- **Schedule builder enhancements** – pattern shifts, copy last month, clear all, improved UX.
- **Admin panel upgrades** – transfer admin role, soft‑delete users, show‑removed toggle.
- **Migration added** – `20260421040000_add_removed_status.sql` allows 'removed' status in profiles table.
- **Admin error handling** – clearer error messages when constraints block updates.
- **UI tweaks** – “Copy Week” button hidden (functionality remains).

All changes are deployed and ready for use.

---

## Tech Stack (100% Free)

- **Frontend:** React + Vite + Tailwind CSS
- **Database:** Supabase (Free tier)
- **Hosting:** Netlify (Free tier)
- **Auth:** Supabase Auth

## Demo mode

```bash
npm install
npm run dev
```

That's it — no Supabase project, no `.env` file, no signup. `VITE_DEMO_MODE` defaults to on, which swaps the
real Supabase client for `src/lib/supabaseMock.js`: an in‑memory client implementing the same `auth`/`from`/
`rpc` surface the app actually calls, backed by plain arrays seeded from `src/lib/demoData.js`. The demo
session is a pre‑approved admin, so every route and role‑gated feature is reachable. Writes (add a shift,
toggle a checklist item, edit inventory) persist for the session and reset on reload; nothing reaches a
network. `node scripts/check-mock.mjs` is a small self‑check for the mock's query builder.

To connect a real project instead, set `VITE_DEMO_MODE=false` and fill in `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` (copy `.env.example` to `.env`) — then follow the setup steps below.

## Setup Instructions

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create free account
2. Create new project
3. Go to Settings → API to get your URL and anon key

### 2. Set Up Database
Run this SQL in Supabase SQL Editor:

```sql
-- Profiles table (extends auth.users)
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role text default 'staff',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Inventory items
create table inventory_items (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text default 'drinks',
  quantity integer default 0,
  unit text,
  threshold integer default 5,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Shifts
create table shifts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id),
  date date not null,
  start_time text,
  end_time text,
  role text default 'server',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Checklists
create table checklists (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  date date not null,
  tasks jsonb,
  completed_by uuid references profiles(id),
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Time off requests
create table time_off_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id),
  start_date date not null,
  end_date date not null,
  reason text,
  status text default 'pending',
  reviewed_by uuid references profiles(id),
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security
alter table profiles enable row level security;
alter table inventory_items enable row level security;
alter table shifts enable row level security;
alter table checklists enable row level security;
alter table time_off_requests enable row level security;

-- RLS Policies (basic - allows authenticated users full access for demo)
create policy "Allow authenticated" on profiles for all using (auth.role() = 'authenticated');
create policy "Allow authenticated" on inventory_items for all using (auth.role() = 'authenticated');
create policy "Allow authenticated" on shifts for all using (auth.role() = 'authenticated');
create policy "Allow authenticated" on checklists for all using (auth.role() = 'authenticated');
create policy "Allow authenticated" on time_off_requests for all using (auth.role() = 'authenticated');

-- Trigger to create profile on signup
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### 2.1 Apply RBAC and Feature Migrations
The app uses two sets of migration scripts:

- **Initial Supabase schema** (`migrations/` folder) – adds required columns and constraints for the core tables.
- **RBAC and feature enhancements** (`supabase/migrations/` folder) – adds role‑based access control, status columns, announcements, and other enhancements.

For a fresh deployment, run **all** migrations in chronological order (across both directories) after creating the initial schema via the SQL script above. Each migration is idempotent and safe to run multiple times.

### 3. Configure the App
```bash
# Copy .env.example to .env and fill in your values
cp .env.example .env

# Edit .env with your Supabase URL and anon key
```

### 4. Deploy to Netlify
1. Push this code to GitHub
2. Connect repo to Netlify
3. Set environment variables in Netlify dashboard
4. Deploy!

Or run locally:
```bash
npm install
npm run dev
```

If Vite or Rollup reports a missing optional native package such as
`@rollup/rollup-win32-x64-msvc`, reinstall dependencies on the same
operating system you are using to run the app:

```powershell
Remove-Item node_modules -Recurse -Force
npm install
```

## File Structure

```
src/
├── components/
│   └── Layout.jsx               # App shell for /app: nav, demo banner, welcome modal
├── lib/
│   ├── supabase.js              # Exports the real client or the demo mock, + table name constants
│   ├── supabaseMock.js          # In-memory Supabase client used by demo mode
│   ├── demoData.js              # Seed data for demo mode
│   └── csv.js                   # Shared RFC-style CSV parser/escaper (Inventory + Schedule)
├── context/
│   └── AuthContext.jsx          # Auth state, profile, role exposure
├── hooks/
│   └── usePermissions.js        # RBAC logic (hasRole, hasAnyRole, etc.)
├── pages/
│   ├── Landing.jsx              # Public landing page at "/"
│   ├── Login.jsx                # Sign‑in form (kept but unrouted — App.jsx currently has no /login route)
│   ├── SignUp.jsx               # Sign‑up / request‑access form (kept but unrouted, same as Login.jsx)
│   ├── PendingApproval.jsx      # Waiting screen for unapproved users (kept but unrouted, same as Login.jsx)
│   ├── Admin.jsx                # Admin panel – user list, role/status editing
│   ├── Dashboard.jsx            # Home dashboard with low‑stock alerts
│   ├── Inventory.jsx            # Inventory management (Supabase‑backed)
│   ├── Schedule.jsx             # Shift scheduling (Supabase‑backed)
│   ├── Checklists.jsx           # Daily checklists (Supabase‑backed)
│   ├── TimeOff.jsx              # Time‑off requests (Supabase‑backed)
│   └── Settings.jsx             # Export/import for Supabase tables
├── App.jsx                      # Router: "/" is Landing, the app lives under "/app"
├── index.css                    # Global styles
└── main.jsx                     # Entry point
```

### 📦 Migrations

The app uses two migration directories. Run all scripts in chronological order (by filename) after creating the initial schema.

```
migrations/
├── 2026‑04‑07‑add‑staff_name‑to‑shifts.sql
├── 2026‑04‑07‑update‑tables‑for‑supabase‑migration.sql
├── 2026‑04‑08‑fix‑checklists‑table.sql
├── 2026‑04‑08‑fix‑checklists‑constraints.sql
└── 2026‑04‑08‑drop‑not‑null‑checklists.sql
supabase/migrations/
├── 20260404060700_add_rbac.sql
├── 20260404060701_profile_trigger.sql
├── 20260404060702_update_profile_trigger.sql
├── 20260408030000_fix_profiles_constraints.sql
├── 20260408030100_fix_admin_policy.sql
├── 20260408033000_fix_time_off_schema.sql
├── 20260408040000_fix_time_off_month_index.sql
├── 20260408122000_add_rls_shifts.sql
├── 20260408122100_add_rls_inventory.sql
├── 20260408122200_add_rls_checklists.sql
├── 20260409230000_add_team_checklists.sql
├── 20260411020000_add_announcements.sql
├── 20260421040000_add_removed_status.sql
├── 20260612000000_require_approved_status.sql   # RLS: require status='approved' on every policy, not just role
└── 20260612000100_restore_backup_rpc.sql        # Atomic, authorized restore_operational_backup() RPC
```

Each migration is idempotent and safe to run multiple times. They ensure the database schema matches the frontend.

## License

[MIT](LICENSE) — free to use and modify.
