/**
 * Settings Page
 * Tenant-specific configuration with sub-tabs covering all specification areas.
 *
 * Tabs:
 *  1. Business Profile — company info, NTN, STN
 *  2. Sales Tax (GST) — GST type, rate, tax-inclusive, tax ID label
 *  3. Further Tax — further sales tax config
 *  4. FED — Federal Excise Duty config
 *  5. Advance Tax — separate purchase/sale rates
 *  6. Tax Accounts — GL account mapping readiness (optional, no invented codes)
 *  7. Financial Rules — fiscal year, decimal precision, voucher prefix
 *
 * Active tenant is resolved from the authenticated session context.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth/ProtectedRoute';
import { services } from '../services';
import {
  TenantSettings,
  TenantBusinessProfile,
  SalesTaxConfig,
  FurtherTaxConfig,
  FedConfig,
  AdvanceTaxConfig,
  TaxAccountMapping,
  TenantFinancialRules,
  GstType,
  GST_TYPE_LABELS,
} from '../../domain/types/settings';

/* ─── Tab Definitions ──────────────────────────────────────── */

type TabId =
  | 'profile'
  | 'salesTax'
  | 'furtherTax'
  | 'fed'
  | 'advanceTax'
  | 'taxAccounts'
  | 'financial';

interface Tab { id: TabId; label: string; }

const TABS: Tab[] = [
  { id: 'profile', label: 'Business Profile' },
  { id: 'salesTax', label: 'Sales Tax' },
  { id: 'furtherTax', label: 'Further Tax' },
  { id: 'fed', label: 'FED' },
  { id: 'advanceTax', label: 'Advance Tax' },
  { id: 'taxAccounts', label: 'Tax Accounts' },
  { id: 'financial', label: 'Financial Rules' },
];

const CURRENCIES = ['PKR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'INR'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/* ─── Main Settings Component ──────────────────────────────── */

export const Settings: React.FC = () => {
  const { tenant } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [settings, setSettings] = useState<TenantSettings | null>(null);

  // Draft state for each section
  const [draftProfile, setDraftProfile] = useState<TenantBusinessProfile>({
    businessName: '', tradeName: '', ntn: '', stn: '',
    email: '', phone: '', address: '', baseCurrency: 'PKR',
  });
  const [draftSalesTax, setDraftSalesTax] = useState<SalesTaxConfig>({
    isEnabled: true, defaultRate: 0, defaultGstType: '3RD', isTaxInclusiveDefault: false,
  });
  const [draftFurtherTax, setDraftFurtherTax] = useState<FurtherTaxConfig>({
    isEnabled: false, defaultRate: 0,
  });
  const [draftFed, setDraftFed] = useState<FedConfig>({
    isEnabled: false, defaultRate: 0,
  });
  const [draftAdvanceTax, setDraftAdvanceTax] = useState<AdvanceTaxConfig>({
    isEnabled: false, saleRate: 0, purchaseRate: 0,
  });
  const [draftTaxAccounts, setDraftTaxAccounts] = useState<TaxAccountMapping>({});
  const [draftFinancial, setDraftFinancial] = useState<TenantFinancialRules>({
    fiscalYearStartMonth: 7, decimalPrecision: 2, voucherNumberingPrefix: '',
  });

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      let existing = await services.settingsRepository.getSettingsByTenantId(tenant.id);
      if (!existing) {
        existing = await services.settingsRepository.updateSettings(tenant.id, {});
      }
      setSettings(existing);
      setDraftProfile(existing.profile);
      setDraftSalesTax(existing.salesTax);
      setDraftFurtherTax(existing.furtherTax);
      setDraftFed(existing.fed);
      setDraftAdvanceTax(existing.advanceTax);
      setDraftTaxAccounts(existing.taxAccounts);
      setDraftFinancial(existing.financial);
    } catch {
      setErrorMessage('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }, [tenant.id]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    setErrorMessage(null);
    try {
      const updated = await services.settingsRepository.updateSettings(tenant.id, {
        profile: draftProfile,
        salesTax: draftSalesTax,
        furtherTax: draftFurtherTax,
        fed: draftFed,
        advanceTax: draftAdvanceTax,
        taxAccounts: draftTaxAccounts,
        financial: draftFinancial,
      });
      setSettings(updated);
      setSaveMessage('Settings saved successfully.');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setErrorMessage('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (settings) {
      setDraftProfile(settings.profile);
      setDraftSalesTax(settings.salesTax);
      setDraftFurtherTax(settings.furtherTax);
      setDraftFed(settings.fed);
      setDraftAdvanceTax(settings.advanceTax);
      setDraftTaxAccounts(settings.taxAccounts);
      setDraftFinancial(settings.financial);
    }
    setSaveMessage(null);
    setErrorMessage(null);
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-1">Settings</h1>
            <p className="text-base text-slate-500">{tenant.brandName}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 mb-5">
          <div className="skeleton w-full h-10 mb-5" />
          <div className="skeleton w-full h-[200px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-1">Settings</h1>
          <p className="text-base text-slate-500">{tenant.brandName}</p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 text-sm text-slate-500 bg-transparent border border-slate-200 rounded-lg cursor-pointer min-h-[44px] hover:bg-slate-50 transition-colors"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto whitespace-nowrap border-b border-slate-200 hide-scrollbar gap-0 mb-5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors min-h-[44px] whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-blue-600 border-blue-600 bg-transparent'
                : 'text-slate-500 border-transparent bg-transparent hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {saveMessage && (
        <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium mb-4">
          {saveMessage}
        </div>
      )}
      {errorMessage && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-medium mb-4">
          {errorMessage}
        </div>
      )}

      {/* Tab Content */}
      <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 mb-5">
        {activeTab === 'profile' && (
          <ProfileTab draft={draftProfile} onChange={setDraftProfile} />
        )}
        {activeTab === 'salesTax' && (
          <SalesTaxTab draft={draftSalesTax} onChange={setDraftSalesTax} />
        )}
        {activeTab === 'furtherTax' && (
          <FurtherTaxTab draft={draftFurtherTax} onChange={setDraftFurtherTax} />
        )}
        {activeTab === 'fed' && (
          <FedTab draft={draftFed} onChange={setDraftFed} />
        )}
        {activeTab === 'advanceTax' && (
          <AdvanceTaxTab draft={draftAdvanceTax} onChange={setDraftAdvanceTax} />
        )}
        {activeTab === 'taxAccounts' && (
          <TaxAccountsTab draft={draftTaxAccounts} onChange={setDraftTaxAccounts} />
        )}
        {activeTab === 'financial' && (
          <FinancialTab draft={draftFinancial} onChange={setDraftFinancial} />
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={handleReset}
          className="px-5 py-2.5 text-sm font-medium text-slate-500 bg-white border border-slate-200 rounded-lg cursor-pointer min-h-[44px] hover:bg-slate-50 transition-colors"
          disabled={saving}
        >
          Reset
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 min-h-[44px] transition-colors"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

/* ─── Business Profile Tab ─────────────────────────────────── */

const ProfileTab: React.FC<{
  draft: TenantBusinessProfile;
  onChange: (p: TenantBusinessProfile) => void;
}> = ({ draft, onChange }) => {
  const set = (field: keyof TenantBusinessProfile, value: string) =>
    onChange({ ...draft, [field]: value });

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold text-slate-800">Business Profile</h2>
      <p className="text-sm text-slate-500 -mt-3">
        Company information used across the ERP. NTN and STN are from the master data.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Business Name">
          <input value={draft.businessName} onChange={(e) => set('businessName', e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white" placeholder="e.g. Demo Wholesale (Pvt) Ltd" />
        </Field>
        <Field label="Trade Name">
          <input value={draft.tradeName} onChange={(e) => set('tradeName', e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white" placeholder="e.g. Demo Wholesale" />
        </Field>
        <Field label="National Tax Number (NTN)">
          <input value={draft.ntn} onChange={(e) => set('ntn', e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white" placeholder="e.g. 1234567-8" />
        </Field>
        <Field label="Sales Tax Number (STN)">
          <input value={draft.stn} onChange={(e) => set('stn', e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white" placeholder="e.g. 1234567-8" />
        </Field>
        <Field label="Email">
          <input type="email" value={draft.email} onChange={(e) => set('email', e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white" placeholder="e.g. info@company.com" />
        </Field>
        <Field label="Phone">
          <input value={draft.phone} onChange={(e) => set('phone', e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white" placeholder="e.g. +92 21 1234 5678" />
        </Field>
        <Field label="Base Currency">
          <select value={draft.baseCurrency} onChange={(e) => set('baseCurrency', e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white cursor-pointer">
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Address">
        <textarea value={draft.address} onChange={(e) => set('address', e.target.value)}
          className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white resize-y font-inherit" rows={3} placeholder="Business address" />
      </Field>
    </div>
  );
};

/* ─── Sales Tax (GST) Tab ──────────────────────────────────── */

const SalesTaxTab: React.FC<{
  draft: SalesTaxConfig;
  onChange: (t: SalesTaxConfig) => void;
}> = ({ draft, onChange }) => {
  const set = <K extends keyof SalesTaxConfig>(field: K, value: SalesTaxConfig[K]) =>
    onChange({ ...draft, [field]: value });

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold text-slate-800">Sales Tax (GST)</h2>
      <p className="text-sm text-slate-500 -mt-3">
        Primary sales tax configuration. Per-item rates auto-fill on bill lines and can be overridden.
        Calculation: GST = To_Amt × (ST% / 100)
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Sales Tax Enabled">
          <Toggle value={draft.isEnabled} onChange={(v) => set('isEnabled', v)} />
        </Field>
        <Field label="Default GST Rate (%)">
          <input type="number" min={0} max={100} step={0.5}
            value={draft.defaultRate}
            onChange={(e) => set('defaultRate', parseFloat(e.target.value) || 0)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white" disabled={!draft.isEnabled} />
        </Field>
        <Field label="Default GST Type (Tax Schedule)">
          <select value={draft.defaultGstType}
            onChange={(e) => set('defaultGstType', e.target.value as GstType)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white cursor-pointer" disabled={!draft.isEnabled}>
            {(Object.keys(GST_TYPE_LABELS) as GstType[]).map((g) => (
              <option key={g} value={g}>{GST_TYPE_LABELS[g]} ({g})</option>
            ))}
          </select>
        </Field>
        <Field label="Tax Inclusive by Default">
          <Toggle value={draft.isTaxInclusiveDefault}
            onChange={(v) => set('isTaxInclusiveDefault', v)}
            disabled={!draft.isEnabled}
            trueLabel="Tax Inclusive" falseLabel="Tax Exclusive" />
        </Field>
      </div>
    </div>
  );
};

/* ─── Further Tax Tab ──────────────────────────────────────── */

const FurtherTaxTab: React.FC<{
  draft: FurtherTaxConfig;
  onChange: (t: FurtherTaxConfig) => void;
}> = ({ draft, onChange }) => {
  const set = <K extends keyof FurtherTaxConfig>(field: K, value: FurtherTaxConfig[K]) =>
    onChange({ ...draft, [field]: value });

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold text-slate-800">Further Sales Tax</h2>
      <p className="text-sm text-slate-500 -mt-3">
        Additional sales tax layer applied per bill line. Separate from the primary GST.
        Calculation: F.Tax = To_Amt × (F-ST% / 100)
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Further Tax Enabled">
          <Toggle value={draft.isEnabled} onChange={(v) => set('isEnabled', v)} />
        </Field>
        <Field label="Default Further Tax Rate (%)">
          <input type="number" min={0} max={100} step={0.5}
            value={draft.defaultRate}
            onChange={(e) => set('defaultRate', parseFloat(e.target.value) || 0)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white" disabled={!draft.isEnabled} />
        </Field>
      </div>
    </div>
  );
};

/* ─── FED Tab ──────────────────────────────────────────────── */

const FedTab: React.FC<{
  draft: FedConfig;
  onChange: (t: FedConfig) => void;
}> = ({ draft, onChange }) => {
  const set = <K extends keyof FedConfig>(field: K, value: FedConfig[K]) =>
    onChange({ ...draft, [field]: value });

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold text-slate-800">Federal Excise Duty (FED)</h2>
      <p className="text-sm text-slate-500 -mt-3">
        Federal excise duty configured per item and applied on bill lines.
        Calculation: FED = To_Amt × (FED% / 100)
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="FED Enabled">
          <Toggle value={draft.isEnabled} onChange={(v) => set('isEnabled', v)} />
        </Field>
        <Field label="Default FED Rate (%)">
          <input type="number" min={0} max={100} step={0.5}
            value={draft.defaultRate}
            onChange={(e) => set('defaultRate', parseFloat(e.target.value) || 0)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white" disabled={!draft.isEnabled} />
        </Field>
      </div>
    </div>
  );
};

/* ─── Advance Tax Tab ──────────────────────────────────────── */

const AdvanceTaxTab: React.FC<{
  draft: AdvanceTaxConfig;
  onChange: (t: AdvanceTaxConfig) => void;
}> = ({ draft, onChange }) => {
  const set = <K extends keyof AdvanceTaxConfig>(field: K, value: AdvanceTaxConfig[K]) =>
    onChange({ ...draft, [field]: value });

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold text-slate-800">Advance Tax</h2>
      <p className="text-sm text-slate-500 -mt-3">
        Advance tax with separate purchase and sale rates per item.
        Calculation: ADV_Tax = To_Amt × (ADV% / 100)
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Advance Tax Enabled">
          <Toggle value={draft.isEnabled} onChange={(v) => set('isEnabled', v)} />
        </Field>
        <div />
        <Field label="Default Sale Rate (%)">
          <input type="number" min={0} max={100} step={0.5}
            value={draft.saleRate}
            onChange={(e) => set('saleRate', parseFloat(e.target.value) || 0)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white" disabled={!draft.isEnabled} />
        </Field>
        <Field label="Default Purchase Rate (%)">
          <input type="number" min={0} max={100} step={0.5}
            value={draft.purchaseRate}
            onChange={(e) => set('purchaseRate', parseFloat(e.target.value) || 0)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white" disabled={!draft.isEnabled} />
        </Field>
      </div>
    </div>
  );
};

/* ─── Tax Accounts Tab ─────────────────────────────────────── */

const TaxAccountsTab: React.FC<{
  draft: TaxAccountMapping;
  onChange: (t: TaxAccountMapping) => void;
}> = ({ draft, onChange }) => {
  const set = (field: keyof TaxAccountMapping, value: string) =>
    onChange({ ...draft, [field]: value || undefined });

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold text-slate-800">GL Tax Account Mapping</h2>
      <p className="text-sm text-slate-500 -mt-3">
        Optional account code placeholders for future GL integration. All fields are
        optional — no account codes are invented. Leave blank until the chart of accounts
        is implemented.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Sales Tax Payable (Output)">
          <input value={draft.salesTaxPayableAccountCode ?? ''}
            onChange={(e) => set('salesTaxPayableAccountCode', e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white" placeholder="Not configured" />
        </Field>
        <Field label="Purchase Tax Input (Input)">
          <input value={draft.purchaseTaxInputAccountCode ?? ''}
            onChange={(e) => set('purchaseTaxInputAccountCode', e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white" placeholder="Not configured" />
        </Field>
        <Field label="Further Tax Account">
          <input value={draft.furtherTaxAccountCode ?? ''}
            onChange={(e) => set('furtherTaxAccountCode', e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white" placeholder="Not configured" />
        </Field>
        <Field label="FED Account">
          <input value={draft.fedAccountCode ?? ''}
            onChange={(e) => set('fedAccountCode', e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white" placeholder="Not configured" />
        </Field>
        <Field label="Advance Tax (Sales)">
          <input value={draft.advanceTaxSalesAccountCode ?? ''}
            onChange={(e) => set('advanceTaxSalesAccountCode', e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white" placeholder="Not configured" />
        </Field>
        <Field label="Advance Tax (Purchase)">
          <input value={draft.advanceTaxPurchaseAccountCode ?? ''}
            onChange={(e) => set('advanceTaxPurchaseAccountCode', e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white" placeholder="Not configured" />
        </Field>
      </div>
    </div>
  );
};

/* ─── Financial Rules Tab ──────────────────────────────────── */

const FinancialTab: React.FC<{
  draft: TenantFinancialRules;
  onChange: (f: TenantFinancialRules) => void;
}> = ({ draft, onChange }) => {
  const set = <K extends keyof TenantFinancialRules>(field: K, value: TenantFinancialRules[K]) =>
    onChange({ ...draft, [field]: value });

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold text-slate-800">Financial Rules</h2>
      <p className="text-sm text-slate-500 -mt-3">
        Fiscal year and voucher numbering preferences.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Fiscal Year Start Month">
          <select value={draft.fiscalYearStartMonth}
            onChange={(e) => set('fiscalYearStartMonth', parseInt(e.target.value, 10))}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white cursor-pointer">
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </Field>
        <Field label="Decimal Precision">
          <select value={draft.decimalPrecision}
            onChange={(e) => set('decimalPrecision', parseInt(e.target.value, 10))}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white cursor-pointer">
            <option value={0}>0 (no decimals)</option>
            <option value={2}>2 decimals</option>
            <option value={3}>3 decimals</option>
            <option value={4}>4 decimals</option>
          </select>
        </Field>
        <Field label="Voucher Numbering Prefix">
          <input value={draft.voucherNumberingPrefix}
            onChange={(e) => set('voucherNumberingPrefix', e.target.value.toUpperCase())}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white" maxLength={10} placeholder="e.g. JV, SB, PO" />
        </Field>
      </div>
    </div>
  );
};

/* ─── Shared Components ────────────────────────────────────── */

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-slate-700">{label}</label>
    {children}
  </div>
);

const Toggle: React.FC<{
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  trueLabel?: string;
  falseLabel?: string;
}> = ({ value, onChange, disabled, trueLabel = 'Enabled', falseLabel = 'Disabled' }) => (
  <div className="flex items-center gap-3">
    <button
      onClick={() => !disabled && onChange(!value)}
      className={`w-11 h-6 rounded-full cursor-pointer transition-colors relative ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${value ? 'bg-green-500' : 'bg-slate-300'}`}
      aria-pressed={value}
      disabled={disabled}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          value ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
    <span className="text-sm text-slate-600">{value ? trueLabel : falseLabel}</span>
  </div>
);
