-- Require status='approved' (not just an elevated role) for all data access.
--
-- Prior policies authorized writes by role alone:
--   EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager'))
-- That trusts a stale role on a disabled account: a user demoted to 'removed' or
-- 'rejected' (Admin "Remove user" flips status but keeps the role) retained full
-- insert/update/delete at the database level. This migration adds an approved-status
-- check to every read and write policy so the DB enforces the same boundary the app does.
--
-- Idempotent: drops each policy by name before recreating it. Safe to re-run.

-- ---------------------------------------------------------------------------
-- shifts
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated read shifts" ON shifts;
DROP POLICY IF EXISTS "Allow admin/manager insert shifts" ON shifts;
DROP POLICY IF EXISTS "Allow admin/manager update shifts" ON shifts;
DROP POLICY IF EXISTS "Allow admin/manager delete shifts" ON shifts;

CREATE POLICY "Allow authenticated read shifts" ON shifts FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.status = 'approved')
);
CREATE POLICY "Allow admin/manager insert shifts" ON shifts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
          AND profiles.status = 'approved' AND profiles.role IN ('admin', 'manager'))
);
CREATE POLICY "Allow admin/manager update shifts" ON shifts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
          AND profiles.status = 'approved' AND profiles.role IN ('admin', 'manager'))
);
CREATE POLICY "Allow admin/manager delete shifts" ON shifts FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
          AND profiles.status = 'approved' AND profiles.role IN ('admin', 'manager'))
);

-- ---------------------------------------------------------------------------
-- inventory_items
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated read inventory" ON inventory_items;
DROP POLICY IF EXISTS "Allow admin/manager insert inventory" ON inventory_items;
DROP POLICY IF EXISTS "Allow staff update inventory" ON inventory_items;
DROP POLICY IF EXISTS "Allow admin/manager delete inventory" ON inventory_items;

CREATE POLICY "Allow authenticated read inventory" ON inventory_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.status = 'approved')
);
CREATE POLICY "Allow admin/manager insert inventory" ON inventory_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
          AND profiles.status = 'approved' AND profiles.role IN ('admin', 'manager'))
);
CREATE POLICY "Allow staff update inventory" ON inventory_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
          AND profiles.status = 'approved' AND profiles.role IN ('admin', 'manager', 'staff'))
);
CREATE POLICY "Allow admin/manager delete inventory" ON inventory_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
          AND profiles.status = 'approved' AND profiles.role IN ('admin', 'manager'))
);

-- ---------------------------------------------------------------------------
-- checklists (team_id = 'main' shared row + admin/manager catch-all)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow staff to read team checklists" ON checklists;
DROP POLICY IF EXISTS "Allow staff to insert team checklists" ON checklists;
DROP POLICY IF EXISTS "Allow staff to update team checklists" ON checklists;
DROP POLICY IF EXISTS "Allow admin/manager all operations" ON checklists;

CREATE POLICY "Allow staff to read team checklists" ON checklists FOR SELECT USING (
  team_id = 'main'
  AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.status = 'approved')
);
CREATE POLICY "Allow staff to insert team checklists" ON checklists FOR INSERT WITH CHECK (
  team_id = 'main'
  AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.status = 'approved')
);
CREATE POLICY "Allow staff to update team checklists" ON checklists FOR UPDATE USING (
  team_id = 'main'
  AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.status = 'approved')
);
CREATE POLICY "Allow admin/manager all operations" ON checklists FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
          AND profiles.status = 'approved' AND profiles.role IN ('admin', 'manager'))
);

-- ---------------------------------------------------------------------------
-- time_off_requests
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated read" ON time_off_requests;
DROP POLICY IF EXISTS "Allow users to insert own requests" ON time_off_requests;
DROP POLICY IF EXISTS "Allow users to delete own pending" ON time_off_requests;
DROP POLICY IF EXISTS "Allow admins/managers to update" ON time_off_requests;
DROP POLICY IF EXISTS "Allow admins/managers to delete" ON time_off_requests;

CREATE POLICY "Allow authenticated read" ON time_off_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.status = 'approved')
);
CREATE POLICY "Allow users to insert own requests" ON time_off_requests FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.status = 'approved')
);
CREATE POLICY "Allow users to delete own pending" ON time_off_requests FOR DELETE USING (
  auth.uid() = user_id AND status = 'pending'
  AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.status = 'approved')
);
CREATE POLICY "Allow admins/managers to update" ON time_off_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
          AND profiles.status = 'approved' AND profiles.role IN ('admin', 'manager'))
);
CREATE POLICY "Allow admins/managers to delete" ON time_off_requests FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
          AND profiles.status = 'approved' AND profiles.role IN ('admin', 'manager'))
);
