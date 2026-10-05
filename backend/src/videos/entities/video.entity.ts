import { OptionalProps } from '@mikro-orm/core';
import {
  Entity,
  PrimaryKey,
  Property,
  Enum,
  ManyToOne,
} from '@mikro-orm/decorators/legacy';
import { v4 } from 'uuid';
import { User } from '../../users/entities/user.entity';

export enum VideoStatus {
  PENDING = 'pending',
  PENDING_REVIEW = 'pending_review',
  PROCESSING = 'processing',
  ACTIVE = 'active',
  BANNED = 'banned',
  FAILED = 'failed',
}

@Entity({ tableName: 'videos' })
export class Video {
  [OptionalProps]?: 'id' | 'status' | 'createdAt' | 'updatedAt';

  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @Property({ type: 'string', length: 255 })
  title!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'string', length: 255 })
  filename!: string;

  /**
   * Key of the raw upload in the raw-uploads bucket. Derived from the video ID
   * (`<id>/source.<ext>`), never from the client's filename, which is only
   * display metadata.
   */
  @Property({ type: 'string', length: 255, fieldName: 'object_key' })
  objectKey!: string;

  @Property({ type: 'string', length: 50 })
  mimeType!: string;

  @Property({ type: 'bigint' })
  size!: string;

  @Enum({ items: () => VideoStatus })
  status: VideoStatus = VideoStatus.PENDING;

  @Property({ type: 'string', length: 500, nullable: true })
  thumbnailUrl?: string;

  @Property({ type: 'string', length: 500, nullable: true })
  failureReason?: string;

  @Property({ type: 'float', nullable: true })
  duration?: number;

  @ManyToOne(() => User, { fieldName: 'user_id' })
  user!: User;

  @Property({ type: 'datetime' })
  createdAt: Date = new Date();

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
