import { IsString, IsNumber, IsOptional, IsIn, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HeartbeatDto {
  @ApiProperty({ description: 'Unique session identifier' })
  @IsString()
  sessionId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty()
  @IsString()
  videoId!: string;

  @ApiProperty({ description: 'Current playback position in seconds' })
  @IsNumber()
  @Min(0)
  position!: number;

  @ApiProperty({ description: 'Total video duration in seconds' })
  @IsNumber()
  @Min(0)
  duration!: number;

  @ApiProperty({ enum: ['play', 'pause', 'heartbeat', 'seek', 'end'] })
  @IsIn(['play', 'pause', 'heartbeat', 'seek', 'end'])
  eventType!: 'play' | 'pause' | 'heartbeat' | 'seek' | 'end';
}
