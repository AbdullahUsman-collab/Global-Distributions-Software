/**
 * PostgreSQL Tenant Adapter
 * Persistent tenant storage.
 *
 * RULE: Persistence ONLY — no business logic, no authorization.
 * RULE: Each tenant sees only its own data.
 */

import { randomBytes } from 'crypto';
import { Tenant, TenantPublicConfig, CreateTenantPayload, UpdateTenantPayload } from '../../../domain/types/tenant';
import { ITenantRepository } from '../../../domain/repositories/ITenantRepository';
import { query } from '../pool.js';

function uuid(): string { return randomBytes(16).toString('hex'); }

/**
 * PostgreSQL implementation of ITenantRepository.
 */
export class PostgresTenantAdapter implements ITenantRepository {

  async getPublicTenants(): Promise<TenantPublicConfig[]> {
    const result = await query(
      `SELECT id, slug, brand_name, logo_url, primary_color FROM tenants WHERE is_active = true ORDER BY brand_name`
    );
    return result.rows.map(r => ({
      id: r.id, slug: r.slug, brandName: r.brand_name, logoUrl: r.logo_url || '', primaryColor: r.primary_color,
    }));
  }

  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    const result = await query(
      `SELECT id, slug, brand_name, logo_url, primary_color, accent_color, is_active, created_at, updated_at
       FROM tenants WHERE slug = $1`,
      [slug]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async getTenantById(id: string): Promise<Tenant | null> {
    const result = await query(
      `SELECT id, slug, brand_name, logo_url, primary_color, accent_color, is_active, created_at, updated_at
       FROM tenants WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async createTenant(payload: CreateTenantPayload): Promise<Tenant> {
    const id = uuid();
    const result = await query(
      `INSERT INTO tenants (id, slug, brand_name, logo_url, primary_color, accent_color, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING *`,
      [id, payload.slug, payload.brandName, payload.logoUrl, payload.primaryColor, payload.accentColor]
    );
    return this.mapRow(result.rows[0]);
  }

  private static TENANT_UPDATE_COLUMNS: Record<string, string> = {
    name: 'name',
    displayName: 'display_name',
    legalName: 'legal_name',
    registrationNumber: 'registration_number',
    taxNumber: 'tax_number',
    address: 'address',
    city: 'city',
    province: 'province',
    phone: 'phone',
    email: 'email',
    website: 'website',
    logo: 'logo',
    isActive: 'is_active',
  };

  async updateTenant(id: string, payload: UpdateTenantPayload): Promise<Tenant> {
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;
    for (const [k, v] of Object.entries(payload)) {
      const col = PostgresTenantAdapter.TENANT_UPDATE_COLUMNS[k];
      if (col && v !== undefined) {
        sets.push(`${col} = $${idx++}`);
        vals.push(v);
      }
    }
    if (sets.length === 0) return (await this.getTenantById(id))!;
    sets.push('updated_at = NOW()');
    vals.push(id);
    const result = await query(
      `UPDATE tenants SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals
    );
    if (result.rows.length === 0) throw new Error(`Tenant not found: ${id}`);
    return this.mapRow(result.rows[0]);
  }

  async deactivateTenant(id: string): Promise<boolean> {
    const result = await query('UPDATE tenants SET is_active = false, updated_at = NOW() WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  private mapRow(r: any): Tenant {
    return {
      id: r.id, slug: r.slug, brandName: r.brand_name, logoUrl: r.logo_url || '',
      primaryColor: r.primary_color, accentColor: r.accent_color,
      isActive: r.is_active, createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at),
    };
  }
}
