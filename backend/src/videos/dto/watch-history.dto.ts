import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, Max } from 'class-validator';

export class UpsertProgressDto {
  @ApiProperty({
    example: 45,
    description: 'Watch progress as percentage (0-100)',
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  progress!: number;
}
