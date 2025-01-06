BEGIN;

-- Convert all dow_amount columns to milli_dow_amount and store them as integers (by multiplying existing values by 1000).
ALTER TABLE issue_funding
    RENAME COLUMN dow_amount TO milli_dow_amount;
ALTER TABLE issue_funding
    ALTER COLUMN milli_dow_amount TYPE INTEGER
        USING (milli_dow_amount * 1000);

ALTER TABLE manual_invoice
    RENAME COLUMN dow_amount TO milli_dow_amount;
ALTER TABLE manual_invoice
    ALTER COLUMN milli_dow_amount TYPE INTEGER
        USING (milli_dow_amount * 1000);

-- Convert requested_dow_amount to requested_milli_dow_amount and store it as an integer (multiply existing values by 1000).
ALTER TABLE managed_issue
    RENAME COLUMN requested_dow_amount TO requested_milli_dow_amount;
ALTER TABLE managed_issue
    ALTER COLUMN requested_milli_dow_amount TYPE INTEGER
        USING (requested_milli_dow_amount * 1000);

COMMIT;