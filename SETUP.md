# Step-by-Step Setup Guide for BarManager

## Part 1: Set Up Supabase (Free Database)

### 1. Create Account
- Go to [supabase.com](https://supabase.com)
- Click "Start your project" → sign up with email/GitHub/Google

### 2. Create New Project
- Click "New project"
- Fill in:
  - **Organization name:** Your bar name
  - **Name:** bar-manager
  - **Database password:** Create a strong password (save it!)
  - **Region:** Pick closest to you
- Click "Create new project"
- **Wait 1-2 minutes** for it to set up

### 3. Get API Credentials
Once project is ready:

1. Click **"Settings"** (gear icon, bottom left)
2. Click **"API"** in the sidebar
3. Copy these two values:

**Project URL** (looks like `https://abc123.supabase.co`):
```
https://your-project-id.supabase.co
```

**anon public key** (under "Project API keys"):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc123...
```

---

## Part 2: Configure the App

### Option A: Quick .env file setup

In the `bar-manager` folder, create a file called `.env` with this content:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace the URL and key with the values you copied above.

---

## Part 3: Set Up Database (Run SQL)

### 1. Go to Supabase SQL Editor
- In your Supabase dashboard, click **"SQL Editor"** (sidebar)
- Click **"New query"**

### 2. Copy & Paste This SQL

Copy everything below and paste into the SQL Editor, then click **"Run"**:

```sql
-- ============================================
-- BAR MANAGER DATABASE SETUP
-- Run this once to create all tables
-- ============================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'staff',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory items
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'drinks',
  quantity INTEGER DEFAULT 0,
  unit TEXT,
  threshold INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shifts
CREATE TABLE IF NOT EXISTS shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  date DATE NOT NULL,
  start_time TEXT,
  end_time TEXT,
  role TEXT DEFAULT 'server',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checklists
CREATE TABLE IF NOT EXISTS checklists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  tasks JSONB,
  completed_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time off requests
CREATE TABLE IF NOT EXISTS time_off_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SECURITY: Enable Row Level Security
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (for demo purposes)
-- In production, you'd want more granular permissions
CREATE POLICY "Allow authenticated users" ON profiles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON inventory_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON shifts FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON checklists FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON time_off_requests FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================
-- DONE! Add some sample data
-- ============================================

-- Sample inventory
INSERT INTO inventory_items (name, category, quantity, unit, threshold) VALUES
('Beer Kegs (IPA)', 'drinks', 8, 'kegs', 3),
('House Wine (Red)', 'drinks', 12, 'bottles', 5),
('Cocktail Napkins', 'supplies', 150, 'pcs', 50),
('Cheddar Cheese', 'food', 10, 'lbs', 3),
('Draft Beer Lines', 'cleaning', 1, 'kits', 1);

-- Done!
SELECT 'Database ready!' as status;
```

### 3. Click "Run"
You should see "Database ready!" at the bottom.

---

## Part 4: Test Locally

```bash
cd /root/.openclaw/workspace/bar-manager

# Install (only need to do this once)
npm install

# Start the app
npm run dev
```

Open `http://localhost:5173` in your browser.

- Create an account (your email)
- Login
- Start adding inventory, shifts, etc!

---

## Part 5: Deploy to Netlify (Free)

### Option 1: Drag & Drop (Easiest)

1. Build the app:
```bash
npm run build
```

2. This creates a `dist` folder

3. Go to [Netlify Drop](https://app.netlify.com/drop)
4. Drag the `dist` folder onto the page
5. Done! You'll get a URL like `https://random-name.netlify.app`

### Option 2: Connect GitHub (Recommended)

1. Push this code to GitHub
2. Go to Netlify → "Add new site" → "Import an existing project"
3. Connect your GitHub repo
4. Add these environment variables in Netlify:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
5. Deploy!

---

## Need Help?

- Supabase docs: https://supabase.com/docs
- Netlify docs: https://docs.netlify.com

Good luck! 🍻