"use strict";
/**
 * Voucher & Ledger Domain Types
 * Defines double-entry voucher system types for journal entry and general ledger.
 *
 * Source of Truth: audit/04_ACCOUNTING_ENGINE.md, audit/23_DATA_MODEL.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VOUCHER_STATUS_LABELS = exports.VOUCHER_TYPE_LABELS = void 0;
exports.totalDebit = totalDebit;
exports.totalCredit = totalCredit;
exports.isBalanced = isBalanced;
/* ─── Display Labels ───────────────────────────────────────── */
exports.VOUCHER_TYPE_LABELS = {
    JV: 'Journal Voucher',
    CV: 'Cash Voucher',
    CP: 'Cash Payment',
    CR: 'Cash Receipt',
    PV: 'Payment Voucher',
    SV: 'Sale Voucher',
    SRV: 'Sale Return Voucher',
    PRV: 'Purchase Return Voucher',
    CPV: 'Cash Payment (Compat)',
    CRV: 'Cash Receipt (Compat)',
    BPV: 'Bank Payment (Compat)',
    BRV: 'Bank Receipt (Compat)',
};
exports.VOUCHER_STATUS_LABELS = {
    DRAFT: 'Draft',
    POSTED: 'Posted',
};
/* ─── Computed Helpers ─────────────────────────────────────── */
/** Compute total debit for a set of voucher lines */
function totalDebit(lines) {
    return lines.reduce((sum, l) => sum + l.debit, 0);
}
/** Compute total credit for a set of voucher lines */
function totalCredit(lines) {
    return lines.reduce((sum, l) => sum + l.credit, 0);
}
/** Check whether voucher lines balance (total debit === total credit) */
function isBalanced(lines) {
    const d = totalDebit(lines);
    const c = totalCredit(lines);
    return Math.abs(d - c) < 0.005;
}
