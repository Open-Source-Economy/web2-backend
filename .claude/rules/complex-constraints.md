# Complex Database Constraints

## Polymorphic Foreign Keys

When a table can reference multiple parent types (e.g., an address belongs to a user OR a company), use multiple nullable FK columns with a CHECK constraint:

```sql
-- Migration
CREATE TABLE address (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_user(id),
  company_id UUID REFERENCES company(id),
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  -- ... other fields
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Exactly one parent must be set
ALTER TABLE address ADD CONSTRAINT check_one_parent CHECK (
  (user_id IS NOT NULL AND company_id IS NULL) OR
  (user_id IS NULL AND company_id IS NOT NULL)
);
```

Rules:
- Document the constraint with a comment in the migration
- Use a CHECK constraint to enforce exactly one FK is set
- All FK columns in the group are nullable

## Partial Unique Indexes

When uniqueness applies only to a subset of rows:

```sql
-- Only one active subscription per user (deleted ones don't count)
CREATE UNIQUE INDEX idx_one_active_subscription_per_user
ON subscription (user_id)
WHERE deleted_at IS NULL;

-- Only one primary email per user
CREATE UNIQUE INDEX idx_one_primary_email_per_user
ON user_email (user_id)
WHERE is_primary = true;
```

Rules:
- Document the business rule in a comment above the index
- Partial indexes are invisible to the schema — always document them in the migration

## Conditional NOT NULL

When a field is required only in certain states:

```sql
-- payment_id is required only when status is 'paid'
ALTER TABLE invoice ADD CONSTRAINT check_payment_on_paid CHECK (
  status != 'paid' OR payment_id IS NOT NULL
);
```

## General Rules

- All complex constraints go in **migration SQL** — they can't be expressed in schema definitions alone
- Always include a **comment** explaining the business rule the constraint enforces
- Test constraints with both valid and invalid data in your test suite
