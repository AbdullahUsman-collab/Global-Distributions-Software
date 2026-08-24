/**
 * Tenant Repository Interface
 * Persistence boundary for tenant data access.
 * 
 * Mock implementations return fictional demo brands.
 * Real implementation will connect to database.
 */

import { Tenant, TenantPublicConfig, CreateTenantPayload, UpdateTenantPayload } from '../types/tenant';

/**
 * Repository interface for tenant persistence operations.
 * Defines the contract for tenant data access.
 */
export interface ITenantRepository {
  /**
   * Get all active tenants for public display.
   * Used for tenant selection UI.
   */
  getPublicTenants(): Promise<TenantPublicConfig[]>;

  /**
   * Find tenant by URL-friendly slug.
   * Used for tenant resolution from URL or subdomain.
   */
  getTenantBySlug(slug: string): Promise<Tenant | null>;

  /**
   * Find tenant by unique identifier.
   * Used for internal tenant operations.
   */
  getTenantById(id: string): Promise<Tenant | null>;

  /**
   * Create a new tenant.
   * Used for tenant provisioning.
   */
  createTenant(payload: CreateTenantPayload): Promise<Tenant>;

  /**
   * Update an existing tenant.
   * Used for tenant configuration changes.
   */
  updateTenant(id: string, payload: UpdateTenantPayload): Promise<Tenant>;

  /**
   * Soft delete a tenant (set isActive = false).
   * Used for tenant deactivation.
   */
  deactivateTenant(id: string): Promise<boolean>;
}
