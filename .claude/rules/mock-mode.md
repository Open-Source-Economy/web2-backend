# Mock Mode Policy

## Core Rule

Mock mode must **default to OFF** (production-safe). Local development explicitly opts in via `.env`.

## Pattern

```typescript
// In config schema (Joi)
GITHUB_MOCK_MODE: Joi.boolean().default(false),   // Safe: real by default
STRIPE_MOCK_MODE: Joi.boolean().default(false),

// In config interface
interface Config {
  github: {
    mockMode: boolean;
    // All fields required regardless of mock mode
    publicAccessToken: string;
    clientId: string;
    clientSecret: string;
  };
}
```

## Rules

### Feature Toggles Default to `false`

```typescript
// CORRECT — off by default, production uses real service
GITHUB_MOCK_MODE: Joi.boolean().default(false),

// WRONG — on by default, risks shipping mocks to production
GITHUB_MOCK_MODE: Joi.boolean().default(true),
```

### All Config Values Required Regardless of Mock Mode

Never make a config field optional just because mocks don't need it:

```typescript
// WRONG — optional because "mocks don't use it"
STRIPE_SECRET_KEY: Joi.string().when("STRIPE_MOCK_MODE", {
  is: true,
  then: Joi.optional(),
  otherwise: Joi.required(),
}),

// CORRECT — always required, forces production env to be properly configured
STRIPE_SECRET_KEY: Joi.string().required(),
```

This ensures production environments always have all credentials configured, even if someone accidentally sets mock mode to false.

### Service Wiring

```typescript
// Factory function selects implementation based on config
function createGitHubService(): IGitHubService {
  if (config.github.mockMode) {
    logger.warn("GitHub service running in MOCK MODE");
    return new MockGitHubService();
  }
  return new GitHubService(config.github);
}
```

Rules:
- **Log a warning** when mock mode is active — makes it obvious in logs
- Mock and real implementations share the same **interface**
- Mock implementations should return realistic data, not empty objects
