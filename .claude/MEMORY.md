# Session Memory

## Current Phase
Phase 2: Auth — complete

## Recently Completed
- Feature-based module structure (auth, users, videos, streaming, analytics, admin, kafka, common)
- All 10 modules registered in AppModule
- `users/entities/` with `user.entity.ts`, `role.entity.ts`, `enums.ts` (admin, staff, user)
- Health endpoint with Postgres connectivity check
- Initial migration created and applied (roles + users tables)
- `@nestjs/config` + dev deps installed
- Build passes with 0 errors
- `deployments/local/` with compose.yml, Dockerfile, .env
- Passport-local and JWT authentication with RS256 signing (RSA key pair auto-generation for local dev)
- Opaque refresh tokens with rotation and family-based theft/reuse detection
- Login rate-limiting (max 5/min per IP + per username) via global RedisModule
- Swagger setup in main.ts (`/api/docs`) + `@ApiTags`/`@ApiOperation` on auth controller
- `swagger-ui-express` dependency added (was missing)

## Cross-check Notes
- ✅ All guards, strategies, entities, DTOs verified
- ✅ RS256 with auto-generated RSA key pair (falls back to env vars)
- ✅ Refresh token: opaque random (32 bytes hex), sha256 hash, family-based theft detection
- ✅ Rate limit: 5 attempts/min per IP + per username via Redis incr/expire
- ❌ No auth unit tests exist (only health controller spec). Create before Phase 3.

## Current File Being Worked On
(None — auth phase complete)

## Next
Phase 3: Uploads — MinIO integration, presigned upload URLs, videos table, basic CRUD

