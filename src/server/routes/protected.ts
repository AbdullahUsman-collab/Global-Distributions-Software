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
import { validateSaleBillDTO, validatePurchaseBillDTO, validateCustomerReceiptDTO, validateCashBookDTO } from '../lib/validation';

export function createProtectedRoutes(
  salesService: SalesService,
  purchaseService: PurchaseService,
  customerReceiptService: CustomerReceiptService,
  cashBookService: CashBookService,
  saleReturnService: SaleReturnService,
  purchaseReturnService: PurchaseReturnService,
  billDetailService: BillDetailService,
  billsListService: BillsListService,
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
        const vouchers = await billsListService.listBills(tenantId);
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

  return router;
}
