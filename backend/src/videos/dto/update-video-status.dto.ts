import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { VideoStatus } from '../entities/video.entity';

export class UpdateVideoStatusDto {
  @ApiProperty({
    enum: VideoStatus,
    example: VideoStatus.ACTIVE,
    description: 'New video status',
  })
  @IsEnum(VideoStatus)
  status!: VideoStatus;

  @ApiPropertyOptional({
    example: 245.3,
    description: 'Video duration in seconds',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({
    example: 'processed/abc-123/thumbnail.jpg',
    description: 'Path to generated thumbnail in MinIO',
  })
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    example: 'INCOMPATIBLE_FILE',
    description: 'Optional reason the video failed processing',
  })
  @IsString()
  @IsOptional()
  failureReason?: string;
}
