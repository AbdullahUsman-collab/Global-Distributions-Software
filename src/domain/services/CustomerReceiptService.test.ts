import { describe, it, expect, beforeEach } from 'vitest';
import { CustomerReceiptService } from './CustomerReceiptService';
import {
  TENANT_ID,
  createMockCOARepo,
  createMockVoucherRepo,
  createMockCustomerRepo,
  resetCounters,
} from '../test-helpers';

describe('CustomerReceiptService', () => {
  let service: CustomerReceiptService;

  beforeEach(() => {
    resetCounters();
    service = new CustomerReceiptService(
      createMockCOARepo(),
      createMockVoucherRepo(),
      createMockCustomerRepo(),
    );
  });

  describe('createReceipt', () => {
    it('creates a DRAFT CR voucher', async () => {
      const dto = {
        customerId: 'cust-1',
        cashAccountId: 'acc-11101',
        amount: 5000,
        date: '2025-06-15',
        narration: 'Cash receipt from customer',
      };

      const voucher = await service.createReceipt(TENANT_ID, dto, 'admin');

      expect(voucher.voucherType).toBe('CR');
      expect(voucher.status).toBe('DRAFT');
      expect(voucher.narration).toBe('Cash receipt from customer');
    });

    it('throws when customer not found', async () => {
      const dto = {
        customerId: 'nonexistent',
        cashAccountId: 'acc-11101',
        amount: 5000,
        date: '2025-06-15',
        narration: 'Test',
      };

      await expect(service.createReceipt(TENANT_ID, dto, 'admin')).rejects.toThrow('Customer not found');
    });

    it('throws when customer is inactive', async () => {
      const inactiveCustomerRepo = createMockCustomerRepo([
        { id: 'cust-1', tenantId: TENANT_ID, accountHeadId: 'acc-11201',
          name: 'Inactive Customer', address: '', ownerName: '', phone: '',
          stn: '', ntn: '', cnic: '', isActive: false,
          createdAt: new Date(), updatedAt: new Date() },
      ]);
      const svc = new CustomerReceiptService(
        createMockCOARepo(),
        createMockVoucherRepo(),
        inactiveCustomerRepo,
      );

      const dto = {
        customerId: 'cust-1',
        cashAccountId: 'acc-11101',
        amount: 5000,
        date: '2025-06-15',
        narration: 'Test',
      };

      await expect(svc.createReceipt(TENANT_ID, dto, 'admin')).rejects.toThrow('Customer is inactive');
    });

    it('throws when amount is zero', async () => {
      const dto = {
        customerId: 'cust-1',
        cashAccountId: 'acc-11101',
        amount: 0,
        date: '2025-06-15',
        narration: 'Test',
      };

      await expect(service.createReceipt(TENANT_ID, dto, 'admin')).rejects.toThrow('amount must be greater than zero');
    });

    it('throws when amount is negative', async () => {
      const dto = {
        customerId: 'cust-1',
        cashAccountId: 'acc-11101',
        amount: -100,
        date: '2025-06-15',
        narration: 'Test',
      };

      await expect(service.createReceipt(TENANT_ID, dto, 'admin')).rejects.toThrow('amount must be greater than zero');
    });

    it('throws when narration is empty', async () => {
      const dto = {
        customerId: 'cust-1',
        cashAccountId: 'acc-11101',
        amount: 5000,
        date: '2025-06-15',
        narration: '   ',
      };

      await expect(service.createReceipt(TENANT_ID, dto, 'admin')).rejects.toThrow('Narration is required');
    });

    it('throws when cash account not found', async () => {
      const dto = {
        customerId: 'cust-1',
        cashAccountId: 'nonexistent',
        amount: 5000,
        date: '2025-06-15',
        narration: 'Test',
      };

      await expect(service.createReceipt(TENANT_ID, dto, 'admin')).rejects.toThrow('Cash/Bank account not found');
    });

    it('throws when cash account is not a cash/bank account', async () => {
      const dto = {
        customerId: 'cust-1',
        cashAccountId: 'acc-41101', // Sales Revenue account
        amount: 5000,
        date: '2025-06-15',
        narration: 'Test',
      };

      await expect(service.createReceipt(TENANT_ID, dto, 'admin')).rejects.toThrow('not a valid Cash or Bank account');
    });
  });

  describe('postReceipt', () => {
    it('posts a DRAFT receipt to POSTED status', async () => {
      const dto = {
        customerId: 'cust-1',
        cashAccountId: 'acc-11101',
        amount: 5000,
        date: '2025-06-15',
        narration: 'Cash receipt',
      };

      const created = await service.createReceipt(TENANT_ID, dto, 'admin');
      const posted = await service.postReceipt(TENANT_ID, created.id);

      expect(posted.status).toBe('POSTED');
    });
  });

  describe('getReceipts', () => {
    it('returns only CR vouchers', async () => {
      const dto = {
        customerId: 'cust-1',
        cashAccountId: 'acc-11101',
        amount: 5000,
        date: '2025-06-15',
        narration: 'Cash receipt',
      };

      await service.createReceipt(TENANT_ID, dto, 'admin');
      const receipts = await service.getReceipts(TENANT_ID);

      expect(receipts).toHaveLength(1);
      expect(receipts[0].voucherType).toBe('CR');
    });
  });

  describe('getCustomerARBalance', () => {
    it('returns 0 for customer with no ledger entries', async () => {
      const balance = await service.getCustomerARBalance(TENANT_ID, 'cust-1');
      expect(balance).toBe(0);
    });
  });

  describe('deleteReceipt', () => {
    it('deletes a DRAFT receipt', async () => {
      const dto = {
        customerId: 'cust-1',
        cashAccountId: 'acc-11101',
        amount: 5000,
        date: '2025-06-15',
        narration: 'Cash receipt',
      };

      const created = await service.createReceipt(TENANT_ID, dto, 'admin');
      await service.deleteReceipt(TENANT_ID, created.id);

      const receipts = await service.getReceipts(TENANT_ID);
      expect(receipts).toHaveLength(0);
    });
  });
});
