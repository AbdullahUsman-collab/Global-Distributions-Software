"use strict";
/**
 * Dashboard Service
 * Aggregates data from existing services/repositories for the ERP dashboard.
 *
 * Does NOT create duplicate accounting logic.
 * Consumes existing services: BillsListService, AgingReportService,
 * CashBookService, FinancialReportService, and raw repositories.
 *
 * Source of Truth:
 *   - audit/42_STEP23_DASHBOARD_ENHANCEMENT_IMPLEMENTATION_REPORT.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
exports.resolvePeriod = resolvePeriod;
const BillsListService_1 = require("./BillsListService");
const AgingReportService_1 = require("./AgingReportService");
/* ─── Period Resolution ────────────────────────────────────── */
function todayStr() {
    return new Date().toISOString().slice(0, 10);
}
function addDays(dateStr, days) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}
function getMonday(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
}
function getFirstOfMonth(dateStr) {
    return dateStr.slice(0, 7) + '-01';
}
function getFirstOfQuarter(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const q = Math.floor(d.getMonth() / 3);
    const firstMonth = q * 3;
    return `${d.getFullYear()}-${String(firstMonth + 1).padStart(2, '0')}-01`;
}
function getFirstOfYear(dateStr) {
    return dateStr.slice(0, 4) + '-01-01';
}
function resolvePeriod(period, customStart, customEnd) {
    const today = todayStr();
    switch (period) {
        case 'today':
            return { startDate: today, endDate: today };
        case 'week':
            return { startDate: getMonday(today), endDate: today };
        case 'month':
            return { startDate: getFirstOfMonth(today), endDate: today };
        case 'quarter':
            return { startDate: getFirstOfQuarter(today), endDate: today };
        case 'year':
            return { startDate: getFirstOfYear(today), endDate: today };
        case 'custom':
            return {
                startDate: customStart || today,
                endDate: customEnd || today,
            };
    }
}
/* ─── Service ──────────────────────────────────────────────── */
class DashboardService {
    constructor(voucherRepo, inventoryRepo, coaRepo, customerRepo, supplierRepo, cashBookService, financialReportService) {
        this.voucherRepo = voucherRepo;
        this.inventoryRepo = inventoryRepo;
        this.coaRepo = coaRepo;
        this.customerRepo = customerRepo;
        this.supplierRepo = supplierRepo;
        this.cashBookService = cashBookService;
        this.financialReportService = financialReportService;
        this.billsService = new BillsListService_1.BillsListService(voucherRepo, customerRepo, supplierRepo, inventoryRepo, coaRepo);
        this.agingService = new AgingReportService_1.AgingReportService(voucherRepo, coaRepo, customerRepo, supplierRepo);
    }
    /**
     * Get dashboard data for a tenant and period.
     * Aggregates from existing services in parallel where possible.
     */
    async getDashboardData(tenantId, period, customStart, customEnd) {
        const dateRange = resolvePeriod(period, customStart, customEnd);
        // Load all data in parallel
        const [bills, receivables, payables, stockLevels, cashAccounts, recentVouchers] = await Promise.all([
            this.billsService.getAllBills(tenantId),
            this.agingService.generateReport(tenantId, 'customer', todayStr()),
            this.agingService.generateReport(tenantId, 'supplier', todayStr()),
            this.inventoryRepo.getStockLevels(tenantId),
            this.cashBookService.getCashBankAccounts(tenantId),
            this.voucherRepo.getVouchersByTenantId(tenantId),
        ]);
        // Filter bills by date range
        const filteredBills = bills.filter(b => b.voucher.date >= dateRange.startDate && b.voucher.date <= dateRange.endDate);
        // Aggregate sales KPIs
        const svBills = filteredBills.filter(b => b.voucher.voucherType === 'SV');
        const sales = {
            label: 'Sales',
            amount: svBills.reduce((s, b) => s + b.total, 0),
            count: svBills.length,
        };
        // Aggregate purchase KPIs
        const pvBills = filteredBills.filter(b => b.voucher.voucherType === 'PV');
        const purchases = {
            label: 'Purchases',
            amount: pvBills.reduce((s, b) => s + b.total, 0),
            count: pvBills.length,
        };
        // Aggregate sale return KPIs
        const srvBills = filteredBills.filter(b => b.voucher.voucherType === 'SRV');
        const saleReturns = {
            label: 'Sale Returns',
            amount: srvBills.reduce((s, b) => s + b.total, 0),
            count: srvBills.length,
        };
        // Aggregate purchase return KPIs
        const prvBills = filteredBills.filter(b => b.voucher.voucherType === 'PRV');
        const purchaseReturns = {
            label: 'Purchase Returns',
            amount: prvBills.reduce((s, b) => s + b.total, 0),
            count: prvBills.length,
        };
        // Inventory summary (using stock levels — reliable data)
        const inventory = {
            totalProducts: stockLevels.length,
            totalStockQty: stockLevels.reduce((s, sl) => s + sl.quantityOnHand, 0),
            totalStockValue: stockLevels.reduce((s, sl) => s + sl.quantityOnHand * sl.unitCost, 0),
        };
        // Cash position
        let cashPosition = { totalBalance: 0, accountCount: cashAccounts.length };
        if (cashAccounts.length > 0) {
            // Get cash book for the first account to get closing balance
            // (in a real scenario, sum across all accounts)
            const balances = await Promise.all(cashAccounts.map(acc => this.cashBookService.getCashBook(tenantId, acc.id, dateRange.startDate, dateRange.endDate)));
            cashPosition = {
                totalBalance: balances.reduce((s, cb) => s + cb.closingBalance, 0),
                accountCount: cashAccounts.length,
            };
        }
        // Recent transactions (all types, newest first)
        const filteredVouchers = recentVouchers
            .filter(v => v.date >= dateRange.startDate && v.date <= dateRange.endDate)
            .sort((a, b) => b.date.localeCompare(a.date) || b.voucherNumber - a.voucherNumber)
            .slice(0, 10);
        // Enrich recent transactions with party names and totals from bills
        const billMap = new Map();
        for (const b of filteredBills) {
            billMap.set(b.voucher.id, b);
        }
        const recentTransactions = filteredVouchers.map(v => {
            const bill = billMap.get(v.id);
            return {
                id: v.id,
                voucherNumber: v.voucherNumber,
                voucherType: v.voucherType,
                date: v.date,
                narration: v.narration,
                partyName: bill?.partyName ?? '',
                total: bill?.total ?? 0,
                status: v.status,
            };
        });
        return {
            dateRange,
            period,
            sales,
            purchases,
            saleReturns,
            purchaseReturns,
            receivables: {
                current: receivables.totals.current,
                d1_30: receivables.totals.d1_30,
                d31_60: receivables.totals.d31_60,
                d61_90: receivables.totals.d61_90,
                d91_120: receivables.totals.d91_120,
                d120plus: receivables.totals.d120plus,
                grandTotal: receivables.grandTotal,
            },
            payables: {
                current: payables.totals.current,
                d1_30: payables.totals.d1_30,
                d31_60: payables.totals.d31_60,
                d61_90: payables.totals.d61_90,
                d91_120: payables.totals.d91_120,
                d120plus: payables.totals.d120plus,
                grandTotal: payables.grandTotal,
            },
            inventory,
            cashPosition,
            recentTransactions,
        };
    }
}
exports.DashboardService = DashboardService;
