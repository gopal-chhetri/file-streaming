import { Migration } from '@mikro-orm/migrations';

export class Migration20260720173800 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "roles" ("id" uuid not null, "name" varchar(50) not null, "description" text null, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`);
    this.addSql(`alter table "roles" add constraint "roles_name_unique" unique ("name");`);

    this.addSql(`create table "users" ("id" uuid not null, "email" varchar(50) not null, "username" varchar(20) not null, "password_hash" varchar(255) not null, "first_name" varchar(100) not null, "last_name" varchar(100) not null, "role_id" uuid not null, "is_active" boolean not null default true, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`);
    this.addSql(`alter table "users" add constraint "users_email_unique" unique ("email");`);
    this.addSql(`alter table "users" add constraint "users_username_unique" unique ("username");`);

    this.addSql(`alter table "users" add constraint "users_role_id_foreign" foreign key ("role_id") references "roles" ("id");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "users" drop constraint "users_role_id_foreign";`);

    this.addSql(`drop table if exists "roles" cascade;`);
    this.addSql(`drop table if exists "users" cascade;`);
  }

}
