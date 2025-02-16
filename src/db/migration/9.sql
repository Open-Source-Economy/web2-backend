BEGIN;

ALTER TABLE issue_funding
    RENAME COLUMN milli_dow_amount TO credit_amount;

ALTER TABLE manual_invoice
    RENAME COLUMN milli_dow_amount TO credit_amount;

ALTER TABLE managed_issue
    RENAME COLUMN requested_milli_dow_amount TO requested_credit_amount;

-- First, drop the existing check constraint
ALTER TABLE stripe_product
    DROP CONSTRAINT IF EXISTS stripe_product_type_check;

-- Update any existing records that have 'milli_dow' type to 'credit'
UPDATE stripe_product
SET type = 'credit'
WHERE type = 'milli_dow';

-- Add the new check constraint with 'credit' instead of 'milli_dow'
ALTER TABLE stripe_product
    ADD CONSTRAINT stripe_product_type_check CHECK (type IN ('credit', 'donation'));


-- Rename dow_currency to currency
ALTER TABLE user_repository
    RENAME COLUMN dow_currency TO currency;

-- Rename dow_rate to rate
ALTER TABLE user_repository
    RENAME COLUMN dow_rate TO rate;

-- Drop existing CHECK constraint on rate (previously dow_rate)
ALTER TABLE user_repository
    DROP CONSTRAINT IF EXISTS user_repository_dow_rate_check;

-- Add new CHECK constraint for rate
ALTER TABLE user_repository
    ADD CONSTRAINT user_repository_rate_check
        CHECK (rate IS NULL OR rate > 0);


-- Rename dow_currency to currency
ALTER TABLE repository_user_permission_token
    RENAME COLUMN dow_currency TO currency;

-- Rename dow_rate to rate
ALTER TABLE repository_user_permission_token
    RENAME COLUMN dow_rate TO rate;

-- Drop existing CHECK constraint on rate (previously dow_rate)
ALTER TABLE repository_user_permission_token
    DROP CONSTRAINT IF EXISTS repository_user_permission_token_dow_rate_check;

-- Add new CHECK constraint for rate
ALTER TABLE repository_user_permission_token
    ADD CONSTRAINT repository_user_permission_token_rate_check
        CHECK (rate IS NULL OR rate > 0);

COMMIT;