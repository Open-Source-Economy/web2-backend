# Architecture Specification Documents

## When to Write a Spec

Write a spec before implementing any feature that involves:

- Multiple modules or services interacting
- External API integrations
- Multi-step operations that can partially fail
- New domain concepts or entities

## Spec Document Structure

### 1. Architecture Overview

Start with a diagram and data flow:

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Router   │ ──▶ │  Service  │ ──▶ │  Client   │ ──▶ │ External │
│           │     │           │     │           │     │   API    │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                       │
                       ▼
                 ┌──────────┐
                 │   Repo   │
                 │  (pg)    │
                 └──────────┘
```

Include:

- Step-by-step data flow (numbered arrows)
- Interface types table (which interfaces exist at each boundary)
- Key type definitions

### 2. Component Specs

For each component, document:

```markdown
### ComponentName

**Role:**

- Responsibilities (what it DOES)
- Boundaries (what it does NOT do)

**Interface:**

- Method signatures with types

**Behavior:**

- Step-by-step logic
- Edge cases

**Error Codes:**

- Which errors this component can produce
- How they map to HTTP status codes
```

### 3. Failure Handling

For multi-step operations, document compensation logic:

```markdown
### Failure Scenarios

| Step                      | Failure        | Compensation                 |
| ------------------------- | -------------- | ---------------------------- |
| 1. Create user            | DB error       | Abort, no cleanup needed     |
| 2. Create Stripe customer | Stripe error   | Delete user from DB          |
| 3. Send welcome email     | Postmark error | Log warning, don't roll back |
```

### 4. Testability Checklist

Before implementation, verify:

- [ ] Every external dependency has an interface (not called directly)
- [ ] Interfaces are in the same file as the implementation
- [ ] Repository methods are mockable (interface-based)
- [ ] No direct database access from services (always through repos)
- [ ] Test data can be created via factory functions

## Design Principles

### Abstraction for Future Integrations

Design interfaces generically, implement specifically. This allows swapping providers without changing business logic.

```typescript
// Generic interface — doesn't mention any provider
interface PaymentProvider {
  createCheckout(params: CheckoutParams): Promise<CheckoutSession>;
  handleWebhook(payload: unknown, signature: string): Promise<WebhookEvent>;
}

// Provider-specific implementation
class StripePaymentProvider implements PaymentProvider {
  // Stripe-specific code here
}
```

When to abstract:

- The feature could reasonably use a different provider in the future (payments, email, auth)
- Multiple implementations already exist or are planned

When NOT to abstract:

- The integration is deeply tied to one provider (e.g., GitHub-specific features for a GitHub tool)
- Only one implementation will ever exist — don't create a generic interface for a singleton

### Domain Entity Hierarchy

Structure domain models from generic to specific:

```
Base concept    →  Domain specialization  →  Provider-specific
PaymentEvent    →  CheckoutCompleted      →  StripeCheckoutSession
Repository      →  GitHubRepository       →  (raw GitHub API response)
User            →  BackendUser            →  (raw DB row)
```

Rules:

- **Base concept**: Provider-agnostic, used in business logic and API responses
- **Domain specialization**: Adds business context (e.g., "completed" vs "pending")
- **Provider-specific**: Raw shape from external source, mapped to domain in Tier 4 mapper

### Testability by Design

Every spec must ensure the implementation is testable:

```typescript
// CORRECT — service depends on interface, easy to mock
export class ProjectService {
  constructor(
    private repo: ProjectRepository, // Interface
    private github: IGitHubApiClient, // Interface
    private stripe: IStripePaymentProvider // Interface
  ) {}
}

// WRONG — service creates its own dependencies, impossible to mock
export class ProjectService {
  private repo = new ProjectRepositoryImpl(pool);
  private github = new GitHubApiClient(config.github.token);
}
```

Rules:

- All external dependencies injected via constructor
- All dependencies typed as **interfaces**, not concrete classes
- Interface and implementation in the **same file** (see [modules.md](./modules.md))
- Test factories produce valid objects with sensible defaults (see [testing.md](./testing.md))

### Repository Pattern (No Direct DB Access)

Services never access the database directly — always through a repository:

```typescript
// CORRECT — service uses repository
const user = await this.userRepo.getById(userId);

// WRONG — service uses pool directly
const result = await pool.query("SELECT * FROM app_user WHERE id = $1", [userId]);
```

This keeps SQL contained in repositories and makes services testable with mocked repos.

### Failure Handling with Compensation

For operations that span multiple systems:

- Document rollback/compensation for each step in the spec
- Use compensation (undo previous steps) rather than distributed transactions
- Distinguish **critical failures** (roll back) from **non-critical failures** (log warning, continue)
- Never leave the system in an inconsistent state

```typescript
// Critical failure: roll back previous steps
const stripeCustomer = await stripe.customers.create(params);
try {
  await userRepo.updateStripeId(userId, stripeCustomer.id);
} catch (error) {
  await stripe.customers.del(stripeCustomer.id); // Compensate
  throw error;
}

// Non-critical failure: log and continue
try {
  await emailService.sendWelcome(user.email);
} catch (error) {
  logger.warn("Welcome email failed", { userId, error: error.message });
  // Don't roll back user creation for a failed email
}
```

See also: [transactions.md](./transactions.md), [processing-results.md](./processing-results.md).

## Comprehensive Spec Checklist

Use this checklist when writing or reviewing a spec:

### Architecture & Documentation

- [ ] Architecture diagram with all components and data flow
- [ ] Step-by-step data flow description (numbered)
- [ ] Interface types table (what interfaces exist at each boundary)
- [ ] Key type definitions listed

### Abstraction & Reuse

- [ ] Generic interfaces for swappable providers (payments, email, etc.)
- [ ] Domain entity hierarchy defined (base → specialization → provider-specific)
- [ ] Reuse of existing infrastructure (companions, mappers, error classes, repositories)
- [ ] No duplicate logic — compose existing mappers and helpers

### Data Model

- [ ] DB tables/columns identified with types and constraints
- [ ] Nullable vs required fields decided (strict writes, flexible reads)
- [ ] External provider fields prefixed (`github_`, `stripe_`)
- [ ] Soft-delete vs hard-delete policy per table
- [ ] Migration file needed? Sequential number assigned

### API Contract

- [ ] Endpoints exist in `@open-source-economy/api-types` contract
- [ ] Request/response types match the backend's needs (if not → [api-mismatch.md](./api-mismatch.md))
- [ ] Pagination for list endpoints (cursor-based)
- [ ] Status codes correct (`200`/`201`/`204 as const`)

### Testability

- [ ] All external dependencies have interfaces (exported)
- [ ] Interface and implementation in the same file
- [ ] Repository methods are mockable
- [ ] No direct DB access from services
- [ ] Factory functions for test data (sensible defaults, partial overrides)
- [ ] Error codes testable via `instanceof` and `.code` (not message strings)

### Failure Handling

- [ ] Failure scenario table (step → failure → compensation)
- [ ] Critical vs non-critical failures distinguished
- [ ] Compensation logic for cross-system operations
- [ ] Non-critical failures logged as warnings, not rolled back

### Access Control

- [ ] Authentication: which endpoints require `requireAuth`?
- [ ] Authorization: which service methods check access? (require/has/getScoped)
- [ ] Data scoping: list endpoints filtered to user's access level
