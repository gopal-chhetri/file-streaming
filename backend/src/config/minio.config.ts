import { registerAs } from '@nestjs/config';

export default registerAs('minio', () => ({
  endpoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  publicEndpoint: process.env.MINIO_PUBLIC_ENDPOINT || 'localhost',
  publicPort: parseInt(process.env.MINIO_PUBLIC_PORT || '9000', 10),
  region: process.env.MINIO_REGION || 'us-east-1',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  useSSL: process.env.MINIO_USE_SSL === 'true',
}));
