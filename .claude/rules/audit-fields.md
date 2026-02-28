# Audit Fields

## Timestamp Fields

Every table should have `created_at` and `updated_at`:

```sql
created_at TIMESTAMP NOT NULL DEFAULT now(),
updated_at TIMESTAMP NOT NULL DEFAULT now()
```

Update `updated_at` on every modification:

```sql
UPDATE app_user SET name = $1, updated_at = now() WHERE id = $2;
```

## Audit FK Fields (createdBy, updatedBy)

When tracking **who** performed an action, use nullable User references:

```sql
created_by UUID REFERENCES app_user(id) ON DELETE SET NULL,
updated_by UUID REFERENCES app_user(id) ON DELETE SET NULL
```

### Why Always Nullable

Audit FKs must be nullable because:

- **System processes** have no user (e.g., scheduled sync, webhook handler)
- **Pre-auth operations** happen before a user exists (e.g., registration flow)
- **User deletion** should not cascade to audit history — use `ON DELETE SET NULL`

```typescript
// CORRECT — nullable audit FK
await client.query(
  "INSERT INTO document (name, created_by) VALUES ($1, $2)",
  [name, user?.id ?? null] // null if no user context
);

// WRONG — required audit FK
await client.query(
  "INSERT INTO document (name, created_by) VALUES ($1, $2)",
  [name, user.id] // Fails for system processes
);
```

### Regular FK vs Audit FK

| Type                      | Nullability | ON DELETE               | Purpose                   |
| ------------------------- | ----------- | ----------------------- | ------------------------- |
| **Regular FK** (owner_id) | `NOT NULL`  | `RESTRICT` or `CASCADE` | Who owns this resource    |
| **Audit FK** (created_by) | Nullable    | `SET NULL`              | Who performed this action |

```sql
-- Regular FK: resource ownership
user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT

-- Audit FK: action tracking
created_by UUID REFERENCES app_user(id) ON DELETE SET NULL
uploaded_by UUID REFERENCES app_user(id) ON DELETE SET NULL
deleted_by UUID REFERENCES app_user(id) ON DELETE SET NULL
```
