import { registerAs } from '@nestjs/config';

export default registerAs('kafka', () => ({
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  clientId: process.env.KAFKA_CLIENT_ID || 'file-streaming',
  groupId: process.env.KAFKA_GROUP_ID || 'file-streaming-consumer',
}));
