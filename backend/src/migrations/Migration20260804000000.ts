import { Migration } from '@mikro-orm/migrations';

export class Migration20260804000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS watch_later (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, video_id)
      );
    `);
    this.addSql(
      'ALTER TABLE videos ADD COLUMN IF NOT EXISTS failure_reason VARCHAR(500) NULL;',
    );
  }

  async down(): Promise<void> {
    this.addSql('DROP TABLE IF EXISTS watch_later;');
    this.addSql('ALTER TABLE videos DROP COLUMN IF EXISTS failure_reason;');
  }
}
