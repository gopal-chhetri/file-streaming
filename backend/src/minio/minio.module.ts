import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';
import { MinioService } from './minio.service';
import { MINIO_CLIENT, MINIO_PRESIGN_CLIENT } from './minio.constants';

@Global()
@Module({
  providers: [
    {
      provide: MINIO_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const endpoint = configService.get<string>(
          'minio.endpoint',
          'localhost',
        );
        const port = configService.get<number>('minio.port', 9000);
        const accessKey = configService.get<string>(
          'minio.accessKey',
          'minioadmin',
        );
        const secretKey = configService.get<string>(
          'minio.secretKey',
          'minioadmin',
        );
        const useSSL = configService.get<boolean>('minio.useSSL', false);

        return new MinioClient({
          endPoint: endpoint,
          port,
          useSSL,
          accessKey,
          secretKey,
        });
      },
    },
    {
      provide: MINIO_PRESIGN_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const publicEndpoint = configService.get<string>(
          'minio.publicEndpoint',
          'localhost',
        );
        const publicPort = configService.get<number>('minio.publicPort', 9000);
        const region = configService.get<string>('minio.region', 'us-east-1');
        const accessKey = configService.get<string>(
          'minio.accessKey',
          'minioadmin',
        );
        const secretKey = configService.get<string>(
          'minio.secretKey',
          'minioadmin',
        );
        const useSSL = configService.get<boolean>('minio.useSSL', false);

        return new MinioClient({
          endPoint: publicEndpoint,
          port: publicPort,
          region,
          useSSL,
          accessKey,
          secretKey,
        });
      },
    },
    MinioService,
  ],
  exports: [MINIO_CLIENT, MINIO_PRESIGN_CLIENT],
})
export class MinioModule {}
