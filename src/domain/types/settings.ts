/**
 * Settings Domain Types
 * Tenant-specific configuration for business profile, tax, and financial rules.
 *
 * RULE: Settings are isolated per tenant.
 * RULE: These are configuration values only - no accounting logic.
 * RULE: All tax types, enums, and concepts are sourced from the
 *       reverse-engineered specifications (audit/15_TAX_DISCOUNT.md,
 *       audit/MASTER_REVERSE_ENGINEERED_SPEC.md, audit/23_DATA_MODEL.md).
 */

/* ─── GST Type Enum (Tax Schedule) ─────────────────────────── */

/**
 * GST Type determines which tax regime applies to an item.
 * Sourced from: audit/15_TAX_DISCOUNT.md, audit/03_MASTER_DATA.md,
 *               audit/23_DATA_MODEL.md, MotherCare_System_Complete_Extract.md
 *
 * Field: gst_type on Items table
 * Values: VAT, 3RD, 8TH
 */
export type GstType = 'VAT' | '3RD' | '8TH';

/**
 * Human-readable labels for GST Type display.
 */
export const GST_TYPE_LABELS: Record<GstType, string> = {
  'VAT': 'Value Added Tax (VAT)',
  '3RD': 'Third Schedule',
  '8TH': 'Eighth Schedule',
};

/* ─── Business Profile ─────────────────────────────────────── */

/**
 * Tenant business profile configuration.
 * Sourced from: audit/03_MASTER_DATA.md (Accounts table: STN, NTN fields)
 */
export interface TenantBusinessProfile {
  /** Registered business name */
  businessName: string;
  /** Trading / display name */
  tradeName: string;
  /** National Tax Number (NTN) — from audit/03_MASTER_DATA.md */
  ntn: string;
  /** Sales Tax Number (STN) — from audit/03_MASTER_DATA.md */
  stn: string;
  /** Business contact email */
  email: string;
  /** Business contact phone */
  phone: string;
  /** Business address */
  address: string;
  /** ISO 4217 base currency code (e.g. "PKR", "USD") */
  baseCurrency: string;
}

/* ─── Sales Tax (GST) ──────────────────────────────────────── */

/**
 * Sales Tax (GST) configuration.
 * Sourced from: audit/15_TAX_DISCOUNT.md, audit/16_CALCULATIONS.md,
 *               audit/MASTER_REVERSE_ENGINEERED_SPEC.md
 *
 * Calculation: GST = To_Amt x (ST% / 100)
 * Accounting: CREDIT: Tax Payable (sales), DEBIT: Tax Input (purchases)
 */
export interface SalesTaxConfig {
  /** Whether Sales Tax (GST) is enabled */
  isEnabled: boolean;
  /** Default GST rate as percentage (e.g. 17 for 17%) */
  defaultRate: number;
  /** Default GST type/regime for new items */
  defaultGstType: GstType;
  /** Whether prices are treated as tax-inclusive by default.
   *  UNKNOWN in legacy specs — defaults to false (tax-exclusive). */
  isTaxInclusiveDefault: boolean;
}

/* ─── Further Sales Tax ────────────────────────────────────── */

/**
 * Further Sales Tax configuration.
 * Sourced from: audit/15_TAX_DISCOUNT.md, audit/16_CALCULATIONS.md,
 *               audit/10_SALES_ENGINE.md
 *
 * Calculation: F.Tax = To_Amt x (F-ST% / 100)
 * Field on bill line: F-ST%
 * A separate additional sales tax layer applied per line item.
 */
export interface FurtherTaxConfig {
  /** Whether Further Sales Tax is enabled */
  isEnabled: boolean;
  /** Default Further Tax rate as percentage */
  defaultRate: number;
}

/* ─── Federal Excise Duty (FED) ────────────────────────────── */

/**
 * Federal Excise Duty (FED) configuration.
 * Sourced from: audit/15_TAX_DISCOUNT.md, audit/16_CALCULATIONS.md,
 *               audit/MASTER_REVERSE_ENGINEERED_SPEC.md
 *
 * Calculation: FED = To_Amt x (FED% / 100)
 * Stored on Items as: fed (DECIMAL)
 * Field on bill line: FED%
 */
export interface FedConfig {
  /** Whether Federal Excise Duty is enabled */
  isEnabled: boolean;
  /** Default FED rate as percentage */
  defaultRate: number;
}

/* ─── Advance Tax ──────────────────────────────────────────── */

/**
 * Advance Tax configuration.
 * Sourced from: audit/15_TAX_DISCOUNT.md, audit/16_CALCULATIONS.md,
 *               audit/MASTER_REVERSE_ENGINEERED_SPEC.md, audit/23_DATA_MODEL.md
 *
 * Calculation: ADV_Tax = To_Amt x (ADV% / 100)
 * Items have SEPARATE rates for purchase and sale:
 *   - adv_tax_purchase (on Items master)
 *   - adv_tax_sale (on Items master)
 * Field on bill line: ADV.%
 */
export interface AdvanceTaxConfig {
  /** Whether Advance Tax is enabled */
  isEnabled: boolean;
  /** Default Advance Tax rate on sales as percentage */
  saleRate: number;
  /** Default Advance Tax rate on purchases as percentage */
  purchaseRate: number;
}

/* ─── GL Tax Account Mapping Readiness ─────────────────────── */

/**
 * GL account mapping placeholders for tax accounting.
 * Sourced from: audit/04_ACCOUNTING_ENGINE.md, audit/10_SALES_ENGINE.md,
 *               audit/11_PURCHASE_ENGINE.md
 *
 * Legacy system uses abstract GL concepts (Tax Payable, Tax Input)
 * without specific account codes. These are optional placeholders
 * for future ERP account integration.
 */
export interface TaxAccountMapping {
  /** GL account for Sales Tax collected (Tax Payable / output tax) */
  salesTaxPayableAccountCode?: string;
  /** GL account for Purchase Tax paid (Tax Input / input tax) */
  purchaseTaxInputAccountCode?: string;
  /** GL account for Further Tax liability */
  furtherTaxAccountCode?: string;
  /** GL account for Federal Excise Duty */
  fedAccountCode?: string;
  /** GL account for Advance Tax on sales */
  advanceTaxSalesAccountCode?: string;
  /** GL account for Advance Tax on purchases */
  advanceTaxPurchaseAccountCode?: string;
}

/* ─── Tenant Financial Rules ───────────────────────────────── */

/**
 * Tenant financial rules / preferences.
 */
export interface TenantFinancialRules {
  /** Month the fiscal year starts (1 = January, 7 = July, etc.) */
  fiscalYearStartMonth: number;
  /** Decimal precision for currency amounts */
  decimalPrecision: number;
  /** Prefix for voucher numbering (e.g. "JV", "SB", "PO") */
  voucherNumberingPrefix: string;
}

/* ─── Aggregate Settings ───────────────────────────────────── */

/**
 * Complete tenant settings aggregate.
 */
export interface TenantSettings {
  /** Tenant these settings belong to */
  tenantId: string;
  /** Business profile configuration */
  profile: TenantBusinessProfile;
  /** Sales Tax (GST) configuration */
  salesTax: SalesTaxConfig;
  /** Further Sales Tax configuration */
  furtherTax: FurtherTaxConfig;
  /** Federal Excise Duty configuration */
  fed: FedConfig;
  /** Advance Tax configuration */
  advanceTax: AdvanceTaxConfig;
  /** GL account mapping readiness (optional — no invented codes) */
  taxAccounts: TaxAccountMapping;
  /** Financial rules */
  financial: TenantFinancialRules;
}
