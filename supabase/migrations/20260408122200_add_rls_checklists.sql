-- Enable Row Level Security on checklists table
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow users to read own checklist" ON checklists;
DROP POLICY IF EXISTS "Allow users to insert own checklist" ON checklists;
DROP POLICY IF EXISTS "Allow users to update own checklist" ON checklists;
DROP POLICY IF EXISTS "Allow admin/manager all operations" ON checklists;

-- Policy: Users can read their own checklist row
CREATE POLICY "Allow users to read own checklist" ON checklists FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own checklist row (used during sign-up)
CREATE POLICY "Allow users to insert own checklist" ON checklists FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own checklist row (staff can toggle tasks)
CREATE POLICY "Allow users to update own checklist" ON checklists FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Admin and manager can read/update any checklist row (for future)
CREATE POLICY "Allow admin/manager all operations" ON checklists FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);