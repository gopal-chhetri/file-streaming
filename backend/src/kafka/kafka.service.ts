import {
  Injectable,
  Logger,
  OnModuleInit,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Consumer, Admin } from 'kafkajs';

export const VIDEO_UPLOADED_TOPIC = 'video.uploaded';
export const VIDEO_HEARTBEAT_TOPIC = 'video.heartbeat';

export interface VideoUploadedEvent {
  videoId: string;
  objectKey: string;
  bucket: string;
  filename: string;
  mimeType: string;
  size: string;
  userId: string;
}

export interface HeartbeatEvent {
  sessionId: string;
  userId?: string;
  videoId: string;
  position: number;
  duration: number;
  eventType: 'play' | 'pause' | 'heartbeat' | 'seek' | 'end';
  timestamp: string;
}

@Injectable()
export class KafkaService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(KafkaService.name);
  private readonly kafka: Kafka;
  private readonly producer: Producer;
  private readonly consumer: Consumer;
  private readonly admin: Admin;
  private reconnecting = false;

  constructor(private readonly configService: ConfigService) {
    const brokers = this.configService.get<string[]>('kafka.brokers', [
      'localhost:9092',
    ]);
    const clientId = this.configService.get<string>(
      'kafka.clientId',
      'file-streaming',
    );
    const groupId = this.configService.get<string>(
      'kafka.groupId',
      'file-streaming-consumer',
    );

    this.kafka = new Kafka({ brokers, clientId });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId });
    this.admin = this.kafka.admin();

    this.producer.on('producer.disconnect', async () => {
      if (this.reconnecting) return;
      this.reconnecting = true;
      this.logger.warn('Producer disconnected — reconnecting...');
      try {
        await this.producer.connect();
        this.logger.log('Producer reconnected');
      } catch (err) {
        this.logger.error(`Producer reconnect failed: ${err}`);
      }
      this.reconnecting = false;
    });
  }

  async onModuleInit() {
    try {
      await this.admin.connect();
      const topics = await this.admin.listTopics();
      const requiredTopics = [VIDEO_UPLOADED_TOPIC, VIDEO_HEARTBEAT_TOPIC];
      for (const topic of requiredTopics) {
        if (!topics.includes(topic)) {
          await this.admin.createTopics({
            topics: [
              {
                topic,
                numPartitions: 1,
                replicationFactor: 1,
              },
            ],
          });
          this.logger.log(`Created topic: ${topic}`);
        }
      }
      await this.admin.disconnect();

      await this.producer.connect();
      this.logger.log('Kafka producer connected');
    } catch (err) {
      this.logger.warn(
        `Kafka unavailable — events will not be published: ${err}`,
      );
    }
  }

  async publishVideoUploaded(event: VideoUploadedEvent): Promise<void> {
    try {
      await this.producer.send({
        topic: VIDEO_UPLOADED_TOPIC,
        messages: [{ key: event.videoId, value: JSON.stringify(event) }],
      });
      this.logger.log(`Published video.uploaded: ${event.videoId}`);
    } catch (err) {
      if ((err as Error).message?.includes('disconnected')) {
        this.logger.warn(`Producer disconnected, reconnecting...`);
        await this.producer.connect();
        await this.producer.send({
          topic: VIDEO_UPLOADED_TOPIC,
          messages: [{ key: event.videoId, value: JSON.stringify(event) }],
        });
        this.logger.log(
          `Published video.uploaded after reconnect: ${event.videoId}`,
        );
      } else {
        this.logger.error(
          `Failed to publish video.uploaded for ${event.videoId}: ${err}`,
        );
      }
    }
  }

  async publishHeartbeat(event: HeartbeatEvent): Promise<void> {
    try {
      await this.producer.send({
        topic: VIDEO_HEARTBEAT_TOPIC,
        messages: [{ key: `${event.sessionId}`, value: JSON.stringify(event) }],
      });
    } catch (err) {
      if ((err as Error).message?.includes('disconnected')) {
        this.logger.warn(`Producer disconnected, reconnecting...`);
        await this.producer.connect();
        await this.producer.send({
          topic: VIDEO_HEARTBEAT_TOPIC,
          messages: [
            { key: `${event.sessionId}`, value: JSON.stringify(event) },
          ],
        });
      } else {
        this.logger.error(
          `Failed to publish heartbeat for session ${event.sessionId}: ${err}`,
        );
      }
    }
  }

  async onApplicationShutdown() {
    try {
      await this.producer.disconnect();
      await this.consumer.disconnect();
    } catch {
      /* ignore */
    }
  }
}
