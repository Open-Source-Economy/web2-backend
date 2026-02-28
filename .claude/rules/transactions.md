# Transaction Handling

## When to Use Transactions

Use a database transaction when an operation involves **multiple writes that must succeed or fail together**:

- Creating a user + creating their default settings
- Funding an issue + updating the user's credit balance
- Deleting a project + removing all related project items

## Pattern (Raw pg)

```typescript
async function createUserWithCompany(
  pool: Pool,
  userData: CreateUserData,
  companyData: CreateCompanyData,
): Promise<{ user: User; company: Company }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      "INSERT INTO app_user (name, email, role) VALUES ($1, $2, $3) RETURNING *",
      [userData.name, userData.email, userData.role],
    );
    const user = UserCompanion.fromRaw(userResult.rows[0]);

    const companyResult = await client.query(
      "INSERT INTO company (name, owner_id) VALUES ($1, $2) RETURNING *",
      [companyData.name, user.id],
    );
    const company = CompanyCompanion.fromRaw(companyResult.rows[0]);

    await client.query("COMMIT");
    return { user, company };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
```

## Rules

### Always Use try/catch/finally

```typescript
const client = await pool.connect();
try {
  await client.query("BEGIN");
  // ... operations
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;         // Re-throw after rollback
} finally {
  client.release();    // Always release the client
}
```

- **ROLLBACK** in catch — never leave a transaction open on error
- **release()** in finally — never leak pool connections
- **Re-throw** after rollback — let the error propagate to the error handler

### Keep Transactions Short

Don't do external API calls (GitHub, Stripe) inside a transaction — they hold a DB connection:

```typescript
// WRONG — external call inside transaction
await client.query("BEGIN");
const stripeCustomer = await stripe.customers.create(...); // Slow!
await client.query("INSERT INTO ...", [stripeCustomer.id]);
await client.query("COMMIT");

// CORRECT — external call outside, transaction for DB only
const stripeCustomer = await stripe.customers.create(...);
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("INSERT INTO ...", [stripeCustomer.id]);
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  // Consider compensating action: delete Stripe customer
  throw error;
} finally {
  client.release();
}
```

### Use Compensation for Cross-System Operations

When an operation spans multiple systems (DB + Stripe), use compensation instead of transactions:

```typescript
// Step 1: Create in Stripe
const stripeCustomer = await stripe.customers.create(...);

try {
  // Step 2: Save reference in DB
  await userRepo.updateStripeCustomerId(userId, stripeCustomer.id);
} catch (error) {
  // Compensate: undo Step 1
  await stripe.customers.del(stripeCustomer.id);
  throw error;
}
```

See also: [processing-results.md](./processing-results.md) for batch operations with partial success.

### Don't Nest Transactions

PostgreSQL doesn't support true nested transactions. Use savepoints if you need partial rollback:

```typescript
await client.query("SAVEPOINT step_1");
try {
  // risky sub-operation
} catch {
  await client.query("ROLLBACK TO SAVEPOINT step_1");
  // continue with the rest of the transaction
}
```
