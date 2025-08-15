-- GitHub OAuth token storage migration (with encryption)
-- Migration 14: Add encrypted OAuth token fields to app_user table

-- Add GitHub OAuth token fields to existing app_user table
-- NOTE: Tokens are stored encrypted using AES-256-GCM
ALTER TABLE app_user 
ADD COLUMN github_access_token_encrypted TEXT,
ADD COLUMN github_access_token_iv TEXT,
ADD COLUMN github_access_token_auth_tag TEXT,
ADD COLUMN github_refresh_token_encrypted TEXT,
ADD COLUMN github_refresh_token_iv TEXT,
ADD COLUMN github_refresh_token_auth_tag TEXT,
ADD COLUMN github_token_scope TEXT,
ADD COLUMN github_token_expires_at TIMESTAMP,
ADD COLUMN github_token_updated_at TIMESTAMP DEFAULT now();

-- Add index for efficient token lookups by user
CREATE INDEX idx_app_user_github_token_lookup ON app_user(id) WHERE github_access_token_encrypted IS NOT NULL;

-- Add index for token expiration checks (if GitHub starts using expiring tokens)
CREATE INDEX idx_app_user_github_token_expiry ON app_user(github_token_expires_at) WHERE github_token_expires_at IS NOT NULL;

-- Update the migration tracking if it exists
-- INSERT INTO migration_version (version) VALUES (14) ON CONFLICT DO NOTHING;