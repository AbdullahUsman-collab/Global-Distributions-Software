/**
 * Default Chart of Accounts Seed
 *
 * Seeds the standard 4-level COA hierarchy for a new tenant.
 * Source of truth: MockCOAAdapter.buildSeedTree() + audit/03_MASTER_DATA.md
 *
 * RULE: Same COA structure for every tenant.
 * RULE: Each tenant gets its own AccountHead rows (different DB IDs).
 * RULE: Account codes are logically consistent across tenants.
 */

import { query } from '../db/pool.js';

interface SeedAccount {
  code: string;
  name: string;
  level: 1 | 2 | 3 | 4;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'COGS' | 'EXPENSE';
  parentCode: string | null;
  controlCategory?: string;
  legacyMainHeadNo?: number;
  accountEffect?: string;
}

function deriveNormalBalance(type: SeedAccount['type']): 'DEBIT' | 'CREDIT' {
  switch (type) {
    case 'ASSET':
    case 'COGS':
    case 'EXPENSE':
      return 'DEBIT';
    case 'LIABILITY':
    case 'EQUITY':
    case 'REVENUE':
      return 'CREDIT';
  }
}

const DEFAULT_COA: SeedAccount[] = [
  // LEVEL 1 — Major Heads
  { code: '10000', name: 'Assets', level: 1, type: 'ASSET', parentCode: null, legacyMainHeadNo: 100, accountEffect: 'Balance Sheet' },
  { code: '20000', name: 'Liabilities', level: 1, type: 'LIABILITY', parentCode: null, accountEffect: 'Balance Sheet' },
  { code: '30000', name: 'Equity', level: 1, type: 'EQUITY', parentCode: null, legacyMainHeadNo: 200, accountEffect: 'Balance Sheet' },
  { code: '40000', name: 'Revenue', level: 1, type: 'REVENUE', parentCode: null, legacyMainHeadNo: 1600, accountEffect: 'Profit and Loss' },
  { code: '50000', name: 'Cost of Goods Sold', level: 1, type: 'COGS', parentCode: null, accountEffect: 'Profit and Loss' },
  { code: '60000', name: 'Expenses', level: 1, type: 'EXPENSE', parentCode: null, legacyMainHeadNo: 1500, accountEffect: 'Profit and Loss' },

  // LEVEL 2 — Control Groups
  { code: '11000', name: 'Current Assets', level: 2, type: 'ASSET', parentCode: '10000' },
  { code: '12000', name: 'Fixed Assets', level: 2, type: 'ASSET', parentCode: '10000', legacyMainHeadNo: 250 },
  { code: '21000', name: 'Current Liabilities', level: 2, type: 'LIABILITY', parentCode: '20000' },
  { code: '31000', name: "Owner's Equity", level: 2, type: 'EQUITY', parentCode: '30000' },
  { code: '41000', name: 'Operating Revenue', level: 2, type: 'REVENUE', parentCode: '40000' },
  { code: '51000', name: 'Direct Costs', level: 2, type: 'COGS', parentCode: '50000' },
  { code: '61000', name: 'Administrative Expenses', level: 2, type: 'EXPENSE', parentCode: '60000' },
  { code: '62000', name: 'Staff Accounts', level: 2, type: 'EXPENSE', parentCode: '60000', legacyMainHeadNo: 400 },

  // LEVEL 3 — Sub-Groups
  { code: '11100', name: 'Cash & Bank', level: 3, type: 'ASSET', parentCode: '11000', controlCategory: 'CASH', legacyMainHeadNo: 1 },
  { code: '11200', name: 'Accounts Receivable', level: 3, type: 'ASSET', parentCode: '11000', controlCategory: 'RECEIVABLE', legacyMainHeadNo: 500 },
  { code: '11300', name: 'Inventory Group', level: 3, type: 'ASSET', parentCode: '11000', controlCategory: 'INVENTORY' },
  { code: '11400', name: 'Tax Receivable', level: 3, type: 'ASSET', parentCode: '11000', controlCategory: 'TAX' },
  { code: '12100', name: 'Property & Equipment', level: 3, type: 'ASSET', parentCode: '12000' },
  { code: '12200', name: 'Vehicles', level: 3, type: 'ASSET', parentCode: '12000' },
  { code: '21100', name: 'Accounts Payable', level: 3, type: 'LIABILITY', parentCode: '21000', controlCategory: 'PAYABLE', legacyMainHeadNo: 8000 },
  { code: '21200', name: 'Tax Payable', level: 3, type: 'LIABILITY', parentCode: '21000', controlCategory: 'TAX' },
  { code: '31100', name: 'Capital Accounts', level: 3, type: 'EQUITY', parentCode: '31000' },
  { code: '31200', name: 'Retained Earnings Group', level: 3, type: 'EQUITY', parentCode: '31000' },
  { code: '41100', name: 'Sales Revenue', level: 3, type: 'REVENUE', parentCode: '41000' },
  { code: '51100', name: 'Purchase Costs', level: 3, type: 'COGS', parentCode: '51000' },
  { code: '61100', name: 'General Administrative Expenses', level: 3, type: 'EXPENSE', parentCode: '61000' },
  { code: '62100', name: 'Salaries & Wages', level: 3, type: 'EXPENSE', parentCode: '62000' },
  { code: '62200', name: 'Staff Benefits', level: 3, type: 'EXPENSE', parentCode: '62000' },

  // LEVEL 4 — Detail/Posting Accounts
  { code: '11101', name: 'Cash in Hand', level: 4, type: 'ASSET', parentCode: '11100', controlCategory: 'CASH', legacyMainHeadNo: 1 },
  { code: '11102', name: 'Bank Account Main', level: 4, type: 'ASSET', parentCode: '11100', controlCategory: 'BANK' },
  { code: '11301', name: 'General Inventory', level: 4, type: 'ASSET', parentCode: '11300', controlCategory: 'INVENTORY' },
  { code: '11302', name: 'Finished Goods', level: 4, type: 'ASSET', parentCode: '11300', controlCategory: 'INVENTORY' },
  { code: '11401', name: 'Sales Tax Input', level: 4, type: 'ASSET', parentCode: '11400', controlCategory: 'TAX' },
  { code: '11402', name: 'Advance Income Tax', level: 4, type: 'ASSET', parentCode: '11400', controlCategory: 'TAX' },
  { code: '11403', name: 'FED Input', level: 4, type: 'ASSET', parentCode: '11400', controlCategory: 'TAX' },
  { code: '12101', name: 'Office Equipment', level: 4, type: 'ASSET', parentCode: '12100' },
  { code: '12102', name: 'Computer Equipment', level: 4, type: 'ASSET', parentCode: '12100' },
  { code: '12201', name: 'Delivery Vehicles', level: 4, type: 'ASSET', parentCode: '12200' },
  { code: '11201', name: 'Trade Receivables', level: 4, type: 'ASSET', parentCode: '11200', controlCategory: 'RECEIVABLE', legacyMainHeadNo: 500 },
  { code: '11501', name: 'Accumulated Depreciation', level: 4, type: 'ASSET', parentCode: '12100' },
  { code: '21201', name: 'Sales Tax Output', level: 4, type: 'LIABILITY', parentCode: '21200', controlCategory: 'TAX' },
  { code: '21202', name: 'Withholding Tax Payable', level: 4, type: 'LIABILITY', parentCode: '21200', controlCategory: 'TAX' },
  { code: '21203', name: 'FED Payable', level: 4, type: 'LIABILITY', parentCode: '21200', controlCategory: 'TAX' },
  { code: '31101', name: "Owner's Capital", level: 4, type: 'EQUITY', parentCode: '31100' },
  { code: '31201', name: 'Retained Earnings', level: 4, type: 'EQUITY', parentCode: '31200' },
  { code: '41101', name: 'Wholesale Sales', level: 4, type: 'REVENUE', parentCode: '41100' },
  { code: '41102', name: 'Retail Sales', level: 4, type: 'REVENUE', parentCode: '41100' },
  { code: '41103', name: 'Service Income', level: 4, type: 'REVENUE', parentCode: '41100' },
  { code: '41104', name: 'Sales Return', level: 4, type: 'REVENUE', parentCode: '41100' },
  { code: '51101', name: 'Material Purchases', level: 4, type: 'COGS', parentCode: '51100' },
  { code: '51102', name: 'Freight & Duties', level: 4, type: 'COGS', parentCode: '51100' },
  { code: '51103', name: 'Direct Production Costs', level: 4, type: 'COGS', parentCode: '51100' },
  { code: '51104', name: 'Purchase Return', level: 4, type: 'COGS', parentCode: '51100' },
  { code: '61101', name: 'Rent Expense', level: 4, type: 'EXPENSE', parentCode: '61100' },
  { code: '61102', name: 'Utilities Expense', level: 4, type: 'EXPENSE', parentCode: '61100' },
  { code: '61103', name: 'Office Salaries', level: 4, type: 'EXPENSE', parentCode: '61100' },
  { code: '61104', name: 'Depreciation Expense', level: 4, type: 'EXPENSE', parentCode: '61100' },
  { code: '62101', name: 'Monthly Salaries', level: 4, type: 'EXPENSE', parentCode: '62100' },
  { code: '62102', name: 'Overtime Pay', level: 4, type: 'EXPENSE', parentCode: '62100' },
  { code: '62201', name: 'Employee Benefits', level: 4, type: 'EXPENSE', parentCode: '62200' },
  { code: '62202', name: 'Staff Loans', level: 4, type: 'EXPENSE', parentCode: '62200' },
];

/**
 * Seed the default COA for a new tenant.
 * Inserts all accounts in level order (parents before children).
 * Uses ON CONFLICT DO NOTHING for idempotency.
 * Returns the number of accounts inserted.
 */
export async function seedDefaultCOA(tenantId: string): Promise<number> {
  const codeToId = new Map<string, string>();
  let inserted = 0;

  for (const acct of DEFAULT_COA) {
    const id = `acct-${tenantId}-${acct.code}`;
    const normalBalance = deriveNormalBalance(acct.type);
    const isPosting = acct.level === 4;
    const isSummary = !isPosting;
    const parentId = acct.parentCode ? (codeToId.get(acct.parentCode) ?? null) : null;

    await query(
      `INSERT INTO accounts (id, tenant_id, account_code, account_name, parent_id, level,
         account_type, normal_balance, is_posting, is_summary, is_active,
         control_category, legacy_main_head_no, account_effect)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11,$12,$13)
       ON CONFLICT (tenant_id, account_code) DO NOTHING`,
      [
        id, tenantId, acct.code, acct.name, parentId, acct.level,
        acct.type, normalBalance, isPosting, isSummary,
        acct.controlCategory ?? null, acct.legacyMainHeadNo ?? null, acct.accountEffect ?? null,
      ]
    );
    codeToId.set(acct.code, id);
    inserted++;
  }

  return inserted;
}

/**
 * Get the list of default COA account codes (for verification).
 */
export function getDefaultCOACodes(): string[] {
  return DEFAULT_COA.map(a => a.code);
}

/**
 * Get default COA account count.
 */
export function getDefaultCOACount(): number {
  return DEFAULT_COA.length;
}
