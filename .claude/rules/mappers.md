# Mapper Conventions

## Architecture

Mappers transform data between layers. They are organized in tiers:

| Tier | Name                | Location                                                      | Purpose                                   |
| ---- | ------------------- | ------------------------------------------------------------- | ----------------------------------------- |
| 1    | Companion Mappers   | `src/db/helpers/companions/<entity>/`                         | Raw DB row → typed domain object          |
| 2    | Enum Mappers        | `src/db/helpers/companions/` (alongside companions)           | DB string ↔ API enum value               |
| 3    | Feature Mappers     | `src/routes/ts-rest/` or `src/services/` (alongside consumer) | Compose domain objects into API responses |
| 4    | Integration Mappers | `src/services/` (in the service calling the external API)     | External provider response → domain model |

### Tier 1 — Companion Mappers

Location: `src/db/helpers/companions/<entity>/<Entity>.companion.ts`

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

Location: `src/db/helpers/companions/` (alongside the companion that uses them)

Mapping tables between DB string values and API enum values. See [enums.md](./enums.md).

### Tier 3 — Feature Mappers

Location: `src/routes/ts-rest/` or `src/services/` (same directory as the consuming router or service)

Orchestrate companion mappers to assemble complex response objects.

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

Location: `src/services/` (in the service file that calls the external API)

Transform data from external providers (GitHub API, Stripe). See [integrations.md](./integrations.md) and [data-sync-mappers.md](./data-sync-mappers.md).

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

If data should exist, map it. If you're unsure whether data exists, **ASK the user** — don't silently default to `[]`. This is a critical rule: defaulting to empty arrays hides bugs where data was expected but wasn't queried.

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
