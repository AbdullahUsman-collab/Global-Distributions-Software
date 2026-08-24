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
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Settings</h1>
          <p style={styles.subtitle}>{tenant.brandName}</p>
        </div>
        <div style={styles.card}>
          <div className="skeleton" style={{ width: '100%', height: '40px', marginBottom: '20px' }} />
          <div className="skeleton" style={{ width: '100%', height: '200px' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Settings</h1>
          <p style={styles.subtitle}>{tenant.brandName}</p>
        </div>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
          ← Back to Dashboard
        </button>
      </div>

      {/* Tabs */}
      <div style={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.tabActive : styles.tabInactive),
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {saveMessage && <div style={styles.successBanner}>{saveMessage}</div>}
      {errorMessage && <div style={styles.errorBanner}>{errorMessage}</div>}

      {/* Tab Content */}
      <div style={styles.card}>
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

      <div style={styles.actions}>
        <button onClick={handleReset} style={styles.resetButton} disabled={saving}>Reset</button>
        <button onClick={handleSave} style={styles.saveButton} disabled={saving}>
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
    <div style={styles.tabContent}>
      <h2 style={styles.sectionTitle}>Business Profile</h2>
      <p style={styles.sectionDescription}>
        Company information used across the ERP. NTN and STN are from the master data.
      </p>
      <div style={styles.formGrid}>
        <Field label="Business Name">
          <input value={draft.businessName} onChange={(e) => set('businessName', e.target.value)}
            style={styles.input} placeholder="e.g. Demo Wholesale (Pvt) Ltd" />
        </Field>
        <Field label="Trade Name">
          <input value={draft.tradeName} onChange={(e) => set('tradeName', e.target.value)}
            style={styles.input} placeholder="e.g. Demo Wholesale" />
        </Field>
        <Field label="National Tax Number (NTN)">
          <input value={draft.ntn} onChange={(e) => set('ntn', e.target.value)}
            style={styles.input} placeholder="e.g. 1234567-8" />
        </Field>
        <Field label="Sales Tax Number (STN)">
          <input value={draft.stn} onChange={(e) => set('stn', e.target.value)}
            style={styles.input} placeholder="e.g. 1234567-8" />
        </Field>
        <Field label="Email">
          <input type="email" value={draft.email} onChange={(e) => set('email', e.target.value)}
            style={styles.input} placeholder="e.g. info@company.com" />
        </Field>
        <Field label="Phone">
          <input value={draft.phone} onChange={(e) => set('phone', e.target.value)}
            style={styles.input} placeholder="e.g. +92 21 1234 5678" />
        </Field>
        <Field label="Base Currency">
          <select value={draft.baseCurrency} onChange={(e) => set('baseCurrency', e.target.value)}
            style={styles.select}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Address">
        <textarea value={draft.address} onChange={(e) => set('address', e.target.value)}
          style={styles.textarea} rows={3} placeholder="Business address" />
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
    <div style={styles.tabContent}>
      <h2 style={styles.sectionTitle}>Sales Tax (GST)</h2>
      <p style={styles.sectionDescription}>
        Primary sales tax configuration. Per-item rates auto-fill on bill lines and can be overridden.
        Calculation: GST = To_Amt × (ST% / 100)
      </p>
      <div style={styles.formGrid}>
        <Field label="Sales Tax Enabled">
          <Toggle value={draft.isEnabled} onChange={(v) => set('isEnabled', v)} />
        </Field>
        <Field label="Default GST Rate (%)">
          <input type="number" min={0} max={100} step={0.5}
            value={draft.defaultRate}
            onChange={(e) => set('defaultRate', parseFloat(e.target.value) || 0)}
            style={styles.input} disabled={!draft.isEnabled} />
        </Field>
        <Field label="Default GST Type (Tax Schedule)">
          <select value={draft.defaultGstType}
            onChange={(e) => set('defaultGstType', e.target.value as GstType)}
            style={styles.select} disabled={!draft.isEnabled}>
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
    <div style={styles.tabContent}>
      <h2 style={styles.sectionTitle}>Further Sales Tax</h2>
      <p style={styles.sectionDescription}>
        Additional sales tax layer applied per bill line. Separate from the primary GST.
        Calculation: F.Tax = To_Amt × (F-ST% / 100)
      </p>
      <div style={styles.formGrid}>
        <Field label="Further Tax Enabled">
          <Toggle value={draft.isEnabled} onChange={(v) => set('isEnabled', v)} />
        </Field>
        <Field label="Default Further Tax Rate (%)">
          <input type="number" min={0} max={100} step={0.5}
            value={draft.defaultRate}
            onChange={(e) => set('defaultRate', parseFloat(e.target.value) || 0)}
            style={styles.input} disabled={!draft.isEnabled} />
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
    <div style={styles.tabContent}>
      <h2 style={styles.sectionTitle}>Federal Excise Duty (FED)</h2>
      <p style={styles.sectionDescription}>
        Federal excise duty configured per item and applied on bill lines.
        Calculation: FED = To_Amt × (FED% / 100)
      </p>
      <div style={styles.formGrid}>
        <Field label="FED Enabled">
          <Toggle value={draft.isEnabled} onChange={(v) => set('isEnabled', v)} />
        </Field>
        <Field label="Default FED Rate (%)">
          <input type="number" min={0} max={100} step={0.5}
            value={draft.defaultRate}
            onChange={(e) => set('defaultRate', parseFloat(e.target.value) || 0)}
            style={styles.input} disabled={!draft.isEnabled} />
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
    <div style={styles.tabContent}>
      <h2 style={styles.sectionTitle}>Advance Tax</h2>
      <p style={styles.sectionDescription}>
        Advance tax with separate purchase and sale rates per item.
        Calculation: ADV_Tax = To_Amt × (ADV% / 100)
      </p>
      <div style={styles.formGrid}>
        <Field label="Advance Tax Enabled">
          <Toggle value={draft.isEnabled} onChange={(v) => set('isEnabled', v)} />
        </Field>
        <div /> {/* spacer for 2-col grid */}
        <Field label="Default Sale Rate (%)">
          <input type="number" min={0} max={100} step={0.5}
            value={draft.saleRate}
            onChange={(e) => set('saleRate', parseFloat(e.target.value) || 0)}
            style={styles.input} disabled={!draft.isEnabled} />
        </Field>
        <Field label="Default Purchase Rate (%)">
          <input type="number" min={0} max={100} step={0.5}
            value={draft.purchaseRate}
            onChange={(e) => set('purchaseRate', parseFloat(e.target.value) || 0)}
            style={styles.input} disabled={!draft.isEnabled} />
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
    <div style={styles.tabContent}>
      <h2 style={styles.sectionTitle}>GL Tax Account Mapping</h2>
      <p style={styles.sectionDescription}>
        Optional account code placeholders for future GL integration. All fields are
        optional — no account codes are invented. Leave blank until the chart of accounts
        is implemented.
      </p>
      <div style={styles.formGrid}>
        <Field label="Sales Tax Payable (Output)">
          <input value={draft.salesTaxPayableAccountCode ?? ''}
            onChange={(e) => set('salesTaxPayableAccountCode', e.target.value)}
            style={styles.input} placeholder="Not configured" />
        </Field>
        <Field label="Purchase Tax Input (Input)">
          <input value={draft.purchaseTaxInputAccountCode ?? ''}
            onChange={(e) => set('purchaseTaxInputAccountCode', e.target.value)}
            style={styles.input} placeholder="Not configured" />
        </Field>
        <Field label="Further Tax Account">
          <input value={draft.furtherTaxAccountCode ?? ''}
            onChange={(e) => set('furtherTaxAccountCode', e.target.value)}
            style={styles.input} placeholder="Not configured" />
        </Field>
        <Field label="FED Account">
          <input value={draft.fedAccountCode ?? ''}
            onChange={(e) => set('fedAccountCode', e.target.value)}
            style={styles.input} placeholder="Not configured" />
        </Field>
        <Field label="Advance Tax (Sales)">
          <input value={draft.advanceTaxSalesAccountCode ?? ''}
            onChange={(e) => set('advanceTaxSalesAccountCode', e.target.value)}
            style={styles.input} placeholder="Not configured" />
        </Field>
        <Field label="Advance Tax (Purchase)">
          <input value={draft.advanceTaxPurchaseAccountCode ?? ''}
            onChange={(e) => set('advanceTaxPurchaseAccountCode', e.target.value)}
            style={styles.input} placeholder="Not configured" />
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
    <div style={styles.tabContent}>
      <h2 style={styles.sectionTitle}>Financial Rules</h2>
      <p style={styles.sectionDescription}>
        Fiscal year and voucher numbering preferences.
      </p>
      <div style={styles.formGrid}>
        <Field label="Fiscal Year Start Month">
          <select value={draft.fiscalYearStartMonth}
            onChange={(e) => set('fiscalYearStartMonth', parseInt(e.target.value, 10))}
            style={styles.select}>
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </Field>
        <Field label="Decimal Precision">
          <select value={draft.decimalPrecision}
            onChange={(e) => set('decimalPrecision', parseInt(e.target.value, 10))}
            style={styles.select}>
            <option value={0}>0 (no decimals)</option>
            <option value={2}>2 decimals</option>
            <option value={3}>3 decimals</option>
            <option value={4}>4 decimals</option>
          </select>
        </Field>
        <Field label="Voucher Numbering Prefix">
          <input value={draft.voucherNumberingPrefix}
            onChange={(e) => set('voucherNumberingPrefix', e.target.value.toUpperCase())}
            style={styles.input} maxLength={10} placeholder="e.g. JV, SB, PO" />
        </Field>
      </div>
    </div>
  );
};

/* ─── Shared Components ────────────────────────────────────── */

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={styles.field}>
    <label style={styles.label}>{label}</label>
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
  <div style={styles.toggleRow}>
    <button
      onClick={() => !disabled && onChange(!value)}
      style={{
        ...styles.toggle,
        backgroundColor: value ? '#22c55e' : '#cbd5e1',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      aria-pressed={value}
      disabled={disabled}
    >
      <span style={{
        ...styles.toggleKnob,
        transform: value ? 'translateX(20px)' : 'translateX(2px)',
      }} />
    </button>
    <span style={styles.toggleLabel}>{value ? trueLabel : falseLabel}</span>
  </div>
);

/* ─── Styles (consistent with existing ERP design language) ── */

const styles: { [key: string]: React.CSSProperties } = {
  container: { padding: '32px', maxWidth: '800px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title: { fontSize: '28px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' },
  subtitle: { fontSize: '15px', color: '#64748b' },
  backButton: { padding: '8px 16px', fontSize: '14px', color: '#64748b', background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' },
  tabBar: { display: 'flex', gap: '4px', borderBottom: '2px solid #e2e8f0', marginBottom: '24px', flexWrap: 'wrap' },
  tab: { padding: '10px 20px', fontSize: '14px', fontWeight: '500', border: 'none', borderBottom: '2px solid transparent', marginBottom: '-2px', cursor: 'pointer', transition: 'color 0.15s ease, border-color 0.15s ease' },
  tabActive: { color: '#2563eb', borderBottomColor: '#2563eb', backgroundColor: 'transparent' },
  tabInactive: { color: '#64748b', backgroundColor: 'transparent' },
  card: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgb(0 0 0 / 0.1)', border: '1px solid #e2e8f0', marginBottom: '20px' },
  tabContent: { display: 'flex', flexDirection: 'column', gap: '20px' },
  sectionTitle: { fontSize: '18px', fontWeight: '600', color: '#1e293b' },
  sectionDescription: { fontSize: '14px', color: '#64748b', marginTop: '-12px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '500', color: '#374151' },
  input: { padding: '10px 12px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none', backgroundColor: '#ffffff', color: '#1e293b', transition: 'border-color 0.15s ease' },
  select: { padding: '10px 12px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none', backgroundColor: '#ffffff', color: '#1e293b', cursor: 'pointer' },
  textarea: { padding: '10px 12px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none', backgroundColor: '#ffffff', color: '#1e293b', resize: 'vertical', fontFamily: 'inherit' },
  toggleRow: { display: 'flex', alignItems: 'center', gap: '12px' },
  toggle: { width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', position: 'relative', padding: 0, transition: 'background-color 0.2s ease' },
  toggleKnob: { position: 'absolute', top: '2px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgb(0 0 0 / 0.2)', transition: 'transform 0.2s ease' },
  toggleLabel: { fontSize: '14px', color: '#475569' },
  successBanner: { padding: '12px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '14px', fontWeight: '500', marginBottom: '16px' },
  errorBanner: { padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '14px', fontWeight: '500', marginBottom: '16px' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '12px' },
  resetButton: { padding: '10px 20px', fontSize: '14px', fontWeight: '500', color: '#64748b', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' },
  saveButton: { padding: '10px 24px', fontSize: '14px', fontWeight: '600', color: '#ffffff', backgroundColor: '#2563eb', border: 'none', borderRadius: '8px', cursor: 'pointer' },
};
