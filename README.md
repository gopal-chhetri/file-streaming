# Self-Hosted Video Streaming Platform — Overview

A "mini YouTube / Udemy" style platform: users upload video, it gets transcoded into adaptive HLS, streamed to viewers, tracked for engagement analytics, and managed through an admin dashboard. Built with NestJS, Kafka, Redis, PostgreSQL, MongoDB, MinIO, and Kubernetes.

**Domain:** `https://streaming.soylab.dpdns.org`

**Core flows:**
- **Upload:** Instructor → presigned URL → MinIO `raw-uploads/` → Kafka → ffmpeg transcode → HLS → MinIO `processed/`
- **Stream:** Viewer → Cloudflare → Traefik → NestJS → presigned manifest → hls.js playback
- **Analytics:** Player heartbeats (10s) → Kafka → Redis (live ranges) → MongoDB (daily rollups) → Dashboard API

**10 build phases** — see `.claude/PHASES.md` for the checklist.

See `.claude/` for full specifications by category:
- `.claude/PRD.md` — product requirements, features, user roles
- `.claude/ARCHITECTURE.md` — tech stack, data flow, deployment
- `.claude/DESIGN.md` — UI/UX design references
- `.claude/PHASES.md` — build phases with checkboxes
- `.claude/RULES.md` — coding conventions and constraints
- `.claude/MEMORY.md` — session progress tracking
