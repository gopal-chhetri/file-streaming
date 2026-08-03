import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer, Admin } from 'kafkajs';
import Redis from 'ioredis';
import { InjectModel } from '@nestjs/mongoose';
import { Model, type UpdateQuery } from 'mongoose';
import { VIDEO_HEARTBEAT_TOPIC, HeartbeatEvent } from '../kafka/kafka.service';
import {
  DailyAnalytics,
  RetentionPoint,
} from './schemas/daily-analytics.schema';

const SESSION_TTL = 86400;
const SESSION_PREFIX = 'analytics:session:';
@Injectable()
export class AnalyticsAggregator
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(AnalyticsAggregator.name);
  private readonly consumer: Consumer;
  private readonly admin: Admin;
  private readonly kafka: Kafka;
  private running = false;

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly configService: ConfigService,
    @InjectModel(DailyAnalytics.name)
    private readonly dailyAnalyticsModel: Model<DailyAnalytics>,
  ) {
    const brokers = this.configService.get<string[]>('kafka.brokers', [
      'localhost:9092',
    ]);
    const clientId = this.configService.get<string>(
      'kafka.clientId',
      'file-streaming',
    );
    this.kafka = new Kafka({ brokers, clientId });
    this.consumer = this.kafka.consumer({
      groupId: 'analytics-aggregator',
    });
    this.admin = this.kafka.admin();
  }

  async onApplicationBootstrap() {
    try {
      await this.consumer.connect();
      await this.consumer.subscribe({
        topic: VIDEO_HEARTBEAT_TOPIC,
        fromBeginning: false,
      });
      this.running = true;
      this.logger.log('Analytics aggregator consumer connected');
      this.consume();
    } catch (err) {
      this.logger.warn(`Analytics aggregator cannot connect to Kafka: ${err}`);
    }
  }

  private async consume() {
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        try {
          const event: HeartbeatEvent = JSON.parse(message.value.toString());
          await this.processEvent(event);
        } catch (err) {
          this.logger.error(`Failed to process heartbeat: ${err}`);
        }
      },
    });
  }

  private async processEvent(event: HeartbeatEvent) {
    const sessionKey = `${SESSION_PREFIX}${event.sessionId}`;

    const pipeline = this.redis.pipeline();
    pipeline.hset(sessionKey, {
      videoId: event.videoId,
      userId: event.userId || '',
      lastPosition: String(event.position),
      lastEvent: event.eventType,
      lastUpdate: event.timestamp,
      duration: String(event.duration),
    });
    pipeline.expire(sessionKey, SESSION_TTL);

    if (event.userId) {
      const userKey = `${SESSION_PREFIX}user:${event.userId}`;
      pipeline.sadd(userKey, event.sessionId);
      pipeline.expire(userKey, SESSION_TTL);
    }

    const videoSetKey = `analytics:video:${event.videoId}:sessions`;
    pipeline.sadd(videoSetKey, event.sessionId);
    pipeline.expire(videoSetKey, SESSION_TTL);

    await pipeline.exec();

    if (event.eventType === 'end') {
      await this.flushSession(event);
    }
  }

  private async flushSession(event: HeartbeatEvent) {
    const date = event.timestamp.slice(0, 10);
    const retentionPoint: RetentionPoint = {
      position: Math.min(event.position, event.duration),
      viewers: 1,
      percentage:
        event.duration > 0
          ? Math.round(
              (Math.min(event.position, event.duration) / event.duration) * 100,
            )
          : 0,
    };

    const isCompletion =
      event.duration > 0 && event.position >= event.duration * 0.9;
    const watchTime = Math.min(event.position, event.duration);
    const userId = event.userId;

    const update: Record<string, unknown> = {
      $inc: {
        totalViews: 1,
        totalWatchTimeSeconds: Math.round(watchTime),
        ...(isCompletion ? { completions: 1 } : {}),
      },
      $push: { retentionCurve: retentionPoint },
    };

    if (userId) {
      const uniqueKey = `analytics:unique:${event.videoId}:${date}`;
      const added = await this.redis.sadd(uniqueKey, userId);
      await this.redis.expire(uniqueKey, SESSION_TTL * 2);
      if (added) {
        update.$inc = {
          ...(update.$inc as Record<string, number>),
          uniqueViewers: 1,
        };
      }
    }

    await this.dailyAnalyticsModel.updateOne(
      { videoId: event.videoId, date },
      update as UpdateQuery<DailyAnalytics>,
      { upsert: true },
    );
  }

  async onApplicationShutdown() {
    this.running = false;
    try {
      await this.consumer.disconnect();
    } catch {
      /* ignore */
    }
  }
}
