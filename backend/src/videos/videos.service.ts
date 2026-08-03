import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { EntityManager, FilterQuery } from '@mikro-orm/core';
import { Client as MinioClient } from 'minio';
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

const RAW_UPLOADS_BUCKET = 'raw-uploads';
const PROCESSED_BUCKET = 'processed';
const THUMBNAILS_BUCKET = 'thumbnails';
const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100MB
const PART_SIZE = 10 * 1024 * 1024; // 10MB

interface MultipartUploadClient {
  initiateNewMultipartUpload(
    bucket: string,
    objectName: string,
    options: Record<string, unknown>,
  ): Promise<string>;
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
  user: User;
  createdAt: Date;
  updatedAt: Date;
  hlsUrl?: string;
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
    const objectKey = `${dto.filename}`;
    const userRef = this.em.getReference(User, userId);

    const video = this.em.create(Video, {
      title: dto.title,
      description: dto.description,
      filename: dto.filename,
      mimeType: dto.mimeType,
      size: String(dto.size),
      status: VideoStatus.PENDING,
      user: userRef,
    });

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
        24 * 60 * 60,
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
    partNumber: number,
    uploadId: string,
  ): Promise<{ url: string }> {
    const video = await this.em.findOne(Video, { id: videoId });
    if (!video) throw new NotFoundException('Video not found');

    const url = await this.presignMinio.presignedUrl(
      'PUT',
      RAW_UPLOADS_BUCKET,
      video.filename,
      24 * 60 * 60,
      { partNumber: String(partNumber), uploadId },
    );
    return { url };
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
      objectKey: video.filename,
      bucket: RAW_UPLOADS_BUCKET,
      filename: video.filename,
      mimeType: video.mimeType,
      size: String(video.size),
      userId: video.user.id,
    });

    return this.mapVideo(video);
  }

  async completeMultipartUpload(
    videoId: string,
    dto: CompleteMultipartDto,
  ): Promise<VideoResult> {
    const video = await this.em.findOne(Video, { id: videoId });
    if (!video) throw new NotFoundException('Video not found');

    if (!dto.uploadId || !dto.parts) {
      return this.completeUpload(videoId);
    }

    try {
      const parts = dto.parts
        .map((p) => ({ part: p.partNumber, etag: p.etag }))
        .sort((a, b) => a.part - b.part);

      await this.minio.completeMultipartUpload(
        RAW_UPLOADS_BUCKET,
        video.filename,
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

  async abortMultipartUpload(videoId: string, uploadId: string): Promise<void> {
    const video = await this.em.findOne(Video, { id: videoId });
    if (!video) throw new NotFoundException('Video not found');

    try {
      await this.minio.removeObject(RAW_UPLOADS_BUCKET, video.filename);
    } catch {}
    try {
      await this.minio.abortMultipartUpload(
        RAW_UPLOADS_BUCKET,
        video.filename,
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
    if (video.user.id !== userId) {
      throw new ForbiddenException('You can only delete your own videos');
    }

    await this.em.nativeDelete(WatchHistory, { video: video.id });

    try {
      await this.minio.removeObject(RAW_UPLOADS_BUCKET, video.filename);
    } catch {}
    await this.removeObjectsByPrefix(PROCESSED_BUCKET, `${video.id}/`);
    await this.removeObjectsByPrefix(THUMBNAILS_BUCKET, `${video.id}/`);

    this.em.remove(video);
    await this.em.flush();
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

  private mapVideo(video: Video): VideoResult {
    return {
      ...video,
      size: String(video.size),
      hlsUrl:
        video.status === VideoStatus.ACTIVE
          ? `/api/streaming/${video.id}/master.m3u8`
          : undefined,
      thumbnailUrl: video.thumbnailUrl
        ? `/api/videos/${video.id}/thumbnail`
        : null,
      failureReason: video.failureReason ?? null,
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
    return videos.map((v) => this.mapVideo(v));
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
    return videos.map((v) => this.mapVideo(v));
  }

  async findById(id: string): Promise<VideoResult> {
    const video = await this.em.findOne(Video, { id }, { populate: ['user'] });
    if (!video) {
      throw new NotFoundException('Video not found');
    }
    return this.mapVideo(video);
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
    const userRef = this.em.getReference(User, userId);
    const videoRef = this.em.getReference(Video, videoId);

    let entry = await this.em.findOne(WatchHistory, {
      user: userId,
      video: videoId,
    });

    if (entry) {
      entry.progress = progress;
      entry.watchedAt = new Date();
    } else {
      entry = this.em.create(WatchHistory, {
        user: userRef,
        video: videoRef,
        progress,
      });
      this.em.persist(entry);
    }

    await this.em.flush();
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
    return this.mapVideo(
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
    if (video.user.id !== userId) {
      throw new ForbiddenException('You can only edit your own videos');
    }

    if (dto.title !== undefined) {
      video.title = dto.title;
    }
    if (dto.description !== undefined) {
      video.description = dto.description;
    }

    await this.em.flush();
    return this.mapVideo(video);
  }

  async reportVideo(
    id: string,
    userId: string,
    dto: ReportVideoDto,
    ip?: string,
  ): Promise<VideoResult> {
    const video = await this.em.findOne(Video, { id }, { populate: ['user'] });
    if (!video) throw new NotFoundException('Video not found');

    const previousStatus = video.status;
    video.status = VideoStatus.PENDING_REVIEW;

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
    return this.mapVideo(video);
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
    return entries.map((e) => this.mapVideo(e.video));
  }
}
