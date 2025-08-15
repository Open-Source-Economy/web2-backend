-- Migration 13: This migration is now a no-op as the services data is already inserted in migration 12
-- The original migration 13 had a bug referencing non-existent service_category table
-- All service data is correctly populated in migration 12 using the services table

-- This file is kept to maintain migration sequence numbering
-- No action required

-- Update the migration tracking if it exists
-- INSERT INTO migration_version (version) VALUES (13) ON CONFLICT DO NOTHING;