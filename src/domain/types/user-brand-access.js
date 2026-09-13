"use strict";
/**
 * User Brand Access Domain Types
 * Multi-brand access authorization for the ERP system.
 *
 * RULE: One user can have access to multiple brands (tenants).
 * RULE: Each access row defines the user's role for a specific brand.
 * RULE: UserBrandAccess is an additional authorization layer — it does NOT
 *       replace users.tenant_id or users.role until later migration steps.
 * RULE: OWNER is a global system role — not represented in user_brand_access.role.
 *       Owner access is expressed via ADMIN access rows for each authorized brand.
 */
Object.defineProperty(exports, "__esModule", { value: true });
