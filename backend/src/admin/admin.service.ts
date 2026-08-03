import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import Redis from 'ioredis';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../users/entities/user.entity';
import { Video, VideoStatus } from '../videos/entities/video.entity';
import { AuditLog } from './entities/audit-log.entity';
import { DailyAnalytics } from '../analytics/schemas/daily-analytics.schema';
import { ModerateVideoDto } from './dto/moderate-video.dto';
import { KafkaService } from '../kafka/kafka.service';
import type { Request } from 'express';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly em: EntityManager,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    @InjectModel(DailyAnalytics.name)
    private readonly dailyAnalyticsModel: Model<DailyAnalytics>,
    private readonly kafka: KafkaService,
  ) {}

  async getStats() {
    const totalVideos = await this.em.count(Video, {});
    const totalUsers = await this.em.count(User, {});
    const pendingProcessing = await this.em.count(Video, {
      status: { $in: [VideoStatus.PENDING, VideoStatus.PROCESSING] },
    });

    const sizeResult = await this.em
      .getConnection()
      .execute(
        `SELECT COALESCE(SUM(size::bigint), 0) AS total_bytes FROM videos`,
      );
    const totalBytes = Number(sizeResult[0]?.total_bytes || 0);
    const storageUsedGb =
      Math.round((totalBytes / (1024 * 1024 * 1024)) * 100) / 100;

    let activeSessions = 0;
    try {
      activeSessions = await this.redis.scard('analytics:active-sessions');
    } catch {
      this.logger.warn('Redis unavailable for active sessions count');
    }

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .slice(0, 10);

    const views24h = await this.dailyAnalyticsModel.aggregate([
      { $match: { date: { $in: [today, yesterday] } } },
      { $group: { _id: null, total: { $sum: '$totalViews' } } },
    ]);

    return {
      totalVideos,
      totalUsers,
      storageUsedGb,
      activeSessions,
      pendingReview: pendingProcessing,
      totalViews24h: views24h[0]?.total || 0,
    };
  }

  async moderateVideo(
    id: string,
    dto: ModerateVideoDto,
    req: Request,
  ): Promise<Video> {
    const video = await this.em.findOne(Video, { id }, { populate: ['user'] });
    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const previousStatus = video.status;

    if (dto.action === 'approve' || dto.action === 'flag_pending') {
      video.status = VideoStatus.PENDING;
      await this.kafka.publishVideoUploaded({
        videoId: video.id,
        objectKey: video.filename,
        bucket: 'raw-uploads',
        filename: video.filename,
        mimeType: video.mimeType,
        size: String(video.size),
        userId: video.user.id,
      });
    } else if (dto.action === 'flag_banned') {
      video.status = VideoStatus.BANNED;
    } else {
      video.status = VideoStatus.FAILED;
    }

    const actorId = (req.user as { id: string }).id;
    const actorRef = this.em.getReference(User, actorId);

    const log = this.em.create(AuditLog, {
      action: `video.${dto.action}`,
      entityType: 'video',
      entityId: id,
      actor: actorRef,
      metadata: { reason: dto.reason || null, previousStatus },
      ip: req.ip,
    });

    this.em.persist(log);
    await this.em.flush();
    return video;
  }

  async getAuditLog() {
    return this.em.find(
      AuditLog,
      {},
      {
        populate: ['actor'],
        orderBy: { createdAt: 'DESC' },
        limit: 100,
      },
    );
  }
}
