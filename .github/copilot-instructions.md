# Atos Blueprint — AI-Assisted Development Standards

This project uses the Atos Blueprint methodology. All work must comply with these standards.

## Atos Non-Negotiables

1. **EU Data Residency** — all data stored and processed in EU
2. **Full Audit Trail** — every mutation logged, 12-month minimum retention
3. **Graceful Degradation** — no hard failures when AI subsystems are unavailable
4. **Observability from Day One** — traces, metrics, and structured logs on all components
5. **Multi-Tenant from Day One** — architecture supports multi-tenancy via configuration

## Code Standards

- No magic strings — use enums/constants
- Structured JSON logging — no console.log in production
- Parameterized queries only — no SQL string interpolation
- Every public function documented
- Tests ship with code
- No secrets in code or env files
- No commented-out code in commits
- Error handling at system boundaries (user input, external APIs, database)

## Testing Strategy

Three-layer approach:
1. **Build & Smoke** — does it compile? does the main path work?
2. **Unit Tests** — business logic, edge cases, error paths
3. **UI/E2E Tests** — critical user journeys end-to-end

## Available Agent Commands

Select an agent from the agent picker in Copilot Chat (click the agent icon or type `@`):

| Agent | Persona | Role |
|-------|---------|------|
| `/assess` | Diogo | Systems Analyst — brownfield assessment, health scoring |
| `/prd` | Clara | Product Manager — structured PRD creation |
| `/architect` | Tomás | Solution Architect — system design, ADRs |
| `/epics` | Inês | PM — epic & story decomposition |
| `/sprint` | Hugo | Scrum Master — sprint planning |
| `/usecases` | Sofia | Business Analyst — use case specification |
| `/test` | Lena | QA Engineer — test specification |
| `/docs` | Dante | Technical Writer — documentation |
| `/dev` | Miguel | Senior Developer — implementation |
| `/review` | Beatriz | QA Engineer — code review |

Agent definitions are in `.github/copilot/agents/*.agent.md`.

## Workflow for Brownfield/Modernization Projects

1. `@assess` — Analyze the existing codebase (scan directories, identify patterns, health score)
2. `@prd` — Create remediation PRD based on assessment findings
3. `@architect` — Design modernization architecture with migration paths
4. `@epics` — Decompose into implementable work
5. `@sprint` — Plan the first sprint
6. `@dev` — Implement stories following the architecture
7. `@review` — Review implementations against standards

## Knowledge Base

Reference documents in `.github/copilot/knowledge/` — consult these when working with specific technologies:

**Languages:**
- `cobol.md` — COBOL structure, data types, business rule extraction, complexity indicators
- `python.md` — Python/FastAPI/Django patterns, type mapping, common pitfalls
- `java.md` — Java/Spring Boot patterns, JPA, type mapping, enterprise patterns
- `javascript-nextjs.md` — TypeScript/Next.js/Express patterns, ORM, server vs client components
- `csharp-dotnet.md` — C#/.NET/ASP.NET Core patterns, EF Core, dependency injection

**Infrastructure:**
- `sql-postgres.md` — PostgreSQL schema design, indexing, migration patterns from DB2/VSAM
- `docker-infra.md` — Dockerfile patterns, Docker Compose, CI/CD, observability
- `api-design.md` — REST conventions, status codes, auth patterns, security checklist
- `testing.md` — Atos 3-layer testing strategy, unit test patterns, COBOL equivalence testing

**Migration:**
- `cobol-to-nextjs.md` — Strangler fig strategy, architecture mapping, data type translation, business logic patterns

## MCP Servers

Three MCP servers are configured in `.vscode/mcp.json` and available to agents:

| Server | Purpose | Key Tools |
|--------|---------|-----------|
| `atos-architecture` | Atos/Eviden reference architecture for Java/Spring Boot — DDD layers, Spring Modulith, Micrometer, ArchUnit, validators | `list_resources`, `get_resource`, `list_prompts`, `get_prompt` |
| `github` | GitHub integration — repos, issues, PRs, code search | `create_issue`, `create_pr`, `search_code`, `get_pr_diff` |

All agents also have the built-in `web` tool for fetching live content from `ia-doc.atoscmi.net` and other URLs.

**ATOS Architecture MCP resources** (use `get_resource` with these names):
- `atos-arquitectura-00-indice` — Complete index
- `atos-arquitectura-01-dependencias-maven` — Maven dependencies
- `atos-arquitectura-04-patron-capas` — DDD layer pattern
- `atos-arquitectura-05-validadores` — Validators (BeforeCreate, BeforeSave, BeforeDelete)
- `atos-arquitectura-06-entidad` — JPA/MongoDB entities
- `atos-arquitectura-07-dto` — DTOs
- `atos-arquitectura-08-repository` — Repositories
- `atos-arquitectura-09-service` — Services
- `atos-arquitectura-10-controller` — Controllers
- `atos-arquitectura-15-moduleith` — Spring Modulith
- `atos-arquitectura-17-metricas-micrometer` — Micrometer metrics
- `atos-arquitectura-19-archunit` — ArchUnit verification rules

**Atos AI Knowledgebase**: `https://ia-doc.atoscmi.net/` — role-specific prompts, playbooks, governance docs for architects, developers, QA, DevOps, PM, analysts, operations.

## Key Rules

- Assessment BEFORE planning for brownfield projects
- PRD BEFORE architecture — requirements drive design, not the other way
- Architecture decisions must reference PRD requirements
- Stories must trace back to PRD sections
- Every code change must pass the testing strategy
- Non-negotiables are NON-NEGOTIABLE — no exceptions
