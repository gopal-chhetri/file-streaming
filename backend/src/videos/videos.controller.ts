import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  Res,
  UseGuards,
  NotFoundException,
  Inject,
  Query,
} from '@nestjs/common';
import { Client as MinioClient } from 'minio';
import { MINIO_CLIENT } from '../minio/minio.constants';
import type { Response } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { VideosService } from './videos.service';
import { InitiateUploadDto } from './dto/initiate-upload.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { ReportVideoDto } from './dto/report-video.dto';
import { UpdateVideoStatusDto } from './dto/update-video-status.dto';
import { VideoResponseDto } from './dto/video-response.dto';
import { UploadUrlResponseDto } from './dto/upload-url-response.dto';
import { UpsertProgressDto } from './dto/watch-history.dto';
import { CompleteMultipartDto } from './dto/complete-multipart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

const THUMBNAILS_BUCKET = 'thumbnails';

@ApiTags('Videos')
@Controller('videos')
export class VideosController {
  constructor(
    private readonly videosService: VideosService,
    @Inject(MINIO_CLIENT) private readonly minio: MinioClient,
  ) {}

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
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({
    name: 'q',
    required: false,
    type: String,
    description: 'Search title/description',
  })
  @ApiResponse({
    status: 200,
    description: 'List of videos.',
    type: [VideoResponseDto],
  })
  findAll(@Query('status') status?: string, @Query('q') q?: string) {
    return this.videosService.findAll(status, q);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List current user's videos" })
  @ApiResponse({
    status: 200,
    description: "Current user's videos.",
    type: [VideoResponseDto],
  })
  findMine(@Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    return this.videosService.findByUser(userId);
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

  @Get(':id/thumbnail')
  @ApiOperation({ summary: 'Get video thumbnail image' })
  @ApiResponse({ status: 200, description: 'Thumbnail image.' })
  @ApiResponse({ status: 404, description: 'Thumbnail not found.' })
  async getThumbnail(@Param('id') id: string, @Res() res: Response) {
    const objectKey = await this.videosService.getThumbnailObjectKey(id);
    if (!objectKey) {
      throw new NotFoundException('Thumbnail not found');
    }
    try {
      const stream = await this.minio.getObject(THUMBNAILS_BUCKET, objectKey);
      res.set('Content-Type', 'image/jpeg');
      stream.pipe(res);
    } catch {
      throw new NotFoundException('Thumbnail not found');
    }
  }

  @Get(':id/part-url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get presigned URL for a multipart upload part' })
  @ApiQuery({ name: 'partNumber', type: Number })
  @ApiQuery({ name: 'uploadId', type: String })
  getPartUrl(
    @Param('id') id: string,
    @Query('partNumber') partNumber: string,
    @Query('uploadId') uploadId: string,
  ) {
    return this.videosService.getUploadPartUrl(
      id,
      parseInt(partNumber, 10),
      uploadId,
    );
  }

  @Post(':id/complete-upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete multipart upload' })
  @ApiBody({ type: CompleteMultipartDto })
  completeUpload(@Param('id') id: string, @Body() dto: CompleteMultipartDto) {
    return this.videosService.completeMultipartUpload(id, dto);
  }

  @Post(':id/abort-upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Abort multipart upload' })
  abortUpload(@Param('id') id: string, @Body('uploadId') uploadId: string) {
    return this.videosService.abortMultipartUpload(id, uploadId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete own video' })
  @ApiResponse({ status: 200, description: 'Video deleted.' })
  @ApiResponse({ status: 403, description: 'Not your video.' })
  @ApiResponse({ status: 404, description: 'Video not found.' })
  async remove(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as { id: string }).id;
    await this.videosService.removeVideo(id, userId);
    return { message: 'Video deleted' };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Edit own video (title/description)' })
  @ApiBody({ type: UpdateVideoDto })
  @ApiResponse({
    status: 200,
    description: 'Video updated.',
    type: VideoResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Not your video.' })
  @ApiResponse({ status: 404, description: 'Video not found.' })
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateVideoDto,
  ) {
    const userId = (req.user as { id: string }).id;
    return this.videosService.updateVideo(id, userId, dto);
  }

  @Post(':id/report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report a video for review' })
  @ApiBody({ type: ReportVideoDto })
  @ApiResponse({ status: 200, description: 'Video reported.' })
  @ApiResponse({ status: 404, description: 'Video not found.' })
  async report(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: ReportVideoDto,
  ) {
    const userId = (req.user as { id: string }).id;
    await this.videosService.reportVideo(id, userId, dto, req.ip);
    return { message: 'Video reported' };
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
  updateStatus(@Param('id') id: string, @Body() dto: UpdateVideoStatusDto) {
    return this.videosService.updateStatus(id, dto);
  }
}

@ApiTags('Watch Later')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller()
export class WatchLaterController {
  constructor(private readonly videosService: VideosService) {}

  @Get('watch-later')
  @ApiOperation({ summary: 'List watch-later videos for current user' })
  @ApiResponse({ status: 200, description: 'Watch-later videos.' })
  getWatchLater(@Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    return this.videosService.getWatchLater(userId);
  }

  @Post('videos/:id/watch-later')
  @ApiOperation({ summary: 'Add video to watch later' })
  @ApiResponse({ status: 200, description: 'Added to watch later.' })
  @ApiResponse({ status: 404, description: 'Video not found.' })
  async addWatchLater(@Req() req: Request, @Param('id') videoId: string) {
    const userId = (req.user as { id: string }).id;
    await this.videosService.addToWatchLater(userId, videoId);
    return { message: 'Added to watch later' };
  }

  @Delete('videos/:id/watch-later')
  @ApiOperation({ summary: 'Remove video from watch later' })
  @ApiResponse({ status: 200, description: 'Removed from watch later.' })
  async removeWatchLater(@Req() req: Request, @Param('id') videoId: string) {
    const userId = (req.user as { id: string }).id;
    await this.videosService.removeFromWatchLater(userId, videoId);
    return { message: 'Removed from watch later' };
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
  async getProgress(@Req() req: Request, @Param('videoId') videoId: string) {
    const userId = (req.user as { id: string }).id;
    const result = await this.videosService.getProgress(userId, videoId);
    if (!result) return { videoId, progress: 0, watchedAt: null };
    return result;
  }
}
