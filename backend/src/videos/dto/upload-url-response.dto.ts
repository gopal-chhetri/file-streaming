import { ApiProperty } from '@nestjs/swagger';

export class UploadUrlResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  videoId!: string;

  @ApiProperty({
    example:
      'https://minio.example.com/raw-uploads/abc-123/video.mp4?X-Amz-Algorithm=...',
  })
  uploadUrl!: string;

  @ApiProperty({ example: 'raw-uploads/abc-123/video.mp4' })
  objectKey!: string;
}
