import {
  Injectable,
  Inject,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { Client as MinioClient } from 'minio';
import { MINIO_CLIENT } from './minio.constants';

const RAW_UPLOADS_BUCKET = 'raw-uploads';
const PROCESSED_BUCKET = 'processed';

@Injectable()
export class MinioService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MinioService.name);

  constructor(@Inject(MINIO_CLIENT) private readonly minio: MinioClient) {}

  async onApplicationBootstrap() {
    await this.ensureBucket(RAW_UPLOADS_BUCKET);
    await this.ensureBucket(PROCESSED_BUCKET);
  }

  private async ensureBucket(bucket: string): Promise<void> {
    const exists = await this.minio.bucketExists(bucket);
    if (!exists) {
      await this.minio.makeBucket(bucket);
      this.logger.log(`Created MinIO bucket: ${bucket}`);
    }
  }
}
