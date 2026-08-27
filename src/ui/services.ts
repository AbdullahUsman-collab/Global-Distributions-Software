/**
 * Service Container / Dependency Injection Setup
 * Wires up domain adapters to UI layer through interface abstractions.
 * 
 * RULE: UI components MUST depend on interfaces (ITenantRepository, IAuthService),
 * NOT on concrete mock classes directly.
 */

import { ITenantRepository } from '../domain/repositories/ITenantRepository';
import { IAuthService } from '../domain/services/IAuthService';
import { ISettingsRepository } from '../domain/repositories/ISettingsRepository';
import { ICOARepository } from '../domain/repositories/ICOARepository';
import { IVoucherRepository } from '../domain/repositories/IVoucherRepository';
import { IInventoryRepository } from '../domain/repositories/IInventoryRepository';
import { ICustomerRepository } from '../domain/repositories/ICustomerRepository';
import { ISupplierRepository } from '../domain/repositories/ISupplierRepository';
import { MockTenantAdapter } from '../domain/adapters/mock/MockTenantAdapter';
import { MockUserAdapter } from '../domain/adapters/mock/MockUserAdapter';
import { MockUserCredentialsAdapter } from '../domain/adapters/mock/MockUserCredentialsAdapter';
import { MockSessionAdapter } from '../domain/adapters/mock/MockSessionAdapter';
import { MockAuthService } from '../domain/adapters/mock/MockAuthService';
import { MockSettingsAdapter } from '../domain/adapters/mock/MockSettingsAdapter';
import { MockCOAAdapter } from '../domain/adapters/mock/MockCOAAdapter';
import { MockVoucherAdapter } from '../domain/adapters/mock/MockVoucherAdapter';
import { MockInventoryAdapter } from '../domain/adapters/mock/MockInventoryAdapter';
import { MockCustomerAdapter } from '../domain/adapters/mock/MockCustomerAdapter';
import { MockSupplierAdapter } from '../domain/adapters/mock/MockSupplierAdapter';
import { FinancialReportService } from '../domain/services/FinancialReportService';
import { SalesService } from '../domain/services/SalesService';
import { PurchaseService } from '../domain/services/PurchaseService';
import { CustomerReceiptService } from '../domain/services/CustomerReceiptService';

/**
 * Service container for dependency injection.
 * Exposes services through their interface abstractions.
 */
class ServiceContainer {
  private static instance: ServiceContainer;
  
  private _tenantRepository: ITenantRepository;
  private _authService: IAuthService;
  private _settingsRepository: ISettingsRepository;
  private _coaRepository: ICOARepository;
  private _voucherRepository: IVoucherRepository;
  private _inventoryRepository: IInventoryRepository;
  private _customerRepository: ICustomerRepository;
  private _supplierRepository: ISupplierRepository;
  private _financialReportService: FinancialReportService;
  private _salesService: SalesService;
  private _purchaseService: PurchaseService;
  private _customerReceiptService: CustomerReceiptService;

  private constructor() {
    // Initialize mock adapters
    const tenantAdapter = new MockTenantAdapter();
    const userAdapter = new MockUserAdapter();
    const credentialsAdapter = new MockUserCredentialsAdapter();
    const sessionAdapter = new MockSessionAdapter();

    // Expose through interfaces only
    this._tenantRepository = tenantAdapter;
    this._authService = new MockAuthService(
      tenantAdapter,
      userAdapter,
      credentialsAdapter,
      sessionAdapter
    );
    this._settingsRepository = new MockSettingsAdapter();
    this._coaRepository = new MockCOAAdapter();
    this._voucherRepository = new MockVoucherAdapter();
    this._inventoryRepository = new MockInventoryAdapter();
    this._customerRepository = new MockCustomerAdapter(this._coaRepository);
    this._supplierRepository = new MockSupplierAdapter(this._coaRepository);
    this._financialReportService = new FinancialReportService(
      this._coaRepository,
      this._voucherRepository,
    );
    this._salesService = new SalesService(
      this._coaRepository,
      this._voucherRepository,
      this._inventoryRepository,
      this._customerRepository,
    );
    this._purchaseService = new PurchaseService(
      this._coaRepository,
      this._voucherRepository,
      this._inventoryRepository,
      this._supplierRepository,
    );
    this._customerReceiptService = new CustomerReceiptService(
      this._coaRepository,
      this._voucherRepository,
      this._customerRepository,
    );
  }

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  get tenantRepository(): ITenantRepository {
    return this._tenantRepository;
  }

  get authService(): IAuthService {
    return this._authService;
  }

  get settingsRepository(): ISettingsRepository {
    return this._settingsRepository;
  }

  get coaRepository(): ICOARepository {
    return this._coaRepository;
  }

  get voucherRepository(): IVoucherRepository {
    return this._voucherRepository;
  }

  get inventoryRepository(): IInventoryRepository {
    return this._inventoryRepository;
  }

  get customerRepository(): ICustomerRepository {
    return this._customerRepository;
  }

  get supplierRepository(): ISupplierRepository {
    return this._supplierRepository;
  }

  get financialReportService(): FinancialReportService {
    return this._financialReportService;
  }

  get salesService(): SalesService {
    return this._salesService;
  }

  get purchaseService(): PurchaseService {
    return this._purchaseService;
  }

  get customerReceiptService(): CustomerReceiptService {
    return this._customerReceiptService;
  }
}

/**
 * Exported service instances for UI components.
 * Components should import these, not the concrete classes.
 */
export const services = ServiceContainer.getInstance();
