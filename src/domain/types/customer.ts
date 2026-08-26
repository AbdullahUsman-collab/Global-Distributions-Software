/**
 * Customer Domain Types
 * Defines customer entity for the distributor-side Sales vertical slice.
 *
 * Source of Truth:
 *   - audit/05_CUSTOMER_ACCOUNTING.md (Customer fields, balance, DEBITORS 500)
 *   - audit/MASTER_REVERSE_ENGINEERED_SPEC.md (Customer = Account under DEBITORS)
 *   - audit/10_SALES_ENGINE.md (Party/Cash A/c on sale bill)
 */

/* ─── Entity ───────────────────────────────────────────────── */

/**
 * Customer entity.
 * Source: audit/05_CUSTOMER_ACCOUNTING.md (Accounts table where Main_HeadNo = 500)
 *
 * In legacy, Customer IS an Account under DEBITORS (500).
 * In new ERP, Customer is a lightweight entity linked to an AccountHead
 * (the customer's AR posting account under 11200 Accounts Receivable).
 */
export interface Customer {
  /** Unique identifier (UUID) */
  id: string;
  /** Tenant scoping key */
  tenantId: string;
  /** Reference to the AR posting AccountHead (Level 4 under 11200 RECEIVABLE) */
  accountHeadId: string;
  /** Customer/business name (maps to Ac_Name in legacy) */
  name: string;
  /** Physical address (maps to Address in legacy) */
  address: string;
  /** Owner/contact person name (maps to owner_name in legacy) */
  ownerName: string;
  /** Phone number (maps to phone in legacy) */
  phone: string;
  /** Sales Tax Number (maps to STN in legacy) */
  stn: string;
  /** National Tax Number (maps to NTN in legacy) */
  ntn: string;
  /** Computerized National Identity Card number (maps to CNIC in legacy) */
  cnic: string;
  /** Active status toggle */
  isActive: boolean;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/* ─── DTOs ─────────────────────────────────────────────────── */

/**
 * Payload for creating a new Customer.
 * accountHeadId is provided — the caller creates the AccountHead first
 * or the adapter auto-creates it.
 */
export interface CreateCustomerDTO {
  /** Reference to existing AR posting AccountHead, or null to auto-create */
  accountHeadId?: string;
  name: string;
  address?: string;
  ownerName?: string;
  phone?: string;
  stn?: string;
  ntn?: string;
  cnic?: string;
  isActive?: boolean;
}

/**
 * Payload for updating an existing Customer.
 */
export interface UpdateCustomerDTO {
  name?: string;
  address?: string;
  ownerName?: string;
  phone?: string;
  stn?: string;
  ntn?: string;
  cnic?: string;
  isActive?: boolean;
}
