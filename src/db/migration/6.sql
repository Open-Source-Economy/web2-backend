BEGIN;

-- Drop existing CHECK constraint on dow_rate
ALTER TABLE repository_user_permission_token
    DROP CONSTRAINT IF EXISTS repository_user_permission_token_dow_rate_check;

-- Modify columns to be nullable
ALTER TABLE repository_user_permission_token
    ALTER COLUMN user_email DROP NOT NULL,
    ALTER COLUMN dow_rate DROP NOT NULL,
    ALTER COLUMN dow_currency DROP NOT NULL;

-- Add new CHECK constraint for dow_rate that allows NULL
ALTER TABLE repository_user_permission_token
    ADD CONSTRAINT repository_user_permission_token_dow_rate_check
        CHECK (dow_rate IS NULL OR dow_rate > 0);

-- Drop existing CHECK constraint on dow_rate
ALTER TABLE user_repository
    DROP CONSTRAINT IF EXISTS user_repository_dow_rate_check;

-- Modify columns to be nullable
ALTER TABLE user_repository
    ALTER COLUMN dow_rate DROP NOT NULL,
    ALTER COLUMN dow_currency DROP NOT NULL;

-- Add new CHECK constraint for dow_rate that allows NULL
ALTER TABLE user_repository
    ADD CONSTRAINT user_repository_dow_rate_check
        CHECK (dow_rate IS NULL OR dow_rate > 0);

COMMIT;