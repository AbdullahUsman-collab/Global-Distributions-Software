"use strict";
/**
 * Party Balance Service
 * Computes customer/supplier balances from ledger entries.
 *
 * Authoritative source: ledger entries in the voucher repository.
 * This ensures balance reconciliation with Aging, Ledger, and Bills.
 *
 * Source of Truth:
 *   - audit/43_STEP24_FULL_TRANSACTION_INTEGRATION_AND_DRILLDOWN_REPORT.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartyBalanceService = void 0;
/* ─── Service ──────────────────────────────────────────────── */
class PartyBalanceService {
    constructor(voucherRepo, coaRepo, customerRepo, supplierRepo) {
        this.voucherRepo = voucherRepo;
        this.coaRepo = coaRepo;
        this.customerRepo = customerRepo;
        this.supplierRepo = supplierRepo;
    }
    /**
     * Get balance for all customers.
     * Uses ledger entries as the authoritative source.
     */
    async getCustomerBalances(tenantId) {
        const customers = await this.customerRepo.getCustomersByTenantId(tenantId);
        const balances = [];
        for (const customer of customers) {
            const balance = await this.getPartyBalance(tenantId, customer.id, 'customer', customer.accountHeadId, customer.name);
            balances.push(balance);
        }
        return balances;
    }
    /**
     * Get balance for all suppliers.
     */
    async getSupplierBalances(tenantId) {
        const suppliers = await this.supplierRepo.getSuppliers(tenantId);
        const balances = [];
        for (const supplier of suppliers) {
            const balance = await this.getPartyBalance(tenantId, supplier.id, 'supplier', supplier.accountHeadId, supplier.name);
            balances.push(balance);
        }
        return balances;
    }
    /**
     * Get balance for a single party.
     */
    async getPartyBalance(tenantId, partyId, partyType, accountHeadId, partyName) {
        // Get all ledger entries for this party's AR/AP account
        // The accountHeadId is the COA record ID; ledger entries use account code
        const coaAccount = await this.coaRepo.getAccountById(tenantId, accountHeadId);
        const accountCode = coaAccount?.accountCode ?? '';
        // Fetch ledger entries filtered by this party's account code
        const partyEntries = await this.voucherRepo.getLedgerEntries(tenantId, { accountId: accountCode });
        // For AR (customer): debits are sales (increase balance), credits are receipts/returns (decrease)
        // For AP (supplier): credits are purchases (increase balance), debits are returns/payments (decrease)
        let totalSales = 0;
        let totalReturns = 0;
        let totalReceipts = 0;
        for (const entry of partyEntries) {
            if (partyType === 'customer') {
                if (entry.voucherType === 'SV')
                    totalSales += entry.debit;
                else if (entry.voucherType === 'SRV')
                    totalReturns += entry.credit;
                else if (entry.voucherType === 'CR')
                    totalReceipts += entry.credit;
            }
            else {
                // Supplier: debits are payments/returns, credits are purchases
                if (entry.voucherType === 'PV')
                    totalSales += entry.credit;
                else if (entry.voucherType === 'PRV')
                    totalReturns += entry.debit;
                else if (entry.voucherType === 'CP')
                    totalReceipts += entry.debit;
            }
        }
        // Outstanding = debits - credits for AR, credits - debits for AP
        let outstandingBalance = 0;
        if (partyType === 'customer') {
            outstandingBalance = partyEntries.reduce((s, e) => s + e.debit - e.credit, 0);
        }
        else {
            outstandingBalance = partyEntries.reduce((s, e) => s + e.credit - e.debit, 0);
        }
        return {
            partyId,
            partyName,
            partyType,
            accountHeadId,
            accountCode,
            totalSales,
            totalReturns,
            totalReceipts,
            outstandingBalance: Math.max(0, outstandingBalance),
            isOverdue: outstandingBalance > 0,
        };
    }
}
exports.PartyBalanceService = PartyBalanceService;
