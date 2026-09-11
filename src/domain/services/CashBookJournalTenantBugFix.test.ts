/**
 * Step 76 — Cash Book / Journal / Tax Settings Bug Fix — Regression Tests
 *
 * Root causes identified and fixed:
 * 1. Cash Book: getLedgerEntries() was passed account.accountCode, but Postgres
 *    adapter stored resolved DB IDs in ledger_entries.account_id.  Fixed by
 *    making Postgres postVoucher() store account codes (matching mock behavior).
 * 2. Cash Book: Only fetched POSTED vouchers — draft receipts were invisible.
 *    Fixed by fetching ALL vouchers and exposing draftVouchers in CashBookSummary.
 * 3. Journal/Ledger route: Frontend sent account code to GET /api/ledger/:accountId,
 *    but Postgres queried WHERE account_id = <resolved DB ID>.  Fixed by resolving
 *    DB IDs back to codes in the ledger route handler.
 * 4. Settings: Already correctly tenant-scoped (verified, no code change needed).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { CashBookService } from './CashBookService';
import type { ICOARepository } from '../repositories/ICOARepository';
import type { IVoucherRepository } from '../repositories/IVoucherRepository';
import type { AccountHead } from '../types/coa';
import type { VoucherHeader, VoucherLine, LedgerEntry, CreateVoucherDTO } from '../types/voucher';

/* ─── Constants ────────────────────────────────────────────── */

const TENANT_ID = 'tenant-bugfix-001';

const ACCOUNTS: AccountHead[] = [
  { id: 'coa-11101', tenantId: TENANT_ID, accountCode: '11101', accountName: 'Cash in Hand', accountType: 'ASSET', level: 4, isPosting: true, isActive: true, normalBalance: 'DEBIT', isSummary: false, parentId: 'coa-111', createdAt: new Date(), updatedAt: new Date() },
  { id: 'coa-11102', tenantId: TENANT_ID, accountCode: '11102', accountName: 'Bank Account', accountType: 'ASSET', level: 4, isPosting: true, isActive: true, normalBalance: 'DEBIT', isSummary: false, parentId: 'coa-111', createdAt: new Date(), updatedAt: new Date() },
  { id: 'coa-41101', tenantId: TENANT_ID, accountCode: '41101', accountName: 'Sales Revenue', accountType: 'REVENUE', level: 4, isPosting: true, isActive: true, normalBalance: 'CREDIT', isSummary: false, parentId: 'coa-411', createdAt: new Date(), updatedAt: new Date() },
  { id: 'coa-61101', tenantId: TENANT_ID, accountCode: '61101', accountName: 'Rent Expense', accountType: 'EXPENSE', level: 4, isPosting: true, isActive: true, normalBalance: 'DEBIT', isSummary: false, parentId: 'coa-611', createdAt: new Date(), updatedAt: new Date() },
  // Tenant B — for isolation test
  { id: 'coa-b-11101', tenantId: 'tenant-other-002', accountCode: '11101', accountName: 'Cash', accountType: 'ASSET', level: 4, isPosting: true, isActive: true, normalBalance: 'DEBIT', isSummary: false, parentId: 'coa-b-111', createdAt: new Date(), updatedAt: new Date() },
];

/* ─── Mock Repositories ────────────────────────────────────── */

function createMockCOA(): ICOARepository {
  const accounts = [...ACCOUNTS];
  return {
    getAccountsByTenantId: async (tid: string) => accounts.filter(a => a.tenantId === tid),
    getAccountById: async (tid: string, id: string) => accounts.find(a => a.tenantId === tid && a.id === id) ?? null,
    getAccountByCode: async (tid: string, code: string) => accounts.find(a => a.tenantId === tid && a.accountCode === code) ?? null,
    createAccount: async (tid: string, dto: any) => {
      const a: AccountHead = { id: `coa-${dto.accountCode}`, tenantId: tid, ...dto, isActive: true, isPosting: dto.level === 4, isSummary: dto.level < 4 };
      accounts.push(a);
      return a;
    },
    updateAccount: async (_tid: string, id: string, dto: any) => {
      const idx = accounts.findIndex(a => a.id === id);
      if (idx < 0) throw new Error('Not found');
      accounts[idx] = { ...accounts[idx], ...dto };
      return accounts[idx];
    },
    deactivateAccount: async (_tid: string, id: string) => {
      const a = accounts.find(x => x.id === id);
      if (a) a.isActive = false;
    },
  };
}

function createMockVoucher(): IVoucherRepository {
  const headers: VoucherHeader[] = [];
  const lines: VoucherLine[] = [];
  const ledger: LedgerEntry[] = [];
  let voucherCounter = 100;
  let ledgerCounter = 100;

  return {
    getVouchersByTenantId: async (_tid: string, filters?: { voucherType?: string; status?: string }) => {
      return headers.filter(v => {
        if (filters?.voucherType && v.voucherType !== filters.voucherType) return false;
        if (filters?.status && v.status !== filters.status) return false;
        return true;
      });
    },
    getVoucherById: async (_tid: string, id: string) => headers.find(v => v.id === id) ?? null,
    getNextVoucherNumber: async () => ++voucherCounter,
    getVoucherLines: async (_tid: string, voucherId: string) => lines.filter(l => l.voucherId === voucherId),
    createVoucher: async (_tid: string, dto: CreateVoucherDTO, createdBy: string) => {
      const id = `vch-${headers.length + 1}`;
      const num = voucherCounter++;
      const header: VoucherHeader = {
        id, tenantId: TENANT_ID, voucherNumber: num, voucherType: dto.voucherType,
        status: 'DRAFT', date: dto.date, narration: dto.narration,
        createdBy, createdAt: new Date(), updatedAt: new Date(),
      };
      headers.push(header);
      dto.lines.forEach((line, i) => {
        lines.push({
          id: `vl-${lines.length + 1}`, voucherId: id, tenantId: TENANT_ID,
          accountId: line.accountId, description: line.description,
          debit: line.debit, credit: line.credit, lineOrder: i,
        });
      });
      return header;
    },
    updateVoucher: async (_tid: string, id: string, dto: any) => {
      const idx = headers.findIndex(v => v.id === id);
      if (idx < 0) throw new Error('Voucher not found');
      headers[idx] = { ...headers[idx], ...dto, updatedAt: new Date() };
      return headers[idx];
    },
    deleteVoucher: async (_tid: string, id: string) => {
      const idx = headers.findIndex(v => v.id === id);
      if (idx < 0) throw new Error('Voucher not found');
      headers.splice(idx, 1);
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].voucherId === id) lines.splice(i, 1);
      }
    },
    postVoucher: async (_tid: string, id: string) => {
      const header = headers.find(v => v.id === id);
      if (!header) throw new Error('Voucher not found');
      if (header.status === 'POSTED') throw new Error('Voucher already posted');
      const vLines = lines.filter(l => l.voucherId === id);
      const totalDr = vLines.reduce((s, l) => s + l.debit, 0);
      const totalCr = vLines.reduce((s, l) => s + l.credit, 0);
      if (Math.abs(totalDr - totalCr) > 0.005) throw new Error('Voucher not balanced');
      for (const vl of vLines) {
        ledger.push({
          id: `led-${ledgerCounter++}`, tenantId: TENANT_ID,
          voucherId: id, voucherLineId: vl.id, accountId: vl.accountId,
          debit: vl.debit, credit: vl.credit, entryDate: header.date,
          voucherType: header.voucherType, voucherNumber: header.voucherNumber,
          narration: header.narration,
        });
      }
      header.status = 'POSTED';
      header.updatedAt = new Date();
      return header;
    },
    getLedgerEntries: async (tid: string, filters?: { accountId?: string; startDate?: string; endDate?: string; voucherType?: string; status?: string }) => {
      return ledger.filter(e => {
        if (e.tenantId !== tid) return false;
        if (filters?.accountId && e.accountId !== filters.accountId) return false;
        if (filters?.startDate && e.entryDate < filters.startDate) return false;
        if (filters?.endDate && e.entryDate > filters.endDate) return false;
        if (filters?.voucherType && e.voucherType !== filters.voucherType) return false;
        return true;
      });
    },
    getLedgerForAccount: async (tid: string, accountId: string, filters?: { startDate?: string; endDate?: string }) => {
      const filtered = ledger.filter(e => {
        if (e.tenantId !== tid) return false;
        if (e.accountId !== accountId) return false;
        if (filters?.startDate && e.entryDate < filters.startDate) return false;
        if (filters?.endDate && e.entryDate > filters.endDate) return false;
        return true;
      });
      let balance = 0;
      return filtered.map(e => { balance += e.debit - e.credit; return { ...e, balance }; });
    },
  };
}

/* ─── Tests ────────────────────────────────────────────────── */

describe('Step 76 — Cash Book / Journal / Tax Settings Bug Fix', () => {
  let service: CashBookService;
  let coaRepo: ICOARepository;
  let voucherRepo: IVoucherRepository;

  beforeEach(() => {
    coaRepo = createMockCOA();
    voucherRepo = createMockVoucher();
    service = new CashBookService(coaRepo, voucherRepo);
  });

  // ─── BUG 1: Cash Book opening balance with account codes ───

  describe('Bug 1: Cash Book ledger queries use account codes', () => {
    it('opening balance uses account.accountCode, not account.id', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0]; // 11101

      // Create and post a receipt BEFORE the range
      const v1 = await service.createCashReceipt(TENANT_ID, {
        cashAccountId: cashAcc.id, creditAccountId: 'coa-41101',
        amount: 100000, date: '2026-07-25', narration: 'Opening',
      }, 'admin', 'ADMIN');
      await service.postVoucher(TENANT_ID, v1.id, 'ADMIN');

      // Verify: ledger stores account CODE '11101', not ID 'coa-11101'
      const allEntries = await voucherRepo.getLedgerEntries(TENANT_ID);
      const cashEntries = allEntries.filter(e => e.accountId === cashAcc.accountCode);
      expect(cashEntries.length).toBeGreaterThan(0);
      expect(cashEntries[0].accountId).toBe('11101'); // code, not 'coa-11101'

      // Opening balance should work because query uses accountCode
      const summary = await service.getCashBook(TENANT_ID, cashAcc.id, '2026-08-01', '2026-08-31');
      expect(summary.openingBalance).toBe(100000);
    });

    it('range entries use account.accountCode', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];

      const v1 = await service.createCashReceipt(TENANT_ID, {
        cashAccountId: cashAcc.id, creditAccountId: 'coa-41101',
        amount: 50000, date: '2026-08-10', narration: 'Aug receipt',
      }, 'admin', 'ADMIN');
      await service.postVoucher(TENANT_ID, v1.id, 'ADMIN');

      const summary = await service.getCashBook(TENANT_ID, cashAcc.id, '2026-08-01', '2026-08-31');
      expect(summary.totalReceipts).toBe(50000);
      expect(summary.transactions.length).toBe(1);
    });

    it('closing balance is correct after receipt + payment', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];

      const v1 = await service.createCashReceipt(TENANT_ID, {
        cashAccountId: cashAcc.id, creditAccountId: 'coa-41101',
        amount: 100000, date: '2026-08-01', narration: 'Receipt',
      }, 'admin', 'ADMIN');
      await service.postVoucher(TENANT_ID, v1.id, 'ADMIN');

      const v2 = await service.createCashPayment(TENANT_ID, {
        cashAccountId: cashAcc.id, debitAccountId: 'coa-61101',
        amount: 30000, date: '2026-08-15', narration: 'Rent',
      }, 'admin', 'ADMIN');
      await service.postVoucher(TENANT_ID, v2.id, 'ADMIN');

      const summary = await service.getCashBook(TENANT_ID, cashAcc.id, '2026-08-01', '2026-08-31');
      expect(summary.closingBalance).toBe(70000);
    });
  });

  // ─── BUG 2: Cash Book draft visibility ─────────────────────

  describe('Bug 2: Cash Book shows draft vouchers', () => {
    it('draftVouchers includes unposted receipts', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];

      await service.createCashReceipt(TENANT_ID, {
        cashAccountId: cashAcc.id, creditAccountId: 'coa-41101',
        amount: 25000, date: '2026-08-10', narration: 'Draft receipt',
      }, 'admin', 'ADMIN');

      const summary = await service.getCashBook(TENANT_ID, cashAcc.id, '2026-08-01', '2026-08-31');
      expect(summary.draftVouchers.length).toBe(1);
      expect(summary.draftVouchers[0].status).toBe('DRAFT');
      expect(summary.draftVouchers[0].voucherType).toBe('CR');
    });

    it('draftVouchers includes unposted payments', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];

      await service.createCashPayment(TENANT_ID, {
        cashAccountId: cashAcc.id, debitAccountId: 'coa-61101',
        amount: 15000, date: '2026-08-12', narration: 'Draft payment',
      }, 'admin', 'ADMIN');

      const summary = await service.getCashBook(TENANT_ID, cashAcc.id, '2026-08-01', '2026-08-31');
      expect(summary.draftVouchers.length).toBe(1);
      expect(summary.draftVouchers[0].status).toBe('DRAFT');
      expect(summary.draftVouchers[0].voucherType).toBe('CP');
    });

    it('posted vouchers do NOT appear in draftVouchers', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];

      const v = await service.createCashReceipt(TENANT_ID, {
        cashAccountId: cashAcc.id, creditAccountId: 'coa-41101',
        amount: 10000, date: '2026-08-10', narration: 'Posted receipt',
      }, 'admin', 'ADMIN');
      await service.postVoucher(TENANT_ID, v.id, 'ADMIN');

      const summary = await service.getCashBook(TENANT_ID, cashAcc.id, '2026-08-01', '2026-08-31');
      expect(summary.draftVouchers.length).toBe(0);
      expect(summary.transactions.length).toBe(1);
    });

    it('multiple drafts appear correctly', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];

      await service.createCashReceipt(TENANT_ID, {
        cashAccountId: cashAcc.id, creditAccountId: 'coa-41101',
        amount: 5000, date: '2026-08-05', narration: 'Draft 1',
      }, 'admin', 'ADMIN');
      await service.createCashPayment(TENANT_ID, {
        cashAccountId: cashAcc.id, debitAccountId: 'coa-61101',
        amount: 3000, date: '2026-08-10', narration: 'Draft 2',
      }, 'admin', 'ADMIN');

      const summary = await service.getCashBook(TENANT_ID, cashAcc.id, '2026-08-01', '2026-08-31');
      expect(summary.draftVouchers.length).toBe(2);
    });
  });

  // ─── BUG 3: Cash Book deletion ─────────────────────────────

  describe('Bug 3: Cash Book draft deletion works', () => {
    it('deletes a draft receipt', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];
      const v = await service.createCashReceipt(TENANT_ID, {
        cashAccountId: cashAcc.id, creditAccountId: 'coa-41101',
        amount: 5000, date: '2026-08-10', narration: 'Delete me',
      }, 'admin', 'ADMIN');

      await service.deleteVoucher(TENANT_ID, v.id, 'ADMIN');
      const found = await voucherRepo.getVoucherById(TENANT_ID, v.id);
      expect(found).toBeNull();
    });

    it('deletes a draft payment', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];
      const v = await service.createCashPayment(TENANT_ID, {
        cashAccountId: cashAcc.id, debitAccountId: 'coa-61101',
        amount: 8000, date: '2026-08-12', narration: 'Delete payment',
      }, 'admin', 'ADMIN');

      await service.deleteVoucher(TENANT_ID, v.id, 'ADMIN');
      const found = await voucherRepo.getVoucherById(TENANT_ID, v.id);
      expect(found).toBeNull();
    });

    it('deleting draft removes it from draftVouchers list', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];
      const v = await service.createCashReceipt(TENANT_ID, {
        cashAccountId: cashAcc.id, creditAccountId: 'coa-41101',
        amount: 5000, date: '2026-08-10', narration: 'Delete and check',
      }, 'admin', 'ADMIN');

      let summary = await service.getCashBook(TENANT_ID, cashAcc.id, '2026-08-01', '2026-08-31');
      expect(summary.draftVouchers.length).toBe(1);

      await service.deleteVoucher(TENANT_ID, v.id, 'ADMIN');
      summary = await service.getCashBook(TENANT_ID, cashAcc.id, '2026-08-01', '2026-08-31');
      expect(summary.draftVouchers.length).toBe(0);
    });

    it('rejects deleting a posted voucher', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];
      const v = await service.createCashReceipt(TENANT_ID, {
        cashAccountId: cashAcc.id, creditAccountId: 'coa-41101',
        amount: 5000, date: '2026-08-10', narration: 'Posted',
      }, 'admin', 'ADMIN');
      await service.postVoucher(TENANT_ID, v.id, 'ADMIN');

      await expect(service.deleteVoucher(TENANT_ID, v.id, 'ADMIN'))
        .rejects.toThrow('Cannot delete a posted voucher');
    });
  });

  // ─── BUG 4: Cash Book posting ──────────────────────────────

  describe('Bug 4: Cash Book posting works end-to-end', () => {
    it('post receipt makes it appear in transactions, not drafts', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];
      const v = await service.createCashReceipt(TENANT_ID, {
        cashAccountId: cashAcc.id, creditAccountId: 'coa-41101',
        amount: 20000, date: '2026-08-10', narration: 'Post me',
      }, 'admin', 'ADMIN');

      let summary = await service.getCashBook(TENANT_ID, cashAcc.id, '2026-08-01', '2026-08-31');
      expect(summary.draftVouchers.length).toBe(1);
      expect(summary.transactions.length).toBe(0);

      await service.postVoucher(TENANT_ID, v.id, 'ADMIN');

      summary = await service.getCashBook(TENANT_ID, cashAcc.id, '2026-08-01', '2026-08-31');
      expect(summary.draftVouchers.length).toBe(0);
      expect(summary.transactions.length).toBe(1);
      expect(summary.totalReceipts).toBe(20000);
    });

    it('post payment makes it appear in transactions', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];
      const v = await service.createCashPayment(TENANT_ID, {
        cashAccountId: cashAcc.id, debitAccountId: 'coa-61101',
        amount: 10000, date: '2026-08-12', narration: 'Post payment',
      }, 'admin', 'ADMIN');

      await service.postVoucher(TENANT_ID, v.id, 'ADMIN');

      const summary = await service.getCashBook(TENANT_ID, cashAcc.id, '2026-08-01', '2026-08-31');
      expect(summary.transactions.length).toBe(1);
      expect(summary.totalPayments).toBe(10000);
    });
  });

  // ─── BUG 5: Tenant isolation for Settings ──────────────────

  describe('Bug 5: Settings tenant isolation', () => {
    it('two tenants have independent account sets', async () => {
      const tenantA = await coaRepo.getAccountsByTenantId(TENANT_ID);
      const tenantB = await coaRepo.getAccountsByTenantId('tenant-other-002');
      expect(tenantA.length).toBe(4);
      expect(tenantB.length).toBe(1);
      expect(tenantA[0].tenantId).toBe(TENANT_ID);
      expect(tenantB[0].tenantId).toBe('tenant-other-002');
    });

    it('getAccountById scoped to tenant', async () => {
      const acc = await coaRepo.getAccountById(TENANT_ID, 'coa-11101');
      expect(acc).not.toBeNull();
      expect(acc!.accountName).toBe('Cash in Hand');

      const wrongTenant = await coaRepo.getAccountById('tenant-other-002', 'coa-11101');
      expect(wrongTenant).toBeNull();
    });

    it('getAccountByCode scoped to tenant', async () => {
      const acc = await coaRepo.getAccountByCode(TENANT_ID, '11101');
      expect(acc).not.toBeNull();
      expect(acc!.id).toBe('coa-11101');

      const wrongTenant = await coaRepo.getAccountByCode('tenant-other-002', '11101');
      expect(wrongTenant).not.toBeNull();
      expect(wrongTenant!.id).toBe('coa-b-11101');
    });

    it('cash book operations isolated per tenant', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];
      const v = await service.createCashReceipt(TENANT_ID, {
        cashAccountId: cashAcc.id, creditAccountId: 'coa-41101',
        amount: 50000, date: '2026-08-10', narration: 'Tenant A receipt',
      }, 'admin', 'ADMIN');
      await service.postVoucher(TENANT_ID, v.id, 'ADMIN');

      // Tenant A has entries
      const summaryA = await service.getCashBook(TENANT_ID, cashAcc.id, '2026-08-01', '2026-08-31');
      expect(summaryA.transactions.length).toBe(1);

      // Tenant B has no entries for their cash account
      const cashAccB = (await service.getCashBankAccounts('tenant-other-002'))[0];
      const summaryB = await service.getCashBook('tenant-other-002', cashAccB.id, '2026-08-01', '2026-08-31');
      expect(summaryB.transactions.length).toBe(0);
      expect(summaryB.totalReceipts).toBe(0);
    });
  });

  // ─── Journal / Ledger: account code resolution ─────────────

  describe('Bug 6: Ledger entries use account codes consistently', () => {
    it('ledger entries store account codes, not DB IDs', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];

      const v = await service.createCashReceipt(TENANT_ID, {
        cashAccountId: cashAcc.id, creditAccountId: 'coa-41101',
        amount: 30000, date: '2026-08-10', narration: 'Check ledger',
      }, 'admin', 'ADMIN');
      await service.postVoucher(TENANT_ID, v.id, 'ADMIN');

      const entries = await voucherRepo.getLedgerEntries(TENANT_ID, { accountId: '11101' });
      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0].accountId).toBe('11101'); // code, not 'coa-11101'

      // Also verify the counter-account entry uses the code
      const creditEntries = await voucherRepo.getLedgerEntries(TENANT_ID, { accountId: '41101' });
      expect(creditEntries.length).toBeGreaterThan(0);
      expect(creditEntries[0].accountId).toBe('41101');
    });

    it('getLedgerForAccount returns entries by code', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];

      const v = await service.createCashReceipt(TENANT_ID, {
        cashAccountId: cashAcc.id, creditAccountId: 'coa-41101',
        amount: 40000, date: '2026-08-10', narration: 'Ledger query',
      }, 'admin', 'ADMIN');
      await service.postVoucher(TENANT_ID, v.id, 'ADMIN');

      const entries = await voucherRepo.getLedgerForAccount(TENANT_ID, '11101');
      expect(entries.length).toBe(1);
      expect(entries[0].balance).toBe(40000);
    });
  });
});
