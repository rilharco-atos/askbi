# C# / .NET — Language Reference

## Project Structure (ASP.NET Core)
```
project/
├── Program.cs                    ← Entry point, service configuration
├── Controllers/                  ← API controllers
├── Services/                     ← Business logic (DI-injected)
├── Models/                       ← Entity classes
├── DTOs/                         ← Request/response objects
├── Data/
│   ├── AppDbContext.cs           ← EF Core DbContext
│   └── Migrations/              ← EF Core migrations
├── Middleware/                   ← Custom middleware
├── appsettings.json             ← Configuration
├── project.csproj               ← Dependencies
└── Dockerfile
```

## Common Frameworks
| Framework | Use Case |
|-----------|----------|
| **ASP.NET Core** | Web APIs, MVC |
| **Entity Framework Core** | ORM |
| **MediatR** | CQRS / mediator pattern |
| **FluentValidation** | Request validation |
| **Serilog** | Structured logging |
| **xUnit / NUnit** | Testing |
| **Moq** | Mocking |

## Data Types
| C# | TypeScript | SQL | Notes |
|----|-----------|-----|-------|
| `string` | `string` | `VARCHAR`/`TEXT` | Nullable with `string?` |
| `int` | `number` | `INTEGER` | 32-bit |
| `long` | `bigint` | `BIGINT` | 64-bit |
| `decimal` | `Decimal.js` | `NUMERIC` | Use for money — always |
| `double` | `number` | `FLOAT` | IEEE 754 |
| `bool` | `boolean` | `BOOLEAN` | |
| `DateTime` | `Date` | `TIMESTAMP` | Use `DateTimeOffset` for TZ |
| `Guid` | `string` (uuid) | `UUID` | |
| `List<T>` | `T[]` | `JSONB` | |
| `Dictionary<K,V>` | `Record<K,V>` | `JSONB` | |
| `enum` | `enum` | `VARCHAR` | Stored as int by default in EF |

## Patterns
- **Dependency Injection** — `builder.Services.AddScoped<IUserService, UserService>()`
- **Middleware pipeline** — `app.UseAuthentication(); app.UseAuthorization();`
- **Repository + Unit of Work** — EF Core DbContext IS the unit of work
- **Options pattern** — `services.Configure<MySettings>(config.GetSection("MySettings"))`
- **Minimal APIs** — `app.MapGet("/users", async (AppDbContext db) => await db.Users.ToListAsync())`
- **Result pattern** — return `Result<T>` instead of throwing exceptions for business errors

## Common Pitfalls
- **Async void** — never use except for event handlers. Use `async Task`.
- **DbContext lifetime** — scoped per request. Don't inject as singleton.
- **String comparison** — use `StringComparison.OrdinalIgnoreCase` for case-insensitive.
- **Decimal vs double** — financial calculations MUST use `decimal`, never `double`.
- **IDisposable** — use `using` statements or `using` declarations for cleanup.
- **EF tracking** — use `AsNoTracking()` for read-only queries (performance).
