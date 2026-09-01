# SQL — PostgreSQL Reference

## Schema Design
```sql
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

## Data Types
| PostgreSQL | TypeScript | COBOL | Java | Python |
|-----------|-----------|-------|------|--------|
| `UUID` | `string` | N/A | `UUID` | `uuid.UUID` |
| `VARCHAR(n)` | `string` | `PIC X(n)` | `String` | `str` |
| `TEXT` | `string` | N/A | `String` | `str` |
| `INTEGER` | `number` | `PIC 9(9) COMP` | `int` | `int` |
| `BIGINT` | `bigint` | `PIC 9(18) COMP` | `long` | `int` |
| `NUMERIC(p,s)` | `Decimal.js` | `PIC 9(p)V9(s) COMP-3` | `BigDecimal` | `Decimal` |
| `BOOLEAN` | `boolean` | `PIC X` + 88-levels | `boolean` | `bool` |
| `TIMESTAMP` | `Date` | `PIC 9(14)` (custom) | `LocalDateTime` | `datetime` |
| `DATE` | `string` (ISO) | `PIC 9(8)` | `LocalDate` | `date` |
| `JSONB` | `Record<K,V>` \| `T[]` | N/A | `String` (JSON) | `dict` |
| `BYTEA` | `Buffer` | N/A | `byte[]` | `bytes` |

## Essential Patterns

### Upsert (INSERT or UPDATE)
```sql
INSERT INTO settings (key, value) VALUES ($1, $2)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
```

### Pagination
```sql
SELECT * FROM items ORDER BY created_at DESC LIMIT $1 OFFSET $2;
```

### Aggregation
```sql
SELECT project_id, 
  COUNT(*) as total,
  SUM(cost_cents) as total_cost,
  AVG(cost_cents) as avg_cost
FROM token_usage 
GROUP BY project_id;
```

### JSON Queries
```sql
-- Query JSONB field
SELECT * FROM users WHERE metadata->>'department' = 'engineering';

-- Update JSONB field
UPDATE users SET metadata = metadata || '{"verified": true}' WHERE id = $1;

-- Array contains
SELECT * FROM projects WHERE repo_urls ? 'https://github.com/org/repo';
```

### Window Functions
```sql
-- Rank within groups
SELECT *, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY version DESC) as rn
FROM prds;

-- Running total
SELECT *, SUM(cost_cents) OVER (ORDER BY created_at) as running_total
FROM token_usage;
```

### Common Table Expressions (CTE)
```sql
WITH latest_prds AS (
  SELECT DISTINCT ON (project_id) *
  FROM prds
  ORDER BY project_id, version DESC
)
SELECT p.name, l.title, l.status
FROM projects p
JOIN latest_prds l ON l.project_id = p.id;
```

## Indexing Rules
- **Always index foreign keys** — `CREATE INDEX idx_stories_project ON stories(project_id)`
- **Index columns in WHERE clauses** — if you filter by it, index it
- **Composite indexes for multi-column queries** — `CREATE INDEX idx_reviews_artifact ON reviews(artifact_type, artifact_id)`
- **Partial indexes for filtered queries** — `CREATE INDEX idx_active_tokens ON tokens(token) WHERE revoked = false`
- **JSONB indexes** — `CREATE INDEX idx_metadata_gin ON users USING GIN(metadata)`

## Migration Patterns

### From DB2
| DB2 | PostgreSQL | Notes |
|-----|-----------|-------|
| `DECIMAL(n,m)` | `NUMERIC(n,m)` | Identical behavior |
| `VARCHAR(n) FOR BIT DATA` | `BYTEA` | Binary data |
| `CURRENT TIMESTAMP` | `NOW()` | |
| `FETCH FIRST n ROWS ONLY` | `LIMIT n` | |
| `WITH UR` | `READ UNCOMMITTED` isolation | Rarely needed in PostgreSQL |
| `IDENTITY` | `GENERATED ALWAYS AS IDENTITY` or `SERIAL` | |
| `CLOB` | `TEXT` | No size limit in PostgreSQL |

### From VSAM
| VSAM Concept | PostgreSQL Equivalent |
|-------------|---------------------|
| KSDS (key-sequenced) | Table with PRIMARY KEY |
| ESDS (entry-sequenced) | Table with SERIAL id |
| RRDS (relative record) | Table with INTEGER id |
| Alternate index | CREATE INDEX |
| VSAM cluster | Schema + table |

## Security
- **Always use parameterized queries** — `$1, $2` placeholders, never string concatenation
- **Least privilege** — application user should NOT be database owner
- **Row-level security** — `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for multi-tenant
- **Audit columns** — `created_at`, `updated_at`, `created_by` on every table
- **Soft delete** — add `deleted_at TIMESTAMP` instead of actual DELETE for audit trail
