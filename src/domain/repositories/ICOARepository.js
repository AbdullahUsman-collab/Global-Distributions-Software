"use strict";
/**
 * Chart of Accounts Repository Interface
 * Persistence boundary for account head data access.
 *
 * RULE: Persistence ONLY — no business logic, no authorization, no calculations.
 * RULE: All queries are scoped by tenantId.
 */
Object.defineProperty(exports, "__esModule", { value: true });
