/**
 * Supplier Repository Interface
 * Persistence boundary for supplier records.
 *
 * RULE: Persistence ONLY - no business logic, no authorization, no calculations.
 * RULE: Each tenant sees only its own suppliers.
 * RULE: User model NEVER exposes passwordHash - isolated via IUserCredentialsRepository.
 */

import { Supplier, CreateSupplierDTO, UpdateSupplierDTO } from '../types/supplier';

/**
 * Repository interface for supplier persistence.
 * Mirrors ICustomerRepository structure.
 */
export interface ISupplierRepository {
  /**
   * List all active suppliers for a tenant.
   */
  getSuppliers(tenantId: string): Promise<Supplier[]>;

  /**
   * Get a single supplier by ID.
   */
  getById(id: string, tenantId: string): Promise<Supplier | null>;

  /**
   * Get supplier by its COA account head ID.
   */
  getByAccountHeadId(accountHeadId: string, tenantId: string): Promise<Supplier | null>;

  /**
   * Create a new supplier.
   * Returns the created supplier.
   */
  create(supplier: CreateSupplierDTO, tenantId: string): Promise<Supplier>;

  /**
   * Update an existing supplier.
   * Returns the updated supplier or null if not found.
   */
  update(id: string, supplier: UpdateSupplierDTO, tenantId: string): Promise<Supplier | null>;

  /**
   * Soft-deactivate a supplier (sets isActive = false).
   * Returns true if successful, false if not found.
   */
  deactivate(id: string, tenantId: string): Promise<boolean>;

  /**
   * Search suppliers by name or contact person.
   */
  search(query: string, tenantId: string): Promise<Supplier[]>;
}
