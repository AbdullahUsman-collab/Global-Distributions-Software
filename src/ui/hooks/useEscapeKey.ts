/**
 * useEscapeKey (Step 92)
 *
 * Shared keyboard handler for modal dialogs: invokes `onEscape` when the
 * user presses Escape. Existing modal behavior (backdrop click, buttons,
 * forms) is unchanged — this only adds the keyboard-dismiss affordance the
 * ERP's dialogs were missing.
 */

import { useEffect } from 'react';

export function useEscapeKey(onEscape: () => void): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onEscape]);
}
