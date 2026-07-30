import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { HeartbeatDto } from './dto/heartbeat.dto';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('heartbeat')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Ingest a heartbeat event from the video player' })
  async heartbeat(@Body() dto: HeartbeatDto): Promise<void> {
    await this.analyticsService.ingestHeartbeat(dto);
  }

  @Get('video/:videoId/retention')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get retention curve for a video' })
  async getRetention(@Param('videoId') videoId: string) {
    return this.analyticsService.getRetention(videoId);
  }

  @Get('dashboard/summary')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get platform-wide analytics summary' })
  async getDashboardSummary() {
    return this.analyticsService.getDashboardSummary();
  }
}
