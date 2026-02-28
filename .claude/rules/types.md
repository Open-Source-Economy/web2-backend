# Type Safety

## Never Use Bare `string` for Domain Identifiers

Domain IDs must use their specific type from `@open-source-economy/api-types`, not raw `string`.

```typescript
// CORRECT — typed IDs
function getUser(id: UserId): Promise<User | null> { ... }
function getCompany(id: CompanyId): Promise<Company | null> { ... }

// WRONG — bare string loses type safety
function getUser(id: string): Promise<User | null> { ... }
```

This prevents accidentally passing a `CompanyId` where a `UserId` is expected.

## Composite ID Types

Some entities use composite IDs (objects, not strings). Always use the full type:

```typescript
// CORRECT — use the composite ID type
const ownerId: OwnerId = { login: "torvalds" };
const repoId: RepositoryId = { ownerId, name: "linux" };
const issueId: IssueId = { repositoryId: repoId, number: 42 };

// WRONG — constructing ad-hoc objects without the type
const id = { login: "torvalds", name: "linux", number: 42 };
```

## Explicit Type Annotations

**Required** for:
- Function return types when non-trivial (unions, nullable, complex objects)
- Variables holding union types or `null`
- Destructured objects from external sources (DB rows, API responses)

```typescript
// CORRECT — explicit return type for complex returns
async function findUser(id: UserId): Promise<User | null> { ... }

// OK — simple types can be inferred
const name = "hello";
const count = items.length;
```

**Not required** for:
- Simple literal assignments (`const x = 5`)
- Single-type returns obvious from the code
- Loop variables, map/filter callbacks

## ID Casting from Database

When reading IDs from trusted sources (database query results), use `as` cast:

```typescript
// CORRECT — DB is a trusted source
const userId = row.id as UserId;
const companyId = row.company_id as CompanyId;
```

For untrusted input (user input, request params), validate first:

```typescript
// CORRECT — validate untrusted input
const userId = params.userId; // Already validated by ts-rest/Zod contract
```
