/**
 * CashBookService Tests
 * Tests cash/bank account selection, CRUD, validation, balance calculation, and posting rules.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { CashBookService } from './CashBookService';
import type { ICOARepository } from '../repositories/ICOARepository';
import type { IVoucherRepository } from '../repositories/IVoucherRepository';
import type { AccountHead } from '../types/coa';
import type { VoucherHeader, VoucherLine, LedgerEntry, CreateVoucherDTO } from '../types/voucher';
import { TENANT_ID, SEED_ACCOUNTS } from '../test-helpers';

/* ─── Mock Repositories ────────────────────────────────────── */

function createMockCOA(): ICOARepository {
  const accounts = [...SEED_ACCOUNTS];
  return {
    getAccountsByTenantId: async () => accounts.filter(a => a.tenantId === TENANT_ID),
    getAccountById: async (_tid: string, id: string) => accounts.find(a => a.id === id) ?? null,
    getAccountByCode: async (_tid: string, code: string) => accounts.find(a => a.accountCode === code) ?? null,
    createAccount: async (tid: string, dto: any) => {
      const a: AccountHead = { id: `acc-${dto.accountCode}`, tenantId: tid, ...dto, isActive: true };
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
  let voucherCounter = 1;
  let ledgerCounter = 1;

  return {
    getVouchersByTenantId: async (_tid: string, filters?: { voucherType?: string; status?: string }) => {
      return headers.filter(v => {
        if (filters?.voucherType && v.voucherType !== filters.voucherType) return false;
        if (filters?.status && v.status !== filters.status) return false;
        return true;
      });
    },
    getVoucherById: async (_tid: string, id: string) => headers.find(v => v.id === id) ?? null,
    getNextVoucherNumber: async (_tid: string) => ++voucherCounter,
    getVoucherLines: async (_tid: string, voucherId: string) => lines.filter(l => l.voucherId === voucherId),
    createVoucher: async (_tid: string, dto: CreateVoucherDTO, createdBy: string) => {
      const id = `vch-${headers.length + 1}`;
      const num = voucherCounter++;
      const header: VoucherHeader = {
        id,
        tenantId: TENANT_ID,
        voucherNumber: num,
        voucherType: dto.voucherType,
        status: 'DRAFT',
        date: dto.date,
        narration: dto.narration,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      headers.push(header);
      dto.lines.forEach((line, i) => {
        lines.push({
          id: `vl-${lines.length + 1}`,
          voucherId: id,
          tenantId: TENANT_ID,
          accountId: line.accountId,
          description: line.description,
          debit: line.debit,
          credit: line.credit,
          lineOrder: i,
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
          id: `led-${ledgerCounter++}`,
          tenantId: TENANT_ID,
          voucherId: id,
          voucherLineId: vl.id,
          accountId: vl.accountId,
          debit: vl.debit,
          credit: vl.credit,
          entryDate: header.date,
          voucherType: header.voucherType,
          voucherNumber: header.voucherNumber,
          narration: header.narration,
        });
      }
      header.status = 'POSTED';
      header.updatedAt = new Date();
      return header;
    },
    getLedgerEntries: async (_tid: string, filters?: { accountId?: string; startDate?: string; endDate?: string; voucherType?: string }) => {
      return ledger.filter(e => {
        if (filters?.accountId && e.accountId !== filters.accountId) return false;
        if (filters?.startDate && e.entryDate < filters.startDate) return false;
        if (filters?.endDate && e.entryDate > filters.endDate) return false;
        if (filters?.voucherType && e.voucherType !== filters.voucherType) return false;
        return true;
      });
    },
    getLedgerForAccount: async (_tid: string, accountId: string, filters?: { startDate?: string; endDate?: string }) => {
      const filtered = ledger.filter(e => {
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

describe('CashBookService', () => {
  let service: CashBookService;
  let coaRepo: ICOARepository;
  let voucherRepo: IVoucherRepository;

  beforeEach(() => {
    coaRepo = createMockCOA();
    voucherRepo = createMockVoucher();
    service = new CashBookService(coaRepo, voucherRepo);
  });

  describe('getCashBankAccounts', () => {
    it('returns only cash/bank accounts', async () => {
      const accounts = await service.getCashBankAccounts(TENANT_ID);
      expect(accounts.length).toBe(2);
      const codes = accounts.map(a => a.accountCode);
      expect(codes).toContain('11101');
      expect(codes).toContain('11102');
    });

    it('returns empty array if no cash accounts exist', async () => {
      const emptyCoa: ICOARepository = {
        ...coaRepo,
        getAccountsByTenantId: async () => [],
      };
      const svc = new CashBookService(emptyCoa, voucherRepo);
      const accounts = await svc.getCashBankAccounts(TENANT_ID);
      expect(accounts).toEqual([]);
    });
  });

  describe('createCashReceipt (CR)', () => {
    it('creates a draft CR voucher with correct lines', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];
      const result = await service.createCashReceipt(TENANT_ID, {
        cashAccountId: cashAcc.id,
        creditAccountId: 'acc-41101',
        amount: 25000,
        date: '2026-08-15',
        narration: 'Cash received from customer',
      }, 'admin', 'ADMIN');

      expect(result.voucherType).toBe('CR');
      expect(result.status).toBe('DRAFT');
      expect(result.date).toBe('2026-08-15');

      const vLines = await voucherRepo.getVoucherLines(TENANT_ID, result.id);
      expect(vLines.length).toBe(2);
      const cashLine = vLines.find(l => l.accountId === cashAcc.accountCode);
      expect(cashLine).toBeDefined();
      expect(cashLine!.debit).toBe(25000);
      expect(cashLine!.credit).toBe(0);
      const creditLine = vLines.find(l => l.accountId === '41101');
      expect(creditLine).toBeDefined();
      expect(creditLine!.debit).toBe(0);
      expect(creditLine!.credit).toBe(25000);
    });

    it('rejects zero amount', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];
      await expect(service.createCashReceipt(TENANT_ID, {
        cashAccountId: cashAcc.id,
        creditAccountId: 'acc-41101',
        amount: 0,
        date: '2026-08-15',
        narration: 'Test',
      }, 'admin', 'ADMIN')).rejects.toThrow('Amount must be greater than zero');
    });

    it('rejects negative amount', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];
      await expect(service.createCashReceipt(TENANT_ID, {
        cashAccountId: cashAcc.id,
        creditAccountId: 'acc-41101',
        amount: -100,
        date: '2026-08-15',
        narration: 'Test',
      }, 'admin', 'ADMIN')).rejects.toThrow('Amount must be greater than zero');
    });

    it('rejects empty narration', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];
      await expect(service.createCashReceipt(TENANT_ID, {
        cashAccountId: cashAcc.id,
        creditAccountId: 'acc-41101',
        amount: 1000,
        date: '2026-08-15',
        narration: '',
      }, 'admin', 'ADMIN')).rejects.toThrow('Narration is required');
    });

    it('rejects non-cash account', async () => {
      await expect(service.createCashReceipt(TENANT_ID, {
        cashAccountId: 'acc-61101',
        creditAccountId: 'acc-41101',
        amount: 1000,
        date: '2026-08-15',
        narration: 'Test',
      }, 'admin', 'ADMIN')).rejects.toThrow('not a valid Cash or Bank account');
    });

    it('rejects non-existent counter account', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];
      await expect(service.createCashReceipt(TENANT_ID, {
        cashAccountId: cashAcc.id,
        creditAccountId: 'nonexistent',
        amount: 1000,
        date: '2026-08-15',
        narration: 'Test',
      }, 'admin', 'ADMIN')).rejects.toThrow('Credit account not found');
    });
  });

  describe('createCashPayment (CP)', () => {
    it('creates a draft CP voucher with correct lines', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];
      const result = await service.createCashPayment(TENANT_ID, {
        cashAccountId: cashAcc.id,
        debitAccountId: 'acc-61201',
        amount: 15000,
        date: '2026-08-16',
        narration: 'Office rent payment',
      }, 'admin', 'ADMIN');

      expect(result.voucherType).toBe('CP');
      expect(result.status).toBe('DRAFT');

      const vLines = await voucherRepo.getVoucherLines(TENANT_ID, result.id);
      expect(vLines.length).toBe(2);
      const debitLine = vLines.find(l => l.accountId === '61201');
      expect(debitLine).toBeDefined();
      expect(debitLine!.debit).toBe(15000);
      expect(debitLine!.credit).toBe(0);
      const cashLine = vLines.find(l => l.accountId === cashAcc.accountCode);
      expect(cashLine).toBeDefined();
      expect(cashLine!.debit).toBe(0);
      expect(cashLine!.credit).toBe(15000);
    });

    it('rejects invalid cash account', async () => {
      await expect(service.createCashPayment(TENANT_ID, {
        cashAccountId: 'nonexistent',
        debitAccountId: 'acc-61201',
        amount: 15000,
        date: '2026-08-16',
        narration: 'Test',
      }, 'admin', 'ADMIN')).rejects.toThrow('Cash/Bank account not found');
    });
  });

  describe('postVoucher', () => {
    it('posts a balanced voucher', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];
      const voucher = await service.createCashReceipt(TENANT_ID, {
        cashAccountId: cashAcc.id,
        creditAccountId: 'acc-41101',
        amount: 50000,
        date: '2026-08-17',
        narration: 'Test receipt',
      }, 'admin', 'ADMIN');

      const posted = await service.postVoucher(TENANT_ID, voucher.id, 'ADMIN');
      expect(posted.status).toBe('POSTED');
    });

    it('rejects posting an already posted voucher', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];
      const voucher = await service.createCashReceipt(TENANT_ID, {
        cashAccountId: cashAcc.id,
        creditAccountId: 'acc-41101',
        amount: 50000,
        date: '2026-08-17',
        narration: 'Test',
      }, 'admin', 'ADMIN');
      await service.postVoucher(TENANT_ID, voucher.id, 'ADMIN');
      await expect(service.postVoucher(TENANT_ID, voucher.id, 'ADMIN')).rejects.toThrow();
    });
  });

  describe('deleteVoucher', () => {
    it('deletes a draft voucher', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];
      const voucher = await service.createCashReceipt(TENANT_ID, {
        cashAccountId: cashAcc.id,
        creditAccountId: 'acc-41101',
        amount: 5000,
        date: '2026-08-18',
        narration: 'To be deleted',
      }, 'admin', 'ADMIN');

      await service.deleteVoucher(TENANT_ID, voucher.id, 'ADMIN');
      const found = await voucherRepo.getVoucherById(TENANT_ID, voucher.id);
      expect(found).toBeNull();
    });

    it('rejects deleting a posted voucher', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];
      const voucher = await service.createCashReceipt(TENANT_ID, {
        cashAccountId: cashAcc.id,
        creditAccountId: 'acc-41101',
        amount: 5000,
        date: '2026-08-18',
        narration: 'Posted',
      }, 'admin', 'ADMIN');
      await service.postVoucher(TENANT_ID, voucher.id, 'ADMIN');
      await expect(service.deleteVoucher(TENANT_ID, voucher.id, 'ADMIN')).rejects.toThrow('Cannot delete a posted voucher');
    });
  });

  describe('getCashBook', () => {
    it('returns correct opening/closing balance', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];

      // Create and post a receipt before the date range
      const v1 = await service.createCashReceipt(TENANT_ID, {
        cashAccountId: cashAcc.id,
        creditAccountId: 'acc-41101',
        amount: 100000,
        date: '2026-07-25',
        narration: 'Opening receipt',
      }, 'admin', 'ADMIN');
      await service.postVoucher(TENANT_ID, v1.id, 'ADMIN');

      // Create and post a receipt in the range
      const v2 = await service.createCashReceipt(TENANT_ID, {
        cashAccountId: cashAcc.id,
        creditAccountId: 'acc-41101',
        amount: 25000,
        date: '2026-08-10',
        narration: 'August receipt',
      }, 'admin', 'ADMIN');
      await service.postVoucher(TENANT_ID, v2.id, 'ADMIN');

      // Create and post a payment in the range
      const v3 = await service.createCashPayment(TENANT_ID, {
        cashAccountId: cashAcc.id,
        debitAccountId: 'acc-61201',
        amount: 10000,
        date: '2026-08-15',
        narration: 'August rent',
      }, 'admin', 'ADMIN');
      await service.postVoucher(TENANT_ID, v3.id, 'ADMIN');

      const summary = await service.getCashBook(TENANT_ID, cashAcc.id, '2026-08-01', '2026-08-31');

      expect(summary.openingBalance).toBe(100000);
      expect(summary.totalReceipts).toBe(25000);
      expect(summary.totalPayments).toBe(10000);
      expect(summary.closingBalance).toBe(115000);
      expect(summary.transactionCount).toBe(2);
    });

    it('calculates running balance correctly', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];

      const v1 = await service.createCashReceipt(TENANT_ID, {
        cashAccountId: cashAcc.id,
        creditAccountId: 'acc-41101',
        amount: 50000,
        date: '2026-08-05',
        narration: 'First receipt',
      }, 'admin', 'ADMIN');
      await service.postVoucher(TENANT_ID, v1.id, 'ADMIN');

      const v2 = await service.createCashPayment(TENANT_ID, {
        cashAccountId: cashAcc.id,
        debitAccountId: 'acc-61201',
        amount: 20000,
        date: '2026-08-10',
        narration: 'Payment',
      }, 'admin', 'ADMIN');
      await service.postVoucher(TENANT_ID, v2.id, 'ADMIN');

      const v3 = await service.createCashReceipt(TENANT_ID, {
        cashAccountId: cashAcc.id,
        creditAccountId: 'acc-41101',
        amount: 30000,
        date: '2026-08-15',
        narration: 'Second receipt',
      }, 'admin', 'ADMIN');
      await service.postVoucher(TENANT_ID, v3.id, 'ADMIN');

      const summary = await service.getCashBook(TENANT_ID, cashAcc.id, '2026-08-01', '2026-08-31');

      expect(summary.transactions.length).toBe(3);
      expect(summary.transactions[0].runningBalance).toBe(50000);
      expect(summary.transactions[1].runningBalance).toBe(30000);
      expect(summary.transactions[2].runningBalance).toBe(60000);
    });
  });

  describe('RBAC', () => {
    it('rejects create for SALES role', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];
      await expect(service.createCashReceipt(TENANT_ID, {
        cashAccountId: cashAcc.id,
        creditAccountId: 'acc-41101',
        amount: 1000,
        date: '2026-08-15',
        narration: 'Test',
      }, 'admin', 'SALES')).rejects.toThrow('Unauthorized');
    });

    it('rejects post for SALES role', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];
      const voucher = await service.createCashReceipt(TENANT_ID, {
        cashAccountId: cashAcc.id,
        creditAccountId: 'acc-41101',
        amount: 1000,
        date: '2026-08-15',
        narration: 'Test',
      }, 'admin', 'ADMIN');
      await expect(service.postVoucher(TENANT_ID, voucher.id, 'SALES')).rejects.toThrow('Unauthorized');
    });

    it('allows full operations for ADMIN role', async () => {
      const cashAcc = (await service.getCashBankAccounts(TENANT_ID))[0];
      const voucher = await service.createCashReceipt(TENANT_ID, {
        cashAccountId: cashAcc.id,
        creditAccountId: 'acc-41101',
        amount: 1000,
        date: '2026-08-15',
        narration: 'Test',
      }, 'admin', 'ADMIN');
      expect(voucher.id).toBeDefined();
      const posted = await service.postVoucher(TENANT_ID, voucher.id, 'ADMIN');
      expect(posted.status).toBe('POSTED');
    });
  });
});
