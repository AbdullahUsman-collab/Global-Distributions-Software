"use strict";
/**
 * Bills List Service
 * Unified transaction register for SV, PV, SRV, PRV bill vouchers.
 *
 * Fetches bills from all four bill services, enriches with party/item names,
 * and supports filtering by type, date range, party, item, and search text.
 *
 * Source of Truth:
 *   - audit/37_COMPLETE_LEGACY_REMAINING_PARITY_DISCOVERY.md (ListofBills parity)
 *   - audit/10_SALES_ENGINE.md (SV accounting)
 *   - audit/11_PURCHASE_ENGINE.md (PV accounting)
 *   - audit/12_RETURNS_REVERSALS.md (SRV/PRV accounting)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillsListService = exports.BILL_TYPE_COLORS = exports.BILL_TYPE_LABELS = exports.BILL_VOUCHER_TYPES = void 0;
/* ─── Types ────────────────────────────────────────────────── */
/** Bill types supported in the Bills List */
exports.BILL_VOUCHER_TYPES = ['SV', 'PV', 'SRV', 'PRV'];
/** Short display labels for bill types */
exports.BILL_TYPE_LABELS = {
    SV: 'Sale',
    PV: 'Purchase',
    SRV: 'Sale Return',
    PRV: 'Purchase Return',
};
/** Type badge color scheme */
exports.BILL_TYPE_COLORS = {
    SV: { bg: '#dbeafe', fg: '#1e40af' },
    PV: { bg: '#fef3c7', fg: '#92400e' },
    SRV: { bg: '#fce7f3', fg: '#9d174d' },
    PRV: { bg: '#d1fae5', fg: '#065f46' },
};
/* ─── Service ──────────────────────────────────────────────── */
class BillsListService {
    constructor(voucherRepo, customerRepo, supplierRepo, inventoryRepo, coaRepo) {
        this.voucherRepo = voucherRepo;
        this.customerRepo = customerRepo;
        this.supplierRepo = supplierRepo;
        this.inventoryRepo = inventoryRepo;
        this.coaRepo = coaRepo;
    }
    /**
     * Fetch all bill vouchers (SV, PV, SRV, PRV) and enrich with party/item data.
     */
    async getAllBills(tenantId) {
        // Fetch all bill types in parallel
        const [svBills, pvBills, srvBills, prvBills] = await Promise.all([
            this.voucherRepo.getVouchersByTenantId(tenantId, { voucherType: 'SV' }),
            this.voucherRepo.getVouchersByTenantId(tenantId, { voucherType: 'PV' }),
            this.voucherRepo.getVouchersByTenantId(tenantId, { voucherType: 'SRV' }),
            this.voucherRepo.getVouchersByTenantId(tenantId, { voucherType: 'PRV' }),
        ]);
        // Merge and sort by date descending
        const allHeaders = [...svBills, ...pvBills, ...srvBills, ...prvBills]
            .sort((a, b) => b.date.localeCompare(a.date));
        // Fetch lookup data
        const [customers, suppliers, products] = await Promise.all([
            this.customerRepo.getCustomersByTenantId(tenantId),
            this.supplierRepo.getSuppliers(tenantId),
            this.inventoryRepo.getProducts(tenantId),
        ]);
        // Build COA id→code map if coaRepo available
        let accountCodeById = new Map();
        if (this.coaRepo) {
            const accounts = await this.coaRepo.getAccountsByTenantId(tenantId);
            for (const a of accounts) {
                accountCodeById.set(a.id, a.accountCode);
            }
        }
        // Build lookup maps: accountId (code) → name
        const customerByAccount = new Map();
        for (const c of customers) {
            const code = accountCodeById.get(c.accountHeadId) || c.accountHeadId;
            customerByAccount.set(code, { id: c.id, name: c.name });
        }
        const supplierByAccount = new Map();
        for (const s of suppliers) {
            const code = accountCodeById.get(s.accountHeadId) || s.accountHeadId;
            supplierByAccount.set(code, { id: s.id, name: s.name });
        }
        // productId → name
        const productById = new Map();
        for (const p of products) {
            productById.set(p.id, p.name);
        }
        // Enrich each voucher with party, items, total
        const records = [];
        for (const voucher of allHeaders) {
            const lines = await this.voucherRepo.getVoucherLines(tenantId, voucher.id);
            const enriched = this.enrichBill(voucher, lines, customerByAccount, supplierByAccount, productById);
            records.push(enriched);
        }
        return records;
    }
    /**
     * Apply filters to a list of bill records.
     */
    filterBills(bills, filters) {
        let result = [...bills];
        // Voucher type filter
        if (filters.voucherType) {
            result = result.filter(b => b.voucher.voucherType === filters.voucherType);
        }
        // Date range filter (inclusive)
        if (filters.dateFrom) {
            result = result.filter(b => b.voucher.date >= filters.dateFrom);
        }
        if (filters.dateTo) {
            result = result.filter(b => b.voucher.date <= filters.dateTo);
        }
        // Party filter
        if (filters.partyId) {
            result = result.filter(b => b.partyId === filters.partyId);
        }
        // Item filter
        if (filters.itemId) {
            result = result.filter(b => b.itemIds.includes(filters.itemId));
        }
        // Free-text search
        if (filters.search && filters.search.trim()) {
            const q = filters.search.trim().toLowerCase();
            result = result.filter(b => String(b.voucher.voucherNumber).includes(q) ||
                b.voucher.narration.toLowerCase().includes(q) ||
                b.partyName.toLowerCase().includes(q) ||
                b.itemNames.some(name => name.toLowerCase().includes(q)));
        }
        return result;
    }
    /**
     * Delete a draft bill. Throws if bill is POSTED.
     */
    async deleteBill(tenantId, voucherId) {
        const voucher = await this.voucherRepo.getVoucherById(tenantId, voucherId);
        if (!voucher)
            throw new Error('Voucher not found');
        if (voucher.status === 'POSTED')
            throw new Error('Cannot delete a posted voucher');
        return this.voucherRepo.deleteVoucher(tenantId, voucherId);
    }
    /* ─── Private Helpers ──────────────────────────────────────── */
    /**
     * Enrich a single voucher with party, items, and total.
     */
    enrichBill(voucher, lines, customerByAccount, supplierByAccount, productById) {
        let partyName = 'Unknown';
        let partyId = '';
        let total = 0;
        const itemNames = [];
        const itemIds = [];
        for (const line of lines) {
            // Party detection: look up account in customer or supplier maps
            const customer = customerByAccount.get(line.accountId);
            if (customer) {
                partyName = customer.name;
                partyId = customer.id;
            }
            const supplier = supplierByAccount.get(line.accountId);
            if (supplier) {
                partyName = supplier.name;
                partyId = supplier.id;
            }
            // Total: sum product lines only (party lines have productId)
            // For SV/PRV: party line is debited; for PV/SRV: party line is credited
            // Using Math.max(debit, credit) handles both debit-normal and credit-normal correctly
            if (line.productId) {
                total += Math.max(line.debit, line.credit);
            }
            // Items: collect unique product names
            if (line.productId && productById.has(line.productId)) {
                const name = productById.get(line.productId);
                if (!itemNames.includes(name)) {
                    itemNames.push(name);
                }
                if (!itemIds.includes(line.productId)) {
                    itemIds.push(line.productId);
                }
            }
        }
        return {
            voucher,
            partyName,
            partyId,
            total,
            lineCount: lines.length,
            itemNames,
            itemIds,
            lines,
        };
    }
}
exports.BillsListService = BillsListService;
