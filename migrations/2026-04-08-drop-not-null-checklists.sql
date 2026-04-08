-- Drop NOT NULL constraints on checklists table and backfill missing values
-- Run this after the frontend update (which now supplies both 'name' and 'date').
-- This ensures any existing rows don't violate constraints.

-- 1. Make 'name' nullable (if not already)
ALTER TABLE checklists ALTER COLUMN name DROP NOT NULL;

-- 2. Make 'date' nullable (if not already)
ALTER TABLE checklists ALTER COLUMN date DROP NOT NULL;

-- 3. Backfill any NULL 'name' values (optional, for data consistency)
UPDATE checklists SET name = 'My Checklists' WHERE name IS NULL;

-- 4. Backfill any NULL 'date' values with today's date (optional)
UPDATE checklists SET date = CURRENT_DATE WHERE date IS NULL;

-- 5. Ensure 'tasks' column exists (should already)
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS tasks JSONB;

-- 6. Ensure 'user_id' column exists and is unique (for per‑user row)
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE checklists DROP CONSTRAINT IF EXISTS checklists_user_id_key;
ALTER TABLE checklists ADD CONSTRAINT checklists_user_id_key UNIQUE (user_id);

-- 7. Ensure 'created_at' column exists
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- After this migration, the table will accept rows where 'name' and 'date' are NULL,
-- but the frontend will always supply values for both.