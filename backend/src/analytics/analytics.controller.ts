import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
  HttpException,
  Inject,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import Redis from 'ioredis';
import { AnalyticsService } from './analytics.service';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/enums';

/** Heartbeats per client IP per minute (a player sends ~6). */
const HEARTBEAT_LIMIT_PER_MINUTE = 120;

type AuthedUser = { id: string; role: string };

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  @Post('heartbeat')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Ingest a heartbeat event from the video player' })
  async heartbeat(@Req() req: Request, @Body() dto: HeartbeatDto): Promise<void> {
    await this.enforceHeartbeatLimit(req.ip ?? 'unknown');
    // Attribution comes from the token only; a userId in the body would let
    // anyone record views as any user.
    const userId = (req.user as AuthedUser | undefined)?.id;
    await this.analyticsService.ingestHeartbeat(dto, userId);
  }

  @Get('video/:videoId/retention')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get retention curve for a video (owner or admin)' })
  async getRetention(
    @Req() req: Request,
    @Param('videoId', ParseUUIDPipe) videoId: string,
  ) {
    return this.analyticsService.getRetention(videoId, req.user as AuthedUser);
  }

  @Get('dashboard/summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get platform-wide analytics summary (admin)' })
  async getDashboardSummary() {
    return this.analyticsService.getDashboardSummary();
  }

  private async enforceHeartbeatLimit(ip: string): Promise<void> {
    const key = `rate_limit:heartbeat:${ip}:${Math.floor(Date.now() / 60000)}`;
    try {
      const count = await this.redis.incr(key);
      if (count === 1) await this.redis.expire(key, 120);
      if (count > HEARTBEAT_LIMIT_PER_MINUTE) {
        throw new HttpException('Too many heartbeats', HttpStatus.TOO_MANY_REQUESTS);
      }
    } catch (err) {
      if (err instanceof HttpException) throw err;
      // Redis down: analytics is best-effort, don't block playback.
    }
  }
}
