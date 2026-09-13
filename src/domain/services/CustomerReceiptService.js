"use strict";
/**
 * Customer Receipt Service
 * Orchestrates cash/bank receipt creation and posting against customer AR.
 *
 * Source of Truth:
 *   - audit/13_CASH_BANK.md (CR accounting: DEBIT Cash/Bank, CREDIT Customer)
 *   - audit/04_ACCOUNTING_ENGINE.md (CR voucher type, double-entry rules)
 *   - audit/05_CUSTOMER_ACCOUNTING.md (CR decreases customer receivable)
 *   - audit/24_TRANSACTION_DEPENDENCIES.md (CR dependency map)
 *
 * Accounting (CR posting, audit/13, audit/04):
 *   DEBIT:  Cash/Bank Account (11101 or 11102) — Receipt Amount
 *   CREDIT: Customer AR Account (1120X)         — Receipt Amount
 *
 * No tax, no inventory movement, no revenue GL entry.
 * Receipt works against the customer's running AR balance.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerReceiptService = void 0;
const AuthorizationService_1 = require("./AuthorizationService");
/* ─── Constants ────────────────────────────────────────────── */
/**
 * GL account codes for cash/bank.
 * Source: MockCOAAdapter seed data
 */
const ACCOUNT_CODES = {
    /** Cash in Hand */
    CASH_IN_HAND: '11101',
    /** Bank Account Main */
    BANK_ACCOUNT_MAIN: '11102',
};
/** Accepted cash/bank account codes for receipts */
const ACCEPTED_CASH_BANK_CODES = new Set([
    ACCOUNT_CODES.CASH_IN_HAND,
    ACCOUNT_CODES.BANK_ACCOUNT_MAIN,
]);
/* ─── Service ──────────────────────────────────────────────── */
class CustomerReceiptService {
    constructor(coaRepo, voucherRepo, customerRepo) {
        this.coaRepo = coaRepo;
        this.voucherRepo = voucherRepo;
        this.customerRepo = customerRepo;
    }
    /* ─── Receipt Creation ──────────────────────────────────── */
    /**
     * Create a new customer receipt as a DRAFT voucher of type CR.
     * Source: audit/13_CASH_BANK.md, audit/04_ACCOUNTING_ENGINE.md
     *
     * The receipt is created in DRAFT status. No GL entries are created
     * until postReceipt() is called.
     */
    async createReceipt(tenantId, dto, createdBy, role = 'ADMIN') {
        (0, AuthorizationService_1.requirePermission)(role, AuthorizationService_1.Permissions.RECEIPTS_CREATE);
        // Validate customer exists
        const customer = await this.customerRepo.getCustomerById(tenantId, dto.customerId);
        if (!customer)
            throw new Error('Customer not found');
        if (!customer.isActive)
            throw new Error('Customer is inactive');
        // Validate amount > 0
        if (dto.amount <= 0) {
            throw new Error('Receipt amount must be greater than zero');
        }
        // Validate narration is not empty
        if (!dto.narration.trim()) {
            throw new Error('Narration is required');
        }
        // Validate date is provided
        if (!dto.date) {
            throw new Error('Date is required');
        }
        // Validate cash/bank account exists and belongs to the tenant
        const cashAccount = await this.coaRepo.getAccountById(tenantId, dto.cashAccountId);
        if (!cashAccount) {
            throw new Error('Cash/Bank account not found');
        }
        if (!cashAccount.isActive) {
            throw new Error('Cash/Bank account is inactive');
        }
        // Validate the account is an appropriate Cash/Bank account
        if (!ACCEPTED_CASH_BANK_CODES.has(cashAccount.accountCode)) {
            throw new Error(`Account ${cashAccount.accountCode} is not a valid Cash or Bank account. ` +
                `Use Cash in Hand (${ACCOUNT_CODES.CASH_IN_HAND}) or Bank Account Main (${ACCOUNT_CODES.BANK_ACCOUNT_MAIN}).`);
        }
        // Validate customer has an AR account head
        if (!customer.accountHeadId) {
            throw new Error('Customer does not have an AR posting account');
        }
        // Resolve customer's accountHeadId to accountCode for GL entries
        const customerCoaAccount = await this.coaRepo.getAccountById(tenantId, customer.accountHeadId);
        const customerAccountCode = customerCoaAccount?.accountCode ?? '';
        // Build balanced GL entries.
        // DEBIT: Cash/Bank Account — Receipt Amount
        // CREDIT: Customer AR Account — Receipt Amount
        const balancedLines = [
            // DEBIT: Cash/Bank Account
            {
                accountId: cashAccount.accountCode,
                description: `Cash received from ${customer.name}`,
                debit: dto.amount,
                credit: 0,
            },
            // CREDIT: Customer AR Account
            {
                accountId: customerAccountCode,
                description: dto.narration.trim(),
                debit: 0,
                credit: dto.amount,
            },
        ];
        const voucher = await this.voucherRepo.createVoucher(tenantId, {
            voucherType: 'CR',
            date: dto.date,
            narration: dto.narration.trim(),
            lines: balancedLines,
        }, createdBy);
        return voucher;
    }
    /* ─── Receipt Posting ───────────────────────────────────── */
    /**
     * Post a customer receipt (CR voucher).
     * Source: audit/13_CASH_BANK.md, audit/24_TRANSACTION_DEPENDENCIES.md
     *
     * Effects:
     * 1. Voucher posted → LedgerEntry records created
     *
     * Accounting entries:
     *   DEBIT:  Cash/Bank Account — Receipt Amount
     *   CREDIT: Customer AR Account — Receipt Amount
     *
     * No inventory effect.
     * No revenue effect.
     * No tax entries.
     */
    async postReceipt(tenantId, voucherId, role = 'ADMIN') {
        (0, AuthorizationService_1.requirePermission)(role, AuthorizationService_1.Permissions.RECEIPTS_POST);
        return this.voucherRepo.postVoucher(tenantId, voucherId);
    }
    /* ─── Queries ────────────────────────────────────────────── */
    /**
     * Get all customer receipt vouchers (CR type) for a tenant.
     */
    async getReceipts(tenantId) {
        return this.voucherRepo.getVouchersByTenantId(tenantId, { voucherType: 'CR' });
    }
    /**
     * Get a single customer receipt by id.
     */
    async getReceiptById(tenantId, id) {
        return this.voucherRepo.getVoucherById(tenantId, id);
    }
    /**
     * Get the customer's current AR balance from ledger entries.
     * Balance = SUM(Debits) - SUM(Credits) for the customer's AR account.
     * A positive balance means the customer owes money.
     */
    async getCustomerARBalance(tenantId, customerId) {
        const customer = await this.customerRepo.getCustomerById(tenantId, customerId);
        if (!customer)
            throw new Error('Customer not found');
        if (!customer.accountHeadId)
            return 0;
        // Resolve accountHeadId to accountCode for ledger query
        const coaAccount = await this.coaRepo.getAccountById(tenantId, customer.accountHeadId);
        const accountCode = coaAccount?.accountCode ?? '';
        const ledgerEntries = await this.voucherRepo.getLedgerEntries(tenantId, {
            accountId: accountCode,
        });
        return ledgerEntries.reduce((balance, entry) => balance + entry.debit - entry.credit, 0);
    }
    /**
     * Delete a DRAFT customer receipt.
     * Source: audit/04_ACCOUNTING_ENGINE.md — delete only DRAFT
     */
    async deleteReceipt(tenantId, id, role = 'ADMIN') {
        (0, AuthorizationService_1.requirePermission)(role, AuthorizationService_1.Permissions.RECEIPTS_DELETE);
        const voucher = await this.voucherRepo.getVoucherById(tenantId, id);
        if (!voucher)
            throw new Error('Voucher not found');
        if (voucher.status === 'POSTED')
            throw new Error('Cannot delete a posted voucher');
        return this.voucherRepo.deleteVoucher(tenantId, id);
    }
}
exports.CustomerReceiptService = CustomerReceiptService;
