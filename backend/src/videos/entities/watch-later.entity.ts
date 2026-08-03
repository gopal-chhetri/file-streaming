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

@Entity({ tableName: 'watch_later' })
@Unique({ properties: ['user', 'video'] })
export class WatchLater {
  [OptionalProps]?: 'id' | 'createdAt';

  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @ManyToOne(() => User, { fieldName: 'user_id' })
  user!: User;

  @ManyToOne(() => Video, { fieldName: 'video_id' })
  video!: Video;

  @Property({ type: 'datetime' })
  createdAt: Date = new Date();
}
