/**
 * PostgreSQL COA Adapter
 * Persistent chart of accounts storage.
 *
 * RULE: Persistence ONLY — no business logic, no authorization.
 * RULE: All queries are scoped by tenantId.
 */

import { AccountHead, CreateAccountHeadDTO, UpdateAccountHeadDTO } from '../../../domain/types/coa';
import { ICOARepository } from '../../../domain/repositories/ICOARepository';
import { deriveNormalBalance } from '../../../domain/types/coa';
import { query } from '../pool.js';

/**
 * PostgreSQL implementation of ICOARepository.
 */
export class PostgresCOAAdapter implements ICOARepository {
  async getAccountsByTenantId(tenantId: string): Promise<AccountHead[]> {
    const result = await query(
      `SELECT id, tenant_id, account_code, account_name, parent_id, level,
              account_type, normal_balance, is_posting, is_summary, is_active,
              control_category, legacy_main_head_no, account_effect,
              address, owner_name, phone, stn, ntn, cnic
       FROM accounts
       WHERE tenant_id = $1
       ORDER BY account_code`,
      [tenantId]
    );
    return result.rows.map(r => this.mapRow(r));
  }

  async getAccountById(tenantId: string, id: string): Promise<AccountHead | null> {
    const result = await query(
      `SELECT id, tenant_id, account_code, account_name, parent_id, level,
              account_type, normal_balance, is_posting, is_summary, is_active,
              control_category, legacy_main_head_no, account_effect,
              address, owner_name, phone, stn, ntn, cnic
       FROM accounts
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, id]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async getAccountByCode(tenantId: string, code: string): Promise<AccountHead | null> {
    const result = await query(
      `SELECT id, tenant_id, account_code, account_name, parent_id, level,
              account_type, normal_balance, is_posting, is_summary, is_active,
              control_category, legacy_main_head_no, account_effect,
              address, owner_name, phone, stn, ntn, cnic
       FROM accounts
       WHERE tenant_id = $1 AND account_code = $2`,
      [tenantId, code]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async createAccount(tenantId: string, dto: CreateAccountHeadDTO): Promise<AccountHead> {
    const id = `acct-${Date.now()}`;
    const normalBalance = deriveNormalBalance(dto.accountType);
    const isPosting = dto.level === 4;
    const isSummary = !isPosting;

    const result = await query(
      `INSERT INTO accounts (id, tenant_id, account_code, account_name, parent_id, level,
         account_type, normal_balance, is_posting, is_summary, is_active,
         control_category, legacy_main_head_no, account_effect,
         address, owner_name, phone, stn, ntn, cnic)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [
        id, tenantId, dto.accountCode, dto.accountName, dto.parentId, dto.level,
        dto.accountType, normalBalance, isPosting, isSummary, dto.isActive ?? true,
        dto.controlCategory ?? null, dto.legacyMainHeadNo ?? null, dto.accountEffect ?? null,
        dto.address ?? null, dto.ownerName ?? null, dto.phone ?? null,
        dto.stn ?? null, dto.ntn ?? null, dto.cnic ?? null,
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  private static ACCOUNT_UPDATE_COLUMNS: Record<string, string> = {
    accountCode: 'account_code',
    accountName: 'account_name',
    accountType: 'account_type',
    parentAccountId: 'parent_account_id',
    description: 'description',
    isActive: 'is_active',
  };

  async updateAccount(tenantId: string, id: string, dto: UpdateAccountHeadDTO): Promise<AccountHead> {
    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, val] of Object.entries(dto)) {
      const col = PostgresCOAAdapter.ACCOUNT_UPDATE_COLUMNS[key];
      if (col && val !== undefined) {
        sets.push(`${col} = $${idx++}`);
        values.push(val);
      }
    }
    sets.push(`updated_at = NOW()`);
    values.push(tenantId, id);

    const result = await query(
      `UPDATE accounts SET ${sets.join(', ')} WHERE tenant_id = $${idx++} AND id = $${idx}
       RETURNING *`,
      values
    );
    if (result.rows.length === 0) throw new Error(`Account not found: ${id}`);
    return this.mapRow(result.rows[0]);
  }

  async deactivateAccount(tenantId: string, id: string): Promise<void> {
    await query(
      'UPDATE accounts SET is_active = false, updated_at = NOW() WHERE tenant_id = $1 AND id = $2',
      [tenantId, id]
    );
  }

  private camelToSnake(key: string): string {
    return key.replace(/([A-Z])/g, '_$1').toLowerCase();
  }

  private mapRow(row: any): AccountHead {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      accountCode: row.account_code,
      accountName: row.account_name,
      parentId: row.parent_id,
      level: row.level,
      accountType: row.account_type,
      normalBalance: row.normal_balance,
      isPosting: row.is_posting,
      isSummary: row.is_summary,
      isActive: row.is_active,
      controlCategory: row.control_category,
      legacyMainHeadNo: row.legacy_main_head_no,
      accountEffect: row.account_effect,
      address: row.address,
      ownerName: row.owner_name,
      phone: row.phone,
      stn: row.stn,
      ntn: row.ntn,
      cnic: row.cnic,
    };
  }
}
