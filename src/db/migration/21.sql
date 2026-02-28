-- Normalize existing uppercase currency values to lowercase before adding CHECK constraints
UPDATE stripe_customer SET currency = LOWER(currency) WHERE currency IS NOT NULL AND currency != LOWER(currency);
UPDATE stripe_invoice SET currency = LOWER(currency) WHERE currency != LOWER(currency);
UPDATE stripe_price SET currency = LOWER(currency) WHERE currency != LOWER(currency);

-- Add CHECK constraints for enum columns missing validation

-- managed_issue: contributor_visibility and state
ALTER TABLE managed_issue ADD CONSTRAINT chk_contributor_visibility
  CHECK (contributor_visibility IN ('public', 'private'));
ALTER TABLE managed_issue ADD CONSTRAINT chk_state
  CHECK (state IN ('open', 'rejected', 'solved'));

-- stripe_customer: currency (nullable, so only validate when present)
ALTER TABLE stripe_customer ADD CONSTRAINT chk_currency
  CHECK (currency IS NULL OR currency IN ('usd', 'eur', 'gbp', 'chf'));

-- stripe_price: currency
ALTER TABLE stripe_price ADD CONSTRAINT chk_stripe_price_currency
  CHECK (currency IN ('usd', 'eur', 'gbp', 'chf'));

-- stripe_invoice: currency
ALTER TABLE stripe_invoice ADD CONSTRAINT chk_stripe_invoice_currency
  CHECK (currency IN ('usd', 'eur', 'gbp', 'chf'));

-- user_repository: currency (renamed from dow_currency in migration 9)
ALTER TABLE user_repository ADD CONSTRAINT chk_user_repository_currency
  CHECK (currency IN ('usd', 'eur', 'gbp', 'chf'));

-- repository_user_permission_token: currency (renamed from dow_currency in migration 9)
ALTER TABLE repository_user_permission_token ADD CONSTRAINT chk_repo_user_perm_token_currency
  CHECK (currency IN ('usd', 'eur', 'gbp', 'chf'));
