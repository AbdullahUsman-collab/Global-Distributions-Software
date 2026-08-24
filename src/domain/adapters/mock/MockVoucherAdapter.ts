/**
 * Mock Voucher Adapter
 * DEVELOPMENT ONLY — In-memory mock implementation of IVoucherRepository.
 *
 * Seeds sample vouchers for each active demo tenant using Level 4 COA accounts.
 * Posting generates LedgerEntry records with running balance computation.
 *
 * Source: audit/04_ACCOUNTING_ENGINE.md, audit/23_DATA_MODEL.md
 */

import {
  VoucherHeader,
  VoucherLine,
  VoucherType,
  VoucherStatus,
  LedgerEntry,
  CreateVoucherDTO,
  UpdateVoucherDTO,
  isBalanced,
} from '../../types/voucher';
import { IVoucherRepository } from '../../repositories/IVoucherRepository';

/* ─── Helpers ──────────────────────────────────────────────── */

let nextId = 5000;

function uid(): string {
  return `voucher-${nextId++}`;
}

function ledgerUid(): string {
  return `ledger-${nextId++}`;
}

/* ─── Tenant Seed Map ──────────────────────────────────────── */

const TENANT_IDS = [
  'tenant-demo-wholesale-001',
  'tenant-demo-distribution-002',
  'tenant-apex-trading-003',
];

/** Per-tenant stores */
const headersStore: Map<string, VoucherHeader[]> = new Map();
const linesStore: Map<string, VoucherLine[]> = new Map();
const ledgerStore: Map<string, LedgerEntry[]> = new Map();
const voucherCounter: Map<string, number> = new Map();

/* ─── Seed Data ────────────────────────────────────────────── */

/**
 * Build seed vouchers per tenant.
 * Uses Level 4 posting accounts from the COA seed (MockCOAAdapter).
 *
 * Account codes used:
 *   11101 = Cash in Hand
 *   11102 = Bank Account Main
 *   41101 = Wholesale Sales
 *   51101 = Material Purchases
 *   61101 = Rent Expense
 *   61103 = Office Salaries
 *   11301 = General Inventory
 */

interface SeedLine {
  accountId: string;
  description: string;
  debit: number;
  credit: number;
  contraAccountId?: string;
  quantity?: number;
  productId?: string;
  branch?: string;
  stInvNo?: string;
  stRate?: number;
  stAmount?: number;
  amtExclStd?: number;
}

interface SeedVoucher {
  voucherType: VoucherType;
  date: string;
  narration: string;
  lines: SeedLine[];
  posted: boolean;
}

function buildSeedVouchers(tenantId: string): SeedVoucher[] {
  return [
    // JV — Office rent allocation
    {
      voucherType: 'JV',
      date: '2026-08-01',
      narration: 'Office rent allocation for August',
      posted: true,
      lines: [
        { accountId: '61101', description: 'August office rent', debit: 50000, credit: 0 },
        { accountId: '11101', description: 'Cash paid for rent',   debit: 0,    credit: 50000, contraAccountId: '61101' },
      ],
    },
    // CV — Cash voucher (Cash ↔ Any) per audit/04_ACCOUNTING_ENGINE.md
    {
      voucherType: 'CV',
      date: '2026-08-03',
      narration: 'Cash received from walk-in customer',
      posted: true,
      lines: [
        { accountId: '11101', description: 'Cash received',       debit: 25000,  credit: 0 },
        { accountId: '41102', description: 'Retail sale income',  debit: 0,      credit: 25000, contraAccountId: '11101' },
      ],
    },
    // CR — Cash receipt (Cash ↔ Income/Party) per audit/04_ACCOUNTING_ENGINE.md
    {
      voucherType: 'CR',
      date: '2026-08-05',
      narration: 'Cash received from wholesale customer',
      posted: true,
      lines: [
        { accountId: '11101', description: 'Cash received',       debit: 120000, credit: 0 },
        { accountId: '41101', description: 'Wholesale sale income', debit: 0,     credit: 120000, contraAccountId: '11101' },
      ],
    },
    // CP — Cash payment (Expense/Party ↔ Cash) per audit/04_ACCOUNTING_ENGINE.md
    {
      voucherType: 'CP',
      date: '2026-08-07',
      narration: 'Cash payment for office supplies',
      posted: true,
      lines: [
        { accountId: '61102', description: 'Office supplies',     debit: 15000, credit: 0 },
        { accountId: '11101', description: 'Cash paid',            debit: 0,     credit: 15000, contraAccountId: '61102' },
      ],
    },
    // CPV — Legacy compatibility alias for CP
    {
      voucherType: 'CPV',
      date: '2026-08-10',
      narration: 'Cash purchase of inventory (legacy compat)',
      posted: true,
      lines: [
        { accountId: '11301', description: 'Inventory received',   debit: 80000, credit: 0 },
        { accountId: '11101', description: 'Cash paid',            debit: 0,     credit: 80000, contraAccountId: '11301' },
      ],
    },
    // PV — Payment Voucher (Any ↔ Bank) per audit/04_ACCOUNTING_ENGINE.md
    {
      voucherType: 'PV',
      date: '2026-08-12',
      narration: 'Bank payment to supplier for July purchases',
      posted: true,
      lines: [
        { accountId: '21100', description: 'Supplier payment',     debit: 350000, credit: 0 },
        { accountId: '11102', description: 'Bank transfer paid',   debit: 0,      credit: 350000, contraAccountId: '21100' },
      ],
    },
    // CRV — Legacy compatibility alias for CR
    {
      voucherType: 'CRV',
      date: '2026-08-15',
      narration: 'Bank transfer received from Apex Trading (legacy compat)',
      posted: true,
      lines: [
        { accountId: '11102', description: 'Bank transfer received', debit: 250000, credit: 0 },
        { accountId: '41101', description: 'Wholesale sale income',  debit: 0,      credit: 250000, contraAccountId: '11102' },
      ],
    },
    // BPV — Legacy compatibility alias for PV
    {
      voucherType: 'BPV',
      date: '2026-08-20',
      narration: 'Monthly salaries via bank transfer (legacy compat)',
      posted: true,
      lines: [
        { accountId: '61103', description: 'Office salaries August', debit: 180000, credit: 0 },
        { accountId: '11102', description: 'Bank transfer paid',     debit: 0,      credit: 180000, contraAccountId: '61103' },
      ],
    },
    // BRV — Legacy compatibility alias (preserved, not in authoritative source)
    {
      voucherType: 'BRV',
      date: '2026-08-22',
      narration: 'Bank receipt from distributor (legacy compat)',
      posted: true,
      lines: [
        { accountId: '11102', description: 'Bank receipt',          debit: 95000, credit: 0 },
        { accountId: '41101', description: 'Wholesale sale income', debit: 0,     credit: 95000, contraAccountId: '11102' },
      ],
    },
    // JV — Unposted draft voucher
    {
      voucherType: 'JV',
      date: '2026-08-24',
      narration: 'Adjustment entry — pending approval',
      posted: false,
      lines: [
        { accountId: '61102', description: 'Utility bill accrual', debit: 15000, credit: 0 },
        { accountId: '21201', description: 'Tax output liability',  debit: 0,    credit: 15000 },
      ],
    },
  ];
}

/* ─── Seed Execution ───────────────────────────────────────── */

for (const tid of TENANT_IDS) {
  const seeds = buildSeedVouchers(tid);
  const headers: VoucherHeader[] = [];
  const lines: VoucherLine[] = [];
  const ledger: LedgerEntry[] = [];
  let seq = 1;

  for (const seed of seeds) {
    const vid = uid();
    const vnum = seq++;

    const header: VoucherHeader = {
      id: vid,
      tenantId: tid,
      voucherNumber: vnum,
      voucherType: seed.voucherType,
      status: seed.posted ? 'POSTED' : 'DRAFT',
      date: seed.date,
      narration: seed.narration,
      createdBy: 'system',
      createdAt: new Date(seed.date),
      updatedAt: new Date(seed.date),
    };
    headers.push(header);

    let lineOrder = 0;
    for (const sl of seed.lines) {
      const lid = uid();
      const vline: VoucherLine = {
        id: lid,
        voucherId: vid,
        tenantId: tid,
        accountId: sl.accountId,
        description: sl.description,
        debit: sl.debit,
        credit: sl.credit,
        lineOrder: lineOrder++,
        contraAccountId: sl.contraAccountId,
        quantity: sl.quantity,
        productId: sl.productId,
        branch: sl.branch,
      };
      lines.push(vline);

      // If posted, generate ledger entry
      if (seed.posted) {
        ledger.push({
          id: ledgerUid(),
          tenantId: tid,
          voucherId: vid,
          voucherLineId: lid,
          accountId: sl.accountId,
          debit: sl.debit,
          credit: sl.credit,
          entryDate: seed.date,
          voucherType: seed.voucherType,
          voucherNumber: vnum,
          narration: sl.description,
        });
      }
    }
  }

  headersStore.set(tid, headers);
  linesStore.set(tid, lines);
  ledgerStore.set(tid, ledger);
  voucherCounter.set(tid, seq);
}

/* ─── Adapter Implementation ───────────────────────────────── */

/**
 * Mock implementation of IVoucherRepository.
 * DEVELOPMENT ONLY — Do not use in production.
 */
export class MockVoucherAdapter implements IVoucherRepository {

  /* ─── Voucher Header Queries ───────────────────────────── */

  async getVouchersByTenantId(
    tenantId: string,
    filters?: { voucherType?: VoucherType; status?: VoucherStatus },
  ): Promise<VoucherHeader[]> {
    let result = headersStore.get(tenantId) ?? [];
    if (filters?.voucherType) {
      result = result.filter(h => h.voucherType === filters.voucherType);
    }
    if (filters?.status) {
      result = result.filter(h => h.status === filters.status);
    }
    return result.map(h => ({ ...h }));
  }

  async getVoucherById(tenantId: string, id: string): Promise<VoucherHeader | null> {
    const headers = headersStore.get(tenantId) ?? [];
    const found = headers.find(h => h.id === id);
    return found ? { ...found } : null;
  }

  async getNextVoucherNumber(tenantId: string): Promise<number> {
    const current = voucherCounter.get(tenantId) ?? 1;
    return current;
  }

  /* ─── Voucher Line Queries ─────────────────────────────── */

  async getVoucherLines(tenantId: string, voucherId: string): Promise<VoucherLine[]> {
    const allLines = linesStore.get(tenantId) ?? [];
    return allLines
      .filter(l => l.voucherId === voucherId)
      .sort((a, b) => a.lineOrder - b.lineOrder)
      .map(l => ({ ...l }));
  }

  /* ─── Mutations ────────────────────────────────────────── */

  async createVoucher(tenantId: string, dto: CreateVoucherDTO, createdBy: string): Promise<VoucherHeader> {
    // Validate lines exist
    if (!dto.lines || dto.lines.length < 2) {
      throw new Error('A voucher must have at least 2 lines');
    }

    // Validate balanced
    if (!isBalanced(dto.lines)) {
      throw new Error('Voucher does not balance: total debit must equal total credit');
    }

    const vnum = await this.getNextVoucherNumber(tenantId);
    const vid = uid();
    const now = new Date();

    const header: VoucherHeader = {
      id: vid,
      tenantId,
      voucherNumber: vnum,
      voucherType: dto.voucherType,
      status: 'DRAFT',
      date: dto.date,
      narration: dto.narration,
      createdBy,
      createdAt: now,
      updatedAt: now,
    };

    const newLines: VoucherLine[] = dto.lines.map((l, i) => ({
      id: uid(),
      voucherId: vid,
      tenantId,
      accountId: l.accountId,
      description: l.description,
      debit: l.debit,
      credit: l.credit,
      lineOrder: i,
      contraAccountId: l.contraAccountId,
      quantity: l.quantity,
      productId: l.productId,
      branch: l.branch,
      stInvNo: l.stInvNo,
      stRate: l.stRate,
      stAmount: l.stAmount,
      amtExclStd: l.amtExclStd,
    }));

    // Persist
    const headers = headersStore.get(tenantId) ?? [];
    headers.push(header);
    headersStore.set(tenantId, headers);

    const allLines = linesStore.get(tenantId) ?? [];
    allLines.push(...newLines);
    linesStore.set(tenantId, allLines);

    voucherCounter.set(tenantId, vnum + 1);

    return { ...header };
  }

  async updateVoucher(tenantId: string, id: string, dto: UpdateVoucherDTO): Promise<VoucherHeader> {
    const headers = headersStore.get(tenantId) ?? [];
    const idx = headers.findIndex(h => h.id === id);
    if (idx === -1) throw new Error('Voucher not found');

    const existing = headers[idx];
    if (existing.status === 'POSTED') {
      throw new Error('Cannot edit a posted voucher');
    }

    // Update header fields
    const updated: VoucherHeader = {
      ...existing,
      date: dto.date ?? existing.date,
      narration: dto.narration ?? existing.narration,
      updatedAt: new Date(),
    };
    headers[idx] = updated;
    headersStore.set(tenantId, headers);

    // Replace lines if provided
    if (dto.lines) {
      if (dto.lines.length < 2) {
        throw new Error('A voucher must have at least 2 lines');
      }
      if (!isBalanced(dto.lines)) {
        throw new Error('Voucher does not balance: total debit must equal total credit');
      }

      // Remove old lines
      const allLines = linesStore.get(tenantId) ?? [];
      const filtered = allLines.filter(l => l.voucherId !== id);

      // Add new lines
      const newLines: VoucherLine[] = dto.lines.map((l, i) => ({
        id: uid(),
        voucherId: id,
        tenantId,
        accountId: l.accountId,
        description: l.description,
        debit: l.debit,
        credit: l.credit,
        lineOrder: i,
        contraAccountId: l.contraAccountId,
        quantity: l.quantity,
        productId: l.productId,
        branch: l.branch,
        stInvNo: l.stInvNo,
        stRate: l.stRate,
        stAmount: l.stAmount,
        amtExclStd: l.amtExclStd,
      }));

      filtered.push(...newLines);
      linesStore.set(tenantId, filtered);
    }

    return { ...updated };
  }

  async deleteVoucher(tenantId: string, id: string): Promise<void> {
    const headers = headersStore.get(tenantId) ?? [];
    const idx = headers.findIndex(h => h.id === id);
    if (idx === -1) throw new Error('Voucher not found');

    if (headers[idx].status === 'POSTED') {
      throw new Error('Cannot delete a posted voucher');
    }

    // Remove header
    headers.splice(idx, 1);
    headersStore.set(tenantId, headers);

    // Remove lines
    const allLines = linesStore.get(tenantId) ?? [];
    linesStore.set(tenantId, allLines.filter(l => l.voucherId !== id));
  }

  async postVoucher(tenantId: string, id: string): Promise<VoucherHeader> {
    const headers = headersStore.get(tenantId) ?? [];
    const idx = headers.findIndex(h => h.id === id);
    if (idx === -1) throw new Error('Voucher not found');

    const header = headers[idx];
    if (header.status === 'POSTED') {
      throw new Error('Voucher is already posted');
    }

    // Fetch lines
    const voucherLines = await this.getVoucherLines(tenantId, id);

    // Validate balanced
    if (!isBalanced(voucherLines)) {
      throw new Error('Cannot post unbalanced voucher: total debit must equal total credit');
    }

    // Generate ledger entries
    const ledger = ledgerStore.get(tenantId) ?? [];
    for (const vl of voucherLines) {
      ledger.push({
        id: ledgerUid(),
        tenantId,
        voucherId: id,
        voucherLineId: vl.id,
        accountId: vl.accountId,
        debit: vl.debit,
        credit: vl.credit,
        entryDate: header.date,
        voucherType: header.voucherType,
        voucherNumber: header.voucherNumber,
        narration: vl.description,
      });
    }
    ledgerStore.set(tenantId, ledger);

    // Update status
    const updated: VoucherHeader = { ...header, status: 'POSTED', updatedAt: new Date() };
    headers[idx] = updated;
    headersStore.set(tenantId, headers);

    return { ...updated };
  }

  /* ─── Ledger Queries ───────────────────────────────────── */

  async getLedgerEntries(
    tenantId: string,
    filters?: {
      accountId?: string;
      startDate?: string;
      endDate?: string;
      voucherType?: VoucherType;
    },
  ): Promise<LedgerEntry[]> {
    let result = ledgerStore.get(tenantId) ?? [];

    if (filters?.accountId) {
      result = result.filter(e => e.accountId === filters.accountId);
    }
    if (filters?.startDate) {
      result = result.filter(e => e.entryDate >= filters.startDate!);
    }
    if (filters?.endDate) {
      result = result.filter(e => e.entryDate <= filters.endDate!);
    }
    if (filters?.voucherType) {
      result = result.filter(e => e.voucherType === filters.voucherType);
    }

    return result
      .sort((a, b) => a.entryDate.localeCompare(b.entryDate) || a.voucherNumber - b.voucherNumber)
      .map(e => ({ ...e }));
  }

  async getLedgerForAccount(
    tenantId: string,
    accountId: string,
    filters?: { startDate?: string; endDate?: string },
  ): Promise<(LedgerEntry & { balance: number })[]> {
    const entries = await this.getLedgerEntries(tenantId, {
      accountId,
      startDate: filters?.startDate,
      endDate: filters?.endDate,
    });

    // Compute running balance
    let balance = 0;
    return entries.map(e => {
      balance += e.debit - e.credit;
      return { ...e, balance };
    });
  }
}
