import { ApiProperty } from '@nestjs/swagger';
import { VideoStatus } from '../entities/video.entity';

class UploaderInfo {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'johndoe' })
  username!: string;
}

export class VideoResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'My Great Video' })
  title!: string;

  @ApiProperty({ example: 'A description', nullable: true })
  description?: string;

  @ApiProperty({ example: 'video.mp4' })
  filename!: string;

  @ApiProperty({ example: 'video/mp4' })
  mimeType!: string;

  @ApiProperty({ example: '104857600' })
  size!: string;

  @ApiProperty({ enum: VideoStatus, example: VideoStatus.PENDING })
  status!: VideoStatus;

  @ApiProperty({ example: null, nullable: true })
  thumbnailUrl?: string;

  @ApiProperty({ example: null, nullable: true })
  duration?: number;

  @ApiProperty({
    example: '/api/streaming/abc-123/master.m3u8',
    nullable: true,
    description: 'URL to the HLS master playlist',
  })
  hlsUrl?: string;

  @ApiProperty({ type: UploaderInfo })
  user!: UploaderInfo;

  @ApiProperty({ example: '2026-07-20T17:38:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-07-20T17:38:00.000Z' })
  updatedAt!: Date;
}
