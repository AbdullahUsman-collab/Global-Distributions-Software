/**
 * Mock Customer Adapter
 * DEVELOPMENT ONLY — In-memory mock implementation of ICustomerRepository.
 *
 * Seeds sample customers for each active demo tenant.
 * Creates linked AR posting accounts under 11200 (RECEIVABLE).
 *
 * Source: audit/05_CUSTOMER_ACCOUNTING.md, audit/MASTER_REVERSE_ENGINEERED_SPEC.md
 */

import { Customer, CreateCustomerDTO, UpdateCustomerDTO } from '../../types/customer';
import { ICustomerRepository } from '../../repositories/ICustomerRepository';
import { ICOARepository } from '../../repositories/ICOARepository';
import { CreateAccountHeadDTO } from '../../types/coa';

/* ─── Helpers ──────────────────────────────────────────────── */

let nextId = 9000;

function uid(): string {
  return `cust-${nextId++}`;
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

/** Per-tenant stores */
const customersStore: Map<string, Customer[]> = new Map();

/* ─── Seed Data ────────────────────────────────────────────── */

/**
 * Build seed customers per tenant.
 * Source: audit/05_CUSTOMER_ACCOUNTING.md (Accounts table, Main_HeadNo = 500)
 * Uses fictional distribution-company customer names.
 *
 * accountHeadId will be set during adapter initialization
 * when the COA adapter is available.
 */
function buildSeedCustomers(tenantId: string, accountHeadIds: Map<string, string>): Customer[] {
  const now = new Date('2026-08-01');

  // Account codes for customer AR accounts (Level 4 under 11200)
  const customerAccounts = [
    { code: '11201', name: 'Al-Rehman Traders', address: '123 Main Market, Lahore', ownerName: 'Ahmed Khan', phone: '0321-1234567', stn: 'STN-1001', ntn: 'NTN-2001', cnic: '35201-1234567-1' },
    { code: '11202', name: 'Shaheen Enterprises', address: '456 Mall Road, Karachi', ownerName: 'Ali Sheikh', phone: '0333-7654321', stn: 'STN-1002', ntn: 'NTN-2002', cnic: '42101-7654321-2' },
    { code: '11203', name: 'Bismillah Trading Co', address: '789 Commercial Area, Faisalabad', ownerName: 'Muhammad Tariq', phone: '0300-9876543', stn: 'STN-1003', ntn: 'NTN-2003', cnic: '32101-9876543-3' },
    { code: '11204', name: 'Zainab General Store', address: '321 Ward No 5, Rawalpindi', ownerName: 'Zainab Bibi', phone: '0311-5551234', stn: '', ntn: 'NTN-2004', cnic: '38101-5551234-4' },
    { code: '11205', name: 'Faisal Brothers Wholesale', address: '654 Industrial Estate, Sialkot', ownerName: 'Faisal Ahmed', phone: '0345-6667890', stn: 'STN-1005', ntn: 'NTN-2005', cnic: '33101-6667890-5' },
  ];

  return customerAccounts.map((ca, idx) => {
    const accountHeadId = accountHeadIds.get(ca.code) ?? '';
    return {
      id: uid(),
      tenantId,
      accountHeadId,
      name: ca.name,
      address: ca.address,
      ownerName: ca.ownerName,
      phone: ca.phone,
      stn: ca.stn,
      ntn: ca.ntn,
      cnic: ca.cnic,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  });
}

/* ─── Adapter Implementation ───────────────────────────────── */

/**
 * Mock implementation of ICustomerRepository.
 * DEVELOPMENT ONLY — Do not use in production.
 */
export class MockCustomerAdapter implements ICustomerRepository {
  private coaRepo: ICOARepository;

  constructor(coaRepo: ICOARepository) {
    this.coaRepo = coaRepo;
    this.initializeSeeds();
  }

  /**
   * Initialize seed customers for each tenant.
   * Creates AR posting accounts under 11200 (RECEIVABLE) for each customer.
   */
  private async initializeSeeds(): Promise<void> {
    for (const tid of TENANT_IDS) {
      const accountHeadIds = new Map<string, string>();

      // Get existing accounts to find 11200 (Accounts Receivable) parent
      const accounts = await this.coaRepo.getAccountsByTenantId(tid);
      const parentAccount = accounts.find(a => a.accountCode === '11200');

      if (parentAccount) {
        // Customer account codes and names
        const customerDefs = [
          { code: '11201', name: 'Al-Rehman Traders' },
          { code: '11202', name: 'Shaheen Enterprises' },
          { code: '11203', name: 'Bismillah Trading Co' },
          { code: '11204', name: 'Zainab General Store' },
          { code: '11205', name: 'Faisal Brothers Wholesale' },
        ];

        for (const cd of customerDefs) {
          // Check if account already exists
          const existing = accounts.find(a => a.accountCode === cd.code);
          if (existing) {
            accountHeadIds.set(cd.code, existing.id);
          } else {
            // Create the AR posting account
            const dto: CreateAccountHeadDTO = {
              accountCode: cd.code,
              accountName: cd.name,
              parentId: parentAccount.id,
              level: 4,
              accountType: 'ASSET',
              controlCategory: 'RECEIVABLE',
              legacyMainHeadNo: 500,
              accountEffect: 'Balance Sheet',
            };
            const created = await this.coaRepo.createAccount(tid, dto);
            accountHeadIds.set(cd.code, created.id);
          }
        }
      }

      // Build and store seed customers
      const customers = buildSeedCustomers(tid, accountHeadIds);
      customersStore.set(tid, customers);
    }
  }

  /* ─── Queries ─────────────────────────────────────────────── */

  async getCustomersByTenantId(
    tenantId: string,
    filters?: { isActive?: boolean },
  ): Promise<Customer[]> {
    let result = customersStore.get(tenantId) ?? [];
    if (filters?.isActive !== undefined) {
      result = result.filter(c => c.isActive === filters.isActive);
    }
    return result.map(c => deepClone(c));
  }

  async getCustomerById(tenantId: string, id: string): Promise<Customer | null> {
    const customers = customersStore.get(tenantId) ?? [];
    const found = customers.find(c => c.id === id);
    return found ? deepClone(found) : null;
  }

  async getCustomerByAccountHeadId(tenantId: string, accountHeadId: string): Promise<Customer | null> {
    const customers = customersStore.get(tenantId) ?? [];
    const found = customers.find(c => c.accountHeadId === accountHeadId);
    return found ? deepClone(found) : null;
  }

  /* ─── Mutations ───────────────────────────────────────────── */

  async createCustomer(tenantId: string, dto: CreateCustomerDTO): Promise<Customer> {
    const customers = customersStore.get(tenantId) ?? [];

    let accountHeadId = dto.accountHeadId;

    // Auto-create AR posting account if not provided
    if (!accountHeadId) {
      const accounts = await this.coaRepo.getAccountsByTenantId(tenantId);
      const parentAccount = accounts.find(a => a.accountCode === '11200');

      if (!parentAccount) {
        throw new Error('Accounts Receivable parent account (11200) not found');
      }

      // Generate next customer account code
      const existingCodes = accounts
        .filter(a => a.accountCode.startsWith('112') && a.level === 4)
        .map(a => parseInt(a.accountCode, 10))
        .filter(n => !isNaN(n));
      const nextCode = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 11201;

      const accountDto: CreateAccountHeadDTO = {
        accountCode: String(nextCode),
        accountName: dto.name,
        parentId: parentAccount.id,
        level: 4,
        accountType: 'ASSET',
        controlCategory: 'RECEIVABLE',
        legacyMainHeadNo: 500,
        accountEffect: 'Balance Sheet',
        address: dto.address,
        ownerName: dto.ownerName,
        phone: dto.phone,
        stn: dto.stn,
        ntn: dto.ntn,
        cnic: dto.cnic,
      };
      const createdAccount = await this.coaRepo.createAccount(tenantId, accountDto);
      accountHeadId = createdAccount.id;
    }

    const now = new Date();
    const customer: Customer = {
      id: uid(),
      tenantId,
      accountHeadId,
      name: dto.name,
      address: dto.address ?? '',
      ownerName: dto.ownerName ?? '',
      phone: dto.phone ?? '',
      stn: dto.stn ?? '',
      ntn: dto.ntn ?? '',
      cnic: dto.cnic ?? '',
      isActive: dto.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    customers.push(customer);
    customersStore.set(tenantId, customers);

    return deepClone(customer);
  }

  async updateCustomer(tenantId: string, id: string, dto: UpdateCustomerDTO): Promise<Customer> {
    const customers = customersStore.get(tenantId) ?? [];
    const index = customers.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Customer not found');

    const existing = customers[index];
    const updated: Customer = {
      ...existing,
      name: dto.name ?? existing.name,
      address: dto.address ?? existing.address,
      ownerName: dto.ownerName ?? existing.ownerName,
      phone: dto.phone ?? existing.phone,
      stn: dto.stn ?? existing.stn,
      ntn: dto.ntn ?? existing.ntn,
      cnic: dto.cnic ?? existing.cnic,
      isActive: dto.isActive ?? existing.isActive,
      updatedAt: new Date(),
    };

    customers[index] = updated;
    customersStore.set(tenantId, customers);

    // Also update the linked AccountHead
    if (existing.accountHeadId) {
      try {
        await this.coaRepo.updateAccount(tenantId, existing.accountHeadId, {
          accountName: updated.name,
          address: updated.address,
          ownerName: updated.ownerName,
          phone: updated.phone,
          stn: updated.stn,
          ntn: updated.ntn,
          cnic: updated.cnic,
        });
      } catch {
        // AccountHead update is best-effort — customer record is primary
      }
    }

    return deepClone(updated);
  }

  async deactivateCustomer(tenantId: string, id: string): Promise<void> {
    const customers = customersStore.get(tenantId) ?? [];
    const index = customers.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Customer not found');
    customers[index] = { ...customers[index], isActive: false, updatedAt: new Date() };
    customersStore.set(tenantId, customers);
  }

  async searchCustomers(tenantId: string, prefix: string): Promise<Customer[]> {
    const customers = customersStore.get(tenantId) ?? [];
    const lowerPrefix = prefix.toLowerCase();
    return customers
      .filter(c => c.isActive && c.name.toLowerCase().startsWith(lowerPrefix))
      .map(c => deepClone(c));
  }
}
