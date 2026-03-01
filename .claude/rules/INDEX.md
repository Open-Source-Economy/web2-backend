# Backend AI Docs Index

Read this file first to find the right guide for your task.

## IMPORTANT: API Mismatch

Before implementing any endpoint, read [api-mismatch.md](./api-mismatch.md). If the API contract (`@open-source-economy/api-types`) doesn't fit what the backend needs, **STOP, ask the user, and wait**. Never silently work around a bad contract.

## Task Index

| Task                           | Rule File(s)                                                                                                           | Key Points                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **New endpoint**               | [endpoints.md](./endpoints.md), [api-mismatch.md](./api-mismatch.md)                                                   | ts-rest router, `status: N as const`, wrap response in named property          |
| **New feature / module**       | [specs.md](./specs.md), [modules.md](./modules.md)                                                                     | Write spec first, export service interface, group by feature                   |
| **New entity / DB table**      | [database.md](./database.md), [audit-fields.md](./audit-fields.md)                                                     | Repository pattern, companion for row mapping, `created_at`/`updated_at`       |
| **New companion mapper**       | [mappers.md](./mappers.md), [enums.md](./enums.md)                                                                     | Tier 1 in `src/db/helpers/companions/`, validate all fields                    |
| **New feature mapper**         | [mappers.md](./mappers.md)                                                                                             | Tier 3, lives alongside router/service, pure functions only                    |
| **New external integration**   | [integrations.md](./integrations.md), [integration-endpoints.md](./integration-endpoints.md)                           | Three layers (HTTP Client → API Client → Service), mock client required        |
| **Sync external data**         | [data-sync-mappers.md](./data-sync-mappers.md), [processing-results.md](./processing-results.md)                       | IDataMapper interface, IssueCollector, ProcessingOutcome                       |
| **Add config / env var**       | [config.md](./config.md), [mock-mode.md](./mock-mode.md)                                                               | Joi schema + interface + mapping + `.env.example`, all values required         |
| **New error class**            | [errors.md](./errors.md), [errors-organization.md](./errors-organization.md)                                           | In `src/errors/`, native enum codes, static factory methods                    |
| **Access control**             | [access-control.md](./access-control.md), [data-scoping.md](./data-scoping.md)                                         | Authorization in service layer, require/has/getScoped helpers                  |
| **List endpoint**              | [pagination.md](./pagination.md), [query-defaults.md](./query-defaults.md), [data-scoping.md](./data-scoping.md)       | Cursor-based, defaults in API contract, scope to user access                   |
| **Database migration**         | [database.md](./database.md), [complex-constraints.md](./complex-constraints.md), [json-columns.md](./json-columns.md) | Sequential numbered files, document constraints, validate JSON with Zod        |
| **Transaction**                | [transactions.md](./transactions.md)                                                                                   | try/catch/finally, no external calls inside, compensation for cross-system     |
| **Tests**                      | [testing.md](./testing.md)                                                                                             | Factories with defaults, mock via interfaces, test behavior not implementation |
| **Import something**           | [imports.md](./imports.md), [circular-dependencies.md](./circular-dependencies.md)                                     | `* as dto` for DTOs, named for contract/IDs, specific files to break cycles    |
| **Update API contract**        | [api-sync.md](./api-sync.md), [api-mismatch.md](./api-mismatch.md)                                                     | Update package, rebuild, fix companions → mappers → routers → tests            |
| **Nullable / optional fields** | [domain-model-flexibility.md](./domain-model-flexibility.md)                                                           | Strict writes, flexible reads, `null` not `""`                                 |
| **Logging**                    | [logging.md](./logging.md)                                                                                             | Winston, structured objects, never log secrets                                 |
| **Enum mapping**               | [enums.md](./enums.md)                                                                                                 | Record<Source, Target> for compile-time safety, validate in companions         |
| **Style / formatting**         | [style-guide.md](./style-guide.md)                                                                                     | Prettier, double quotes, 120 width, `npm run lint:fix`                         |

## Quick Rules

- `as` casts for branded IDs are OK from DB (trusted source)
- Use `* as dto` for API types, not `import type * as dto`
- Always use `status: 201 as const` (never bare `200`/`201`)
- Always EXPORT service interfaces (for testability)
- If API contract doesn't fit → **ASK the user**, don't work around it
- Prefix ALL external provider fields (`github_`, `stripe_`)
- All error classes live in `src/errors/`, exported from `index.ts`
- Domain error codes use native enums, not string literals
- Config values always required (even when mock mode exists)
- Mock mode defaults to `false` (production-safe)
- Config defaults only in Joi schema, never in mapper
- Always update `.env.example` when adding config
- Never use bare `string` for domain IDs — use typed IDs
- Never use fake/default data (`""`, `0`, `[]`, `'TBD'`)
- Never use empty arrays as defaults in mappers — ask if unsure
- Business defaults in service layer, never in DB schema
- Query parameter defaults in API contract, never in backend
