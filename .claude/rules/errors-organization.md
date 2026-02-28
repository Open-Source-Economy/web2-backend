# Error Class Organization

## Directory Structure

All custom error classes live in `src/errors/`, organized by domain:

```
src/errors/
├── api-error.ts                  # RFC 7807 ApiError (already exists)
├── problem-types.ts              # ProblemType, ProblemTitle, ProblemStatus
├── auth/
│   ├── auth.error.ts             # Authentication/authorization errors
│   └── index.ts
├── http/
│   ├── http-client.error.ts      # External HTTP request failures
│   ├── http-timeout.error.ts     # Request timeouts
│   └── index.ts
├── validation/
│   ├── file-validation.error.ts  # File upload validation
│   └── index.ts
├── <domain>/                     # Domain-specific errors as needed
│   ├── <domain>.error.ts
│   └── index.ts
└── index.ts                      # Master re-export
```

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| File name | `kebab-case.error.ts` | `auth.error.ts`, `http-client.error.ts` |
| Class name | `PascalCaseError` | `AuthError`, `HttpClientError` |
| Error code enum | `PascalCaseErrorCode` | `AuthErrorCode`, `FundingErrorCode` |
| Error code value | `DOMAIN_ERROR_NAME` | `AUTH_TOKEN_EXPIRED`, `FUNDING_INSUFFICIENT_CREDIT` |

## Error Class Template

Every domain error class follows this pattern:

```typescript
// src/errors/auth/auth.error.ts

export enum AuthErrorCode {
  TokenExpired = "AUTH_TOKEN_EXPIRED",
  InvalidCredentials = "AUTH_INVALID_CREDENTIALS",
  UserNotFound = "AUTH_USER_NOT_FOUND",
}

export class AuthError extends Error {
  readonly name = "AuthError";

  constructor(
    public readonly code: AuthErrorCode,
    message: string,
    public readonly statusCode: number = 401,
  ) {
    super(message);
  }

  // Static factory methods — one per error code
  static tokenExpired(): AuthError {
    return new AuthError(AuthErrorCode.TokenExpired, "Token has expired");
  }

  static invalidCredentials(): AuthError {
    return new AuthError(AuthErrorCode.InvalidCredentials, "Invalid credentials");
  }

  static userNotFound(): AuthError {
    return new AuthError(AuthErrorCode.UserNotFound, "User not found", 404);
  }
}
```

## Rules

- **All** `class X extends Error` must be in `src/errors/`  — never scattered in services or controllers
- Always set `this.name` or `readonly name` in the constructor
- Always provide **static factory methods** — never expose the constructor as the primary API
- Use **native enums** for error codes — never string literal unions
- Export everything from `src/errors/index.ts` so consumers import from one place
- Error codes use the format `DOMAIN_ERROR_NAME` (e.g., `AUTH_TOKEN_EXPIRED`)

## Error Middleware Mapping

The error handler middleware in `src/middlewares/errorHandler.ts` should handle domain errors by mapping them to ProblemDetails:

```typescript
// In problemDetailsErrorHandler or a new domain error handler:
if (err instanceof AuthError) {
  const problemDetails: ProblemDetails = {
    type: `https://api.open-source-economy.com/problems/${err.code.toLowerCase()}`,
    title: err.name,
    status: err.statusCode,
    detail: err.message,
  };
  return res.status(err.statusCode).json(problemDetails);
}
```
