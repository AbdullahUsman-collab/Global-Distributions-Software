/**
 * Protected API Routes
 * Domain operations requiring authentication + RBAC authorization.
 *
 * RULE: Server resolves tenantId from authenticated session.
 * RULE: Server independently verifies permissions for each operation.
 * RULE: Client-provided tenantId is NEVER trusted as authority.
 * RULE: Audit metadata (createdBy, tenantId) comes from server session.
 */

import { Router, Request, Response } from 'express';
import { requirePermissionMiddleware } from '../middleware/auth';
import { mutationRateLimiter } from '../middleware/rateLimit';
import { SalesService } from '../../domain/services/SalesService';
import { PurchaseService } from '../../domain/services/PurchaseService';
import { CustomerReceiptService } from '../../domain/services/CustomerReceiptService';
import { CashBookService } from '../../domain/services/CashBookService';
import { SaleReturnService } from '../../domain/services/SaleReturnService';
import { PurchaseReturnService } from '../../domain/services/PurchaseReturnService';
import { BillDetailService } from '../../domain/services/BillDetailService';
import { BillsListService } from '../../domain/services/BillsListService';
import { PartyBalanceService } from '../../domain/services/PartyBalanceService';
import { AgingReportService } from '../../domain/services/AgingReportService';
import { DashboardService } from '../../domain/services/DashboardService';
import { ICOARepository } from '../../domain/repositories/ICOARepository';
import { IVoucherRepository } from '../../domain/repositories/IVoucherRepository';
import { IInventoryRepository } from '../../domain/repositories/IInventoryRepository';
import { ICustomerRepository } from '../../domain/repositories/ICustomerRepository';
import { ISupplierRepository } from '../../domain/repositories/ISupplierRepository';
import { ISettingsRepository } from '../../domain/repositories/ISettingsRepository';
import { FinancialReportService } from '../../domain/services/FinancialReportService';
import { validateSaleBillDTO, validateSaleReturnDTO, validateSaleReturnLines, validatePurchaseBillDTO, validateCustomerReceiptDTO, validateCashBookDTO, validId, validDate, requiredString, positiveNumber, nonEmptyArray, validEnum, combineValidations } from '../lib/validation';

export function createProtectedRoutes(
  salesService: SalesService,
  purchaseService: PurchaseService,
  customerReceiptService: CustomerReceiptService,
  cashBookService: CashBookService,
  saleReturnService: SaleReturnService,
  purchaseReturnService: PurchaseReturnService,
  billDetailService: BillDetailService,
  billsListService: BillsListService,
  partyBalanceService: PartyBalanceService,
  agingReportService: AgingReportService,
  dashboardService: DashboardService,
  coaRepo: ICOARepository,
  voucherRepo: IVoucherRepository,
  inventoryRepo: IInventoryRepository,
  customerRepo: ICustomerRepository,
  supplierRepo: ISupplierRepository,
  settingsRepo: ISettingsRepository,
  financialReportService: FinancialReportService,
): Router {
  const router = Router();

  // All routes require authentication (applied at mount level)

  /**
   * POST /api/sales
   * Create a new sale bill.
   */
  router.post('/sales',
    mutationRateLimiter,
    requirePermissionMiddleware('sales.create'),
    async (req: Request, res: Response) => {
      try {
        const validation = validateSaleBillDTO(req.body);
        if (!validation.valid) {
          res.status(400).json({ error: validation.error });
          return;
        }

        // Server resolves tenantId and createdBy from session
        const tenantId = req.user!.tenantId;
        const createdBy = req.user!.username;
        const role = req.user!.role;

        const voucher = await salesService.createSaleBill(tenantId, req.body, createdBy, role);
        res.status(201).json(voucher);
      } catch (error: any) {
        if (error.message?.startsWith('Unauthorized:')) {
          res.status(403).json({ error: error.message });
          return;
        }
        console.error('Create sale error:', error);
        res.status(500).json({ error: 'Failed to create sale bill' });
      }
    }
  );

  /**
   * POST /api/sales/:id/post
   * Post a sale bill (changes status to POSTED).
   */
  router.post('/sales/:id/post',
    mutationRateLimiter,
    requirePermissionMiddleware('sales.post'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const role = req.user!.role;
        const voucher = await salesService.postSaleBill(tenantId, req.params.id, role);
        res.json(voucher);
      } catch (error: any) {
        if (error.message?.startsWith('Unauthorized:')) {
          res.status(403).json({ error: error.message });
          return;
        }
        console.error('Post sale error:', error);
        res.status(500).json({ error: 'Failed to post sale bill' });
      }
    }
  );

  /**
   * DELETE /api/sales/:id
   * Delete a sale bill (only DRAFT status).
   */
  router.delete('/sales/:id',
    mutationRateLimiter,
    requirePermissionMiddleware('sales.delete'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const role = req.user!.role;
        const deleted = await salesService.deleteSaleBill(tenantId, req.params.id, role);
        res.json({ success: deleted });
      } catch (error: any) {
        if (error.message?.startsWith('Unauthorized:')) {
          res.status(403).json({ error: error.message });
          return;
        }
        if (error.message?.includes('POSTED')) {
          res.status(409).json({ error: error.message });
          return;
        }
        console.error('Delete sale error:', error);
        res.status(500).json({ error: 'Failed to delete sale bill' });
      }
    }
  );

  /**
   * POST /api/purchases
   * Create a new purchase bill.
   */
  router.post('/purchases',
    mutationRateLimiter,
    requirePermissionMiddleware('purchases.create'),
    async (req: Request, res: Response) => {
      try {
        const validation = validatePurchaseBillDTO(req.body);
        if (!validation.valid) {
          res.status(400).json({ error: validation.error });
          return;
        }

        const tenantId = req.user!.tenantId;
        const createdBy = req.user!.username;
        const role = req.user!.role;

        const voucher = await purchaseService.createPurchaseBill(tenantId, req.body, createdBy, role);
        res.status(201).json(voucher);
      } catch (error: any) {
        if (error.message?.startsWith('Unauthorized:')) {
          res.status(403).json({ error: error.message });
          return;
        }
        console.error('Create purchase error:', error);
        res.status(500).json({ error: 'Failed to create purchase bill' });
      }
    }
  );

  /**
   * POST /api/purchases/:id/post
   * Post a purchase bill.
   */
  router.post('/purchases/:id/post',
    mutationRateLimiter,
    requirePermissionMiddleware('purchases.post'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const role = req.user!.role;
        const voucher = await purchaseService.postPurchaseBill(tenantId, req.params.id, role);
        res.json(voucher);
      } catch (error: any) {
        if (error.message?.startsWith('Unauthorized:')) {
          res.status(403).json({ error: error.message });
          return;
        }
        console.error('Post purchase error:', error);
        res.status(500).json({ error: 'Failed to post purchase bill' });
      }
    }
  );

  /**
   * DELETE /api/purchases/:id
   * Delete a purchase bill (only DRAFT status).
   */
  router.delete('/purchases/:id',
    mutationRateLimiter,
    requirePermissionMiddleware('purchases.delete'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const role = req.user!.role;
        const deleted = await purchaseService.deletePurchaseBill(tenantId, req.params.id, role);
        res.json({ success: deleted });
      } catch (error: any) {
        if (error.message?.startsWith('Unauthorized:')) {
          res.status(403).json({ error: error.message });
          return;
        }
        if (error.message?.includes('POSTED')) {
          res.status(409).json({ error: error.message });
          return;
        }
        console.error('Delete purchase error:', error);
        res.status(500).json({ error: 'Failed to delete purchase bill' });
      }
    }
  );

  /**
   * POST /api/customer-receipts
   * Create a customer receipt.
   */
  router.post('/customer-receipts',
    mutationRateLimiter,
    requirePermissionMiddleware('receipts.create'),
    async (req: Request, res: Response) => {
      try {
        const validation = validateCustomerReceiptDTO(req.body);
        if (!validation.valid) {
          res.status(400).json({ error: validation.error });
          return;
        }

        const tenantId = req.user!.tenantId;
        const createdBy = req.user!.username;
        const role = req.user!.role;

        const receipt = await customerReceiptService.createReceipt(tenantId, req.body, createdBy, role);
        res.status(201).json(receipt);
      } catch (error: any) {
        if (error.message?.startsWith('Unauthorized:')) {
          res.status(403).json({ error: error.message });
          return;
        }
        console.error('Create receipt error:', error);
        res.status(500).json({ error: 'Failed to create receipt' });
      }
    }
  );

  /**
   * POST /api/cash-book
   * Create a cash book voucher.
   */
  router.post('/cash-book',
    mutationRateLimiter,
    requirePermissionMiddleware('cash.create'),
    async (req: Request, res: Response) => {
      try {
        const validation = validateCashBookDTO(req.body);
        if (!validation.valid) {
          res.status(400).json({ error: validation.error });
          return;
        }

        const tenantId = req.user!.tenantId;
        const createdBy = req.user!.username;
        const role = req.user!.role;

        const voucher = await cashBookService.createCashReceipt(tenantId, req.body, createdBy, role);
        res.status(201).json(voucher);
      } catch (error: any) {
        if (error.message?.startsWith('Unauthorized:')) {
          res.status(403).json({ error: error.message });
          return;
        }
        console.error('Create cash voucher error:', error);
        res.status(500).json({ error: 'Failed to create cash voucher' });
      }
    }
  );

  /**
   * GET /api/bills
   * List bills for the authenticated user's tenant.
   */
  router.get('/bills',
    requirePermissionMiddleware('bills.view'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const vouchers = await billsListService.getAllBills(tenantId);
        res.json(vouchers);
      } catch (error) {
        console.error('List bills error:', error);
        res.status(500).json({ error: 'Failed to list bills' });
      }
    }
  );

  /**
   * GET /api/bills/:id
   * Get bill detail for the authenticated user's tenant.
   * Server enforces tenant isolation — cannot access another tenant's bill.
   */
  router.get('/bills/:id',
    requirePermissionMiddleware('bills.view'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const detail = await billDetailService.getBillDetail(tenantId, req.params.id);
        if (!detail) {
          res.status(404).json({ error: 'Bill not found' });
          return;
        }
        res.json(detail);
      } catch (error) {
        console.error('Get bill detail error:', error);
        res.status(500).json({ error: 'Failed to get bill detail' });
      }
    }
  );

  // ─── Sale Return Routes ──────────────────────────────────────

  router.get('/sale-returns',
    requirePermissionMiddleware('returns.view'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const vouchers = await voucherRepo.getVouchersByTenantId(tenantId, { voucherType: 'SRV' });
        res.json(vouchers);
      } catch (error) {
        console.error('Get sale returns error:', error);
        res.status(500).json({ error: 'Failed to get sale returns' });
      }
    }
  );

  /**
   * POST /api/sale-returns
   * Create a new sale return.
   */
  router.post('/sale-returns',
    mutationRateLimiter,
    requirePermissionMiddleware('returns.create'),
    async (req: Request, res: Response) => {
      try {
        const validation = validateSaleReturnDTO(req.body);
        if (!validation.valid) {
          res.status(400).json({ error: validation.error });
          return;
        }
        const lineValidation = validateSaleReturnLines(req.body.lines);
        if (!lineValidation.valid) {
          res.status(400).json({ error: lineValidation.error });
          return;
        }
        const tenantId = req.user!.tenantId;
        const createdBy = req.user!.username;
        const role = req.user!.role;
        const voucher = await saleReturnService.createSaleReturn(tenantId, req.body, createdBy, role);
        res.status(201).json(voucher);
      } catch (error: any) {
        if (error.message?.startsWith('Unauthorized:')) {
          res.status(403).json({ error: error.message });
          return;
        }
        console.error('Create sale return error:', error);
        res.status(500).json({ error: 'Failed to create sale return' });
      }
    }
  );

  /**
   * POST /api/sale-returns/:id/post
   * Post a sale return.
   */
  router.post('/sale-returns/:id/post',
    mutationRateLimiter,
    requirePermissionMiddleware('returns.post'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const role = req.user!.role;
        const voucher = await saleReturnService.postSaleReturn(tenantId, req.params.id, role);
        res.json(voucher);
      } catch (error: any) {
        if (error.message?.startsWith('Unauthorized:')) {
          res.status(403).json({ error: error.message });
          return;
        }
        console.error('Post sale return error:', error);
        res.status(500).json({ error: 'Failed to post sale return' });
      }
    }
  );

  /**
   * DELETE /api/sale-returns/:id
   * Delete a sale return (only DRAFT).
   */
  router.delete('/sale-returns/:id',
    mutationRateLimiter,
    requirePermissionMiddleware('returns.delete'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const role = req.user!.role;
        await saleReturnService.deleteSaleReturn(tenantId, req.params.id, role);
        res.json({ success: true });
      } catch (error: any) {
        if (error.message?.startsWith('Unauthorized:')) {
          res.status(403).json({ error: error.message });
          return;
        }
        if (error.message?.includes('POSTED')) {
          res.status(409).json({ error: error.message });
          return;
        }
        console.error('Delete sale return error:', error);
        res.status(500).json({ error: 'Failed to delete sale return' });
      }
    }
  );

  // ─── Party Balance Routes ────────────────────────────────────

  /**
   * GET /api/customer-balances
   * Get outstanding balances for all customers.
   */
  router.get('/customer-balances',
    requirePermissionMiddleware('receipts.view'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const balances = await partyBalanceService.getCustomerBalances(tenantId);
        res.json(balances);
      } catch (error) {
        console.error('Get customer balances error:', error);
        res.status(500).json({ error: 'Failed to get customer balances' });
      }
    }
  );

  /**
   * GET /api/supplier-balances
   * Get outstanding balances for all suppliers.
   */
  router.get('/supplier-balances',
    requirePermissionMiddleware('cash.view'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const balances = await partyBalanceService.getSupplierBalances(tenantId);
        res.json(balances);
      } catch (error) {
        console.error('Get supplier balances error:', error);
        res.status(500).json({ error: 'Failed to get supplier balances' });
      }
    }
  );

  // ─── Aging Report Route ──────────────────────────────────────

  /**
   * GET /api/aging-report
   * Generate aging report for customers or suppliers.
   */
  router.get('/aging-report',
    requirePermissionMiddleware('aging.view'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const mode = (req.query.mode as string) || 'customer';
        const asOfDate = (req.query.asOfDate as string) || new Date().toISOString().split('T')[0];
        const partyId = req.query.partyId as string | undefined;

        const validModes = ['customer', 'supplier'];
        if (!validModes.includes(mode)) {
          res.status(400).json({ error: 'mode must be customer or supplier' });
          return;
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(asOfDate)) {
          res.status(400).json({ error: 'asOfDate must be in YYYY-MM-DD format' });
          return;
        }

        const report = await agingReportService.generateReport(tenantId, mode as any, asOfDate, partyId);
        res.json(report);
      } catch (error) {
        console.error('Generate aging report error:', error);
        res.status(500).json({ error: 'Failed to generate aging report' });
      }
    }
  );

  // ─── Dashboard Route ─────────────────────────────────────────

  /**
   * GET /api/dashboard
   * Get dashboard data for a given period.
   */
  router.get('/dashboard',
    requirePermissionMiddleware('dashboard.view'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const period = (req.query.period as string) || 'month';
        const customStart = req.query.customStart as string | undefined;
        const customEnd = req.query.customEnd as string | undefined;

        const validPeriods = ['today', 'week', 'month', 'quarter', 'year', 'custom'];
        if (!validPeriods.includes(period)) {
          res.status(400).json({ error: `period must be one of: ${validPeriods.join(', ')}` });
          return;
        }

        const data = await dashboardService.getDashboardData(tenantId, period as any, customStart, customEnd);
        res.json(data);
      } catch (error) {
        console.error('Get dashboard error:', error);
        res.status(500).json({ error: 'Failed to get dashboard data' });
      }
    }
  );

  // ─── Ledger Routes ───────────────────────────────────────────

  /**
   * GET /api/ledger
   * Get ledger entries for the tenant.
   */
  router.get('/ledger',
    requirePermissionMiddleware('finance.view'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const accountId = req.query.accountId as string | undefined;
        const startDate = req.query.startDate as string | undefined;
        const endDate = req.query.endDate as string | undefined;
        const voucherType = req.query.voucherType as string | undefined;

        if (voucherType) {
          const validVoucherTypes = ['SALE', 'PURCHASE', 'RECEIPT', 'PAYMENT', 'JOURNAL', 'CONTRA', 'SALE_RETURN', 'PURCHASE_RETURN'];
          if (!validVoucherTypes.includes(voucherType)) {
            res.status(400).json({ error: `voucherType must be one of: ${validVoucherTypes.join(', ')}` });
            return;
          }
        }

        const entries = await voucherRepo.getLedgerEntries(tenantId, {
          accountId,
          startDate,
          endDate,
          voucherType: voucherType as any,
        });
        res.json(entries);
      } catch (error) {
        console.error('Get ledger error:', error);
        res.status(500).json({ error: 'Failed to get ledger entries' });
      }
    }
  );

  /**
   * GET /api/ledger/:accountId
   * Get ledger for a specific account with running balance.
   */
  router.get('/ledger/:accountId',
    requirePermissionMiddleware('finance.view'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const startDate = req.query.startDate as string | undefined;
        const endDate = req.query.endDate as string | undefined;
        const entries = await voucherRepo.getLedgerForAccount(tenantId, req.params.accountId, { startDate, endDate });
        res.json(entries);
      } catch (error) {
        console.error('Get account ledger error:', error);
        res.status(500).json({ error: 'Failed to get account ledger' });
      }
    }
  );

  // ─── COA Route ───────────────────────────────────────────────

  /**
   * GET /api/accounts
   * Get chart of accounts for the tenant.
   */
  router.get('/accounts',
    requirePermissionMiddleware('finance.view'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const accounts = await coaRepo.getAccountsByTenantId(tenantId);
        res.json(accounts);
      } catch (error) {
        console.error('Get accounts error:', error);
        res.status(500).json({ error: 'Failed to get accounts' });
      }
    }
  );

  // ─── Inventory Routes ────────────────────────────────────────

  /**
   * GET /api/products
   * Get products for the tenant.
   */
  router.get('/products',
    requirePermissionMiddleware('inventory.view'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const products = await inventoryRepo.getProducts(tenantId);
        res.json(products);
      } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Failed to get products' });
      }
    }
  );

  /**
   * GET /api/stock-levels
   * Get stock levels for the tenant.
   */
  router.get('/stock-levels',
    requirePermissionMiddleware('inventory.view'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const warehouseId = req.query.warehouseId as string | undefined;

        if (warehouseId && warehouseId.length > 128) {
          res.status(400).json({ error: 'warehouseId is too long' });
          return;
        }

        const levels = await inventoryRepo.getStockLevels(tenantId, warehouseId);
        res.json(levels);
      } catch (error) {
        console.error('Get stock levels error:', error);
        res.status(500).json({ error: 'Failed to get stock levels' });
      }
    }
  );

  /**
   * GET /api/warehouses
   * Get warehouses for the tenant.
   */
  router.get('/warehouses',
    requirePermissionMiddleware('inventory.view'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const warehouses = await inventoryRepo.getWarehouses(tenantId);
        res.json(warehouses);
      } catch (error) {
        console.error('Get warehouses error:', error);
        res.status(500).json({ error: 'Failed to get warehouses' });
      }
    }
  );

  // ─── Customer Routes ────────────────────────────────────────

  /**
   * GET /api/customers
   * List all customers for the authenticated user's tenant.
   */
  router.get('/customers',
    requirePermissionMiddleware('receipts.view'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const customers = await customerRepo.getCustomersByTenantId(tenantId);
        res.json(customers);
      } catch (error) {
        console.error('List customers error:', error);
        res.status(500).json({ error: 'Failed to list customers' });
      }
    }
  );

  /**
   * POST /api/customers
   * Create a new customer.
   */
  router.post('/customers',
    mutationRateLimiter,
    requirePermissionMiddleware('receipts.create'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const dto = req.body;
        if (!dto || typeof dto !== 'object') {
          res.status(400).json({ error: 'Request body is required' });
          return;
        }
        if (!dto.name || typeof dto.name !== 'string' || dto.name.trim() === '') {
          res.status(400).json({ error: 'name is required' });
          return;
        }
        const customer = await customerRepo.createCustomer(tenantId, dto);
        res.status(201).json(customer);
      } catch (error: any) {
        console.error('Create customer error:', error);
        res.status(500).json({ error: 'Failed to create customer' });
      }
    }
  );

  /**
   * PUT /api/customers/:id
   * Update an existing customer.
   */
  router.put('/customers/:id',
    mutationRateLimiter,
    requirePermissionMiddleware('receipts.create'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const id = req.params.id;
        const dto = req.body;
        if (!dto || typeof dto !== 'object') {
          res.status(400).json({ error: 'Request body is required' });
          return;
        }
        const existing = await customerRepo.getCustomerById(tenantId, id);
        if (!existing) {
          res.status(404).json({ error: 'Customer not found' });
          return;
        }
        const updated = await customerRepo.updateCustomer(tenantId, id, dto);
        res.json(updated);
      } catch (error: any) {
        console.error('Update customer error:', error);
        res.status(500).json({ error: 'Failed to update customer' });
      }
    }
  );

  /**
   * DELETE /api/customers/:id
   * Soft-deactivate a customer.
   */
  router.delete('/customers/:id',
    mutationRateLimiter,
    requirePermissionMiddleware('receipts.delete'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const id = req.params.id;
        const existing = await customerRepo.getCustomerById(tenantId, id);
        if (!existing) {
          res.status(404).json({ error: 'Customer not found' });
          return;
        }
        await customerRepo.deactivateCustomer(tenantId, id);
        res.json({ success: true });
      } catch (error: any) {
        console.error('Delete customer error:', error);
        res.status(500).json({ error: 'Failed to delete customer' });
      }
    }
  );

  // ─── Supplier Routes ────────────────────────────────────────

  /**
   * GET /api/suppliers
   * List all suppliers for the authenticated user's tenant.
   */
  router.get('/suppliers',
    requirePermissionMiddleware('cash.view'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const suppliers = await supplierRepo.getSuppliers(tenantId);
        res.json(suppliers);
      } catch (error) {
        console.error('List suppliers error:', error);
        res.status(500).json({ error: 'Failed to list suppliers' });
      }
    }
  );

  /**
   * POST /api/suppliers
   * Create a new supplier.
   */
  router.post('/suppliers',
    mutationRateLimiter,
    requirePermissionMiddleware('cash.create'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const dto = req.body;
        if (!dto || typeof dto !== 'object') {
          res.status(400).json({ error: 'Request body is required' });
          return;
        }
        if (!dto.name || typeof dto.name !== 'string' || dto.name.trim() === '') {
          res.status(400).json({ error: 'name is required' });
          return;
        }
        const supplier = await supplierRepo.create(dto, tenantId);
        res.status(201).json(supplier);
      } catch (error: any) {
        console.error('Create supplier error:', error);
        res.status(500).json({ error: 'Failed to create supplier' });
      }
    }
  );

  /**
   * PUT /api/suppliers/:id
   * Update an existing supplier.
   */
  router.put('/suppliers/:id',
    mutationRateLimiter,
    requirePermissionMiddleware('cash.create'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const id = req.params.id;
        const dto = req.body;
        if (!dto || typeof dto !== 'object') {
          res.status(400).json({ error: 'Request body is required' });
          return;
        }
        const existing = await supplierRepo.getById(id, tenantId);
        if (!existing) {
          res.status(404).json({ error: 'Supplier not found' });
          return;
        }
        const updated = await supplierRepo.update(id, dto, tenantId);
        res.json(updated);
      } catch (error: any) {
        console.error('Update supplier error:', error);
        res.status(500).json({ error: 'Failed to update supplier' });
      }
    }
  );

  /**
   * DELETE /api/suppliers/:id
   * Soft-deactivate a supplier.
   */
  router.delete('/suppliers/:id',
    mutationRateLimiter,
    requirePermissionMiddleware('cash.delete'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const id = req.params.id;
        const existing = await supplierRepo.getById(id, tenantId);
        if (!existing) {
          res.status(404).json({ error: 'Supplier not found' });
          return;
        }
        await supplierRepo.deactivate(id, tenantId);
        res.json({ success: true });
      } catch (error: any) {
        console.error('Delete supplier error:', error);
        res.status(500).json({ error: 'Failed to delete supplier' });
      }
    }
  );

  // ─── Purchase Return Routes ──────────────────────────────────

  router.get('/purchase-returns',
    requirePermissionMiddleware('returns.view'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const vouchers = await voucherRepo.getVouchersByTenantId(tenantId, { voucherType: 'PRV' });
        res.json(vouchers);
      } catch (error) {
        console.error('Get purchase returns error:', error);
        res.status(500).json({ error: 'Failed to get purchase returns' });
      }
    }
  );

  /**
   * POST /api/purchase-returns
   * Create a new purchase return.
   */
  router.post('/purchase-returns',
    mutationRateLimiter,
    requirePermissionMiddleware('returns.create'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const createdBy = req.user!.username;
        const role = req.user!.role;
        const voucher = await purchaseReturnService.createPurchaseReturn(tenantId, req.body, createdBy, role);
        res.status(201).json(voucher);
      } catch (error: any) {
        if (error.message?.startsWith('Unauthorized:')) {
          res.status(403).json({ error: error.message });
          return;
        }
        console.error('Create purchase return error:', error);
        res.status(500).json({ error: 'Failed to create purchase return' });
      }
    }
  );

  /**
   * POST /api/purchase-returns/:id/post
   * Post a purchase return.
   */
  router.post('/purchase-returns/:id/post',
    mutationRateLimiter,
    requirePermissionMiddleware('returns.post'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const role = req.user!.role;
        const voucher = await purchaseReturnService.postPurchaseReturn(tenantId, req.params.id, role);
        res.json(voucher);
      } catch (error: any) {
        if (error.message?.startsWith('Unauthorized:')) {
          res.status(403).json({ error: error.message });
          return;
        }
        console.error('Post purchase return error:', error);
        res.status(500).json({ error: 'Failed to post purchase return' });
      }
    }
  );

  /**
   * DELETE /api/purchase-returns/:id
   * Delete a purchase return (only DRAFT).
   */
  router.delete('/purchase-returns/:id',
    mutationRateLimiter,
    requirePermissionMiddleware('returns.delete'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const role = req.user!.role;
        await purchaseReturnService.deletePurchaseReturn(tenantId, req.params.id, role);
        res.json({ success: true });
      } catch (error: any) {
        if (error.message?.startsWith('Unauthorized:')) {
          res.status(403).json({ error: error.message });
          return;
        }
        if (error.message?.includes('POSTED')) {
          res.status(409).json({ error: error.message });
          return;
        }
        console.error('Delete purchase return error:', error);
        res.status(500).json({ error: 'Failed to delete purchase return' });
      }
    }
  );

  // ─── Customer Receipt Additional Routes ──────────────────────

  /**
   * POST /api/customer-receipts/:id/post
   * Post a customer receipt (changes status to POSTED).
   */
  router.post('/customer-receipts/:id/post',
    mutationRateLimiter,
    requirePermissionMiddleware('receipts.post'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const role = req.user!.role;
        const receipt = await customerReceiptService.postReceipt(tenantId, req.params.id, role);
        res.json(receipt);
      } catch (error: any) {
        if (error.message?.startsWith('Unauthorized:')) {
          res.status(403).json({ error: error.message });
          return;
        }
        console.error('Post receipt error:', error);
        res.status(500).json({ error: 'Failed to post receipt' });
      }
    }
  );

  /**
   * DELETE /api/customer-receipts/:id
   * Delete a customer receipt (only DRAFT).
   */
  router.delete('/customer-receipts/:id',
    mutationRateLimiter,
    requirePermissionMiddleware('receipts.delete'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const role = req.user!.role;
        await customerReceiptService.deleteReceipt(tenantId, req.params.id, role);
        res.json({ success: true });
      } catch (error: any) {
        if (error.message?.startsWith('Unauthorized:')) {
          res.status(403).json({ error: error.message });
          return;
        }
        if (error.message?.includes('POSTED')) {
          res.status(409).json({ error: error.message });
          return;
        }
        console.error('Delete receipt error:', error);
        res.status(500).json({ error: 'Failed to delete receipt' });
      }
    }
  );

  // ─── Cash Book Additional Routes ─────────────────────────────

  /**
   * POST /api/cash-book/:id/post
   * Post a cash book voucher (changes status to POSTED).
   */
  router.post('/cash-book/:id/post',
    mutationRateLimiter,
    requirePermissionMiddleware('cash.post'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const role = req.user!.role;
        const voucher = await cashBookService.postVoucher(tenantId, req.params.id, role);
        res.json(voucher);
      } catch (error: any) {
        if (error.message?.startsWith('Unauthorized:')) {
          res.status(403).json({ error: error.message });
          return;
        }
        console.error('Post cash voucher error:', error);
        res.status(500).json({ error: 'Failed to post cash voucher' });
      }
    }
  );

  /**
   * DELETE /api/cash-book/:id
   * Delete a cash book voucher (only DRAFT).
   */
  router.delete('/cash-book/:id',
    mutationRateLimiter,
    requirePermissionMiddleware('cash.delete'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const role = req.user!.role;
        await cashBookService.deleteVoucher(tenantId, req.params.id, role);
        res.json({ success: true });
      } catch (error: any) {
        if (error.message?.startsWith('Unauthorized:')) {
          res.status(403).json({ error: error.message });
          return;
        }
        if (error.message?.includes('POSTED')) {
          res.status(409).json({ error: error.message });
          return;
        }
        console.error('Delete cash voucher error:', error);
        res.status(500).json({ error: 'Failed to delete cash voucher' });
      }
    }
  );

  // ─── Sales List Route ────────────────────────────────────────

  /**
   * GET /api/sales
   * List sale bills for the authenticated user's tenant.
   */
  router.get('/sales',
    requirePermissionMiddleware('sales.view'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const allBills = await billsListService.getAllBills(tenantId);
        const sales = allBills.filter((b) => b.voucher.voucherType === 'SV');
        res.json(sales);
      } catch (error) {
        console.error('List sales error:', error);
        res.status(500).json({ error: 'Failed to list sales' });
      }
    }
  );

  // ─── Purchases List Route ────────────────────────────────────

  /**
   * GET /api/purchases
   * List purchase bills for the authenticated user's tenant.
   */
  router.get('/purchases',
    requirePermissionMiddleware('purchases.view'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const allBills = await billsListService.getAllBills(tenantId);
        const purchases = allBills.filter((b) => b.voucher.voucherType === 'PV');
        res.json(purchases);
      } catch (error) {
        console.error('List purchases error:', error);
        res.status(500).json({ error: 'Failed to list purchases' });
      }
    }
  );

  // ─── Settings Routes ─────────────────────────────────────────

  /**
   * GET /api/settings
   * Get tenant settings.
   */
  router.get('/settings',
    requirePermissionMiddleware('tenant.manage'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const settings = await settingsRepo.getSettingsByTenantId(tenantId);
        res.json(settings || {});
      } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to get settings' });
      }
    }
  );

  /**
   * PUT /api/settings
   * Update tenant settings.
   */
  router.put('/settings',
    mutationRateLimiter,
    requirePermissionMiddleware('tenant.manage'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const dto = req.body;
        if (!dto || typeof dto !== 'object') {
          res.status(400).json({ error: 'Request body is required' });
          return;
        }
        const settings = await settingsRepo.updateSettings(tenantId, dto);
        res.json(settings);
      } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
      }
    }
  );

  // ─── Financial Report Routes ─────────────────────────────────

  /**
   * GET /api/reports/trial-balance
   * Generate trial balance report.
   */
  router.get('/reports/trial-balance',
    requirePermissionMiddleware('reports.view'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const startDate = (req.query.startDate as string) || '';
        const endDate = (req.query.endDate as string) || '';
        const showZeroBalance = req.query.showZeroBalance === 'true';

        if (!startDate || !endDate) {
          res.status(400).json({ error: 'startDate and endDate are required' });
          return;
        }

        const report = await financialReportService.generateTrialBalance({
          tenantId,
          startDate,
          endDate,
          showZeroBalance,
        });
        res.json(report);
      } catch (error) {
        console.error('Generate trial balance error:', error);
        res.status(500).json({ error: 'Failed to generate trial balance' });
      }
    }
  );

  /**
   * GET /api/reports/profit-and-loss
   * Generate profit and loss report.
   */
  router.get('/reports/profit-and-loss',
    requirePermissionMiddleware('reports.view'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const startDate = (req.query.startDate as string) || '';
        const endDate = (req.query.endDate as string) || '';
        const showZeroBalance = req.query.showZeroBalance === 'true';

        if (!startDate || !endDate) {
          res.status(400).json({ error: 'startDate and endDate are required' });
          return;
        }

        const report = await financialReportService.generateProfitAndLoss({
          tenantId,
          startDate,
          endDate,
          showZeroBalance,
        });
        res.json(report);
      } catch (error) {
        console.error('Generate profit and loss error:', error);
        res.status(500).json({ error: 'Failed to generate profit and loss report' });
      }
    }
  );

  /**
   * GET /api/reports/balance-sheet
   * Generate balance sheet report.
   */
  router.get('/reports/balance-sheet',
    requirePermissionMiddleware('reports.view'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const startDate = (req.query.startDate as string) || '';
        const endDate = (req.query.endDate as string) || '';
        const showZeroBalance = req.query.showZeroBalance === 'true';

        if (!startDate || !endDate) {
          res.status(400).json({ error: 'startDate and endDate are required' });
          return;
        }

        const report = await financialReportService.generateBalanceSheet({
          tenantId,
          startDate,
          endDate,
          showZeroBalance,
        });
        res.json(report);
      } catch (error) {
        console.error('Generate balance sheet error:', error);
        res.status(500).json({ error: 'Failed to generate balance sheet' });
      }
    }
  );

  // ─── COA Additional Routes ───────────────────────────────────

  /**
   * POST /api/accounts
   * Create a new account in the chart of accounts.
   */
  router.post('/accounts',
    mutationRateLimiter,
    requirePermissionMiddleware('finance.create'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const dto = req.body;
        if (!dto || typeof dto !== 'object') {
          res.status(400).json({ error: 'Request body is required' });
          return;
        }
        if (!dto.accountCode || typeof dto.accountCode !== 'string' || dto.accountCode.trim() === '') {
          res.status(400).json({ error: 'accountCode is required' });
          return;
        }
        if (!dto.accountName || typeof dto.accountName !== 'string' || dto.accountName.trim() === '') {
          res.status(400).json({ error: 'accountName is required' });
          return;
        }
        const account = await coaRepo.createAccount(tenantId, dto);
        res.status(201).json(account);
      } catch (error: any) {
        console.error('Create account error:', error);
        res.status(500).json({ error: 'Failed to create account' });
      }
    }
  );

  /**
   * PUT /api/accounts/:id
   * Update an existing account.
   */
  router.put('/accounts/:id',
    mutationRateLimiter,
    requirePermissionMiddleware('finance.create'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const id = req.params.id;
        const dto = req.body;
        if (!dto || typeof dto !== 'object') {
          res.status(400).json({ error: 'Request body is required' });
          return;
        }
        const existing = await coaRepo.getAccountById(tenantId, id);
        if (!existing) {
          res.status(404).json({ error: 'Account not found' });
          return;
        }
        const updated = await coaRepo.updateAccount(tenantId, id, dto);
        res.json(updated);
      } catch (error: any) {
        console.error('Update account error:', error);
        res.status(500).json({ error: 'Failed to update account' });
      }
    }
  );

  /**
   * DELETE /api/accounts/:id
   * Soft-deactivate an account.
   */
  router.delete('/accounts/:id',
    mutationRateLimiter,
    requirePermissionMiddleware('finance.delete'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const id = req.params.id;
        const existing = await coaRepo.getAccountById(tenantId, id);
        if (!existing) {
          res.status(404).json({ error: 'Account not found' });
          return;
        }
        await coaRepo.deactivateAccount(tenantId, id);
        res.json({ success: true });
      } catch (error: any) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Failed to delete account' });
      }
    }
  );

  // ─── Voucher Routes (Finance) ────────────────────────────────

  /**
   * GET /api/vouchers
   * List vouchers with optional filters.
   */
  router.get('/vouchers',
    requirePermissionMiddleware('finance.view'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const filters: { voucherType?: any; status?: any } = {};
        if (req.query.voucherType && typeof req.query.voucherType === 'string') {
          filters.voucherType = req.query.voucherType;
        }
        if (req.query.status && typeof req.query.status === 'string') {
          filters.status = req.query.status;
        }
        const vouchers = await voucherRepo.getVouchersByTenantId(tenantId, filters);
        res.json(vouchers);
      } catch (error) {
        console.error('List vouchers error:', error);
        res.status(500).json({ error: 'Failed to list vouchers' });
      }
    }
  );

  /**
   * POST /api/vouchers
   * Create a new DRAFT voucher.
   */
  router.post('/vouchers',
    mutationRateLimiter,
    requirePermissionMiddleware('finance.create'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const createdBy = req.user!.username;
        const { voucherType, date, narration, lines } = req.body;

        if (!voucherType || !date || !narration || !Array.isArray(lines) || lines.length === 0) {
          res.status(400).json({ error: 'Missing required fields: voucherType, date, narration, lines' });
          return;
        }

        for (const line of lines) {
          if (!line.accountId || typeof line.debit !== 'number' || typeof line.credit !== 'number') {
            res.status(400).json({ error: 'Each line requires accountId, debit, and credit' });
            return;
          }
        }

        const voucher = await voucherRepo.createVoucher(tenantId, { voucherType, date, narration, lines }, createdBy);
        res.status(201).json(voucher);
      } catch (error) {
        console.error('Create voucher error:', error);
        res.status(500).json({ error: 'Failed to create voucher' });
      }
    }
  );

  /**
   * PUT /api/vouchers/:id
   * Update an existing DRAFT voucher.
   */
  router.put('/vouchers/:id',
    mutationRateLimiter,
    requirePermissionMiddleware('finance.create'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const id = req.params.id;
        const existing = await voucherRepo.getVoucherById(tenantId, id);
        if (!existing) {
          res.status(404).json({ error: 'Voucher not found' });
          return;
        }
        if (existing.status === 'POSTED') {
          res.status(409).json({ error: 'Cannot edit a posted voucher' });
          return;
        }
        const voucher = await voucherRepo.updateVoucher(tenantId, id, req.body);
        res.json(voucher);
      } catch (error) {
        console.error('Update voucher error:', error);
        res.status(500).json({ error: 'Failed to update voucher' });
      }
    }
  );

  /**
   * DELETE /api/vouchers/:id
   * Delete a DRAFT voucher.
   */
  router.delete('/vouchers/:id',
    mutationRateLimiter,
    requirePermissionMiddleware('finance.delete'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const id = req.params.id;
        const existing = await voucherRepo.getVoucherById(tenantId, id);
        if (!existing) {
          res.status(404).json({ error: 'Voucher not found' });
          return;
        }
        if (existing.status === 'POSTED') {
          res.status(409).json({ error: 'Cannot delete a posted voucher' });
          return;
        }
        await voucherRepo.deleteVoucher(tenantId, id);
        res.json({ success: true });
      } catch (error) {
        console.error('Delete voucher error:', error);
        res.status(500).json({ error: 'Failed to delete voucher' });
      }
    }
  );

  /**
   * POST /api/vouchers/:id/post
   * Post a DRAFT voucher (creates ledger entries, becomes immutable).
   */
  router.post('/vouchers/:id/post',
    mutationRateLimiter,
    requirePermissionMiddleware('finance.post'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const id = req.params.id;
        const existing = await voucherRepo.getVoucherById(tenantId, id);
        if (!existing) {
          res.status(404).json({ error: 'Voucher not found' });
          return;
        }
        if (existing.status === 'POSTED') {
          res.status(409).json({ error: 'Voucher is already posted' });
          return;
        }
        const voucher = await voucherRepo.postVoucher(tenantId, id);
        res.json(voucher);
      } catch (error: any) {
        if (error.message?.includes('balanced') || error.message?.includes('debit') || error.message?.includes('credit')) {
          res.status(400).json({ error: error.message });
          return;
        }
        console.error('Post voucher error:', error);
        res.status(500).json({ error: 'Failed to post voucher' });
      }
    }
  );

  /**
   * GET /api/vouchers/:id/lines
   * Get line items for a voucher.
   */
  router.get('/vouchers/:id/lines',
    requirePermissionMiddleware('finance.view'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const id = req.params.id;
        const existing = await voucherRepo.getVoucherById(tenantId, id);
        if (!existing) {
          res.status(404).json({ error: 'Voucher not found' });
          return;
        }
        const lines = await voucherRepo.getVoucherLines(tenantId, id);
        res.json(lines);
      } catch (error) {
        console.error('Get voucher lines error:', error);
        res.status(500).json({ error: 'Failed to get voucher lines' });
      }
    }
  );

  // ─── Inventory Mutation Routes ───────────────────────────────

  /**
   * POST /api/products
   * Create a new product.
   */
  router.post('/products',
    mutationRateLimiter,
    requirePermissionMiddleware('inventory.adjust'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const { sku, name, category, unit, pcsPerCarton, saleRate, purchaseRate, retailPrice } = req.body;
        if (!sku || !name || !category || !unit) {
          res.status(400).json({ error: 'Missing required fields: sku, name, category, unit' });
          return;
        }
        if (typeof pcsPerCarton !== 'number' || pcsPerCarton <= 0) {
          res.status(400).json({ error: 'pcsPerCarton must be a positive number' });
          return;
        }
        if (typeof saleRate !== 'number' || typeof purchaseRate !== 'number') {
          res.status(400).json({ error: 'saleRate and purchaseRate must be numbers' });
          return;
        }
        const product = await inventoryRepo.createProduct(tenantId, req.body);
        res.status(201).json(product);
      } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Failed to create product' });
      }
    }
  );

  /**
   * PUT /api/products/:id
   * Update an existing product.
   */
  router.put('/products/:id',
    mutationRateLimiter,
    requirePermissionMiddleware('inventory.adjust'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const id = req.params.id;
        const existing = await inventoryRepo.getProductById(tenantId, id);
        if (!existing) {
          res.status(404).json({ error: 'Product not found' });
          return;
        }
        const product = await inventoryRepo.updateProduct(tenantId, id, req.body);
        res.json(product);
      } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Failed to update product' });
      }
    }
  );

  /**
   * DELETE /api/products/:id
   * Soft-deactivate a product.
   */
  router.delete('/products/:id',
    mutationRateLimiter,
    requirePermissionMiddleware('inventory.adjust'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const id = req.params.id;
        const existing = await inventoryRepo.getProductById(tenantId, id);
        if (!existing) {
          res.status(404).json({ error: 'Product not found' });
          return;
        }
        await inventoryRepo.deactivateProduct(tenantId, id);
        res.json({ success: true });
      } catch (error) {
        console.error('Deactivate product error:', error);
        res.status(500).json({ error: 'Failed to deactivate product' });
      }
    }
  );

  /**
   * GET /api/products/:id/batches
   * Get batches for a product.
   */
  router.get('/products/:id/batches',
    requirePermissionMiddleware('inventory.view'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const id = req.params.id;
        const existing = await inventoryRepo.getProductById(tenantId, id);
        if (!existing) {
          res.status(404).json({ error: 'Product not found' });
          return;
        }
        const batches = await inventoryRepo.getBatches(tenantId, id);
        res.json(batches);
      } catch (error) {
        console.error('Get batches error:', error);
        res.status(500).json({ error: 'Failed to get batches' });
      }
    }
  );

  /**
   * GET /api/products/:id/serials
   * Get serials for a product.
   */
  router.get('/products/:id/serials',
    requirePermissionMiddleware('inventory.view'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const id = req.params.id;
        const existing = await inventoryRepo.getProductById(tenantId, id);
        if (!existing) {
          res.status(404).json({ error: 'Product not found' });
          return;
        }
        const serials = await inventoryRepo.getSerials(tenantId, id);
        res.json(serials);
      } catch (error) {
        console.error('Get serials error:', error);
        res.status(500).json({ error: 'Failed to get serials' });
      }
    }
  );

  /**
   * GET /api/warehouses/:id/locations
   * Get locations for a warehouse.
   */
  router.get('/warehouses/:id/locations',
    requirePermissionMiddleware('inventory.view'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const warehouseId = req.params.id;
        const locations = await inventoryRepo.getWarehouseLocations(tenantId, warehouseId);
        res.json(locations);
      } catch (error) {
        console.error('Get warehouse locations error:', error);
        res.status(500).json({ error: 'Failed to get warehouse locations' });
      }
    }
  );

  /**
   * GET /api/stock-movements
   * List stock movements, optionally filtered by product.
   */
  router.get('/stock-movements',
    requirePermissionMiddleware('inventory.view'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const productId = req.query.productId as string | undefined;
        if (productId && productId.length > 128) {
          res.status(400).json({ error: 'productId is too long' });
          return;
        }
        const movements = await inventoryRepo.getStockMovements(tenantId, productId);
        res.json(movements);
      } catch (error) {
        console.error('Get stock movements error:', error);
        res.status(500).json({ error: 'Failed to get stock movements' });
      }
    }
  );

  /**
   * POST /api/stock-movements
   * Create a new DRAFT stock movement.
   */
  router.post('/stock-movements',
    mutationRateLimiter,
    requirePermissionMiddleware('inventory.adjust'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const createdBy = req.user!.username;
        const { movementType, movementDate, fromWarehouseId, toWarehouseId, productId, quantity, unitCost, totalCost, narration } = req.body;

        if (!movementType || !movementDate || !productId) {
          res.status(400).json({ error: 'Missing required fields: movementType, movementDate, productId' });
          return;
        }
        if (typeof quantity !== 'number' || quantity <= 0) {
          res.status(400).json({ error: 'quantity must be a positive number' });
          return;
        }

        const movement = await inventoryRepo.createStockMovement(tenantId, {
          tenantId,
          movementType,
          movementDate,
          fromWarehouseId: fromWarehouseId || undefined,
          toWarehouseId: toWarehouseId || undefined,
          productId,
          quantity,
          unitCost,
          totalCost,
          narration: narration || undefined,
          status: 'DRAFT',
          createdBy,
        });
        res.status(201).json(movement);
      } catch (error) {
        console.error('Create stock movement error:', error);
        res.status(500).json({ error: 'Failed to create stock movement' });
      }
    }
  );

  /**
   * POST /api/stock-movements/:id/post
   * Post a DRAFT stock movement (updates stock levels).
   */
  router.post('/stock-movements/:id/post',
    mutationRateLimiter,
    requirePermissionMiddleware('inventory.adjust'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const id = req.params.id;
        const existing = await inventoryRepo.getStockMovementById(tenantId, id);
        if (!existing) {
          res.status(404).json({ error: 'Stock movement not found' });
          return;
        }
        if (existing.status !== 'DRAFT') {
          res.status(409).json({ error: `Cannot post a ${existing.status} movement` });
          return;
        }
        const movement = await inventoryRepo.postStockMovement(tenantId, id);
        res.json(movement);
      } catch (error) {
        console.error('Post stock movement error:', error);
        res.status(500).json({ error: 'Failed to post stock movement' });
      }
    }
  );

  /**
   * POST /api/stock-movements/:id/cancel
   * Cancel a DRAFT stock movement.
   */
  router.post('/stock-movements/:id/cancel',
    mutationRateLimiter,
    requirePermissionMiddleware('inventory.adjust'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const id = req.params.id;
        const existing = await inventoryRepo.getStockMovementById(tenantId, id);
        if (!existing) {
          res.status(404).json({ error: 'Stock movement not found' });
          return;
        }
        if (existing.status !== 'DRAFT') {
          res.status(409).json({ error: `Cannot cancel a ${existing.status} movement` });
          return;
        }
        const movement = await inventoryRepo.cancelStockMovement(tenantId, id);
        res.json(movement);
      } catch (error) {
        console.error('Cancel stock movement error:', error);
        res.status(500).json({ error: 'Failed to cancel stock movement' });
      }
    }
  );

  // ─── Customer AR Balance Route ───────────────────────────────

  /**
   * GET /api/customers/:id/ar-balance
   * Get customer's current AR balance from ledger entries.
   */
  router.get('/customers/:id/ar-balance',
    requirePermissionMiddleware('receipts.view'),
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const customerId = req.params.id;
        const balance = await customerReceiptService.getCustomerARBalance(tenantId, customerId);
        res.json({ balance });
      } catch (error: any) {
        if (error.message?.includes('not found')) {
          res.status(404).json({ error: error.message });
          return;
        }
        console.error('Get customer AR balance error:', error);
        res.status(500).json({ error: 'Failed to get customer AR balance' });
      }
    }
  );

  return router;
}
