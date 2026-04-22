-- Ensure profiles table has proper constraints and defaults

-- Add status check constraint (if not exists)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE profiles ADD CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected'));

-- Ensure role default is 'viewer' (already set)
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'viewer';
-- Update any NULL roles to 'viewer'
UPDATE profiles SET role = 'viewer' WHERE role IS NULL;
-- Ensure role is NOT NULL
ALTER TABLE profiles ALTER COLUMN role SET NOT NULL;
-- Ensure status default is 'pending' (already set)
ALTER TABLE profiles ALTER COLUMN status SET DEFAULT 'pending';
-- Update any NULL statuses to 'pending'
UPDATE profiles SET status = 'pending' WHERE status IS NULL;
-- Ensure status is NOT NULL
ALTER TABLE profiles ALTER COLUMN status SET NOT NULL;

-- Make sure full_name column exists (nullable)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Ensure email is not nullable (should already be)
ALTER TABLE profiles ALTER COLUMN email SET NOT NULL;

-- Add created_at column if missing (with default)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add updated_at column for tracking (optional)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create a trigger to set updated_at on update (optional)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON profiles;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Backfill created_at with current time if missing
UPDATE profiles SET created_at = COALESCE(created_at, NOW()) WHERE created_at IS NULL;
-- Backfill updated_at with created_at if missing
UPDATE profiles SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL;