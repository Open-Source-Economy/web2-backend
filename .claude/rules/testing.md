# Testing Conventions

## Test Structure

```
src/__tests__/
├── __helpers__/
│   ├── Fixture.ts          # Test fixtures and factories
│   └── jest.setup.ts       # Global test setup
├── __mocks__/
│   └── index.ts            # Shared mock implementations
├── controllers/            # Controller/router tests
├── repository/             # Repository tests
├── service/                # Service unit tests
├── model/                  # Model/companion tests
└── e2e/                    # End-to-end integration tests
```

## Design for Testability

Every external dependency must have an **interface** so it can be mocked:

```typescript
// CORRECT — interface enables mocking
export interface IGitHubService {
  syncOwner(login: string): Promise<Owner>;
}

export class GitHubService implements IGitHubService { ... }

// In test
const mockGitHub: IGitHubService = {
  syncOwner: jest.fn().mockResolvedValue(mockOwner),
};
```

```typescript
// WRONG — no interface, can't mock cleanly
export class GitHubService {
  syncOwner(login: string): Promise<Owner> { ... }
}
```

## Test Factories

Create factory functions for test data with sensible defaults:

```typescript
// src/__tests__/__helpers__/Fixture.ts

export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: "test-user-id" as UserId,
    name: "Test User",
    role: UserRole.User,
    email: "test@example.com",
    ...overrides,
  };
}

export function createMockRepository(overrides?: Partial<Repository>): Repository {
  return {
    name: "test-repo",
    ownerId: { login: "test-owner" },
    ...overrides,
  };
}
```

Rules:
- Factory produces valid, complete objects by default
- Use `overrides` parameter to customize specific fields
- Never use factory data as production defaults — factories are test-only

## Unit Tests

Test services with mocked dependencies:

```typescript
describe("ProjectService", () => {
  let service: ProjectService;
  let mockRepo: jest.Mocked<ProjectRepository>;

  beforeEach(() => {
    mockRepo = {
      getById: jest.fn(),
      create: jest.fn(),
    } as any;
    service = new ProjectService(mockRepo);
  });

  it("should throw NotFound when project does not exist", async () => {
    mockRepo.getById.mockResolvedValue(null);
    await expect(service.getProject("nonexistent")).rejects.toThrow(ApiError);
  });
});
```

## E2E Tests

Test the full stack with a real database:

```typescript
describe("Auth E2E", () => {
  it("should register a new user", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "new@test.com", password: "Str0ng!Pass" });

    expect(res.status).toBe(201);
  });
});
```

E2E tests use `--detectOpenHandles` to catch unclosed connections.

## What NOT to Do

```typescript
// WRONG — testing implementation details
expect(mockRepo.getById).toHaveBeenCalledWith("id-123");

// CORRECT — test behavior/output
const result = await service.getProject("id-123");
expect(result).toBeNull();

// WRONG — no assertion
it("should work", async () => {
  await service.doSomething(); // No expect!
});
```
