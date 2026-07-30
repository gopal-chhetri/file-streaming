import { registerAs } from '@nestjs/config';

export default registerAs('mongodb', () => ({
  uri:
    process.env.MONGO_URI ||
    'mongodb://streaming:streaming@localhost:27017/streaming?authSource=admin',
}));
