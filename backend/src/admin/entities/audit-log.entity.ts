import { OptionalProps } from '@mikro-orm/core';
import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
} from '@mikro-orm/decorators/legacy';
import { v4 } from 'uuid';
import { User } from '../../users/entities/user.entity';

@Entity({ tableName: 'audit_logs' })
export class AuditLog {
  [OptionalProps]?: 'id' | 'createdAt';

  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @Property({ type: 'string', length: 50 })
  action!: string;

  @Property({ type: 'string', length: 50 })
  entityType!: string;

  @Property({ type: 'string', length: 50 })
  entityId!: string;

  @ManyToOne(() => User, { fieldName: 'actor_id' })
  actor!: User;

  @Property({ type: 'json', nullable: true })
  metadata?: Record<string, unknown>;

  @Property({ type: 'string', length: 45, nullable: true })
  ip?: string;

  @Property({ type: 'datetime' })
  createdAt: Date = new Date();
}
