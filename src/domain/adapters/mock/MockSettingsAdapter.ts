/**
 * Mock Settings Adapter
 * DEVELOPMENT ONLY — In-memory mock implementation of ISettingsRepository.
 *
 * Each tenant has independent settings that persist during the dev session.
 * All default values are sourced from the reverse-engineered specifications.
 */

import {
  TenantSettings,
  TenantBusinessProfile,
  SalesTaxConfig,
  FurtherTaxConfig,
  FedConfig,
  AdvanceTaxConfig,
  TaxAccountMapping,
  TenantFinancialRules,
} from '../../types/settings';
import { ISettingsRepository } from '../../repositories/ISettingsRepository';

/* ─── Defaults ─────────────────────────────────────────────── */

function defaultProfile(brandName: string): TenantBusinessProfile {
  return {
    businessName: brandName + ' (Pvt) Ltd',
    tradeName: brandName,
    ntn: '',
    stn: '',
    email: `info@${brandName.toLowerCase().replace(/\s+/g, '')}.com`,
    phone: '',
    address: '',
    baseCurrency: 'PKR',
  };
}

/**
 * Sales Tax defaults.
 * Source: specifications show ST% = 18% as observed sample data,
 *         GST Type = 3RD as default observed in item data.
 */
const DEFAULT_SALES_TAX: SalesTaxConfig = {
  isEnabled: true,
  defaultRate: 18,
  defaultGstType: '3RD',
  isTaxInclusiveDefault: false,
};

/**
 * Further Tax defaults — disabled by default (no sample rate in specs).
 */
const DEFAULT_FURTHER_TAX: FurtherTaxConfig = {
  isEnabled: false,
  defaultRate: 0,
};

/**
 * FED defaults — disabled by default (no sample rate in specs).
 */
const DEFAULT_FED: FedConfig = {
  isEnabled: false,
  defaultRate: 0,
};

/**
 * Advance Tax defaults — separate purchase/sale rates.
 * Source: audit/15_TAX_DISCOUNT.md (adv_tax_purchase, adv_tax_sale fields)
 */
const DEFAULT_ADVANCE_TAX: AdvanceTaxConfig = {
  isEnabled: false,
  saleRate: 0,
  purchaseRate: 0,
};

/**
 * GL account mapping — all optional, no invented codes.
 */
const DEFAULT_TAX_ACCOUNTS: TaxAccountMapping = {};

const DEFAULT_FINANCIAL: TenantFinancialRules = {
  fiscalYearStartMonth: 7,
  decimalPrecision: 2,
  voucherNumberingPrefix: 'VCH',
};

/* ─── Seed Data ────────────────────────────────────────────── */

const SEED_SETTINGS: TenantSettings[] = [
  {
    tenantId: 'tenant-demo-wholesale-001',
    profile: {
      ...defaultProfile('Demo Wholesale'),
      ntn: '1234567-8',
      stn: '1234567-8',
      phone: '+92 21 1234 5678',
      address: '123 Main Street, Karachi, Pakistan',
    },
    salesTax: { ...DEFAULT_SALES_TAX },
    furtherTax: { ...DEFAULT_FURTHER_TAX },
    fed: { ...DEFAULT_FED },
    advanceTax: { ...DEFAULT_ADVANCE_TAX },
    taxAccounts: { ...DEFAULT_TAX_ACCOUNTS },
    financial: { ...DEFAULT_FINANCIAL },
  },
  {
    tenantId: 'tenant-demo-distribution-002',
    profile: {
      ...defaultProfile('Demo Distribution'),
      ntn: '9876543-2',
      stn: '9876543-2',
      phone: '+92 42 9876 5432',
      address: '456 Commerce Avenue, Lahore, Pakistan',
    },
    salesTax: { ...DEFAULT_SALES_TAX },
    furtherTax: { ...DEFAULT_FURTHER_TAX },
    fed: { ...DEFAULT_FED },
    advanceTax: { ...DEFAULT_ADVANCE_TAX },
    taxAccounts: { ...DEFAULT_TAX_ACCOUNTS },
    financial: { ...DEFAULT_FINANCIAL, voucherNumberingPrefix: 'DIST' },
  },
  {
    tenantId: 'tenant-apex-trading-003',
    profile: {
      ...defaultProfile('Apex Trading'),
      ntn: '5555555-5',
      stn: '5555555-5',
      phone: '+92 51 5555 5555',
      address: '789 Business District, Islamabad, Pakistan',
    },
    salesTax: { ...DEFAULT_SALES_TAX, isEnabled: false, defaultRate: 0 },
    furtherTax: { ...DEFAULT_FURTHER_TAX },
    fed: { ...DEFAULT_FED },
    advanceTax: { ...DEFAULT_ADVANCE_TAX },
    taxAccounts: { ...DEFAULT_TAX_ACCOUNTS },
    financial: { ...DEFAULT_FINANCIAL, voucherNumberingPrefix: 'AT', fiscalYearStartMonth: 1 },
  },
];

/* ─── In-Memory Store ──────────────────────────────────────── */

const store: Map<string, TenantSettings> = new Map(
  SEED_SETTINGS.map((s) => [s.tenantId, structuredClone(s)])
);

/* ─── Adapter Implementation ───────────────────────────────── */

/**
 * Mock implementation of ISettingsRepository.
 * DEVELOPMENT ONLY — Do not use in production.
 */
export class MockSettingsAdapter implements ISettingsRepository {
  async getSettingsByTenantId(tenantId: string): Promise<TenantSettings | null> {
    const settings = store.get(tenantId);
    return settings ? structuredClone(settings) : null;
  }

  async updateSettings(
    tenantId: string,
    partial: Partial<TenantSettings>
  ): Promise<TenantSettings> {
    const existing = store.get(tenantId);

    // Start from defaults if no existing settings
    const base: TenantSettings = existing ?? {
      tenantId,
      profile: defaultProfile('Unknown'),
      salesTax: { ...DEFAULT_SALES_TAX },
      furtherTax: { ...DEFAULT_FURTHER_TAX },
      fed: { ...DEFAULT_FED },
      advanceTax: { ...DEFAULT_ADVANCE_TAX },
      taxAccounts: { ...DEFAULT_TAX_ACCOUNTS },
      financial: { ...DEFAULT_FINANCIAL },
    };

    // Merge each section independently
    const merged: TenantSettings = {
      tenantId,
      profile: partial.profile ? { ...base.profile, ...partial.profile } : base.profile,
      salesTax: partial.salesTax ? { ...base.salesTax, ...partial.salesTax } : base.salesTax,
      furtherTax: partial.furtherTax ? { ...base.furtherTax, ...partial.furtherTax } : base.furtherTax,
      fed: partial.fed ? { ...base.fed, ...partial.fed } : base.fed,
      advanceTax: partial.advanceTax ? { ...base.advanceTax, ...partial.advanceTax } : base.advanceTax,
      taxAccounts: partial.taxAccounts ? { ...base.taxAccounts, ...partial.taxAccounts } : base.taxAccounts,
      financial: partial.financial ? { ...base.financial, ...partial.financial } : base.financial,
    };

    store.set(tenantId, merged);
    return structuredClone(merged);
  }
}
