# Python — Language Reference

## Project Structure
```
project/
├── src/
│   ├── __init__.py
│   ├── main.py              ← Entry point
│   ├── config.py            ← Settings (pydantic-settings)
│   ├── models/              ← Data models (SQLAlchemy / Pydantic)
│   ├── routes/              ← API routes (FastAPI / Flask)
│   ├── services/            ← Business logic
│   ├── repositories/        ← Database access
│   └── utils/               ← Helpers
├── tests/
│   ├── conftest.py          ← Fixtures
│   ├── test_*.py            ← Test files
├── pyproject.toml           ← Dependencies + config
├── Dockerfile
└── .env.example
```

## Common Frameworks
| Framework | Use Case | Key Files |
|-----------|----------|-----------|
| **FastAPI** | REST APIs | `main.py`, routes with `@app.get()` |
| **Django** | Full-stack web | `settings.py`, `urls.py`, `views.py`, `models.py` |
| **Flask** | Lightweight APIs | `app.py`, blueprints |
| **SQLAlchemy** | ORM | `models.py`, `Base.metadata` |
| **Pydantic** | Validation/schemas | `schemas.py`, `BaseModel` subclasses |
| **Celery** | Task queues | `tasks.py`, `celery.py` |
| **pytest** | Testing | `test_*.py`, `conftest.py` |

## Data Types
| Python | TypeScript Equivalent | Notes |
|--------|----------------------|-------|
| `str` | `string` | Unicode by default |
| `int` | `number` \| `bigint` | Arbitrary precision |
| `float` | `number` | IEEE 754 double |
| `Decimal` | `Decimal.js` | Use for money |
| `bool` | `boolean` | |
| `list[T]` | `T[]` | |
| `dict[K, V]` | `Record<K, V>` | |
| `Optional[T]` | `T \| null` | |
| `tuple[A, B]` | `[A, B]` | |
| `datetime` | `Date` | Use `pendulum` or `arrow` for TZ |
| `UUID` | `string` (uuid format) | |
| `Enum` | `enum` | |

## Patterns
- **Type hints everywhere** — `def process(data: dict[str, Any]) -> Result:`
- **Pydantic for validation** — `class UserCreate(BaseModel): name: str; email: EmailStr`
- **Dependency injection** — FastAPI `Depends()`, Django middleware
- **Context managers** — `with open(f) as file:` for resource cleanup
- **Async** — `async def`, `await`, `asyncio.gather()` for concurrency
- **Decorators** — `@app.route()`, `@login_required`, `@retry()`

## Common Pitfalls
- **Mutable default args** — `def f(items=[])` shares the list. Use `None` + `if items is None`.
- **GIL** — threading doesn't parallelize CPU work. Use `multiprocessing` or `asyncio` for I/O.
- **Import cycles** — move imports inside functions or restructure modules.
- **Float precision** — `0.1 + 0.2 != 0.3`. Use `Decimal` for money.
