# Code Style Guide

## Formatting (Prettier)

Prettier is the single source of truth for formatting. Configured in the project `.prettierrc`:

- **Semicolons**: Always
- **Quotes**: Double quotes (`"`)
- **Tab width**: 2 spaces
- **Trailing commas**: ES5 (arrays, objects — not function params)
- **Arrow parens**: Always (`(x) => x + 1`, never `x => x + 1`)
- **Print width**: 120 characters

Run `npm run lint:fix` to auto-format. Pre-commit hook runs this automatically.

## TypeScript Strictness

The project uses `"strict": true` with `"noImplicitAny": true` and `"strictNullChecks": true`.

- Never use `// @ts-ignore` or `// @ts-expect-error` without a comment explaining why
- Never use `any` unless interfacing with untyped external libraries; prefer `unknown` and narrow
- Never use non-null assertion (`!`) unless you can prove the value is non-null

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Files | `camelCase.ts` or `PascalCase.ts` for classes | `config.ts`, `BaseRepository.ts` |
| Variables, functions | `camelCase` | `getUserById`, `isAuthenticated` |
| Classes, interfaces, types | `PascalCase` | `UserRepository`, `Config` |
| Enums | `PascalCase` (type), `PascalCase` (values) | `UserRole.SuperAdmin` |
| DB tables | `snake_case` | `app_user`, `github_repository` |
| DB columns | `snake_case` | `created_at`, `user_id` |
| Env vars | `SCREAMING_SNAKE_CASE` | `DATABASE_URL`, `STRIPE_SECRET_KEY` |
| API routes | `kebab-case` | `/api/v1/available-credit` |

## No Dead Code

- Don't commit commented-out code
- Don't leave unused imports, variables, or functions
- Don't add `// TODO` without a linked issue or clear timeline

## No Re-Exports for Convenience

Import from the source file, not from a barrel that re-exports:

```typescript
// CORRECT — import from source
import { UserCompanion } from "../db/helpers/companions/user/User.companion";

// WRONG — unnecessary re-export layer
// (unless it's the module's public API like src/errors/index.ts)
```

Exception: `index.ts` barrel files that define a module's public API (e.g., `src/errors/index.ts`) are fine.
