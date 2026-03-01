# Access Control

## Core Principle

Access control logic lives in the **service layer**, not in route handlers or middleware. Route-level middleware only handles **authentication** (is the user logged in?). **Authorization** (can this user do this action?) happens in services.

## Authentication (Route Level)

Use the ts-rest auth middleware to verify the user is logged in:

```typescript
// In router — only checks authentication
getProject: {
  middleware: [requireAuth],
  handler: async ({ params, req }) => {
    const user = getAuthUser(req);
    // Authorization happens in service...
    const result = await projectService.getProject(params.id, user);
  },
},
```

For public endpoints, omit the middleware.

## Authorization (Service Level)

### Three-Function Pattern

Access check helpers come in three variants. Use the right one for the situation:

| Helper                    | Returns               | Use when                                                         |
| ------------------------- | --------------------- | ---------------------------------------------------------------- |
| `requireResourceAccess`   | `ApiError \| null`    | Standard gating — throw on denial                                |
| `hasResourceAccess`       | `boolean`             | Need `notFound` instead of `forbidden`, or checking in loops     |
| `getAccessibleCompanyIds` | `CompanyId[] \| null` | Data scoping for list endpoints (`null` = super admin, all data) |

```typescript
// src/utils/access-control.ts

// 1. require — throws on denial (standard case)
export function requireResourceAccess(user: UserWithAuth, resourceOwnerId: UserId): ApiError | null {
  if (user.role === UserRole.SuperAdmin) return null;
  if (user.id === resourceOwnerId) return null;
  return ApiError.forbidden("You do not have access to this resource");
}

// 2. has — returns boolean (for notFound or loops)
export function hasResourceAccess(user: UserWithAuth, resourceOwnerId: UserId): boolean {
  if (user.role === UserRole.SuperAdmin) return true;
  return user.id === resourceOwnerId;
}

// 3. getScoped — data scoping for list endpoints
// Returns null for super admin (means "all"), array for regular users
export function getAccessibleCompanyIds(user: UserWithAuth): CompanyId[] | null {
  if (user.role === UserRole.SuperAdmin) return null; // null = no filter, see all
  return user.companies?.map((c) => c.companyId) ?? [];
}

// Company-level access
export function requireCompanyAccess(
  user: UserWithAuth,
  companyId: CompanyId,
  requiredRole: CompanyRole
): ApiError | null {
  if (user.role === UserRole.SuperAdmin) return null;
  const membership = user.companies?.find((c) => c.companyId === companyId);
  if (!membership || membership.role < requiredRole) {
    return ApiError.forbidden("Insufficient company permissions");
  }
  return null;
}
```

### Usage: Standard Gating (require)

```typescript
class ProjectService {
  async deleteProject(projectId: string, user: UserWithAuth): Promise<void> {
    const project = await this.repo.getById(projectId);
    if (!project) throw ApiError.notFound("Project not found");

    const accessError = requireResourceAccess(user, project.ownerId);
    if (accessError) throw accessError;

    await this.repo.delete(projectId);
  }
}
```

### Usage: NotFound Instead of Forbidden (has)

When you want unauthorized users to see `404` instead of `403` (to avoid leaking resource existence):

```typescript
async getProject(projectId: string, user: UserWithAuth): Promise<Project> {
  const project = await this.repo.getById(projectId);
  if (!project || !hasResourceAccess(user, project.ownerId)) {
    throw ApiError.notFound("Project not found"); // 404, not 403
  }
  return project;
}
```

### Usage: Data Scoping for Lists (getScoped)

```typescript
async listProjects(user: UserWithAuth, query: ListQuery): Promise<PaginatedResult<Project>> {
  const companyIds = getAccessibleCompanyIds(user);
  if (companyIds === null) {
    // Super admin — no filter
    return this.repo.listAll(query.limit, query.cursor);
  }
  return this.repo.listByCompanyIds(companyIds, query.limit, query.cursor);
}
```

See also: [data-scoping.md](./data-scoping.md) for full multi-tenant scoping patterns.

## What NOT to Do

```typescript
// WRONG — ad-hoc role checks scattered in handlers
handler: async ({ req }) => {
  const user = getAuthUser(req);
  if (user.role !== UserRole.SuperAdmin) {
    throw ApiError.forbidden("Only admins can do this");
  }
  // ...
},

// WRONG — authorization in middleware
function requireAdmin(req, res, next) {
  if (req.user.role !== "super_admin") return res.status(403).send("Forbidden");
  next();
}

// WRONG — string comparison for roles
if (user.role === "super_admin") { ... }
```

## Exception

The existing `authenticatedSuperAdmin` middleware is acceptable for admin-only routes during migration. For new features, prefer service-layer authorization.
