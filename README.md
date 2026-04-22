# BarManager - Restaurant Management App

A free, full-featured restaurant management system built with React, Supabase, and deployable on Netlify.

## Features

- 📦 **Inventory Tracking** - Track stock levels, get low-stock alerts
- 📅 **Shift Scheduling** - Weekly schedule management
- ✅ **Checklists** - Opening/closing checklists for staff
- 🏝️ **Time Off Requests** - Staff request time off, managers approve/deny
- 👥 **Team Management** - Role-based access (manager/staff)

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
│   └── Layout.jsx       # Main layout with sidebar
├── lib/
│   └── supabase.js      # Supabase client
├── pages/
│   ├── Login.jsx        # Auth page
│   ├── Dashboard.jsx    # Home dashboard
│   ├── Inventory.jsx    # Inventory management
│   ├── Schedule.jsx     # Shift scheduling
│   ├── Checklists.jsx   # Daily checklists
│   ├── TimeOff.jsx      # Time off requests
│   └── Settings.jsx     # Team management
├── App.jsx              # Main app with routing
├── index.css            # Global styles
└── main.jsx             # Entry point
```

## License

MIT - Free to use and modify!
