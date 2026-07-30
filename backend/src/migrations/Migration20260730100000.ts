import { Migration } from '@mikro-orm/migrations';

export class Migration20260730100000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(50) NOT NULL,
        actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        metadata JSONB,
        ip VARCHAR(45),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    this.addSql(`
      CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);
    `);
  }

  async down(): Promise<void> {
    this.addSql('DROP TABLE IF EXISTS audit_logs;');
  }
}
