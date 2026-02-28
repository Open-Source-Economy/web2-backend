# Data Sync Mappers

## When to Use

Use this pattern when importing/syncing data from external sources into the database:

- GitHub API sync (owners, repositories, issues)
- Stripe webhook data (customers, invoices, prices)
- Any batch data import

## Generic Mapper Interface

```typescript
interface IDataMapper<TRaw, TDomain, TContext> {
  /**
   * Map a single raw record to a domain object.
   * Returns a ProcessingResult — success with optional warnings, or failure with errors.
   */
  mapRecord(raw: TRaw, context: TContext): ProcessingResult<TDomain>;

  /**
   * Optional post-processing on all mapped records (e.g., deduplication, sorting).
   */
  postProcess?(records: TDomain[], context: TContext): TDomain[];
}
```

## Context Object

Every mapper receives a context that provides isolation and traceability:

```typescript
interface SyncContext {
  syncId: string; // Unique ID for this sync run (for logging)
  provider: string; // "github", "stripe", etc.
  timestamp: Date; // When this sync started
}

// Extend for provider-specific context
interface GitHubSyncContext extends SyncContext {
  provider: "github";
  token: string; // API token used for this sync
  ownerId: OwnerId; // Which owner we're syncing
}
```

## Implementation Example

```typescript
// src/services/sync/github-repo.mapper.ts

class GitHubRepoMapper implements IDataMapper<GitHubRepoResponse, Repository, GitHubSyncContext> {
  mapRecord(raw: GitHubRepoResponse, context: GitHubSyncContext): ProcessingResult<Repository> {
    const collector = new IssueCollector();

    // Required fields
    if (!raw.full_name) {
      collector.addError("MISSING_FIELD", "Missing full_name");
    }
    if (raw.id === undefined) {
      collector.addError("MISSING_FIELD", "Missing GitHub ID");
    }

    if (collector.hasErrors) {
      return collector.result(null as any); // Returns error result
    }

    // Optional fields — warn if missing but don't fail
    if (!raw.description) {
      collector.addWarning("MISSING_FIELD", "No description", "description");
    }

    const domain: Repository = {
      githubId: raw.id,
      name: raw.name,
      fullName: raw.full_name,
      description: raw.description ?? null,
      stargazersCount: raw.stargazers_count ?? 0,
      ownerId: context.ownerId,
    };

    return collector.result(domain);
  }
}
```

## Sync Orchestration

```typescript
async function syncData<TRaw, TDomain>(
  rawRecords: TRaw[],
  mapper: IDataMapper<TRaw, TDomain, SyncContext>,
  repository: { createOrUpdate(item: TDomain): Promise<TDomain> },
  context: SyncContext
): Promise<ProcessingOutcome<TDomain>> {
  const items: TDomain[] = [];
  const issues: ProcessingIssue[] = [];

  for (const raw of rawRecords) {
    const result = mapper.mapRecord(raw, context);

    if (!result.ok) {
      issues.push(...result.errors);
      continue; // Skip failed records
    }

    const saved = await repository.createOrUpdate(result.value);
    items.push(saved);
    issues.push(...result.warnings);
  }

  // Optional post-processing
  const processed = mapper.postProcess?.(items, context) ?? items;

  return { items: processed, issues };
}
```

## Rules

- **One mapper per external data source** — `GitHubRepoMapper`, `StripeInvoiceMapper`, etc.
- **Mappers are pure** — they transform data, they don't fetch or write
- **Context is injected** — mappers never read config or env vars directly
- **Required fields produce errors** — the record is skipped
- **Optional fields produce warnings** — the record succeeds with notes
- External field values are **never trusted** — always validate even if the source is an API
