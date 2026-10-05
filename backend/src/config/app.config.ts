import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.APP_PORT || '3000', 10),
  environment: process.env.NODE_ENV || 'development',
  corsOrigins: process.env.CORS_ORIGINS || '*',
  // No default: see ApiKeyGuard and validateProductionEnv().
  workerApiToken: process.env.WORKER_API_TOKEN,
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
}));
