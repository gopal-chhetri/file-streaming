# Session Memory

## Current Phase
Phase 5: Streaming — complete

## Recently Completed
- Streaming module with controller + service (`backend/src/streaming/`)
  - `GET /api/streaming/:videoId/*` catch-all route proxies HLS files from MinIO `processed/` bucket
  - Correct MIME types for .m3u8 and .ts files
  - Range header support for video seeking
  - Cache-Control headers for CDN-friendly caching (1 year, immutable)
- `VideoResponseDto` — added computed `hlsUrl` field pointing to master playlist
- VideosService — `findAll()` and `findById()` now append computed `hlsUrl` based on video status
- Frontend mock data — all 10 mock videos now include `hlsUrl` pointing to streaming endpoint

## Files Created / Changed
- `backend/src/streaming/streaming.service.ts` — new
- `backend/src/streaming/streaming.controller.ts` — new
- `backend/src/streaming/streaming.module.ts` — rewritten from empty shell
- `backend/src/videos/dto/video-response.dto.ts` — added hlsUrl field
- `backend/src/videos/videos.service.ts` — added mapVideo() helper, findAll/findById return computed hlsUrl
- `frontend/src/lib/mock-data.ts` — added hlsUrl to all 10 mock videos

## Next
Phase 6: Watch History — `watch_history` table, upsert-on-session-end logic, resume playback on frontend

## Cross-check Notes
- ✅ Streaming module uses catch-all `*` route param for flexible path matching
- ✅ Range headers supported for seeking (.ts segments)
- ✅ Cache headers set to max-age=31536000, immutable (HLS segments are content-addressed by rendition)
- ✅ hlsUrl only included when status === 'ready'
- ✅ Frontend already had `hlsUrl` in Video type — no type changes needed
- ✅ No unit tests yet for streaming endpoints
