# JSON Columns

## When to Use JSON vs Relations

| Use JSON | Use a Relation Table |
|----------|---------------------|
| Value objects (no identity, no lifecycle) | Entities with their own ID and lifecycle |
| Always read/written as a group | Queried/filtered independently |
| Schema rarely changes | Schema evolves with the domain |
| No foreign keys needed | Has relationships to other tables |

```sql
-- JSON is appropriate: metadata blob, always read/written together
metadata JSONB

-- Relation is better: each address has its own lifecycle
CREATE TABLE address (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_user(id),
  ...
)
```

## Rules

### Always Validate JSON When Reading from DB

JSON columns are untyped in PostgreSQL — always validate with Zod in the mapper:

```typescript
import { z } from "zod";

const syncMetadataSchema = z.object({
  lastSyncAt: z.string().datetime(),
  totalItems: z.number(),
  errors: z.array(z.string()),
});

// In companion/mapper
function mapSyncResult(row: any): SyncResult {
  const metadata = syncMetadataSchema.parse(row.metadata);
  return {
    id: row.id,
    lastSyncAt: new Date(metadata.lastSyncAt),
    totalItems: metadata.totalItems,
    errors: metadata.errors,
  };
}
```

### Document the Expected Shape

Add a comment in the migration describing the JSON schema:

```sql
-- sync_metadata JSONB: { lastSyncAt: ISO datetime, totalItems: number, errors: string[] }
ALTER TABLE github_sync ADD COLUMN sync_metadata JSONB;
```

### Never Store JSON Without a Schema

```typescript
// WRONG — unvalidated, unknown shape
const data = row.metadata as any;
return data.someField;

// CORRECT — validated with Zod
const data = metadataSchema.parse(row.metadata);
return data.someField;
```

### Don't Use JSON for Queryable Data

If you need to filter or join on a field, it should be a regular column, not inside JSON:

```sql
-- WRONG — querying inside JSON is slow and unindexed
SELECT * FROM project WHERE metadata->>'status' = 'active';

-- CORRECT — make it a column
SELECT * FROM project WHERE status = 'active';
```
