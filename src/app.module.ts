import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { VideosModule } from './videos/videos.module';
import { StreamingModule } from './streaming/streaming.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AdminModule } from './admin/admin.module';
import { KafkaModule } from './kafka/kafka.module';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import mikroOrmConfig from '../mikro-orm.config';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
      envFilePath: '.env',
    }),
    MikroOrmModule.forRoot(mikroOrmConfig),
    CommonModule,
    HealthModule,
    KafkaModule,
    UsersModule,
    AuthModule,
    VideosModule,
    StreamingModule,
    AnalyticsModule,
    AdminModule,
  ],
})
export class AppModule {}
