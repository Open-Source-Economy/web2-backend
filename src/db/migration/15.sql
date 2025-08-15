-- SQL Migration 15: Add unique constraints and data integrity improvements
-- This script adds unique constraints to prevent duplicates and improves data integrity

BEGIN;

-- Add unique constraints to prevent duplicate developer rights per project and role
-- Check if constraint doesn't already exist before adding
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_developer_project_role'
    ) THEN
        ALTER TABLE developer_rights 
        ADD CONSTRAINT unique_developer_project_role 
        UNIQUE (developer_profile_id, project_item_id, role);
    END IF;
END $$;

-- Add unique constraints to prevent duplicate developer services per project and service
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_developer_project_service'
    ) THEN
        ALTER TABLE developer_service 
        ADD CONSTRAINT unique_developer_project_service 
        UNIQUE (developer_profile_id, project_item_id, service_id);
    END IF;
END $$;

-- Add data integrity constraints for realistic values
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_realistic_hourly_rate'
    ) THEN
        ALTER TABLE developer_settings 
        ADD CONSTRAINT check_realistic_hourly_rate 
        CHECK (hourly_rate BETWEEN 1 AND 1000);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_reasonable_commitment'
    ) THEN
        ALTER TABLE developer_settings 
        ADD CONSTRAINT check_reasonable_commitment 
        CHECK (hourly_weekly_commitment BETWEEN 1 AND 80);
    END IF;
END $$;

-- Add constraint to ensure developer_service has either response_time or not based on service requirements
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_response_time_consistency'
    ) THEN
        ALTER TABLE developer_service 
        ADD CONSTRAINT check_response_time_consistency 
        CHECK (
          (has_response_time = true AND response_time IS NOT NULL) OR 
          (has_response_time = false AND response_time IS NULL)
        );
    END IF;
END $$;

-- Add indexes for better performance on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_developer_profile_user_id ON developer_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_developer_settings_profile_id ON developer_settings(developer_profile_id);
CREATE INDEX IF NOT EXISTS idx_developer_rights_profile_id ON developer_rights(developer_profile_id);
CREATE INDEX IF NOT EXISTS idx_developer_rights_project_id ON developer_rights(project_item_id);
CREATE INDEX IF NOT EXISTS idx_developer_service_profile_id ON developer_service(developer_profile_id);
CREATE INDEX IF NOT EXISTS idx_developer_service_project_id ON developer_service(project_item_id);

-- Update the migration tracking if it exists
-- INSERT INTO migration_version (version) VALUES (15) ON CONFLICT DO NOTHING;

COMMIT;