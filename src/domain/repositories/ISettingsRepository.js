"use strict";
/**
 * Settings Repository Interface
 * Persistence boundary for tenant-specific settings.
 *
 * RULE: Persistence ONLY - no business logic, no authorization, no calculations.
 * RULE: Each tenant has its own isolated settings.
 */
Object.defineProperty(exports, "__esModule", { value: true });
