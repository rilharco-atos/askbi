# API Design — REST & Patterns Reference

## REST Conventions
| Method | Path | Action | Status |
|--------|------|--------|--------|
| `GET /users` | List all | 200 |
| `GET /users/:id` | Get one | 200 / 404 |
| `POST /users` | Create | 201 |
| `PUT /users/:id` | Full replace | 200 / 404 |
| `PATCH /users/:id` | Partial update | 200 / 404 |
| `DELETE /users/:id` | Remove | 200 / 404 |

## Response Format
```json
// Success (single)
{ "id": "uuid", "name": "...", "createdAt": "2026-04-07T..." }

// Success (list)
[{ "id": "uuid", "name": "..." }, ...]

// Error
{ "error": "Human-readable message" }
```

## Status Codes
| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Successful GET, PUT, PATCH, DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Missing required fields, invalid format |
| 401 | Unauthorized | No auth token / expired session |
| 403 | Forbidden | Valid auth but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate unique constraint |
| 422 | Unprocessable | Valid format but business rule violation |
| 500 | Internal Error | Unhandled server error (never expose details) |

## Pagination
```
GET /users?page=2&limit=20

Response headers:
X-Total-Count: 150
X-Total-Pages: 8
```

## Filtering & Sorting
```
GET /stories?status=in_progress&assignedTo=rui&sort=-createdAt
```

## Authentication Patterns
| Pattern | Use Case | Header |
|---------|----------|--------|
| Bearer token | API-to-API, SDK | `Authorization: Bearer atk_...` |
| Session cookie | Browser, portal UI | `Cookie: sid=...` |
| API key | Simple integrations | `X-API-Key: ...` |
| OAuth 2.0 | Third-party integrations | `Authorization: Bearer <jwt>` |

## Versioning
- **URL path**: `/api/v1/users` — simplest, most visible
- **Header**: `Accept: application/vnd.api+json;version=2` — cleaner URLs
- **Default**: don't version until you need to. One version is zero overhead.

## Security Checklist
- [ ] All inputs validated and sanitized
- [ ] Parameterized queries (no SQL string building)
- [ ] Rate limiting on authentication endpoints
- [ ] CORS restricted to known origins
- [ ] Sensitive data never in URL parameters (use POST body)
- [ ] Error responses don't expose stack traces or internal details
- [ ] Auth tokens have expiration
- [ ] File uploads validated (type, size, content)
