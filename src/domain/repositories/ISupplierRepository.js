"use strict";
/**
 * Supplier Repository Interface
 * Persistence boundary for supplier records.
 *
 * RULE: Persistence ONLY - no business logic, no authorization, no calculations.
 * RULE: Each tenant sees only its own suppliers.
 * RULE: User model NEVER exposes passwordHash - isolated via IUserCredentialsRepository.
 */
Object.defineProperty(exports, "__esModule", { value: true });
