/**
 * Mock Chart of Accounts Adapter
 * DEVELOPMENT ONLY — In-memory mock implementation of ICOARepository.
 *
 * Seeds a complete 4-level account hierarchy for each active demo tenant.
 * Source: Task Step 6 specification + audit/04_ACCOUNTING_ENGINE.md
 */

import {
  AccountHead,
  CreateAccountHeadDTO,
  UpdateAccountHeadDTO,
  deriveNormalBalance,
} from '../../types/coa';
import { ICOARepository } from '../../repositories/ICOARepository';

/* ─── Helpers ──────────────────────────────────────────────── */

let nextId = 1000;

function uid(): string {
  return `coa-${nextId++}`;
}

function makeAccount(
  tenantId: string,
  code: string,
  name: string,
  level: 1 | 2 | 3 | 4,
  accountType: AccountHead['accountType'],
  parentId: string | null,
  controlCategory?: AccountHead['controlCategory'],
): AccountHead {
  const normalBalance = deriveNormalBalance(accountType);
  return {
    id: uid(),
    tenantId,
    accountCode: code,
    accountName: name,
    parentId,
    level,
    accountType,
    normalBalance,
    isPosting: level === 4,
    isSummary: level !== 4,
    isActive: true,
    controlCategory,
  };
}

/* ─── Seed Data Builder ────────────────────────────────────── */

function buildSeedTree(tenantId: string): AccountHead[] {
  const accounts: AccountHead[] = [];

  function add(code: string, name: string, level: 1 | 2 | 3 | 4, type: AccountHead['accountType'], parentCode: string | null, cc?: AccountHead['controlCategory']) {
    const parent = parentCode ? accounts.find(a => a.accountCode === parentCode && a.tenantId === tenantId) : null;
    const parentId = parent ? parent.id : null;
    accounts.push(makeAccount(tenantId, code, name, level, type, parentId, cc));
  }

  // ═══════════════════════════════════════════════════════════
  // LEVEL 1 — Major Heads
  // ═══════════════════════════════════════════════════════════
  add('10000', 'Assets',                1, 'ASSET',    null);
  add('20000', 'Liabilities',           1, 'LIABILITY', null);
  add('30000', 'Equity',                1, 'EQUITY',   null);
  add('40000', 'Revenue',               1, 'REVENUE',  null);
  add('50000', 'Cost of Goods Sold',    1, 'COGS',     null);
  add('60000', 'Expenses',              1, 'EXPENSE',  null);

  // ═══════════════════════════════════════════════════════════
  // LEVEL 2 — Control Groups
  // ═══════════════════════════════════════════════════════════
  add('11000', 'Current Assets',        2, 'ASSET',     '10000');
  add('21000', 'Current Liabilities',   2, 'LIABILITY', '20000');
  add('31000', "Owner's Equity",        2, 'EQUITY',    '30000');
  add('41000', 'Operating Revenue',     2, 'REVENUE',   '40000');
  add('51000', 'Direct Costs',          2, 'COGS',      '50000');
  add('61000', 'Administrative Expenses', 2, 'EXPENSE', '60000');

  // ═══════════════════════════════════════════════════════════
  // LEVEL 3 — Sub-Groups
  // ═══════════════════════════════════════════════════════════
  add('11100', 'Cash & Bank',           3, 'ASSET',     '11000', 'CASH');
  add('11200', 'Accounts Receivable',   3, 'ASSET',     '11000', 'RECEIVABLE');
  add('11300', 'Inventory Group',       3, 'ASSET',     '11000', 'INVENTORY');
  add('11400', 'Tax Receivable',        3, 'ASSET',     '11000', 'TAX');
  add('21100', 'Accounts Payable',      3, 'LIABILITY', '21000', 'PAYABLE');
  add('21200', 'Tax Payable',           3, 'LIABILITY', '21000', 'TAX');
  add('31100', 'Capital Accounts',      3, 'EQUITY',    '31000');
  add('31200', 'Retained Earnings Group', 3, 'EQUITY', '31000');
  add('41100', 'Sales Revenue',         3, 'REVENUE',   '41000');
  add('51100', 'Purchase Costs',        3, 'COGS',      '51000');
  add('61100', 'General Administrative Expenses', 3, 'EXPENSE', '61000');

  // ═══════════════════════════════════════════════════════════
  // LEVEL 4 — Detail/Posting Accounts
  // ═══════════════════════════════════════════════════════════
  add('11101', 'Cash in Hand',          4, 'ASSET',     '11100', 'CASH');
  add('11102', 'Bank Account Main',     4, 'ASSET',     '11100', 'BANK');
  add('11301', 'General Inventory',     4, 'ASSET',     '11300', 'INVENTORY');
  add('11302', 'Finished Goods',        4, 'ASSET',     '11300', 'INVENTORY');
  add('11401', 'Sales Tax Input',       4, 'ASSET',     '11400', 'TAX');
  add('11402', 'Advance Income Tax',    4, 'ASSET',     '11400', 'TAX');
  add('21201', 'Sales Tax Output',      4, 'LIABILITY', '21200', 'TAX');
  add('21202', 'Withholding Tax Payable', 4, 'LIABILITY', '21200', 'TAX');
  add('21203', 'FED Payable',           4, 'LIABILITY', '21200', 'TAX');
  add('31101', "Owner's Capital",       4, 'EQUITY',    '31100');
  add('31201', 'Retained Earnings',     4, 'EQUITY',    '31200');
  add('41101', 'Wholesale Sales',       4, 'REVENUE',   '41100');
  add('41102', 'Retail Sales',          4, 'REVENUE',   '41100');
  add('41103', 'Service Income',        4, 'REVENUE',   '41100');
  add('51101', 'Material Purchases',    4, 'COGS',      '51100');
  add('51102', 'Freight & Duties',      4, 'COGS',      '51100');
  add('51103', 'Direct Production Costs', 4, 'COGS',   '51100');
  add('61101', 'Rent Expense',          4, 'EXPENSE',   '61100');
  add('61102', 'Utilities Expense',     4, 'EXPENSE',   '61100');
  add('61103', 'Office Salaries',       4, 'EXPENSE',   '61100');

  return accounts;
}

/* ─── Tenant Seed Map ──────────────────────────────────────── */

const TENANT_IDS = [
  'tenant-demo-wholesale-001',
  'tenant-demo-distribution-002',
  'tenant-apex-trading-003',
];

const store: Map<string, AccountHead[]> = new Map();

for (const tid of TENANT_IDS) {
  store.set(tid, buildSeedTree(tid));
}

/* ─── Adapter Implementation ───────────────────────────────── */

/**
 * Mock implementation of ICOARepository.
 * DEVELOPMENT ONLY — Do not use in production.
 */
export class MockCOAAdapter implements ICOARepository {

  async getAccountsByTenantId(tenantId: string): Promise<AccountHead[]> {
    const accounts = store.get(tenantId) ?? [];
    return accounts.map(a => ({ ...a }));
  }

  async getAccountById(tenantId: string, id: string): Promise<AccountHead | null> {
    const accounts = store.get(tenantId) ?? [];
    const found = accounts.find(a => a.id === id);
    return found ? { ...found } : null;
  }

  async getAccountByCode(tenantId: string, code: string): Promise<AccountHead | null> {
    const accounts = store.get(tenantId) ?? [];
    const found = accounts.find(a => a.accountCode === code);
    return found ? { ...found } : null;
  }

  async createAccount(tenantId: string, dto: CreateAccountHeadDTO): Promise<AccountHead> {
    const accounts = store.get(tenantId) ?? [];

    // Validate parent-child level constraint
    if (dto.parentId) {
      const parent = accounts.find(a => a.id === dto.parentId);
      if (!parent) throw new Error('Parent account not found');
      if (dto.level !== (parent.level + 1) as AccountHead['level']) {
        throw new Error(`Level must be ${parent.level + 1} for a child of a Level ${parent.level} account`);
      }
    } else if (dto.level !== 1) {
      throw new Error('Root accounts must be Level 1');
    }

    // Check for duplicate code
    if (accounts.some(a => a.accountCode === dto.accountCode)) {
      throw new Error(`Account code ${dto.accountCode} already exists`);
    }

    const normalBalance = deriveNormalBalance(dto.accountType);
    const account: AccountHead = {
      id: uid(),
      tenantId,
      accountCode: dto.accountCode,
      accountName: dto.accountName,
      parentId: dto.parentId,
      level: dto.level,
      accountType: dto.accountType,
      normalBalance,
      isPosting: dto.level === 4,
      isSummary: dto.level !== 4,
      isActive: dto.isActive ?? true,
      controlCategory: dto.controlCategory,
    };

    accounts.push(account);
    store.set(tenantId, accounts);
    return { ...account };
  }

  async updateAccount(tenantId: string, id: string, dto: UpdateAccountHeadDTO): Promise<AccountHead> {
    const accounts = store.get(tenantId) ?? [];
    const index = accounts.findIndex(a => a.id === id);
    if (index === -1) throw new Error('Account not found');

    const existing = accounts[index];
    const updated: AccountHead = {
      ...existing,
      accountName: dto.accountName ?? existing.accountName,
      isActive: dto.isActive ?? existing.isActive,
      controlCategory: dto.controlCategory === null ? undefined : (dto.controlCategory ?? existing.controlCategory),
    };

    accounts[index] = updated;
    store.set(tenantId, accounts);
    return { ...updated };
  }

  async deactivateAccount(tenantId: string, id: string): Promise<void> {
    const accounts = store.get(tenantId) ?? [];
    const index = accounts.findIndex(a => a.id === id);
    if (index === -1) throw new Error('Account not found');
    accounts[index] = { ...accounts[index], isActive: false };
    store.set(tenantId, accounts);
  }
}
