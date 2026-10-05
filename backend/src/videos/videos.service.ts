import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { extname } from 'node:path';
import { EntityManager, FilterQuery } from '@mikro-orm/core';
import { Client as MinioClient } from 'minio';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DailyAnalytics } from '../analytics/schemas/daily-analytics.schema';
import { Video, VideoStatus } from './entities/video.entity';
import { WatchHistory } from './entities/watch-history.entity';
import { WatchLater } from './entities/watch-later.entity';
import { User } from '../users/entities/user.entity';
import { AuditLog } from '../admin/entities/audit-log.entity';
import { InitiateUploadDto } from './dto/initiate-upload.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { ReportVideoDto } from './dto/report-video.dto';
import { UpdateVideoStatusDto } from './dto/update-video-status.dto';
import { CompleteMultipartDto } from './dto/complete-multipart.dto';
import { MINIO_CLIENT, MINIO_PRESIGN_CLIENT } from '../minio/minio.constants';
import { KafkaService } from '../kafka/kafka.service';
import Redis from 'ioredis';
import { invalidateVideoStatus } from '../common/video-status';

const RAW_UPLOADS_BUCKET = 'raw-uploads';
const PROCESSED_BUCKET = 'processed';
const THUMBNAILS_BUCKET = 'thumbnails';
const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100MB
const PART_SIZE = 10 * 1024 * 1024; // 10MB
/** Presigned upload URLs; an hour is plenty to start (and finish) an upload. */
const UPLOAD_URL_TTL_SECONDS = 60 * 60;

interface MultipartUploadClient {
  initiateNewMultipartUpload(
    bucket: string,
    objectName: string,
    options: Record<string, unknown>,
  ): Promise<string>;
}

/** The only uploader fields a video response exposes. */
export interface PublicUser {
  id: string;
  username: string;
}

export interface VideoResult {
  id: string;
  title: string;
  description?: string;
  filename: string;
  mimeType: string;
  size: string;
  status: VideoStatus;
  thumbnailUrl: string | null;
  failureReason: string | null;
  duration?: number;
  views: number;
  user: PublicUser;
  createdAt: Date;
  updatedAt: Date;
  hlsUrl?: string;
}

/** `<videoId>/source.<ext>`, with the extension reduced to a safe token. */
export function rawObjectKey(videoId: string, filename: string): string {
  const ext = extname(filename).slice(1).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
  return `${videoId}/source${ext ? `.${ext}` : ''}`;
}

export function assertOwner(video: Video, userId: string, action: string): void {
  if (video.user.id !== userId) {
    throw new ForbiddenException(`You can only ${action} your own videos`);
  }
}

@Injectable()
export class VideosService {
  constructor(
    private readonly em: EntityManager,
    @Inject(MINIO_CLIENT)
    private readonly minio: MinioClient,
    @Inject(MINIO_PRESIGN_CLIENT)
    private readonly presignMinio: MinioClient,
    private readonly kafka: KafkaService,
    @InjectModel(DailyAnalytics.name)
    private readonly dailyAnalyticsModel: Model<DailyAnalytics>,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async initiateUpload(
    userId: string,
    dto: InitiateUploadDto,
  ): Promise<{
    videoId: string;
    uploadUrl?: string;
    objectKey: string;
    multipart?: boolean;
    uploadId?: string;
    partSize?: number;
    totalParts?: number;
  }> {
    const userRef = this.em.getReference(User, userId);

    const video = this.em.create(Video, {
      title: dto.title,
      description: dto.description,
      filename: dto.filename,
      objectKey: '', // set below once the ID exists
      mimeType: dto.mimeType,
      size: String(dto.size),
      status: VideoStatus.PENDING,
      user: userRef,
    });

    // Keyed by video ID: client filenames collide between users and may
    // contain path segments.
    video.objectKey = rawObjectKey(video.id, dto.filename);
    const objectKey = video.objectKey;
    await this.em.flush();

    try {
      if (dto.size > MULTIPART_THRESHOLD) {
        const uploadId = await (
          this.minio as unknown as MultipartUploadClient
        ).initiateNewMultipartUpload(RAW_UPLOADS_BUCKET, objectKey, {});
        const totalParts = Math.ceil(dto.size / PART_SIZE);
        return {
          videoId: video.id,
          objectKey,
          multipart: true,
          uploadId,
          partSize: PART_SIZE,
          totalParts,
        };
      }

      const uploadUrl = await this.presignMinio.presignedPutObject(
        RAW_UPLOADS_BUCKET,
        objectKey,
        UPLOAD_URL_TTL_SECONDS,
      );

      return { videoId: video.id, uploadUrl, objectKey };
    } catch {
      this.em.remove(video);
      await this.em.flush();
      throw new InternalServerErrorException('Failed to generate upload URL');
    }
  }

  async getUploadPartUrl(
    videoId: string,
    userId: string,
    partNumber: number,
    uploadId: string,
  ): Promise<{ url: string }> {
    const video = await this.findUploadingVideo(videoId, userId);

    const url = await this.presignMinio.presignedUrl(
      'PUT',
      RAW_UPLOADS_BUCKET,
      video.objectKey,
      UPLOAD_URL_TTL_SECONDS,
      { partNumber: String(partNumber), uploadId },
    );
    return { url };
  }

  /**
   * The caller's own video, still in its upload phase. Upload endpoints must
   * not touch someone else's video, nor re-open one already transcoding,
   * live or banned (completing an upload re-queues transcoding).
   */
  private async findUploadingVideo(videoId: string, userId: string): Promise<Video> {
    const video = await this.em.findOne(Video, { id: videoId }, { populate: ['user'] });
    if (!video) throw new NotFoundException('Video not found');
    assertOwner(video, userId, 'upload to');
    if (video.status !== VideoStatus.PENDING) {
      throw new ConflictException('This video is no longer accepting uploads');
    }
    return video;
  }

  async completeUpload(videoId: string): Promise<VideoResult> {
    const video = await this.em.findOne(
      Video,
      { id: videoId },
      { populate: ['user'] },
    );
    if (!video) throw new NotFoundException('Video not found');

    video.status = VideoStatus.PENDING;
    await this.em.flush();

    await this.kafka.publishVideoUploaded({
      videoId: video.id,
      objectKey: video.objectKey,
      bucket: RAW_UPLOADS_BUCKET,
      filename: video.filename,
      mimeType: video.mimeType,
      size: String(video.size),
      userId: video.user.id,
    });

    return this.mapVideoWithViews(video);
  }

  async completeMultipartUpload(
    videoId: string,
    userId: string,
    dto: CompleteMultipartDto,
  ): Promise<VideoResult> {
    const video = await this.findUploadingVideo(videoId, userId);

    if (!dto.uploadId || !dto.parts) {
      return this.completeUpload(videoId);
    }

    try {
      const parts = dto.parts
        .map((p) => ({ part: p.partNumber, etag: p.etag }))
        .sort((a, b) => a.part - b.part);

      await this.minio.completeMultipartUpload(
        RAW_UPLOADS_BUCKET,
        video.objectKey,
        dto.uploadId,
        parts,
      );

      return this.completeUpload(videoId);
    } catch (err) {
      throw new InternalServerErrorException(
        `Failed to complete multipart upload: ${err}`,
      );
    }
  }

  async abortMultipartUpload(
    videoId: string,
    userId: string,
    uploadId: string,
  ): Promise<void> {
    const video = await this.findUploadingVideo(videoId, userId);

    try {
      await this.minio.removeObject(RAW_UPLOADS_BUCKET, video.objectKey);
    } catch {}
    try {
      await this.minio.abortMultipartUpload(
        RAW_UPLOADS_BUCKET,
        video.objectKey,
        uploadId,
      );
    } catch {}

    this.em.remove(video);
    await this.em.flush();
  }

  async removeVideo(videoId: string, userId: string): Promise<void> {
    const video = await this.em.findOne(
      Video,
      { id: videoId },
      { populate: ['user'] },
    );
    if (!video) throw new NotFoundException('Video not found');
    assertOwner(video, userId, 'delete');

    await this.em.nativeDelete(WatchHistory, { video: video.id });

    try {
      await this.minio.removeObject(RAW_UPLOADS_BUCKET, video.objectKey);
    } catch {}
    await this.removeObjectsByPrefix(PROCESSED_BUCKET, `${video.id}/`);
    await this.removeObjectsByPrefix(THUMBNAILS_BUCKET, `${video.id}/`);

    this.em.remove(video);
    await this.em.flush();
    await invalidateVideoStatus(this.redis, videoId);
  }

  private async listObjectKeys(
    bucket: string,
    prefix: string,
  ): Promise<string[]> {
    const keys: string[] = [];
    const stream = this.minio.listObjectsV2(bucket, prefix, true);
    for await (const item of stream) {
      keys.push(item.name);
    }
    return keys;
  }

  private async removeObjectsByPrefix(
    bucket: string,
    prefix: string,
  ): Promise<void> {
    const keys = await this.listObjectKeys(bucket, prefix);
    if (keys.length === 0) return;
    try {
      await this.minio.removeObjects(bucket, keys);
    } catch {}
  }

  private async getViewsMap(videoIds: string[]): Promise<Map<string, number>> {
    const ids = videoIds.filter(Boolean);
    if (ids.length === 0) return new Map();
    try {
      const docs = await this.dailyAnalyticsModel
        .aggregate<{ _id: string; views: number }>([
          { $match: { videoId: { $in: ids } } },
          { $group: { _id: '$videoId', views: { $sum: '$totalViews' } } },
        ])
        .exec();
      return new Map(docs.map((d) => [d._id, d.views]));
    } catch {
      return new Map();
    }
  }

  private async mapVideos(videos: Video[]): Promise<VideoResult[]> {
    const views = await this.getViewsMap(videos.map((v) => v.id));
    return videos.map((v) => this.mapVideo(v, views.get(v.id) ?? 0));
  }

  private async mapVideoWithViews(video: Video): Promise<VideoResult> {
    const views = await this.getViewsMap([video.id]);
    return this.mapVideo(video, views.get(video.id) ?? 0);
  }

  private mapVideo(video: Video, views = 0): VideoResult {
    // Built field by field: spreading the entity would serialize the full
    // uploader User (email, password hash) into public responses.
    return {
      id: video.id,
      title: video.title,
      description: video.description,
      filename: video.filename,
      mimeType: video.mimeType,
      status: video.status,
      duration: video.duration,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
      user: { id: video.user.id, username: video.user.username },
      size: String(video.size),
      hlsUrl:
        video.status === VideoStatus.ACTIVE
          ? `/api/streaming/${video.id}/master.m3u8`
          : undefined,
      thumbnailUrl: video.thumbnailUrl
        ? `/api/videos/${video.id}/thumbnail`
        : null,
      failureReason: video.failureReason ?? null,
      views,
    };
  }

  async findAll(status?: string, q?: string): Promise<VideoResult[]> {
    const where: FilterQuery<Video> = {};
    if (status) {
      where.status = status as VideoStatus;
    }
    if (q) {
      const pattern = `%${q}%`;
      where.$or = [
        { title: { $ilike: pattern } },
        { description: { $ilike: pattern } },
      ];
    }
    const videos = await this.em.find(Video, where, {
      populate: ['user'],
      orderBy: { createdAt: 'DESC' },
    });
    return this.mapVideos(videos);
  }

  async findByUser(userId: string): Promise<VideoResult[]> {
    const videos = await this.em.find(
      Video,
      { user: userId },
      {
        populate: ['user'],
        orderBy: { createdAt: 'DESC' },
      },
    );
    return this.mapVideos(videos);
  }

  async findById(id: string): Promise<VideoResult> {
    const video = await this.em.findOne(Video, { id }, { populate: ['user'] });
    if (!video) {
      throw new NotFoundException('Video not found');
    }
    return this.mapVideoWithViews(video);
  }

  async getThumbnailObjectKey(id: string): Promise<string | null> {
    const video = await this.em.findOne(Video, { id });
    if (!video) {
      throw new NotFoundException('Video not found');
    }
    return video.thumbnailUrl ?? null;
  }

  async upsertProgress(
    userId: string,
    videoId: string,
    progress: number,
  ): Promise<{ videoId: string; progress: number; watchedAt: Date }> {
    // A missing video would otherwise surface as a foreign-key 500.
    const video = await this.em.findOne(Video, { id: videoId }, { fields: ['id'] });
    if (!video) throw new NotFoundException('Video not found');

    // Atomic upsert: two first writes at once (e.g. two tabs) would otherwise
    // both insert and trip the (user, video) unique constraint.
    const watchedAt = new Date();
    await this.em.upsert(
      WatchHistory,
      {
        user: this.em.getReference(User, userId),
        video: this.em.getReference(Video, videoId),
        progress,
        watchedAt,
      },
      { onConflictFields: ['user', 'video'], onConflictMergeFields: ['progress', 'watchedAt'] },
    );
    const entry = { watchedAt };

    if (progress >= 100) {
      await this.em.nativeDelete(WatchLater, { user: userId, video: videoId });
    }

    return { videoId, progress, watchedAt: entry.watchedAt };
  }

  async getHistory(userId: string): Promise<
    {
      videoId: string;
      title: string;
      thumbnailUrl: string | null;
      channel: string | undefined;
      progress: number;
      watchedAt: Date;
    }[]
  > {
    const entries = await this.em.find(
      WatchHistory,
      { user: userId },
      { orderBy: { watchedAt: 'DESC' }, populate: ['video.user'] },
    );
    return entries.map((e) => ({
      videoId: e.video.id,
      title: e.video.title,
      thumbnailUrl: e.video.thumbnailUrl
        ? `/api/videos/${e.video.id}/thumbnail`
        : null,
      channel: e.video.user?.username,
      progress: e.progress,
      watchedAt: e.watchedAt,
    }));
  }

  async getProgress(
    userId: string,
    videoId: string,
  ): Promise<{ videoId: string; progress: number; watchedAt: Date } | null> {
    const entry = await this.em.findOne(WatchHistory, {
      user: userId,
      video: videoId,
    });
    if (!entry) return null;
    return { videoId, progress: entry.progress, watchedAt: entry.watchedAt };
  }

  async updateStatus(
    id: string,
    dto: UpdateVideoStatusDto,
  ): Promise<VideoResult> {
    const video = await this.em.findOne(Video, { id });
    if (!video) {
      throw new NotFoundException('Video not found');
    }

    video.status = dto.status;
    if (dto.status !== VideoStatus.FAILED) {
      video.failureReason = undefined;
    }
    if (dto.failureReason !== undefined) {
      video.failureReason = dto.failureReason;
    }
    if (dto.duration !== undefined) {
      video.duration = dto.duration;
    }
    if (dto.thumbnailUrl !== undefined) {
      video.thumbnailUrl = dto.thumbnailUrl;
    }

    await this.em.flush();
    await invalidateVideoStatus(this.redis, id);
    return this.mapVideoWithViews(
      await this.em.findOneOrFail(Video, { id }, { populate: ['user'] }),
    );
  }

  async updateVideo(
    id: string,
    userId: string,
    dto: UpdateVideoDto,
  ): Promise<VideoResult> {
    const video = await this.em.findOne(Video, { id }, { populate: ['user'] });
    if (!video) throw new NotFoundException('Video not found');
    assertOwner(video, userId, 'edit');

    if (dto.title !== undefined) {
      video.title = dto.title;
    }
    if (dto.description !== undefined) {
      video.description = dto.description;
    }

    await this.em.flush();
    return this.mapVideoWithViews(video);
  }

  async reportVideo(
    id: string,
    userId: string,
    dto: ReportVideoDto,
    ip?: string,
  ): Promise<VideoResult> {
    const video = await this.em.findOne(Video, { id }, { populate: ['user'] });
    if (!video) throw new NotFoundException('Video not found');

    // A report is only a signal for admins: changing the status here would
    // let any user take any video offline with one click.
    const previousStatus = video.status;

    const actorRef = this.em.getReference(User, userId);
    const log = this.em.create(AuditLog, {
      action: 'video.reported',
      entityType: 'video',
      entityId: id,
      actor: actorRef,
      metadata: { reason: dto.reason || null, previousStatus },
      ip,
    });
    this.em.persist(log);
    await this.em.flush();
    return this.mapVideoWithViews(video);
  }

  async addToWatchLater(userId: string, videoId: string): Promise<void> {
    const video = await this.em.findOne(Video, { id: videoId });
    if (!video) throw new NotFoundException('Video not found');

    const exists = await this.em.findOne(WatchLater, {
      user: userId,
      video: videoId,
    });
    if (exists) return;

    this.em.create(WatchLater, {
      user: this.em.getReference(User, userId),
      video: this.em.getReference(Video, videoId),
    });
    await this.em.flush();
  }

  async removeFromWatchLater(userId: string, videoId: string): Promise<void> {
    await this.em.nativeDelete(WatchLater, { user: userId, video: videoId });
  }

  async getWatchLater(userId: string): Promise<VideoResult[]> {
    const entries = await this.em.find(
      WatchLater,
      { user: userId },
      {
        populate: ['video.user'],
        orderBy: { createdAt: 'DESC' },
      },
    );
    return this.mapVideos(entries.map((e) => e.video));
  }
}
