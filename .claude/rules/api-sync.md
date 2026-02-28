# API Contract Synchronization

## When to Sync

Whenever `@open-source-economy/api-types` is updated (new version published), the backend must be synced.

## Sync Process

### 1. Update the Package

```bash
cd web2-backend
npm install @open-source-economy/api-types@<new-version>
```

### 2. Verify the Update

```bash
npm ls @open-source-economy/api-types
```

### 3. Rebuild and Fix Errors

```bash
npm run build
```

Common errors after an API update:

| Error | Cause | Fix |
|-------|-------|-----|
| `has no exported member 'X'` | Type was renamed or removed | Update import to new name |
| `Property 'X' does not exist` | Field renamed in contract | Update field references |
| `Type 'X' is not assignable to 'Y'` | Type changed shape | Update mapper/companion |
| `Argument of type 'X' is not assignable` | Enum value changed | Update enum mapping |
| Contract route mismatch | Endpoint path or method changed | Update router to match new contract |

### 4. Update Affected Code

When contract types change, update in order:

1. **Companions** — row-to-model mapping may need new/changed fields
2. **Mappers** — domain-to-API mapping may need new/changed fields
3. **Routers** — request/response shapes may have changed
4. **Tests** — update test fixtures to match new types

### 5. Run Full CI

```bash
npm run fmt   # Format + type-check + build
npm test      # Run tests
```

## Rules

- **Never skip the build step** — type errors from contract changes must be fixed immediately
- **Never use `as any`** to silence contract mismatches — fix the underlying type
- **Always update both `package.json` and `package-lock.json`** — commit both files
- If the contract change is a breaking change that requires new backend logic, implement the backend change **before** or **alongside** the contract update
