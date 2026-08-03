import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class ReportVideoDto {
  @ApiPropertyOptional({
    example: 'Inappropriate content',
    description: 'Optional reason for reporting the video',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
