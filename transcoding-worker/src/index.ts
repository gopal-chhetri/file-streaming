import 'dotenv/config';
import { Kafka, Consumer } from 'kafkajs';
import { createMinioClient, downloadFile, uploadDirectory } from './minio-client';
import { transcodeToHls } from './transcoder';
import { join } from 'node:path';
import { rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';

const TOPIC = 'video.uploaded';
const RAW_BUCKET = 'raw-uploads';
const PROCESSED_BUCKET = 'processed';

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
) {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  const token = process.env.API_TOKEN || '';

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
        thumbnailUrl: duration ? `${videoId}/master.m3u8` : undefined,
      }),
    });
    if (!res.ok) {
      console.error(`Failed to update status for ${videoId}: ${res.status}`);
    }
  } catch (err) {
    console.error(`Error updating status for ${videoId}:`, err);
  }
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

    const result = await transcodeToHls(inputPath, videoId, join(workDir, 'output'));

    await uploadDirectory(minio, PROCESSED_BUCKET, result.outputDir, videoId);
    console.log(`Uploaded HLS for ${videoId}`);

    await updateVideoStatus(videoId, 'ready', result.duration);
    console.log(`Video ${videoId} transcoded successfully`);
  } catch (err) {
    console.error(`Transcoding failed for ${videoId}:`, err);
    await updateVideoStatus(videoId, 'failed');
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
