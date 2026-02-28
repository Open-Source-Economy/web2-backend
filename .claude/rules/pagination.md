# Pagination

## Always Use Cursor-Based Pagination

For all list endpoints, use cursor-based pagination. Never use offset-based (`page=2&limit=20`) — it's unreliable when data is inserted or deleted between requests.

## How It Works

1. Client sends `limit` and optionally `cursor` (the ID of the last item from previous page)
2. Backend fetches `limit + 1` items starting after the cursor
3. If `limit + 1` items are returned, there are more pages — return `limit` items and set `hasMore: true`
4. The `nextCursor` is the ID of the last returned item

## Repository Pattern (Raw SQL)

```typescript
async listByOwner(
  ownerId: string,
  limit: number,
  cursor?: string,
): Promise<{ items: Project[]; hasMore: boolean; nextCursor: string | null }> {
  const params: any[] = [ownerId, limit + 1];
  let cursorClause = "";

  if (cursor) {
    // Fetch items created before the cursor item
    cursorClause = `AND p.created_at < (SELECT created_at FROM project WHERE id = $3)`;
    params.push(cursor);
  }

  const query = `
    SELECT *
    FROM project p
    WHERE p.owner_id = $1 ${cursorClause}
    ORDER BY p.created_at DESC
    LIMIT $2
  `;

  const result = await this.pool.query(query, params);
  const rows = result.rows;

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = items.length > 0 ? items[items.length - 1].id : null;

  return {
    items: items.map(row => ProjectCompanion.fromRaw(row)),
    hasMore,
    nextCursor,
  };
}
```

## Router Usage

```typescript
getProjects: {
  handler: async ({ query }) => {
    const { items, hasMore, nextCursor } = await repo.listByOwner(
      query.ownerId,
      query.limit,
      query.cursor,
    );

    return {
      status: 200 as const,
      body: {
        items,
        pagination: { hasMore, nextCursor },
      },
    };
  },
},
```

## Rules

- **Always fetch `limit + 1`** — this is how you detect `hasMore` without a separate COUNT query
- **Default `limit` in the API contract** (e.g., `z.number().default(20)`), not in backend code
- **Order by `created_at DESC`** unless the endpoint specifies a different sort
- **`nextCursor` is always the last item's ID** — the client passes it back as `cursor` for the next page
- **Never use OFFSET** — it's O(n) and produces inconsistent results with concurrent writes
