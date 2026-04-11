-- Add team checklists support
-- 1. Add team_id column (default 'main' for existing rows)
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS team_id TEXT DEFAULT 'main';
-- Ensure all existing rows have team_id = 'main'
UPDATE checklists SET team_id = 'main' WHERE team_id IS NULL;

-- 2. Add completed_by and completed_at columns to tasks JSONB (will be handled by frontend)
-- No schema change needed; frontend will store these fields in the tasks JSON.

-- 3. Update RLS policies to allow all authenticated staff to read/write team checklists
-- Drop existing per‑user policies (they will be replaced by team policies)
DROP POLICY IF EXISTS "Allow users to read own checklist" ON checklists;
DROP POLICY IF EXISTS "Allow users to insert own checklist" ON checklists;
DROP POLICY IF EXISTS "Allow users to update own checklist" ON checklists;
-- Drop any previously created team policies (if this migration ran before)
DROP POLICY IF EXISTS "Allow staff to read team checklists" ON checklists;
DROP POLICY IF EXISTS "Allow staff to insert team checklists" ON checklists;
DROP POLICY IF EXISTS "Allow staff to update team checklists" ON checklists;

-- Note: Keep the admin/manager policy (created by previous migration) – it stays.

-- New policy: any authenticated user can read team checklists (team_id = 'main')
CREATE POLICY "Allow staff to read team checklists" ON checklists FOR SELECT
USING (team_id = 'main' AND auth.role() = 'authenticated');

-- New policy: any authenticated user can insert team checklists (only for team_id = 'main')
CREATE POLICY "Allow staff to insert team checklists" ON checklists FOR INSERT
WITH CHECK (team_id = 'main' AND auth.role() = 'authenticated');

-- New policy: any authenticated user can update team checklists (only for team_id = 'main')
CREATE POLICY "Allow staff to update team checklists" ON checklists FOR UPDATE
USING (team_id = 'main' AND auth.role() = 'authenticated');

-- Note: We keep the user_id column for tracking who created/updated, but it's not used for access control.
-- The frontend should set user_id = auth.uid() when inserting/updating for audit.

-- 4. Ensure there is at least one team checklist row for team 'main'
-- If no row exists for team 'main', insert one with default tasks.
INSERT INTO checklists (team_id, tasks, name, date, user_id, created_at)
SELECT 'main', 
       '{"opening": [{"id":1,"t":"Check walk-in temps","c":false},{"id":2,"t":"Count drawer cash","c":false},{"id":3,"t":"Stock condiments","c":false}], "closing": [{"id":4,"t":"Close out register","c":false},{"id":5,"t":"Check doors secured","c":false}], "prep": [{"id":6,"t":"Prep vegetables","c":false},{"id":7,"t":"Marinate meats","c":false}]}'::jsonb,
       'Team Checklists',
       CURRENT_DATE,
       auth.uid(),
       NOW()
WHERE NOT EXISTS (SELECT 1 FROM checklists WHERE team_id = 'main');

-- 5. Optional: migrate existing per‑user checklists to team checklists?
-- We'll keep them; users can still have personal checklists if they have user_id set.
-- The frontend will now fetch by team_id = 'main' instead of user_id.