-- Convert time_off_requests.month from 1‑indexed to zero‑indexed
-- Existing rows may have month 1–12 (calendar month). Subtract 1 to make them zero‑indexed.
UPDATE time_off_requests SET month = month - 1 WHERE month BETWEEN 1 AND 12;

-- Set default to zero‑indexed month (0–11) so new inserts match frontend expectation.
ALTER TABLE time_off_requests ALTER COLUMN month SET DEFAULT (EXTRACT(MONTH FROM CURRENT_DATE) - 1);

-- Ensure month stays within valid range (0–11)
ALTER TABLE time_off_requests DROP CONSTRAINT IF EXISTS time_off_month_check;
ALTER TABLE time_off_requests ADD CONSTRAINT time_off_month_check CHECK (month >= 0 AND month <= 11);