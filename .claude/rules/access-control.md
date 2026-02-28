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

### Pattern: Access Check Helpers

Create reusable helpers for feature-level access checks:

```typescript
// src/utils/access-control.ts

/**
 * Check if user has access to a resource.
 * Returns ApiError if denied, null if allowed.
 */
export function requireResourceAccess(user: UserWithAuth, resourceOwnerId: UserId): ApiError | null {
  if (user.role === UserRole.SuperAdmin) return null;
  if (user.id === resourceOwnerId) return null;
  return ApiError.forbidden("You do not have access to this resource");
}

/**
 * Check if user has company-level access.
 */
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

### Usage in Services

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
