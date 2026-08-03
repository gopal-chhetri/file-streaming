import 'dotenv/config';
import { spawn } from 'node:child_process';
import { Kafka, Consumer } from 'kafkajs';
import type { Client as MinioClient } from 'minio';
import { createMinioClient, downloadFile, uploadDirectory } from './minio-client';
import { transcodeToHls } from './transcoder';
import { join } from 'node:path';
import { rmSync, existsSync, mkdirSync, createReadStream } from 'node:fs';
import { tmpdir } from 'node:os';

const TOPIC = 'video.uploaded';
const RAW_BUCKET = 'raw-uploads';
const PROCESSED_BUCKET = 'processed';
const THUMBNAILS_BUCKET = 'thumbnails';

const THUMBNAIL_SIZES = [
  { name: 'small', resolution: '320x180' },
  { name: 'medium', resolution: '640x360' },
  { name: 'large', resolution: '1280x720' },
];

const kafka = new Kafka({
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  clientId: process.env.KAFKA_CLIENT_ID || 'transcoding-worker',
});

const consumer: Consumer = kafka.consumer({
  groupId: process.env.KAFKA_GROUP_ID || 'transcoding-worker',
});

async function updateVideoStatus(
  videoId: string,
  status: string,
  duration?: number,
  thumbnailUrl?: string,
  failureReason?: string,
) {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  const token = process.env.WORKER_API_TOKEN || 'internal-worker-token';

  try {
    const res = await fetch(`${baseUrl}/api/videos/${videoId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': token,
      },
      body: JSON.stringify({
        status,
        duration,
        thumbnailUrl,
        failureReason,
      }),
    });
    if (!res.ok) {
      console.error(`Failed to update status for ${videoId}: ${res.status}`);
    }
  } catch (err) {
    console.error(`Error updating status for ${videoId}:`, err);
  }
}

function classifyFailure(err: unknown): string | undefined {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    /Invalid data found|does not contain any stream|Could not find codec|Error while opening decoder|not a valid|unsupported|moov atom|no stream/gi.test(
      msg,
    )
  ) {
    return 'INCOMPATIBLE_FILE';
  }
  return undefined;
}

async function extractThumbnails(
  minio: MinioClient,
  inputPath: string,
  videoId: string,
): Promise<string> {
  const thumbDir = join(tmpdir(), `thumbs-${videoId}`);
  mkdirSync(thumbDir, { recursive: true });

  for (const size of THUMBNAIL_SIZES) {
    const outputPath = join(thumbDir, `${size.name}.jpg`);
    let captured = false;
    let fileSize = 0;
    let lastError: unknown = null;
    for (const seek of ['5', '0']) {
      try {
        await new Promise<void>((resolve, reject) => {
          const proc = spawn('ffmpeg', [
            '-i', inputPath,
            '-ss', seek,
            '-vframes', '1',
            '-vf', `scale=${size.resolution}`,
            '-y',
            outputPath,
          ]);
          let stderr = '';
          proc.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
          proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`ffmpeg thumbnail exit code ${code}: ${stderr.slice(-200)}`));
          });
          proc.on('error', (err) => reject(err));
        });
        const stat = await import('node:fs').then((fs) => fs.promises.stat(outputPath));
        if (stat.size > 0) {
          captured = true;
          fileSize = stat.size;
          break;
        }
      } catch (err) {
        lastError = err;
        if (seek === '5') {
          console.log(`Thumbnail seek failed for ${videoId} (${size.name}), retrying from frame 0:`, (err as Error).message);
        }
      }
    }
    if (!captured) {
      const detail = lastError instanceof Error ? lastError.message : String(lastError);
      throw new Error(`ffmpeg thumbnail failed for ${videoId} (${size.name}): ${detail}`);
    }
    await minio.putObject(THUMBNAILS_BUCKET, `${videoId}/${size.name}.jpg`, createReadStream(outputPath), fileSize);
    console.log(`Thumbnail ${size.name} uploaded for ${videoId}`);
  }

  rmSync(thumbDir, { recursive: true });
  return `${videoId}/medium.jpg`;
}

async function processVideo(event: any) {
  const { videoId, objectKey, bucket, filename } = event;
  console.log(`Processing video ${videoId}: ${filename}`);

  const workDir = join(tmpdir(), `transcode-${videoId}`);
  if (existsSync(workDir)) {
    rmSync(workDir, { recursive: true });
  }

  const minio = createMinioClient();

  try {
    await updateVideoStatus(videoId, 'processing');

    const inputPath = await downloadFile(minio, bucket || RAW_BUCKET, objectKey, workDir);
    console.log(`Downloaded to ${inputPath}`);

    // Extract thumbnails first
    const thumbnailUrl = await extractThumbnails(minio, inputPath, videoId);
    await updateVideoStatus(videoId, 'processing', undefined, thumbnailUrl);
    console.log(`Thumbnails extracted and status updated for ${videoId}`);

    const result = await transcodeToHls(inputPath, videoId, join(workDir, 'output'));

    await uploadDirectory(minio, PROCESSED_BUCKET, result.outputDir, videoId);
    console.log(`Uploaded HLS for ${videoId}`);

    await updateVideoStatus(videoId, 'active', result.duration, thumbnailUrl);
    console.log(`Video ${videoId} transcoded successfully and marked active`);
  } catch (err) {
    console.error(`Transcoding failed for ${videoId}:`, err);
    await updateVideoStatus(videoId, 'failed', undefined, undefined, classifyFailure(err));
  } finally {
    if (existsSync(workDir)) {
      rmSync(workDir, { recursive: true });
    }
  }
}

async function main() {
  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC, fromBeginning: false });
  console.log(`Consumer subscribed to ${TOPIC}`);

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      try {
        const event = JSON.parse(message.value.toString());
        await processVideo(event);
      } catch (err) {
        console.error('Failed to process message:', err);
      }
    },
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
