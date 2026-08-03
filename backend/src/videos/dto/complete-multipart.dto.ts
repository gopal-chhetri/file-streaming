import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional } from 'class-validator';

export class CompleteMultipartDto {
  @ApiPropertyOptional({ example: 'some-upload-id' })
  @IsOptional()
  @IsString()
  uploadId?: string;

  @ApiPropertyOptional({ example: [{ partNumber: 1, etag: '"etag-value"' }] })
  @IsOptional()
  @IsArray()
  parts?: { partNumber: number; etag: string }[];
}
