# Enum Conventions

## Never Hardcode Enum Strings

```typescript
// WRONG — hardcoded string
if (user.role === "super_admin") { ... }
const status = "active";

// CORRECT — use the enum/constant
if (user.role === UserRole.SuperAdmin) { ... }
const status = ProjectStatus.Active;
```

## Never Cast Enums with `as`

```typescript
// WRONG — unsafe cast
const role = dbRow.role as UserRole;

// CORRECT — validate with the companion/validator
const role = validator.requiredEnum("role", Object.values(UserRole));
```

## Enum Mapping Between Layers

When DB values differ from API values, use compile-time-safe mapping objects:

```typescript
// CORRECT — Record<Source, Target> ensures exhaustiveness
const DB_TO_API_ROLE: Record<string, UserRole> = {
  super_admin: UserRole.SuperAdmin,
  user: UserRole.User,
};

const API_TO_DB_ROLE: Record<UserRole, string> = {
  [UserRole.SuperAdmin]: "super_admin",
  [UserRole.User]: "user",
};

// Usage
const apiRole = DB_TO_API_ROLE[dbRow.role];
if (!apiRole) throw ApiError.internal(`Unknown role: ${dbRow.role}`);
```

Benefits:
- Adding a new enum value to `UserRole` causes a **compile-time error** in `API_TO_DB_ROLE` if the mapping is missing
- No risk of typos in string comparisons
- All mappings in one place, easy to audit

## Enum Validation in DB Queries

Use `CHECK` constraints in SQL to enforce valid values:

```sql
-- CORRECT
role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'user'))

-- WRONG — no constraint, any string accepted
role VARCHAR(50) NOT NULL
```

## Enum Validation in Companions

Always validate enums when reading from DB:

```typescript
const role = validator.requiredEnum("role", Object.values(UserRole) as UserRole[]);
const currency = validator.optionalEnum("preferred_currency", Object.values(Currency) as Currency[]);
```
