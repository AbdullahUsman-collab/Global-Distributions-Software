/**
 * Cross-Module Data Refresh Event Bus Tests
 * Verifies the event bus for cross-module synchronization.
 *
 * Source of Truth: audit/48_STEP29_CROSS_MODULE_LIVE_SYNCHRONIZATION_AND_WORKFLOW_COMPLETION_REPORT.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { emitDataRefresh, onDataRefresh, DataRefreshEvent } from './dataRefresh';

// Mock window for node environment
const listeners = new Map<string, Set<(e: Event) => void>>();

const mockWindow = {
  addEventListener: vi.fn((event: string, handler: (e: Event) => void) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(handler);
  }),
  removeEventListener: vi.fn((event: string, handler: (e: Event) => void) => {
    listeners.get(event)?.delete(handler);
  }),
  dispatchEvent: vi.fn((event: Event) => {
    const handlers = listeners.get(event.type);
    if (handlers) {
      for (const h of handlers) h(event);
    }
  }),
};

vi.stubGlobal('window', mockWindow);
vi.stubGlobal('CustomEvent', class CustomEvent<T = unknown> extends Event {
  detail: T;
  constructor(type: string, opts: { detail: T }) {
    super(type);
    this.detail = opts.detail;
  }
});

describe('DataRefresh Event Bus', () => {
  beforeEach(() => {
    listeners.clear();
    vi.clearAllMocks();
  });

  it('should emit and receive a sale-posted event', () => {
    const listener = vi.fn();
    const unsub = onDataRefresh(listener);

    emitDataRefresh('sale-posted');

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith('sale-posted');
    unsub();
  });

  it('should receive any-change event for any mutation', () => {
    const listener = vi.fn();
    const unsub = onDataRefresh(listener);

    emitDataRefresh('purchase-posted');
    emitDataRefresh('receipt-posted');
    emitDataRefresh('payment-posted');

    expect(listener).toHaveBeenCalledTimes(3);
    unsub();
  });

  it('should unsubscribe cleanly', () => {
    const listener = vi.fn();
    const unsub = onDataRefresh(listener);

    unsub();
    emitDataRefresh('sale-posted');

    expect(listener).not.toHaveBeenCalled();
  });

  it('should support multiple listeners', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    const unsub1 = onDataRefresh(listener1);
    const unsub2 = onDataRefresh(listener2);

    emitDataRefresh('sale-posted');

    expect(listener1).toHaveBeenCalledOnce();
    expect(listener2).toHaveBeenCalledOnce();
    unsub1();
    unsub2();
  });

  it('should emit all event types', () => {
    const events: DataRefreshEvent[] = [
      'sale-posted', 'sale-deleted',
      'purchase-posted', 'purchase-deleted',
      'sale-return-posted', 'sale-return-deleted',
      'purchase-return-posted', 'purchase-return-deleted',
      'receipt-posted', 'receipt-deleted',
      'payment-posted', 'payment-deleted',
      'voucher-posted', 'voucher-deleted',
      'any-change',
    ];

    for (const event of events) {
      const listener = vi.fn();
      const unsub = onDataRefresh(listener);
      emitDataRefresh(event);
      expect(listener).toHaveBeenCalledWith(event);
      unsub();
    }
  });
});
