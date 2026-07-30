import { OptionalProps } from '@mikro-orm/core';
import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
} from '@mikro-orm/decorators/legacy';
import { v4 } from 'uuid';
import { Role } from './role.entity';

@Entity({ tableName: 'users' })
export class User {
  [OptionalProps]?: 'id' | 'createdAt' | 'updatedAt' | 'isActive';

  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @Property({ unique: true, type: 'string', length: 50 })
  email!: string;

  @Property({ unique: true, type: 'string', length: 20 })
  username!: string;

  @Property({ type: 'string', length: 255 })
  passwordHash!: string;

  @Property({ type: 'string', length: 100 })
  firstName!: string;

  @Property({ type: 'string', length: 100 })
  lastName!: string;

  @ManyToOne(() => Role, { fieldName: 'role_id' })
  role!: Role;

  @Property({ type: 'boolean', default: true })
  isActive: boolean = true;

  @Property({ type: 'datetime' })
  createdAt: Date = new Date();

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
