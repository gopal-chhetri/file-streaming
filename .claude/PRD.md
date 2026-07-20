# Product Requirements Document

## Vision
A self-hosted "mini YouTube / Udemy" platform: users upload video, it gets transcoded into adaptive HLS, streamed to viewers, tracked for engagement analytics, and managed through an admin dashboard.

## Target Users & Roles
- **Admin** — platform operators with full access: moderate content (approve/reject uploads), manage users, view aggregate analytics, system configuration.
- **Staff** — content creators/managers who upload videos, manage their own content, and view their own analytics.
- **User** — viewers who watch videos, maintain watch history, resume playback. Baseline role assigned on signup.

## Domain
`streaming.soylab.dpdns.org`

## Core Features
- Video upload via presigned MinIO URLs (large files go direct to object store, not through app server)
- Adaptive HLS transcoding (1080p, 720p, 480p) via ffmpeg in Kubernetes Jobs
- Adaptive bitrate streaming via hls.js
- User authentication with JWT access tokens + refresh token rotation and reuse detection
- Role-based access control (admin, staff, user) via Casbin RBAC
- Watch history with per-user resume-playback position
- Engagement analytics (watched ranges, retention curves, completion rates)
- Admin dashboard: pending uploads moderation, user management, analytics overview
- Edge CDN delivery via Cloudflare for HLS chunks
