# Database Conventions

## Tech Stack

- **PostgreSQL** with `pg` native driver (no ORM)
- **Repository pattern** with `BaseRepository<T>` abstract class
- **Companion objects** for row-to-model transformation
- **Raw SQL migrations** in `src/db/migration/` (sequential numbered files)

## No Fake Data

Never use placeholder or invented data in the database layer.

```sql
-- WRONG — empty string is fake data
INSERT INTO app_user (name, email) VALUES ('', '');

-- WRONG — hardcoded placeholder
INSERT INTO app_user (name) VALUES ('TBD');
INSERT INTO app_user (id) VALUES ('00000000-0000-0000-0000-000000000000');

-- CORRECT — if a field has no value, make it nullable
ALTER TABLE app_user ALTER COLUMN name DROP NOT NULL;
```

**Empty string `""` IS fake data.** If a field can be empty, it should be `NULL`, not `""`.

## Allowed vs Forbidden Defaults

### Allowed in SQL Schema

Technical defaults that generate infrastructure values:

```sql
id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid()
created_at TIMESTAMP NOT NULL DEFAULT now()
updated_at TIMESTAMP NOT NULL DEFAULT now()
```

### Forbidden in SQL Schema

Business-logic defaults belong in the service layer, not the schema:

```sql
-- WRONG — business default in schema
role VARCHAR(50) NOT NULL DEFAULT 'user'
status VARCHAR(50) NOT NULL DEFAULT 'pending'
preferred_currency VARCHAR(10) DEFAULT 'USD'

-- CORRECT — set in service layer code
const user = { role: UserRole.User, ... };
```

## Table Naming

- **Table names**: `snake_case` (e.g., `app_user`, `github_repository`, `issue_funding`)
- **Column names**: `snake_case` (e.g., `created_at`, `user_id`, `github_id`)

## Soft-Delete vs Hard-Delete

Define a clear policy per table:

| Table | Policy | Rationale |
|-------|--------|-----------|
| `app_user` | Soft-delete | User data retention, audit trail |
| `company`, `address` | Soft-delete | Legal/billing requirements |
| `developer_profile` | Soft-delete | Linked to user data |
| `github_owner`, `github_repository`, `github_issue` | Hard-delete OK | Re-synced from GitHub |
| `newsletter_subscription` | Hard-delete OK | No audit requirement |
| `stripe_*` tables | Soft-delete | Financial audit trail |
| `issue_funding`, `managed_issue` | Soft-delete | Financial records |

### Implementing Soft-Delete

```sql
-- Add to table
ALTER TABLE app_user ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL;

-- Always filter in queries
SELECT * FROM app_user WHERE deleted_at IS NULL;
```

In repositories, **always** filter `WHERE deleted_at IS NULL` for soft-deletable tables.

## Repository Pattern

```typescript
// Define interface for the repository
export interface UserRepository {
  getById(id: UserId): Promise<User | null>;
  create(user: CreateUserData): Promise<User>;
}

// Implementation uses pool
class UserRepositoryImpl implements UserRepository {
  constructor(private pool: Pool) {}

  async getById(id: UserId): Promise<User | null> {
    const result = await this.pool.query(
      "SELECT * FROM app_user WHERE id = $1 AND deleted_at IS NULL",
      [id]
    );
    if (result.rows.length === 0) return null;
    return UserCompanion.fromRaw(result.rows[0]);
  }
}
```

## Companion Objects for Row Mapping

All row-to-model transformations go through companion objects in `src/db/helpers/companions/`:

```typescript
export namespace UserCompanion {
  export function fromRaw(row: any): BackendUser | ValidationError {
    const validator = new Validator(row);
    const id = validator.requiredString("id");
    const role = validator.requiredEnum("role", Object.values(UserRole));
    // ... validate all fields
    const error = validator.getFirstError();
    if (error) return error;
    return { id, role, ... } as BackendUser;
  }
}
```

Rules:
- Never map DB rows inline — always use a companion
- Validate all fields, even from trusted sources
- Return `ValidationError` for malformed rows, don't throw
