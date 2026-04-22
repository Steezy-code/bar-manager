-- Add status column to profiles table (role column already exists)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name, description) VALUES
('admin', 'Full system access'),
('manager', 'Manage staff, inventory, schedules'),
('staff', 'Regular employee with limited access'),
('viewer', 'Read-only access')
ON CONFLICT (name) DO NOTHING;

-- Create user_roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- Enable Row Level Security on roles and user_roles (optional)
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust as needed)
-- Allow anyone to read roles (non-sensitive)
CREATE POLICY "Allow public read on roles" ON roles FOR SELECT USING (true);
-- Only admins can modify roles (we'll implement later)
CREATE POLICY "Allow admin all operations on roles" ON roles FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Allow users to see their own roles
CREATE POLICY "Allow users to read own roles" ON user_roles FOR SELECT USING (auth.uid() = user_id);
-- Only admins can assign roles
CREATE POLICY "Allow admin all operations on user_roles" ON user_roles FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Enable RLS on profiles (if not already)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
-- Admins can read all profiles
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');
-- Users can update their own profile (maybe for limited fields)
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Ensure the role column stays in sync with user_roles (optional, can be done via triggers)
-- For simplicity, we'll rely on the denormalized role column for quick access.

-- Update profiles role from user_roles if needed (later trigger)
-- For now, we'll just set role based on the highest privilege role (admin > manager > staff > viewer)
-- but we'll implement that in application logic.