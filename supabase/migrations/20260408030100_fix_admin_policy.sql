-- Fix RLS policy for admin updates: check role from profiles table, not JWT claim
-- (JWT claim may be stale after role change)

-- Drop existing update policy for admins
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Create new policy that checks the admin's current role in profiles
CREATE POLICY "Admins can update all profiles" ON profiles
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles AS admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role = 'admin'
  )
);

-- Also ensure admins can insert profiles (if needed)
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
CREATE POLICY "Admins can insert profiles" ON profiles
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles AS admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role = 'admin'
  )
);