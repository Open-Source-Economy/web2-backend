# Circular Dependencies

## The Problem

Circular dependencies happen when:

1. Module A imports from a barrel (e.g., `src/services/index.ts`)
2. The barrel loads a module that imports Module A
3. At runtime, exports are `undefined` → `TypeError: X is not a function`

## Signs of Circular Dependencies

- `TypeError: X is not a function`
- `Cannot read properties of undefined (reading 'X')`
- App crashes on startup but compiles fine

## Prevention

### Import from Specific Files, Not Barrels

When two modules have bidirectional dependencies, import from the specific file:

```typescript
// WRONG — barrel import can trigger circular dependency
import { UserRepository } from "../db";
import { GitHubService } from "../services";

// CORRECT — specific file import breaks the cycle
import { UserRepository } from "../db/user/User.repository";
import { GitHubService } from "../services/github.service";
```

### When Barrel Imports Are Safe

Barrel imports are fine when there's no bidirectional dependency:

```typescript
// OK — errors module doesn't import back from services
import { ApiError } from "../errors";

// OK — config module doesn't import back from routes
import { config } from "../config";
```

### Test Startup Before Deploy

Always verify the app starts cleanly:

```bash
# Quick startup test
npm run build && node dist/api/index.js

# Or via test
npm run test:e2e
```

If the app compiles but crashes on startup, it's likely a circular dependency.

## Debugging

If you suspect a circular dependency:

1. Check the stack trace — it shows which `import` triggered the cycle
2. Replace the barrel import with a specific file import
3. If the specific import also fails, the cycle is deeper — trace the import chain

```typescript
// Add temporary debug logging to find the cycle
console.log("Loading module A...");
import { B } from "./b"; // If B is undefined here, B depends on A
console.log("B is:", B);
```
