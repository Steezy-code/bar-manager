-- SQL migrations for Supabase data migration (Inventory, Checklists, Time Off, Dashboard, Settings)
-- Run these in Supabase SQL Editor before testing the updated frontend.

-- 1. Shifts table already has staff_name column (added earlier)
-- ALTER TABLE shifts ADD COLUMN IF NOT EXISTS staff_name TEXT;

-- 2. Inventory items: ensure user_id column exists (optional)
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'staff';

-- 3. Checklists: ensure data column (JSONB) exists for storing entire checklist object
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS data JSONB;

-- 4. Time off requests: ensure required columns exist
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS dates TEXT;
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS days TEXT;
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS month INTEGER;
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS user_id UUID;

-- Optional: add created_at if missing
ALTER TABLE time_off_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Note: If you encounter errors about missing tables, create them first using the schema in README.md.