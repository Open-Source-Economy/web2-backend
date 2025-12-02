-- SQL Migration: Update Developer Settings Income Streams
-- This migration transforms the income_streams array into individual preference fields
-- for royalties, services, donations, and community supporter, each with yes/maybe_later/not_interested options.

BEGIN;

-- -----------------------------------------------------------------------------
-- ## 1. Create New Enum Type for Preferences
-- -----------------------------------------------------------------------------

CREATE TYPE preference_type AS ENUM (
    'yes',
    'maybe_later',
    'not_interested'
);

-- -----------------------------------------------------------------------------
-- ## 2. Add New Columns to developer_settings Table
-- -----------------------------------------------------------------------------

ALTER TABLE developer_settings
    ADD COLUMN royalties_preference preference_type,
    ADD COLUMN services_preference preference_type,
    ADD COLUMN community_supporter_preference preference_type;

-- -----------------------------------------------------------------------------
-- ## 3. Migrate Existing Data from income_streams Array to New Columns
-- -----------------------------------------------------------------------------

-- For each existing record, if the income_streams array contains a value,
-- set the corresponding preference to 'yes'. Otherwise, leave it NULL.

UPDATE developer_settings
SET
    royalties_preference = CASE
        WHEN 'royalties' = ANY(income_streams) THEN 'yes'::preference_type
        ELSE NULL
    END,
    services_preference = CASE
        WHEN 'services' = ANY(income_streams) THEN 'yes'::preference_type
        ELSE NULL
    END;

-- Note: community_supporter_preference is a new field, so all existing records will have NULL
-- Note: donations (individual donations) option has been removed from the system

-- -----------------------------------------------------------------------------
-- ## 4. Drop Old income_streams Column
-- -----------------------------------------------------------------------------

ALTER TABLE developer_settings
    DROP COLUMN income_streams;

-- -----------------------------------------------------------------------------
-- ## 5. Drop Old income_stream_type Enum (if not used elsewhere)
-- -----------------------------------------------------------------------------

-- Check if income_stream_type is used elsewhere before dropping
-- Since it was only used for the income_streams column, it's safe to drop
DROP TYPE income_stream_type;

COMMIT;

