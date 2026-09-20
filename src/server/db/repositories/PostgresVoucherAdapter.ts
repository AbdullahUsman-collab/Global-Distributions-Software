/**
 * PostgreSQL Voucher Adapter
 * Persistent voucher and ledger storage.
 *
 * RULE: Persistence ONLY — no business logic, no authorization.
 * RULE: All queries are scoped by tenantId.
 */

import { randomBytes } from 'crypto';
import { VoucherHeader, VoucherLine, VoucherStatus, VoucherType, LedgerEntry, CreateVoucherDTO, UpdateVoucherDTO } from '../../../domain/types/voucher.js';
import { IVoucherRepository } from '../../../domain/repositories/IVoucherRepository.js';
import { query, getClient } from '../pool.js';

function uuid(): string {
  return randomBytes(16).toString('hex');
}

/**
 * PostgreSQL implementation of IVoucherRepository.
 */
export class PostgresVoucherAdapter implements IVoucherRepository {

  async getVouchersByTenantId(
    tenantId: string,
    filters?: { voucherType?: VoucherType; status?: VoucherStatus }
  ): Promise<VoucherHeader[]> {
    let sql = `SELECT id, tenant_id, voucher_number, voucher_type, status, date, narration, created_by, created_at, updated_at
               FROM vouchers WHERE tenant_id = $1`;
    const params: any[] = [tenantId];
    let idx = 2;

    if (filters?.voucherType) {
      sql += ` AND voucher_type = $${idx++}`;
      params.push(filters.voucherType);
    }
    if (filters?.status) {
      sql += ` AND status = $${idx++}`;
      params.push(filters.status);
    }
    sql += ` ORDER BY voucher_number DESC`;

    const result = await query(sql, params);
    return result.rows.map(r => this.mapVoucherRow(r));
  }

  async getVoucherById(tenantId: string, id: string): Promise<VoucherHeader | null> {
    const result = await query(
      `SELECT id, tenant_id, voucher_number, voucher_type, status, date, narration, created_by, created_at, updated_at
       FROM vouchers WHERE tenant_id = $1 AND id = $2`,
      [tenantId, id]
    );
    if (result.rows.length === 0) return null;
    return this.mapVoucherRow(result.rows[0]);
  }

  async getNextVoucherNumber(tenantId: string): Promise<number> {
    const result = await query(
      `SELECT COALESCE(MAX(voucher_number), 0) + 1 AS next_num
       FROM vouchers WHERE tenant_id = $1`,
      [tenantId]
    );
    return Number(result.rows[0].next_num);
  }

  /**
   * Coerce a numeric that must be finite before it reaches a DECIMAL column.
   * Postgres numeric silently stores the literal 'NaN' string for JS NaN
   * (pg serializes NaN as 'NaN'), which then poisons every downstream SUM
   * and crashes unguarded .toLocaleString() calls in the UI (outage of
   * 2026-09-16, voucher #17). null/undefined/'' map to null (column default);
   * any other non-finite value maps to null instead of being sent.
   */
  private static finNum(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  async getVoucherLines(tenantId: string, voucherId: string): Promise<VoucherLine[]> {
    const result = await query(
      `SELECT id, voucher_id, tenant_id, account_id, description, debit, credit, line_order,
              contra_account_id, quantity, product_id, branch, st_inv_no, st_rate, st_amount, amt_excl_std,
              rate, purchase_rate, retail_price, margin_percent, trade_discount_percent, trade_offer_percent,
              special_discount_percent, min_quantity, hs_code, gst_type, fed_percent, further_tax_percent,
              advance_tax_percent
       FROM voucher_lines
       WHERE tenant_id = $1 AND voucher_id = $2
       ORDER BY line_order`,
      [tenantId, voucherId]
    );
    return result.rows.map(r => this.mapLineRow(r));
  }

  async getVoucherLinesByVoucherIds(tenantId: string, voucherIds: string[]): Promise<VoucherLine[]> {
    if (voucherIds.length === 0) return [];
    const result = await query(
      `SELECT id, voucher_id, tenant_id, account_id, description, debit, credit, line_order,
              contra_account_id, quantity, product_id, branch, st_inv_no, st_rate, st_amount, amt_excl_std,
              rate, purchase_rate, retail_price, margin_percent, trade_discount_percent, trade_offer_percent,
              special_discount_percent, min_quantity, hs_code, gst_type, fed_percent, further_tax_percent,
              advance_tax_percent
       FROM voucher_lines
       WHERE tenant_id = $1 AND voucher_id = ANY($2)
       ORDER BY voucher_id, line_order`,
      [tenantId, voucherIds]
    );
    return result.rows.map(r => this.mapLineRow(r));
  }

  async createVoucher(tenantId: string, dto: CreateVoucherDTO, createdBy: string): Promise<VoucherHeader> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const voucherId = uuid();
      const voucherNumber = await this.getNextVoucherNumberTx(client, tenantId);

      // Build account code→id map for this tenant (services pass codes like '41101', DB uses IDs like 'coa-41101')
      const acctMap = await this.buildAccountCodeMap(client, tenantId);

      await client.query(
        `INSERT INTO vouchers (id, tenant_id, voucher_number, voucher_type, status, date, narration, created_by)
         VALUES ($1, $2, $3, $4, 'DRAFT', $5, $6, $7)`,
        [voucherId, tenantId, voucherNumber, dto.voucherType, dto.date, dto.narration, createdBy]
      );

      for (let i = 0; i < dto.lines.length; i++) {
        const line = dto.lines[i];
        const resolvedAccountId = this.resolveAccountId(line.accountId, acctMap);
        await client.query(
          `INSERT INTO voucher_lines (id, voucher_id, tenant_id, account_id, description, debit, credit, line_order,
             contra_account_id, quantity, product_id, branch, st_inv_no, st_rate, st_amount, amt_excl_std,
             rate, purchase_rate, retail_price, margin_percent, trade_discount_percent, trade_offer_percent,
             special_discount_percent, min_quantity, hs_code, gst_type, fed_percent, further_tax_percent,
             advance_tax_percent)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)`,
          [
            uuid(), voucherId, tenantId, resolvedAccountId, line.description,
            PostgresVoucherAdapter.finNum(line.debit), PostgresVoucherAdapter.finNum(line.credit), i + 1,
            line.contraAccountId ? this.resolveAccountId(line.contraAccountId, acctMap) : null, PostgresVoucherAdapter.finNum(line.quantity),
            line.productId ?? null, line.branch ?? null,
            line.stInvNo ?? null, PostgresVoucherAdapter.finNum(line.stRate),
            PostgresVoucherAdapter.finNum(line.stAmount), PostgresVoucherAdapter.finNum(line.amtExclStd),
            PostgresVoucherAdapter.finNum(line.rate), PostgresVoucherAdapter.finNum(line.purchaseRate), PostgresVoucherAdapter.finNum(line.retailPrice),
            PostgresVoucherAdapter.finNum(line.marginPercent), PostgresVoucherAdapter.finNum(line.tradeDiscountPercent),
            PostgresVoucherAdapter.finNum(line.tradeOfferPercent), PostgresVoucherAdapter.finNum(line.specialDiscountPercent),
            PostgresVoucherAdapter.finNum(line.minQuantity), line.hsCode ?? null, line.gstType ?? null,
            PostgresVoucherAdapter.finNum(line.fedPercent), PostgresVoucherAdapter.finNum(line.furtherTaxPercent),
            PostgresVoucherAdapter.finNum(line.advanceTaxPercent),
          ]
        );
      }

      await client.query('COMMIT');
      return (await this.getVoucherById(tenantId, voucherId))!;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async updateVoucher(tenantId: string, id: string, dto: UpdateVoucherDTO): Promise<VoucherHeader> {
    const existing = await this.getVoucherById(tenantId, id);
    if (!existing) throw new Error(`Voucher not found: ${id}`);
    if (existing.status === 'POSTED') throw new Error('Cannot modify a POSTED voucher');

    const client = await getClient();
    try {
      await client.query('BEGIN');

      if (dto.date || dto.narration) {
        const sets: string[] = [];
        const vals: any[] = [];
        let idx = 1;
        if (dto.date) { sets.push(`date = $${idx++}`); vals.push(dto.date); }
        if (dto.narration) { sets.push(`narration = $${idx++}`); vals.push(dto.narration); }
        sets.push('updated_at = NOW()');
        vals.push(tenantId, id);
        await client.query(`UPDATE vouchers SET ${sets.join(', ')} WHERE tenant_id = $${idx++} AND id = $${idx}`, vals);
      }

      if (dto.lines) {
        const acctMap = await this.buildAccountCodeMap(client, tenantId);
        await client.query('DELETE FROM voucher_lines WHERE tenant_id = $1 AND voucher_id = $2', [tenantId, id]);
        for (let i = 0; i < dto.lines.length; i++) {
          const line = dto.lines[i];
          const resolvedAccountId = this.resolveAccountId(line.accountId, acctMap);
          await client.query(
            `INSERT INTO voucher_lines (id, voucher_id, tenant_id, account_id, description, debit, credit, line_order,
               contra_account_id, quantity, product_id, branch, st_inv_no, st_rate, st_amount, amt_excl_std,
               rate, purchase_rate, retail_price, margin_percent, trade_discount_percent, trade_offer_percent,
               special_discount_percent, min_quantity, hs_code, gst_type, fed_percent, further_tax_percent,
               advance_tax_percent)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)`,
            [
              uuid(), id, tenantId, resolvedAccountId, line.description,
              PostgresVoucherAdapter.finNum(line.debit), PostgresVoucherAdapter.finNum(line.credit), i + 1,
              line.contraAccountId ? this.resolveAccountId(line.contraAccountId, acctMap) : null, PostgresVoucherAdapter.finNum(line.quantity),
              line.productId ?? null, line.branch ?? null,
              line.stInvNo ?? null, PostgresVoucherAdapter.finNum(line.stRate),
              PostgresVoucherAdapter.finNum(line.stAmount), PostgresVoucherAdapter.finNum(line.amtExclStd),
              PostgresVoucherAdapter.finNum(line.rate), PostgresVoucherAdapter.finNum(line.purchaseRate), PostgresVoucherAdapter.finNum(line.retailPrice),
              PostgresVoucherAdapter.finNum(line.marginPercent), PostgresVoucherAdapter.finNum(line.tradeDiscountPercent),
              PostgresVoucherAdapter.finNum(line.tradeOfferPercent), PostgresVoucherAdapter.finNum(line.specialDiscountPercent),
              PostgresVoucherAdapter.finNum(line.minQuantity), line.hsCode ?? null, line.gstType ?? null,
              PostgresVoucherAdapter.finNum(line.fedPercent), PostgresVoucherAdapter.finNum(line.furtherTaxPercent),
              PostgresVoucherAdapter.finNum(line.advanceTaxPercent),
            ]
          );
        }
      }

      await client.query('COMMIT');
      return (await this.getVoucherById(tenantId, id))!;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async deleteVoucher(tenantId: string, id: string): Promise<void> {
    const existing = await this.getVoucherById(tenantId, id);
    if (!existing) throw new Error(`Voucher not found: ${id}`);
    if (existing.status === 'POSTED') throw new Error('Cannot delete a POSTED voucher');

    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM voucher_lines WHERE tenant_id = $1 AND voucher_id = $2', [tenantId, id]);
      await client.query('DELETE FROM vouchers WHERE tenant_id = $1 AND id = $2', [tenantId, id]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async postVoucher(tenantId: string, id: string): Promise<VoucherHeader> {
    const existing = await this.getVoucherById(tenantId, id);
    if (!existing) throw new Error(`Voucher not found: ${id}`);
    if (existing.status === 'POSTED') throw new Error('Voucher already posted');

    const lines = await this.getVoucherLines(tenantId, id);
    // NaN-proof balance check: a NaN debit/credit would make the difference NaN,
    // and `NaN > 0.005` is false — NaN vouchers would silently "balance" and post.
    const totalDebit = lines.reduce((s, l) => s + (Number.isFinite(l.debit) ? l.debit : 0), 0);
    const totalCredit = lines.reduce((s, l) => s + (Number.isFinite(l.credit) ? l.credit : 0), 0);
    if (!Number.isFinite(totalDebit) || !Number.isFinite(totalCredit) || Math.abs(totalDebit - totalCredit) > 0.005) {
      throw new Error(`Voucher does not balance: debit=${totalDebit}, credit=${totalCredit}`);
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE vouchers SET status = 'POSTED', updated_at = NOW() WHERE tenant_id = $1 AND id = $2`,
        [tenantId, id]
      );

      // Build a reverse map: DB account_id → account_code
      // Voucher lines store DB IDs (e.g., 'coa-41101'), but ledger_entries
      // should store account codes (e.g., '41101') to match the mock adapter
      // and the LedgerEntry spec ("Account code, 5-digit string").
      const acctMap = await this.buildAccountCodeMap(client, tenantId);
      const reverseMap = new Map<string, string>();
      for (const [code, dbId] of acctMap) {
        reverseMap.set(dbId, code);
      }

      for (const line of lines) {
        // Resolve DB ID back to account code for ledger storage
        const ledgerAccountId = reverseMap.get(line.accountId) || line.accountId;
        await client.query(
          `INSERT INTO ledger_entries (id, tenant_id, voucher_id, voucher_line_id, account_id, debit, credit, entry_date, voucher_type, voucher_number, narration)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [uuid(), tenantId, id, line.id, ledgerAccountId, line.debit, line.credit, existing.date, existing.voucherType, existing.voucherNumber, line.description]
        );
      }

      await client.query('COMMIT');
      return (await this.getVoucherById(tenantId, id))!;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getLedgerEntries(
    tenantId: string,
    filters?: { accountId?: string; startDate?: string; endDate?: string; voucherType?: VoucherType; status?: VoucherStatus }
  ): Promise<LedgerEntry[]> {
    let sql = `SELECT le.id, le.tenant_id, le.voucher_id, le.voucher_line_id, le.account_id, le.debit, le.credit, le.entry_date, le.voucher_type, le.voucher_number, le.narration
               FROM ledger_entries le`;
    const params: any[] = [tenantId];
    let idx = 2;

    if (filters?.status) {
      sql += ` INNER JOIN vouchers vh ON vh.id = le.voucher_id AND vh.tenant_id = le.tenant_id`;
    }

    sql += ` WHERE le.tenant_id = $1`;

    if (filters?.accountId) { sql += ` AND le.account_id = $${idx++}`; params.push(filters.accountId); }
    if (filters?.startDate) { sql += ` AND le.entry_date >= $${idx++}`; params.push(filters.startDate); }
    if (filters?.endDate) { sql += ` AND le.entry_date <= $${idx++}`; params.push(filters.endDate); }
    if (filters?.voucherType) { sql += ` AND le.voucher_type = $${idx++}`; params.push(filters.voucherType); }
    if (filters?.status) { sql += ` AND vh.status = $${idx++}`; params.push(filters.status); }

    sql += ` ORDER BY le.entry_date, le.voucher_number`;
    const result = await query(sql, params);
    return result.rows.map(r => this.mapLedgerRow(r));
  }

  async getLedgerForAccount(
    tenantId: string,
    accountId: string,
    filters?: { startDate?: string; endDate?: string }
  ): Promise<(LedgerEntry & { balance: number })[]> {
    const entries = await this.getLedgerEntries(tenantId, {
      accountId,
      startDate: filters?.startDate,
      endDate: filters?.endDate,
    });

    let running = 0;
    return entries.map(e => {
      running += Number(e.debit) - Number(e.credit);
      return { ...e, balance: running };
    });
  }

  private async getNextVoucherNumberTx(client: any, tenantId: string): Promise<number> {
    const r = await client.query(
      `SELECT COALESCE(MAX(voucher_number), 0) + 1 AS next_num FROM (SELECT voucher_number FROM vouchers WHERE tenant_id = $1 FOR UPDATE) sub`,
      [tenantId]
    );
    return Number(r.rows[0].next_num);
  }

  /**
   * Build a map from account_code → account_id for the given tenant.
   * Services pass codes like '41101', but the DB uses IDs like 'coa-41101'.
   */
  private async buildAccountCodeMap(client: any, tenantId: string): Promise<Map<string, string>> {
    const r = await client.query(
      `SELECT id, account_code FROM accounts WHERE tenant_id = $1`,
      [tenantId]
    );
    const map = new Map<string, string>();
    for (const row of r.rows) {
      map.set(row.account_code, row.id);
    }
    return map;
  }

  /**
   * Resolve an account reference to a DB account_id.
   * If it's already a valid ID (starts with 'coa-'), return as-is.
   * If it's a code (e.g., '41101'), look up in the map.
   */
  private resolveAccountId(ref: string, codeMap: Map<string, string>): string {
    if (!ref) return ref;
    if (ref.startsWith('coa-')) return ref;
    return codeMap.get(ref) || ref;
  }

  private mapVoucherRow(r: any): VoucherHeader {
    return {
      id: r.id,
      tenantId: r.tenant_id,
      voucherNumber: r.voucher_number,
      voucherType: r.voucher_type,
      status: r.status,
      date: typeof r.date === 'string' ? r.date : r.date.toISOString().split('T')[0],
      narration: r.narration || '',
      createdBy: r.created_by,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
    };
  }

  private mapLineRow(r: any): VoucherLine {
    return {
      id: r.id,
      voucherId: r.voucher_id,
      tenantId: r.tenant_id,
      accountId: r.account_id,
      description: r.description || '',
      // Read-side guard: legacy/poisoned rows storing numeric 'NaN' must never
      // leak NaN into aggregates or JSON responses (serializes as null).
      debit: Number.isFinite(Number(r.debit)) ? Number(r.debit) : 0,
      credit: Number.isFinite(Number(r.credit)) ? Number(r.credit) : 0,
      lineOrder: r.line_order,
      contraAccountId: r.contra_account_id,
      quantity: r.quantity != null ? Number(r.quantity) : undefined,
      productId: r.product_id,
      branch: r.branch,
      stInvNo: r.st_inv_no,
      stRate: r.st_rate != null ? Number(r.st_rate) : undefined,
      stAmount: r.st_amount != null ? Number(r.st_amount) : undefined,
      amtExclStd: r.amt_excl_std != null ? Number(r.amt_excl_std) : undefined,
      rate: r.rate != null ? Number(r.rate) : undefined,
      purchaseRate: r.purchase_rate != null ? Number(r.purchase_rate) : undefined,
      retailPrice: r.retail_price != null ? Number(r.retail_price) : undefined,
      marginPercent: r.margin_percent != null ? Number(r.margin_percent) : undefined,
      tradeDiscountPercent: r.trade_discount_percent != null ? Number(r.trade_discount_percent) : undefined,
      tradeOfferPercent: r.trade_offer_percent != null ? Number(r.trade_offer_percent) : undefined,
      specialDiscountPercent: r.special_discount_percent != null ? Number(r.special_discount_percent) : undefined,
      minQuantity: r.min_quantity != null ? Number(r.min_quantity) : undefined,
      hsCode: r.hs_code,
      gstType: r.gst_type,
      fedPercent: r.fed_percent != null ? Number(r.fed_percent) : undefined,
      furtherTaxPercent: r.further_tax_percent != null ? Number(r.further_tax_percent) : undefined,
      advanceTaxPercent: r.advance_tax_percent != null ? Number(r.advance_tax_percent) : undefined,
    };
  }

  private mapLedgerRow(r: any): LedgerEntry {
    return {
      id: r.id,
      tenantId: r.tenant_id,
      voucherId: r.voucher_id,
      voucherLineId: r.voucher_line_id,
      accountId: r.account_id,
      debit: Number(r.debit),
      credit: Number(r.credit),
      entryDate: typeof r.entry_date === 'string' ? r.entry_date : r.entry_date.toISOString().split('T')[0],
      voucherType: r.voucher_type,
      voucherNumber: r.voucher_number,
      narration: r.narration || '',
    };
  }
}