# Aurora: Self-Hosted Video Streaming Platform

A "mini YouTube / Udemy" style platform: users upload video, it gets transcoded into adaptive HLS, streamed to viewers, tracked for engagement analytics, and managed through an admin dashboard. Built with NestJS, Kafka, Redis, PostgreSQL, MongoDB, MinIO, and ffmpeg.

Named after the **aurora borealis**: the UI is a glowing night sky, with a spectral indigo → cyan → violet palette sweeping across deep-space surfaces.

**Domain:** `https://streaming.soylab.dpdns.org`

## Core Flows

### 1. Video Upload & Transcoding Flow
```mermaid
sequenceDiagram
    actor Inst as Instructor
    participant API as NestJS API
    participant Storage as MinIO (S3)
    participant Kafka as Kafka Broker
    participant Worker as FFmpeg Worker

    Inst->>API: GET /videos/presigned-url (request upload)
    API-->>Inst: Return presigned upload URL & target S3 key
    Inst->>Storage: PUT raw video data (direct upload)
    Storage-->>Inst: 200 OK (upload complete)
    Inst->>API: POST /videos (confirm upload & metadata)
    API->>Kafka: Publish "video.uploaded" event (UUID, format details)
    API-->>Inst: 201 Created (processing started)
    
    Kafka->>Worker: Consume "video.uploaded"
    activate Worker
    Worker->>Storage: Download raw video file
    Worker->>Worker: Run ffmpeg (extract thumbnails, transcode to 480p/720p/1080p HLS)
    Worker->>Storage: Upload transcoded HLS stream (.m3u8, .ts files)
    Worker->>API: POST /videos/:id/status (mark as completed/ready)
    deactivate Worker
```

### 2. Stream & Analytics Flow
```mermaid
sequenceDiagram
    actor Viewer
    participant Browser as Web Player (hls.js)
    participant API as NestJS API
    participant Kafka as Kafka Broker
    participant Redis as Redis Cache
    participant MongoDB as MongoDB (Analytics Rollups)

    loop Every 10 seconds
        Browser->>API: POST /analytics/heartbeat (video_id, user_id, current_range)
    end
    API->>Kafka: Publish "engagement.heartbeat" message
    
    Note over Kafka, Redis: Background processing of raw heartbeats
    Kafka->>Redis: Record active viewers / range updates (immediate/realtime cache)
    
    loop Daily Rollup Cron
        MongoDB->>Redis: Extract cached active user sessions / heartbeats
        MongoDB->>MongoDB: Rollup stats by video, day, and country
        MongoDB-->>API: Provide query interface for Admin Dashboard
    end
```

## Features

- **Auth:** JWT access tokens with refresh-token rotation and reuse detection; RBAC via Casbin (`admin`, `staff`, `user`)
- **Uploads:** presigned MinIO URLs so large files go straight to object storage, never through the app server
- **Transcoding:** Kafka-decoupled ffmpeg worker producing adaptive HLS (1080p / 720p / 480p) with thumbnails extracted first
- **Streaming:** hls.js playback with `Range` support proxied from MinIO
- **Watch history:** per-user resume playback, progress tracking
- **Watch later:** save videos, auto-remove once fully watched
- **Analytics:** view counts, engagement heartbeats → daily rollups in MongoDB
- **Admin dashboard:** upload moderation (approve / ban), user management
- **Search:** title / description lookup on the browse page

## Tech Stack

| Layer | Technology |
|---|---|
| API | NestJS (TypeScript) |
| Relational | PostgreSQL via MikroORM v7 |
| Documents | MongoDB (analytics rollups) |
| Cache / state | Redis |
| Messaging | Kafka |
| Object storage | MinIO (S3-compatible) |
| Transcoding | ffmpeg (worker service) |
| Frontend | React 19, Vite, TanStack, Tailwind CSS 4, hls.js |
| Proxy / TLS | Traefik |

## Repository Layout

```
file-streaming/
├── backend/               ← NestJS API (auth, videos, streaming, analytics, admin)
├── frontend/              ← React + Vite app
├── transcoding-worker/    ← Kafka consumer + ffmpeg HLS transcoder
├── deployments/
│   └── local-dev/         ← Docker Compose for local development
└── Makefile               ← convenience commands
```

## Local Development

```bash
make setup      # copy .env + build images
make domains    # add *.soylab.local to /etc/hosts
make up         # start the full stack
make migrate    # run pending DB migrations
make seed       # seed demo data
make down       # stop everything
```

The stack runs on Docker Compose with Traefik routing: `streaming.soylab.local` (app), `streamingapi.soylab.local` (API), plus MinIO / Kafka UI / Redis Commander / mongo-express consoles.

## Status

Stage 1 (Docker Compose) running; production deploy + Kubernetes/observability stage planned (Phase 9-10).
