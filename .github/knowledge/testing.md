# Testing — Strategy & Patterns Reference

## Atos Three-Layer Testing Strategy

### Layer 1: Build & Smoke
- Does it compile / build without errors?
- Does the main entry point start?
- Does the health check respond?
- **Run on every commit.** Fail fast.

### Layer 2: Unit Tests
- Business logic functions in isolation
- Edge cases and error paths
- No external dependencies (mock DB, APIs)
- **Target: 80%+ line coverage on business logic**

### Layer 3: UI / E2E Tests
- Critical user journeys end-to-end
- Real browser, real database (test instance)
- Login → main action → verify result
- **Target: top 5-10 user journeys covered**

## Test File Naming
| Framework | Convention |
|-----------|-----------|
| Jest / Vitest | `*.test.ts`, `*.spec.ts` |
| pytest | `test_*.py`, `*_test.py` |
| JUnit | `*Test.java`, `*Tests.java` |
| xUnit (.NET) | `*Tests.cs` |
| Go | `*_test.go` |

## Unit Test Structure (AAA Pattern)
```typescript
describe("calculateInterest", () => {
  it("calculates interest for active savings account", () => {
    // Arrange
    const account = { balance: 1000, rate: 0.05, type: "savings", active: true };
    
    // Act
    const interest = calculateInterest(account);
    
    // Assert
    expect(interest).toBe(50);
  });

  it("returns zero for inactive accounts", () => {
    const account = { balance: 1000, rate: 0.05, type: "savings", active: false };
    expect(calculateInterest(account)).toBe(0);
  });

  it("throws for negative balance", () => {
    const account = { balance: -100, rate: 0.05, type: "savings", active: true };
    expect(() => calculateInterest(account)).toThrow("Invalid balance");
  });
});
```

## What to Test
- **Business rules** — every IF/ELSE branch, every calculation
- **Boundary values** — zero, one, max, empty string, null
- **Error paths** — invalid input, missing data, network failures
- **State transitions** — draft→review→approved, active→suspended

## What NOT to Test
- Framework internals (don't test that React renders a div)
- Trivial getters/setters
- Third-party library behavior
- Implementation details (test behavior, not structure)

## COBOL-Specific Test Patterns
When modernizing COBOL, extract test cases from the legacy system:
1. **Capture COBOL inputs/outputs** — run existing programs with known data, record results
2. **Build equivalence tests** — same input to modern code must produce same output
3. **Test COPYBOOK mappings** — verify data structure translation preserves field semantics
4. **Test calculation precision** — COMP-3 decimal vs modern float. Use exact decimal comparison.
5. **Test batch equivalence** — JCL job output must match modern batch job output

## Coverage Thresholds
| Type | Target | Notes |
|------|--------|-------|
| Business logic | 80%+ | Core calculations, rules, state machines |
| API handlers | 70%+ | Happy path + main error paths |
| Utilities | 90%+ | Small functions, easy to test fully |
| UI components | 50%+ | Critical interactions, not every pixel |
| Integration | Key paths | Top 10 user journeys |
