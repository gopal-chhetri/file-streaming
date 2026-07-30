import { ApiProperty } from '@nestjs/swagger';

class RoleInfo {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'admin' })
  name!: string;

  @ApiProperty({ example: 'Administrator with full access', nullable: true })
  description?: string;
}

export class UserResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'admin@gmail.com' })
  email!: string;

  @ApiProperty({ example: 'admin' })
  username!: string;

  @ApiProperty({ example: 'Admin' })
  firstName!: string;

  @ApiProperty({ example: 'User' })
  lastName!: string;

  @ApiProperty({ type: RoleInfo })
  role!: RoleInfo;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2026-07-20T17:38:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-07-20T17:38:00.000Z' })
  updatedAt!: Date;
}
