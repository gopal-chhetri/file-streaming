import { Migration } from '@mikro-orm/migrations';

/**
 * Distinguish a refresh token replaced by normal rotation (rotated_at) from
 * one revoked by logout or reuse detection, so two tabs refreshing at the
 * same moment don't trip reuse detection and log the user out.
 */
export class Migration20261004000100 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS rotated_at TIMESTAMPTZ NULL;',
    );
  }

  async down(): Promise<void> {
    this.addSql('ALTER TABLE refresh_tokens DROP COLUMN IF EXISTS rotated_at;');
  }
}
