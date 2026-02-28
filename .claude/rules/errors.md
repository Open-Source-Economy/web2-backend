# Error Handling

## Core Principle

All API errors use RFC 7807 ProblemDetails via the `ApiError` class in `web2-backend/src/errors/api-error.ts`.

## Rules

### Use `ApiError` Static Factories — Never Construct Errors Manually

```typescript
// CORRECT
throw ApiError.notFound("User not found");
throw ApiError.badRequest("Invalid email format");
throw ApiError.unauthorized("Authentication required");

// WRONG — never construct raw Error or set status codes manually
throw new Error("Not found");
res.status(404).json({ message: "Not found" });
```

### Use Enum Error Codes — Never Compare with Strings

Error types are defined in `src/errors/problem-types.ts` using `ProblemType`, `ProblemTitle`, and `ProblemStatus` objects.

```typescript
// CORRECT — reference the enum-like object
if (err.type === ProblemType.NOT_FOUND) { ... }

// WRONG — hardcoded string
if (err.type === "https://api.open-source-economy.com/problems/not-found") { ... }
```

### Domain-Specific Errors

When a feature needs specific error codes beyond generic HTTP errors (e.g., "invitation expired", "funding insufficient"), create a domain-specific error class in `src/errors/`:

```typescript
// src/errors/funding-error.ts
export enum FundingErrorCode {
  InsufficientCredit = "FUNDING_INSUFFICIENT_CREDIT",
  AlreadyFunded = "FUNDING_ALREADY_FUNDED",
  IssueClosed = "FUNDING_ISSUE_CLOSED",
}

export class FundingError extends ApiError {
  readonly code: FundingErrorCode;

  static insufficientCredit(available: number, required: number): FundingError { ... }
  static alreadyFunded(issueId: string): FundingError { ... }
}
```

Rules for domain errors:

- All error classes live in `src/errors/` and are exported from `src/errors/index.ts`
- Use **native enums** for error codes — never string literal unions
- Always provide static factory methods — never expose the constructor directly
- Error codes use the format `DOMAIN_ERROR_NAME` (e.g., `FUNDING_INSUFFICIENT_CREDIT`)

### Error Handling by Layer

| Layer               | Pattern                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **ts-rest routers** | Throw `ApiError` — the `problemDetailsErrorHandler` middleware catches it                                               |
| **Services**        | Throw `ApiError` for business rule violations                                                                           |
| **Repositories**    | Return `null` for not-found, throw only for unexpected DB errors                                                        |
| **Middleware**      | Caught by the error handler chain: `problemDetailsErrorHandler` → `tsRestValidationErrorHandler` → `globalErrorHandler` |

### Status Codes

Always use `as const` for status codes in ts-rest handlers:

```typescript
return { status: 200 as const, body: { ... } };   // GET, PATCH, PUT
return { status: 201 as const, body: { ... } };   // POST (create)
return { status: 204 as const, body: undefined };  // DELETE
```

### Never Swallow Errors

```typescript
// WRONG — silently swallowing
try {
  await riskyOperation();
} catch (e) {
  /* ignore */
}

// CORRECT — log and rethrow or handle explicitly
try {
  await riskyOperation();
} catch (e) {
  logger.error("riskyOperation failed", e);
  throw ApiError.internal("Operation failed");
}
```
