/**
 * Chart of Accounts (COA) Domain Types
 * Defines the 4-level account hierarchy, account types, and posting semantics.
 *
 * Source of Truth:
 *   - audit/04_ACCOUNTING_ENGINE.md (Account types, normal balance, hierarchy)
 *   - audit/23_DATA_MODEL.md (AccountHead fields, ControlCategory)
 *   - audit/03_MASTER_DATA.md (Account relationships)
 *   - audit/MASTER_REVERSE_ENGINEERED_SPEC.md (Accounting effects)
 */

/* ─── Enums ────────────────────────────────────────────────── */

/**
 * Account Type enumeration.
 * Source: audit/04_ACCOUNTING_ENGINE.md, audit/23_DATA_MODEL.md
 */
export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'COGS' | 'EXPENSE';

/**
 * Normal Balance derivation rule.
 * Source: audit/04_ACCOUNTING_ENGINE.md
 *   ASSET, COGS, EXPENSE -> DEBIT
 *   LIABILITY, EQUITY, REVENUE -> CREDIT
 */
export type NormalBalance = 'DEBIT' | 'CREDIT';

/**
 * Account hierarchy level (1-4).
 * Source: audit/04_ACCOUNTING_ENGINE.md
 *   Level 1: Major Head / Root (isPosting=false, isSummary=true, parentId=null)
 *   Level 2: Control Group (isPosting=false, isSummary=true)
 *   Level 3: Sub-Group (isPosting=false, isSummary=true)
 *   Level 4: Detail Account (isPosting=true, isSummary=false)
 */
export type AccountLevel = 1 | 2 | 3 | 4;

/**
 * Control Category for sub-ledger integration readiness.
 * Source: audit/23_DATA_MODEL.md
 */
export type ControlCategory =
  | 'RECEIVABLE'
  | 'PAYABLE'
  | 'CASH'
  | 'BANK'
  | 'INVENTORY'
  | 'TAX';

/**
 * Labels for AccountType display.
 */
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  ASSET: 'Asset',
  LIABILITY: 'Liability',
  EQUITY: 'Equity',
  REVENUE: 'Revenue',
  COGS: 'Cost of Goods Sold',
  EXPENSE: 'Expense',
};

/**
 * Labels for ControlCategory display.
 */
export const CONTROL_CATEGORY_LABELS: Record<ControlCategory, string> = {
  RECEIVABLE: 'Receivable',
  PAYABLE: 'Payable',
  CASH: 'Cash',
  BANK: 'Bank',
  INVENTORY: 'Inventory',
  TAX: 'Tax',
};

/**
 * Derive normal balance from account type.
 * Source: audit/04_ACCOUNTING_ENGINE.md
 *
 * RULE: This is deterministic. UI and domain must not allow invalid combos.
 */
export function deriveNormalBalance(accountType: AccountType): NormalBalance {
  switch (accountType) {
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

/* ─── Entity ───────────────────────────────────────────────── */

/**
 * Account Head entity.
 * Source: audit/23_DATA_MODEL.md (account_heads table)
 * Extended with verified legacy fields from audit/03_MASTER_DATA.md (Accounts table)
 */
export interface AccountHead {
  /** Unique identifier (UUID) */
  id: string;
  /** Tenant scoping key */
  tenantId: string;
  /** 5-digit numeric account code string */
  accountCode: string;
  /** Descriptive account name */
  accountName: string;
  /** Parent account ID (null for Level 1 roots) */
  parentId: string | null;
  /** Hierarchy level (1-4) */
  level: AccountLevel;
  /** Account type classification */
  accountType: AccountType;
  /** Normal balance (derived from accountType) */
  normalBalance: NormalBalance;
  /** true ONLY for Level 4 detail accounts */
  isPosting: boolean;
  /** true ONLY for Levels 1-3 summary/control accounts */
  isSummary: boolean;
  /** Active status toggle */
  isActive: boolean;
  /** Optional sub-ledger integration category */
  controlCategory?: ControlCategory;

  // ─── Verified Legacy Compatibility Fields ──────────────────
  // Source: audit/03_MASTER_DATA.md (Main_Heads.Main_Head_No)
  /** Legacy Main Head number for backward-compatibility mapping */
  legacyMainHeadNo?: number;
  // Source: audit/03_MASTER_DATA.md (Main_Heads.Effect)
  /** Balance Sheet / Profit and Loss classification from legacy Main_Heads.Effect */
  accountEffect?: 'Balance Sheet' | 'Profit and Loss' | 'Both';

  // ─── Verified Account Metadata (Level 4 posting accounts) ─
  // Source: audit/23_DATA_MODEL.md (Accounts table fields)
  /** Physical address (for party/customer/supplier accounts) */
  address?: string;
  /** Owner / contact person name */
  ownerName?: string;
  /** Phone number */
  phone?: string;
  /** Sales Tax Number (STN) */
  stn?: string;
  /** National Tax Number (NTN) */
  ntn?: string;
  /** Computerized National Identity Card number */
  cnic?: string;
}

/* ─── DTOs ─────────────────────────────────────────────────── */

/**
 * Payload for creating a new Account Head.
 * normalBalance, isPosting, isSummary are derived server-side.
 */
export interface CreateAccountHeadDTO {
  accountCode: string;
  accountName: string;
  parentId: string | null;
  level: AccountLevel;
  accountType: AccountType;
  isActive?: boolean;
  controlCategory?: ControlCategory;
  legacyMainHeadNo?: number;
  accountEffect?: 'Balance Sheet' | 'Profit and Loss' | 'Both';
  address?: string;
  ownerName?: string;
  phone?: string;
  stn?: string;
  ntn?: string;
  cnic?: string;
}

/**
 * Payload for updating an Account Head.
 * Only mutable fields are included.
 */
export interface UpdateAccountHeadDTO {
  accountName?: string;
  isActive?: boolean;
  controlCategory?: ControlCategory | null;
  legacyMainHeadNo?: number;
  accountEffect?: 'Balance Sheet' | 'Profit and Loss' | 'Both' | null;
  address?: string;
  ownerName?: string;
  phone?: string;
  stn?: string;
  ntn?: string;
  cnic?: string;
}
