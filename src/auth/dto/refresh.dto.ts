import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshDto {
  @ApiPropertyOptional({ example: 'opaque-refresh-token-value', description: 'Refresh token (usually sent via httpOnly cookie)' })
  @IsNotEmpty()
  @IsString()
  refreshToken!: string;
}
