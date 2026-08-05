# Architecture

## File Structure

Feature-based modules under `src/`:
- `users/`: user + role entities, CRUD, DTOs
- `auth/`: JWT, refresh tokens, strategies, guards
- `videos/`: video entity, upload CRUD, watch history
- `streaming/`: HLS manifest serving, playback endpoints
- `analytics/`: heartbeat ingest, aggreator, MongoDB rollups
- `admin/`: dashboard, moderation, user management
- `kafka/`: Kafka client, producers, consumers (shared global module)
- `common/`: shared guards, decorators, filters, interceptors
- `config/`: NestJS configuration modules
- `health/`: health check endpoints

Each feature module owns its entities, DTOs, controller, service, and module file. Entities are discovered by MikroORM via the glob `./dist/**/*.entity.js`.

## Tech Stack
| Component | Role |
|---|---|
| **NestJS** | Application layer: public API and internal services |
| **MikroORM v7** | PostgreSQL ORM (not TypeORM). Entities in feature modules (`src/*/entities/`), decorated with `@mikro-orm/decorators/legacy` |
| **Kafka** | Decouples slow/bursty work (transcoding, analytics aggregation) from fast HTTP requests |
| **Redis** | Caching, rate limiting, short-lived session state (watched ranges) |
| **PostgreSQL** | Source of truth for relational data: users, roles, videos, watch history, tokens |
| **MongoDB** | Flexible-schema analytics rollups (retention curves vary per video) |
| **MinIO** | S3-compatible object storage: raw uploads and processed HLS assets |
| **Kubernetes** | (Stage 2) Orchestration: Jobs for transcoding, CronJobs for cleanup |
| **Traefik** | Stage 1: reverse proxy in Docker Compose with TLS. Stage 2: K8s Ingress controller |
| **Cloudflare** | Edge CDN for HLS chunk delivery, DDoS protection, Web Analytics |

## Request Path (Viewer Watching a Video)
Viewer → Cloudflare (CDN + DDoS + Web Analytics) → Traefik (Ingress, TLS, load balancing) → NestJS pods → reads from Postgres / MongoDB / Redis / MinIO as needed

## Upload Path
Instructor uploads → NestJS ingest endpoint → MinIO (`raw-uploads/` bucket) → Kafka event (`video.uploaded`) → Transcoding worker (Kubernetes Job) → ffmpeg → HLS chunks + manifests → MinIO (`processed/` bucket) → status updated in Postgres

## Analytics Path
Video player → heartbeat events (every ~10s: sessionId, userId, videoId, position, duration, event type) → NestJS ingest → Kafka (`video.heartbeat`) → Aggregator worker → Redis (live session watched ranges) → MongoDB (daily rollup documents) → Dashboard API

## Object Storage Layout (MinIO)
- **`raw-uploads/`**: original files as uploaded. Can be deleted after successful transcoding.
- **`processed/{videoId}/{rendition}/`**: one subfolder per bitrate (1080p, 720p, 480p), each containing `.ts` chunks + `.m3u8` manifest, plus a master manifest at the top level.

Access via presigned URLs for both uploads and playback.

## Data Stores
| Store | Data | Key Characteristics |
|---|---|---|
| **PostgreSQL** | users, roles, refresh_tokens, videos, watch_history | Relational, transactional, partitioned by month. Accessed via MikroORM v7 |
| **MongoDB** | Daily analytics rollups (per-video retention curves) | Flexible document schema, no aggregation on read path |
| **Redis** | Active session watched ranges, rate limit counters, optional token denylist | Ephemeral, high-write-frequency, TTL-based expiry |

## Deployment Strategy (Two Stages)

**Stage 1: Docker Compose (Phase 1-9)**
All services run via Docker Compose on the VPS. Traefik as reverse proxy with TLS. No Kubernetes yet.
- `deployments/local/compose.yml`: local dev (postgres + redis + kafka + minio + app with hot-reload)
- `deployments/remote/compose.yml`: production (+Traefik with TLS labels, Infisical secrets)
- `deployments/remote/Dockerfile`: multi-stage production build
- `deployments/remote/deploy.sh`: deploy script
- GitHub Actions CI/CD: build → push to GHCR → SSH → deploy
- Infisical for secrets management
- Postgres read replica + partitioning added in Phase 9

**Stage 2: Kubernetes + Observability (Phase 10)**
Migrate Compose services to K8s manifests. Add observability stack.
- `deployments/prod/` - location for production level setup
- **Kubernetes**: Deployments, Services, Jobs (transcoding), CronJobs (cleanup)
- **Traefik**: Ingress controller inside the cluster
- **Prometheus + Grafana + Loki**: metrics, logs, dashboards
- **Alerting**: transcoding failure, Kafka consumer lag

**Makefile**: `make up`, `make down`, `make build`, `make migrate`, `make seed`

## Observability (Stage 2: Phase 10)
- **Prometheus + Grafana**: metrics (transcoding duration/failure rate, Kafka consumer lag, HLS request latency)
- **Loki**: persistent, queryable log aggregation alongside Grafana
- **Dozzle**: live container log tailing during development
- **Alerting**: at minimum on transcoding job failure + dead-letter queue on Kafka topics
