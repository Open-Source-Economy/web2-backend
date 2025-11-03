-- Migration 17: Add verification system with separate verification_records table
-- This migration creates a dedicated table for tracking verification history and communication
-- Benefits:
-- - Full audit trail of all verification status changes
-- - Support for future features: appeals, multi-step workflows, admin-developer communication
-- - Historical record of who verified what and when
-- - Easy to query verification history without cluttering main tables

BEGIN;

-- Create verification_status enum type
CREATE TYPE verification_status AS ENUM (
    'pending_review',           -- Default when onboarding completes, awaiting admin review
    'under_review',             -- Admin is actively reviewing
    'information_requested',    -- Admin needs clarification from developer
    'changes_requested',        -- Admin found inaccuracies that need correction
    'approved',                 -- Verified and approved
    'rejected'                  -- Rejected (rare)
);

-- Create entity type enum for verification records
CREATE TYPE verification_entity_type AS ENUM (
    'developer_profile',
    'developer_project_item'
);

-- Create verification_records table
CREATE TABLE IF NOT EXISTS verification_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Entity being verified
    entity_type verification_entity_type NOT NULL,
    entity_id UUID NOT NULL,
    
    -- Verification details
    status verification_status NOT NULL,
    notes TEXT,
    verified_by UUID REFERENCES app_user(id),
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Future: Developer response for appeals/communication
    developer_response TEXT,
    developer_responded_at TIMESTAMP,
    
    -- Ensure we can track history per entity
    CONSTRAINT verification_records_entity_check CHECK (
        (entity_type = 'developer_profile') OR
        (entity_type = 'developer_project_item')
    )
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_verification_records_entity ON verification_records(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_verification_records_status ON verification_records(status);
CREATE INDEX IF NOT EXISTS idx_verification_records_verified_by ON verification_records(verified_by);
CREATE INDEX IF NOT EXISTS idx_verification_records_created_at ON verification_records(created_at DESC);

-- Composite index for finding latest record per entity
CREATE INDEX IF NOT EXISTS idx_verification_records_entity_created ON verification_records(entity_type, entity_id, created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE verification_records IS 'Tracks verification history for developer profiles and project items. Each record represents a verification decision by an admin, enabling full audit trail and future communication features.';
COMMENT ON COLUMN verification_records.entity_type IS 'Type of entity being verified (profile or project item)';
COMMENT ON COLUMN verification_records.entity_id IS 'UUID of the entity (either developer_profile.id or developer_project_items.id)';
COMMENT ON COLUMN verification_records.status IS 'Verification status at the time of this record';
COMMENT ON COLUMN verification_records.notes IS 'Admin notes, questions, or feedback (visible to developer)';
COMMENT ON COLUMN verification_records.verified_by IS 'Admin user who made this verification decision';
COMMENT ON COLUMN verification_records.developer_response IS 'Developer response to admin feedback (for future appeals/communication feature)';
COMMENT ON COLUMN verification_records.developer_responded_at IS 'Timestamp when developer responded';

COMMIT;

