/**
 * PostgreSQL Supplier Adapter
 * Persistent supplier storage.
 *
 * RULE: Persistence ONLY — no business logic, no authorization.
 * RULE: All queries are scoped by tenantId.
 */

import { randomBytes } from 'crypto';
import { Supplier, CreateSupplierDTO, UpdateSupplierDTO } from '../../../domain/types/supplier.js';
import { ISupplierRepository } from '../../../domain/repositories/ISupplierRepository.js';
import { CreateAccountHeadDTO } from '../../../domain/types/coa.js';
import { PostgresCOAAdapter } from './PostgresCOAAdapter.js';
import { query } from '../pool.js';

function uuid(): string { return randomBytes(16).toString('hex'); }

/**
 * PostgreSQL implementation of ISupplierRepository.
 */
export class PostgresSupplierAdapter implements ISupplierRepository {

  private coaAdapter: PostgresCOAAdapter | null = null;

  /**
   * Inject the COA adapter (optional so existing constructor call sites keep working).
   * Required for the AP auto-create behavior on supplier creation.
   */
  setCoaAdapter(coaAdapter: PostgresCOAAdapter): void {
    this.coaAdapter = coaAdapter;
  }

  async getSuppliers(tenantId: string): Promise<Supplier[]> {
    const result = await query(
      `SELECT id, tenant_id, name, contact_person, phone, email, address, city,
              account_head_id, tax_registration_number, payment_terms, credit_limit, is_active, created_at, updated_at
       FROM suppliers WHERE tenant_id = $1 ORDER BY name`,
      [tenantId]
    );
    return result.rows.map(r => this.mapRow(r));
  }

  async getById(id: string, tenantId: string): Promise<Supplier | null> {
    const result = await query(
      `SELECT id, tenant_id, name, contact_person, phone, email, address, city,
              account_head_id, tax_registration_number, payment_terms, credit_limit, is_active, created_at, updated_at
       FROM suppliers WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async getByAccountHeadId(accountHeadId: string, tenantId: string): Promise<Supplier | null> {
    const result = await query(
      `SELECT id, tenant_id, name, contact_person, phone, email, address, city,
              account_head_id, tax_registration_number, payment_terms, credit_limit, is_active, created_at, updated_at
       FROM suppliers WHERE account_head_id = $1 AND tenant_id = $2`,
      [accountHeadId, tenantId]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async create(supplier: CreateSupplierDTO, tenantId: string): Promise<Supplier> {
    const id = uuid();

    // AP auto-create: a supplier without an explicit AP posting account gets a
    // dedicated sub-account under the Accounts Payable parent (21100).
    // Mirrors MockSupplierAdapter.create (controlCategory='PAYABLE') and the
    // PostgresCustomerAdapter AR auto-create. Without this, account_head_id stays
    // NULL and purchase posting fails the voucher_lines_account_id_fkey
    // constraint (empty-string account id).
    let accountHeadId: string | null = null;
    if (this.coaAdapter) {
      const accounts = await this.coaAdapter.getAccountsByTenantId(tenantId);
      const parentAccount = accounts.find(a => a.accountCode === '21100');
      if (!parentAccount) {
        throw new Error('Accounts Payable parent account (21100) not found');
      }
      // Next sub-account code under 211xx not already used
      const existingCodes = accounts
        .filter(a => a.accountCode.startsWith('211') && a.level === 4)
        .map(a => parseInt(a.accountCode, 10))
        .filter(n => !isNaN(n));
      const nextCode = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 21101;

      const accountDto: CreateAccountHeadDTO = {
        accountCode: String(nextCode),
        accountName: supplier.name,
        parentId: parentAccount.id,
        level: 4,
        accountType: 'LIABILITY',
        controlCategory: 'PAYABLE',
        legacyMainHeadNo: 8000,
        accountEffect: 'Balance Sheet',
        address: supplier.address,
        ownerName: supplier.contactPerson,
        phone: supplier.phone,
        stn: supplier.taxRegistrationNumber,
      };
      const createdAccount = await this.coaAdapter.createAccount(tenantId, accountDto);
      accountHeadId = createdAccount.id;
    }

    const result = await query(
      `INSERT INTO suppliers (id, tenant_id, name, contact_person, phone, email, address, city,
         account_head_id, tax_registration_number, payment_terms, credit_limit, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true)
       RETURNING *`,
      [id, tenantId, supplier.name, supplier.contactPerson || null, supplier.phone || null,
       supplier.email || null, supplier.address || null, supplier.city || null,
       accountHeadId, supplier.taxRegistrationNumber || null, supplier.paymentTerms || null,
       supplier.creditLimit || 0]
    );
    return this.mapRow(result.rows[0]);
  }

  private static SUPPLIER_UPDATE_COLUMNS: Record<string, string> = {
    name: 'name',
    contactPerson: 'contact_person',
    phone: 'phone',
    email: 'email',
    address: 'address',
    city: 'city',
    taxRegistrationNumber: 'tax_registration_number',
    paymentTerms: 'payment_terms',
    creditLimit: 'credit_limit',
    isActive: 'is_active',
  };

  async update(id: string, supplier: UpdateSupplierDTO, tenantId: string): Promise<Supplier | null> {
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;
    for (const [k, v] of Object.entries(supplier)) {
      const col = PostgresSupplierAdapter.SUPPLIER_UPDATE_COLUMNS[k];
      if (col && v !== undefined) {
        sets.push(`${col} = $${idx++}`);
        vals.push(v);
      }
    }
    if (sets.length === 0) return this.getById(id, tenantId);
    sets.push('updated_at = NOW()');
    vals.push(id, tenantId);
    const result = await query(
      `UPDATE suppliers SET ${sets.join(', ')} WHERE id = $${idx++} AND tenant_id = $${idx} RETURNING *`,
      vals
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async deactivate(id: string, tenantId: string): Promise<boolean> {
    const result = await query(
      'UPDATE suppliers SET is_active = false, updated_at = NOW() WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async search(searchQuery: string, tenantId: string): Promise<Supplier[]> {
    const result = await query(
      `SELECT id, tenant_id, name, contact_person, phone, email, address, city,
              account_head_id, tax_registration_number, payment_terms, credit_limit, is_active, created_at, updated_at
       FROM suppliers WHERE tenant_id = $1 AND (name ILIKE $2 OR contact_person ILIKE $2) AND is_active = true
       ORDER BY name LIMIT 20`,
      [tenantId, `%${searchQuery}%`]
    );
    return result.rows.map(r => this.mapRow(r));
  }

  private mapRow(r: any): Supplier {
    return {
      id: r.id, tenantId: r.tenant_id, name: r.name, contactPerson: r.contact_person || '',
      phone: r.phone || '', email: r.email || '', address: r.address || '',
      city: r.city || '', accountHeadId: r.account_head_id || '',
      taxRegistrationNumber: r.tax_registration_number || '', paymentTerms: r.payment_terms || '',
      creditLimit: Number(r.credit_limit), isActive: r.is_active,
      createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at),
    };
  }
}