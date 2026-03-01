# External API Integration Architecture

## Layered Architecture

External API integrations (GitHub, Stripe, Postmark) follow a layered pattern:

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│  Service     │ ──▶ │  API Client   │ ──▶ │  HTTP      │
│  (business   │     │  (typed       │     │  Client    │
│   logic)     │     │   methods)    │     │  (raw      │
│              │     │              │     │   HTTP)     │
└─────────────┘     └──────────────┘     └────────────┘
```

### Layer 1 — HTTP Client (Generic)

Raw HTTP calls with timeout handling, error classification, and response logging. Reusable across all integrations.

```typescript
// src/utils/http-client.ts
export class HttpClient {
  constructor(private baseUrl: string, private serviceName: string) {}

  async get<T>(path: string, headers?: Record<string, string>): Promise<T> { ... }
  async post<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> { ... }
}
```

### Layer 2 — API Client (Provider-Specific)

Typed methods for each endpoint. Handles authentication headers, response validation, and provider-specific error mapping.

```typescript
// src/services/github.client.ts
export class GitHubApiClient {
  constructor(
    private http: HttpClient,
    private token: string
  ) {}

  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    return this.http.get(`/repos/${owner}/${repo}`, {
      Authorization: `Bearer ${this.token}`,
    });
  }
}
```

### Layer 3 — Service (Business Logic)

Orchestrates API client calls, transforms data to domain models, handles business rules.

```typescript
// src/services/github.service.ts
export class GitHubService {
  constructor(
    private client: GitHubApiClient,
    private repo: RepositoryRepository
  ) {}

  async syncRepository(owner: string, repoName: string): Promise<Repository> {
    const ghRepo = await this.client.getRepository(owner, repoName);
    const mapped = mapGitHubRepoToDomain(ghRepo);
    return this.repo.createOrUpdate(mapped);
  }
}
```

### Advanced: Auth Layer for OAuth Integrations

When a provider requires token management (refresh tokens, expiration), add an auth layer between the API client and the HTTP client:

```
Service → API Client → Auth Service → HTTP Client
```

```typescript
// src/services/provider-auth.service.ts
export class ProviderAuthService {
  constructor(
    private tokenRepo: TokenRepository,
    private http: HttpClient
  ) {}

  async getValidToken(userId: UserId): Promise<string> {
    const token = await this.tokenRepo.getByUserId(userId);
    if (!token) throw ApiError.unauthorized("No token found");
    if (token.expiresAt > new Date()) return token.accessToken;
    // Refresh the token
    const refreshed = await this.http.post<TokenResponse>("/oauth/token", {
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
    });
    await this.tokenRepo.update(userId, refreshed);
    return refreshed.access_token;
  }
}
```

Not all integrations need this — GitHub with a static PAT doesn't. Use this pattern when the provider's auth has token expiration.

## Rules

### Never Call External APIs Directly from Controllers/Routes

```typescript
// WRONG — HTTP call in route handler
handler: async ({ params }) => {
  const response = await fetch(`https://api.github.com/repos/${params.owner}/${params.repo}`);
  // ...
};

// CORRECT — call through service → client → http
handler: async ({ params }) => {
  const repo = await githubService.syncRepository(params.owner, params.repo);
  return { status: 200 as const, body: { repository: repo } };
};
```

### Typed Response Validation

Validate responses from external APIs — don't trust them blindly:

```typescript
// Define expected response shape
interface GitHubRepoResponse {
  id: number;
  full_name: string;
  description: string | null;
  stargazers_count: number;
}

// Validate after fetching
const raw = await this.http.get<unknown>(`/repos/${owner}/${repo}`);
const parsed = gitHubRepoSchema.parse(raw); // Zod validation
```

### Named Parameter Types

Use named types for API client parameters — never raw primitives:

```typescript
// WRONG
async getRepository(owner: string, repo: string): Promise<...>

// CORRECT
interface GetRepositoryParams {
  owner: string;
  repo: string;
}
async getRepository(params: GetRepositoryParams): Promise<...>
```

Exception: single-parameter methods where the type is obvious (e.g., `getById(id: UserId)`).

### Mock Client for Every Integration

Every API client must have a mock implementation that shares the same interface. This enables local development without real API keys and makes tests deterministic.

```typescript
// Interface (in the same file as the real client)
export interface IGitHubApiClient {
  getRepository(params: GetRepositoryParams): Promise<GitHubRepository>;
  listIssues(params: ListIssuesParams): Promise<GitHubIssueResponse[]>;
}

// Real implementation
export class GitHubApiClient implements IGitHubApiClient { ... }

// Mock implementation
export class MockGitHubApiClient implements IGitHubApiClient {
  async getRepository(params: GetRepositoryParams): Promise<GitHubRepository> {
    return {
      id: 12345,
      full_name: `${params.owner}/${params.repo}`,
      description: "Mock repository",
      stargazers_count: 42,
    };
  }

  async listIssues(params: ListIssuesParams): Promise<GitHubIssueResponse[]> {
    return []; // Return realistic mock data
  }
}
```

Rules:

- Mock and real implementations share the **same interface**
- Mock should return **realistic data**, not empty objects
- Service wiring selects implementation based on config (see [mock-mode.md](./mock-mode.md))

### Error Classification

Wrap external API errors into typed error classes:

```typescript
// src/errors/http/http-client.error.ts
export class HttpClientError extends Error {
  constructor(
    public readonly serviceName: string,
    public readonly status: number,
    public readonly url: string
  ) {
    super(`${serviceName} request failed: ${status} ${url}`);
    this.name = "HttpClientError";
  }

  isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }
  isNotFound(): boolean {
    return this.status === 404;
  }
  isServerError(): boolean {
    return this.status >= 500;
  }
}
```

## New Integration Checklist

Before considering a new integration complete, verify every item:

- [ ] API docs reviewed for all endpoints used
- [ ] Parameter types created (named objects, not raw primitives)
- [ ] Response types created with Zod validation
- [ ] API client class with typed methods implementing an interface
- [ ] Mock client implementing the same interface
- [ ] Service class orchestrating client calls and business logic
- [ ] Error classification (auth, notFound, server → typed errors)
- [ ] Mapper for external response → domain model (Tier 4 mapper)
- [ ] Config entry for API credentials (Joi `.required()`)
- [ ] `.env.example` updated with placeholder values
- [ ] Mock mode toggle in config (defaults to `false`)
