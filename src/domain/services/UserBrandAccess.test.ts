/**
 * User Brand Access — Security & Isolation Tests
 * Verifies the multi-brand access layer meets security requirements.
 * Uses MockUserBrandAccessAdapter (in-memory) for deterministic testing.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockUserBrandAccessAdapter } from '../adapters/mock/MockUserBrandAccessAdapter';

describe('UserBrandAccess — Mock Adapter Security Tests', () => {
  let adapter: MockUserBrandAccessAdapter;

  beforeEach(() => {
    adapter = new MockUserBrandAccessAdapter();
  });

  // ─── TEST 1 — User Access Lookup ─────────────────────────────

  it('TEST 1: returns brand access for authorized user', async () => {
    const access = await adapter.getByUserAndTenant('user-admin-001', 'tenant-demo-wholesale-001');
    expect(access).not.toBeNull();
    expect(access!.userId).toBe('user-admin-001');
    expect(access!.tenantId).toBe('tenant-demo-wholesale-001');
    expect(access!.role).toBe('ADMIN');
    expect(access!.isActive).toBe(true);
  });

  // ─── TEST 2 — Multiple Brand Access ──────────────────────────

  it('TEST 2: returns multiple brand access rows with independent roles', async () => {
    // Create a user with access to two brands
    await adapter.create({ userId: 'user-multi-001', tenantId: 'tenant-demo-wholesale-001', role: 'ADMIN' });
    await adapter.create({ userId: 'user-multi-001', tenantId: 'tenant-apex-trading-003', role: 'VIEWER' });

    const allAccess = await adapter.getByUserId('user-multi-001');
    expect(allAccess.length).toBe(2);

    const wholesaleAccess = allAccess.find(a => a.tenantId === 'tenant-demo-wholesale-001');
    const apexAccess = allAccess.find(a => a.tenantId === 'tenant-apex-trading-003');

    expect(wholesaleAccess).toBeDefined();
    expect(wholesaleAccess!.role).toBe('ADMIN');
    expect(apexAccess).toBeDefined();
    expect(apexAccess!.role).toBe('VIEWER');

    // Roles must be independent — not collapsed
    expect(wholesaleAccess!.role).not.toBe(apexAccess!.role);
  });

  // ─── TEST 3 — Unauthorized Brand ─────────────────────────────

  it('TEST 3: returns null for unauthorized brand', async () => {
    // user-admin-001 only has access to tenant-demo-wholesale-001
    const access = await adapter.getByUserAndTenant('user-admin-001', 'tenant-apex-trading-003');
    expect(access).toBeNull();
  });

  // ─── TEST 4 — Duplicate Access Rejection ─────────────────────

  it('TEST 4: rejects duplicate user+tenant access', async () => {
    await adapter.create({ userId: 'user-dup-001', tenantId: 'tenant-demo-wholesale-001', role: 'SALES' });

    await expect(
      adapter.create({ userId: 'user-dup-001', tenantId: 'tenant-demo-wholesale-001', role: 'MANAGER' })
    ).rejects.toThrow('Access already exists');
  });

  // ─── TEST 5 — Deactivation ───────────────────────────────────

  it('TEST 5: deactivates access and excludes from active lookup', async () => {
    const record = await adapter.create({ userId: 'user-deact-001', tenantId: 'tenant-demo-wholesale-001', role: 'SALES' });

    // Verify initially active
    expect(await adapter.isActive('user-deact-001', 'tenant-demo-wholesale-001')).toBe(true);

    // Deactivate
    const result = await adapter.deactivate(record.id);
    expect(result).toBe(true);

    // Verify no longer active
    expect(await adapter.isActive('user-deact-001', 'tenant-demo-wholesale-001')).toBe(false);

    // Verify record still exists with isActive=false
    const access = await adapter.getByUserAndTenant('user-deact-001', 'tenant-demo-wholesale-001');
    expect(access).not.toBeNull();
    expect(access!.isActive).toBe(false);

    // Verify getActiveByUserId excludes it
    const activeAccess = await adapter.getActiveByUserId('user-deact-001');
    expect(activeAccess.length).toBe(0);
  });

  // ─── TEST 6 — Reactivation ───────────────────────────────────

  it('TEST 6: reactivates access', async () => {
    const record = await adapter.create({ userId: 'user-react-001', tenantId: 'tenant-demo-wholesale-001', role: 'PURCHASE' });

    // Deactivate
    await adapter.deactivate(record.id);
    expect(await adapter.isActive('user-react-001', 'tenant-demo-wholesale-001')).toBe(false);

    // Reactivate
    const result = await adapter.activate(record.id);
    expect(result).toBe(true);

    // Verify active again
    expect(await adapter.isActive('user-react-001', 'tenant-demo-wholesale-001')).toBe(true);

    const access = await adapter.getByUserAndTenant('user-react-001', 'tenant-demo-wholesale-001');
    expect(access).not.toBeNull();
    expect(access!.isActive).toBe(true);
  });

  // ─── TEST 7 — Tenant Isolation ───────────────────────────────

  it('TEST 7: user A access never appears as user B access', async () => {
    // user-admin-001 has access to tenant-demo-wholesale-001
    const userAAccess = await adapter.getByUserId('user-admin-001');
    const userBAccess = await adapter.getByUserId('user-admin-002');

    // user-admin-001 should only see their own access
    expect(userAAccess.every(a => a.userId === 'user-admin-001')).toBe(true);

    // user-admin-002 should only see their own access
    expect(userBAccess.every(a => a.userId === 'user-admin-002')).toBe(true);

    // The records should not be the same
    const userATenantIds = userAAccess.map(a => a.tenantId);
    const userBTenantIds = userBAccess.map(a => a.tenantId);
    expect(userATenantIds).not.toEqual(userBTenantIds);
  });

  // ─── TEST 8 — Role Preservation ──────────────────────────────

  it('TEST 8: each access row preserves its assigned role independently', async () => {
    // Create user with different roles across brands
    await adapter.create({ userId: 'user-roles-001', tenantId: 'tenant-demo-wholesale-001', role: 'ADMIN' });
    await adapter.create({ userId: 'user-roles-001', tenantId: 'tenant-demo-distribution-002', role: 'ACCOUNTANT' });
    await adapter.create({ userId: 'user-roles-001', tenantId: 'tenant-apex-trading-003', role: 'VIEWER' });

    const allAccess = await adapter.getByUserId('user-roles-001');
    expect(allAccess.length).toBe(3);

    const roles = allAccess.map(a => a.role).sort();
    expect(roles).toEqual(['ACCOUNTANT', 'ADMIN', 'VIEWER']);

    // Each role must be independent — changing one does not affect others
    const wholesale = allAccess.find(a => a.tenantId === 'tenant-demo-wholesale-001')!;
    await adapter.update(wholesale.id, { role: 'MANAGER' });

    const updatedAccess = await adapter.getByUserId('user-roles-001');
    const wholesaleUpdated = updatedAccess.find(a => a.tenantId === 'tenant-demo-wholesale-001')!;
    const dist = updatedAccess.find(a => a.tenantId === 'tenant-demo-distribution-002')!;
    const apex = updatedAccess.find(a => a.tenantId === 'tenant-apex-trading-003')!;

    expect(wholesaleUpdated.role).toBe('MANAGER');
    expect(dist.role).toBe('ACCOUNTANT'); // unchanged
    expect(apex.role).toBe('VIEWER'); // unchanged
  });

  // ─── Additional: Seed Data Verification ──────────────────────

  it('seed data matches existing demo users', async () => {
    // Verify seed data exists for all demo users
    const admin001 = await adapter.getByUserAndTenant('user-admin-001', 'tenant-demo-wholesale-001');
    expect(admin001).not.toBeNull();
    expect(admin001!.role).toBe('ADMIN');

    const admin002 = await adapter.getByUserAndTenant('user-admin-002', 'tenant-demo-distribution-002');
    expect(admin002).not.toBeNull();
    expect(admin002!.role).toBe('ADMIN');

    const manager001 = await adapter.getByUserAndTenant('user-manager-001', 'tenant-demo-wholesale-001');
    expect(manager001).not.toBeNull();
    expect(manager001!.role).toBe('MANAGER');

    const clerk001 = await adapter.getByUserAndTenant('user-clerk-001', 'tenant-demo-wholesale-001');
    expect(clerk001).not.toBeNull();
    expect(clerk001!.role).toBe('SALES');

    const inactive001 = await adapter.getByUserAndTenant('user-inactive-001', 'tenant-demo-wholesale-001');
    expect(inactive001).not.toBeNull();
    expect(inactive001!.isActive).toBe(false);
  });
});
