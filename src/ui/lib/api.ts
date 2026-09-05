/**
 * API Client
 * Centralized HTTP client for all server API calls.
 *
 * RULE: All requests use credentials: 'include' for HTTP-only cookie sessions.
 * RULE: No session tokens stored in localStorage or accessible to JavaScript.
 * RULE: CSRF token included on state-changing requests.
 * RULE: No database access from browser.
 * RULE: Consistent error handling across all API calls.
 *
 * DEMO MODE: When running on Vercel (static hosting with no Express server),
 * all API calls are intercepted and served from client-side deterministic
 * mock data. This allows the full demo to work without a backend.
 */

import { handleDemoRequest } from './demoData';

const API_BASE = '/api';

// ─── CSRF Token Management ────────────────────────────────────

let csrfToken: string | null = null;

/**
 * Generate a random CSRF token for this session.
 * The server accepts any non-empty string (dev mode).
 * Production should use session-stored tokens.
 */
function getCsrfToken(): string {
  if (!csrfToken) {
    csrfToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return csrfToken;
}

/**
 * Reset CSRF token (e.g., after logout).
 */
export function resetCsrfToken(): void {
  csrfToken = null;
}

// ─── Error Types ──────────────────────────────────────────────

export interface ApiError {
  status: number;
  message: string;
}

// ─── Base Request Function ────────────────────────────────────

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const method = options.method || 'GET';
  const isStateChanging = method !== 'GET' && method !== 'HEAD';

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (isStateChanging) {
    headers['X-CSRF-Token'] = getCsrfToken();
  }

  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!res.ok) {
      // Try demo data fallback for GET failures (e.g. 404 on Vercel)
      if (!isStateChanging) {
        let body: any = undefined;
        if (options.body && typeof options.body === 'string') {
          try { body = JSON.parse(options.body); } catch { /* ignore */ }
        }
        const demoResult = handleDemoRequest(`${API_BASE}${path}`, method, body);
        if (demoResult !== null && demoResult !== undefined) {
          return demoResult as T;
        }
      }
      let message = `Request failed (${res.status})`;
      try {
        const data = await res.json();
        message = data.error || message;
      } catch {
        // Ignore parse errors
      }
      throw { status: res.status, message } as ApiError;
    }

    // Handle 204 No Content
    if (res.status === 204) {
      return undefined as T;
    }

    return res.json();
  } catch (err) {
    // Network error / server unavailable → fall back to demo data
    if (err instanceof TypeError && err.message.includes('fetch')) {
      let body: any = undefined;
      if (options.body && typeof options.body === 'string') {
        try { body = JSON.parse(options.body); } catch { /* ignore */ }
      }
      const demoResult = handleDemoRequest(`${API_BASE}${path}`, method, body);
      if (demoResult !== null && demoResult !== undefined) {
        return demoResult as T;
      }
    }
    // Re-throw if demo fallback didn't handle it
    throw err;
  }
}

// ─── Sales API ────────────────────────────────────────────────

export interface SaleBillDTO {
  customerId: string;
  date: string;
  warehouseId: string;
  narration?: string;
  lines: {
    productId: string;
    cartons: number;
    packs: number;
    rate: number;
    tradeDiscountPercent: number;
    gstPercent: number;
    furtherTaxPercent: number;
    fedPercent: number;
    advanceTaxPercent: number;
    description?: string;
  }[];
}

export async function createSaleBill(dto: SaleBillDTO) {
  return apiRequest<any>('/sales', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function postSaleBill(id: string) {
  return apiRequest<any>(`/sales/${id}/post`, { method: 'POST' });
}

export async function deleteSaleBill(id: string) {
  return apiRequest<any>(`/sales/${id}`, { method: 'DELETE' });
}

// ─── Sale Returns API ─────────────────────────────────────────

export async function createSaleReturn(dto: any) {
  return apiRequest<any>('/sale-returns', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function postSaleReturn(id: string) {
  return apiRequest<any>(`/sale-returns/${id}/post`, { method: 'POST' });
}

export async function deleteSaleReturn(id: string) {
  return apiRequest<any>(`/sale-returns/${id}`, { method: 'DELETE' });
}

// ─── Bills API ────────────────────────────────────────────────

export async function getBills() {
  return apiRequest<any[]>('/bills');
}

export async function getBillDetail(id: string) {
  return apiRequest<any>(`/bills/${id}`);
}

// ─── Customer Balances API ────────────────────────────────────

export async function getCustomerBalances() {
  return apiRequest<any[]>('/customer-balances');
}

export async function getSupplierBalances() {
  return apiRequest<any[]>('/supplier-balances');
}

// ─── Aging Report API ─────────────────────────────────────────

export async function getAgingReport(
  mode: 'customer' | 'supplier',
  asOfDate: string,
  partyId?: string,
) {
  const params = new URLSearchParams({ mode, asOfDate });
  if (partyId) params.set('partyId', partyId);
  return apiRequest<any>(`/aging-report?${params.toString()}`);
}

// ─── Dashboard API ────────────────────────────────────────────

export async function getDashboard(
  period: string = 'month',
  customStart?: string,
  customEnd?: string,
) {
  const params = new URLSearchParams({ period });
  if (customStart) params.set('customStart', customStart);
  if (customEnd) params.set('customEnd', customEnd);
  return apiRequest<any>(`/dashboard?${params.toString()}`);
}

// ─── Ledger API ───────────────────────────────────────────────

export async function getLedger(filters?: {
  accountId?: string;
  startDate?: string;
  endDate?: string;
  voucherType?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.accountId) params.set('accountId', filters.accountId);
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);
  if (filters?.voucherType) params.set('voucherType', filters.voucherType);
  const qs = params.toString();
  return apiRequest<any[]>(`/ledger${qs ? '?' + qs : ''}`);
}

export async function getAccountLedger(
  accountId: string,
  startDate?: string,
  endDate?: string,
) {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const qs = params.toString();
  return apiRequest<any[]>(`/ledger/${accountId}${qs ? '?' + qs : ''}`);
}

// ─── COA API ──────────────────────────────────────────────────

export async function getAccounts() {
  return apiRequest<any[]>('/accounts');
}

// ─── Inventory API ────────────────────────────────────────────

export async function getProducts() {
  return apiRequest<any[]>('/products');
}

export async function getStockLevels(warehouseId?: string) {
  const params = warehouseId ? `?warehouseId=${warehouseId}` : '';
  return apiRequest<any[]>(`/stock-levels${params}`);
}

export async function getWarehouses() {
  return apiRequest<any[]>('/warehouses');
}

// ─── Purchases API ────────────────────────────────────────────

export async function createPurchaseBill(dto: any) {
  return apiRequest<any>('/purchases', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function postPurchaseBill(id: string) {
  return apiRequest<any>(`/purchases/${id}/post`, { method: 'POST' });
}

export async function deletePurchaseBill(id: string) {
  return apiRequest<any>(`/purchases/${id}`, { method: 'DELETE' });
}

// ─── Customer Receipts API ────────────────────────────────────

export async function createCustomerReceipt(dto: any) {
  return apiRequest<any>('/customer-receipts', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

// ─── Cash Book API ────────────────────────────────────────────

export async function getCashBookAccounts() {
  return apiRequest<any[]>('/cash-book/accounts');
}

export async function getCashBookSummary(accountId: string, startDate: string, endDate: string) {
  const params = new URLSearchParams({ accountId, startDate, endDate });
  return apiRequest<any>(`/cash-book?${params.toString()}`);
}

export async function createCashBookVoucher(dto: any) {
  return apiRequest<any>('/cash-book', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

// ─── Purchase Returns API ─────────────────────────────────────

export async function createPurchaseReturn(dto: any) {
  return apiRequest<any>('/purchase-returns', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function postPurchaseReturn(id: string) {
  return apiRequest<any>(`/purchase-returns/${id}/post`, { method: 'POST' });
}

export async function deletePurchaseReturn(id: string) {
  return apiRequest<any>(`/purchase-returns/${id}`, { method: 'DELETE' });
}

// ─── Customer Receipts Extended API ───────────────────────────

export async function postCustomerReceipt(id: string) {
  return apiRequest<any>(`/customer-receipts/${id}/post`, { method: 'POST' });
}

export async function deleteCustomerReceipt(id: string) {
  return apiRequest<any>(`/customer-receipts/${id}`, { method: 'DELETE' });
}

// ─── Cash Book Extended API ───────────────────────────────────

export async function postCashBookVoucher(id: string) {
  return apiRequest<any>(`/cash-book/${id}/post`, { method: 'POST' });
}

export async function deleteCashBookVoucher(id: string) {
  return apiRequest<any>(`/cash-book/${id}`, { method: 'DELETE' });
}

// ─── Customers API ────────────────────────────────────────────

export async function getCustomers() {
  return apiRequest<any[]>('/customers');
}

export async function createCustomer(dto: any) {
  return apiRequest<any>('/customers', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function updateCustomer(id: string, dto: any) {
  return apiRequest<any>(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
}

export async function deleteCustomer(id: string) {
  return apiRequest<any>(`/customers/${id}`, { method: 'DELETE' });
}

// ─── Suppliers API ────────────────────────────────────────────

export async function getSuppliers() {
  return apiRequest<any[]>('/suppliers');
}

export async function createSupplier(dto: any) {
  return apiRequest<any>('/suppliers', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function updateSupplier(id: string, dto: any) {
  return apiRequest<any>(`/suppliers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
}

export async function deleteSupplier(id: string) {
  return apiRequest<any>(`/suppliers/${id}`, { method: 'DELETE' });
}

// ─── Sales/Purchases List API ─────────────────────────────────

export async function getSales() {
  return apiRequest<any[]>('/sales');
}

export async function getPurchases() {
  return apiRequest<any[]>('/purchases');
}

export async function getSaleReturns() {
  return apiRequest<any[]>('/sale-returns');
}

export async function getPurchaseReturns() {
  return apiRequest<any[]>('/purchase-returns');
}

// ─── COA CRUD API ─────────────────────────────────────────────

export async function createAccount(dto: any) {
  return apiRequest<any>('/accounts', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function updateAccount(id: string, dto: any) {
  return apiRequest<any>(`/accounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
}

export async function deleteAccount(id: string) {
  return apiRequest<any>(`/accounts/${id}`, { method: 'DELETE' });
}

// ─── Settings API ─────────────────────────────────────────────

export async function getSettings() {
  return apiRequest<any>('/settings');
}

export async function updateSettings(dto: any) {
  return apiRequest<any>('/settings', {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
}

// ─── Financial Reports API ────────────────────────────────────

export async function getTrialBalance(filters?: { startDate?: string; endDate?: string }) {
  const params = new URLSearchParams();
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);
  const qs = params.toString();
  return apiRequest<any>(`/reports/trial-balance${qs ? '?' + qs : ''}`);
}

export async function getProfitAndLoss(filters?: { startDate?: string; endDate?: string }) {
  const params = new URLSearchParams();
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);
  const qs = params.toString();
  return apiRequest<any>(`/reports/profit-and-loss${qs ? '?' + qs : ''}`);
}

export async function getBalanceSheet(filters?: { asOfDate?: string }) {
  const params = new URLSearchParams();
  if (filters?.asOfDate) params.set('asOfDate', filters.asOfDate);
  const qs = params.toString();
  return apiRequest<any>(`/reports/balance-sheet${qs ? '?' + qs : ''}`);
}

// ─── Voucher API (Finance) ───────────────────────────────────

export async function getVouchers(filters?: { voucherType?: string; status?: string }) {
  const params = new URLSearchParams();
  if (filters?.voucherType) params.set('voucherType', filters.voucherType);
  if (filters?.status) params.set('status', filters.status);
  const qs = params.toString();
  return apiRequest<any[]>(`/vouchers${qs ? '?' + qs : ''}`);
}

export async function createVoucher(dto: any) {
  return apiRequest<any>('/vouchers', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function updateVoucher(id: string, dto: any) {
  return apiRequest<any>(`/vouchers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
}

export async function deleteVoucher(id: string) {
  return apiRequest<any>(`/vouchers/${id}`, { method: 'DELETE' });
}

export async function postVoucher(id: string) {
  return apiRequest<any>(`/vouchers/${id}/post`, { method: 'POST' });
}

export async function getVoucherLines(voucherId: string) {
  return apiRequest<any[]>(`/vouchers/${voucherId}/lines`);
}

// ─── Inventory Mutation API ──────────────────────────────────

export async function createProduct(dto: any) {
  return apiRequest<any>('/products', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function updateProduct(id: string, dto: any) {
  return apiRequest<any>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
}

export async function deleteProduct(id: string) {
  return apiRequest<any>(`/products/${id}`, { method: 'DELETE' });
}

export async function getProductBatches(productId: string) {
  return apiRequest<any[]>(`/products/${productId}/batches`);
}

export async function getProductSerials(productId: string) {
  return apiRequest<any[]>(`/products/${productId}/serials`);
}

export async function getWarehouseLocations(warehouseId: string) {
  return apiRequest<any[]>(`/warehouses/${warehouseId}/locations`);
}

export async function getStockMovements(productId?: string) {
  const params = productId ? `?productId=${productId}` : '';
  return apiRequest<any[]>(`/stock-movements${params}`);
}

export async function createStockMovement(dto: any) {
  return apiRequest<any>('/stock-movements', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function postStockMovement(id: string) {
  return apiRequest<any>(`/stock-movements/${id}/post`, { method: 'POST' });
}

export async function cancelStockMovement(id: string) {
  return apiRequest<any>(`/stock-movements/${id}/cancel`, { method: 'POST' });
}

// ─── Customer AR Balance API ─────────────────────────────────

export async function getCustomerARBalance(customerId: string) {
  return apiRequest<any>(`/customers/${customerId}/ar-balance`);
}
