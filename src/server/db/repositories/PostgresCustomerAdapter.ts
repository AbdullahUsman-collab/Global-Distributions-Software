/**
 * PostgreSQL Customer Adapter
 * Persistent customer storage.
 *
 * RULE: Persistence ONLY — no business logic, no authorization.
 * RULE: All queries are scoped by tenantId.
 */

import { randomBytes } from 'crypto';
import { Customer, CreateCustomerDTO, UpdateCustomerDTO } from '../../../domain/types/customer';
import { ICustomerRepository } from '../../../domain/repositories/ICustomerRepository';
import { query } from '../pool.js';

function uuid(): string { return randomBytes(16).toString('hex'); }

/**
 * PostgreSQL implementation of ICustomerRepository.
 */
export class PostgresCustomerAdapter implements ICustomerRepository {

  async getCustomersByTenantId(tenantId: string, filters?: { isActive?: boolean }): Promise<Customer[]> {
    let sql = `SELECT id, tenant_id, account_head_id, name, address, owner_name, phone, stn, ntn, cnic, is_active, created_at, updated_at
               FROM customers WHERE tenant_id = $1`;
    const params: any[] = [tenantId];
    if (filters?.isActive !== undefined) {
      sql += ` AND is_active = $2`;
      params.push(filters.isActive);
    }
    sql += ` ORDER BY name`;
    const result = await query(sql, params);
    return result.rows.map(r => this.mapRow(r));
  }

  async getCustomerById(tenantId: string, id: string): Promise<Customer | null> {
    const result = await query(
      `SELECT id, tenant_id, account_head_id, name, address, owner_name, phone, stn, ntn, cnic, is_active, created_at, updated_at
       FROM customers WHERE tenant_id = $1 AND id = $2`,
      [tenantId, id]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async getCustomerByAccountHeadId(tenantId: string, accountHeadId: string): Promise<Customer | null> {
    const result = await query(
      `SELECT id, tenant_id, account_head_id, name, address, owner_name, phone, stn, ntn, cnic, is_active, created_at, updated_at
       FROM customers WHERE tenant_id = $1 AND account_head_id = $2`,
      [tenantId, accountHeadId]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async createCustomer(tenantId: string, dto: CreateCustomerDTO): Promise<Customer> {
    const id = uuid();
    const result = await query(
      `INSERT INTO customers (id, tenant_id, account_head_id, name, address, owner_name, phone, stn, ntn, cnic, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [id, tenantId, dto.accountHeadId || null, dto.name, dto.address || '', dto.ownerName || '',
       dto.phone || '', dto.stn || '', dto.ntn || '', dto.cnic || '', dto.isActive ?? true]
    );
    return this.mapRow(result.rows[0]);
  }

  async updateCustomer(tenantId: string, id: string, dto: UpdateCustomerDTO): Promise<Customer> {
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;
    for (const [k, v] of Object.entries(dto)) {
      if (v !== undefined) {
        const col = k.replace(/([A-Z])/g, '_$1').toLowerCase();
        sets.push(`${col} = $${idx++}`);
        vals.push(v);
      }
    }
    if (sets.length === 0) return (await this.getCustomerById(tenantId, id))!;
    sets.push('updated_at = NOW()');
    vals.push(tenantId, id);
    const result = await query(
      `UPDATE customers SET ${sets.join(', ')} WHERE tenant_id = $${idx++} AND id = $${idx} RETURNING *`,
      vals
    );
    if (result.rows.length === 0) throw new Error(`Customer not found: ${id}`);
    return this.mapRow(result.rows[0]);
  }

  async deactivateCustomer(tenantId: string, id: string): Promise<void> {
    await query('UPDATE customers SET is_active = false, updated_at = NOW() WHERE tenant_id = $1 AND id = $2', [tenantId, id]);
  }

  async searchCustomers(tenantId: string, prefix: string): Promise<Customer[]> {
    const result = await query(
      `SELECT id, tenant_id, account_head_id, name, address, owner_name, phone, stn, ntn, cnic, is_active, created_at, updated_at
       FROM customers WHERE tenant_id = $1 AND name ILIKE $2 AND is_active = true ORDER BY name LIMIT 20`,
      [tenantId, `${prefix}%`]
    );
    return result.rows.map(r => this.mapRow(r));
  }

  private mapRow(r: any): Customer {
    return {
      id: r.id, tenantId: r.tenant_id, accountHeadId: r.account_head_id || '',
      name: r.name, address: r.address || '', ownerName: r.owner_name || '',
      phone: r.phone || '', stn: r.stn || '', ntn: r.ntn || '', cnic: r.cnic || '',
      isActive: r.is_active, createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at),
    };
  }
}
