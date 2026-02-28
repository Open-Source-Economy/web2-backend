# Module / Feature Architecture

## File Layout

Group related code by feature:

```
src/
├── controllers/
│   └── <feature>.controller.ts    # Legacy Express controllers
├── routes/
│   └── ts-rest/
│       └── <feature>.router.ts    # ts-rest route handlers
├── services/
│   └── <feature>.service.ts       # Business logic
├── db/
│   ├── <feature>/
│   │   ├── <Entity>.repository.ts # Database access
│   │   └── index.ts
│   ├── helpers/companions/
│   │   └── <Entity>.companion.ts  # Row → model mapping
│   └── mappers/
│       └── <feature>/
│           └── <entity>.mapper.ts # Domain → API mapping
```

## Service Interfaces

Export an interface for every service so it can be mocked in tests:

```typescript
// src/services/github.service.ts

export interface IGitHubService {
  syncOwner(login: string): Promise<Owner>;
  syncRepository(ownerId: OwnerId, repoName: string): Promise<Repository>;
}

export class GitHubService implements IGitHubService {
  constructor(
    private ownerRepo: OwnerRepository,
    private repoRepo: RepositoryRepository,
  ) {}

  async syncOwner(login: string): Promise<Owner> { ... }
  async syncRepository(ownerId: OwnerId, repoName: string): Promise<Repository> { ... }
}
```

Rules:
- **Always export the interface** — tests mock against it
- Interface and implementation live in the **same file**
- Only create a separate interface file when there are multiple real implementations (mocks don't count)

## Repository Interfaces

Same pattern — interface in the same file as implementation:

```typescript
// src/db/user/User.repository.ts

export interface UserRepository {
  getById(id: UserId): Promise<BackendUser | null>;
  create(data: CreateUserData): Promise<BackendUser>;
}

class UserRepositoryImpl implements UserRepository {
  constructor(private pool: Pool) {}
  // ...
}

export function getUserRepository(): UserRepository {
  return new UserRepositoryImpl(pool);
}
```

## Barrel Exports

Each module folder has an `index.ts` that exports the public API:

```typescript
// src/db/user/index.ts
export { UserRepository, getUserRepository } from "./User.repository";
export { UserCompanyRepository } from "./UserCompany.repository";
```

Rules:
- Export only what consumers need — keep internal helpers private
- Don't re-export from other modules for "convenience" — import from the source

## No Default Values in Services

Default values for query parameters or request body fields belong in the API contract schema (`@open-source-economy/api-types`), not in backend code:

```typescript
// WRONG — default in service
async listProjects(limit?: number) {
  const actualLimit = limit ?? 20;
}

// CORRECT — default comes from the contract's Zod schema
async listProjects(limit: number) {
  // limit is already defaulted by ts-rest validation
}
```
