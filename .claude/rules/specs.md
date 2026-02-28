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

| Step | Failure | Compensation |
|------|---------|-------------|
| 1. Create user | DB error | Abort, no cleanup needed |
| 2. Create Stripe customer | Stripe error | Delete user from DB |
| 3. Send welcome email | Postmark error | Log warning, don't roll back |
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

Design interfaces generically, implement specifically:

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

### Domain Entity Hierarchy

```
Base concept    →  Domain specialization  →  Provider-specific
PaymentEvent    →  CheckoutCompleted      →  StripeCheckoutSession
```

### Failure Handling

For operations that span multiple systems:
- Document rollback for each step
- Use compensation (undo previous steps) rather than distributed transactions
- Log warnings for non-critical failures (e.g., email failed) instead of rolling back
