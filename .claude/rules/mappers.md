# Mapper Conventions

## Architecture

Mappers transform data between layers. They are organized in tiers:

### Tier 1 — Companion Mappers (`src/db/helpers/companions/`)

Transform raw database rows into typed domain objects. One companion per entity.

```typescript
// src/db/helpers/companions/user/User.companion.ts
export namespace UserCompanion {
  export function fromRaw(row: any): BackendUser | ValidationError {
    const validator = new Validator(row);
    const id = validator.requiredString("id");
    const role = validator.requiredEnum("role", Object.values(UserRole));
    // ...
    const error = validator.getFirstError();
    if (error) return error;
    return { id, role, ... } as BackendUser;
  }
}
```

### Tier 2 — Enum Mappers

Mapping tables between DB string values and API enum values. See [enums.md](./enums.md).

### Tier 3 — Service/Feature Mappers

Orchestrate companion mappers to assemble complex response objects. Live alongside the service or router that uses them.

```typescript
// Compose multiple companions into a response
function buildFullProject(project: Project, repositories: Repository[], issues: Issue[]): dto.FullProject {
  return {
    project,
    repositories: repositories.map(mapRepository),
    issues: issues.map(mapIssue),
  };
}
```

### Tier 4 — Integration Mappers

Transform data from external providers (GitHub API, Stripe). Live in the service that calls the external API.

## Rules

### Pure Functions, No Side Effects

Mappers transform data — they never fetch data, write to DB, or call external APIs.

```typescript
// CORRECT — pure transformation
function mapUserToResponse(user: BackendUser): dto.User {
  return { id: user.id, name: user.name, role: user.role };
}

// WRONG — fetching inside a mapper
function mapUserToResponse(user: BackendUser): dto.User {
  const profile = await profileRepo.getByUserId(user.id); // NO!
  return { id: user.id, name: user.name, profile };
}
```

### Never Default to Empty Arrays

If data should exist, map it. If you're unsure whether data exists, **ask** — don't silently default to `[]`.

```typescript
// WRONG — hiding missing data
return {
  emails: [], // Bug: emails exist in DB but weren't queried
  projects: [], // Bug: silently dropping data
};

// CORRECT — map what's available
return {
  emails: user.emails.map(mapEmail),
  projects: userProjects.map(mapProject),
};

// CORRECT — if truly optional and absent
return {
  avatar: user.avatarUrl ?? null, // Nullable, not fake default
};
```

### Compose, Never Duplicate

If a mapping already exists in a companion, call it — don't rewrite the logic.

```typescript
// WRONG — duplicating companion logic
const user = { id: row.id, name: row.name, role: row.role };

// CORRECT — reuse the companion
const user = UserCompanion.fromRaw(row);
```
