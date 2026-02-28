# Processing Results & Partial Success

## When to Use

Use this pattern for batch operations that can partially succeed:

- GitHub data sync (some repos may fail to sync)
- Bulk imports
- Multi-step operations where individual items can fail independently

## Core Types

### Single-Item Result (Binary: Success or Failure)

```typescript
interface ProcessingSuccess<T> {
  value: T;
  warnings: WarningIssue[];
}

// A single item either succeeds (with optional warnings) or fails (with errors)
type ProcessingResult<T> = { ok: true; value: T; warnings: WarningIssue[] } | { ok: false; errors: ErrorIssue[] };
```

### Batch Result (Partial Success)

```typescript
interface ProcessingOutcome<T> {
  items: T[]; // Successfully processed items
  issues: ProcessingIssue[]; // All errors + warnings across the batch
}
```

### Issue Types

```typescript
enum IssueSeverity {
  Error = "error", // Item failed, was skipped
  Warning = "warning", // Item succeeded, but has a data quality concern
}

interface ProcessingIssue {
  severity: IssueSeverity;
  code: string; // e.g., "MISSING_FIELD", "UNKNOWN_VALUE"
  message: string;
  field?: string; // Which field caused the issue
  rawValue?: unknown; // The problematic value
  row?: number; // Row number for batch operations
}

type ErrorIssue = ProcessingIssue & { severity: IssueSeverity.Error };
type WarningIssue = ProcessingIssue & { severity: IssueSeverity.Warning };
```

## Issue Collector

Fluent API for accumulating issues during processing:

```typescript
class IssueCollector {
  private errors: ErrorIssue[] = [];
  private warnings: WarningIssue[] = [];

  get hasErrors(): boolean {
    return this.errors.length > 0;
  }

  addError(code: string, message: string, field?: string): void {
    this.errors.push({ severity: IssueSeverity.Error, code, message, field });
  }

  addWarning(code: string, message: string, field?: string): void {
    this.warnings.push({ severity: IssueSeverity.Warning, code, message, field });
  }

  // Returns success with warnings, or failure with errors
  result<T>(value: T): ProcessingResult<T> {
    if (this.hasErrors) {
      return { ok: false, errors: this.errors };
    }
    return { ok: true, value, warnings: this.warnings };
  }
}
```

## Usage Example: GitHub Sync

```typescript
async function syncRepositories(repos: GitHubRepoResponse[]): Promise<ProcessingOutcome<Repository>> {
  const items: Repository[] = [];
  const issues: ProcessingIssue[] = [];

  for (const ghRepo of repos) {
    const collector = new IssueCollector();

    // Validate required fields
    if (!ghRepo.full_name) {
      collector.addError("MISSING_FIELD", "Repository has no full_name");
    }

    // Warn on optional issues
    if (!ghRepo.description) {
      collector.addWarning("MISSING_FIELD", "Repository has no description", "description");
    }

    const result = collector.result(ghRepo);
    if (!result.ok) {
      issues.push(...result.errors);
      continue; // Skip this repo
    }

    const mapped = mapGitHubRepoToDomain(result.value);
    items.push(await repoRepository.createOrUpdate(mapped));
    issues.push(...result.warnings);
  }

  return { items, issues };
}
```

## Policy Pattern

Decide how to handle issues after processing:

```typescript
// Lenient — log errors, continue with partial results
function lenientPolicy(outcome: ProcessingOutcome<any>): boolean {
  const errorCount = outcome.issues.filter((i) => i.severity === IssueSeverity.Error).length;
  if (errorCount > 0) {
    logger.warn(`Sync completed with ${errorCount} error(s)`);
  }
  return true; // Always continue
}

// Strict — block if any errors
function strictPolicy(outcome: ProcessingOutcome<any>): boolean {
  const hasErrors = outcome.issues.some((i) => i.severity === IssueSeverity.Error);
  if (hasErrors) {
    logger.error("Sync failed due to errors, rolling back");
    return false; // Block
  }
  return true;
}
```

## Rules

- **Errors** = item is skipped, **Warnings** = item succeeds with a note
- Never silently swallow errors during batch processing — always collect and report
- The caller decides the policy (lenient vs strict), not the processor
- Always log the full list of issues after processing completes
