import { Migration } from '@mikro-orm/migrations';

/**
 * Raw uploads were stored under the client's filename, so two users uploading
 * "video.mp4" overwrote each other. New uploads use `<videoId>/source.<ext>`;
 * existing rows keep pointing at their old key.
 */
export class Migration20261004000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'ALTER TABLE videos ADD COLUMN IF NOT EXISTS object_key VARCHAR(255) NULL;',
    );
    this.addSql('UPDATE videos SET object_key = filename WHERE object_key IS NULL;');
    this.addSql('ALTER TABLE videos ALTER COLUMN object_key SET NOT NULL;');
  }

  async down(): Promise<void> {
    this.addSql('ALTER TABLE videos DROP COLUMN IF EXISTS object_key;');
  }
}
