import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { KafkaService, HeartbeatEvent } from '../kafka/kafka.service';
import { DailyAnalytics } from './schemas/daily-analytics.schema';
import { HeartbeatDto } from './dto/heartbeat.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly kafkaService: KafkaService,
    @InjectModel(DailyAnalytics.name)
    private readonly dailyAnalyticsModel: Model<DailyAnalytics>,
  ) {}

  async ingestHeartbeat(dto: HeartbeatDto): Promise<void> {
    const event: HeartbeatEvent = {
      ...dto,
      timestamp: new Date().toISOString(),
    };
    await this.kafkaService.publishHeartbeat(event);
  }

  async getRetention(videoId: string): Promise<{
    videoId: string;
    retentionCurve: { position: number; viewers: number; percentage: number }[];
    totalViews: number;
  }> {
    const docs = await this.dailyAnalyticsModel
      .find({ videoId })
      .sort({ date: -1 })
      .limit(30)
      .lean();

    const merged: Map<number, { viewers: number }> = new Map();
    let totalViews = 0;

    for (const doc of docs) {
      totalViews += doc.totalViews || 0;
      for (const point of doc.retentionCurve || []) {
        const existing = merged.get(point.position);
        if (existing) {
          existing.viewers += point.viewers;
        } else {
          merged.set(point.position, { viewers: point.viewers });
        }
      }
    }

    const retentionCurve = Array.from(merged.entries())
      .map(([position, { viewers }]) => ({
        position,
        viewers,
        percentage: totalViews > 0 ? Math.round((viewers / totalViews) * 100) : 0,
      }))
      .sort((a, b) => a.position - b.position);

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
