/**
 * useRefreshOnEvent — React hook that re-fetches data when a cross-module
 * event fires, without requiring page remount.
 *
 * Usage:
 *   useRefreshOnMount(loadData, ['sale-posted', 'receipt-posted']);
 *
 * This subscribes to the listed events and calls loadData() when any of them fire.
 * Cleanup is automatic via useEffect return.
 */

import { useEffect } from 'react';
import { onDataRefresh, DataRefreshEvent } from './dataRefresh';

export function useRefreshOnMount(
  loadData: () => void,
  events: DataRefreshEvent[],
): void {
  useEffect(() => {
    if (events.length === 0) return;
    const unsubscribe = onDataRefresh((event) => {
      if (events.includes(event) || event === 'any-change') {
        loadData();
      }
    });
    return unsubscribe;
  }, [loadData, events]);
}
