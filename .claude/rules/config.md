# Configuration

## Pattern

Configuration follows a three-part pattern in `src/config/config.ts`:

1. **Joi schema** — validates environment variables at startup
2. **Config interfaces** — typed structure for the application
3. **Mapping** — transforms validated env vars into the config object

```typescript
// 1. Schema (validates at startup, app crashes if invalid)
const envVarsSchema = Joi.object({
  FEATURE_URL: Joi.string().uri().required(),
  FEATURE_API_KEY: Joi.string().required(),
  FEATURE_ENABLED: Joi.boolean().default(false),  // Default to safe/off
}).unknown();

// 2. Interface
interface FeatureConfig {
  url: string;
  apiKey: string;
  enabled: boolean;
}

// 3. Mapping (pure pass-through, no logic)
feature: {
  url: envVars.FEATURE_URL,
  apiKey: envVars.FEATURE_API_KEY,
  enabled: envVars.FEATURE_ENABLED,
} as FeatureConfig,
```

## Rules

### All Env Vars Are Required Unless They Have a Safe Default

```typescript
// CORRECT — required, no default
STRIPE_SECRET_KEY: Joi.string().required(),

// CORRECT — optional with safe default
SHOW_DEBUG_LOGS: Joi.boolean().default(false),
GITHUB_SYNC_RATE_LIMIT_DELAY_MS: Joi.number().default(1000),

// WRONG — optional without default (will be undefined at runtime)
STRIPE_SECRET_KEY: Joi.string(),
```

### Feature Toggles Must Default to `false` (Production-Safe)

```typescript
// CORRECT — off by default
FEATURE_ENABLED: Joi.boolean().default(false),

// WRONG — on by default risks enabling unfinished features in prod
FEATURE_ENABLED: Joi.boolean().default(true),
```

### Defaults Go in the Joi Schema, Not in the Mapper

```typescript
// CORRECT — default in schema
PGPOOL_MAX_SIZE: Joi.number().default(10),

// ... then in mapper:
maxSize: envVars.PGPOOL_MAX_SIZE,

// WRONG — fallback in mapper
maxSize: envVars.PGPOOL_MAX_SIZE ?? 10,
```

### No Logic in the Mapper

The mapping from env vars to config is a pure pass-through. No conditionals, no transformations:

```typescript
// CORRECT
postgres: {
  host: envVars.PGHOST,
  port: envVars.PGPORT,
}

// WRONG — logic in mapper
postgres: {
  host: envVars.PGHOST || "localhost",
  port: envVars.ENV === "test" ? 5433 : envVars.PGPORT,
}
```

### Always Update `.env.example` for Every Config Change

When adding a new env var:
1. Add it to the Joi schema in `config.ts`
2. Add the config interface field
3. Add the mapping
4. Add it to `.env.example` with a placeholder value
