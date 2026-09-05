/**
 * Bill display constants and types for UI.
 * Re-exports from domain layer to keep UI import boundary clean.
 *
 * RULE: UI components import bill labels/colors from THIS file,
 * never directly from domain/services/BillsListService.
 */

export { BILL_VOUCHER_TYPES, BILL_TYPE_LABELS, BILL_TYPE_COLORS } from '../../domain/services/BillsListService';
export type { BillRecord } from '../../domain/services/BillsListService';
