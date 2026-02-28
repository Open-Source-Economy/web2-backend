# Multi-Tenant Data Scoping

## Core Rule

Every list/query endpoint must scope data to what the authenticated user is allowed to see. Never return unscoped data.

## Pattern

```typescript
// In router
handler: async ({ query, req }) => {
  const user = getAuthUser(req);
  const projects = await projectService.listProjects(user, query);
  return { status: 200 as const, body: { items: projects } };
},

// In service — scope the query
async listProjects(user: UserWithAuth, query: ListQuery): Promise<Project[]> {
  if (user.role === UserRole.SuperAdmin) {
    // Super admins see everything
    return this.repo.listAll(query.limit, query.cursor);
  }
  // Regular users see only their own data
  return this.repo.listByUserId(user.id, query.limit, query.cursor);
}
```

## Company-Scoped Data

For multi-company features, always scope queries by the user's company access:

```typescript
async listCompanyProjects(
  user: UserWithAuth,
  companyId: CompanyId,
): Promise<Project[]> {
  // Verify user has access to this company
  const accessError = requireCompanyAccess(user, companyId, CompanyRole.Read);
  if (accessError) throw accessError;

  return this.repo.listByCompanyId(companyId);
}
```

## What NOT to Do

```typescript
// WRONG — returns ALL data, no scoping
async listProjects(): Promise<Project[]> {
  return this.repo.listAll();
}

// WRONG — trusts client-provided userId without verification
async listProjects(userId: string): Promise<Project[]> {
  return this.repo.listByUserId(userId);
}

// WRONG — scoping only in the router, not enforced in service
handler: async ({ req }) => {
  const user = getAuthUser(req);
  const allProjects = await projectService.listAll();
  return { body: { items: allProjects.filter(p => p.userId === user.id) } };
  // Filtering in memory after fetching ALL is wasteful and dangerous
},
```

## Rules

- **Scope at the query level** (WHERE clause), never filter in memory after fetching all
- **Service layer** decides what the user can see, not the router
- **Super admins** may bypass scoping, but this should be an explicit check
- **Never trust client input** for scoping (e.g., don't trust a userId from query params — use the authenticated user)
