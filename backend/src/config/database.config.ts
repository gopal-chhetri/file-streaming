import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'streaming',
  password: process.env.DB_PASS || 'streaming',
  database: process.env.DB_NAME || 'streaming',
  ssl: process.env.DB_SSL === 'true',
}));
