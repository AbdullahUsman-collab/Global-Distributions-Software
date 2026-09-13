/**
 * PostgreSQL Customer Adapter
 * Persistent customer storage.
 *
 * RULE: Persistence ONLY — no business logic, no authorization.
 * RULE: All queries are scoped by tenantId.
 */

import { randomBytes } from 'crypto';
import { Customer, CreateCustomerDTO, UpdateCustomerDTO } from '../../../domain/types/customer.js';
import { ICustomerRepository } from '../../../domain/repositories/ICustomerRepository.js';
import { CreateAccountHeadDTO } from '../../../domain/types/coa.js';
import { PostgresCOAAdapter } from './PostgresCOAAdapter.js';
import { query } from '../pool.js';

function uuid(): string { return randomBytes(16).toString('hex'); }

/**
 * PostgreSQL implementation of ICustomerRepository.
 */
export class PostgresCustomerAdapter implements ICustomerRepository {

  private coaAdapter: PostgresCOAAdapter | null = null;

  /**
   * Inject the COA adapter (optional so existing constructor call sites keep working).
   * Required for the AR auto-create behavior on customer creation.
   */
  setCoaAdapter(coaAdapter: PostgresCOAAdapter): void {
    this.coaAdapter = coaAdapter;
  }

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

    // AR auto-create: a customer without an explicit AR posting account gets a
    // dedicated sub-account under the Accounts Receivable parent (11200).
    // Mirrors MockCustomerAdapter.createCustomer — CreateCustomerDTO contract:
    // "accountHeadId: Reference to existing AR posting AccountHead, or null to auto-create".
    // Without this, account_head_id stays NULL and sale posting fails the
    // voucher_lines_account_id_fkey constraint (empty-string account id).
    let accountHeadId = dto.accountHeadId || '';
    if (!accountHeadId) {
      if (!this.coaAdapter) {
        throw new Error('COA adapter not injected — cannot auto-create customer AR account');
      }
      const accounts = await this.coaAdapter.getAccountsByTenantId(tenantId);
      const parentAccount = accounts.find(a => a.accountCode === '11200');
      if (!parentAccount) {
        throw new Error('Accounts Receivable parent account (11200) not found');
      }
      // Next sub-account code under 112xx not already used
      const existingCodes = accounts
        .filter(a => a.accountCode.startsWith('112') && a.level === 4)
        .map(a => parseInt(a.accountCode, 10))
        .filter(n => !isNaN(n));
      const nextCode = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 11201;

      const accountDto: CreateAccountHeadDTO = {
        accountCode: String(nextCode),
        accountName: dto.name,
        parentId: parentAccount.id,
        level: 4,
        accountType: 'ASSET',
        controlCategory: 'RECEIVABLE',
        legacyMainHeadNo: 500,
        accountEffect: 'Balance Sheet',
        address: dto.address,
        ownerName: dto.ownerName,
        phone: dto.phone,
        stn: dto.stn,
        ntn: dto.ntn,
        cnic: dto.cnic,
      };
      const createdAccount = await this.coaAdapter.createAccount(tenantId, accountDto);
      accountHeadId = createdAccount.id;
    }

    const result = await query(
      `INSERT INTO customers (id, tenant_id, account_head_id, name, address, owner_name, phone, stn, ntn, cnic, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [id, tenantId, accountHeadId || null, dto.name, dto.address || '', dto.ownerName || '',
       dto.phone || '', dto.stn || '', dto.ntn || '', dto.cnic || '', dto.isActive ?? true]
    );
    return this.mapRow(result.rows[0]);
  }

  private static CUSTOMER_UPDATE_COLUMNS: Record<string, string> = {
    name: 'name',
    address: 'address',
    ownerName: 'owner_name',
    phone: 'phone',
    stn: 'stn',
    ntn: 'ntn',
    cnic: 'cnic',
    isActive: 'is_active',
  };

  async updateCustomer(tenantId: string, id: string, dto: UpdateCustomerDTO): Promise<Customer> {
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;
    for (const [k, v] of Object.entries(dto)) {
      const col = PostgresCustomerAdapter.CUSTOMER_UPDATE_COLUMNS[k];
      if (col && v !== undefined) {
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