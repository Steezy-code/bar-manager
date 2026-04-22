-- Update profiles table: add status column if missing, adjust role default to 'viewer'
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Change default role to 'viewer' (optional, but keep existing values)
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'viewer';

-- Add check constraint for valid roles (optional)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_role;
ALTER TABLE profiles ADD CONSTRAINT valid_role CHECK (role IN ('admin', 'manager', 'staff', 'viewer'));

-- Update existing rows: set status='approved' for existing users (so they can continue using)
UPDATE profiles SET status = 'approved' WHERE status IS NULL OR status = '';

-- Update existing rows: ensure role is one of the four (if not, set to 'viewer')
UPDATE profiles SET role = 'viewer' WHERE role NOT IN ('admin', 'manager', 'staff', 'viewer');

-- Replace the trigger function to include role and status
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'viewer', 'pending')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger already exists, no need to recreate