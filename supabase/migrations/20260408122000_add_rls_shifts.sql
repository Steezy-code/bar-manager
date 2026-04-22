-- Enable Row Level Security on shifts table
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated read shifts" ON shifts;
DROP POLICY IF EXISTS "Allow admin/manager insert shifts" ON shifts;
DROP POLICY IF EXISTS "Allow admin/manager update shifts" ON shifts;
DROP POLICY IF EXISTS "Allow admin/manager delete shifts" ON shifts;

-- Policy: Any authenticated user can read shifts
CREATE POLICY "Allow authenticated read shifts" ON shifts FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Only admin/manager can insert shifts
CREATE POLICY "Allow admin/manager insert shifts" ON shifts FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Policy: Only admin/manager can update shifts
CREATE POLICY "Allow admin/manager update shifts" ON shifts FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Policy: Only admin/manager can delete shifts
CREATE POLICY "Allow admin/manager delete shifts" ON shifts FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);