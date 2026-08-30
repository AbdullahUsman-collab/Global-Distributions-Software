/**
 * API Client
 * Centralized HTTP client for all server API calls.
 *
 * RULE: All requests use credentials: 'include' for HTTP-only cookie sessions.
 * RULE: No session tokens stored in localStorage or accessible to JavaScript.
 * RULE: CSRF token included on state-changing requests.
 * RULE: No database access from browser.
 * RULE: Consistent error handling across all API calls.
 */

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

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
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

export async function createCashBookVoucher(dto: any) {
  return apiRequest<any>('/cash-book', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}
