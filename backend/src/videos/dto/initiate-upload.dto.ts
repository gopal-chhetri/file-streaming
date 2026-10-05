import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsNumber,
  Min,
  Max,
  Matches,
} from 'class-validator';

/** Largest accepted upload (bytes); MAX_UPLOAD_BYTES, default 5 GB. */
export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 5 * 1024 ** 3;

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
  // Videos, plus GIFs (the upload page offers them; ffmpeg converts them).
  @Matches(/^(video\/[\w.+-]+|image\/gif)$/, {
    message: 'mimeType must be a video/* type or image/gif',
  })
  mimeType!: string;

  @ApiProperty({ example: 104857600, description: 'File size in bytes' })
  @IsNumber()
  @Min(1)
  @Max(MAX_UPLOAD_BYTES, { message: `size must be at most ${MAX_UPLOAD_BYTES} bytes` })
  size!: number;
}
