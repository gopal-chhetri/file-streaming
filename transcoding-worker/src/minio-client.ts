import { Client as MinioClient } from 'minio';
import { createWriteStream, createReadStream, mkdirSync, existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pipeline } from 'node:stream/promises';

export function createMinioClient(): MinioClient {
  return new MinioClient({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    useSSL: process.env.MINIO_USE_SSL === 'true',
  });
}

export async function downloadFile(
  minio: MinioClient,
  bucket: string,
  objectKey: string,
  destDir: string,
): Promise<string> {
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }

  // Only the last path segment: object keys must never decide where the file
  // lands, or a key containing "../" could write outside the work directory.
  const destPath = join(destDir, `input-${basename(objectKey) || 'source'}`);

  const stream = await minio.getObject(bucket, objectKey);
  const writeStream = createWriteStream(destPath);
  await pipeline(stream, writeStream);

  return destPath;
}

export async function uploadDirectory(
  minio: MinioClient,
  bucket: string,
  localDir: string,
  prefix: string,
): Promise<void> {
  const { readdirSync, statSync } = await import('node:fs');
  const { relative } = await import('node:path');

  function walk(dir: string): string[] {
    const entries = readdirSync(dir, { withFileTypes: true });
    return entries.flatMap((entry) => {
      const fullPath = join(dir, entry.name);
      return entry.isDirectory() ? walk(fullPath) : fullPath;
    });
  }

  const files = walk(localDir);
  for (const file of files) {
    const relPath = relative(localDir, file);
    const objectName = `${prefix}/${relPath}`;
    const stat = statSync(file);
    await minio.putObject(bucket, objectName, createReadStream(file), stat.size);
  }
}
