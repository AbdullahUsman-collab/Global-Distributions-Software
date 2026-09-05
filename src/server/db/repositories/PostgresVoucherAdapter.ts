/**
 * PostgreSQL Voucher Adapter
 * Persistent voucher and ledger storage.
 *
 * RULE: Persistence ONLY — no business logic, no authorization.
 * RULE: All queries are scoped by tenantId.
 */

import { randomBytes } from 'crypto';
import { VoucherHeader, VoucherLine, VoucherStatus, VoucherType, LedgerEntry, CreateVoucherDTO, UpdateVoucherDTO } from '../../../domain/types/voucher';
import { IVoucherRepository } from '../../../domain/repositories/IVoucherRepository';
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

  async getVoucherLines(tenantId: string, voucherId: string): Promise<VoucherLine[]> {
    const result = await query(
      `SELECT id, voucher_id, tenant_id, account_id, description, debit, credit, line_order,
              contra_account_id, quantity, product_id, branch, st_inv_no, st_rate, st_amount, amt_excl_std
       FROM voucher_lines
       WHERE tenant_id = $1 AND voucher_id = $2
       ORDER BY line_order`,
      [tenantId, voucherId]
    );
    return result.rows.map(r => this.mapLineRow(r));
  }

  async createVoucher(tenantId: string, dto: CreateVoucherDTO, createdBy: string): Promise<VoucherHeader> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const voucherId = uuid();
      const voucherNumber = await this.getNextVoucherNumberTx(client, tenantId);

      await client.query(
        `INSERT INTO vouchers (id, tenant_id, voucher_number, voucher_type, status, date, narration, created_by)
         VALUES ($1, $2, $3, $4, 'DRAFT', $5, $6, $7)`,
        [voucherId, tenantId, voucherNumber, dto.voucherType, dto.date, dto.narration, createdBy]
      );

      for (let i = 0; i < dto.lines.length; i++) {
        const line = dto.lines[i];
        await client.query(
          `INSERT INTO voucher_lines (id, voucher_id, tenant_id, account_id, description, debit, credit, line_order,
             contra_account_id, quantity, product_id, branch, st_inv_no, st_rate, st_amount, amt_excl_std)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
          [
            uuid(), voucherId, tenantId, line.accountId, line.description,
            line.debit, line.credit, i + 1,
            line.contraAccountId ?? null, line.quantity ?? null,
            line.productId ?? null, line.branch ?? null,
            line.stInvNo ?? null, line.stRate ?? null,
            line.stAmount ?? null, line.amtExclStd ?? null,
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
        await client.query('DELETE FROM voucher_lines WHERE tenant_id = $1 AND voucher_id = $2', [tenantId, id]);
        for (let i = 0; i < dto.lines.length; i++) {
          const line = dto.lines[i];
          await client.query(
            `INSERT INTO voucher_lines (id, voucher_id, tenant_id, account_id, description, debit, credit, line_order,
               contra_account_id, quantity, product_id, branch, st_inv_no, st_rate, st_amount, amt_excl_std)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
            [
              uuid(), id, tenantId, line.accountId, line.description,
              line.debit, line.credit, i + 1,
              line.contraAccountId ?? null, line.quantity ?? null,
              line.productId ?? null, line.branch ?? null,
              line.stInvNo ?? null, line.stRate ?? null,
              line.stAmount ?? null, line.amtExclStd ?? null,
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
    const totalDebit = lines.reduce((s, l) => s + Number(l.debit), 0);
    const totalCredit = lines.reduce((s, l) => s + Number(l.credit), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.005) {
      throw new Error(`Voucher does not balance: debit=${totalDebit}, credit=${totalCredit}`);
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE vouchers SET status = 'POSTED', updated_at = NOW() WHERE tenant_id = $1 AND id = $2`,
        [tenantId, id]
      );

      for (const line of lines) {
        await client.query(
          `INSERT INTO ledger_entries (id, tenant_id, voucher_id, voucher_line_id, account_id, debit, credit, entry_date, voucher_type, voucher_number, narration)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [uuid(), tenantId, id, line.id, line.accountId, line.debit, line.credit, existing.date, existing.voucherType, existing.voucherNumber, line.description]
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
      sql += ` INNER JOIN voucher_headers vh ON vh.id = le.voucher_id AND vh.tenant_id = le.tenant_id`;
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
      `SELECT COALESCE(MAX(voucher_number), 0) + 1 AS next_num FROM vouchers WHERE tenant_id = $1 FOR UPDATE`,
      [tenantId]
    );
    return Number(r.rows[0].next_num);
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
      debit: Number(r.debit),
      credit: Number(r.credit),
      lineOrder: r.line_order,
      contraAccountId: r.contra_account_id,
      quantity: r.quantity != null ? Number(r.quantity) : undefined,
      productId: r.product_id,
      branch: r.branch,
      stInvNo: r.st_inv_no,
      stRate: r.st_rate != null ? Number(r.st_rate) : undefined,
      stAmount: r.st_amount != null ? Number(r.st_amount) : undefined,
      amtExclStd: r.amt_excl_std != null ? Number(r.amt_excl_std) : undefined,
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
