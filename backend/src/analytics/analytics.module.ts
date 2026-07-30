import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsAggregator } from './analytics.aggregator';
import {
  DailyAnalytics,
  DailyAnalyticsSchema,
} from './schemas/daily-analytics.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DailyAnalytics.name, schema: DailyAnalyticsSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsAggregator],
})
export class AnalyticsModule {}
