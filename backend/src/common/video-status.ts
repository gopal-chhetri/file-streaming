import type { EntityManager } from '@mikro-orm/core';
import type Redis from 'ioredis';
import { Video, VideoStatus } from '../videos/entities/video.entity';

/**
 * Cached video status lookups for hot paths (every HLS segment request and
 * every player heartbeat), so they don't each hit Postgres. Status changes
 * call invalidateVideoStatus(); the TTL bounds staleness otherwise.
 */
const TTL_SECONDS = 30;
const MISSING = 'missing';

const key = (videoId: string) => `video:status:${videoId}`;

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getVideoStatus(
  em: EntityManager,
  redis: Redis,
  videoId: string,
): Promise<VideoStatus | null> {
  if (!UUID_RE.test(videoId)) return null;

  try {
    const cached = await redis.get(key(videoId));
    if (cached) return cached === MISSING ? null : (cached as VideoStatus);
  } catch {
    // Redis down: fall through to the database.
  }

  const video = await em.fork().findOne(Video, { id: videoId }, { fields: ['status'] });
  const status = video?.status ?? null;
  try {
    await redis.set(key(videoId), status ?? MISSING, 'EX', TTL_SECONDS);
  } catch {
    /* cache is best-effort */
  }
  return status;
}

export async function isVideoPlayable(
  em: EntityManager,
  redis: Redis,
  videoId: string,
): Promise<boolean> {
  return (await getVideoStatus(em, redis, videoId)) === VideoStatus.ACTIVE;
}

export async function invalidateVideoStatus(redis: Redis, videoId: string): Promise<void> {
  try {
    await redis.del(key(videoId));
  } catch {
    /* entry expires within TTL_SECONDS anyway */
  }
}
