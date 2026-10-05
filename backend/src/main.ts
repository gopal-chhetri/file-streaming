import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { validateProductionEnv } from './config/validate-env';

async function bootstrap() {
  const problems = validateProductionEnv();
  if (problems.length > 0) {
    console.error(
      `Refusing to start in production:\n - ${problems.join('\n - ')}`,
    );
    process.exit(1);
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Behind Traefik: take the client IP from X-Forwarded-For only when the
  // request comes from a private network (the proxy), never from clients.
  app.set(
    'trust proxy',
    process.env.TRUST_PROXY || 'loopback, linklocal, uniquelocal',
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('APP_PORT', 3000);
  const corsOrigins = configService.get<string>('CORS_ORIGINS', '*');

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: corsOrigins === '*' ? '*' : corsOrigins.split(','),
    credentials: true,
  });

  app.setGlobalPrefix('api', {
    exclude: ['health'],
  });

  // Swagger: API docs only outside production.
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Video Streaming Platform API')
      .setDescription('Self-hosted video streaming API description')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port);
  console.log(`Application running on port ${port}`);
}

bootstrap();
