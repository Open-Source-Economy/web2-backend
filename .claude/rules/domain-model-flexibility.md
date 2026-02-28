# Domain Model Flexibility

## Two Schema Layers

Data models have two levels of strictness depending on direction:

### Strict (Writes — POST/PUT)

User-submitted data must pass full validation. All required fields enforced.

```typescript
// API contract for creating a developer profile
interface CreateDeveloperProfileBody {
  displayName: string;       // Required
  bio: string;               // Required
  hourlyRate: number;         // Required
  currency: Currency;         // Required
}
```

### Flexible (Reads — GET, Sync)

Data returned from the database or synced from external providers may have nullable fields. The response types reflect this.

```typescript
// API response type — some fields nullable
interface DeveloperProfileResponse {
  id: string;
  displayName: string;
  bio: string | null;         // May not be set yet
  hourlyRate: number | null;  // May not be set yet
  githubLogin: string | null; // From GitHub sync, may be absent
}
```

## Database: Nullable for Synced/Optional Data

If a field might not always have a value (especially from external sync), make it nullable in the database:

```sql
-- CORRECT — nullable for data that may not exist
github_avatar_url TEXT,           -- NULL if GitHub hasn't provided it
bio               TEXT,           -- NULL if user hasn't filled it

-- WRONG — NOT NULL with empty string default
github_avatar_url TEXT NOT NULL DEFAULT '',
bio               TEXT NOT NULL DEFAULT '',
```

## Mapper Rules

### Handle Nullable Fields Explicitly

```typescript
// CORRECT — explicit nullable handling
function mapDeveloperProfile(row: any): DeveloperProfileResponse {
  return {
    id: row.id,
    displayName: row.display_name,
    bio: row.bio ?? null,                    // NULL stays null
    hourlyRate: row.hourly_rate ?? null,
    githubLogin: row.github_login ?? null,
  };
}

// WRONG — coercing to empty values
function mapDeveloperProfile(row: any): DeveloperProfileResponse {
  return {
    id: row.id,
    displayName: row.display_name,
    bio: row.bio || "",              // Hiding null behind empty string
    hourlyRate: row.hourly_rate || 0, // Hiding null behind zero
  };
}
```

### Conditional Enum Mapping

When enums come from external sources, they may have unknown values:

```typescript
// CORRECT — warn on unknown, return null
const status = DB_TO_API_STATUS[row.status] ?? null;
if (row.status && !status) {
  logger.warn(`Unknown status value: ${row.status}`);
}

// WRONG — crash on unknown
const status = DB_TO_API_STATUS[row.status]!; // Throws if unknown
```

## Service Layer

- **Write methods** accept strict types (already validated by ts-rest/Zod)
- **Read methods** return flexible types (nullable fields from DB)
- Never coerce nullable fields to empty values (`""`, `0`, `[]`) — return `null`
