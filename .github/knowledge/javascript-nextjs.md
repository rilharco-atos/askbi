# JavaScript / TypeScript — Next.js & Express Reference

## Next.js Project Structure (App Router)
```
project/
├── src/app/
│   ├── layout.tsx             ← Root layout (wraps all pages)
│   ├── page.tsx               ← Home page
│   ├── [slug]/page.tsx        ← Dynamic route
│   ├── api/
│   │   └── endpoint/route.ts  ← API route handler
│   └── globals.css
├── src/components/            ← Shared React components
├── src/lib/                   ← Utilities, DB client, helpers
├── src/db/
│   ├── schema.ts              ← Drizzle ORM schema
│   └── index.ts               ← DB connection
├── public/                    ← Static assets
├── package.json
├── next.config.ts
├── tsconfig.json
└── Dockerfile
```

## Express Project Structure
```
project/
├── src/
│   ├── index.ts               ← Entry point, app.listen()
│   ├── routes/                ← Express routers
│   ├── middleware/            ← Auth, logging, error handling
│   ├── services/             ← Business logic
│   ├── models/               ← Database models
│   └── utils/                ← Helpers
├── tests/
├── package.json
└── tsconfig.json
```

## Next.js Key Patterns

### API Routes (App Router)
```typescript
// app/api/users/route.ts
export async function GET(req: NextRequest) {
  const users = await db.select().from(users);
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const [created] = await db.insert(users).values(body).returning();
  return NextResponse.json(created, { status: 201 });
}
```

### Dynamic Routes
```typescript
// app/users/[id]/page.tsx
export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // ...
}
```

### Server vs Client Components
- **Server components** (default) — run on server, can access DB directly, no `useState`
- **Client components** — `"use client"` directive, run in browser, can use hooks
- **Rule**: keep components server-side unless they need interactivity

## Express Key Patterns

### Route + Middleware
```typescript
app.get("/api/users", authMiddleware, async (req, res) => {
  const users = await db.query("SELECT * FROM users");
  res.json(users);
});
```

### Error Handling
```typescript
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.message);
  res.status(500).json({ error: "Internal server error" });
});
```

## TypeScript Data Types
| TypeScript | SQL Equivalent | Notes |
|-----------|---------------|-------|
| `string` | `VARCHAR`, `TEXT` | |
| `number` | `INTEGER`, `FLOAT` | Use `bigint` for large IDs |
| `boolean` | `BOOLEAN` | |
| `Date` | `TIMESTAMP` | |
| `string` (uuid) | `UUID` | Use `crypto.randomUUID()` |
| `T[]` | `JSONB` (array) | |
| `Record<K, V>` | `JSONB` (object) | |
| `null` | `NULL` | Explicit in TypeScript, implicit in SQL |
| `enum` | `VARCHAR` with CHECK | Or use string union types |

## ORM Patterns (Drizzle)
```typescript
// Schema
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Query
const allUsers = await db.select().from(users);
const oneUser = await db.select().from(users).where(eq(users.id, id));
const [created] = await db.insert(users).values({ name, email }).returning();
```

## Common Pitfalls
- **`any` type** — avoid. Use `unknown` + type guards instead.
- **Missing `await`** — async functions return Promises. Forgetting `await` = bugs.
- **Mutable state in server components** — Next.js caches aggressively. Don't mutate shared state.
- **Environment variables** — `process.env.X` is `string | undefined`. Always validate.
- **CORS** — Express needs `cors()` middleware. Next.js API routes handle same-origin by default.
- **SQL injection** — always use parameterized queries / ORM. Never interpolate strings into SQL.
