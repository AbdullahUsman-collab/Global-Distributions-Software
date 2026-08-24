/**
 * Chart of Accounts Repository Interface
 * Persistence boundary for account head data access.
 *
 * RULE: Persistence ONLY — no business logic, no authorization, no calculations.
 * RULE: All queries are scoped by tenantId.
 */

import { AccountHead, CreateAccountHeadDTO, UpdateAccountHeadDTO } from '../types/coa';

/**
 * Repository interface for Chart of Accounts persistence operations.
 */
export interface ICOARepository {
  /**
   * Get all accounts for a tenant.
   * Returns the complete account tree (all levels).
   */
  getAccountsByTenantId(tenantId: string): Promise<AccountHead[]>;

  /**
   * Get a single account by its ID, scoped to tenant.
   */
  getAccountById(tenantId: string, id: string): Promise<AccountHead | null>;

  /**
   * Get a single account by its code, scoped to tenant.
   */
  getAccountByCode(tenantId: string, code: string): Promise<AccountHead | null>;

  /**
   * Create a new account head.
   * The adapter must derive normalBalance, isPosting, isSummary from accountType and level.
   */
  createAccount(tenantId: string, dto: CreateAccountHeadDTO): Promise<AccountHead>;

  /**
   * Update an existing account head.
   */
  updateAccount(tenantId: string, id: string, dto: UpdateAccountHeadDTO): Promise<AccountHead>;

  /**
   * Soft-deactivate an account (set isActive = false).
   */
  deactivateAccount(tenantId: string, id: string): Promise<void>;
}
