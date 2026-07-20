# Build Phases

Each phase is independently demoable. Mark completed phases with `[x]`.

## Phase Checklist

- [ ] **Phase 1: Skeleton** — NestJS app scaffold, feature-based structure (`users/`, `auth/`, `videos/`, `streaming/`, `analytics/`, `admin/`, `kafka/`, `common/`), MikroORM v7 setup (`mikro-orm.config.ts`, glob entity discovery, `forFeature` in modules), `users/entities/` with `user.entity.ts` + `role.entity.ts`, `deployments/local-dev/compose.yml` (postgres + redis + kafka + minio), `deployments/local-dev/Dockerfile` (multi-stage, node:22-alpine), `Makefile`, health check endpoint
- [ ] **Phase 2: Auth** — JWT (RS256) + refresh token flow, rotation and reuse detection, login rate limiting via Redis
- [ ] **Phase 3: Uploads** — MinIO integration, presigned upload URLs, `videos` table, basic CRUD (store and list raw uploads, no transcoding yet)
- [ ] **Phase 4: Transcoding Pipeline** — Kafka topic (`video.uploaded`), ffmpeg worker (as Compose service), HLS output to MinIO, master manifest generation
- [ ] **Phase 5: Streaming** — Traefik reverse proxy (in Compose), Cloudflare proxying, confirm adaptive playback end-to-end with hls.js
- [ ] **Phase 6: Watch History** — `watch_history` table, upsert-on-session-end logic, resume playback on frontend
- [ ] **Phase 7: Analytics Pipeline** — Heartbeat ingest endpoint, Redis session state, aggregator worker, MongoDB rollups, dashboard API
- [ ] **Phase 8: Admin Dashboard** — Casbin RBAC (admin, staff, user), moderation views (pending uploads approve/reject), user management, analytics overview

**Stage 1 complete — app running on Docker Compose**

- [ ] **Phase 9: Production Deploy (Docker Compose)** — `deployments/production/compose.yml` (+Traefik with TLS), Infisical secrets, GitHub Actions CI/CD, Cloudflare Web Analytics, Redocly API docs, Postgres read replica, `watch_history` partitioning

**Stage 2 complete — shipped to production on Compose**

- [ ] **Phase 10: Kubernetes + Observability** — Migrate from Docker Compose to K8s manifests, Prometheus + Grafana + Loki, alerting on transcoding failures, K8s Jobs/CronJobs for transcoding and cleanup, Dozzle for dev

**Final — full platform on K8s with observability**

## Skills & Tools
- `claude-mem` — context memory across sessions
- `vibesec-skill` — security best practices
- `ponytail` — optimize code and remove unnecessary parts
