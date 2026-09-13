"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONTROL_CATEGORY_LABELS = exports.ACCOUNT_TYPE_LABELS = void 0;
exports.deriveNormalBalance = deriveNormalBalance;
/**
 * Labels for AccountType display.
 */
exports.ACCOUNT_TYPE_LABELS = {
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
exports.CONTROL_CATEGORY_LABELS = {
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
function deriveNormalBalance(accountType) {
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
