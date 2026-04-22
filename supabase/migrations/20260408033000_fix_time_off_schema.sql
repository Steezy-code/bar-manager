-- Fix time_off_requests schema to match frontend expectations
-- Remove unused start_date/end_date columns, ensure required columns exist.

-- First, ensure the table exists (create if not)
CREATE TABLE IF NOT EXISTS time_off_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  dates TEXT NOT NULL,
  days TEXT NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- If the table already existed with start_date/end_date columns, drop them (they're unused)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'time_off_requests' AND column_name = 'start_date') THEN
    ALTER TABLE time_off_requests DROP COLUMN start_date;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'time_off_requests' AND column_name = 'end_date') THEN
    ALTER TABLE time_off_requests DROP COLUMN end_date;
  END IF;
END $$;

-- Ensure all required columns exist (in case table existed but missing some)
ALTER TABLE time_off_requests 
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS dates TEXT,
  ADD COLUMN IF NOT EXISTS days TEXT,
  ADD COLUMN IF NOT EXISTS month INTEGER,
  ADD COLUMN IF NOT EXISTS year INTEGER,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Set NOT NULL constraints (after ensuring no NULLs exist)
UPDATE time_off_requests SET name = COALESCE(name, 'Unknown') WHERE name IS NULL;
UPDATE time_off_requests SET dates = COALESCE(dates, '') WHERE dates IS NULL;
UPDATE time_off_requests SET days = COALESCE(days, '') WHERE days IS NULL;
UPDATE time_off_requests SET month = COALESCE(month, EXTRACT(MONTH FROM CURRENT_DATE)) WHERE month IS NULL;
UPDATE time_off_requests SET year = COALESCE(year, EXTRACT(YEAR FROM CURRENT_DATE)) WHERE year IS NULL;
UPDATE time_off_requests SET status = COALESCE(status, 'pending') WHERE status IS NULL;

ALTER TABLE time_off_requests 
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN dates SET NOT NULL,
  ALTER COLUMN days SET NOT NULL,
  ALTER COLUMN month SET NOT NULL,
  ALTER COLUMN year SET NOT NULL,
  ALTER COLUMN status SET NOT NULL;

-- Add check constraint for valid status
ALTER TABLE time_off_requests DROP CONSTRAINT IF EXISTS time_off_status_check;
ALTER TABLE time_off_requests ADD CONSTRAINT time_off_status_check CHECK (status IN ('pending', 'approved'));

-- Enable Row Level Security
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;

-- Policies: users can read all, but only admins/managers can update status?
-- For now, allow all authenticated users to read (they see each other's time off anyway)
DROP POLICY IF EXISTS "Allow authenticated read" ON time_off_requests;
CREATE POLICY "Allow authenticated read" ON time_off_requests FOR SELECT USING (auth.role() = 'authenticated');

-- Users can insert their own requests (requires user_id match)
DROP POLICY IF EXISTS "Allow users to insert own requests" ON time_off_requests;
CREATE POLICY "Allow users to insert own requests" ON time_off_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own pending requests
DROP POLICY IF EXISTS "Allow users to delete own pending" ON time_off_requests;
CREATE POLICY "Allow users to delete own pending" ON time_off_requests FOR DELETE USING (auth.uid() = user_id AND status = 'pending');

-- Admins and managers can update status (approve/deny) and delete any
DROP POLICY IF EXISTS "Allow admins/managers to update" ON time_off_requests;
CREATE POLICY "Allow admins/managers to update" ON time_off_requests FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Admins and managers can delete any
DROP POLICY IF EXISTS "Allow admins/managers to delete" ON time_off_requests;
CREATE POLICY "Allow admins/managers to delete" ON time_off_requests FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);