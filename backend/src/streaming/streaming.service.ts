import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { Client as MinioClient } from 'minio';
import { MINIO_CLIENT } from '../minio/minio.constants';
import { Readable } from 'node:stream';

const PROCESSED_BUCKET = 'processed';

const MIME_TYPES: Record<string, string> = {
  m3u8: 'application/vnd.apple.mpegurl',
  ts: 'video/MP2T',
  mp4: 'video/mp4',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  key: 'application/octet-stream',
};

function mimeFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  return MIME_TYPES[ext] || 'application/octet-stream';
}

@Injectable()
export class StreamingService {
  private readonly logger = new Logger(StreamingService.name);

  constructor(@Inject(MINIO_CLIENT) private readonly minio: MinioClient) {}

  async getFile(
    videoId: string,
    filePath: string,
    range?: string,
  ): Promise<{
    stream: Readable;
    mimeType: string;
    size: number;
    start?: number;
    end?: number;
  }> {
    const objectPath = `${videoId}/${filePath}`;

    try {
      const stat = await this.minio.statObject(PROCESSED_BUCKET, objectPath);
      const size = stat.size;
      const mimeType = mimeFromPath(filePath);
      let stream: Readable;
      let start: number | undefined;
      let end: number | undefined;

      const result = range?.match(/bytes=(\d+)-(\d*)/);
      if (result) {
        start = parseInt(result[1], 10);
        end = result[2] ? parseInt(result[2], 10) : size - 1;
        if (start < size && start <= end) {
          end = Math.min(end, size - 1);
          stream = (await this.minio.getPartialObject(
            PROCESSED_BUCKET,
            objectPath,
            start,
            end - start + 1,
          )) as Readable;
        } else {
          start = undefined;
          end = undefined;
          stream = (await this.minio.getObject(
            PROCESSED_BUCKET,
            objectPath,
          )) as Readable;
        }
      } else {
        stream = (await this.minio.getObject(
          PROCESSED_BUCKET,
          objectPath,
        )) as Readable;
      }

      return { stream, mimeType, size, start, end };
    } catch (err) {
      if ((err as { code?: string }).code === 'NotFound') {
        throw new NotFoundException('File not found');
      }
      throw err;
    }
  }
}
