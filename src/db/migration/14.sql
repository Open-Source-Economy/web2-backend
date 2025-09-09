
BEGIN;

ALTER TABLE app_user
    ADD COLUMN terms_accepted_version VARCHAR(50);

COMMIT;