/**
 * Customer Repository Interface
 * Defines the contract for customer persistence operations.
 *
 * IMPLEMENTATION NOTE: UI layer MUST depend on this interface only.
 * Concrete adapters (mock or real) are injected at runtime.
 *
 * Source of Truth: audit/05_CUSTOMER_ACCOUNTING.md
 */

import { Customer, CreateCustomerDTO, UpdateCustomerDTO } from '../types/customer';

export interface ICustomerRepository {
  /**
   * Get all customers for a tenant, optionally filtered by active status.
   */
  getCustomersByTenantId(
    tenantId: string,
    filters?: { isActive?: boolean },
  ): Promise<Customer[]>;

  /**
   * Get a single customer by its unique id, scoped to tenant.
   */
  getCustomerById(tenantId: string, id: string): Promise<Customer | null>;

  /**
   * Get a customer by their AR account head id, scoped to tenant.
   */
  getCustomerByAccountHeadId(tenantId: string, accountHeadId: string): Promise<Customer | null>;

  /**
   * Create a new customer.
   * If accountHeadId is not provided, the adapter should auto-create
   * a Level 4 posting AccountHead under 11200 (RECEIVABLE).
   */
  createCustomer(tenantId: string, dto: CreateCustomerDTO): Promise<Customer>;

  /**
   * Update an existing customer.
   */
  updateCustomer(tenantId: string, id: string, dto: UpdateCustomerDTO): Promise<Customer>;

  /**
   * Soft-deactivate a customer (set isActive = false).
   */
  deactivateCustomer(tenantId: string, id: string): Promise<void>;

  /**
   * Search customers by name prefix (for autocomplete).
   * Source: audit/04_ACCOUNTING_ENGINE.md (Searchacname WebMethod)
   */
  searchCustomers(tenantId: string, prefix: string): Promise<Customer[]>;
}
