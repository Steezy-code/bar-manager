-- Add staff_name column to shifts table for Schedule migration
-- This maps the UI 'name' field to a database column
-- Run this in Supabase SQL Editor before deploying the Schedule.jsx changes

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS staff_name TEXT;

-- Optional: if you want to backfill existing data (though there likely isn't any yet):
-- UPDATE shifts SET staff_name = 'Staff' WHERE staff_name IS NULL;