/**
 * Test helpers — mock repositories for domain service tests.
 */
import type { ICOARepository } from './repositories/ICOARepository';
import type { IVoucherRepository } from './repositories/IVoucherRepository';
import type { IInventoryRepository } from './repositories/IInventoryRepository';
import type { ICustomerRepository } from './repositories/ICustomerRepository';
import type { ISupplierRepository } from './repositories/ISupplierRepository';
import type { AccountHead } from './types/coa';
import type { VoucherHeader, VoucherLine, LedgerEntry, CreateVoucherDTO } from './types/voucher';
import type { Product, StockLevel, StockMovement } from './types/inventory';
import type { Customer } from './types/customer';
import type { Supplier } from './types/supplier';

/* ─── Shared Seed Data ─────────────────────────────────────── */

export const TENANT_ID = 'test-tenant';

export const SEED_ACCOUNTS: AccountHead[] = [
  // Level 1 ancestors
  { id: 'acc-100', tenantId: TENANT_ID, accountCode: '100', accountName: 'Assets', parentId: '', level: 1, accountType: 'ASSET', normalBalance: 'DEBIT', isPosting: false, isSummary: true, isActive: true, legacyMainHeadNo: 100 },
  { id: 'acc-200', tenantId: TENANT_ID, accountCode: '200', accountName: 'Liabilities & Equity', parentId: '', level: 1, accountType: 'LIABILITY', normalBalance: 'CREDIT', isPosting: false, isSummary: true, isActive: true, legacyMainHeadNo: 200 },
  { id: 'acc-250', tenantId: TENANT_ID, accountCode: '250', accountName: 'Fixed Assets', parentId: 'acc-100', level: 2, accountType: 'ASSET', normalBalance: 'DEBIT', isPosting: false, isSummary: true, isActive: true, legacyMainHeadNo: 250 },
  // Level 3 ancestors
  { id: 'acc-111', tenantId: TENANT_ID, accountCode: '111', accountName: 'Cash & Bank', parentId: 'acc-100', level: 3, accountType: 'ASSET', normalBalance: 'DEBIT', isPosting: false, isSummary: true, isActive: true, legacyMainHeadNo: 100 },
  { id: 'acc-112', tenantId: TENANT_ID, accountCode: '112', accountName: 'Receivable', parentId: 'acc-100', level: 3, accountType: 'ASSET', normalBalance: 'DEBIT', isPosting: false, isSummary: true, isActive: true, legacyMainHeadNo: 500 },
  { id: 'acc-113', tenantId: TENANT_ID, accountCode: '113', accountName: 'Inventory Accounts', parentId: 'acc-250', level: 3, accountType: 'ASSET', normalBalance: 'DEBIT', isPosting: false, isSummary: true, isActive: true, legacyMainHeadNo: 250 },
  { id: 'acc-114', tenantId: TENANT_ID, accountCode: '114', accountName: 'Tax Input Accounts', parentId: 'acc-100', level: 3, accountType: 'ASSET', normalBalance: 'DEBIT', isPosting: false, isSummary: true, isActive: true, legacyMainHeadNo: 100 },
  { id: 'acc-211', tenantId: TENANT_ID, accountCode: '211', accountName: 'Payable', parentId: 'acc-200', level: 3, accountType: 'LIABILITY', normalBalance: 'CREDIT', isPosting: false, isSummary: true, isActive: true, legacyMainHeadNo: 8000 },
  { id: 'acc-212', tenantId: TENANT_ID, accountCode: '212', accountName: 'Tax Output', parentId: 'acc-200', level: 3, accountType: 'LIABILITY', normalBalance: 'CREDIT', isPosting: false, isSummary: true, isActive: true, legacyMainHeadNo: 8000 },
  { id: 'acc-411', tenantId: TENANT_ID, accountCode: '411', accountName: 'Sales', parentId: 'acc-200', level: 3, accountType: 'REVENUE', normalBalance: 'CREDIT', isPosting: false, isSummary: true, isActive: true, legacyMainHeadNo: 200 },
  { id: 'acc-511', tenantId: TENANT_ID, accountCode: '511', accountName: 'COGS', parentId: 'acc-200', level: 3, accountType: 'COGS', normalBalance: 'DEBIT', isPosting: false, isSummary: true, isActive: true, legacyMainHeadNo: 200 },
  { id: 'acc-611', tenantId: TENANT_ID, accountCode: '611', accountName: 'Operating Expenses', parentId: 'acc-200', level: 3, accountType: 'EXPENSE', normalBalance: 'DEBIT', isPosting: false, isSummary: true, isActive: true, legacyMainHeadNo: 200 },
  { id: 'acc-612', tenantId: TENANT_ID, accountCode: '612', accountName: 'Admin Expenses', parentId: 'acc-200', level: 3, accountType: 'EXPENSE', normalBalance: 'DEBIT', isPosting: false, isSummary: true, isActive: true, legacyMainHeadNo: 200 },
  // Level 4 posting accounts
  { id: 'acc-11101', tenantId: TENANT_ID, accountCode: '11101', accountName: 'Cash in Hand', parentId: 'acc-111', level: 4, accountType: 'ASSET', normalBalance: 'DEBIT', isPosting: true, isSummary: false, isActive: true, legacyMainHeadNo: 100 },
  { id: 'acc-11102', tenantId: TENANT_ID, accountCode: '11102', accountName: 'Bank Account Main', parentId: 'acc-111', level: 4, accountType: 'ASSET', normalBalance: 'DEBIT', isPosting: true, isSummary: false, isActive: true, legacyMainHeadNo: 100 },
  { id: 'acc-11201', tenantId: TENANT_ID, accountCode: '11201', accountName: 'Customer AR', parentId: 'acc-112', level: 4, accountType: 'ASSET', normalBalance: 'DEBIT', isPosting: true, isSummary: false, isActive: true, legacyMainHeadNo: 500 },
  { id: 'acc-11301', tenantId: TENANT_ID, accountCode: '11301', accountName: 'Inventory', parentId: 'acc-113', level: 4, accountType: 'ASSET', normalBalance: 'DEBIT', isPosting: true, isSummary: false, isActive: true, legacyMainHeadNo: 250 },
  { id: 'acc-11401', tenantId: TENANT_ID, accountCode: '11401', accountName: 'Tax Input', parentId: 'acc-114', level: 4, accountType: 'ASSET', normalBalance: 'DEBIT', isPosting: true, isSummary: false, isActive: true, legacyMainHeadNo: 100 },
  { id: 'acc-11402', tenantId: TENANT_ID, accountCode: '11402', accountName: 'Advance Income Tax', parentId: 'acc-114', level: 4, accountType: 'ASSET', normalBalance: 'DEBIT', isPosting: true, isSummary: false, isActive: true, legacyMainHeadNo: 100 },
  { id: 'acc-11403', tenantId: TENANT_ID, accountCode: '11403', accountName: 'FED Input', parentId: 'acc-114', level: 4, accountType: 'ASSET', normalBalance: 'DEBIT', isPosting: true, isSummary: false, isActive: true, legacyMainHeadNo: 100 },
  { id: 'acc-21100', tenantId: TENANT_ID, accountCode: '21100', accountName: 'Accounts Payable', parentId: 'acc-211', level: 4, accountType: 'LIABILITY', normalBalance: 'CREDIT', isPosting: true, isSummary: false, isActive: true, legacyMainHeadNo: 8000 },
  { id: 'acc-21201', tenantId: TENANT_ID, accountCode: '21201', accountName: 'Sales Tax Output', parentId: 'acc-212', level: 4, accountType: 'LIABILITY', normalBalance: 'CREDIT', isPosting: true, isSummary: false, isActive: true, legacyMainHeadNo: 8000 },
  { id: 'acc-21202', tenantId: TENANT_ID, accountCode: '21202', accountName: 'Withholding Tax Payable', parentId: 'acc-212', level: 4, accountType: 'LIABILITY', normalBalance: 'CREDIT', isPosting: true, isSummary: false, isActive: true, legacyMainHeadNo: 8000 },
  { id: 'acc-21203', tenantId: TENANT_ID, accountCode: '21203', accountName: 'FED Payable', parentId: 'acc-212', level: 4, accountType: 'LIABILITY', normalBalance: 'CREDIT', isPosting: true, isSummary: false, isActive: true, legacyMainHeadNo: 8000 },
  { id: 'acc-41101', tenantId: TENANT_ID, accountCode: '41101', accountName: 'Wholesale Sales Revenue', parentId: 'acc-411', level: 4, accountType: 'REVENUE', normalBalance: 'CREDIT', isPosting: true, isSummary: false, isActive: true, legacyMainHeadNo: 200 },
  { id: 'acc-51101', tenantId: TENANT_ID, accountCode: '51101', accountName: 'Material Purchases', parentId: 'acc-511', level: 4, accountType: 'COGS', normalBalance: 'DEBIT', isPosting: true, isSummary: false, isActive: true, legacyMainHeadNo: 200 },
  { id: 'acc-61101', tenantId: TENANT_ID, accountCode: '61101', accountName: 'Salaries Expense', parentId: 'acc-611', level: 4, accountType: 'EXPENSE', normalBalance: 'DEBIT', isPosting: true, isSummary: false, isActive: true, legacyMainHeadNo: 200 },
  { id: 'acc-61201', tenantId: TENANT_ID, accountCode: '61201', accountName: 'Rent Expense', parentId: 'acc-612', level: 4, accountType: 'EXPENSE', normalBalance: 'DEBIT', isPosting: true, isSummary: false, isActive: true, legacyMainHeadNo: 200 },
];

export const SEED_PRODUCTS: Product[] = [
  {
    id: 'prod-1', tenantId: TENANT_ID, sku: 'WH-001', name: 'Product Alpha', category: 'General',
    unit: 'PCS', pcsPerCarton: 24, saleRate: 100, purchaseRate: 60, retailPrice: 120,
    tradeDiscount: 5, tradeOffer: '', minQuantity: 0, hsCode: '001', gstType: 'VAT',
    gstPercent: 18, fedPercent: 0, advanceTaxSalePercent: 0, advanceTaxPurchasePercent: 0, isActive: true,
  },
  {
    id: 'prod-2', tenantId: TENANT_ID, sku: 'WH-002', name: 'Product Beta', category: 'General',
    unit: 'PCS', pcsPerCarton: 12, saleRate: 250, purchaseRate: 150, retailPrice: 300,
    tradeDiscount: 0, tradeOffer: '', minQuantity: 0, hsCode: '002', gstType: 'VAT',
    gstPercent: 18, fedPercent: 5, advanceTaxSalePercent: 3, advanceTaxPurchasePercent: 0, isActive: true,
  },
];

export const SEED_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1', tenantId: TENANT_ID, accountHeadId: 'acc-11201',
    name: 'Test Customer', address: '123 Test St', ownerName: 'John Doe',
    phone: '0300-1234567', stn: 'STN-001', ntn: 'NTN-001', cnic: '12345-1234567-1',
    isActive: true, createdAt: new Date('2025-01-01'), updatedAt: new Date('2025-01-01'),
  },
];

export const SEED_SUPPLIERS: Supplier[] = [
  {
    id: 'supp-1', tenantId: TENANT_ID, accountHeadId: 'acc-21100',
    name: 'Test Supplier', contactPerson: 'Jane Smith', phone: '0300-7654321',
    email: 'supplier@test.com', address: '456 Supply Rd', city: 'Lahore',
    taxRegistrationNumber: 'TRN-001', paymentTerms: '30', creditLimit: 100000,
    isActive: true, createdAt: new Date('2025-01-01'), updatedAt: new Date('2025-01-01'),
  },
];

/* ─── Mock Factory Helpers ─────────────────────────────────── */

let voucherIdCounter = 0;
let ledgerIdCounter = 0;
let movementIdCounter = 0;

export function resetCounters() {
  voucherIdCounter = 0;
  ledgerIdCounter = 0;
  movementIdCounter = 0;
}

export function createMockCOARepo(accounts: AccountHead[] = SEED_ACCOUNTS): ICOARepository {
  const store = [...accounts];
  return {
    getAccountsByTenantId: async () => store.filter(a => a.tenantId === TENANT_ID),
    getAccountById: async (_t: string, id: string) => store.find(a => a.id === id) ?? null,
    getAccountByCode: async (_t: string, code: string) => store.find(a => a.accountCode === code) ?? null,
    createAccount: async (_t: string, dto: any) => {
      const acc: AccountHead = {
        id: `acc-new-${Date.now()}`,
        tenantId: TENANT_ID,
        accountCode: dto.accountCode,
        accountName: dto.accountName,
        parentId: dto.parentId,
        level: 4,
        accountType: dto.accountType ?? 'ASSET',
        normalBalance: 'DEBIT',
        isPosting: true,
        isSummary: false,
        isActive: true,
        legacyMainHeadNo: dto.legacyMainHeadNo,
      };
      store.push(acc);
      return acc;
    },
    updateAccount: async (_t: string, id: string, dto: any) => {
      const idx = store.findIndex(a => a.id === id);
      if (idx === -1) throw new Error('Account not found');
      store[idx] = { ...store[idx], ...dto };
      return store[idx];
    },
    deactivateAccount: async (_t: string, id: string) => {
      const idx = store.findIndex(a => a.id === id);
      if (idx === -1) throw new Error('Account not found');
      store[idx] = { ...store[idx], isActive: false };
    },
  };
}

export function createMockVoucherRepo(): IVoucherRepository {
  const vouchers: VoucherHeader[] = [];
  const lines: Map<string, VoucherLine[]> = new Map();
  const ledger: LedgerEntry[] = [];
  const accounts: AccountHead[] = [...SEED_ACCOUNTS];

  const codeById = new Map<string, string>();
  for (const a of SEED_ACCOUNTS) {
    codeById.set(a.id, a.accountCode);
  }

  return {
    getVouchersByTenantId: async (t: string, filters?: { voucherType?: string; status?: string }) => {
      let result = vouchers.filter(v => v.tenantId === t);
      if (filters?.voucherType) {
        result = result.filter(v => v.voucherType === filters.voucherType);
      }
      if (filters?.status) {
        result = result.filter(v => v.status === filters.status);
      }
      return result;
    },
    getVoucherById: async (_t: string, id: string) => vouchers.find(v => v.id === id) ?? null,
    getNextVoucherNumber: async (_t: string) => vouchers.length + 1,
    getVoucherLines: async (_t: string, voucherId: string) => lines.get(voucherId) ?? [],
    createVoucher: async (_t: string, dto: CreateVoucherDTO, createdBy: string) => {
      const id = `voucher-${++voucherIdCounter}`;
      const voucherLines: VoucherLine[] = dto.lines.map((l, i) => ({
        id: `line-${id}-${i}`,
        voucherId: id,
        tenantId: _t,
        accountId: l.accountId,
        description: l.description,
        debit: l.debit,
        credit: l.credit,
        lineOrder: i,
        quantity: l.quantity,
        productId: l.productId,
        branch: l.branch,
        stRate: l.stRate,
        stAmount: l.stAmount,
        amtExclStd: l.amtExclStd,
      }));
      lines.set(id, voucherLines);
      const now = new Date();
      const header: VoucherHeader = {
        id,
        tenantId: _t,
        voucherNumber: vouchers.length + 1,
        voucherType: dto.voucherType,
        date: dto.date,
        status: 'DRAFT',
        narration: dto.narration,
        createdBy,
        createdAt: now,
        updatedAt: now,
      };
      vouchers.push(header);
      return header;
    },
    updateVoucher: async (_t: string, id: string, dto: any) => {
      const idx = vouchers.findIndex(v => v.id === id);
      if (idx === -1) throw new Error('Voucher not found');
      vouchers[idx] = { ...vouchers[idx], ...dto, updatedAt: new Date() };
      return vouchers[idx];
    },
    deleteVoucher: async (_t: string, id: string) => {
      const idx = vouchers.findIndex(v => v.id === id);
      if (idx === -1) throw new Error('Voucher not found');
      if (vouchers[idx].status !== 'DRAFT') throw new Error('Can only delete DRAFT vouchers');
      vouchers.splice(idx, 1);
      lines.delete(id);
    },
    postVoucher: async (_t: string, id: string) => {
      const idx = vouchers.findIndex(v => v.id === id);
      if (idx === -1) throw new Error('Voucher not found');
      vouchers[idx] = { ...vouchers[idx], status: 'POSTED', updatedAt: new Date() };
      const voucherLines = lines.get(id) ?? [];
      for (const vl of voucherLines) {
        if (vl.debit > 0 || vl.credit > 0) {
          const accountCode = codeById.get(vl.accountId) ?? vl.accountId;
          ledger.push({
            id: `ledger-${++ledgerIdCounter}`,
            tenantId: vouchers[idx].tenantId,
            voucherId: id,
            voucherLineId: vl.id,
            accountId: accountCode,
            debit: vl.debit,
            credit: vl.credit,
            entryDate: vouchers[idx].date,
            voucherType: vouchers[idx].voucherType,
            voucherNumber: vouchers[idx].voucherNumber,
            narration: vl.description,
          });
        }
      }
      return vouchers[idx];
    },
    getLedgerEntries: async (t: string, filters?: { accountId?: string; startDate?: string; endDate?: string }) => {
      let entries = ledger.filter(e => e.tenantId === t);
      if (filters?.accountId) {
        entries = entries.filter(e => e.accountId === filters.accountId);
      }
      if (filters?.startDate) {
        entries = entries.filter(e => e.entryDate >= filters.startDate!);
      }
      if (filters?.endDate) {
        entries = entries.filter(e => e.entryDate <= filters.endDate!);
      }
      return entries;
    },
    getLedgerForAccount: async (t: string, accountId: string) =>
      ledger.filter(e => e.tenantId === t && e.accountId === accountId).map(e => ({ ...e, balance: e.debit - e.credit })),
  };
}

export function createMockInventoryRepo(products: Product[] = SEED_PRODUCTS): IInventoryRepository {
  const productList = [...products];
  const stockLevels: StockLevel[] = [];
  const movements: StockMovement[] = [];

  // Seed some initial stock for each product
  for (const p of productList) {
    stockLevels.push({
      id: `sl-${p.id}`,
      tenantId: TENANT_ID,
      productId: p.id,
      warehouseId: 'wh-1',
      quantityOnHand: 100,
      quantityReserved: 0,
      unitCost: p.purchaseRate,
      reorderLevel: 10,
      minimumStock: 5,
      maximumStock: 500,
    });
  }

  return {
    getProducts: async (_t: string) => [...productList],
    getProductById: async (_t: string, id: string) => productList.find(p => p.id === id) ?? null,
    createProduct: async (_t: string, dto: any) => {
      const p: Product = {
        id: `prod-${Date.now()}`,
        tenantId: TENANT_ID,
        sku: dto.sku,
        name: dto.name,
        category: dto.category ?? '',
        unit: dto.unit ?? 'PCS',
        pcsPerCarton: dto.pcsPerCarton ?? 1,
        saleRate: dto.saleRate ?? 0,
        purchaseRate: dto.purchaseRate ?? 0,
        retailPrice: dto.retailPrice ?? 0,
        tradeDiscount: dto.tradeDiscount ?? 0,
        tradeOffer: dto.tradeOffer ?? '',
        minQuantity: dto.minQuantity ?? 0,
        hsCode: dto.hsCode ?? '',
        gstType: dto.gstType ?? 'VAT',
        gstPercent: dto.gstPercent ?? 0,
        fedPercent: dto.fedPercent ?? 0,
        advanceTaxSalePercent: dto.advanceTaxSalePercent ?? 0,
        advanceTaxPurchasePercent: dto.advanceTaxPurchasePercent ?? 0,
        isActive: dto.isActive ?? true,
      };
      productList.push(p);
      return p;
    },
    updateProduct: async (_t: string, id: string, dto: any) => {
      const idx = productList.findIndex(p => p.id === id);
      if (idx === -1) throw new Error('Product not found');
      productList[idx] = { ...productList[idx], ...dto };
      return productList[idx];
    },
    deactivateProduct: async (_t: string, id: string) => {
      const idx = productList.findIndex(p => p.id === id);
      if (idx === -1) throw new Error('Product not found');
      productList[idx] = { ...productList[idx], isActive: false };
    },
    getWarehouses: async (_t: string) => [
      { id: 'wh-1', tenantId: TENANT_ID, code: 'WH-01', name: 'Main Warehouse', isActive: true },
    ],
    getWarehouseLocations: async (_t: string, _warehouseId: string) => [],
    getStockLevels: async (_t: string, warehouseId?: string) => {
      if (warehouseId) return stockLevels.filter(sl => sl.warehouseId === warehouseId);
      return [...stockLevels];
    },
    getStockLevelForProduct: async (_t: string, productId: string, warehouseId: string) =>
      stockLevels.find(sl => sl.productId === productId && sl.warehouseId === warehouseId) ?? null,
    getStockMovements: async (_t: string, _filters?: any) => [...movements],
    getStockMovementById: async (_t: string, id: string) => movements.find(m => m.id === id) ?? null,
    createStockMovement: async (_t: string, dto: any) => {
      const m: StockMovement = {
        id: `mov-${++movementIdCounter}`,
        tenantId: TENANT_ID,
        movementType: dto.movementType,
        movementDate: dto.movementDate,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        fromWarehouseId: dto.fromWarehouseId,
        toWarehouseId: dto.toWarehouseId,
        productId: dto.productId,
        quantity: dto.quantity,
        unitCost: dto.unitCost,
        totalCost: dto.totalCost,
        narration: dto.narration,
        status: dto.status ?? 'DRAFT',
        createdAt: new Date().toISOString(),
        createdBy: dto.createdBy,
      };
      movements.push(m);
      return m;
    },
    postStockMovement: async (_t: string, id: string) => {
      const idx = movements.findIndex(m => m.id === id);
      if (idx === -1) throw new Error('Movement not found');
      movements[idx] = { ...movements[idx], status: 'POSTED' };
      // Update stock levels
      const m = movements[idx];
      const sl = stockLevels.find(s => s.productId === m.productId && s.warehouseId === (m.toWarehouseId ?? m.fromWarehouseId));
      if (sl) {
        if (m.movementType === 'GRN' || m.movementType === 'RETURN') {
          sl.quantityOnHand += m.quantity;
        } else if (m.movementType === 'ISSUE' || m.movementType === 'TRANSFER') {
          sl.quantityOnHand -= m.quantity;
        }
      }
      return movements[idx];
    },
    cancelStockMovement: async (_t: string, id: string) => {
      const idx = movements.findIndex(m => m.id === id);
      if (idx === -1) throw new Error('Movement not found');
      movements[idx] = { ...movements[idx], status: 'CANCELLED' };
      return movements[idx];
    },
    getBatches: async (_t: string, _productId?: string) => [],
    getSerials: async (_t: string, _productId?: string) => [],
  };
}

export function createMockCustomerRepo(customers: Customer[] = SEED_CUSTOMERS): ICustomerRepository {
  const store = [...customers];
  return {
    getCustomersByTenantId: async (t: string, filters?: { isActive?: boolean }) => {
      let result = store.filter(c => c.tenantId === t);
      if (filters?.isActive !== undefined) {
        result = result.filter(c => c.isActive === filters.isActive);
      }
      return result;
    },
    getCustomerById: async (_t: string, id: string) => store.find(c => c.id === id) ?? null,
    getCustomerByAccountHeadId: async (_t: string, accountHeadId: string) =>
      store.find(c => c.accountHeadId === accountHeadId) ?? null,
    createCustomer: async (_t: string, dto: any) => {
      const now = new Date();
      const c: Customer = {
        id: `cust-${Date.now()}`,
        tenantId: TENANT_ID,
        accountHeadId: dto.accountHeadId ?? '',
        name: dto.name,
        address: dto.address ?? '',
        ownerName: dto.ownerName ?? '',
        phone: dto.phone ?? '',
        stn: dto.stn ?? '',
        ntn: dto.ntn ?? '',
        cnic: dto.cnic ?? '',
        isActive: dto.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      };
      store.push(c);
      return c;
    },
    updateCustomer: async (_t: string, id: string, dto: any) => {
      const idx = store.findIndex(c => c.id === id);
      if (idx === -1) throw new Error('Customer not found');
      store[idx] = { ...store[idx], ...dto, updatedAt: new Date() };
      return store[idx];
    },
    deactivateCustomer: async (_t: string, id: string) => {
      const idx = store.findIndex(c => c.id === id);
      if (idx === -1) throw new Error('Customer not found');
      store[idx] = { ...store[idx], isActive: false };
    },
    searchCustomers: async (_t: string, query: string) =>
      store.filter(c => c.name.toLowerCase().includes(query.toLowerCase())),
  };
}

export function createMockSupplierRepo(suppliers: Supplier[] = SEED_SUPPLIERS): ISupplierRepository {
  const store = [...suppliers];
  return {
    getSuppliers: async (t: string) => store.filter(s => s.tenantId === t),
    getById: async (id: string, _t: string) => store.find(s => s.id === id) ?? null,
    getByAccountHeadId: async (accountHeadId: string, _t: string) =>
      store.find(s => s.accountHeadId === accountHeadId) ?? null,
    create: async (supplier: any, _t: string) => {
      const now = new Date();
      const s: Supplier = {
        id: `supp-${Date.now()}`,
        tenantId: TENANT_ID,
        accountHeadId: supplier.accountHeadId ?? '',
        name: supplier.name,
        contactPerson: supplier.contactPerson,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        city: supplier.city,
        taxRegistrationNumber: supplier.taxRegistrationNumber,
        paymentTerms: supplier.paymentTerms,
        creditLimit: supplier.creditLimit,
        isActive: supplier.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      };
      store.push(s);
      return s;
    },
    update: async (id: string, supplier: any, _t: string) => {
      const idx = store.findIndex(s => s.id === id);
      if (idx === -1) throw new Error('Supplier not found');
      store[idx] = { ...store[idx], ...supplier, updatedAt: new Date() };
      return store[idx];
    },
    deactivate: async (id: string, _t: string) => {
      const idx = store.findIndex(s => s.id === id);
      if (idx === -1) return false;
      store[idx] = { ...store[idx], isActive: false };
      return true;
    },
    search: async (query: string, _t: string) =>
      store.filter(s => s.name.toLowerCase().includes(query.toLowerCase())),
  };
}
