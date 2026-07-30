# Rules

## ORM — MikroORM v7
- Use **MikroORM v7** (not TypeORM). Packages: `@mikro-orm/core`, `@mikro-orm/decorators`, `@mikro-orm/nestjs`, `@mikro-orm/postgresql`, `@mikro-orm/migrations`, `@mikro-orm/cli`.
- Import decorators from `@mikro-orm/decorators/legacy` (`@Entity`, `@PrimaryKey`, `@Property`, `@ManyToOne`, `@OneToMany`, `@OneToOne`).
- Primary keys: UUID strings with `v4()` default from the `uuid` package.
- Entities live inside their feature module under `src/<feature>/entities/` (e.g. `src/users/entities/user.entity.ts`).
- Entity discovery via glob patterns in `mikro-orm.config.ts`: `entities: ['./dist/**/*.entity.js']`.
- Each feature module registers its entities with `MikroOrmModule.forFeature([EntityA, EntityB])`.
- `AppModule` imports `MikroOrmModule.forRoot(mikroOrmConfig)` (config loaded from root config file).
- Config in `mikro-orm.config.ts` at root using `defineConfig()` from `@mikro-orm/postgresql` + `Migrator` extension.
- Migrations via `@mikro-orm/migrations`; scripts in `package.json`: `migration:create`, `migration:up`, `migration:down`.
- Add `"mikro-orm"` config section in `package.json` pointing to `mikro-orm.config.ts`.
- **Naming convention:** camelCase in code, snake_case in DB columns. Use `fieldName` on decorators (e.g. `@Property({ fieldName: 'created_at' })`) or set a global naming strategy for automatic conversion.

## Authentication
- **JWT signing:** Use RS256 (asymmetric), not HS256. Signing key stays private to the auth service; any service can verify with the public key. No shared secret to distribute or leak.
- **Refresh tokens:** Opaque random string (not a JWT), stored hashed in `refresh_tokens` table, delivered as `httpOnly` + `secure` cookie (client-side JS never reads it).
- **Token rotation:** On refresh, issue a new access+refresh pair (same `family_id`), revoke the old refresh token. If a revoked token is ever presented again, revoke the entire `family_id` (theft signal).

## Authorization
- Use custom `RolesGuard` + `@Roles()` decorator (see `src/auth/guards/roles.guard.ts`) with roles: `admin`, `staff`, `user`.
- Roles are enforced at the controller/route level via `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.ADMIN)`.
- Role modeled as a separate `Role` entity (`id`, `name`, `description`, `createdAt`, `updatedAt`) with ManyToOne FK to `User.role_id`.

## File Structure

```
src/
├── app.module.ts              ← root module
├── main.ts                    ← entry point
├── common/                    ← shared: guards, decorators, filters, interceptors
├── config/                    ← NestJS config (app.config.ts, database.config.ts)
├── health/                    ← health check endpoints
├── auth/                      ← JWT, refresh tokens, strategies
├── users/                     ← user + role entities, CRUD
│   ├── dto/
│   ├── entities/              ← user.entity.ts, role.entity.ts, enums.ts
│   ├── users.controller.ts
│   ├── users.module.ts        ← imports MikroOrmModule.forFeature([User, Role])
│   └── users.service.ts
├── videos/                    ← video entity, watch-history, upload CRUD
│   ├── dto/
│   ├── entities/
│   ├── videos.controller.ts
│   ├── videos.module.ts
│   └── videos.service.ts
├── streaming/                 ← HLS manifest serving, playback
├── analytics/                 ← heartbeat ingest, aggregation, MongoDB
├── admin/                     ← dashboard endpoints, moderation
└── kafka/                     ← Kafka client, producers, consumers (shared module)
```

## Entity Schema Reference

### Role
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | `v4()` default |
| name | string, unique, length 50 | `admin`, `staff`, `user` |
| description | text, nullable | |
| createdAt | datetime | |
| updatedAt | datetime | `onUpdate` |

### User
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | `v4()` default |
| email | string, unique, length 50 | used for login |
| username | string, unique, length 20 | used for login after email verified |
| passwordHash | string, length 255 | |
| firstName | string, length 100 | |
| lastName | string, length 100 | |
| role | ManyToOne → Role | `fieldName: 'role_id'` |
| isActive | boolean | default true |
| createdAt | datetime | |
| updatedAt | datetime | `onUpdate` |

## Deployment Strategy: Compose-first, K8s-later

**Stage 1 (Phase 1–9): Docker Compose on VPS**
- `deployments/local/compose.yml` — local dev (postgres + redis + kafka + minio + app with hot-reload mounts)
- `deployments/local/Dockerfile` — multi-stage (build → prod), `node:22-alpine`
- `deployments/local/.env` + `.env.example`
- `deployments/remote/compose.yml` — VPS deployment (+Traefik reverse proxy with TLS)
- `deployments/remote/Dockerfile` — production multi-stage build
- `deployments/remote/deploy.sh` + `setup-vps.sh`
- `deployments/remote/.env.example`
- All secrets via Infisical; CI/CD via GitHub Actions

**Stage 2 (Phase 10): Kubernetes + Observability**
- `deployments/prod/` — K8s manifests + monitoring config
- Convert Compose services to K8s Deployments + Services
- Traefik becomes the K8s Ingress controller
- Add Prometheus + Grafana + Loki for observability
- Transcoding uses K8s Jobs (instead of Compose worker service)
- Cleanup via CronJobs

**Makefile commands:**
```makefile
up:        docker compose -f deployments/local/compose.yml up --build
down:      docker compose -f deployments/local/compose.yml down
build:     pnpm run build
migrate:   loads .env then runs migration:up
seed:      loads .env then runs seed script
```

## Technology Constraints
- NestJS for all API services
- MikroORM v7 for PostgreSQL access
- Kafka for async messaging (transcoding triggers, analytics heartbeats)
- Redis for caching, rate limiting, ephemeral session state (not durable storage)
- PostgreSQL for relational/transactional data
- MongoDB for analytics rollups only
- MinIO for object storage (raw + processed video)
- Kubernetes for orchestration
- Traefik for ingress
- Cloudflare for edge CDN
- Infisical for secrets management
- Prometheus + Grafana + Loki for observability

## Coding Practices
- **Swagger/OpenAPI** — use `@nestjs/swagger` decorators (`@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiResponse`) on all controllers. Setup `SwaggerModule` in `main.ts`, serves at `/api/docs`.
- **Presigned URLs** for uploads and playback — large files go direct to MinIO, not through the app server
- **Stateless API pods** — all state lives in PostgreSQL / MongoDB / Redis / MinIO
- **All secrets via Infisical** — never in code or config files
- **Prometheus metrics** exported from every service
- **Structured logs** queryable via Loki
- **Dead-letter queue** on Kafka topics for failed messages (especially transcoding)
- **Partitioning** — `watch_history` range-partitioned by month in Postgres
