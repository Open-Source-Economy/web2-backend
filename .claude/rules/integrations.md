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
  constructor(private http: HttpClient, private token: string) {}

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
  constructor(private client: GitHubApiClient, private repo: RepositoryRepository) {}

  async syncRepository(owner: string, repoName: string): Promise<Repository> {
    const ghRepo = await this.client.getRepository(owner, repoName);
    const mapped = mapGitHubRepoToDomain(ghRepo);
    return this.repo.createOrUpdate(mapped);
  }
}
```

## Rules

### Never Call External APIs Directly from Controllers/Routes

```typescript
// WRONG — HTTP call in route handler
handler: async ({ params }) => {
  const response = await fetch(`https://api.github.com/repos/${params.owner}/${params.repo}`);
  // ...
}

// CORRECT — call through service → client → http
handler: async ({ params }) => {
  const repo = await githubService.syncRepository(params.owner, params.repo);
  return { status: 200 as const, body: { repository: repo } };
}
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

### Error Classification

Wrap external API errors into typed error classes:

```typescript
// src/errors/http/http-client.error.ts
export class HttpClientError extends Error {
  constructor(
    public readonly serviceName: string,
    public readonly status: number,
    public readonly url: string,
  ) {
    super(`${serviceName} request failed: ${status} ${url}`);
    this.name = "HttpClientError";
  }

  isAuthError(): boolean { return this.status === 401 || this.status === 403; }
  isNotFound(): boolean { return this.status === 404; }
  isServerError(): boolean { return this.status >= 500; }
}
```
