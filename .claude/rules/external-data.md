# External Provider Data

## Prefix External Fields

When storing data synced from external providers (GitHub, Stripe, etc.), prefix ALL fields with the provider name. This makes data origin immediately clear.

```
No prefix = our data (user-entered or system-generated)
Prefixed  = external provider's data (synced/imported)
```

## Examples

### GitHub

```sql
-- DB columns for GitHub-synced data
github_id        INTEGER,
github_login     VARCHAR(255),
github_avatar_url TEXT,
github_name      VARCHAR(255),
github_bio       TEXT,

-- Our own data (no prefix)
display_name     VARCHAR(255),
role             VARCHAR(50),
created_at       TIMESTAMP
```

In TypeScript:

```typescript
interface Owner {
  // Our data
  id: string;
  displayName: string;

  // GitHub-synced data
  githubId: number;
  githubLogin: string;
  githubAvatarUrl: string | null;
  githubName: string | null;
}
```

### Stripe

```sql
-- Stripe-synced data
stripe_customer_id   VARCHAR(255),
stripe_subscription_id VARCHAR(255),
stripe_price_id      VARCHAR(255),

-- Our data
plan_type            VARCHAR(50),
billing_email        VARCHAR(255)
```

## Why This Matters

1. **Debugging**: Instantly know if a value came from GitHub or was entered by a user
2. **Sync safety**: Clear which fields get overwritten on re-sync vs which are user-controlled
3. **Schema clarity**: No ambiguity about data ownership

## Exception

When the entire table represents external data (e.g., `github_repository` stores only GitHub data), the table name itself provides the context. Individual columns don't need the prefix within that table — but keep it if the table mixes our data with synced data.
