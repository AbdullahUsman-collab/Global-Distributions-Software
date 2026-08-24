/**
 * Tenant Domain Types
 * Multi-tenant brand context for the ERP system.
 * 
 * RULE: No real legacy company names (MotherCare, Global Distribution Services).
 * Use fictional names only: "Demo Wholesale", "Demo Distribution", "Apex Trading".
 */

/**
 * Public tenant configuration exposed to UI and client-side.
 * Lightweight subset for brand rendering and tenant selection.
 */
export interface TenantPublicConfig {
  /** Unique tenant identifier */
  id: string;
  /** URL-friendly slug for tenant identification */
  slug: string;
  /** Display brand name */
  brandName: string;
  /** Logo image URL */
  logoUrl: string;
  /** Primary brand color (hex) */
  primaryColor: string;
}

/**
 * Full tenant entity with all configuration.
 * Used internally for tenant operations and settings.
 */
export interface Tenant extends TenantPublicConfig {
  /** Accent brand color (hex) */
  accentColor: string;
  /** Whether tenant is active and can be accessed */
  isActive: boolean;
  /** Tenant creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Tenant creation payload.
 * Used when creating new tenants in the system.
 */
export interface CreateTenantPayload {
  slug: string;
  brandName: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
}

/**
 * Tenant update payload.
 * Partial updates allowed for tenant configuration.
 */
export interface UpdateTenantPayload {
  brandName?: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  isActive?: boolean;
}
