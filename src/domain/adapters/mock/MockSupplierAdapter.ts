/**
 * Mock Supplier Adapter
 * DEVELOPMENT ONLY — In-memory mock implementation of ISupplierRepository.
 * Creates AP posting accounts under 21100 (PAYABLE) for each supplier.
 *
 * Mirrors MockCustomerAdapter pattern for proper COA integration.
 */

import { ISupplierRepository } from '../../repositories/ISupplierRepository';
import { Supplier, CreateSupplierDTO, UpdateSupplierDTO } from '../../types/supplier';
import { ICOARepository } from '../../repositories/ICOARepository';
import { CreateAccountHeadDTO } from '../../types/coa';

/* ─── Helpers ──────────────────────────────────────────────── */

let nextId = 7000;

function uid(): string {
  return `supp-${nextId++}`;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/* ─── Tenant Seed Map ──────────────────────────────────────── */

const TENANT_IDS = [
  'tenant-demo-wholesale-001',
  'tenant-demo-distribution-002',
  'tenant-apex-trading-003',
];

const suppliersStore: Map<string, Supplier[]> = new Map();

/* ─── Adapter Implementation ───────────────────────────────── */

export class MockSupplierAdapter implements ISupplierRepository {
  private coaRepo: ICOARepository;

  constructor(coaRepo: ICOARepository) {
    this.coaRepo = coaRepo;
    this.initializeSeeds();
  }

  private async initializeSeeds(): Promise<void> {
    for (const tid of TENANT_IDS) {
      const accountHeadIds = new Map<string, string>();

      const accounts = await this.coaRepo.getAccountsByTenantId(tid);
      const parentAccount = accounts.find(a => a.accountCode === '21100');

      if (parentAccount) {
        const supplierDefs = [
          { code: '21101', name: 'Global Trading Co.' },
          { code: '21102', name: 'Eastern Imports Ltd.' },
          { code: '21103', name: 'Premier Wholesale Suppliers' },
          { code: '21104', name: 'National Distributors' },
          { code: '21105', name: 'Legacy Suppliers Corp.' },
        ];

        for (const sd of supplierDefs) {
          const existing = accounts.find(a => a.accountCode === sd.code);
          if (existing) {
            accountHeadIds.set(sd.code, existing.id);
          } else {
            const dto: CreateAccountHeadDTO = {
              accountCode: sd.code,
              accountName: sd.name,
              parentId: parentAccount.id,
              level: 4,
              accountType: 'LIABILITY',
              controlCategory: 'PAYABLE',
              legacyMainHeadNo: 8000,
              accountEffect: 'Balance Sheet',
            };
            const created = await this.coaRepo.createAccount(tid, dto);
            accountHeadIds.set(sd.code, created.id);
          }
        }
      }

      const seedSuppliers: Array<{
        code: string; name: string; contactPerson: string;
        phone: string; email: string; address: string; city: string;
        stn: string; paymentTerms: string; creditLimit: number; isActive: boolean;
        createdAt: string;
      }> = [
        { code: '21101', name: 'Global Trading Co.', contactPerson: 'Ahmad Khan', phone: '+92-21-34567890', email: 'ahmad@globaltrading.com', address: '456 Commerce Avenue', city: 'Karachi', stn: 'TRN-555001', paymentTerms: 'Net 30', creditLimit: 500000, isActive: true, createdAt: '2025-01-15' },
        { code: '21102', name: 'Eastern Imports Ltd.', contactPerson: 'Sara Malik', phone: '+92-21-35678901', email: 'sara@easternimports.com', address: '789 Import Street', city: 'Lahore', stn: 'TRN-555002', paymentTerms: 'Net 45', creditLimit: 750000, isActive: true, createdAt: '2025-02-10' },
        { code: '21103', name: 'Premier Wholesale Suppliers', contactPerson: 'Usman Ali', phone: '+92-21-36789012', email: 'usman@premierwholesale.com', address: '321 Market Road', city: 'Faisalabad', stn: 'TRN-555003', paymentTerms: 'Net 30', creditLimit: 1000000, isActive: true, createdAt: '2025-03-05' },
        { code: '21104', name: 'National Distributors', contactPerson: 'Fatima Noor', phone: '+92-21-37890123', email: 'fatima@nationaldistributors.com', address: '654 Industrial Area', city: 'Multan', stn: 'TRN-555004', paymentTerms: 'Net 60', creditLimit: 300000, isActive: true, createdAt: '2025-04-20' },
        { code: '21105', name: 'Legacy Suppliers Corp.', contactPerson: 'Omar Siddiqui', phone: '+92-21-38901234', email: 'omar@legacysuppliers.com', address: '987 Old Quarter', city: 'Peshawar', stn: 'TRN-555005', paymentTerms: 'Net 30', creditLimit: 200000, isActive: false, createdAt: '2024-06-01' },
      ];

      const suppliers: Supplier[] = seedSuppliers.map((sd) => {
        const accountHeadId = accountHeadIds.get(sd.code) ?? '';
        const now = new Date(sd.createdAt);
        return {
          id: uid(),
          tenantId: tid,
          name: sd.name,
          contactPerson: sd.contactPerson,
          phone: sd.phone,
          email: sd.email,
          address: sd.address,
          city: sd.city,
          accountHeadId,
          taxRegistrationNumber: sd.stn,
          paymentTerms: sd.paymentTerms,
          creditLimit: sd.creditLimit,
          isActive: sd.isActive,
          createdAt: now,
          updatedAt: now,
        };
      });

      suppliersStore.set(tid, suppliers);
    }
  }

  async getSuppliers(tenantId: string): Promise<Supplier[]> {
    const suppliers = suppliersStore.get(tenantId) || [];
    return suppliers.filter(s => s.isActive).map(s => deepClone(s));
  }

  async getById(id: string, tenantId: string): Promise<Supplier | null> {
    const suppliers = suppliersStore.get(tenantId) || [];
    const found = suppliers.find(s => s.id === id);
    return found ? deepClone(found) : null;
  }

  async getByAccountHeadId(accountHeadId: string, tenantId: string): Promise<Supplier | null> {
    const suppliers = suppliersStore.get(tenantId) || [];
    const found = suppliers.find(s => s.accountHeadId === accountHeadId);
    return found ? deepClone(found) : null;
  }

  async create(supplierDTO: CreateSupplierDTO, tenantId: string): Promise<Supplier> {
    const suppliers = suppliersStore.get(tenantId) || [];
    const id = uid();
    const now = new Date();

    const accountHeadId = `acc-ap-${supplierDTO.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${id.slice(-4)}`;

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
    suppliersStore.set(tenantId, suppliers);

    await this.coaRepo.createAccount(
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

    return deepClone(newSupplier);
  }

  async update(id: string, supplierDTO: UpdateSupplierDTO, tenantId: string): Promise<Supplier | null> {
    const suppliers = suppliersStore.get(tenantId) || [];
    const index = suppliers.findIndex(s => s.id === id);
    if (index === -1) return null;

    const updatedSupplier: Supplier = {
      ...suppliers[index],
      ...supplierDTO,
      updatedAt: new Date(),
    };

    suppliers[index] = updatedSupplier;
    suppliersStore.set(tenantId, suppliers);
    return deepClone(updatedSupplier);
  }

  async deactivate(id: string, tenantId: string): Promise<boolean> {
    const suppliers = suppliersStore.get(tenantId) || [];
    const index = suppliers.findIndex(s => s.id === id);
    if (index === -1) return false;

    suppliers[index] = { ...suppliers[index], isActive: false, updatedAt: new Date() };
    suppliersStore.set(tenantId, suppliers);
    return true;
  }

  async search(query: string, tenantId: string): Promise<Supplier[]> {
    const suppliers = suppliersStore.get(tenantId) || [];
    const lowerQuery = query.toLowerCase();
    return suppliers.filter(s =>
      s.isActive && (
        s.name.toLowerCase().includes(lowerQuery) ||
        (s.contactPerson?.toLowerCase().includes(lowerQuery) ?? false) ||
        (s.city?.toLowerCase().includes(lowerQuery) ?? false)
      )
    ).map(s => deepClone(s));
  }
}
