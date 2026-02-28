# API Mismatch Protocol

## Core Principle

When the API contract (`@open-source-economy/api-types`) doesn't fit what the backend needs, **STOP and ask** before implementing. Never silently work around a bad contract.

## When to STOP and ASK

### Type Mismatches
- Backend needs a field that doesn't exist in the API request/response type
- A field type in the API doesn't match what the database stores (e.g., API says `string`, DB needs `number`)
- API uses a flat structure but DB has a nested relationship (or vice versa)

### Missing Endpoints
- You need a CRUD operation but no contract endpoint exists for it
- The HTTP method or path doesn't match the intended semantics

### Validation Gaps
- Backend has constraints (e.g., max length, required fields) that the API schema doesn't enforce
- API allows values that the DB schema rejects

### Naming Inconsistency
- API uses a different term than the domain model (e.g., API says `owner` but domain says `organization`)

## What NOT to Do

```typescript
// WRONG — casting to force a mismatch
const response = dbResult as unknown as dto.GetProjectResponse;

// WRONG — silently adding fields not in the contract
return { status: 200 as const, body: { ...contractFields, extraField: "hack" } };

// WRONG — silently dropping fields the contract requires
const { fieldIDontHave, ...rest } = contractBody;
return { status: 200 as const, body: rest as any };

// WRONG — using `as any` to silence type errors
return { status: 200 as const, body: result as any };
```

## What to Do Instead

1. **Identify the mismatch** — describe exactly what doesn't fit
2. **Ask the user** — should we update the API contract, or adjust the backend approach?
3. **Implement only after alignment** — once the contract is correct, the implementation follows naturally

## Exception

Minor naming differences between DB columns (`snake_case`) and API fields (`camelCase`) are expected and handled by companion/mapper objects. These are not mismatches — they're the mapper's job.
