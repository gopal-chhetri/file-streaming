import { Migration } from '@mikro-orm/migrations';

export class Migration20260731000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_status_check;',
    );
    this.addSql(`
      ALTER TABLE videos ADD CONSTRAINT videos_status_check CHECK (
        status IN ('pending', 'pending_review', 'processing', 'active', 'failed', 'banned')
      );
    `);
    // Also, update existing 'ready' videos to 'active' just in case
    this.addSql("UPDATE videos SET status = 'active' WHERE status = 'ready';");
  }

  async down(): Promise<void> {
    this.addSql(
      'ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_status_check;',
    );
    this.addSql(`
      ALTER TABLE videos ADD CONSTRAINT videos_status_check CHECK (
        status IN ('pending', 'pending_review', 'processing', 'ready', 'failed')
      );
    `);
    this.addSql("UPDATE videos SET status = 'ready' WHERE status = 'active';");
  }
}
