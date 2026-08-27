/**
 * Supplier Entity
 * Mirrors Customer for the purchase/supplier vertical slice.
 * All fields optional except tenantId (required for all operations).
 * accountHeadId links to the COA account under 21100 Accounts Payable.
 */

export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  accountHeadId: string;
  taxRegistrationNumber?: string;
  paymentTerms?: string;
  creditLimit?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSupplierDTO {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  taxRegistrationNumber?: string;
  paymentTerms?: string;
  creditLimit?: number;
}

export interface UpdateSupplierDTO {
  name?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  taxRegistrationNumber?: string;
  paymentTerms?: string;
  creditLimit?: number;
  isActive?: boolean;
}
