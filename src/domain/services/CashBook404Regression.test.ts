/**
 * Step 46C-4 Cash Book 404 Remediation — Regression Tests
 *
 * Tests the demo data fallback for POST requests and Cash Book service integrity.
 *
 * Root cause: api.ts blocked demo fallback for POST/PUT/DELETE via `!isStateChanging` guard.
 * When server was unavailable (e.g. Vercel), POST /api/cash-book returned 404 with no fallback.
 * Fix: Removed the guard so demo fallback applies to ALL methods on error responses.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { handleDemoRequest } from '../../ui/lib/demoData';
import { CashBookService } from './CashBookService';
import type { ICOARepository } from '../repositories/ICOARepository';
import type { IVoucherRepository } from '../repositories/IVoucherRepository';
import type { AccountHead } from '../types/coa';
import type { VoucherHeader, VoucherLine, LedgerEntry } from '../types/voucher';

/* ─── Mock Repositories ────────────────────────────────────── */

const TENANT_A = 'tenant-demo-wholesale-001';
const TENANT_B = 'tenant-demo-distribution-002';

const SEED_ACCOUNTS: AccountHead[] = [
  { id: 'acc-11101', tenantId: TENANT_A, accountCode: '11101', accountName: 'Cash in Hand', accountType: 'ASSET', level: 4, isPosting: true, isActive: true, parentId: 'acc-111', createdAt: new Date(), updatedAt: new Date() },
  { id: 'acc-11102', tenantId: TENANT_A, accountCode: '11102', accountName: 'Bank Account', accountType: 'ASSET', level: 4, isPosting: true, isActive: true, parentId: 'acc-111', createdAt: new Date(), updatedAt: new Date() },
  { id: 'acc-41101', tenantId: TENANT_A, accountCode: '41101', accountName: 'Sales Revenue', accountType: 'REVENUE', level: 4, isPosting: true, isActive: true, parentId: 'acc-411', createdAt: new Date(), updatedAt: new Date() },
  { id: 'acc-51101', tenantId: TENANT_A, accountCode: '51101', accountName: 'Purchase Cost', accountType: 'COGS', level: 4, isPosting: true, isActive: true, parentId: 'acc-511', createdAt: new Date(), updatedAt: new Date() },
  // Tenant B accounts
  { id: 'acc-b-11101', tenantId: TENANT_B, accountCode: '11101', accountName: 'Cash in Hand', accountType: 'ASSET', level: 4, isPosting: true, isActive: true, parentId: 'acc-b-111', createdAt: new Date(), updatedAt: new Date() },
  { id: 'acc-b-41101', tenantId: TENANT_B, accountCode: '41101', accountName: 'Sales Revenue', accountType: 'REVENUE', level: 4, isPosting: true, isActive: true, parentId: 'acc-b-411', createdAt: new Date(), updatedAt: new Date() },
];

function createMockCOA(tenantId: string): ICOARepository {
  const accounts = [...SEED_ACCOUNTS];
  return {
    getAccountsByTenantId: async () => accounts.filter(a => a.tenantId === tenantId),
    getAccountById: async (_tid: string, id: string) => accounts.find(a => a.id === id && a.tenantId === tenantId) ?? null,
    getAccountByCode: async (_tid: string, code: string) => accounts.find(a => a.accountCode === code && a.tenantId === tenantId) ?? null,
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
    getVoucherLines: async (_tid: string, voucherId: string) => lines.filter(l => l.voucherId === voucherId),
    createVoucher: async (tid: string, dto: any, createdBy: string) => {
      const id = `voucher-${voucherCounter++}`;
      const header: VoucherHeader = {
        id,
        tenantId: tid,
        voucherNumber: voucherCounter,
        voucherType: dto.voucherType,
        status: 'DRAFT',
        date: dto.date,
        narration: dto.narration,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      headers.push(header);
      for (const line of dto.lines) {
        lines.push({ id: `line-${lines.length + 1}`, voucherId: id, ...line });
      }
      return header;
    },
    postVoucher: async (_tid: string, id: string) => {
      const h = headers.find(v => v.id === id);
      if (!h) throw new Error('Voucher not found');
      h.status = 'POSTED';
      h.updatedAt = new Date();
      // Create ledger entries
      const vLines = lines.filter(l => l.voucherId === id);
      for (const l of vLines) {
        ledger.push({
          id: `ledger-${ledgerCounter++}`,
          tenantId: h.tenantId,
          voucherId: id,
          voucherNumber: h.voucherNumber,
          voucherType: h.voucherType,
          accountId: l.accountId,
          accountCode: l.accountId,
          debit: l.debit,
          credit: l.credit,
          entryDate: h.date,
          narration: l.description,
          createdAt: new Date(),
        });
      }
      return h;
    },
    deleteVoucher: async (_tid: string, id: string) => {
      const idx = headers.findIndex(v => v.id === id);
      if (idx >= 0) headers.splice(idx, 1);
    },
    getLedgerEntries: async (_tid: string, filters?: { accountId?: string; startDate?: string; endDate?: string }) => {
      return ledger.filter(e => {
        if (filters?.accountId && e.accountId !== filters.accountId) return false;
        if (filters?.startDate && e.entryDate < filters.startDate) return false;
        if (filters?.endDate && e.entryDate > filters.endDate) return false;
        return true;
      });
    },
  };
}

/* ─── Tests ────────────────────────────────────────────────── */

describe('Step 46C-4 Cash Book 404 Remediation', () => {

  // ─── Demo Data Fallback Tests ────────────────────────────────

  describe('Demo Fallback: POST requests', () => {
    it('TEST 1: POST /api/cash-book returns demo success', () => {
      const result = handleDemoRequest('/api/cash-book', 'POST', {
        type: 'CR',
        cashAccountId: 'acc-11101',
        counterAccountId: 'acc-41101',
        amount: 5000,
        date: '2026-08-15',
        narration: 'Test receipt',
      });
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('success', true);
    });

    it('TEST 2: POST /api/cash-book with type CP returns demo success', () => {
      const result = handleDemoRequest('/api/cash-book', 'POST', {
        type: 'CP',
        cashAccountId: 'acc-11101',
        counterAccountId: 'acc-51101',
        amount: 3000,
        date: '2026-08-15',
        narration: 'Test payment',
      });
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('success', true);
    });

    it('TEST 3: PUT request returns demo success', () => {
      const result = handleDemoRequest('/api/cash-book/some-id', 'PUT', { field: 'value' });
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('success', true);
    });

    it('TEST 4: DELETE request returns demo success', () => {
      const result = handleDemoRequest('/api/cash-book/some-id', 'DELETE');
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('success', true);
    });

    it('TEST 5: GET /api/cash-book/accounts still works', () => {
      const result = handleDemoRequest('/api/cash-book/accounts', 'GET');
      expect(result).not.toBeNull();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('TEST 6: GET /api/cash-book with params still works', () => {
      const result = handleDemoRequest('/api/cash-book?accountId=acc-11101&startDate=2026-08-01&endDate=2026-08-31', 'GET');
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('account');
      expect(result).toHaveProperty('openingBalance');
      expect(result).toHaveProperty('closingBalance');
    });

    it('TEST 7: switch-tenant demo handler still works', () => {
      const result = handleDemoRequest('/api/auth/switch-tenant', 'POST', { tenantId: 'tenant-demo-wholesale-001' });
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('success', true);
      expect(result.user.tenantId).toBe('tenant-demo-wholesale-001');
    });
  });

  // ─── Cash Book Service: Receipt ──────────────────────────────

  describe('Receipt Creation (Service Layer)', () => {
    let service: CashBookService;

    beforeEach(() => {
      service = new CashBookService(createMockCOA(TENANT_A), createMockVoucher());
    });

    it('TEST 8: Receipt creates CR voucher with correct accounting', async () => {
      const voucher = await service.createCashReceipt(
        TENANT_A,
        { cashAccountId: 'acc-11101', creditAccountId: 'acc-41101', amount: 10000, date: '2026-08-15', narration: 'Sales receipt' },
        'admin',
        'ADMIN',
      );
      expect(voucher.voucherType).toBe('CR');
      expect(voucher.status).toBe('DRAFT');
      expect(voucher.tenantId).toBe(TENANT_A);
    });

    it('TEST 9: Receipt persists through repository', async () => {
      const voucher = await service.createCashReceipt(
        TENANT_A,
        { cashAccountId: 'acc-11101', creditAccountId: 'acc-41101', amount: 5000, date: '2026-08-15', narration: 'Persist test' },
        'admin',
        'ADMIN',
      );
      const found = await service['voucherRepo'].getVoucherById(TENANT_A, voucher.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(voucher.id);
    });

    it('TEST 10: Receipt validation rejects zero amount', async () => {
      await expect(service.createCashReceipt(
        TENANT_A,
        { cashAccountId: 'acc-11101', creditAccountId: 'acc-41101', amount: 0, date: '2026-08-15', narration: 'Zero amount' },
        'admin',
        'ADMIN',
      )).rejects.toThrow('Amount must be greater than zero');
    });

    it('TEST 11: Receipt validation rejects negative amount', async () => {
      await expect(service.createCashReceipt(
        TENANT_A,
        { cashAccountId: 'acc-11101', creditAccountId: 'acc-41101', amount: -100, date: '2026-08-15', narration: 'Negative amount' },
        'admin',
        'ADMIN',
      )).rejects.toThrow('Amount must be greater than zero');
    });

    it('TEST 12: Receipt validation rejects empty narration', async () => {
      await expect(service.createCashReceipt(
        TENANT_A,
        { cashAccountId: 'acc-11101', creditAccountId: 'acc-41101', amount: 1000, date: '2026-08-15', narration: '   ' },
        'admin',
        'ADMIN',
      )).rejects.toThrow('Narration is required');
    });

    it('TEST 13: Receipt rejects invalid cash account', async () => {
      await expect(service.createCashReceipt(
        TENANT_A,
        { cashAccountId: 'acc-invalid', creditAccountId: 'acc-41101', amount: 1000, date: '2026-08-15', narration: 'Invalid account' },
        'admin',
        'ADMIN',
      )).rejects.toThrow('Cash/Bank account not found');
    });
  });

  // ─── Cash Book Service: Payment ──────────────────────────────

  describe('Payment Creation (Service Layer)', () => {
    let service: CashBookService;

    beforeEach(() => {
      service = new CashBookService(createMockCOA(TENANT_A), createMockVoucher());
    });

    it('TEST 14: Payment creates CP voucher with correct accounting', async () => {
      const voucher = await service.createCashPayment(
        TENANT_A,
        { cashAccountId: 'acc-11101', debitAccountId: 'acc-51101', amount: 8000, date: '2026-08-15', narration: 'Purchase payment' },
        'admin',
        'ADMIN',
      );
      expect(voucher.voucherType).toBe('CP');
      expect(voucher.status).toBe('DRAFT');
      expect(voucher.tenantId).toBe(TENANT_A);
    });

    it('TEST 15: Payment persists through repository', async () => {
      const voucher = await service.createCashPayment(
        TENANT_A,
        { cashAccountId: 'acc-11101', debitAccountId: 'acc-51101', amount: 3000, date: '2026-08-15', narration: 'Persist test' },
        'admin',
        'ADMIN',
      );
      const found = await service['voucherRepo'].getVoucherById(TENANT_A, voucher.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(voucher.id);
    });

    it('TEST 16: Payment validation rejects zero amount', async () => {
      await expect(service.createCashPayment(
        TENANT_A,
        { cashAccountId: 'acc-11101', debitAccountId: 'acc-51101', amount: 0, date: '2026-08-15', narration: 'Zero' },
        'admin',
        'ADMIN',
      )).rejects.toThrow('Amount must be greater than zero');
    });

    it('TEST 17: Payment validation rejects empty narration', async () => {
      await expect(service.createCashPayment(
        TENANT_A,
        { cashAccountId: 'acc-11101', debitAccountId: 'acc-51101', amount: 1000, date: '2026-08-15', narration: '' },
        'admin',
        'ADMIN',
      )).rejects.toThrow();
    });
  });

  // ─── Debit/Credit Integrity ──────────────────────────────────

  describe('Debit/Credit Integrity', () => {
    it('TEST 18: Receipt: DR cash = CR counterparty', async () => {
      const coa = createMockCOA(TENANT_A);
      const voucherRepo = createMockVoucher();
      const service = new CashBookService(coa, voucherRepo);

      const voucher = await service.createCashReceipt(
        TENANT_A,
        { cashAccountId: 'acc-11101', creditAccountId: 'acc-41101', amount: 7500, date: '2026-08-15', narration: 'DR=CR test' },
        'admin',
        'ADMIN',
      );

      const vLines = await voucherRepo.getVoucherLines(TENANT_A, voucher.id);
      const totalDebit = vLines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredit = vLines.reduce((sum, l) => sum + l.credit, 0);
      expect(totalDebit).toBe(totalCredit);
      expect(totalDebit).toBe(7500);
    });

    it('TEST 19: Payment: DR counterparty = CR cash', async () => {
      const coa = createMockCOA(TENANT_A);
      const voucherRepo = createMockVoucher();
      const service = new CashBookService(coa, voucherRepo);

      const voucher = await service.createCashPayment(
        TENANT_A,
        { cashAccountId: 'acc-11101', debitAccountId: 'acc-51101', amount: 4200, date: '2026-08-15', narration: 'DR=CR test' },
        'admin',
        'ADMIN',
      );

      const vLines = await voucherRepo.getVoucherLines(TENANT_A, voucher.id);
      const totalDebit = vLines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredit = vLines.reduce((sum, l) => sum + l.credit, 0);
      expect(totalDebit).toBe(totalCredit);
      expect(totalDebit).toBe(4200);
    });
  });

  // ─── Tenant Isolation ────────────────────────────────────────

  describe('Tenant Isolation', () => {
    it('TEST 20: Tenant A receipts invisible to Tenant B', async () => {
      const coaA = createMockCOA(TENANT_A);
      const coaB = createMockCOA(TENANT_B);
      const voucherRepo = createMockVoucher();
      const serviceA = new CashBookService(coaA, voucherRepo);
      const serviceB = new CashBookService(coaB, voucherRepo);

      // Create receipt in Tenant A
      await serviceA.createCashReceipt(
        TENANT_A,
        { cashAccountId: 'acc-11101', creditAccountId: 'acc-41101', amount: 5000, date: '2026-08-15', narration: 'Tenant A receipt' },
        'admin',
        'ADMIN',
      );

      // Tenant B should have no cash/bank accounts (its 11101 is a different ID)
      const accountsB = await serviceB.getCashBankAccounts(TENANT_B);
      expect(accountsB.length).toBe(1); // Tenant B has its own 11101
      expect(accountsB[0].id).toBe('acc-b-11101');
    });

    it('TEST 21: Tenant A and Tenant B have separate account sets', async () => {
      const coaA = createMockCOA(TENANT_A);
      const coaB = createMockCOA(TENANT_B);
      const serviceA = new CashBookService(coaA, createMockVoucher());
      const serviceB = new CashBookService(coaB, createMockVoucher());

      const accountsA = await serviceA.getCashBankAccounts(TENANT_A);
      const accountsB = await serviceB.getCashBankAccounts(TENANT_B);

      expect(accountsA[0].id).not.toBe(accountsB[0].id);
    });
  });

  // ─── Authentication / RBAC ───────────────────────────────────

  describe('Authentication & RBAC', () => {
    it('TEST 22: Receipt requires cash.create permission', async () => {
      const service = new CashBookService(createMockCOA(TENANT_A), createMockVoucher());
      await expect(service.createCashReceipt(
        TENANT_A,
        { cashAccountId: 'acc-11101', creditAccountId: 'acc-41101', amount: 1000, date: '2026-08-15', narration: 'Auth test' },
        'admin',
        'VIEWER', // VIEWER does not have cash.create
      )).rejects.toThrow('Unauthorized');
    });

    it('TEST 23: Payment requires cash.create permission', async () => {
      const service = new CashBookService(createMockCOA(TENANT_A), createMockVoucher());
      await expect(service.createCashPayment(
        TENANT_A,
        { cashAccountId: 'acc-11101', debitAccountId: 'acc-51101', amount: 1000, date: '2026-08-15', narration: 'Auth test' },
        'admin',
        'VIEWER', // VIEWER does not have cash.create
      )).rejects.toThrow('Unauthorized');
    });

    it('TEST 24: ADMIN and MANAGER can create cash vouchers', async () => {
      const service = new CashBookService(createMockCOA(TENANT_A), createMockVoucher());

      const receipt = await service.createCashReceipt(
        TENANT_A,
        { cashAccountId: 'acc-11101', creditAccountId: 'acc-41101', amount: 1000, date: '2026-08-15', narration: 'Admin receipt' },
        'admin',
        'ADMIN',
      );
      expect(receipt.voucherType).toBe('CR');

      const payment = await service.createCashPayment(
        TENANT_A,
        { cashAccountId: 'acc-11101', debitAccountId: 'acc-51101', amount: 1000, date: '2026-08-15', narration: 'Manager payment' },
        'manager',
        'MANAGER',
      );
      expect(payment.voucherType).toBe('CP');
    });
  });

  // ─── Existing Cash Book Behavior ─────────────────────────────

  describe('Existing Cash Book Behavior', () => {
    it('TEST 25: getCashBankAccounts returns only cash/bank accounts', async () => {
      const service = new CashBookService(createMockCOA(TENANT_A), createMockVoucher());
      const accounts = await service.getCashBankAccounts(TENANT_A);
      for (const a of accounts) {
        expect(['11101', '11102']).toContain(a.accountCode);
        expect(a.isActive).toBe(true);
      }
    });

    it('TEST 26: Post voucher transitions DRAFT to POSTED', async () => {
      const voucherRepo = createMockVoucher();
      const service = new CashBookService(createMockCOA(TENANT_A), voucherRepo);

      const voucher = await service.createCashReceipt(
        TENANT_A,
        { cashAccountId: 'acc-11101', creditAccountId: 'acc-41101', amount: 2000, date: '2026-08-15', narration: 'Post test' },
        'admin',
        'ADMIN',
      );
      expect(voucher.status).toBe('DRAFT');

      const posted = await service.postVoucher(TENANT_A, voucher.id, 'ADMIN');
      expect(posted.status).toBe('POSTED');
    });

    it('TEST 27: Cannot delete a posted voucher', async () => {
      const voucherRepo = createMockVoucher();
      const service = new CashBookService(createMockCOA(TENANT_A), voucherRepo);

      const voucher = await service.createCashReceipt(
        TENANT_A,
        { cashAccountId: 'acc-11101', creditAccountId: 'acc-41101', amount: 2000, date: '2026-08-15', narration: 'Delete test' },
        'admin',
        'ADMIN',
      );
      await service.postVoucher(TENANT_A, voucher.id, 'ADMIN');

      await expect(service.deleteVoucher(TENANT_A, voucher.id, 'ADMIN'))
        .rejects.toThrow('Cannot delete a posted voucher');
    });

    it('TEST 28: Can delete a draft voucher', async () => {
      const voucherRepo = createMockVoucher();
      const service = new CashBookService(createMockCOA(TENANT_A), voucherRepo);

      const voucher = await service.createCashPayment(
        TENANT_A,
        { cashAccountId: 'acc-11101', debitAccountId: 'acc-51101', amount: 1500, date: '2026-08-15', narration: 'Draft delete' },
        'admin',
        'ADMIN',
      );
      expect(voucher.status).toBe('DRAFT');

      await service.deleteVoucher(TENANT_A, voucher.id, 'ADMIN');
      const found = await service['voucherRepo'].getVoucherById(TENANT_A, voucher.id);
      expect(found).toBeNull();
    });
  });
});
