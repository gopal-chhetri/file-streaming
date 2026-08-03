import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ModerateVideoDto {
  @ApiProperty({ enum: ['approve', 'reject', 'flag_pending', 'flag_banned'] })
  @IsIn(['approve', 'reject', 'flag_pending', 'flag_banned'])
  action!: 'approve' | 'reject' | 'flag_pending' | 'flag_banned';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
