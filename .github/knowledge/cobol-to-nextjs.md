# COBOL to Next.js — Modernization Patterns

## Migration Strategy: Strangler Fig

Don't rewrite everything at once. Wrap the legacy system behind an API gateway, modernize one capability at a time, and route traffic to the new implementation as each piece is ready.

```
Phase 1: API Gateway in front of COBOL
Phase 2: Extract one business capability → Next.js API route
Phase 3: Route that capability through the new service
Phase 4: Repeat until COBOL is empty
Phase 5: Decommission COBOL
```

## Architecture Mapping

| COBOL Component | Next.js Equivalent |
|----------------|-------------------|
| CICS transaction | API route (`app/api/...`) |
| BMS screen/map | React page component (`app/page.tsx`) |
| COPYBOOK (data structure) | TypeScript interface / Zod schema |
| WORKING-STORAGE | Component state / server-side variables |
| DB2 table | PostgreSQL table (via Drizzle/Prisma) |
| VSAM file | Database table or Redis cache |
| JCL batch job | Cron job / scheduled API route / queue worker |
| COBOL subroutine (CALL) | Imported function / utility module |
| EXEC SQL | Drizzle ORM query / raw SQL |
| CICS SEND MAP | `return <Component />` / JSON response |
| CICS RECEIVE MAP | Form submission / request body parsing |
| SORT utility | `Array.sort()` / SQL `ORDER BY` |
| Report writer | Server component rendering PDF / CSV export |

## Data Type Mapping

| COBOL | TypeScript | Notes |
|-------|-----------|-------|
| `PIC X(n)` | `string` | Trim trailing spaces |
| `PIC 9(n)` | `number` | Watch for leading zeros in display fields |
| `PIC 9(n)V99` | `number` | Use `Decimal.js` for financial precision |
| `PIC S9(n) COMP` | `number` \| `bigint` | Binary — direct mapping |
| `PIC S9(n)V99 COMP-3` | `Decimal` | Packed decimal — MUST use decimal library for money |
| 88-level conditions | `enum` or `as const` union | Preserve the business meaning in type names |
| `OCCURS n TIMES` | `Array<T>` of fixed length | Consider if length is truly fixed or should be dynamic |
| `REDEFINES` | Union type / discriminated union | Map each interpretation as a separate type |
| Group items (01-level) | Interface / type | Nest sub-fields as object properties |

## Business Logic Translation Patterns

### EVALUATE → switch/match
```cobol
EVALUATE ACCOUNT-TYPE
  WHEN 'S' PERFORM PROCESS-SAVINGS
  WHEN 'C' PERFORM PROCESS-CHECKING
  WHEN OTHER PERFORM PROCESS-DEFAULT
END-EVALUATE
```
```typescript
switch (accountType) {
  case "savings": return processSavings(account);
  case "checking": return processChecking(account);
  default: return processDefault(account);
}
```

### PERFORM loop → function call
```cobol
PERFORM CALCULATE-INTEREST
  VARYING IDX FROM 1 BY 1
  UNTIL IDX > ACCOUNT-COUNT
```
```typescript
for (const account of accounts) {
  calculateInterest(account);
}
```

### COBOL conditional → guard clause
```cobol
IF BALANCE > 0
  IF ACCOUNT-ACTIVE
    PERFORM PROCESS-WITHDRAWAL
  ELSE
    MOVE 'INACTIVE' TO ERROR-MSG
  END-IF
ELSE
  MOVE 'INSUFFICIENT' TO ERROR-MSG
END-IF
```
```typescript
function processWithdrawal(account: Account): Result {
  if (account.balance <= 0) return { error: "INSUFFICIENT" };
  if (!account.active) return { error: "INACTIVE" };
  return withdraw(account);
}
```

## Database Migration (DB2 → PostgreSQL)

| DB2 Feature | PostgreSQL Equivalent |
|------------|---------------------|
| `DECIMAL(n,m)` | `NUMERIC(n,m)` |
| `VARCHAR(n) FOR BIT DATA` | `BYTEA` |
| `TIMESTAMP` | `TIMESTAMP` (identical) |
| `CURRENT TIMESTAMP` | `NOW()` |
| `FETCH FIRST n ROWS ONLY` | `LIMIT n` |
| `WITH UR` (uncommitted read) | `SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED` |
| `DCLGEN` | Drizzle schema definition |
| `CURSOR` | Drizzle query builder / streaming |

## Critical Modernization Rules

1. **NEVER discard business rules** — if the COBOL does it, the new code must do it. If you can't find the rule's purpose, document it and preserve it.
2. **Decimal precision for money** — COBOL COMP-3 is exact decimal. JavaScript `number` is floating point. Use `Decimal.js` or store as integer cents.
3. **Preserve error codes** — legacy downstream systems may depend on specific error codes/messages. Map them, don't discard.
4. **Test with production data shapes** — COBOL fields are fixed-length with padding. Test that trimming/parsing handles all real data patterns.
5. **Date handling** — convert all COBOL date formats (YYMMDD, Julian, packed) to ISO 8601 at the boundary. Internal code uses only ISO dates.
6. **Batch equivalence** — every JCL job must have a modern equivalent (cron, queue, scheduled function). Don't lose batch processing in the excitement of building UI.
