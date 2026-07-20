import { Migration } from '@mikro-orm/migrations';

export class Migration20260720184758 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "refresh_tokens" ("id" uuid not null, "user_id" uuid not null, "token_hash" varchar(255) not null, "family_id" uuid not null, "expires_at" timestamptz not null, "revoked_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`);
    this.addSql(`alter table "refresh_tokens" add constraint "refresh_tokens_token_hash_unique" unique ("token_hash");`);

    this.addSql(`alter table "refresh_tokens" add constraint "refresh_tokens_user_id_foreign" foreign key ("user_id") references "users" ("id") on delete cascade;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "refresh_tokens" cascade;`);
  }

}
