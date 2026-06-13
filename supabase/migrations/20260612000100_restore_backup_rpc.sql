-- Atomic, authorized restore for the Settings "Import Backup" feature.
--
-- The previous client flow deleted all four operational tables and then inserted
-- sequentially with no transaction: any insert failure left tables empty (data loss).
-- It also could not work for multi-user time-off backups, because the time_off insert
-- RLS policy requires auth.uid() = user_id — restoring another user's row was rejected.
--
-- This function does the whole restore in a single transaction (a plpgsql function is
-- atomic: any raised exception rolls back every statement). It is SECURITY DEFINER so it
-- can insert cross-user rows, but it first verifies the caller is an approved
-- admin/manager, matching the Settings route guard.
--
-- The payload is the exported backup JSON. Only the operational sections are read
-- (inventory, shifts, checklists, time_off, time_off_pending); version/manifest/reference
-- and any unknown keys are ignored. jsonb_populate_recordset maps JSON keys to columns and
-- silently ignores keys that no longer correspond to a column, so older backups still load.

CREATE OR REPLACE FUNCTION public.restore_operational_backup(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_ok boolean;
  inv_count int := 0;
  shift_count int := 0;
  check_count int := 0;
  to_count int := 0;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND status = 'approved'
      AND role IN ('admin', 'manager')
  ) INTO caller_ok;

  IF NOT caller_ok THEN
    RAISE EXCEPTION 'Not authorized to restore backup';
  END IF;

  IF payload ? 'inventory' THEN
    DELETE FROM inventory_items;
    INSERT INTO inventory_items
      SELECT * FROM jsonb_populate_recordset(null::inventory_items, payload->'inventory');
    GET DIAGNOSTICS inv_count = ROW_COUNT;
  END IF;

  IF payload ? 'shifts' THEN
    DELETE FROM shifts;
    INSERT INTO shifts
      SELECT * FROM jsonb_populate_recordset(null::shifts, payload->'shifts');
    GET DIAGNOSTICS shift_count = ROW_COUNT;
  END IF;

  IF payload ? 'checklists' THEN
    DELETE FROM checklists;
    INSERT INTO checklists
      SELECT * FROM jsonb_populate_recordset(null::checklists, payload->'checklists');
    GET DIAGNOSTICS check_count = ROW_COUNT;
  END IF;

  -- Approved and pending time off are stored as separate arrays; each row already carries
  -- its own status column, so concatenating and repopulating preserves it.
  IF (payload ? 'time_off') OR (payload ? 'time_off_pending') THEN
    DELETE FROM time_off_requests;
    INSERT INTO time_off_requests
      SELECT * FROM jsonb_populate_recordset(
        null::time_off_requests,
        COALESCE(payload->'time_off', '[]'::jsonb) || COALESCE(payload->'time_off_pending', '[]'::jsonb)
      );
    GET DIAGNOSTICS to_count = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'inventory', inv_count,
    'shifts', shift_count,
    'checklists', check_count,
    'time_off', to_count
  );
END;
$$;

-- anon (unauthenticated) callers have no business restoring; the internal check already
-- rejects them (auth.uid() is null), but revoke execute as defense in depth.
REVOKE EXECUTE ON FUNCTION public.restore_operational_backup(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.restore_operational_backup(jsonb) TO authenticated;
