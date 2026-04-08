-- Fix checklists table NOT NULL constraint and ensure compatibility with frontend
-- Run this in Supabase SQL Editor after the previous migrations.

-- 1. Make the 'name' column nullable (or give it a default) because the frontend
--    does not provide a name (it stores everything in the 'tasks' JSONB column).
--    If the column already has a NOT NULL constraint, drop it.
ALTER TABLE checklists ALTER COLUMN name DROP NOT NULL;

-- 2. If you want to keep a default value for existing rows:
UPDATE checklists SET name = 'My Checklists' WHERE name IS NULL;

-- 3. Ensure 'tasks' column exists (it should from the original schema)
--    If not, create it.
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS tasks JSONB;

-- 4. If there is a 'data' column (from an earlier migration), copy its content
--    to 'tasks' and then drop it (optional – you can keep it if you prefer).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checklists' AND column_name='data') THEN
    UPDATE checklists SET tasks = data WHERE tasks IS NULL AND data IS NOT NULL;
    ALTER TABLE checklists DROP COLUMN data;
  END IF;
END $$;

-- 5. Ensure 'user_id' column exists and add unique constraint (one row per user)
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE checklists DROP CONSTRAINT IF EXISTS checklists_user_id_key;
ALTER TABLE checklists ADD CONSTRAINT checklists_user_id_key UNIQUE (user_id);

-- 6. Ensure 'created_at' column exists
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 7. (Optional) Drop unused columns that are not needed by the new UI
-- ALTER TABLE checklists DROP COLUMN IF EXISTS date;
-- ALTER TABLE checklists DROP COLUMN IF EXISTS completed_by;
-- ALTER TABLE checklists DROP COLUMN IF EXISTS completed_at;

-- After this migration, the Checklists page should work without constraint violations.
-- The frontend will store all checklist data in the 'tasks' JSONB column.