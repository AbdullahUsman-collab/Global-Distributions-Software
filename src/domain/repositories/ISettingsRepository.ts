/**
 * Settings Repository Interface
 * Persistence boundary for tenant-specific settings.
 *
 * RULE: Persistence ONLY - no business logic, no authorization, no calculations.
 * RULE: Each tenant has its own isolated settings.
 */

import { TenantSettings } from '../types/settings';

/**
 * Repository interface for tenant settings persistence.
 */
export interface ISettingsRepository {
  /**
   * Retrieve settings for a tenant.
   * Returns null if no settings have been configured yet.
   */
  getSettingsByTenantId(tenantId: string): Promise<TenantSettings | null>;

  /**
   * Create or update settings for a tenant.
   * If settings exist, merges the partial update.
   * If settings don't exist, creates defaults with the provided values.
   * Returns the full settings after save.
   */
  updateSettings(
    tenantId: string,
    settings: Partial<TenantSettings>
  ): Promise<TenantSettings>;
}
