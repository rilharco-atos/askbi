# COBOL — Legacy System Reference

## File Extensions
- `*.cbl`, `*.cob` — COBOL source programs
- `*.cpy` — COPYBOOKS (shared data definitions, like header files)
- `*.jcl` — Job Control Language (batch job scheduling)
- `*.bms` — CICS BMS maps (screen/form definitions)
- `*.dclgen` — DB2 DCLGEN (database table declarations from catalog)

## Program Structure
```
IDENTIFICATION DIVISION.    ← Program metadata (PROGRAM-ID, AUTHOR, DATE)
ENVIRONMENT DIVISION.       ← File assignments, special names
DATA DIVISION.
  FILE SECTION.             ← File record layouts (FD)
  WORKING-STORAGE SECTION.  ← Local variables and structures
  LINKAGE SECTION.          ← Parameters received from CALL
  COPY <name>.              ← Include COPYBOOK (shared data)
PROCEDURE DIVISION.         ← Business logic lives HERE
  PERFORM <paragraph>       ← Call a section (like a function call)
  EVALUATE / IF             ← Business rules and decisions
  EXEC SQL ... END-EXEC     ← Embedded DB2 SQL
  EXEC CICS ... END-EXEC    ← Online transaction processing
  CALL <program>            ← Call another COBOL program
  STOP RUN.                 ← End of program
```

## Business Rules — Where to Find Them
- **IF / EVALUATE statements** in PROCEDURE DIVISION — these encode business decisions
- **88-level conditions** in DATA DIVISION — these are business enums/flags
  ```
  05 ACCOUNT-STATUS    PIC X.
     88 ACTIVE         VALUE 'A'.
     88 CLOSED         VALUE 'C'.
     88 SUSPENDED      VALUE 'S'.
  ```
- **COMPUTE / ADD / SUBTRACT** — business calculations (interest rates, fees, totals)
- **Paragraph names** — often describe the business operation: `CALCULATE-INTEREST`, `VALIDATE-CUSTOMER`

## Data Types (PIC Clauses)
| COBOL PIC | Meaning | Modern Equivalent |
|-----------|---------|-------------------|
| `PIC X(20)` | Alphanumeric, 20 chars | `string` (max 20) |
| `PIC 9(5)` | Numeric, 5 digits | `number` / `int` |
| `PIC 9(5)V99` | Numeric with 2 decimal places | `number` (decimal) |
| `PIC S9(9) COMP` | Binary signed integer | `number` / `bigint` |
| `PIC S9(9)V99 COMP-3` | Packed decimal | `Decimal` / `number` |
| `PIC X` with 88-levels | Enum/flag | `enum` or union type |

## External Dependencies
| Pattern | System | Modern Equivalent |
|---------|--------|-------------------|
| `EXEC SQL ... END-EXEC` | DB2 (relational DB) | PostgreSQL / MySQL |
| `EXEC CICS ... END-EXEC` | CICS (online transactions) | REST API / Next.js routes |
| `READ / WRITE / REWRITE` | VSAM files (key-value store) | Database tables / Redis |
| `CALL 'PROGRAM'` | Subroutine call | Function import / API call |
| `JCL DD statements` | Batch file assignments | File I/O / S3 / environment config |
| `SORT` | External sort utility | `Array.sort()` / SQL ORDER BY |

## Complexity Indicators
- **GO TO** → spaghetti control flow. High risk.
- **PERFORM THRU** → implicit fall-through between paragraphs. Medium risk.
- **ALTER** → dynamic GO TO targets. Critical risk (rare but dangerous).
- **Nested IF > 5 levels** → deeply coupled logic. High complexity.
- **COPY REPLACING** → macro-like substitution. Can hide behavior.
- **REDEFINES** → union types / memory reinterpretation. Tricky to modernize.

## Batch vs Online
- **Batch (JCL)**: Scheduled jobs that process files/data in bulk. Runs overnight or on schedule. No user interaction.
- **Online (CICS)**: Interactive transactions. User screens (BMS maps). Real-time processing.
- **Mixed**: Many systems have both — batch for reports/ETL, online for user operations. Both may share COPYBOOKS and subroutines.

## Common Modernization Risks
1. **Undocumented business rules** — COBOL is often the only documentation. If the code disappears, the rules disappear.
2. **Data format dependencies** — packed decimal (COMP-3), EBCDIC encoding, fixed-length records. Modern systems use UTF-8, JSON, variable-length.
3. **Implicit behavior** — COBOL initializes numeric fields to zero, alphanumeric to spaces. Modern languages don't. Silent behavioral change.
4. **Calendar logic** — legacy Y2K fixes, Julian dates, 2-digit years. Must map to ISO 8601.
5. **Transaction boundaries** — CICS SYNCPOINT = DB commit. Must map to database transaction boundaries in modern code.
6. **Copybook coupling** — one COPYBOOK change affects every program that includes it. In modern code, this is schema migration.
