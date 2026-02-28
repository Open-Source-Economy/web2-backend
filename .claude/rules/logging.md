# Logging Conventions

## Logger

The project uses **Winston** (`src/config/logger.ts`) and **Morgan** for HTTP request logging.

## Log Levels

| Level   | When to Use                             | Example                                                                   |
| ------- | --------------------------------------- | ------------------------------------------------------------------------- |
| `error` | Unexpected failures that need attention | DB connection lost, unhandled exception                                   |
| `warn`  | Expected but notable issues             | Rate limit approaching, deprecated API called, sync completed with errors |
| `info`  | Important business events               | User registered, payment completed, sync started                          |
| `debug` | Development-only details                | Query parameters, request/response bodies                                 |

```typescript
// CORRECT — appropriate levels
logger.error("Database connection failed", { error: err.message });
logger.warn(`GitHub sync completed with ${errorCount} errors`);
logger.info(`User ${userId} registered successfully`);
logger.debug(`Fetching repos for ${owner}`, { query });

// WRONG — everything at error level
logger.error("User not found"); // This is expected behavior, use warn or debug
```

## Never Log Sensitive Data

```typescript
// WRONG — leaking secrets
logger.info(`Connecting with token ${config.github.publicAccessToken}`);
logger.debug(`User password: ${password}`);
logger.info(`Stripe key: ${config.stripe.secretKey}`);

// CORRECT — redact or omit
logger.info("Connecting to GitHub API");
logger.debug(`User login attempt for ${email}`);
logger.info("Stripe checkout created", { sessionId });
```

Sensitive fields to never log:

- Passwords, tokens, API keys, secrets
- Full credit card numbers
- Session IDs (log only first/last 4 chars if needed)

## Error Logging

Always include context when logging errors:

```typescript
// CORRECT — context helps debugging
logger.error(`Failed to sync repo ${owner}/${repo}`, {
  error: err.message,
  statusCode: err.status,
  stack: err.stack,
});

// WRONG — no context
logger.error(err.message);
logger.error("Something went wrong");
```

## Request Logging

Morgan handles HTTP request logging automatically. Don't add manual request logs in route handlers unless debugging a specific issue.

## Structured Logging

Use objects for additional context, not string interpolation:

```typescript
// CORRECT — structured, searchable
logger.info("Payment completed", { userId, amount, currency });

// LESS IDEAL — harder to search/filter
logger.info(`Payment of ${amount} ${currency} completed for user ${userId}`);
```
