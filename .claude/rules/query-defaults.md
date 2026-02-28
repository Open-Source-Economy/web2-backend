# Query Parameter Defaults

## Core Rule

Default values for query parameters belong in the **API contract schema** (`@open-source-economy/api-types`), not in backend code.

## Why

- Single source of truth for what "no value provided" means
- Frontend and backend agree on defaults automatically
- No risk of frontend and backend using different defaults

## Examples

```typescript
// WRONG — default in backend code
handler: async ({ query }) => {
  const limit = query.limit ?? 20;
  const page = query.page ?? 1;
  const sortBy = query.sortBy ?? "createdAt";
  // ...
},

// WRONG — default in repository
async listProjects(limit?: number) {
  const actualLimit = limit || 50;
  // ...
}

// CORRECT — default defined in API contract schema (api-types package)
// In @open-source-economy/api-types:
// limit: z.number().default(20)
// sortBy: z.enum(["createdAt", "name"]).default("createdAt")

// Backend just uses the value — it's already defaulted by validation
handler: async ({ query }) => {
  const projects = await repo.list(query.limit, query.sortBy);
  // ...
},
```

## When Backend Defaults Are OK

Internal limits that are not exposed to the API:

```typescript
// OK — internal batch size, not a query param
const SYNC_BATCH_SIZE = 50;

// OK — config value with Joi default
GITHUB_SYNC_CHUNK_SIZE: Joi.number().default(50);
```

These are implementation details, not API contract concerns.
