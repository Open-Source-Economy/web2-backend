# Endpoint / Router Conventions

## ts-rest Router Pattern

New endpoints use ts-rest routers with contracts from `@open-source-economy/api-types`:

```typescript
import { contract } from "@open-source-economy/api-types";
import * as dto from "@open-source-economy/api-types";
import { s } from "../../ts-rest";
import { requireAuth, getAuthUser } from "../../middlewares/auth/ts-rest-auth";

export const featureRouter = s.router(contract.feature, {
  getItem: {
    middleware: [requireAuth],
    handler: async ({ params, query, req }) => {
      const user = getAuthUser(req);

      // Business logic...
      const item = await repository.getById(params.id);
      if (!item) throw ApiError.notFound(`Item ${params.id} not found`);

      return {
        status: 200 as const,
        body: { item },
      };
    },
  },

  createItem: {
    middleware: [requireAuth],
    handler: async ({ body, req }) => {
      const user = getAuthUser(req);

      // Create...
      const item = await repository.create(body);

      return {
        status: 201 as const,
        body: { item },
      };
    },
  },
});
```

## Status Codes

Always use `as const` for literal status types:

| Operation          | Status         | Example               |
| ------------------ | -------------- | --------------------- |
| GET (read)         | `200 as const` | Fetch a resource      |
| POST (create)      | `201 as const` | Create a new resource |
| PATCH/PUT (update) | `200 as const` | Update a resource     |
| DELETE             | `204 as const` | Delete a resource     |

```typescript
// CORRECT
return { status: 200 as const, body: { ... } };

// WRONG — missing `as const`, ts-rest can't narrow the type
return { status: 200, body: { ... } };
```

## Authentication

Use the ts-rest auth middleware and helper:

```typescript
import { requireAuth, getAuthUser } from "../../middlewares/auth/ts-rest-auth";

// In router:
getItem: {
  middleware: [requireAuth],  // Ensures user is authenticated
  handler: async ({ req }) => {
    const user = getAuthUser(req);  // Typed user object
    // ...
  },
},
```

For public endpoints, omit the middleware array.

## Response Shape

Wrap response data in a named property — never return bare objects:

```typescript
// CORRECT — wrapped
return { status: 200 as const, body: { user, projects } };
return { status: 200 as const, body: { items: projects } };

// WRONG — bare array
return { status: 200 as const, body: projects };
```

Exception: empty responses for POST/DELETE:

```typescript
return { status: 201 as const, body: {} };
return { status: 204 as const, body: undefined };
```

## Error Handling in Routers

Throw `ApiError` — the error middleware chain handles the rest:

```typescript
handler: async ({ params }) => {
  const item = await repository.getById(params.id);
  if (!item) {
    throw ApiError.notFound(`Item ${params.id} not found`);
  }
  return { status: 200 as const, body: { item } };
},
```

Never catch errors to send manual responses — let them propagate to the error middleware.
