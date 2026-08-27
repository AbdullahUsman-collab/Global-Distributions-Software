/**
 * Mock Supplier Adapter
 * In-memory adapter for supplier records, mirroring MockCustomerAdapter.
 * Creates AP accounts under 21100 Accounts Payable for each supplier.
 *
 * DEVELOPMENT ONLY - Do not use in production.
 */

import { ISupplierRepository } from '../../repositories/ISupplierRepository';
import { Supplier, CreateSupplierDTO, UpdateSupplierDTO } from '../../types/supplier';
import { ICOARepository } from '../../repositories/ICOARepository';
import { CreateAccountHeadDTO } from '../../types/coa';

const SEED_SUPPLIERS: Supplier[] = [
  {
    id: 'supplier-001',
    tenantId: 'tenant-demo-wholesale-001',
    name: 'Global Trading Co.',
    contactPerson: 'Ahmad Khan',
    phone: '+92-21-34567890',
    email: 'ahmad@globaltrading.com',
    address: '456 Commerce Avenue',
    city: 'Karachi',
    accountHeadId: 'acc-ap-global-trading',
    taxRegistrationNumber: 'TRN-555001',
    paymentTerms: 'Net 30',
    creditLimit: 500000,
    isActive: true,
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
  },
  {
    id: 'supplier-002',
    tenantId: 'tenant-demo-wholesale-001',
    name: 'Eastern Imports Ltd.',
    contactPerson: 'Sara Malik',
    phone: '+92-21-35678901',
    email: 'sara@easternimports.com',
    address: '789 Import Street',
    city: 'Lahore',
    accountHeadId: 'acc-ap-eastern-imports',
    taxRegistrationNumber: 'TRN-555002',
    paymentTerms: 'Net 45',
    creditLimit: 750000,
    isActive: true,
    createdAt: new Date('2025-02-10'),
    updatedAt: new Date('2025-02-10'),
  },
  {
    id: 'supplier-003',
    tenantId: 'tenant-demo-wholesale-001',
    name: 'Premier Wholesale Suppliers',
    contactPerson: 'Usman Ali',
    phone: '+92-21-36789012',
    email: 'usman@premierwholesale.com',
    address: '321 Market Road',
    city: 'Faisalabad',
    accountHeadId: 'acc-ap-premier-wholesale',
    taxRegistrationNumber: 'TRN-555003',
    paymentTerms: 'Net 30',
    creditLimit: 1000000,
    isActive: true,
    createdAt: new Date('2025-03-05'),
    updatedAt: new Date('2025-03-05'),
  },
  {
    id: 'supplier-004',
    tenantId: 'tenant-demo-wholesale-001',
    name: 'National Distributors',
    contactPerson: 'Fatima Noor',
    phone: '+92-21-37890123',
    email: 'fatima@nationaldistributors.com',
    address: '654 Industrial Area',
    city: 'Multan',
    accountHeadId: 'acc-ap-national-dist',
    taxRegistrationNumber: 'TRN-555004',
    paymentTerms: 'Net 60',
    creditLimit: 300000,
    isActive: true,
    createdAt: new Date('2025-04-20'),
    updatedAt: new Date('2025-04-20'),
  },
  {
    id: 'supplier-005',
    tenantId: 'tenant-demo-wholesale-001',
    name: 'Legacy Suppliers Corp.',
    contactPerson: 'Omar Siddiqui',
    phone: '+92-21-38901234',
    email: 'omar@legacysuppliers.com',
    address: '987 Old Quarter',
    city: 'Peshawar',
    accountHeadId: 'acc-ap-legacy-suppliers',
    taxRegistrationNumber: 'TRN-555005',
    paymentTerms: 'Net 30',
    creditLimit: 200000,
    isActive: false,
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2025-01-01'),
  },
];

export class MockSupplierAdapter implements ISupplierRepository {
  private suppliers: Map<string, Supplier[]> = new Map();
  private idCounter: number = 6;

  constructor(private coaRepository: ICOARepository) {
    this.seedData();
  }

  private seedData(): void {
    const tenantIds = ['tenant-demo-wholesale-001', 'tenant-demo-distribution-002', 'tenant-apex-trading-003'];

    for (const tenantId of tenantIds) {
      const tenantSuppliers = SEED_SUPPLIERS
        .filter(s => s.tenantId === 'tenant-demo-wholesale-001')
        .map(s => ({
          ...s,
          id: `${s.id}-${tenantId.slice(-3)}`,
          tenantId,
          accountHeadId: `${s.accountHeadId}-${tenantId.slice(-3)}`,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
        }));

      this.suppliers.set(tenantId, tenantSuppliers);
    }
  }

  async getSuppliers(tenantId: string): Promise<Supplier[]> {
    const suppliers = this.suppliers.get(tenantId) || [];
    return suppliers.filter(s => s.isActive);
  }

  async getById(id: string, tenantId: string): Promise<Supplier | null> {
    const suppliers = this.suppliers.get(tenantId) || [];
    return suppliers.find(s => s.id === id) || null;
  }

  async getByAccountHeadId(accountHeadId: string, tenantId: string): Promise<Supplier | null> {
    const suppliers = this.suppliers.get(tenantId) || [];
    return suppliers.find(s => s.accountHeadId === accountHeadId) || null;
  }

  async create(supplierDTO: CreateSupplierDTO, tenantId: string): Promise<Supplier> {
    const suppliers = this.suppliers.get(tenantId) || [];
    const id = `supplier-${String(this.idCounter++).padStart(3, '0')}`;
    const now = new Date();

    const accountHeadId = `acc-ap-${supplierDTO.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${id.slice(-3)}`;

    const newSupplier: Supplier = {
      id,
      tenantId,
      name: supplierDTO.name,
      contactPerson: supplierDTO.contactPerson,
      phone: supplierDTO.phone,
      email: supplierDTO.email,
      address: supplierDTO.address,
      city: supplierDTO.city,
      accountHeadId,
      taxRegistrationNumber: supplierDTO.taxRegistrationNumber,
      paymentTerms: supplierDTO.paymentTerms,
      creditLimit: supplierDTO.creditLimit,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    suppliers.push(newSupplier);
    this.suppliers.set(tenantId, suppliers);

    await this.coaRepository.createAccount(
      tenantId,
      {
        accountCode: accountHeadId,
        accountName: supplierDTO.name,
        parentId: '21100',
        level: 4,
        accountType: 'LIABILITY',
        legacyMainHeadNo: 8000,
        controlCategory: 'PAYABLE',
      }
    );

    return newSupplier;
  }

  async update(id: string, supplierDTO: UpdateSupplierDTO, tenantId: string): Promise<Supplier | null> {
    const suppliers = this.suppliers.get(tenantId) || [];
    const index = suppliers.findIndex(s => s.id === id);

    if (index === -1) {
      return null;
    }

    const updatedSupplier: Supplier = {
      ...suppliers[index],
      ...supplierDTO,
      updatedAt: new Date(),
    };

    suppliers[index] = updatedSupplier;
    this.suppliers.set(tenantId, suppliers);

    return updatedSupplier;
  }

  async deactivate(id: string, tenantId: string): Promise<boolean> {
    const suppliers = this.suppliers.get(tenantId) || [];
    const index = suppliers.findIndex(s => s.id === id);

    if (index === -1) {
      return false;
    }

    suppliers[index] = {
      ...suppliers[index],
      isActive: false,
      updatedAt: new Date(),
    };

    this.suppliers.set(tenantId, suppliers);

    return true;
  }

  async search(query: string, tenantId: string): Promise<Supplier[]> {
    const suppliers = this.suppliers.get(tenantId) || [];
    const lowerQuery = query.toLowerCase();

    return suppliers.filter(s =>
      s.isActive && (
        s.name.toLowerCase().includes(lowerQuery) ||
        (s.contactPerson?.toLowerCase().includes(lowerQuery) ?? false) ||
        (s.city?.toLowerCase().includes(lowerQuery) ?? false)
      )
    );
  }
}
