import { Controller, Get, Param, Res, Req, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import type { Response, Request } from 'express';
import { StreamingService } from './streaming.service';

@ApiTags('Streaming')
@Controller('streaming')
export class StreamingController {
  private readonly logger = new Logger(StreamingController.name);

  constructor(private readonly streamingService: StreamingService) {}

  @Get(':videoId/*splat')
  @ApiOperation({ summary: 'Serve HLS file from MinIO' })
  @ApiParam({ name: 'videoId', description: 'Video UUID' })
  async serveFile(
    @Param('videoId') videoId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const splat = req.params.splat as string[] | undefined;
    const filePath = splat?.join('/') || 'master.m3u8';
    const range = req.headers.range;

    try {
      const { stream, mimeType, size, start, end } =
        await this.streamingService.getFile(videoId, filePath, range);

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Accept-Ranges', 'bytes');
      // Segments never change once written; playlists are the gate, so keep
      // them short-lived so a ban or deletion takes effect within a minute.
      res.setHeader(
        'Cache-Control',
        filePath.endsWith('.ts')
          ? 'public, max-age=31536000, immutable'
          : 'public, max-age=60',
      );

      if (range && start !== undefined && end !== undefined) {
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
        res.setHeader('Content-Length', end - start + 1);
      } else {
        res.setHeader('Content-Length', size);
      }

      stream.pipe(res);
    } catch (err) {
      if ((err as { status?: number }).status === 404) {
        res.status(404).json({ message: 'File not found' });
      } else {
        this.logger.error(
          `Streaming error: ${err instanceof Error ? err.message : String(err)}`,
        );
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }
}
