/**
 * Mock Tenant Adapter
 * DEVELOPMENT ONLY - In-memory mock implementation of ITenantRepository.
 * 
 * RULE: NO real legacy company names (MotherCare, Global Distribution Services).
 * Uses strictly fictional demo brands.
 */

import {
  Tenant,
  TenantPublicConfig,
  CreateTenantPayload,
  UpdateTenantPayload,
} from '../../types/tenant';
import { ITenantRepository } from '../../repositories/ITenantRepository';

/**
 * Fictional demo tenants for development.
 * NO legacy company names - only fictional brands.
 */
const DEMO_TENANTS: Tenant[] = [
  {
    id: 'tenant-demo-wholesale-001',
    slug: 'demo-wholesale',
    brandName: 'Demo Wholesale',
    logoUrl: '/logos/demo-wholesale.svg',
    primaryColor: '#1E40AF',
    accentColor: '#3B82F6',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'tenant-demo-distribution-002',
    slug: 'demo-distribution',
    brandName: 'Demo Distribution',
    logoUrl: '/logos/demo-distribution.svg',
    primaryColor: '#047857',
    accentColor: '#10B981',
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'tenant-apex-trading-003',
    slug: 'apex-trading',
    brandName: 'Apex Trading',
    logoUrl: '/logos/apex-trading.svg',
    primaryColor: '#7C3AED',
    accentColor: '#A78BFA',
    isActive: true,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
];

/**
 * In-memory storage for mock tenants.
 */
let tenants: Tenant[] = [...DEMO_TENANTS];

/**
 * Mock implementation of ITenantRepository.
 * DEVELOPMENT ONLY - Do not use in production.
 */
export class MockTenantAdapter implements ITenantRepository {
  /**
   * Get all active tenants for public display.
   */
  async getPublicTenants(): Promise<TenantPublicConfig[]> {
    return tenants
      .filter((t) => t.isActive)
      .map((t) => ({
        id: t.id,
        slug: t.slug,
        brandName: t.brandName,
        logoUrl: t.logoUrl,
        primaryColor: t.primaryColor,
      }));
  }

  /**
   * Find tenant by slug.
   */
  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    return tenants.find((t) => t.slug === slug) || null;
  }

  /**
   * Find tenant by ID.
   */
  async getTenantById(id: string): Promise<Tenant | null> {
    return tenants.find((t) => t.id === id) || null;
  }

  /**
   * Create a new tenant.
   */
  async createTenant(payload: CreateTenantPayload): Promise<Tenant> {
    const newTenant: Tenant = {
      id: `tenant-${Date.now()}`,
      ...payload,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    tenants.push(newTenant);
    return newTenant;
  }

  /**
   * Update an existing tenant.
   */
  async updateTenant(
    id: string,
    payload: UpdateTenantPayload
  ): Promise<Tenant> {
    const index = tenants.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error(`Tenant not found: ${id}`);
    }
    tenants[index] = {
      ...tenants[index],
      ...payload,
      updatedAt: new Date(),
    };
    return tenants[index];
  }

  /**
   * Deactivate a tenant.
   */
  async deactivateTenant(id: string): Promise<boolean> {
    const index = tenants.findIndex((t) => t.id === id);
    if (index === -1) {
      return false;
    }
    tenants[index].isActive = false;
    tenants[index].updatedAt = new Date();
    return true;
  }
}
