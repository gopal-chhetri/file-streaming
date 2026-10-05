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
  // Transcodes take minutes; we heartbeat while working (see processVideo),
  // and the session timeout leaves room for slow heartbeats.
  sessionTimeout: 90_000,
  heartbeatInterval: 3_000,
});

// Read at call time, not import time, so configuration (and tests) can set them.
const apiBaseUrl = () => process.env.API_BASE_URL || 'http://localhost:3000';
const workerApiToken = () => process.env.WORKER_API_TOKEN;

const STATUS_RETRIES = 5;
/** Must match the API's MAX_UPLOAD_BYTES (default 5 GB). */
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 5 * 1024 ** 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Report status to the API, retrying with backoff. Returns false if the API
 * stayed unreachable, so the caller can decide whether to redo the job.
 */
export async function updateVideoStatus(
  videoId: string,
  status: string,
  duration?: number,
  thumbnailUrl?: string,
  failureReason?: string,
  retries = STATUS_RETRIES,
  baseDelayMs = 1000,
): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${apiBaseUrl()}/api/videos/${videoId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': workerApiToken() ?? '',
        },
        body: JSON.stringify({ status, duration, thumbnailUrl, failureReason }),
      });
      if (res.ok) return true;
      // 4xx (bad token, unknown video) won't fix itself; don't retry.
      if (res.status >= 400 && res.status < 500) {
        console.error(`Status update for ${videoId} rejected: ${res.status}`);
        return false;
      }
      console.error(`Status update for ${videoId} failed: ${res.status} (attempt ${attempt}/${retries})`);
    } catch (err) {
      console.error(`Status update for ${videoId} errored (attempt ${attempt}/${retries}):`, err);
    }
    if (attempt < retries) await sleep(baseDelayMs * 2 ** (attempt - 1));
  }
  return false;
}

/** Current status from the public video endpoint, or null if unknown. */
async function currentStatus(videoId: string): Promise<string | null> {
  try {
    const res = await fetch(`${apiBaseUrl()}/api/videos/${videoId}`);
    if (!res.ok) return null;
    return ((await res.json()) as { status?: string }).status ?? null;
  } catch {
    return null;
  }
}

function classifyFailure(err: unknown): string | undefined {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    /Invalid data found|does not contain any (video )?stream|Could not find codec|Error while opening decoder|not a valid|unsupported|moov atom|no stream/i.test(
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

async function processVideo(event: any, heartbeat: () => Promise<void>) {
  const { videoId, objectKey, bucket, filename } = event;

  // Redelivered or duplicate events (e.g. after a rebalance) must not redo a
  // finished transcode or resurrect a banned video.
  const status = await currentStatus(videoId);
  if (status === 'active' || status === 'banned') {
    console.log(`Skipping video ${videoId}: already ${status}`);
    return;
  }
  console.log(`Processing video ${videoId}: ${filename}`);

  // Keep the Kafka session alive during the long-running transcode.
  const beat = setInterval(() => {
    heartbeat().catch((err) => console.warn(`Kafka heartbeat failed for ${videoId}:`, err));
  }, 10_000);

  const workDir = join(tmpdir(), `transcode-${videoId}`);
  if (existsSync(workDir)) {
    rmSync(workDir, { recursive: true });
  }

  const minio = createMinioClient();

  try {
    await updateVideoStatus(videoId, 'processing');

    // Presigned uploads can't enforce a size limit, so check the real file.
    const stat = await minio.statObject(bucket || RAW_BUCKET, objectKey);
    if (stat.size > MAX_UPLOAD_BYTES) {
      await minio.removeObject(bucket || RAW_BUCKET, objectKey).catch(() => undefined);
      await updateVideoStatus(videoId, 'failed', undefined, undefined, 'FILE_TOO_LARGE');
      console.warn(`Rejected ${videoId}: ${stat.size} bytes exceeds ${MAX_UPLOAD_BYTES}`);
      return;
    }

    const inputPath = await downloadFile(minio, bucket || RAW_BUCKET, objectKey, workDir);
    console.log(`Downloaded to ${inputPath}`);

    // Extract thumbnails first
    const thumbnailUrl = await extractThumbnails(minio, inputPath, videoId);
    await updateVideoStatus(videoId, 'processing', undefined, thumbnailUrl);
    console.log(`Thumbnails extracted and status updated for ${videoId}`);

    const result = await transcodeToHls(inputPath, videoId, join(workDir, 'output'));

    await uploadDirectory(minio, PROCESSED_BUCKET, result.outputDir, videoId);
    console.log(`Uploaded HLS for ${videoId}`);

    if (!(await updateVideoStatus(videoId, 'active', result.duration, thumbnailUrl))) {
      // The work is done but the API never heard. Throwing leaves the offset
      // uncommitted, so Kafka redelivers and the job is retried instead of the
      // video staying "processing" forever.
      throw new StatusUpdateError(`Could not mark ${videoId} active`);
    }
    console.log(`Video ${videoId} transcoded successfully and marked active`);
  } catch (err) {
    if (err instanceof StatusUpdateError) throw err;
    console.error(`Transcoding failed for ${videoId}:`, err);
    await updateVideoStatus(videoId, 'failed', undefined, undefined, classifyFailure(err));
  } finally {
    clearInterval(beat);
    if (existsSync(workDir)) {
      rmSync(workDir, { recursive: true });
    }
  }
}

class StatusUpdateError extends Error {}

async function main() {
  if (!workerApiToken()) {
    // The API rejects status callbacks without the shared token, so running
    // without it would transcode videos that never go live.
    console.error('WORKER_API_TOKEN is not set; refusing to start.');
    process.exit(1);
  }
  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC, fromBeginning: false });
  console.log(`Consumer subscribed to ${TOPIC}`);

  await consumer.run({
    eachMessage: async ({ message, heartbeat }) => {
      if (!message.value) return;
      let event: unknown;
      try {
        event = JSON.parse(message.value.toString());
      } catch (err) {
        console.error('Skipping malformed message:', err);
        return;
      }
      try {
        await processVideo(event, heartbeat);
      } catch (err) {
        if (err instanceof StatusUpdateError) throw err; // redeliver
        console.error('Failed to process message:', err);
      }
    },
  });
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
