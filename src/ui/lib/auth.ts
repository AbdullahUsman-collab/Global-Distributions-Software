/**
 * UI-side RBAC utilities.
 * Re-exports permission checks and types from the domain layer.
 *
 * RULE: UI components import auth utilities from THIS file,
 * never directly from domain/services/AuthorizationService.
 */

export { hasPermission } from '../../domain/services/AuthorizationService';
export type { Permission } from '../../domain/types/rbac';
export { Permissions } from '../../domain/types/rbac';
export type { SystemRoleName } from '../../domain/types/rbac';
