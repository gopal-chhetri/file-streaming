import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { VideosService } from './videos.service';
import { InitiateUploadDto } from './dto/initiate-upload.dto';
import { UpdateVideoStatusDto } from './dto/update-video-status.dto';
import { VideoResponseDto } from './dto/video-response.dto';
import { UploadUrlResponseDto } from './dto/upload-url-response.dto';
import { UpsertProgressDto } from './dto/watch-history.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@ApiTags('Videos')
@Controller('videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Post('upload-url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a presigned upload URL' })
  @ApiBody({ type: InitiateUploadDto })
  @ApiResponse({
    status: 201,
    description: 'Presigned URL generated.',
    type: UploadUrlResponseDto,
  })
  initiateUpload(@Req() req: Request, @Body() dto: InitiateUploadDto) {
    const user = req.user as { id: string };
    return this.videosService.initiateUpload(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all videos' })
  @ApiResponse({
    status: 200,
    description: 'List of videos.',
    type: [VideoResponseDto],
  })
  findAll() {
    return this.videosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get video by ID' })
  @ApiResponse({
    status: 200,
    description: 'Video details.',
    type: VideoResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Video not found.' })
  findOne(@Param('id') id: string) {
    return this.videosService.findById(id);
  }

  @Patch(':id/status')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Update video transcoding status' })
  @ApiBody({ type: UpdateVideoStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Video status updated.',
    type: VideoResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Video not found.' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateVideoStatusDto,
  ) {
    return this.videosService.updateStatus(id, dto);
  }
}

@ApiTags('Watch History')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller()
export class WatchHistoryController {
  constructor(private readonly videosService: VideosService) {}

  @Post('videos/:id/progress')
  @ApiOperation({ summary: 'Upsert watch progress' })
  @ApiBody({ type: UpsertProgressDto })
  @ApiResponse({ status: 200, description: 'Progress saved.' })
  upsertProgress(
    @Req() req: Request,
    @Param('id') videoId: string,
    @Body() dto: UpsertProgressDto,
  ) {
    const userId = (req.user as { id: string }).id;
    return this.videosService.upsertProgress(userId, videoId, dto.progress);
  }

  @Get('watch-history')
  @ApiOperation({ summary: 'List watch history for current user' })
  @ApiResponse({ status: 200, description: 'Watch history entries.' })
  getHistory(@Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    return this.videosService.getHistory(userId);
  }

  @Get('watch-history/:videoId')
  @ApiOperation({ summary: 'Get progress for a specific video' })
  @ApiResponse({ status: 200, description: 'Progress entry.' })
  @ApiResponse({ status: 204, description: 'No progress recorded.' })
  async getProgress(
    @Req() req: Request,
    @Param('videoId') videoId: string,
  ) {
    const userId = (req.user as { id: string }).id;
    const result = await this.videosService.getProgress(userId, videoId);
    if (!result) return { videoId, progress: 0, watchedAt: null };
    return result;
  }
}
