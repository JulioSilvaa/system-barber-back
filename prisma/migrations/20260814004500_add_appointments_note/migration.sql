-- Align database with migrations history: the `note` column on
-- appointments was previously applied via `db push` and never captured
-- in a migration, causing drift.
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "note" TEXT;
