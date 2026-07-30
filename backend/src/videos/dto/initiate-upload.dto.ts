import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';

export class InitiateUploadDto {
  @ApiProperty({ example: 'My Great Video', description: 'Video title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiProperty({
    example: 'A description of my video',
    description: 'Video description',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ example: 'video.mp4', description: 'Original filename' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename!: string;

  @ApiProperty({ example: 'video/mp4', description: 'MIME type' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  mimeType!: string;

  @ApiProperty({ example: 104857600, description: 'File size in bytes' })
  @IsNumber()
  @Min(1)
  size!: number;
}
