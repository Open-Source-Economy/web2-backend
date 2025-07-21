-- GitHub OAuth token storage migration (with encryption)
-- Migration 14: Add encrypted OAuth token fields to github_owner table

-- Add GitHub OAuth token fields to existing github_owner table
-- NOTE: Tokens are stored encrypted using AES-256-GCM
ALTER TABLE github_owner 
ADD COLUMN access_token_encrypted TEXT,
ADD COLUMN access_token_iv TEXT,
ADD COLUMN access_token_auth_tag TEXT,
ADD COLUMN refresh_token_encrypted TEXT,
ADD COLUMN refresh_token_iv TEXT,
ADD COLUMN refresh_token_auth_tag TEXT,
ADD COLUMN token_scope TEXT,
ADD COLUMN token_expires_at TIMESTAMP,
ADD COLUMN token_updated_at TIMESTAMP DEFAULT now();

-- Add index for efficient token lookups by user
CREATE INDEX idx_github_owner_token_lookup ON github_owner(github_id) WHERE access_token_encrypted IS NOT NULL;

-- Add index for token expiration checks (if GitHub starts using expiring tokens)
CREATE INDEX idx_github_owner_token_expiry ON github_owner(token_expires_at) WHERE token_expires_at IS NOT NULL;

-- Update the migration tracking if it exists
-- INSERT INTO migration_version (version) VALUES (14) ON CONFLICT DO NOTHING;