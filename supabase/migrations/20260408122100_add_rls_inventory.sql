-- Enable Row Level Security on inventory_items table
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated read inventory" ON inventory_items;
DROP POLICY IF EXISTS "Allow admin/manager insert inventory" ON inventory_items;
DROP POLICY IF EXISTS "Allow staff update inventory" ON inventory_items;
DROP POLICY IF EXISTS "Allow admin/manager delete inventory" ON inventory_items;

-- Policy: Any authenticated user can read inventory
CREATE POLICY "Allow authenticated read inventory" ON inventory_items FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Only admin/manager can insert new items
CREATE POLICY "Allow admin/manager insert inventory" ON inventory_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Policy: Staff, manager, admin can update inventory (staff can update quantity)
CREATE POLICY "Allow staff update inventory" ON inventory_items FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager', 'staff')
  )
);

-- Policy: Only admin/manager can delete items
CREATE POLICY "Allow admin/manager delete inventory" ON inventory_items FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);