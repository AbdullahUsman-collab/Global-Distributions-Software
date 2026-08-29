/**
 * Cross-Module Data Refresh Event Bus
 *
 * Lightweight pub/sub for notifying pages when data changes in other modules.
 * Uses CustomEvent on the window object — no external dependencies.
 *
 * Usage:
 *   emitDataRefresh('sale-posted')     — after posting a sale
 *   useRefreshOnMount(loadData)        — re-fetch on relevant events
 */

/* ─── Event Types ──────────────────────────────────────────── */

export type DataRefreshEvent =
  | 'sale-posted'
  | 'sale-deleted'
  | 'purchase-posted'
  | 'purchase-deleted'
  | 'sale-return-posted'
  | 'sale-return-deleted'
  | 'purchase-return-posted'
  | 'purchase-return-deleted'
  | 'receipt-posted'
  | 'receipt-deleted'
  | 'payment-posted'
  | 'payment-deleted'
  | 'voucher-posted'
  | 'voucher-deleted'
  | 'any-change';

const EVENT_NAME = 'erp-data-refresh';

/* ─── Emit ─────────────────────────────────────────────────── */

export function emitDataRefresh(event: DataRefreshEvent): void {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: event }));
}

/* ─── Subscribe ────────────────────────────────────────────── */

export function onDataRefresh(
  listener: (event: DataRefreshEvent) => void,
): () => void {
  const handler = (e: Event) => {
    const ce = e as CustomEvent<DataRefreshEvent>;
    listener(ce.detail);
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
