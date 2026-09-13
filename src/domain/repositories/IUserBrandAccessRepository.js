"use strict";
/**
 * User Brand Access Repository Interface
 * Persistence boundary for user ↔ brand authorization.
 *
 * RULE: Each access row is scoped by userId and tenantId.
 * RULE: Duplicate (userId, tenantId) pairs are rejected at the database level.
 * RULE: Deactivation does not delete — access rows are soft-disabled.
 */
Object.defineProperty(exports, "__esModule", { value: true });
