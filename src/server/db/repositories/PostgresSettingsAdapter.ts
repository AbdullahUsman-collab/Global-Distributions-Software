/**
 * PostgreSQL Settings Adapter
 * Persistent tenant settings storage.
 *
 * RULE: Persistence ONLY — no business logic, no authorization.
 * RULE: Settings are stored as JSONB in tenant_settings table.
 * RULE: Each tenant has its own isolated settings.
 */

import { TenantSettings } from '../../../domain/types/settings';
import { ISettingsRepository } from '../../../domain/repositories/ISettingsRepository';
import { query } from '../pool.js';

/**
 * PostgreSQL implementation of ISettingsRepository.
 */
export class PostgresSettingsAdapter implements ISettingsRepository {

  async getSettingsByTenantId(tenantId: string): Promise<TenantSettings | null> {
    const result = await query(
      `SELECT tenant_id, settings FROM tenant_settings WHERE tenant_id = $1`,
      [tenantId]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      tenantId: row.tenant_id,
      ...row.settings,
    };
  }

  async updateSettings(
    tenantId: string,
    partial: Partial<TenantSettings>
  ): Promise<TenantSettings> {
    // Read existing settings
    const existing = await this.getSettingsByTenantId(tenantId);

    // Merge each section independently
    const merged = existing ? { ...existing, ...partial } : { tenantId, ...partial } as TenantSettings;

    // Upsert into tenant_settings
    await query(
      `INSERT INTO tenant_settings (tenant_id, settings, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (tenant_id) DO UPDATE
       SET settings = $2, updated_at = NOW()`,
      [tenantId, JSON.stringify(merged)]
    );

    return merged;
  }
}
