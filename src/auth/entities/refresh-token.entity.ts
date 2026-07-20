import { OptionalProps } from '@mikro-orm/core';
import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/decorators/legacy';
import { v4 } from 'uuid';
import { User } from '../../users/entities/user.entity';

@Entity({ tableName: 'refresh_tokens' })
export class RefreshToken {
  [OptionalProps]?: 'id' | 'createdAt' | 'updatedAt' | 'revokedAt';

  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @ManyToOne(() => User, { fieldName: 'user_id', deleteRule: 'cascade' })
  user!: User;

  @Property({ type: 'string', length: 255, unique: true, fieldName: 'token_hash' })
  tokenHash!: string;

  @Property({ type: 'uuid', fieldName: 'family_id' })
  familyId!: string;

  @Property({ type: 'datetime', fieldName: 'expires_at' })
  expiresAt!: Date;

  @Property({ type: 'datetime', nullable: true, fieldName: 'revoked_at' })
  revokedAt?: Date;

  @Property({ type: 'datetime', fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'datetime', onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
