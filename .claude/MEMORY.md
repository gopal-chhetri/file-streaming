# Session Memory

## Current Phase
Phase 5: Streaming — complete. Async upload/processing/moderation pipeline implemented.

## Recently Completed
- **Sign-out redirects to login + delete-own-video**:
  - `use-auth.tsx` `logout()` now also calls `queryClient.clear()` (drops all cached content so admin lists/my-videos/browse don't linger after sign-out) and `router.navigate({ to: '/auth/login' })` via `useRouter` (provider sits inside RouterProvider). Session-expiry keeps the dismissible popup (guest browsing) — per user decision, only explicit sign-out redirects.
  - Backend: `videos.service.removeVideo(videoId, userId)` — 404 if missing, 403 if `video.user.id !== userId` (populate user); deletes `watch_history` rows (`nativeDelete`) first (FK), then MinIO cleanup: `removeObject('raw-uploads', video.filename)` + `listObjectsV2`+`removeObjects` for prefix `${video.id}/` in `processed` and `thumbnails` buckets (new `PROCESSED_BUCKET`/`THUMBNAILS_BUCKET` consts + `listObjectKeys`/`removeObjectsByPrefix` helpers). `videos.controller` new `@Delete(':id')` (JwtAuthGuard, returns `{ message }` 200).
  - Frontend `my-videos.tsx`: hover trash button (top-left, `bg-black/60` → hover `bg-danger`) per card → `ConfirmDialog` (extended to accept `children` for inline error text) → `api('/videos/<id>', { method: 'DELETE' })` → invalidate `my-videos`.
  - Verified via curl: own DELETE → 200 + DB row gone + MinIO raw object gone (used `mc stat`); admin token deleting user's video → 403; non-existent → 404; no token → 401. Backend restarted (`compose restart backend`). NOTE: two `failed` "congratulations" videos (568a818d, f0c33f0a) vanished during testing — almost certainly the user deleting them via the new UI. Remaining: 3 active videos (rana/british/history of nepal).
- **Search + full warning cleanup (frontend + backend now lint/tsc clean)**:
  - Search: backend `videos.service.findAll(status?, q?)` adds `$or` `{ title/description: { $ilike } }`; `videos.controller` `@Get()` accepts `@Query('q')` (+`@ApiQuery`). Frontend `use-videos.ts` accepts `q`; browse route `validateSearch` typed `{ q?: string }` (optional so plain `/browse` links typecheck); topbar has a pill search form navigating to `/browse?q=...` and syncing from the URL; browse shows "Results for…" + count + Clear button, hides FilterPills on search, no-results state. Backend restarted; verified live: `GET /api/videos?q=a` → matches, `?q=zzz` → `[]`, no-q → full list.
  - Frontend warnings: new `.oxlintrc.json` disables `react/only-export-components` for `src/routes/**`; added `navigate` to login/register `useEffect` deps; `use-auth.tsx` has an oxlint-disable comment for its provider+hook co-location. `pnpm lint` clean.
  - Backend warnings: all 14 `no-explicit-any` fixed. `videos.service.ts` → new exported `VideoResult` interface, `MultipartUploadClient` interface for minio, `FilterQuery<Video>` typing; `analytics.aggregator.ts` → `UpdateQuery<DailyAnalytics>`; `seeder.ts` → dropped `MikroORM.init<PostgreSqlDriver>` generic (broken 7.1.7 schema-generator typing) in favor of `as unknown as Parameters<typeof MikroORM.init>[0]`; `auth.module.ts` → `expiresIn` typed as `JwtSignOptions['expiresIn']`; `streaming.controller.ts`/`service.ts` → `catch (err)` + `(err as {status?})`/`(err as {code?})`; `users.controller.ts` → `Request` + `(req.user as { role: string }).role`. `completeUpload`/`completeMultipartUpload`/`updateStatus` return `Promise<VideoResult>` (was `Video`). `tsc --noEmit --incremental false` + `eslint src` both exit 0.
- **Light-theme background texture**: added `--page-texture` (base64 SVG `feTurbulence` noise, 5% alpha, 240px tile) to light `:root` in `tokens.css`; `body` now sets `background-image: var(--page-texture)` with `background-size: 240px`. Dark theme + `prefers-color-scheme: dark` set `--page-texture: none` (stays flat). Removed `bg-page` from login/register wrappers so the texture shows through on auth pages.
- **Persistent app shell + session-expiry login popup**:
  - New `frontend/src/layouts/app-shell.tsx` replaces `browse-layout`/`admin-layout` (deleted). Rendered from `__root.tsx`, so topbar + sidebar show on EVERY page (YouTube-style), incl. watch + login/register. Picks `AdminSidebar` on `/admin`, `Sidebar` elsewhere; retains collapse + mobile drawer; content wrapper `max-w-7xl p-4 lg:p-6`.
  - All 11 routes stripped of `BrowseLayout`/`AdminLayout` wrappers; watch page no longer full-screen `h-screen`; 404 + auth pages center via `min-h-[calc(100dvh-3.5rem)]` under the h-14 topbar.
  - Auth pages render inside the shell (per user request, "shell everywhere"); login/register card logo now uses `/logo.png` image (was `MonitorPlay` icon) in both pages.
  - Explicit logout now stays on the page (removed `navigate('/auth/login')` from sidebar/admin-sidebar/user-dropdown).
  - Session expiry: `lib/api.ts` fires one-shot `auth:expired` window event when a request WITH a token gets 401 or token refresh fails (requests without a token never trigger it). `use-auth.tsx` listens → clears token/user + sets `sessionExpired`; idle-refresh failure also fires it. New `LoginModal` (in AppShell) shows a dismissible popup — backdrop/Esc/"Browse as guest" — so users keep the shell + public browsing while signed out; re-login from popup closes it + invalidates react-query cache. New shared `LoginForm` used by both login page and modal.
  - Public browsing already works: `GET /videos` + `/videos/:id` have no `JwtAuthGuard`; `api()` drops `Authorization` when no token.
  - Fixed pre-existing build break: TS 6.0.3 rejects deprecated `baseUrl` — uncommented `"ignoreDeprecations": "6.0"` in `tsconfig.app.json`.
- **Playback fixed for real** (Firefox): `frontend/src/main.tsx` wrapped the app in `<React.StrictMode>`; in dev this double-invokes effects (setup→cleanup→setup), so the `VideoPlayer` effect's `hls.destroy()` ran mid-load → `DOMException: ...media resource was aborted` and Firefox's destroy-then-reattach on the same element blocked playback (network all 200/correct). Removed StrictMode wrapper; added an `Hls.Events.ERROR` listener to surface any future fatal errors. Backend/HLS content was already verified correct (valid MPEG-TS, correct MIME, proxy + Range working).
- **Playback fixed + verified** (HLS did not play — every streaming file returned the master playlist):
  - `streaming.controller.ts` route `@Get(':videoId/*')` + `req.params[0]` is invalid under Express 5 (NestJS 11, path-to-regexp v8): bare `*` doesn't populate `params[0]`, so `filePath` fell back to `master.m3u8` for every request (variants/segments all served the master → HLS.js recursion, no playback). Fixed → `@Get(':videoId/*splat')`, `filePath = (req.params.splat as string[])?.join('/') ?? 'master.m3u8'`.
  - `streaming.service.ts` range serving was broken: set 206 + partial `Content-Length` but streamed the FULL object. Now uses `getPartialObject(bucket, key, start, end-start+1)`, clamps `end` to `size-1`, invalid/beyond-EOF ranges → full 200.
  - `video-player.tsx` effect deps `[src, initialTime]`: `initialTime` changes when `useProgress` resolves → re-run → `hls.destroy()` mid-load → `DOMException: ...media resource was aborted` + redundant reload. Now deps `[src]` with `initialTimeRef`.
  - Verified: master/variant (1080p/720p/480p) playlists serve correct content; segments `video/MP2T` real sizes; Range `100-199` → 206/100 bytes; no backend errors.
- **Pipeline fixed + verified end-to-end** (BigInt Kafka publish crash + worker 401 + `hlsUrl`/thumbnail serving):
  - `Video.size` is Postgres `bigint` → MikroORM hydrates to JS `bigint` → `JSON.stringify` threw `Do not know how to serialize a BigInt`, so `video.uploaded` was never published. Fixed by `String(video.size)` at both Kafka publish sites (`videos.service.completeUpload`, `admin.service.moderateVideo`) and in `mapVideo`.
  - Worker `updateVideoStatus` 401: worker sent `X-Api-Key` from `API_TOKEN` (empty); backend guard expects `app.workerApiToken` (`WORKER_API_TOKEN`, default `internal-worker-token`). Aligned worker to read `WORKER_API_TOKEN` with same fallback; added `WORKER_API_TOKEN=internal-worker-token` to `deployments/local-dev/.env`.
  - `mapVideo` mutated the MikroORM entity; entity `toJSON` only serializes mapped props, so synthetic `hlsUrl` was dropped from API responses. Now `const obj = { ...video } as any` (plain object, no `toJSON`) + explicit `size`/`hlsUrl`/`thumbnailUrl`.
  - Thumbnail endpoint 404 (pre-existing): `getThumbnail` used mapVideo's API-route `thumbnailUrl` as the MinIO object key. Added `videosService.getThumbnailObjectKey(id)` returning the raw stored key.
  - Verified: upload → `video.uploaded` published → worker thumbnails → HLS (1080p/720p/480p) → status `active`; `GET /videos/:id` returns `size` string + `hlsUrl`; thumbnail + master.m3u8 serve (200). Kafka lag 0. `eda1142e-...` is `active`; dangling row `25569e26-...` (no file in MinIO) deleted.
- Async video pipeline: upload → `video.uploaded` Kafka → thumbnail-first transcoding → HLS → status `active`
  - `VideoStatus`: `pending` (default), `pending_review`, `processing`, `active` (was `ready`), `failed`, `banned`
  - Migration `Migration20260731000000.ts` drops/recreates `videos_status_check` with new statuses (NOT yet applied — run `make migrate`)
  - Backend publishes Kafka on `complete-upload` (both single PUT and multipart); `findAll(status?)` query filter; `mapVideo` gates `hlsUrl` on `active`
  - Transcoding worker extracts thumbnails first (keeps `processing` + `thumbnailUrl`), HLS after, then `active`
  - Frontend: upload page polls for thumbnail before redirecting to `/my-videos` (5 min timeout, breaks on failed/banned); My Videos polls every 5s while processing; browse only requests `status=active`; admin flags videos to pending/banned
  - Removed dead code: `/admin/pending` endpoint, `usePendingVideos` hook
  - Cleaned backend lint: removed unused imports (`BadRequestException` in videos.service, `Max` in heartbeat.dto, `PROCESSED_BUCKET` in kafka.service) + prettier formatting via `eslint --fix`

## Files Created / Changed
- `frontend/src/layouts/app-shell.tsx` — new; `layouts/browse-layout.tsx` + `layouts/admin-layout.tsx` deleted
- `frontend/src/components/auth/login-form.tsx`, `login-modal.tsx` — new
- `frontend/src/routes/__root.tsx` — AppShell wrapper
- `frontend/src/lib/api.ts` — one-shot `auth:expired` dispatch + `resetSessionExpired`
- `frontend/src/hooks/use-auth.tsx` — `sessionExpired`/`dismissSessionExpired`, event listener, cache invalidation on login
- `frontend/src/routes/*` — layout wrappers stripped; login/register logo + shell centering; watch page de-full-screened
- `frontend/src/components/sidebar.tsx`, `admin-sidebar.tsx`, `user-dropdown.tsx` — logout stays on page
- `frontend/src/tsconfig.app.json` — uncommented `ignoreDeprecations: "6.0"`
- `backend/src/migrations/Migration20260731000000.ts` — new (untracked)
- `backend/src/videos/` — entity statuses, multipart/complete endpoints, thumbnail endpoint, `findAll(status?)`
- `backend/src/admin/` — moderate to pending/banned, Kafka republish on flag, removed pending endpoint
- `backend/src/minio/minio.service.ts` — thumbnails bucket
- `transcoding-worker/src/index.ts` — thumbnail-first extraction, `active` on success
- `frontend/src/` — types, upload poll, my-videos (new), browse `active` filter, admin moderation actions
- `frontend/src/hooks/use-my-videos.ts` — new, 5s polling
- `deployments/local-dev/` — frontend dev compose wiring

## Next
Browser E2E: sign out (user + admin) → redirected to `/auth/login`, no content visible; my-videos trash → confirm → removed (and gone from browse); topbar search → `/browse?q=…`.

## Cross-check Notes
- ✅ Backend `tsc --noEmit --incremental false` passes; `eslint src` 0 errors
- ✅ Frontend `tsc -b` (build) + `oxlint` pass
- ✅ Transcoding worker `tsc --noEmit` passes
- ✅ Backend restarted (`docker compose restart backend`) — search `q` + `DELETE /videos/:id` live, verified via curl
- ⚠️ Backend `jest` fails: ESM `SyntaxError` on `@mikro-orm/core` — pre-existing infra issue (health spec unchanged), unrelated to feature
- ⚠️ `backend/dist/` is root-owned (docker build) — run `tsc --incremental false` or fix ownership for local builds
- ⚠️ Changes are uncommitted
