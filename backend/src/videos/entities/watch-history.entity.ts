import { OptionalProps } from '@mikro-orm/core';
import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  Unique,
} from '@mikro-orm/decorators/legacy';
import { v4 } from 'uuid';
import { User } from '../../users/entities/user.entity';
import { Video } from './video.entity';

@Entity({ tableName: 'watch_history' })
@Unique({ properties: ['user', 'video'] })
export class WatchHistory {
  [OptionalProps]?: 'id' | 'progress' | 'watchedAt' | 'createdAt' | 'updatedAt';

  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @ManyToOne(() => User, { fieldName: 'user_id' })
  user!: User;

  @ManyToOne(() => Video, { fieldName: 'video_id' })
  video!: Video;

  @Property({ type: 'float', default: 0 })
  progress: number = 0;

  @Property({ type: 'datetime' })
  watchedAt: Date = new Date();

  @Property({ type: 'datetime' })
  createdAt: Date = new Date();

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
