import { Migration } from '@mikro-orm/migrations';

export class Migration20260726114316 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `create table "videos" ("id" uuid not null, "title" varchar(255) not null, "description" text null, "filename" varchar(255) not null, "mime_type" varchar(50) not null, "size" bigint not null, "status" text not null default 'pending', "thumbnail_url" varchar(500) null, "duration" real null, "user_id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`,
    );

    this.addSql(
      `alter table "videos" add constraint "videos_user_id_foreign" foreign key ("user_id") references "users" ("id");`,
    );
    this.addSql(
      `alter table "videos" add constraint "videos_status_check" check ("status" in ('pending', 'processing', 'ready', 'failed'));`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "videos" cascade;`);
  }
}
