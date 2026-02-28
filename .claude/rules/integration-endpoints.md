# Adding New External API Endpoints

## Process

When adding a new endpoint to an external API client (GitHub, Stripe, etc.):

### 1. Check the API Documentation

- Read the official API docs for the endpoint
- Note: HTTP method, path, required/optional parameters, response shape
- Note: Authentication requirements, rate limits, pagination

### 2. Test with a Discovery Script (Optional)

For unfamiliar APIs, create a quick test script:

```typescript
// scripts/test-github-endpoint.ts
import { config } from "../src/config";

async function main() {
  const response = await fetch("https://api.github.com/repos/owner/repo/issues", {
    headers: { Authorization: `Bearer ${config.github.publicAccessToken}` },
  });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}
main();
```

Run with `npx ts-node -T scripts/test-github-endpoint.ts` to see the actual response shape.

### 3. Define Types

```typescript
// Parameter types — named, not raw primitives
interface ListIssuesParams {
  owner: string;
  repo: string;
  state?: "open" | "closed" | "all";
  perPage?: number;
}

// Response types — match the actual API response
interface GitHubIssueResponse {
  id: number;
  number: number;
  title: string;
  state: string;
  body: string | null;
  created_at: string;
  updated_at: string;
}
```

### 4. Add to Client

```typescript
// In the API client class
async listIssues(params: ListIssuesParams): Promise<GitHubIssueResponse[]> {
  const { owner, repo, state = "open", perPage = 100 } = params;
  const query = new URLSearchParams({ state, per_page: String(perPage) });
  return this.http.get(`/repos/${owner}/${repo}/issues?${query}`);
}
```

### 5. Add to Service

```typescript
// In the service class
async syncIssues(repoId: RepositoryId): Promise<Issue[]> {
  const ghIssues = await this.client.listIssues({
    owner: repoId.ownerId.login,
    repo: repoId.name,
  });
  return Promise.all(
    ghIssues.map(issue => this.issueRepo.createOrUpdate(mapGitHubIssueToDomain(issue, repoId)))
  );
}
```

## Checklist

Before considering the endpoint done:

- [ ] API docs reviewed for the endpoint
- [ ] Parameter type created (named, not raw primitives)
- [ ] Response type created (matches actual API response)
- [ ] Method added to API client with typed params and response
- [ ] Service method added that calls the client
- [ ] Error handling for API failures (rate limits, auth errors, not found)
- [ ] Mapper for external response → domain model
