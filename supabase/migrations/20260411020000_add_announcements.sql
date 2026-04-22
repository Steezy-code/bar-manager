-- Create announcements table for manager/admin broadcasts
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Policies

-- Anyone authenticated can read active announcements (optional: filter by is_active = true)
CREATE POLICY "Allow authenticated users to read announcements"
ON announcements FOR SELECT
USING (auth.role() = 'authenticated');

-- Only admins and managers can insert announcements
CREATE POLICY "Allow admin/manager to insert announcements"
ON announcements FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('admin', 'manager')
  )
);

-- Only admins and managers can update announcements
CREATE POLICY "Allow admin/manager to update announcements"
ON announcements FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('admin', 'manager')
  )
);

-- Only admins and managers can delete announcements
CREATE POLICY "Allow admin/manager to delete announcements"
ON announcements FOR DELETE
USING (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('admin', 'manager')
  )
);

-- Create index for sorting by creation date
CREATE INDEX IF NOT EXISTS announcements_created_at_idx ON announcements (created_at DESC);

-- Add updated_at trigger (optional, but good practice)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_announcements_updated_at ON announcements;
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed with a welcome announcement (optional)
INSERT INTO announcements (title, content, created_by, created_at, is_active)
SELECT 
  'Welcome to Bar Manager!',
  'Use this space to post important updates, schedule changes, or reminders for the team.',
  id,
  NOW(),
  TRUE
FROM profiles 
WHERE role IN ('admin', 'manager')
LIMIT 1
ON CONFLICT DO NOTHING;