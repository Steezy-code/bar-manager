# BarManager - Restaurant Management App

A free, full-featured restaurant management system built with React, Supabase, and deployable on Netlify.

## Features

- 📦 **Inventory Tracking** - Track stock levels, get low-stock alerts
- 📅 **Shift Scheduling** - Weekly schedule management
- ✅ **Checklists** - Opening/closing checklists for staff
- 🏝️ **Time Off Requests** - Staff request time off, managers approve/deny
- 👥 **Team Management** - Role-based access (manager/staff)

## 🆕 What’s New (Branch `feature/rbac‑login‑vibes`)

This branch introduces **Role‑Based Access Control (RBAC)** and **full Supabase integration**, transforming the app from a local‑storage prototype into a production‑ready multi‑user system.

### 🔐 RBAC & Authentication
- **Four roles:** Admin, Manager, Staff, Viewer – with hierarchical permissions.
- **Protected routes:** Each page requires a minimum role (e.g., only admins can access the Admin panel).
- **Admin panel:** List all users, edit roles/status inline, approve pending sign‑ups.
- **Pending approval flow:** New users are placed in “pending” status until an admin approves them.
- **Login/Sign‑up** with Supabase Auth; profiles automatically created via database trigger.

### 🗃️ Supabase Data Layer (No More LocalStorage)
- **Schedule:** Shifts stored in `shifts` table with `staff_name` mapping.
- **Inventory:** Items stored in `inventory_items` table; low‑stock alerts read from Supabase.
- **Checklists:** Per‑user checklist data stored in `checklists.tasks` (JSONB).
- **Time Off:** Requests stored in `time_off_requests` with pending/approved status.
- **Dashboard:** Low‑stock alerts pulled live from Supabase.
- **Settings:** Export/import now works with Supabase tables (full‑database backup/restore).

### 🛡️ Security & Configuration
- **Environment variables** for Supabase URL & anon key (no secrets in the repo).
- **Netlify secret‑scanning** configured to ignore public placeholders.
- **SQL migration scripts** included for seamless schema upgrades.
- **Row‑Level Security (RLS)** policies allow authenticated users access to their own data.

### 📋 Updated Testing Guide
- Comprehensive `TESTING.md` with step‑by‑step verification for each new feature.
- Covers RBAC flows, data persistence, admin actions, and cross‑module integration.

---

## Tech Stack (100% Free)

- **Frontend:** React + Vite + Tailwind CSS
- **Database:** Supabase (Free tier)
- **Hosting:** Netlify (Free tier)
- **Auth:** Supabase Auth

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

### 2.1 Apply Additional Migrations (for RBAC/Supabase features)
If you’re deploying the `feature/rbac‑login‑vibes` branch, run the migration scripts in the `migrations/` folder (in order) to add required columns and adjust constraints.

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

## File Structure

```
src/
├── components/
│   └── Layout.jsx               # Main layout with conditional Admin link
├── lib/
│   └── supabase.js              # Supabase client + table name constants
├── context/
│   └── AuthContext.jsx          # Auth state, profile, role exposure
├── hooks/
│   └── usePermissions.js        # RBAC logic (hasRole, hasAnyRole, etc.)
├── pages/
│   ├── Login.jsx                # Sign‑in form
│   ├── SignUp.jsx               # Sign‑up / request‑access form
│   ├── PendingApproval.jsx      # Waiting screen for unapproved users
│   ├── Admin.jsx                # Admin panel – user list, role/status editing
│   ├── Dashboard.jsx            # Home dashboard with low‑stock alerts
│   ├── Inventory.jsx            # Inventory management (Supabase‑backed)
│   ├── Schedule.jsx             # Shift scheduling (Supabase‑backed)
│   ├── Checklists.jsx           # Daily checklists (Supabase‑backed)
│   ├── TimeOff.jsx              # Time‑off requests (Supabase‑backed)
│   └── Settings.jsx             # Export/import for Supabase tables
├── App.jsx                      # Router with ProtectedRoute & requiredRole guards
├── index.css                    # Global styles
└── main.jsx                     # Entry point
```

### 📦 Migrations

```
migrations/
├── 2026‑04‑07‑add‑staff_name‑to‑shifts.sql
├── 2026‑04‑07‑update‑tables‑for‑supabase‑migration.sql
├── 2026‑04‑08‑fix‑checklists‑table.sql
├── 2026‑04‑08‑fix‑checklists‑constraints.sql
└── 2026‑04‑08‑drop‑not‑null‑checklists.sql
```

Each migration is safe to run multiple times and ensures the database schema matches the frontend.

## License

MIT - Free to use and modify!
