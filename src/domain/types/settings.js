"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GST_TYPE_LABELS = void 0;
/**
 * Human-readable labels for GST Type display.
 */
exports.GST_TYPE_LABELS = {
    'VAT': 'Value Added Tax (VAT)',
    '3RD': 'Third Schedule',
    '8TH': 'Eighth Schedule',
};
