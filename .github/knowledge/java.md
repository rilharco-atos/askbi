# Java — Language Reference

## Project Structure (Spring Boot)
```
project/
├── src/main/java/com/company/app/
│   ├── Application.java           ← @SpringBootApplication entry
│   ├── config/                    ← @Configuration beans
│   ├── controller/                ← @RestController (API endpoints)
│   ├── service/                   ← @Service (business logic)
│   ├── repository/                ← @Repository (JPA/database)
│   ├── model/                     ← @Entity (JPA entities)
│   ├── dto/                       ← Request/response DTOs
│   ├── exception/                 ← Custom exceptions + @ControllerAdvice
│   └── util/                      ← Helpers
├── src/main/resources/
│   ├── application.yml            ← Configuration
│   └── db/migration/              ← Flyway/Liquibase migrations
├── src/test/java/                 ← Tests mirror src structure
├── pom.xml or build.gradle        ← Dependencies
└── Dockerfile
```

## Common Frameworks
| Framework | Use Case | Key Annotations |
|-----------|----------|----------------|
| **Spring Boot** | Full-stack / microservices | `@SpringBootApplication`, `@RestController`, `@Service` |
| **Spring Data JPA** | ORM / database | `@Entity`, `@Repository`, `JpaRepository<T, ID>` |
| **Spring Security** | Auth / authorization | `@EnableWebSecurity`, `SecurityFilterChain` |
| **Jakarta EE** | Enterprise (legacy) | `@Stateless`, `@EJB`, `@PersistenceContext` |
| **Hibernate** | ORM (under JPA) | `@Table`, `@Column`, `@OneToMany`, `@ManyToOne` |
| **JUnit 5** | Testing | `@Test`, `@BeforeEach`, `@ExtendWith` |
| **Mockito** | Mocking | `@Mock`, `@InjectMocks`, `when().thenReturn()` |

## Data Types
| Java | TypeScript Equivalent | Notes |
|------|----------------------|-------|
| `String` | `string` | Immutable |
| `int` / `Integer` | `number` | 32-bit |
| `long` / `Long` | `number` \| `bigint` | 64-bit |
| `double` / `Double` | `number` | IEEE 754 |
| `BigDecimal` | `Decimal.js` | Use for money — ALWAYS |
| `boolean` / `Boolean` | `boolean` | |
| `List<T>` | `T[]` | `ArrayList`, `LinkedList` |
| `Map<K, V>` | `Record<K, V>` | `HashMap`, `TreeMap` |
| `Optional<T>` | `T \| null` | |
| `LocalDate` | `string` (ISO date) | java.time — always use this, not `Date` |
| `LocalDateTime` | `Date` \| `string` | |
| `UUID` | `string` | `java.util.UUID` |
| `enum` | `enum` | Java enums are classes — can have methods |

## Patterns
- **Constructor injection** — `@RequiredArgsConstructor` (Lombok) or explicit constructor
- **DTO mapping** — separate entity from API contract. Use MapStruct or manual mapping.
- **Repository pattern** — `interface UserRepo extends JpaRepository<User, UUID>`
- **Exception handling** — `@ControllerAdvice` + `@ExceptionHandler` for global error handling
- **Validation** — `@Valid` on request body, `@NotNull`, `@Size`, `@Email` on DTO fields
- **Streams** — `list.stream().filter().map().collect()` for functional data processing

## Common Pitfalls
- **NullPointerException** — use `Optional<T>`, never return null from service methods
- **N+1 queries** — JPA lazy loading fetches each relation separately. Use `@EntityGraph` or `JOIN FETCH`
- **Mutable entities** — JPA entities are mutable and tracked. Don't pass them to the API layer — use DTOs
- **BigDecimal comparisons** — `new BigDecimal("1.0").equals(new BigDecimal("1.00"))` is FALSE. Use `compareTo()`
- **Thread safety** — Spring beans are singletons. Don't store request state in service fields.
