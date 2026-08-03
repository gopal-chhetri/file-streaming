import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateVideoDto {
  @ApiPropertyOptional({
    example: 'My updated title',
    description: 'New video title',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    example: 'An updated description',
    description: 'New video description',
  })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;
}
