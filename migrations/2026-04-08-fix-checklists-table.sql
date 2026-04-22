-- Fix checklists table for per‑user JSON storage (compatible with the updated frontend)
-- Run this in Supabase SQL Editor after deploying the updated Checklists.jsx.

-- 1. Ensure user_id column exists
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS user_id UUID;

-- 2. Ensure created_at column exists (optional, but nice for auditing)
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. The `tasks` column already exists (JSONB) from the original schema; keep it.

-- 4. Add a unique constraint on user_id so upsert works (one row per user)
--    If there are existing rows with NULL user_id, this will fail.
--    If you have existing data, you may need to assign user_id values first.
--    For a fresh database, there should be no rows, so it’s safe.
ALTER TABLE checklists DROP CONSTRAINT IF EXISTS checklists_user_id_key;
ALTER TABLE checklists ADD CONSTRAINT checklists_user_id_key UNIQUE (user_id);

-- 5. Optional: drop columns that are no longer needed by the new UI
--    (You can keep them; they won’t interfere.)
-- ALTER TABLE checklists DROP COLUMN IF EXISTS name;
-- ALTER TABLE checklists DROP COLUMN IF EXISTS date;
-- ALTER TABLE checklists DROP COLUMN IF EXISTS completed_by;
-- ALTER TABLE checklists DROP COLUMN IF EXISTS completed_at;

-- After running this migration, the Checklists page should load without errors.