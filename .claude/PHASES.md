# Build Phases

Each phase is independently demoable. Mark completed phases with `[x]`.

## Phase Checklist

- [x] **Phase 1: Skeleton**: NestJS app scaffold, feature-based structure (`users/`, `auth/`, `videos/`, `streaming/`, `analytics/`, `admin/`, `kafka/`, `common/`), MikroORM v7 setup (`mikro-orm.config.ts`, glob entity discovery, `forFeature` in modules), `users/entities/` with `user.entity.ts` + `role.entity.ts`, Swagger bootstrap (`@nestjs/swagger` + `SwaggerModule` in `main.ts`, serves at `/api/docs`), `deployments/local/compose.yml` (postgres + redis + kafka + minio), `deployments/local/Dockerfile` (multi-stage, node:22-alpine), `Makefile`, health check endpoint
- [x] **Phase 2: Auth**: JWT (RS256) + refresh token flow, rotation and reuse detection, login rate limiting via Redis
- [x] **Phase 3: Uploads**: MinIO integration, presigned upload URLs, `videos` table, basic CRUD (store and list raw uploads, no transcoding yet)
- [x] **Phase 4: Transcoding Pipeline**: Kafka topic (`video.uploaded`), ffmpeg worker (as Compose service), HLS output to MinIO, master manifest generation
- [x] **Phase 5: Streaming**: HLS proxy through NestJS from MinIO `processed/` bucket, correct MIME types, Range header support, computed `hlsUrl` in video responses, mock data wired for frontend testing
- [x] **Phase 6: Watch History**: `watch_history` table, upsert-on-session-end logic, resume playback on frontend
- [x] **Phase 7: Analytics Pipeline**: Heartbeat ingest endpoint, Redis session state, aggregator worker, MongoDB rollups, dashboard API
- [x] **Phase 8: Admin Dashboard**: Moderation views (pending uploads approve/reject), user management, analytics overview, audit log

**Stage 1 complete: app running on Docker Compose**

- [ ] **Phase 9: Production Deploy (Docker Compose)**: `deployments/production/compose.yml` (+Traefik with TLS), Infisical secrets, GitHub Actions CI/CD, Cloudflare Web Analytics, Redocly API docs, Postgres read replica, `watch_history` partitioning

**Stage 2 complete: shipped to production on Compose**

- [ ] **Phase 10: Kubernetes + Observability**: Migrate from Docker Compose to K8s manifests, Prometheus + Grafana + Loki, alerting on transcoding failures, K8s Jobs/CronJobs for transcoding and cleanup, Dozzle for dev

**Final: full platform on K8s with observability**

## Skills & Tools
- `claude-mem`: context memory across sessions
- `vibesec-skill`: security best practices
- `ponytail`: optimize code and remove unnecessary parts
