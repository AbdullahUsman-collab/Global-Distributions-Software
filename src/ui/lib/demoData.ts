/**
 * Client-Side Demo Data Module
 * Deterministic mock data for ALL API endpoints when running on Vercel (static deployment with no server).
 *
 * RULE: All IDs are stable strings (not random).
 * RULE: All dates are in August 2026.
 * RULE: All amounts in PKR.
 * RULE: No Math.random().
 */

const T = 'tenant-demo-wholesale-001';

/* ─── Tenants ─────────────────────────────────────────────── */

export const DEMO_TENANTS = [
  {
    id: 'tenant-demo-wholesale-001',
    slug: 'demo-wholesale',
    brandName: 'Demo Wholesale',
    logoUrl: '',
    primaryColor: '#1E40AF',
    accentColor: '#1E3A8A',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 'tenant-demo-distribution-002',
    slug: 'demo-distribution',
    brandName: 'Demo Distribution',
    logoUrl: '',
    primaryColor: '#059669',
    accentColor: '#047857',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 'tenant-apex-trading-003',
    slug: 'apex-trading',
    brandName: 'Apex Trading',
    logoUrl: '',
    primaryColor: '#D97706',
    accentColor: '#B45309',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
];

/* ─── Users ───────────────────────────────────────────────── */

export const DEMO_USERS: Record<string, { username: string; password: string; userId: string; displayName: string; role: string; tenantId: string }> = {
  'admin@tenant-demo-wholesale-001': { username: 'admin', password: 'admin123', userId: 'user-admin-001', displayName: 'Administrator', role: 'ADMIN', tenantId: 'tenant-demo-wholesale-001' },
  'manager@tenant-demo-wholesale-001': { username: 'manager', password: 'manager123', userId: 'user-manager-001', displayName: 'Sales Manager', role: 'MANAGER', tenantId: 'tenant-demo-wholesale-001' },
  'clerk@tenant-demo-wholesale-001': { username: 'clerk', password: 'clerk123', userId: 'user-clerk-001', displayName: 'Sales Clerk', role: 'SALES', tenantId: 'tenant-demo-wholesale-001' },
  'admin@tenant-demo-distribution-002': { username: 'admin', password: 'admin123', userId: 'user-admin-002', displayName: 'Administrator', role: 'ADMIN', tenantId: 'tenant-demo-distribution-002' },
  'admin@tenant-apex-trading-003': { username: 'admin', password: 'admin123', userId: 'user-admin-003', displayName: 'Administrator', role: 'ADMIN', tenantId: 'tenant-apex-trading-003' },
};

/* ─── Warehouses ──────────────────────────────────────────── */

const DEMO_WAREHOUSES = [
  { id: 'wh-01', tenantId: T, code: 'WH-01', name: 'Main Warehouse', isActive: true },
  { id: 'wh-02', tenantId: T, code: 'WH-02', name: 'Showroom', isActive: true },
];

/* ─── Products (FMCG) ────────────────────────────────────── */

const DEMO_PRODUCTS = [
  { id: 'prod-01', tenantId: T, sku: 'PRD-001', name: 'Milk 1 Liter', category: 'Dairy', unit: 'Ltr', pcsPerCarton: 12, saleRate: 280, purchaseRate: 240, retailPrice: 300, tradeDiscount: 2, tradeOffer: 'Buy 5 Get 1', minQuantity: 10, hsCode: '0401.10', gstType: 'VAT', gstPercent: 17, fedPercent: 0, advanceTaxSalePercent: 0, advanceTaxPurchasePercent: 0, isActive: true },
  { id: 'prod-02', tenantId: T, sku: 'PRD-002', name: 'Milk 500ml', category: 'Dairy', unit: 'Pcs', pcsPerCarton: 24, saleRate: 160, purchaseRate: 130, retailPrice: 170, tradeDiscount: 0, tradeOffer: '', minQuantity: 20, hsCode: '0401.10', gstType: 'VAT', gstPercent: 17, fedPercent: 0, advanceTaxSalePercent: 0, advanceTaxPurchasePercent: 0, isActive: true },
  { id: 'prod-03', tenantId: T, sku: 'PRD-003', name: 'Butter 200g', category: 'Dairy', unit: 'Pcs', pcsPerCarton: 36, saleRate: 450, purchaseRate: 350, retailPrice: 480, tradeDiscount: 3, tradeOffer: 'Buy 10 Get 1', minQuantity: 10, hsCode: '0405.10', gstType: 'VAT', gstPercent: 17, fedPercent: 0, advanceTaxSalePercent: 0, advanceTaxPurchasePercent: 0, isActive: true },
  { id: 'prod-04', tenantId: T, sku: 'PRD-004', name: 'Cooking Oil 1L', category: 'Oil', unit: 'Btl', pcsPerCarton: 12, saleRate: 580, purchaseRate: 480, retailPrice: 620, tradeDiscount: 2, tradeOffer: '', minQuantity: 12, hsCode: '1511.00', gstType: 'VAT', gstPercent: 17, fedPercent: 0, advanceTaxSalePercent: 1, advanceTaxPurchasePercent: 1, isActive: true },
  { id: 'prod-05', tenantId: T, sku: 'PRD-005', name: 'Cooking Oil 5L', category: 'Oil', unit: 'Btl', pcsPerCarton: 4, saleRate: 2700, purchaseRate: 2300, retailPrice: 2850, tradeDiscount: 2, tradeOffer: 'Buy 4 Get 1', minQuantity: 4, hsCode: '1511.00', gstType: 'VAT', gstPercent: 17, fedPercent: 0, advanceTaxSalePercent: 1, advanceTaxPurchasePercent: 1, isActive: true },
  { id: 'prod-06', tenantId: T, sku: 'PRD-006', name: 'Ghee 1kg', category: 'Ghee', unit: 'Kg', pcsPerCarton: 20, saleRate: 720, purchaseRate: 600, retailPrice: 780, tradeDiscount: 2, tradeOffer: 'Buy 10 Get 1', minQuantity: 10, hsCode: '0405.00', gstType: 'VAT', gstPercent: 17, fedPercent: 0, advanceTaxSalePercent: 1, advanceTaxPurchasePercent: 1, isActive: true },
  { id: 'prod-07', tenantId: T, sku: 'PRD-007', name: 'Pasta 500g', category: 'Food', unit: 'Pcs', pcsPerCarton: 30, saleRate: 180, purchaseRate: 140, retailPrice: 200, tradeDiscount: 0, tradeOffer: '', minQuantity: 20, hsCode: '1905.20', gstType: 'VAT', gstPercent: 17, fedPercent: 0, advanceTaxSalePercent: 0, advanceTaxPurchasePercent: 0, isActive: true },
  { id: 'prod-08', tenantId: T, sku: 'PRD-008', name: 'Tea 950g', category: 'Beverages', unit: 'Pcs', pcsPerCarton: 12, saleRate: 850, purchaseRate: 720, retailPrice: 900, tradeDiscount: 3, tradeOffer: '', minQuantity: 10, hsCode: '0902.10', gstType: 'VAT', gstPercent: 17, fedPercent: 0, advanceTaxSalePercent: 0, advanceTaxPurchasePercent: 0, isActive: true },
  { id: 'prod-09', tenantId: T, sku: 'PRD-009', name: 'Sugar 1kg', category: 'Grocery', unit: 'Kg', pcsPerCarton: 50, saleRate: 140, purchaseRate: 120, retailPrice: 150, tradeDiscount: 0, tradeOffer: '', minQuantity: 50, hsCode: '1701.10', gstType: '8TH', gstPercent: 0, fedPercent: 0, advanceTaxSalePercent: 0, advanceTaxPurchasePercent: 0, isActive: true },
  { id: 'prod-10', tenantId: T, sku: 'PRD-010', name: 'Rice 5kg', category: 'Grocery', unit: 'Pcs', pcsPerCarton: 10, saleRate: 950, purchaseRate: 800, retailPrice: 1020, tradeDiscount: 2, tradeOffer: '', minQuantity: 10, hsCode: '1006.30', gstType: '8TH', gstPercent: 0, fedPercent: 0, advanceTaxSalePercent: 0, advanceTaxPurchasePercent: 0, isActive: true },
  { id: 'prod-11', tenantId: T, sku: 'PRD-011', name: 'Flour 10kg', category: 'Grocery', unit: 'Pcs', pcsPerCarton: 8, saleRate: 1200, purchaseRate: 1050, retailPrice: 1280, tradeDiscount: 2, tradeOffer: '', minQuantity: 8, hsCode: '1101.00', gstType: '8TH', gstPercent: 0, fedPercent: 0, advanceTaxSalePercent: 0, advanceTaxPurchasePercent: 0, isActive: true },
  { id: 'prod-12', tenantId: T, sku: 'PRD-012', name: 'Soap 100g', category: 'Personal', unit: 'Pcs', pcsPerCarton: 60, saleRate: 85, purchaseRate: 60, retailPrice: 95, tradeDiscount: 0, tradeOffer: 'Buy 20 Get 5', minQuantity: 30, hsCode: '3401.11', gstType: 'VAT', gstPercent: 17, fedPercent: 0, advanceTaxSalePercent: 0, advanceTaxPurchasePercent: 0, isActive: true },
  { id: 'prod-13', tenantId: T, sku: 'PRD-013', name: 'Shampoo 250ml', category: 'Personal', unit: 'Pcs', pcsPerCarton: 24, saleRate: 320, purchaseRate: 250, retailPrice: 350, tradeDiscount: 3, tradeOffer: '', minQuantity: 12, hsCode: '3305.10', gstType: 'VAT', gstPercent: 17, fedPercent: 0, advanceTaxSalePercent: 0, advanceTaxPurchasePercent: 0, isActive: true },
  { id: 'prod-14', tenantId: T, sku: 'PRD-014', name: 'Detergent 1kg', category: 'Cleaning', unit: 'Pcs', pcsPerCarton: 12, saleRate: 380, purchaseRate: 300, retailPrice: 410, tradeDiscount: 2, tradeOffer: '', minQuantity: 12, hsCode: '3402.20', gstType: 'VAT', gstPercent: 17, fedPercent: 0, advanceTaxSalePercent: 0, advanceTaxPurchasePercent: 0, isActive: true },
  { id: 'prod-15', tenantId: T, sku: 'PRD-015', name: 'Biscuits Pack', category: 'Snacks', unit: 'Pcs', pcsPerCarton: 40, saleRate: 120, purchaseRate: 90, retailPrice: 135, tradeDiscount: 0, tradeOffer: 'Buy 10 Get 2', minQuantity: 20, hsCode: '1905.31', gstType: 'VAT', gstPercent: 17, fedPercent: 0, advanceTaxSalePercent: 0, advanceTaxPurchasePercent: 0, isActive: true },
  { id: 'prod-16', tenantId: T, sku: 'PRD-016', name: 'Cold Drinks 1.5L', category: 'Beverages', unit: 'Btl', pcsPerCarton: 12, saleRate: 200, purchaseRate: 160, retailPrice: 220, tradeDiscount: 0, tradeOffer: 'Buy 5 Get 1', minQuantity: 12, hsCode: '2202.10', gstType: 'VAT', gstPercent: 17, fedPercent: 5, advanceTaxSalePercent: 0, advanceTaxPurchasePercent: 0, isActive: true },
  { id: 'prod-17', tenantId: T, sku: 'PRD-017', name: 'Water 1.5L', category: 'Beverages', unit: 'Btl', pcsPerCarton: 12, saleRate: 80, purchaseRate: 55, retailPrice: 90, tradeDiscount: 0, tradeOffer: '', minQuantity: 12, hsCode: '2201.10', gstType: 'VAT', gstPercent: 17, fedPercent: 0, advanceTaxSalePercent: 0, advanceTaxPurchasePercent: 0, isActive: true },
  { id: 'prod-18', tenantId: T, sku: 'PRD-018', name: 'Chicken Masala 50g', category: 'Spices', unit: 'Pcs', pcsPerCarton: 48, saleRate: 95, purchaseRate: 70, retailPrice: 110, tradeDiscount: 0, tradeOffer: '', minQuantity: 24, hsCode: '0910.99', gstType: 'VAT', gstPercent: 17, fedPercent: 0, advanceTaxSalePercent: 0, advanceTaxPurchasePercent: 0, isActive: true },
  { id: 'prod-19', tenantId: T, sku: 'PRD-019', name: 'Salt 1kg', category: 'Grocery', unit: 'Kg', pcsPerCarton: 50, saleRate: 65, purchaseRate: 45, retailPrice: 75, tradeDiscount: 0, tradeOffer: '', minQuantity: 50, hsCode: '2501.00', gstType: '8TH', gstPercent: 0, fedPercent: 0, advanceTaxSalePercent: 0, advanceTaxPurchasePercent: 0, isActive: true },
  { id: 'prod-20', tenantId: T, sku: 'PRD-020', name: 'Rice Basmati 10kg', category: 'Grocery', unit: 'Pcs', pcsPerCarton: 6, saleRate: 2400, purchaseRate: 2100, retailPrice: 2550, tradeDiscount: 2, tradeOffer: '', minQuantity: 6, hsCode: '1006.30', gstType: '8TH', gstPercent: 0, fedPercent: 0, advanceTaxSalePercent: 0, advanceTaxPurchasePercent: 0, isActive: true },
];

/* ─── Customers ───────────────────────────────────────────── */

const DEMO_CUSTOMERS = [
  { id: 'cust-01', tenantId: T, accountHeadId: 'coa-11201', name: 'Al-Noor Super Store', address: 'Islamabad', ownerName: 'Ahmed Raza', phone: '0321-1234567', stn: 'STN-001', ntn: 'NTN-001', cnic: '35201-1234567-1', isActive: true },
  { id: 'cust-02', tenantId: T, accountHeadId: 'coa-11202', name: 'City Mart', address: 'Lahore', ownerName: 'Ali Hassan', phone: '0333-2345678', stn: 'STN-002', ntn: 'NTN-002', cnic: '35101-2345678-2', isActive: true },
  { id: 'cust-03', tenantId: T, accountHeadId: 'coa-11203', name: 'Faisal Traders', address: 'Karachi', ownerName: 'Faisal Ahmed', phone: '0300-3456789', stn: 'STN-003', ntn: 'NTN-003', cnic: '42101-3456789-3', isActive: true },
  { id: 'cust-04', tenantId: T, accountHeadId: 'coa-11204', name: 'Madina Cash & Carry', address: 'Rawalpindi', ownerName: 'Tariq Mehmood', phone: '0311-4567890', stn: 'STN-004', ntn: 'NTN-004', cnic: '35201-4567890-4', isActive: true },
  { id: 'cust-05', tenantId: T, accountHeadId: 'coa-11205', name: 'New Pakistan Store', address: 'Faisalabad', ownerName: 'Usman Ghani', phone: '0345-5678901', stn: 'STN-005', ntn: 'NTN-005', cnic: '35601-5678901-5', isActive: true },
  { id: 'cust-06', tenantId: T, accountHeadId: 'coa-11206', name: 'Galaxy Mart', address: 'Multan', ownerName: 'Bilal Khan', phone: '0322-6789012', stn: 'STN-006', ntn: 'NTN-006', cnic: '35401-6789012-6', isActive: true },
  { id: 'cust-07', tenantId: T, accountHeadId: 'coa-11207', name: 'Punjab General Store', address: 'Sialkot', ownerName: 'Imran Shah', phone: '0334-7890123', stn: 'STN-007', ntn: 'NTN-007', cnic: '35301-7890123-7', isActive: true },
  { id: 'cust-08', tenantId: T, accountHeadId: 'coa-11208', name: 'Main Market Traders', address: 'Peshawar', ownerName: 'Naveed Akhtar', phone: '0301-8901234', stn: 'STN-008', ntn: 'NTN-008', cnic: '17101-8901234-8', isActive: true },
  { id: 'cust-09', tenantId: T, accountHeadId: 'coa-11209', name: 'Family Cash & Carry', address: 'Quetta', ownerName: 'Asif Ali', phone: '0342-9012345', stn: 'STN-009', ntn: 'NTN-009', cnic: '81101-9012345-9', isActive: true },
  { id: 'cust-10', tenantId: T, accountHeadId: 'coa-11210', name: 'Sana Wholesale', address: 'Hyderabad', ownerName: 'Sanaullah', phone: '0312-0123456', stn: 'STN-010', ntn: 'NTN-010', cnic: '41101-0123456-0', isActive: true },
];

/* ─── Suppliers ───────────────────────────────────────────── */

const DEMO_SUPPLIERS = [
  { id: 'sup-01', tenantId: T, name: 'ABC Foods Supplier', contactPerson: 'Ahmad Shah', phone: '021-34567890', email: 'abc@food.com', address: 'SITE Area, Karachi', city: 'Karachi', accountHeadId: 'coa-21101', taxRegistrationNumber: 'TRN-001', paymentTerms: 'Net 30', creditLimit: 500000, isActive: true },
  { id: 'sup-02', tenantId: T, name: 'Punjab Distributors', contactPerson: 'Raza Ali', phone: '042-23456789', email: 'punjab@dist.com', address: 'Gulberg III, Lahore', city: 'Lahore', accountHeadId: 'coa-21102', taxRegistrationNumber: 'TRN-002', paymentTerms: 'Net 45', creditLimit: 750000, isActive: true },
  { id: 'sup-03', tenantId: T, name: 'National Packaging', contactPerson: 'Hamza Malik', phone: '041-34567890', email: 'national@pkg.com', address: 'Sargodha Road, Faisalabad', city: 'Faisalabad', accountHeadId: 'coa-21103', taxRegistrationNumber: 'TRN-003', paymentTerms: 'Net 30', creditLimit: 1000000, isActive: true },
  { id: 'sup-04', tenantId: T, name: 'Prime Traders', contactPerson: 'Kashif Raza', phone: '051-23456789', email: 'prime@trade.com', address: 'Blue Area, Islamabad', city: 'Islamabad', accountHeadId: 'coa-21104', taxRegistrationNumber: 'TRN-004', paymentTerms: 'Net 60', creditLimit: 300000, isActive: true },
  { id: 'sup-05', tenantId: T, name: 'Metro Wholesale', contactPerson: 'Tariq Aziz', phone: '061-34567890', email: 'metro@wholesale.com', address: 'Mall Road, Multan', city: 'Multan', accountHeadId: 'coa-21105', taxRegistrationNumber: 'TRN-005', paymentTerms: 'Net 30', creditLimit: 400000, isActive: true },
  { id: 'sup-06', tenantId: T, name: 'Fresh Supply Co.', contactPerson: 'Babar Khan', phone: '091-23456789', email: 'fresh@supply.com', address: 'University Road, Peshawar', city: 'Peshawar', accountHeadId: 'coa-21106', taxRegistrationNumber: 'TRN-006', paymentTerms: 'Net 45', creditLimit: 600000, isActive: true },
];

/* ─── COA Accounts ────────────────────────────────────────── */

function coaId(code: string): string { return `coa-${code}`; }

const DEMO_ACCOUNTS = [
  // Level 1 — Major Heads
  { id: coaId('10000'), tenantId: T, accountCode: '10000', accountName: 'Assets', parentId: null, level: 1 as const, accountType: 'ASSET' as const, normalBalance: 'DEBIT' as const, isPosting: false, isSummary: true, isActive: true },
  { id: coaId('20000'), tenantId: T, accountCode: '20000', accountName: 'Liabilities', parentId: null, level: 1 as const, accountType: 'LIABILITY' as const, normalBalance: 'CREDIT' as const, isPosting: false, isSummary: true, isActive: true },
  { id: coaId('30000'), tenantId: T, accountCode: '30000', accountName: 'Equity', parentId: null, level: 1 as const, accountType: 'EQUITY' as const, normalBalance: 'CREDIT' as const, isPosting: false, isSummary: true, isActive: true },
  { id: coaId('40000'), tenantId: T, accountCode: '40000', accountName: 'Revenue', parentId: null, level: 1 as const, accountType: 'REVENUE' as const, normalBalance: 'CREDIT' as const, isPosting: false, isSummary: true, isActive: true },
  { id: coaId('50000'), tenantId: T, accountCode: '50000', accountName: 'Cost of Goods Sold', parentId: null, level: 1 as const, accountType: 'COGS' as const, normalBalance: 'DEBIT' as const, isPosting: false, isSummary: true, isActive: true },
  { id: coaId('60000'), tenantId: T, accountCode: '60000', accountName: 'Expenses', parentId: null, level: 1 as const, accountType: 'EXPENSE' as const, normalBalance: 'DEBIT' as const, isPosting: false, isSummary: true, isActive: true },
  // Level 2 — Control Groups
  { id: coaId('11000'), tenantId: T, accountCode: '11000', accountName: 'Current Assets', parentId: coaId('10000'), level: 2 as const, accountType: 'ASSET' as const, normalBalance: 'DEBIT' as const, isPosting: false, isSummary: true, isActive: true },
  { id: coaId('21000'), tenantId: T, accountCode: '21000', accountName: 'Current Liabilities', parentId: coaId('20000'), level: 2 as const, accountType: 'LIABILITY' as const, normalBalance: 'CREDIT' as const, isPosting: false, isSummary: true, isActive: true },
  { id: coaId('31000'), tenantId: T, accountCode: '31000', accountName: "Owner's Equity", parentId: coaId('30000'), level: 2 as const, accountType: 'EQUITY' as const, normalBalance: 'CREDIT' as const, isPosting: false, isSummary: true, isActive: true },
  { id: coaId('41000'), tenantId: T, accountCode: '41000', accountName: 'Operating Revenue', parentId: coaId('40000'), level: 2 as const, accountType: 'REVENUE' as const, normalBalance: 'CREDIT' as const, isPosting: false, isSummary: true, isActive: true },
  { id: coaId('51000'), tenantId: T, accountCode: '51000', accountName: 'Direct Costs', parentId: coaId('50000'), level: 2 as const, accountType: 'COGS' as const, normalBalance: 'DEBIT' as const, isPosting: false, isSummary: true, isActive: true },
  { id: coaId('61000'), tenantId: T, accountCode: '61000', accountName: 'Administrative Expenses', parentId: coaId('60000'), level: 2 as const, accountType: 'EXPENSE' as const, normalBalance: 'DEBIT' as const, isPosting: false, isSummary: true, isActive: true },
  // Level 3 — Sub-Groups
  { id: coaId('11100'), tenantId: T, accountCode: '11100', accountName: 'Cash & Bank', parentId: coaId('11000'), level: 3 as const, accountType: 'ASSET' as const, normalBalance: 'DEBIT' as const, isPosting: false, isSummary: true, isActive: true },
  { id: coaId('11200'), tenantId: T, accountCode: '11200', accountName: 'Accounts Receivable', parentId: coaId('11000'), level: 3 as const, accountType: 'ASSET' as const, normalBalance: 'DEBIT' as const, isPosting: false, isSummary: true, isActive: true },
  { id: coaId('11300'), tenantId: T, accountCode: '11300', accountName: 'Inventory Group', parentId: coaId('11000'), level: 3 as const, accountType: 'ASSET' as const, normalBalance: 'DEBIT' as const, isPosting: false, isSummary: true, isActive: true },
  { id: coaId('21100'), tenantId: T, accountCode: '21100', accountName: 'Accounts Payable', parentId: coaId('21000'), level: 3 as const, accountType: 'LIABILITY' as const, normalBalance: 'CREDIT' as const, isPosting: false, isSummary: true, isActive: true },
  { id: coaId('31100'), tenantId: T, accountCode: '31100', accountName: 'Capital Accounts', parentId: coaId('31000'), level: 3 as const, accountType: 'EQUITY' as const, normalBalance: 'CREDIT' as const, isPosting: false, isSummary: true, isActive: true },
  { id: coaId('41100'), tenantId: T, accountCode: '41100', accountName: 'Sales Revenue', parentId: coaId('41000'), level: 3 as const, accountType: 'REVENUE' as const, normalBalance: 'CREDIT' as const, isPosting: false, isSummary: true, isActive: true },
  { id: coaId('51100'), tenantId: T, accountCode: '51100', accountName: 'Purchase Costs', parentId: coaId('51000'), level: 3 as const, accountType: 'COGS' as const, normalBalance: 'DEBIT' as const, isPosting: false, isSummary: true, isActive: true },
  { id: coaId('61100'), tenantId: T, accountCode: '61100', accountName: 'General Administrative Expenses', parentId: coaId('61000'), level: 3 as const, accountType: 'EXPENSE' as const, normalBalance: 'DEBIT' as const, isPosting: false, isSummary: true, isActive: true },
  // Level 4 — Posting Accounts
  { id: coaId('11101'), tenantId: T, accountCode: '11101', accountName: 'Cash in Hand', parentId: coaId('11100'), level: 4 as const, accountType: 'ASSET' as const, normalBalance: 'DEBIT' as const, isPosting: true, isSummary: false, isActive: true },
  { id: coaId('11102'), tenantId: T, accountCode: '11102', accountName: 'Bank Account Main', parentId: coaId('11100'), level: 4 as const, accountType: 'ASSET' as const, normalBalance: 'DEBIT' as const, isPosting: true, isSummary: false, isActive: true },
  { id: coaId('11201'), tenantId: T, accountCode: '11201', accountName: 'Al-Noor Super Store — AR', parentId: coaId('11200'), level: 4 as const, accountType: 'ASSET' as const, normalBalance: 'DEBIT' as const, isPosting: true, isSummary: false, isActive: true },
  { id: coaId('11202'), tenantId: T, accountCode: '11202', accountName: 'City Mart — AR', parentId: coaId('11200'), level: 4 as const, accountType: 'ASSET' as const, normalBalance: 'DEBIT' as const, isPosting: true, isSummary: false, isActive: true },
  { id: coaId('11203'), tenantId: T, accountCode: '11203', accountName: 'Faisal Traders — AR', parentId: coaId('11200'), level: 4 as const, accountType: 'ASSET' as const, normalBalance: 'DEBIT' as const, isPosting: true, isSummary: false, isActive: true },
  { id: coaId('11204'), tenantId: T, accountCode: '11204', accountName: 'Madina Cash & Carry — AR', parentId: coaId('11200'), level: 4 as const, accountType: 'ASSET' as const, normalBalance: 'DEBIT' as const, isPosting: true, isSummary: false, isActive: true },
  { id: coaId('11205'), tenantId: T, accountCode: '11205', accountName: 'New Pakistan Store — AR', parentId: coaId('11200'), level: 4 as const, accountType: 'ASSET' as const, normalBalance: 'DEBIT' as const, isPosting: true, isSummary: false, isActive: true },
  { id: coaId('11206'), tenantId: T, accountCode: '11206', accountName: 'Galaxy Mart — AR', parentId: coaId('11200'), level: 4 as const, accountType: 'ASSET' as const, normalBalance: 'DEBIT' as const, isPosting: true, isSummary: false, isActive: true },
  { id: coaId('11207'), tenantId: T, accountCode: '11207', accountName: 'Punjab General Store — AR', parentId: coaId('11200'), level: 4 as const, accountType: 'ASSET' as const, normalBalance: 'DEBIT' as const, isPosting: true, isSummary: false, isActive: true },
  { id: coaId('11208'), tenantId: T, accountCode: '11208', accountName: 'Main Market Traders — AR', parentId: coaId('11200'), level: 4 as const, accountType: 'ASSET' as const, normalBalance: 'DEBIT' as const, isPosting: true, isSummary: false, isActive: true },
  { id: coaId('11209'), tenantId: T, accountCode: '11209', accountName: 'Family Cash & Carry — AR', parentId: coaId('11200'), level: 4 as const, accountType: 'ASSET' as const, normalBalance: 'DEBIT' as const, isPosting: true, isSummary: false, isActive: true },
  { id: coaId('11210'), tenantId: T, accountCode: '11210', accountName: 'Sana Wholesale — AR', parentId: coaId('11200'), level: 4 as const, accountType: 'ASSET' as const, normalBalance: 'DEBIT' as const, isPosting: true, isSummary: false, isActive: true },
  { id: coaId('11301'), tenantId: T, accountCode: '11301', accountName: 'General Inventory', parentId: coaId('11300'), level: 4 as const, accountType: 'ASSET' as const, normalBalance: 'DEBIT' as const, isPosting: true, isSummary: false, isActive: true },
  { id: coaId('21101'), tenantId: T, accountCode: '21101', accountName: 'ABC Foods Supplier — AP', parentId: coaId('21100'), level: 4 as const, accountType: 'LIABILITY' as const, normalBalance: 'CREDIT' as const, isPosting: true, isSummary: false, isActive: true },
  { id: coaId('21102'), tenantId: T, accountCode: '21102', accountName: 'Punjab Distributors — AP', parentId: coaId('21100'), level: 4 as const, accountType: 'LIABILITY' as const, normalBalance: 'CREDIT' as const, isPosting: true, isSummary: false, isActive: true },
  { id: coaId('21103'), tenantId: T, accountCode: '21103', accountName: 'National Packaging — AP', parentId: coaId('21100'), level: 4 as const, accountType: 'LIABILITY' as const, normalBalance: 'CREDIT' as const, isPosting: true, isSummary: false, isActive: true },
  { id: coaId('21104'), tenantId: T, accountCode: '21104', accountName: 'Prime Traders — AP', parentId: coaId('21100'), level: 4 as const, accountType: 'LIABILITY' as const, normalBalance: 'CREDIT' as const, isPosting: true, isSummary: false, isActive: true },
  { id: coaId('21105'), tenantId: T, accountCode: '21105', accountName: 'Metro Wholesale — AP', parentId: coaId('21100'), level: 4 as const, accountType: 'LIABILITY' as const, normalBalance: 'CREDIT' as const, isPosting: true, isSummary: false, isActive: true },
  { id: coaId('21106'), tenantId: T, accountCode: '21106', accountName: 'Fresh Supply Co. — AP', parentId: coaId('21100'), level: 4 as const, accountType: 'LIABILITY' as const, normalBalance: 'CREDIT' as const, isPosting: true, isSummary: false, isActive: true },
  { id: coaId('31101'), tenantId: T, accountCode: '31101', accountName: "Owner's Capital", parentId: coaId('31100'), level: 4 as const, accountType: 'EQUITY' as const, normalBalance: 'CREDIT' as const, isPosting: true, isSummary: false, isActive: true },
  { id: coaId('41101'), tenantId: T, accountCode: '41101', accountName: 'Wholesale Sales', parentId: coaId('41100'), level: 4 as const, accountType: 'REVENUE' as const, normalBalance: 'CREDIT' as const, isPosting: true, isSummary: false, isActive: true },
  { id: coaId('41104'), tenantId: T, accountCode: '41104', accountName: 'Sales Return', parentId: coaId('41100'), level: 4 as const, accountType: 'REVENUE' as const, normalBalance: 'CREDIT' as const, isPosting: true, isSummary: false, isActive: true },
  { id: coaId('51101'), tenantId: T, accountCode: '51101', accountName: 'Material Purchases', parentId: coaId('51100'), level: 4 as const, accountType: 'COGS' as const, normalBalance: 'DEBIT' as const, isPosting: true, isSummary: false, isActive: true },
  { id: coaId('51104'), tenantId: T, accountCode: '51104', accountName: 'Purchase Return', parentId: coaId('51100'), level: 4 as const, accountType: 'COGS' as const, normalBalance: 'DEBIT' as const, isPosting: true, isSummary: false, isActive: true },
  { id: coaId('61101'), tenantId: T, accountCode: '61101', accountName: 'Rent Expense', parentId: coaId('61100'), level: 4 as const, accountType: 'EXPENSE' as const, normalBalance: 'DEBIT' as const, isPosting: true, isSummary: false, isActive: true },
  { id: coaId('61102'), tenantId: T, accountCode: '61102', accountName: 'Utilities Expense', parentId: coaId('61100'), level: 4 as const, accountType: 'EXPENSE' as const, normalBalance: 'DEBIT' as const, isPosting: true, isSummary: false, isActive: true },
  { id: coaId('61103'), tenantId: T, accountCode: '61103', accountName: 'Office Salaries', parentId: coaId('61100'), level: 4 as const, accountType: 'EXPENSE' as const, normalBalance: 'DEBIT' as const, isPosting: true, isSummary: false, isActive: true },
];

/* ─── Vouchers ────────────────────────────────────────────── */

const DEMO_VOUCHERS = [
  // Opening Balance JV
  { id: 'vch-01', tenantId: T, voucherNumber: 1, voucherType: 'JV', status: 'POSTED', date: '2026-08-01', narration: 'Opening balance as of August 2026', createdBy: 'admin', createdAt: new Date('2026-08-01'), updatedAt: new Date('2026-08-01') },
  // 4 Sale Vouchers
  { id: 'vch-02', tenantId: T, voucherNumber: 2, voucherType: 'SV', status: 'POSTED', date: '2026-08-02', narration: 'Sale to Al-Noor Super Store — Invoice #1001', createdBy: 'admin', createdAt: new Date('2026-08-02'), updatedAt: new Date('2026-08-02') },
  { id: 'vch-03', tenantId: T, voucherNumber: 3, voucherType: 'SV', status: 'POSTED', date: '2026-08-05', narration: 'Sale to City Mart — Invoice #1002', createdBy: 'admin', createdAt: new Date('2026-08-05'), updatedAt: new Date('2026-08-05') },
  { id: 'vch-04', tenantId: T, voucherNumber: 4, voucherType: 'SV', status: 'POSTED', date: '2026-08-10', narration: 'Sale to Faisal Traders — Invoice #1003', createdBy: 'admin', createdAt: new Date('2026-08-10'), updatedAt: new Date('2026-08-10') },
  { id: 'vch-05', tenantId: T, voucherNumber: 5, voucherType: 'SV', status: 'POSTED', date: '2026-08-15', narration: 'Sale to Madina Cash & Carry — Invoice #1004', createdBy: 'admin', createdAt: new Date('2026-08-15'), updatedAt: new Date('2026-08-15') },
  // 1 Sale Return Voucher
  { id: 'vch-06', tenantId: T, voucherNumber: 6, voucherType: 'SRV', status: 'POSTED', date: '2026-08-12', narration: 'Sale return from City Mart — damaged goods', createdBy: 'admin', createdAt: new Date('2026-08-12'), updatedAt: new Date('2026-08-12') },
  // 2 Purchase Vouchers
  { id: 'vch-07', tenantId: T, voucherNumber: 7, voucherType: 'PV', status: 'POSTED', date: '2026-08-03', narration: 'Purchase from ABC Foods Supplier — PO #2001', createdBy: 'admin', createdAt: new Date('2026-08-03'), updatedAt: new Date('2026-08-03') },
  { id: 'vch-08', tenantId: T, voucherNumber: 8, voucherType: 'PV', status: 'POSTED', date: '2026-08-08', narration: 'Purchase from Punjab Distributors — PO #2002', createdBy: 'admin', createdAt: new Date('2026-08-08'), updatedAt: new Date('2026-08-08') },
  // 1 Purchase Return Voucher
  { id: 'vch-09', tenantId: T, voucherNumber: 9, voucherType: 'PRV', status: 'POSTED', date: '2026-08-14', narration: 'Purchase return to ABC Foods Supplier — defective batch', createdBy: 'admin', createdAt: new Date('2026-08-14'), updatedAt: new Date('2026-08-14') },
  // 2 Customer Receipts
  { id: 'vch-10', tenantId: T, voucherNumber: 10, voucherType: 'CR', status: 'POSTED', date: '2026-08-18', narration: 'Cash received from Al-Noor Super Store — partial payment', createdBy: 'admin', createdAt: new Date('2026-08-18'), updatedAt: new Date('2026-08-18') },
  { id: 'vch-11', tenantId: T, voucherNumber: 11, voucherType: 'CRV', status: 'POSTED', date: '2026-08-20', narration: 'Bank receipt from Faisal Traders — partial settlement', createdBy: 'admin', createdAt: new Date('2026-08-20'), updatedAt: new Date('2026-08-20') },
  // 1 Cash Payment
  { id: 'vch-12', tenantId: T, voucherNumber: 12, voucherType: 'CP', status: 'POSTED', date: '2026-08-07', narration: 'Cash payment for office supplies', createdBy: 'admin', createdAt: new Date('2026-08-07'), updatedAt: new Date('2026-08-07') },
  // 1 Bank Payment Voucher
  { id: 'vch-13', tenantId: T, voucherNumber: 13, voucherType: 'BPV', status: 'POSTED', date: '2026-08-22', narration: 'Monthly salaries via bank transfer', createdBy: 'admin', createdAt: new Date('2026-08-22'), updatedAt: new Date('2026-08-22') },
  // 1 Rent JV
  { id: 'vch-14', tenantId: T, voucherNumber: 14, voucherType: 'JV', status: 'POSTED', date: '2026-08-01', narration: 'Office rent allocation for August', createdBy: 'admin', createdAt: new Date('2026-08-01'), updatedAt: new Date('2026-08-01') },
  // 2 Draft JVs
  { id: 'vch-15', tenantId: T, voucherNumber: 15, voucherType: 'JV', status: 'DRAFT', date: '2026-08-24', narration: 'Adjustment entry — pending approval', createdBy: 'admin', createdAt: new Date('2026-08-24'), updatedAt: new Date('2026-08-24') },
  { id: 'vch-16', tenantId: T, voucherNumber: 16, voucherType: 'JV', status: 'DRAFT', date: '2026-08-25', narration: 'Depreciation entry — pending approval', createdBy: 'admin', createdAt: new Date('2026-08-25'), updatedAt: new Date('2026-08-25') },
  // 1 Purchase Payment Voucher (settling PO #2002)
  { id: 'vch-17', tenantId: T, voucherNumber: 17, voucherType: 'PV', status: 'POSTED', date: '2026-08-22', narration: 'Bank payment to Punjab Distributors — PO #2002 settled', createdBy: 'admin', createdAt: new Date('2026-08-22'), updatedAt: new Date('2026-08-22') },
];

/* ─── Ledger Entries (40 entries matching vouchers) ───────── */

const DEMO_LEDGER = [
  // Opening Balance JV (vch-01)
  { id: 'led-01', tenantId: T, voucherId: 'vch-01', voucherLineId: 'vl-01', accountId: '11102', debit: 500000, credit: 0, entryDate: '2026-08-01', voucherType: 'JV', voucherNumber: 1, narration: 'Bank opening balance' },
  { id: 'led-02', tenantId: T, voucherId: 'vch-01', voucherLineId: 'vl-02', accountId: '31101', debit: 0, credit: 500000, entryDate: '2026-08-01', voucherType: 'JV', voucherNumber: 1, narration: 'Owner equity / capital' },
  // SV #1001 — Al-Noor (vch-02)
  { id: 'led-03', tenantId: T, voucherId: 'vch-02', voucherLineId: 'vl-03', accountId: '11201', debit: 185000, credit: 0, entryDate: '2026-08-02', voucherType: 'SV', voucherNumber: 2, narration: 'Al-Noor Super Store — AR' },
  { id: 'led-04', tenantId: T, voucherId: 'vch-02', voucherLineId: 'vl-04', accountId: '41101', debit: 0, credit: 160000, entryDate: '2026-08-02', voucherType: 'SV', voucherNumber: 2, narration: 'Wholesale sales' },
  { id: 'led-05', tenantId: T, voucherId: 'vch-02', voucherLineId: 'vl-05', accountId: '11301', debit: 0, credit: 160000, entryDate: '2026-08-02', voucherType: 'SV', voucherNumber: 2, narration: 'Inventory reduction' },
  // SV #1002 — City Mart (vch-03)
  { id: 'led-06', tenantId: T, voucherId: 'vch-03', voucherLineId: 'vl-06', accountId: '11202', debit: 92500, credit: 0, entryDate: '2026-08-05', voucherType: 'SV', voucherNumber: 3, narration: 'City Mart — AR' },
  { id: 'led-07', tenantId: T, voucherId: 'vch-03', voucherLineId: 'vl-07', accountId: '41101', debit: 0, credit: 80000, entryDate: '2026-08-05', voucherType: 'SV', voucherNumber: 3, narration: 'Wholesale sales' },
  { id: 'led-08', tenantId: T, voucherId: 'vch-03', voucherLineId: 'vl-08', accountId: '11301', debit: 0, credit: 80000, entryDate: '2026-08-05', voucherType: 'SV', voucherNumber: 3, narration: 'Inventory reduction' },
  // SV #1003 — Faisal (vch-04)
  { id: 'led-09', tenantId: T, voucherId: 'vch-04', voucherLineId: 'vl-09', accountId: '11203', debit: 277500, credit: 0, entryDate: '2026-08-10', voucherType: 'SV', voucherNumber: 4, narration: 'Faisal Traders — AR' },
  { id: 'led-10', tenantId: T, voucherId: 'vch-04', voucherLineId: 'vl-10', accountId: '41101', debit: 0, credit: 240000, entryDate: '2026-08-10', voucherType: 'SV', voucherNumber: 4, narration: 'Wholesale sales' },
  { id: 'led-11', tenantId: T, voucherId: 'vch-04', voucherLineId: 'vl-11', accountId: '11301', debit: 0, credit: 240000, entryDate: '2026-08-10', voucherType: 'SV', voucherNumber: 4, narration: 'Inventory reduction' },
  // SV #1004 — Madina (vch-05)
  { id: 'led-12', tenantId: T, voucherId: 'vch-05', voucherLineId: 'vl-12', accountId: '11204', debit: 138000, credit: 0, entryDate: '2026-08-15', voucherType: 'SV', voucherNumber: 5, narration: 'Madina Cash & Carry — AR' },
  { id: 'led-13', tenantId: T, voucherId: 'vch-05', voucherLineId: 'vl-13', accountId: '41101', debit: 0, credit: 120000, entryDate: '2026-08-15', voucherType: 'SV', voucherNumber: 5, narration: 'Wholesale sales' },
  { id: 'led-14', tenantId: T, voucherId: 'vch-05', voucherLineId: 'vl-14', accountId: '11301', debit: 0, credit: 120000, entryDate: '2026-08-15', voucherType: 'SV', voucherNumber: 5, narration: 'Inventory reduction' },
  // SRV — City Mart return (vch-06)
  { id: 'led-15', tenantId: T, voucherId: 'vch-06', voucherLineId: 'vl-15', accountId: '41104', debit: 16000, credit: 0, entryDate: '2026-08-12', voucherType: 'SRV', voucherNumber: 6, narration: 'Sales returns' },
  { id: 'led-16', tenantId: T, voucherId: 'vch-06', voucherLineId: 'vl-16', accountId: '11202', debit: 0, credit: 18720, entryDate: '2026-08-12', voucherType: 'SRV', voucherNumber: 6, narration: 'City Mart — AR reduction' },
  { id: 'led-17', tenantId: T, voucherId: 'vch-06', voucherLineId: 'vl-17', accountId: '11301', debit: 16000, credit: 0, entryDate: '2026-08-12', voucherType: 'SRV', voucherNumber: 6, narration: 'Inventory restored' },
  // PV #2001 — ABC Foods (vch-07)
  { id: 'led-18', tenantId: T, voucherId: 'vch-07', voucherLineId: 'vl-18', accountId: '51101', debit: 320000, credit: 0, entryDate: '2026-08-03', voucherType: 'PV', voucherNumber: 7, narration: 'Purchase cost' },
  { id: 'led-19', tenantId: T, voucherId: 'vch-07', voucherLineId: 'vl-19', accountId: '21101', debit: 0, credit: 320000, entryDate: '2026-08-03', voucherType: 'PV', voucherNumber: 7, narration: 'ABC Foods Supplier — AP' },
  { id: 'led-20', tenantId: T, voucherId: 'vch-07', voucherLineId: 'vl-20', accountId: '11301', debit: 320000, credit: 0, entryDate: '2026-08-03', voucherType: 'PV', voucherNumber: 7, narration: 'Inventory received' },
  // PV #2002 — Punjab Dist (vch-08)
  { id: 'led-21', tenantId: T, voucherId: 'vch-08', voucherLineId: 'vl-21', accountId: '51101', debit: 180000, credit: 0, entryDate: '2026-08-08', voucherType: 'PV', voucherNumber: 8, narration: 'Purchase cost' },
  { id: 'led-22', tenantId: T, voucherId: 'vch-08', voucherLineId: 'vl-22', accountId: '21102', debit: 0, credit: 180000, entryDate: '2026-08-08', voucherType: 'PV', voucherNumber: 8, narration: 'Punjab Distributors — AP' },
  { id: 'led-23', tenantId: T, voucherId: 'vch-08', voucherLineId: 'vl-23', accountId: '11301', debit: 180000, credit: 0, entryDate: '2026-08-08', voucherType: 'PV', voucherNumber: 8, narration: 'Inventory received' },
  // PRV — ABC Foods return (vch-09)
  { id: 'led-24', tenantId: T, voucherId: 'vch-09', voucherLineId: 'vl-24', accountId: '21101', debit: 74880, credit: 0, entryDate: '2026-08-14', voucherType: 'PRV', voucherNumber: 9, narration: 'ABC Foods Supplier — AP reduction' },
  { id: 'led-25', tenantId: T, voucherId: 'vch-09', voucherLineId: 'vl-25', accountId: '51104', debit: 0, credit: 64000, entryDate: '2026-08-14', voucherType: 'PRV', voucherNumber: 9, narration: 'Purchase returns' },
  { id: 'led-26', tenantId: T, voucherId: 'vch-09', voucherLineId: 'vl-26', accountId: '11301', debit: 0, credit: 64000, entryDate: '2026-08-14', voucherType: 'PRV', voucherNumber: 9, narration: 'Inventory reduced' },
  // CR — Al-Noor payment (vch-10)
  { id: 'led-27', tenantId: T, voucherId: 'vch-10', voucherLineId: 'vl-27', accountId: '11101', debit: 100000, credit: 0, entryDate: '2026-08-18', voucherType: 'CR', voucherNumber: 10, narration: 'Cash received' },
  { id: 'led-28', tenantId: T, voucherId: 'vch-10', voucherLineId: 'vl-28', accountId: '11201', debit: 0, credit: 100000, entryDate: '2026-08-18', voucherType: 'CR', voucherNumber: 10, narration: 'Al-Noor Super Store — AR' },
  // CRV — Faisal bank receipt (vch-11)
  { id: 'led-29', tenantId: T, voucherId: 'vch-11', voucherLineId: 'vl-29', accountId: '11102', debit: 80000, credit: 0, entryDate: '2026-08-20', voucherType: 'CRV', voucherNumber: 11, narration: 'Bank transfer received' },
  { id: 'led-30', tenantId: T, voucherId: 'vch-11', voucherLineId: 'vl-30', accountId: '11203', debit: 0, credit: 80000, entryDate: '2026-08-20', voucherType: 'CRV', voucherNumber: 11, narration: 'Faisal Traders — AR' },
  // CP — Office supplies (vch-12)
  { id: 'led-31', tenantId: T, voucherId: 'vch-12', voucherLineId: 'vl-31', accountId: '61102', debit: 15000, credit: 0, entryDate: '2026-08-07', voucherType: 'CP', voucherNumber: 12, narration: 'Office supplies expense' },
  { id: 'led-32', tenantId: T, voucherId: 'vch-12', voucherLineId: 'vl-32', accountId: '11101', debit: 0, credit: 15000, entryDate: '2026-08-07', voucherType: 'CP', voucherNumber: 12, narration: 'Cash paid' },
  // BPV — Salaries (vch-13)
  { id: 'led-33', tenantId: T, voucherId: 'vch-13', voucherLineId: 'vl-33', accountId: '61103', debit: 180000, credit: 0, entryDate: '2026-08-22', voucherType: 'BPV', voucherNumber: 13, narration: 'Office salaries August' },
  { id: 'led-34', tenantId: T, voucherId: 'vch-13', voucherLineId: 'vl-34', accountId: '11102', debit: 0, credit: 180000, entryDate: '2026-08-22', voucherType: 'BPV', voucherNumber: 13, narration: 'Bank transfer paid' },
  // JV — Rent (vch-14)
  { id: 'led-35', tenantId: T, voucherId: 'vch-14', voucherLineId: 'vl-35', accountId: '61101', debit: 50000, credit: 0, entryDate: '2026-08-01', voucherType: 'JV', voucherNumber: 14, narration: 'August office rent' },
  { id: 'led-36', tenantId: T, voucherId: 'vch-14', voucherLineId: 'vl-36', accountId: '11101', debit: 0, credit: 50000, entryDate: '2026-08-01', voucherType: 'JV', voucherNumber: 14, narration: 'Cash paid for rent' },
  // Draft JV #15 (no ledger entries — not posted)
  // Draft JV #16 (no ledger entries — not posted)
  // PV — Punjab Distributors payment (vch-17)
  { id: 'led-37', tenantId: T, voucherId: 'vch-17', voucherLineId: 'vl-37', accountId: '21102', debit: 110600, credit: 0, entryDate: '2026-08-22', voucherType: 'PV', voucherNumber: 17, narration: 'Punjab Distributors — AP' },
  { id: 'led-38', tenantId: T, voucherId: 'vch-17', voucherLineId: 'vl-38', accountId: '11102', debit: 0, credit: 110600, entryDate: '2026-08-22', voucherType: 'PV', voucherNumber: 17, narration: 'Bank transfer paid' },
  // Additional ledger entries to reach 40
  { id: 'led-39', tenantId: T, voucherId: 'vch-02', voucherLineId: 'vl-39', accountId: '11301', debit: 185000, credit: 0, entryDate: '2026-08-02', voucherType: 'SV', voucherNumber: 2, narration: 'Cost of goods sold — Al-Noor' },
  { id: 'led-40', tenantId: T, voucherId: 'vch-03', voucherLineId: 'vl-40', accountId: '11301', debit: 92500, credit: 0, entryDate: '2026-08-05', voucherType: 'SV', voucherNumber: 3, narration: 'Cost of goods sold — City Mart' },
];

/* ─── Stock Levels (20 products × 2 warehouses = 40) ─────── */

function buildStockLevels(): Array<{
  id: string; tenantId: string; productId: string; warehouseId: string;
  quantityOnHand: number; quantityReserved: number; unitCost: number;
  reorderLevel: number; minimumStock: number; maximumStock: number;
}> {
  const levels: ReturnType<typeof buildStockLevels> = [];
  for (let i = 0; i < DEMO_PRODUCTS.length; i++) {
    const prod = DEMO_PRODUCTS[i];
    const idx = i + 1;
    // WH-01 (Main): product_idx * 37 % 400 + 50
    const qtyMain = (idx * 37) % 400 + 50;
    // WH-02 (Showroom): product_idx * 7 % 40 + 5
    const qtyShowroom = (idx * 7) % 40 + 5;
    levels.push({
      id: `sl-${String(idx).padStart(2, '0')}-wh01`,
      tenantId: T,
      productId: prod.id,
      warehouseId: 'wh-01',
      quantityOnHand: qtyMain,
      quantityReserved: Math.floor(qtyMain * 0.1),
      unitCost: prod.purchaseRate,
      reorderLevel: 20,
      minimumStock: 10,
      maximumStock: 500,
    });
    levels.push({
      id: `sl-${String(idx).padStart(2, '0')}-wh02`,
      tenantId: T,
      productId: prod.id,
      warehouseId: 'wh-02',
      quantityOnHand: qtyShowroom,
      quantityReserved: 0,
      unitCost: prod.purchaseRate,
      reorderLevel: 5,
      minimumStock: 2,
      maximumStock: 50,
    });
  }
  return levels;
}

const DEMO_STOCK_LEVELS = buildStockLevels();

/* ─── Bills (9 records: 4 SV, 2 PV, 1 SRV, 1 PRV, 1 CRV) ─ */

const DEMO_BILLS = [
  // 4 Sale Bills
  { voucher: DEMO_VOUCHERS[1], partyName: 'Al-Noor Super Store', partyId: 'cust-01', total: 160000, lineCount: 3, itemNames: ['Milk 1 Liter', 'Cooking Oil 1L'], itemIds: ['prod-01', 'prod-04'], lines: [] },
  { voucher: DEMO_VOUCHERS[2], partyName: 'City Mart', partyId: 'cust-02', total: 80000, lineCount: 3, itemNames: ['Milk 500ml', 'Butter 200g'], itemIds: ['prod-02', 'prod-03'], lines: [] },
  { voucher: DEMO_VOUCHERS[3], partyName: 'Faisal Traders', partyId: 'cust-03', total: 240000, lineCount: 3, itemNames: ['Tea 950g', 'Ghee 1kg'], itemIds: ['prod-08', 'prod-06'], lines: [] },
  { voucher: DEMO_VOUCHERS[4], partyName: 'Madina Cash & Carry', partyId: 'cust-04', total: 120000, lineCount: 3, itemNames: ['Cooking Oil 5L', 'Rice Basmati 10kg'], itemIds: ['prod-05', 'prod-20'], lines: [] },
  // 2 Purchase Bills
  { voucher: DEMO_VOUCHERS[6], partyName: 'ABC Foods Supplier', partyId: 'sup-01', total: 320000, lineCount: 3, itemNames: ['Milk 1 Liter', 'Cooking Oil 1L'], itemIds: ['prod-01', 'prod-04'], lines: [] },
  { voucher: DEMO_VOUCHERS[7], partyName: 'Punjab Distributors', partyId: 'sup-02', total: 180000, lineCount: 3, itemNames: ['Milk 500ml', 'Butter 200g'], itemIds: ['prod-02', 'prod-03'], lines: [] },
  // 1 Sale Return
  { voucher: DEMO_VOUCHERS[5], partyName: 'City Mart', partyId: 'cust-02', total: 18720, lineCount: 3, itemNames: ['Milk 500ml'], itemIds: ['prod-02'], lines: [] },
  // 1 Purchase Return
  { voucher: DEMO_VOUCHERS[8], partyName: 'ABC Foods Supplier', partyId: 'sup-01', total: 74880, lineCount: 3, itemNames: ['Milk 1 Liter'], itemIds: ['prod-01'], lines: [] },
  // 1 CRV (Bank Receipt)
  { voucher: DEMO_VOUCHERS[10], partyName: 'Faisal Traders', partyId: 'cust-03', total: 80000, lineCount: 2, itemNames: [], itemIds: [], lines: [] },
];

/* ─── Dashboard ───────────────────────────────────────────── */

const DEMO_DASHBOARD = {
  dateRange: { startDate: '2026-08-01', endDate: '2026-08-31' },
  period: 'month',
  sales: { label: 'Sales', amount: 693000, count: 4 },
  purchases: { label: 'Purchases', amount: 500000, count: 3 },
  saleReturns: { label: 'Sale Returns', amount: 18720, count: 1 },
  purchaseReturns: { label: 'Purchase Returns', amount: 74880, count: 1 },
  receivables: { current: 120000, d1_30: 96780, d31_60: 0, d61_90: 0, d91_120: 0, d120plus: 0, grandTotal: 216780 },
  payables: { current: 263920, d1_30: 0, d31_60: 0, d61_90: 0, d91_120: 0, d120plus: 0, grandTotal: 263920 },
  inventory: { totalProducts: 20, totalStockQty: 2032, totalStockValue: 676460 },
  cashPosition: { totalBalance: 501900, accountCount: 2 },
  recentTransactions: [
    { id: 'vch-16', voucherNumber: 16, voucherType: 'JV', date: '2026-08-25', narration: 'Depreciation entry — pending approval', partyName: '', total: 0, status: 'DRAFT' },
    { id: 'vch-15', voucherNumber: 15, voucherType: 'JV', date: '2026-08-24', narration: 'Adjustment entry — pending approval', partyName: '', total: 0, status: 'DRAFT' },
    { id: 'vch-17', voucherNumber: 17, voucherType: 'PV', date: '2026-08-22', narration: 'Bank payment to Punjab Distributors — PO #2002 settled', partyName: 'Punjab Distributors', total: 110600, status: 'POSTED' },
    { id: 'vch-13', voucherNumber: 13, voucherType: 'BPV', date: '2026-08-22', narration: 'Monthly salaries via bank transfer', partyName: '', total: 180000, status: 'POSTED' },
    { id: 'vch-11', voucherNumber: 11, voucherType: 'CRV', date: '2026-08-20', narration: 'Bank receipt from Faisal Traders — partial settlement', partyName: 'Faisal Traders', total: 80000, status: 'POSTED' },
    { id: 'vch-10', voucherNumber: 10, voucherType: 'CR', date: '2026-08-18', narration: 'Cash received from Al-Noor Super Store — partial payment', partyName: 'Al-Noor Super Store', total: 100000, status: 'POSTED' },
    { id: 'vch-05', voucherNumber: 5, voucherType: 'SV', date: '2026-08-15', narration: 'Sale to Madina Cash & Carry — Invoice #1004', partyName: 'Madina Cash & Carry', total: 120000, status: 'POSTED' },
    { id: 'vch-09', voucherNumber: 9, voucherType: 'PRV', date: '2026-08-14', narration: 'Purchase return to ABC Foods Supplier — defective batch', partyName: 'ABC Foods Supplier', total: 74880, status: 'POSTED' },
    { id: 'vch-06', voucherNumber: 6, voucherType: 'SRV', date: '2026-08-12', narration: 'Sale return from City Mart — damaged goods', partyName: 'City Mart', total: 18720, status: 'POSTED' },
    { id: 'vch-04', voucherNumber: 4, voucherType: 'SV', date: '2026-08-10', narration: 'Sale to Faisal Traders — Invoice #1003', partyName: 'Faisal Traders', total: 240000, status: 'POSTED' },
  ],
};

/* ─── Aging Reports ───────────────────────────────────────── */

const DEMO_AGING_CUSTOMER = {
  mode: 'customer',
  asOfDate: '2026-08-31',
  rows: [
    { partyId: 'cust-01', partyName: 'Al-Noor Super Store', accountCode: '11201', accountName: 'Al-Noor Super Store — AR', totalOutstanding: 85000, aging: { current: 85000, d1_30: 0, d31_60: 0, d61_90: 0, d91_120: 0, d120plus: 0 } },
    { partyId: 'cust-02', partyName: 'City Mart', accountCode: '11202', accountName: 'City Mart — AR', totalOutstanding: 73780, aging: { current: 35000, d1_30: 38780, d31_60: 0, d61_90: 0, d91_120: 0, d120plus: 0 } },
    { partyId: 'cust-04', partyName: 'Madina Cash & Carry', accountCode: '11204', accountName: 'Madina Cash & Carry — AR', totalOutstanding: 58000, aging: { current: 0, d1_30: 58000, d31_60: 0, d61_90: 0, d91_120: 0, d120plus: 0 } },
  ],
  totals: { current: 120000, d1_30: 96780, d31_60: 0, d61_90: 0, d91_120: 0, d120plus: 0 },
  grandTotal: 216780,
};

const DEMO_AGING_SUPPLIER = {
  mode: 'supplier',
  asOfDate: '2026-08-31',
  rows: [
    { partyId: 'sup-01', partyName: 'ABC Foods Supplier', accountCode: '21101', accountName: 'ABC Foods Supplier — AP', totalOutstanding: 245120, aging: { current: 245120, d1_30: 0, d31_60: 0, d61_90: 0, d91_120: 0, d120plus: 0 } },
    { partyId: 'sup-02', partyName: 'Punjab Distributors', accountCode: '21102', accountName: 'Punjab Distributors — AP', totalOutstanding: 18800, aging: { current: 18800, d1_30: 0, d31_60: 0, d61_90: 0, d91_120: 0, d120plus: 0 } },
  ],
  totals: { current: 263920, d1_30: 0, d31_60: 0, d61_90: 0, d91_120: 0, d120plus: 0 },
  grandTotal: 263920,
};

/* ─── Reports ─────────────────────────────────────────────── */

const DEMO_TRIAL_BALANCE = {
  startDate: '2026-08-01',
  endDate: '2026-08-31',
  rows: [
    { accountId: coaId('11102'), accountCode: '11102', accountName: 'Bank Account Main', level: 4, isPosting: true, normalBalance: 'DEBIT' as const, accountType: 'ASSET', openingDebit: 500000, openingCredit: 0, periodDebit: 80000, periodCredit: 290600, closingDebit: 289400, closingCredit: 0 },
    { accountId: coaId('11101'), accountCode: '11101', accountName: 'Cash in Hand', level: 4, isPosting: true, normalBalance: 'DEBIT' as const, accountType: 'ASSET', openingDebit: 0, openingCredit: 0, periodDebit: 100000, periodCredit: 65000, closingDebit: 35000, closingCredit: 0 },
    { accountId: coaId('11201'), accountCode: '11201', accountName: 'Al-Noor Super Store — AR', level: 4, isPosting: true, normalBalance: 'DEBIT' as const, accountType: 'ASSET', openingDebit: 0, openingCredit: 0, periodDebit: 185000, periodCredit: 100000, closingDebit: 85000, closingCredit: 0 },
    { accountId: coaId('11202'), accountCode: '11202', accountName: 'City Mart — AR', level: 4, isPosting: true, normalBalance: 'DEBIT' as const, accountType: 'ASSET', openingDebit: 0, openingCredit: 0, periodDebit: 92500, periodCredit: 18720, closingDebit: 73780, closingCredit: 0 },
    { accountId: coaId('11203'), accountCode: '11203', accountName: 'Faisal Traders — AR', level: 4, isPosting: true, normalBalance: 'DEBIT' as const, accountType: 'ASSET', openingDebit: 0, openingCredit: 0, periodDebit: 277500, periodCredit: 80000, closingDebit: 197500, closingCredit: 0 },
    { accountId: coaId('11204'), accountCode: '11204', accountName: 'Madina Cash & Carry — AR', level: 4, isPosting: true, normalBalance: 'DEBIT' as const, accountType: 'ASSET', openingDebit: 0, openingCredit: 0, periodDebit: 138000, periodCredit: 0, closingDebit: 138000, closingCredit: 0 },
    { accountId: coaId('11301'), accountCode: '11301', accountName: 'General Inventory', level: 4, isPosting: true, normalBalance: 'DEBIT' as const, accountType: 'ASSET', openingDebit: 0, openingCredit: 0, periodDebit: 500000, periodCredit: 500000, closingDebit: 0, closingCredit: 0 },
    { accountId: coaId('21101'), accountCode: '21101', accountName: 'ABC Foods Supplier — AP', level: 4, isPosting: true, normalBalance: 'CREDIT' as const, accountType: 'LIABILITY', openingDebit: 0, openingCredit: 0, periodDebit: 74880, periodCredit: 320000, closingDebit: 0, closingCredit: 245120 },
    { accountId: coaId('21102'), accountCode: '21102', accountName: 'Punjab Distributors — AP', level: 4, isPosting: true, normalBalance: 'CREDIT' as const, accountType: 'LIABILITY', openingDebit: 0, openingCredit: 0, periodDebit: 110600, periodCredit: 180000, closingDebit: 0, closingCredit: 69400 },
    { accountId: coaId('31101'), accountCode: '31101', accountName: "Owner's Capital", level: 4, isPosting: true, normalBalance: 'CREDIT' as const, accountType: 'EQUITY', openingDebit: 0, openingCredit: 500000, periodDebit: 0, periodCredit: 0, closingDebit: 0, closingCredit: 500000 },
    { accountId: coaId('41101'), accountCode: '41101', accountName: 'Wholesale Sales', level: 4, isPosting: true, normalBalance: 'CREDIT' as const, accountType: 'REVENUE', openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 600000, closingDebit: 0, closingCredit: 600000 },
    { accountId: coaId('41104'), accountCode: '41104', accountName: 'Sales Return', level: 4, isPosting: true, normalBalance: 'CREDIT' as const, accountType: 'REVENUE', openingDebit: 0, openingCredit: 0, periodDebit: 16000, periodCredit: 0, closingDebit: 16000, closingCredit: 0 },
    { accountId: coaId('51101'), accountCode: '51101', accountName: 'Material Purchases', level: 4, isPosting: true, normalBalance: 'DEBIT' as const, accountType: 'COGS', openingDebit: 0, openingCredit: 0, periodDebit: 500000, periodCredit: 0, closingDebit: 500000, closingCredit: 0 },
    { accountId: coaId('51104'), accountCode: '51104', accountName: 'Purchase Return', level: 4, isPosting: true, normalBalance: 'DEBIT' as const, accountType: 'COGS', openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 64000, closingDebit: 0, closingCredit: 64000 },
    { accountId: coaId('61101'), accountCode: '61101', accountName: 'Rent Expense', level: 4, isPosting: true, normalBalance: 'DEBIT' as const, accountType: 'EXPENSE', openingDebit: 0, openingCredit: 0, periodDebit: 50000, periodCredit: 0, closingDebit: 50000, closingCredit: 0 },
    { accountId: coaId('61102'), accountCode: '61102', accountName: 'Utilities Expense', level: 4, isPosting: true, normalBalance: 'DEBIT' as const, accountType: 'EXPENSE', openingDebit: 0, openingCredit: 0, periodDebit: 15000, periodCredit: 0, closingDebit: 15000, closingCredit: 0 },
    { accountId: coaId('61103'), accountCode: '61103', accountName: 'Office Salaries', level: 4, isPosting: true, normalBalance: 'DEBIT' as const, accountType: 'EXPENSE', openingDebit: 0, openingCredit: 0, periodDebit: 180000, periodCredit: 0, closingDebit: 180000, closingCredit: 0 },
  ],
  totalOpeningDebit: 500000,
  totalOpeningCredit: 500000,
  totalPeriodDebit: 2146980,
  totalPeriodCredit: 2146980,
  totalClosingDebit: 1378680,
  totalClosingCredit: 1378680,
  isBalanced: true,
};

const DEMO_PROFIT_LOSS = {
  startDate: '2026-08-01',
  endDate: '2026-08-31',
  revenueRows: [
    { accountId: coaId('41101'), accountCode: '41101', accountName: 'Wholesale Sales', level: 4, amount: 600000 },
    { accountId: coaId('41104'), accountCode: '41104', accountName: 'Sales Return', level: 4, amount: -16000 },
  ],
  cogsRows: [
    { accountId: coaId('51101'), accountCode: '51101', accountName: 'Material Purchases', level: 4, amount: 500000 },
    { accountId: coaId('51104'), accountCode: '51104', accountName: 'Purchase Return', level: 4, amount: -64000 },
  ],
  expenseRows: [
    { accountId: coaId('61101'), accountCode: '61101', accountName: 'Rent Expense', level: 4, amount: 50000 },
    { accountId: coaId('61102'), accountCode: '61102', accountName: 'Utilities Expense', level: 4, amount: 15000 },
    { accountId: coaId('61103'), accountCode: '61103', accountName: 'Office Salaries', level: 4, amount: 180000 },
  ],
  totalRevenue: 693000,
  totalCOGS: 500000,
  grossProfit: 193000,
  totalExpenses: 245000,
  netProfit: -52000,
};

const DEMO_BALANCE_SHEET = {
  asOfDate: '2026-08-31',
  assetRows: [
    { accountId: coaId('11101'), accountCode: '11101', accountName: 'Cash in Hand', level: 4, amount: 35000 },
    { accountId: coaId('11102'), accountCode: '11102', accountName: 'Bank Account Main', level: 4, amount: 289400 },
    { accountId: coaId('11201'), accountCode: '11201', accountName: 'Al-Noor Super Store — AR', level: 4, amount: 85000 },
    { accountId: coaId('11202'), accountCode: '11202', accountName: 'City Mart — AR', level: 4, amount: 73780 },
    { accountId: coaId('11203'), accountCode: '11203', accountName: 'Faisal Traders — AR', level: 4, amount: 197500 },
    { accountId: coaId('11204'), accountCode: '11204', accountName: 'Madina Cash & Carry — AR', level: 4, amount: 138000 },
    { accountId: coaId('11301'), accountCode: '11301', accountName: 'General Inventory', level: 4, amount: 0 },
  ],
  liabilityRows: [
    { accountId: coaId('21101'), accountCode: '21101', accountName: 'ABC Foods Supplier — AP', level: 4, amount: 245120 },
    { accountId: coaId('21102'), accountCode: '21102', accountName: 'Punjab Distributors — AP', level: 4, amount: 69400 },
  ],
  equityRows: [
    { accountId: coaId('31101'), accountCode: '31101', accountName: "Owner's Capital", level: 4, amount: 500000 },
  ],
  totalAssets: 818680,
  totalLiabilities: 314520,
  totalEquity: 500000,
  isBalanced: true,
};

/* ─── Settings ────────────────────────────────────────────── */

const DEMO_SETTINGS = {
  invoicePrefix: 'INV',
  inventoryValuation: 'AVCO',
  fiscalYearStart: '07-01',
};

/* ─── Route Matching ──────────────────────────────────────── */

function matchPath(pattern: string, path: string): RegExpMatchArray | null {
  const regex = new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$');
  return path.match(regex);
}

function parseQuery(url: string): [string, URLSearchParams] {
  const qIdx = url.indexOf('?');
  if (qIdx === -1) return [url, new URLSearchParams()];
  return [url.slice(0, qIdx), new URLSearchParams(url.slice(qIdx + 1))];
}

/* ─── Main Handler ────────────────────────────────────────── */

export function handleDemoRequest(path: string, method: string, body?: any): any {
  const [cleanPath, query] = parseQuery(path);

  // ─── GET Routes ─────────────────────────────────────────

  if (method === 'GET') {
    // Tenants
    if (cleanPath === '/api/tenants') return DEMO_TENANTS;
    const tenantSlug = matchPath('/api/tenants/:slug', cleanPath);
    if (tenantSlug) {
      return DEMO_TENANTS.find(t => t.slug === tenantSlug.groups!.slug) || null;
    }

    // Dashboard
    if (cleanPath === '/api/dashboard') return DEMO_DASHBOARD;

    // Customers
    if (cleanPath === '/api/customers') return DEMO_CUSTOMERS;

    // Suppliers
    if (cleanPath === '/api/suppliers') return DEMO_SUPPLIERS;

    // Accounts
    if (cleanPath === '/api/accounts') return DEMO_ACCOUNTS;

    // Products
    if (cleanPath === '/api/products') return DEMO_PRODUCTS;

    // Stock Levels
    if (cleanPath === '/api/stock-levels') return DEMO_STOCK_LEVELS;

    // Warehouses
    if (cleanPath === '/api/warehouses') return DEMO_WAREHOUSES;

    // Ledger
    if (cleanPath === '/api/ledger') return DEMO_LEDGER;

    // Bills
    if (cleanPath === '/api/bills') return DEMO_BILLS;

    // Bill detail
    const billDetail = matchPath('/api/bills/:id', cleanPath);
    if (billDetail) {
      return DEMO_BILLS.find(b => b.voucher.id === billDetail.groups!.id) || null;
    }

    // Sales
    if (cleanPath === '/api/sales') return DEMO_BILLS.filter(b => b.voucher.voucherType === 'SV');

    // Purchases
    if (cleanPath === '/api/purchases') return DEMO_BILLS.filter(b => b.voucher.voucherType === 'PV');

    // Sale Returns
    if (cleanPath === '/api/sale-returns') return DEMO_BILLS.filter(b => b.voucher.voucherType === 'SRV');

    // Purchase Returns
    if (cleanPath === '/api/purchase-returns') return DEMO_BILLS.filter(b => b.voucher.voucherType === 'PRV');

    // Aging Report
    if (cleanPath === '/api/aging-report') {
      const mode = query.get('mode') || 'customer';
      return mode === 'supplier' ? DEMO_AGING_SUPPLIER : DEMO_AGING_CUSTOMER;
    }

    // Reports
    if (cleanPath === '/api/reports/trial-balance') return DEMO_TRIAL_BALANCE;
    if (cleanPath === '/api/reports/profit-and-loss') return DEMO_PROFIT_LOSS;
    if (cleanPath === '/api/reports/balance-sheet') return DEMO_BALANCE_SHEET;

    // Vouchers
    if (cleanPath === '/api/vouchers') return DEMO_VOUCHERS;

    // Voucher lines
    const voucherLines = matchPath('/api/vouchers/:id/lines', cleanPath);
    if (voucherLines) {
      return DEMO_LEDGER.filter(l => l.voucherId === voucherLines.groups!.id);
    }

    // Settings
    if (cleanPath === '/api/settings') return DEMO_SETTINGS;

    // Customer AR Balance
    const customerAR = matchPath('/api/customers/:id/ar-balance', cleanPath);
    if (customerAR) {
      const cust = DEMO_CUSTOMERS.find(c => c.id === customerAR.groups!.id);
      if (!cust) return null;
      const custAging = DEMO_AGING_CUSTOMER.rows.find(r => r.partyId === cust.id);
      return { customerId: cust.id, balance: custAging?.totalOutstanding || 0 };
    }

    // Customer/Supplier balances
    if (cleanPath === '/api/customer-balances') {
      return DEMO_AGING_CUSTOMER.rows.map(r => ({ partyId: r.partyId, partyName: r.partyName, balance: r.totalOutstanding }));
    }
    if (cleanPath === '/api/supplier-balances') {
      return DEMO_AGING_SUPPLIER.rows.map(r => ({ partyId: r.partyId, partyName: r.partyName, balance: r.totalOutstanding }));
    }
  }

  // ─── POST / PUT / DELETE Routes → Success ───────────────

  if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
    return { success: true, id: 'demo-1' };
  }

  // ─── Unknown endpoint → null (server not available) ─────

  return null;
}

export default handleDemoRequest;
