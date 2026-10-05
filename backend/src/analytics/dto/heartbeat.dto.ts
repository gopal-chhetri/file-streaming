import { IsString, IsNumber, IsOptional, IsIn, Min, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HeartbeatDto {
  @ApiProperty({ description: 'Unique session identifier' })
  @IsString()
  @MaxLength(64)
  sessionId!: string;

  /**
   * Ignored: the user is taken from the bearer token. Still accepted so
   * older clients that send it aren't rejected by input validation.
   */
  @ApiPropertyOptional({ deprecated: true, description: 'Ignored; derived from the bearer token' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty()
  @IsUUID()
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
