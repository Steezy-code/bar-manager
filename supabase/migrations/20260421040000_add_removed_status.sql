-- Add 'removed' to the valid_status check constraint on profiles table
-- This allows soft-deleting users without removing them from the database

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE profiles ADD CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'removed'));

-- Ensure existing rows remain valid (no need to update data)
-- The constraint will be applied to all future updates