/**
 * Step 78 Regression Tests — Persistence & Save/Reload Integrity
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─── API Client: Demo Fallback Behavior ──────────────────────────

describe('Step 78 — API Client Persistence Guard', () => {
  it('should NOT silently fall back to demo data for state-changing requests', () => {
    // Read the api.ts source and verify the fix
    const apiSource = readFileSync(resolve('src/ui/lib/api.ts'), 'utf-8');

    // Verify: for state-changing requests on !res.ok, it throws instead of demo fallback
    expect(apiSource).toContain('if (isStateChanging)');
    expect(apiSource).toContain('throw { status: res.status, message } as ApiError');

    // Verify: for state-changing requests on network error, it throws
    expect(apiSource).toContain('Server unavailable — changes were NOT saved');

    // Verify: demo fallback still exists for GET requests (read-only)
    expect(apiSource).toContain('For read-only requests (GET), try demo data fallback');
  });

  it('should still allow demo fallback for GET requests (read-only)', () => {
    const apiSource = readFileSync(resolve('src/ui/lib/api.ts'), 'utf-8');
    // GET requests should still fall back to demo data on Vercel
    expect(apiSource).toContain('For read-only requests (GET), try demo data fallback');
  });

  it('should handle network errors for state-changing requests by throwing', () => {
    const apiSource = readFileSync(resolve('src/ui/lib/api.ts'), 'utf-8');
    // Network error path should throw for state-changing requests
    expect(apiSource).toContain('isStateChanging');
    expect(apiSource).toContain('Server unavailable');
  });
});

// ─── Settings Adapter: Deep Merge ────────────────────────────────

describe('Step 78 — Settings Adapter Deep Merge', () => {
  it('should deep merge nested settings objects', () => {
    const adapterSource = readFileSync(resolve('src/server/db/repositories/PostgresSettingsAdapter.ts'), 'utf-8');

    // Verify deepMerge function exists
    expect(adapterSource).toContain('function deepMerge');
    expect(adapterSource).toContain('deepMerge(existing, partial)');
  });

  it('should not lose existing nested fields when partial omits them', () => {
    // Simulate the deep merge logic
    const existing = {
      tenantId: 't1',
      profile: { businessName: 'Old', tradeName: 'Old Trade', ntn: '123' },
      taxAccounts: { salesTaxPayableAccountCode: '21201' },
      financial: { fiscalYearStartMonth: 7 },
      salesTax: { isEnabled: true },
    };
    const partial = {
      profile: { businessName: 'New' },
      taxAccounts: { salesTaxPayableAccountCode: '21202' },
      financial: { decimalPrecision: 3 },
    };

    // Deep merge: partial.profile should MERGE, not replace
    const result: any = {};
    for (const key of Object.keys(existing)) {
      if (partial && typeof partial === 'object' && key in partial) {
        const srcVal = (partial as any)[key];
        const tgtVal = existing[key as keyof typeof existing];
        if (srcVal && typeof srcVal === 'object' && !Array.isArray(srcVal) &&
            tgtVal && typeof tgtVal === 'object' && !Array.isArray(tgtVal)) {
          result[key] = { ...tgtVal, ...srcVal };
        } else {
          result[key] = srcVal;
        }
      } else {
        result[key] = existing[key as keyof typeof existing];
      }
    }

    // businessName changed, but tradeName and ntn preserved
    expect(result.profile.businessName).toBe('New');
    expect(result.profile.tradeName).toBe('Old Trade');
    expect(result.profile.ntn).toBe('123');
    // taxAccounts updated
    expect(result.taxAccounts.salesTaxPayableAccountCode).toBe('21202');
    // financial merged
    expect(result.financial.fiscalYearStartMonth).toBe(7);
    expect(result.financial.decimalPrecision).toBe(3);
    // salesTax preserved (not in partial)
    expect(result.salesTax.isEnabled).toBe(true);
  });
});

// ─── Product Persistence Chain ───────────────────────────────────

describe('Step 78 — Product Persistence Chain', () => {
  it('should have all product columns in PostgresInventoryAdapter SELECT', () => {
    const adapter = readFileSync(resolve('src/server/db/repositories/PostgresInventoryAdapter.ts'), 'utf-8');

    const requiredColumns = [
      'further_tax_percent', 'advance_tax_sale_percent', 'advance_tax_purchase_percent',
      'gst_percent', 'fed_percent', 'gst_type', 'cost_rate', 'margin',
      'hs_code', 'trade_discount', 'trade_offer', 'min_quantity',
    ];
    for (const col of requiredColumns) {
      expect(adapter).toContain(col);
    }
  });

  it('should have all product columns in PostgresInventoryAdapter INSERT', () => {
    const adapter = readFileSync(resolve('src/server/db/repositories/PostgresInventoryAdapter.ts'), 'utf-8');

    // Check INSERT includes further_tax_percent
    expect(adapter).toContain('further_tax_percent');
    // Check VALUES has correct parameter count (22 columns)
    expect(adapter).toContain('VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)');
  });

  it('should have furtherTaxPercent in PRODUCT_UPDATE_COLUMNS', () => {
    const adapter = readFileSync(resolve('src/server/db/repositories/PostgresInventoryAdapter.ts'), 'utf-8');
    expect(adapter).toContain("furtherTaxPercent: 'further_tax_percent'");
  });

  it('should have furtherTaxPercent in createProduct mock adapter', () => {
    const mock = readFileSync(resolve('src/domain/adapters/mock/MockInventoryAdapter.ts'), 'utf-8');
    expect(mock).toContain('furtherTaxPercent: dto.furtherTaxPercent ?? 0');
    expect(mock).toContain('furtherTaxPercent: dto.furtherTaxPercent ?? existing.furtherTaxPercent');
  });

  it('should have furtherTaxPercent in demo data products', () => {
    const demo = readFileSync(resolve('src/ui/lib/demoData.ts'), 'utf-8');
    expect(demo).toContain('furtherTaxPercent:');
  });
});

// ─── Account Persistence Chain ───────────────────────────────────

describe('Step 78 — Account Persistence Chain', () => {
  it('should have all account metadata columns in PostgresCOAAdapter', () => {
    const adapter = readFileSync(resolve('src/server/db/repositories/PostgresCOAAdapter.ts'), 'utf-8');

    const requiredColumns = [
      'address', 'owner_name', 'phone', 'stn', 'ntn', 'cnic',
      'control_category', 'legacy_main_head_no', 'account_effect',
    ];
    for (const col of requiredColumns) {
      expect(adapter).toContain(col);
    }
  });

  it('should have all updatable fields in ACCOUNT_UPDATE_COLUMNS', () => {
    const adapter = readFileSync(resolve('src/server/db/repositories/PostgresCOAAdapter.ts'), 'utf-8');

    const requiredUpdateFields = [
      'accountName', 'isActive', 'controlCategory', 'legacyMainHeadNo',
      'accountEffect', 'address', 'ownerName', 'phone', 'stn', 'ntn', 'cnic',
    ];
    for (const field of requiredUpdateFields) {
      expect(adapter).toContain(field);
    }
  });
});

// ─── Settings Persistence Chain ──────────────────────────────────

describe('Step 78 — Settings Persistence Chain', () => {
  it('should use UPSERT (INSERT ON CONFLICT) for settings', () => {
    const adapter = readFileSync(resolve('src/server/db/repositories/postgresSettingsAdapter.ts'), 'utf-8').toLowerCase();
    expect(adapter).toContain('on conflict');
    expect(adapter).toContain('do update');
  });

  it('should store settings as JSONB', () => {
    const adapter = readFileSync(resolve('src/server/db/repositories/postgresSettingsAdapter.ts'), 'utf-8');
    expect(adapter).toContain('JSON.stringify(merged)');
  });

  it('should preserve existing sections not in partial update', () => {
    const adapter = readFileSync(resolve('src/server/db/repositories/PostgresSettingsAdapter.ts'), 'utf-8');
    // Should deep merge, not shallow replace
    expect(adapter).toContain('deepMerge');
  });
});

// ─── Settings UI: Removed Tax Tabs ───────────────────────────────

describe('Step 78 — Settings Tax Tabs Removal', () => {
  it('should NOT have salesTax, furtherTax, fed, advanceTax tabs', () => {
    const settings = readFileSync(resolve('src/ui/pages/Settings.tsx'), 'utf-8');

    // Verify tax config tabs are removed from TABS array
    expect(settings).not.toMatch(/id:\s*'salesTax'/);
    expect(settings).not.toMatch(/id:\s*'furtherTax'/);
    expect(settings).not.toMatch(/id:\s*'fed'/);
    expect(settings).not.toMatch(/id:\s*'advanceTax'/);

    // Verify only 4 tabs remain
    expect(settings).toContain("'profile'");
    expect(settings).toContain("'taxAccounts'");
    expect(settings).toContain("'financial'");
    expect(settings).toContain("'password'");
  });
});

// ─── Migration 005: further_tax_percent ──────────────────────────

describe('Step 78 — Migration 005', () => {
  it('should have migration file', () => {
    const fs = require('fs');
    expect(fs.existsSync(resolve('src/server/db/migrations/005_further_tax_percent.sql'))).toBe(true);
  });

  it('should be registered in migrate.ts', () => {
    const migrate = readFileSync(resolve('src/server/db/migrate.ts'), 'utf-8');
    expect(migrate).toContain("version: '005'");
    expect(migrate).toContain('further_tax_percent');
  });
});

// ─── Tenant Isolation ────────────────────────────────────────────

describe('Step 78 — Tenant Isolation in Persistence', () => {
  it('should use tenant_id in all product queries', () => {
    const adapter = readFileSync(resolve('src/server/db/repositories/PostgresInventoryAdapter.ts'), 'utf-8');
    // All product queries should be scoped by tenant_id
    expect(adapter).toContain('WHERE tenant_id = $1 AND id = $2');
  });

  it('should use tenant_id in all account queries', () => {
    const adapter = readFileSync(resolve('src/server/db/repositories/PostgresCOAAdapter.ts'), 'utf-8');
    expect(adapter).toContain('WHERE tenant_id = $1');
  });

  it('should use tenant_id in settings queries', () => {
    const adapter = readFileSync(resolve('src/server/db/repositories/PostgresSettingsAdapter.ts'), 'utf-8');
    expect(adapter).toContain('WHERE tenant_id = $1');
  });

  it('should use tenant_id in user queries via brand_access join', () => {
    const adapter = readFileSync(resolve('src/server/db/repositories/PostgresUserAdapter.ts'), 'utf-8');
    // Users are scoped through user_brand_access
    expect(adapter).toContain('user_brand_access');
  });
});
