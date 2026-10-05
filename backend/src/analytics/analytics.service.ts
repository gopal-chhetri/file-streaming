import {
  Injectable,
  Logger,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import Redis from 'ioredis';
import { Video } from '../videos/entities/video.entity';
import { UserRole } from '../users/entities/enums';
import { isVideoPlayable } from '../common/video-status';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { KafkaService, HeartbeatEvent } from '../kafka/kafka.service';
import {
  DailyAnalytics,
  RETENTION_BUCKETS,
  retentionBucket,
} from './schemas/daily-analytics.schema';
import { HeartbeatDto } from './dto/heartbeat.dto';

type RetentionDoc = {
  retentionBuckets?: Record<string, number> | Map<string, number>;
  retentionCurve?: { percentage: number; viewers: number }[];
};

/** Sessions that ended in each 5% band, from the buckets plus any legacy points. */
export function computeEndedIn(docs: RetentionDoc[]): number[] {
  const endedIn = new Array<number>(RETENTION_BUCKETS).fill(0);
  for (const doc of docs) {
    const buckets =
      doc.retentionBuckets instanceof Map
        ? Object.fromEntries(doc.retentionBuckets)
        : (doc.retentionBuckets ?? {});
    for (const [key, count] of Object.entries(buckets)) {
      const b = Number(key.slice(1));
      if (Number.isInteger(b) && b >= 0 && b < RETENTION_BUCKETS) endedIn[b] += count;
    }
    for (const point of doc.retentionCurve ?? []) {
      endedIn[retentionBucket(point.percentage)] += point.viewers;
    }
  }
  return endedIn;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly kafkaService: KafkaService,
    @InjectModel(DailyAnalytics.name)
    private readonly dailyAnalyticsModel: Model<DailyAnalytics>,
    private readonly em: EntityManager,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  /**
   * Publish a player heartbeat. `userId` is the authenticated user (or
   * undefined); any userId in the request body is ignored. Heartbeats for
   * videos that don't exist or aren't live are dropped, so made-up IDs can't
   * create analytics documents.
   */
  async ingestHeartbeat(dto: HeartbeatDto, userId?: string): Promise<void> {
    if (!(await isVideoPlayable(this.em, this.redis, dto.videoId))) return;
    const event: HeartbeatEvent = {
      sessionId: dto.sessionId,
      videoId: dto.videoId,
      position: dto.position,
      duration: dto.duration,
      eventType: dto.eventType,
      userId,
      timestamp: new Date().toISOString(),
    };
    await this.kafkaService.publishHeartbeat(event);
  }

  async getRetention(videoId: string, requester: { id: string; role: string }): Promise<{
    videoId: string;
    retentionCurve: { position: number; viewers: number; percentage: number }[];
    totalViews: number;
  }> {
    const video = await this.em.findOne(Video, { id: videoId }, { populate: ['user'] });
    if (!video) throw new NotFoundException('Video not found');
    if (requester.role !== UserRole.ADMIN && video.user.id !== requester.id) {
      throw new ForbiddenException("You can only view your own videos' analytics");
    }

    const docs = await this.dailyAnalyticsModel
      .find({ videoId })
      .sort({ date: -1 })
      .limit(30)
      .lean();

    const totalViews = docs.reduce((sum, d) => sum + (d.totalViews || 0), 0);
    const endedIn = computeEndedIn(docs);

    // Viewers who reached each 5% mark = sessions that ended at or after it.
    const retentionCurve: { position: number; viewers: number; percentage: number }[] = [];
    let reached = 0;
    for (let b = RETENTION_BUCKETS - 1; b >= 0; b--) {
      reached += endedIn[b];
      retentionCurve.unshift({
        position: b * 5,
        viewers: reached,
        percentage: totalViews > 0 ? Math.min(100, Math.round((reached / totalViews) * 100)) : 0,
      });
    }

    return { videoId, retentionCurve, totalViews };
  }

  async getDashboardSummary(): Promise<{
    totalViews: number;
    uniqueViewers: number;
    completionRate: number;
    totalWatchTimeHours: number;
    videoCount: number;
  }> {
    const [aggregation] = await this.dailyAnalyticsModel
      .aggregate([
        {
          $group: {
            _id: null,
            totalViews: { $sum: '$totalViews' },
            totalUniqueViewers: { $sum: '$uniqueViewers' },
            totalCompletions: { $sum: '$completions' },
            totalWatchTimeSeconds: { $sum: '$totalWatchTimeSeconds' },
            videoCount: { $addToSet: '$videoId' },
          },
        },
      ])
      .exec();

    if (!aggregation) {
      return {
        totalViews: 0,
        uniqueViewers: 0,
        completionRate: 0,
        totalWatchTimeHours: 0,
        videoCount: 0,
      };
    }

    return {
      totalViews: aggregation.totalViews,
      uniqueViewers: aggregation.totalUniqueViewers,
      completionRate:
        aggregation.totalViews > 0
          ? Math.round(
              (aggregation.totalCompletions / aggregation.totalViews) * 100,
            )
          : 0,
      totalWatchTimeHours: Math.round(
        (aggregation.totalWatchTimeSeconds || 0) / 3600,
      ),
      videoCount: aggregation.videoCount?.length || 0,
    };
  }
}
