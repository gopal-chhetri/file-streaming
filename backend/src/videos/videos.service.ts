import {
  Injectable,
  Inject,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Client as MinioClient } from 'minio';
import { Video, VideoStatus } from './entities/video.entity';
import { WatchHistory } from './entities/watch-history.entity';
import { User } from '../users/entities/user.entity';
import { InitiateUploadDto } from './dto/initiate-upload.dto';
import { UpdateVideoStatusDto } from './dto/update-video-status.dto';
import { MINIO_CLIENT } from '../minio/minio.constants';
import { KafkaService } from '../kafka/kafka.service';

const RAW_UPLOADS_BUCKET = 'raw-uploads';

@Injectable()
export class VideosService {
  constructor(
    private readonly em: EntityManager,
    @Inject(MINIO_CLIENT)
    private readonly minio: MinioClient,
    private readonly kafka: KafkaService,
  ) {}

  async initiateUpload(
    userId: string,
    dto: InitiateUploadDto,
  ): Promise<{ videoId: string; uploadUrl: string; objectKey: string }> {
    const objectKey = `${dto.filename}`;
    const userRef = this.em.getReference(User, userId);

    const video = this.em.create(Video, {
      title: dto.title,
      description: dto.description,
      filename: dto.filename,
      mimeType: dto.mimeType,
      size: String(dto.size),
      status: VideoStatus.PENDING_REVIEW,
      user: userRef,
    });

    await this.em.flush();

    try {
      const uploadUrl = await this.minio.presignedPutObject(
        RAW_UPLOADS_BUCKET,
        objectKey,
        24 * 60 * 60,
      );

      await this.kafka.publishVideoUploaded({
        videoId: video.id,
        objectKey,
        bucket: RAW_UPLOADS_BUCKET,
        filename: dto.filename,
        mimeType: dto.mimeType,
        size: String(dto.size),
        userId,
      });

      return { videoId: video.id, uploadUrl, objectKey };
    } catch {
      this.em.remove(video);
      await this.em.flush();
      throw new InternalServerErrorException('Failed to generate upload URL');
    }
  }

  private mapVideo(video: Video) {
    const obj = video as any;
    obj.hlsUrl =
      video.status === VideoStatus.READY
        ? `/api/streaming/${video.id}/master.m3u8`
        : undefined;
    return obj;
  }

  async findAll(): Promise<any[]> {
    const videos = await this.em.find(
      Video,
      {},
      {
        populate: ['user'],
        orderBy: { createdAt: 'DESC' },
      },
    );
    return videos.map((v) => this.mapVideo(v));
  }

  async findById(id: string): Promise<any> {
    const video = await this.em.findOne(Video, { id }, { populate: ['user'] });
    if (!video) {
      throw new NotFoundException('Video not found');
    }
    return this.mapVideo(video);
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

  async getHistory(
    userId: string,
  ): Promise<{ videoId: string; progress: number; watchedAt: Date }[]> {
    const entries = await this.em.find(
      WatchHistory,
      { user: userId },
      { orderBy: { watchedAt: 'DESC' }, populate: ['video'] },
    );
    return entries.map((e) => ({
      videoId: e.video.id,
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
  ): Promise<Video> {
    const video = await this.em.findOne(Video, { id });
    if (!video) {
      throw new NotFoundException('Video not found');
    }

    video.status = dto.status;
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
}
