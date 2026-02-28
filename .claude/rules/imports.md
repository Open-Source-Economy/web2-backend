# Import Conventions

## API Types Package (`@open-source-economy/api-types`)

### Namespace Import for DTOs and Types

When importing types used in request/response bodies, use namespace import `* as dto`:

```typescript
// CORRECT — namespace import for DTOs
import * as dto from "@open-source-economy/api-types";

// Then use: dto.User, dto.GetProjectsResponse, dto.FullDeveloperProfile
```

### Named Import for Contract and Specific Types

The `contract` object and types used directly in function signatures (IDs, enums) use named imports:

```typescript
// CORRECT — named import for contract
import { contract } from "@open-source-economy/api-types";

// CORRECT — named imports for types used in signatures
import type { OwnerId, RepositoryId, CompanyId } from "@open-source-economy/api-types";
import { UserRole, Currency } from "@open-source-economy/api-types";
```

### Do NOT Mix Namespace and Named Imports in the Same Statement

```typescript
// WRONG — confusing, pick one style per import line
import * as dto, { contract } from "@open-source-economy/api-types";

// CORRECT — separate import lines
import { contract } from "@open-source-economy/api-types";
import * as dto from "@open-source-economy/api-types";
```

### Use `import type` When Only Types Are Needed

```typescript
// CORRECT — type-only import (no runtime cost)
import type { ProblemDetails } from "@open-source-economy/api-types";
import type { OwnerId, RepositoryId } from "@open-source-economy/api-types";

// WRONG — value import when only types are used
import { OwnerId, RepositoryId } from "@open-source-economy/api-types";
// ⚠️ Unless these are also used as runtime values (enums, companion objects)
```

**Exception**: If the import includes enum values or companion objects that are used at runtime (not just as types), use a regular import — `import type` would strip them.

```typescript
// CORRECT — UserRole is an enum used at runtime for comparisons
import { UserRole } from "@open-source-economy/api-types";
if (user.role === UserRole.SuperAdmin) { ... }
```

## Internal Imports

Use relative paths for internal imports (the project does not use path aliases):

```typescript
// CORRECT
import { ApiError } from "../errors";
import { config } from "../config";

// WRONG — absolute src/ paths not configured
import { ApiError } from "src/errors";
```
