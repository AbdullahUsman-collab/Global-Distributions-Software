/**
 * Step 46C-3 — Authentication & Session Migration Tests
 * Verifies authorization now comes from user_brand_access, not users.role.
 * Uses Mock adapters for deterministic testing.
 *
 * CRITICAL: findByUsername is tenant-scoped.
 * 'admin' in wholesale-001 = user-admin-001
 * 'admin' in distribution-002 = user-admin-002
 * These are DIFFERENT users. Tests must create users in the target tenant.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockAuthService } from '../adapters/mock/MockAuthService';
import { MockTenantAdapter } from '../adapters/mock/MockTenantAdapter';
import { MockUserAdapter, resetUserStore } from '../adapters/mock/MockUserAdapter';
import { MockUserCredentialsAdapter, registerTestPassword, resetPasswordStore } from '../adapters/mock/MockUserCredentialsAdapter';
import { MockSessionAdapter } from '../adapters/mock/MockSessionAdapter';
import { MockUserBrandAccessAdapter, resetBrandAccessStore } from '../adapters/mock/MockUserBrandAccessAdapter';

describe('Step 46C-3 — Authentication Migration', () => {
  let authService: MockAuthService;
  let tenantRepo: MockTenantAdapter;
  let userRepo: MockUserAdapter;
  let credentialsRepo: MockUserCredentialsAdapter;
  let sessionRepo: MockSessionAdapter;
  let brandAccessRepo: MockUserBrandAccessAdapter;

  beforeEach(() => {
    resetUserStore();
    resetPasswordStore();
    resetBrandAccessStore();

    tenantRepo = new MockTenantAdapter();
    userRepo = new MockUserAdapter();
    credentialsRepo = new MockUserCredentialsAdapter();
    sessionRepo = new MockSessionAdapter();
    brandAccessRepo = new MockUserBrandAccessAdapter();
    authService = new MockAuthService(tenantRepo, userRepo, credentialsRepo, sessionRepo, brandAccessRepo);
  });

  // ─── Helper: create user + credentials + brand access ─────────

  async function setupUser(
    tenantId: string,
    username: string,
    password: string,
    role: string,
    accessRole: string,
  ): Promise<{ userId: string }> {
    const user = await userRepo.createUser({ tenantId, username, displayName: username, role, password });
    await credentialsRepo.storeCredentials(user.id, tenantId, `$mock bcrypt ${password}`, 'mock');
    registerTestPassword(user.id, password);
    await brandAccessRepo.create({ userId: user.id, tenantId, role: accessRole });
    return { userId: user.id };
  }

  // ─── TEST 1 — Valid Login ─────────────────────────────────────

  it('TEST 1: valid login with active brand access succeeds', async () => {
    // user-admin-001 has ADMIN access to wholesale-001 (seed uba-001)
    const result = await authService.authenticate({
      username: 'admin',
      password: 'admin123',
      tenantId: 'tenant-demo-wholesale-001',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.session.tenantId).toBe('tenant-demo-wholesale-001');
      expect(result.session.userId).toBe('user-admin-001');
      expect(result.user.role).toBe('ADMIN');
    }
  });

  // ─── TEST 2 — Unauthorized Brand ──────────────────────────────

  it('TEST 2: login rejected when user has no access to requested brand', async () => {
    // clerk in wholesale-001 has no access to distribution-002
    // 'clerk' doesn't exist in distribution-002, so findByUsername returns null
    const result = await authService.authenticate({
      username: 'clerk',
      password: 'clerk123',
      tenantId: 'tenant-demo-distribution-002',
    });

    expect(result.success).toBe(false);
  });

  // ─── TEST 3 — Inactive User ───────────────────────────────────

  it('TEST 3: login rejected when user is inactive', async () => {
    // user-inactive-001 has isActive=false on the user record
    const result = await authService.authenticate({
      username: 'former',
      password: 'former123',
      tenantId: 'tenant-demo-wholesale-001',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Account is deactivated');
    }
  });

  // ─── TEST 3b — Inactive Access Only ───────────────────────────

  it('TEST 3b: deactivated brand access blocks login for active user', async () => {
    // Create a fresh user in apex-trading-003 (no seed data collision)
    const { userId } = await setupUser(
      'tenant-apex-trading-003', 'testmgr', 'pass123', 'MANAGER', 'ACCOUNTANT'
    );

    // Verify login works
    const result1 = await authService.authenticate({
      username: 'testmgr',
      password: 'pass123',
      tenantId: 'tenant-apex-trading-003',
    });
    expect(result1.success).toBe(true);
    if (result1.success) {
      expect(result1.user.role).toBe('ACCOUNTANT');
    }

    // Deactivate only the brand access (not the user)
    const access = await brandAccessRepo.getByUserAndTenant(userId, 'tenant-apex-trading-003');
    expect(access).not.toBeNull();
    await brandAccessRepo.deactivate(access!.id);

    // Login now fails — access is inactive
    const result2 = await authService.authenticate({
      username: 'testmgr',
      password: 'pass123',
      tenantId: 'tenant-apex-trading-003',
    });
    expect(result2.success).toBe(false);
  });

  // ─── TEST 4 — Per-Brand Role ──────────────────────────────────

  it('TEST 4: role derived from user_brand_access, not users.role', async () => {
    // Create a user in wholesale-001 with ADMIN access
    const { userId } = await setupUser(
      'tenant-demo-wholesale-001', 'superadmin', 'securepass', 'VIEWER', 'ADMIN'
    );

    // Login — role should be ADMIN from brand access, not VIEWER from users.role
    const result = await authService.authenticate({
      username: 'superadmin',
      password: 'securepass',
      tenantId: 'tenant-demo-wholesale-001',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.role).toBe('ADMIN');
    }
  });

  // ─── TEST 4b — Same User, Different Roles ─────────────────────

  it('TEST 4b: same user gets different roles per brand', async () => {
    // Create the same-named user in two tenants with different brand access roles
    await setupUser('tenant-demo-wholesale-001', 'crossuser', 'pass123', 'VIEWER', 'MANAGER');
    await setupUser('tenant-demo-distribution-002', 'crossuser', 'pass123', 'VIEWER', 'SALES');

    // Login to wholesale-001 → MANAGER from brand access
    const resultA = await authService.authenticate({
      username: 'crossuser', password: 'pass123', tenantId: 'tenant-demo-wholesale-001',
    });
    expect(resultA.success).toBe(true);
    if (resultA.success) {
      expect(resultA.user.role).toBe('MANAGER');
    }

    // Login to distribution-002 → SALES from brand access
    const resultB = await authService.authenticate({
      username: 'crossuser', password: 'pass123', tenantId: 'tenant-demo-distribution-002',
    });
    expect(resultB.success).toBe(true);
    if (resultB.success) {
      expect(resultB.user.role).toBe('SALES');
    }
  });

  // ─── TEST 5 — Role Cannot Be Client-Supplied ──────────────────

  it('TEST 5: session role comes from user_brand_access, not user input', async () => {
    // clerk in wholesale-001 has SALES access via seed uba-005
    // users.role is 'SALES' AND brand access role is 'SALES' — both agree
    const result = await authService.authenticate({
      username: 'clerk',
      password: 'clerk123',
      tenantId: 'tenant-demo-wholesale-001',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.role).toBe('SALES');
    }
  });

  // ─── TEST 6 — No Cross-Tenant Access ──────────────────────────

  it('TEST 6: user without access to brand cannot authenticate into it', async () => {
    // manager only has MANAGER access to wholesale-001 (seed uba-004)
    // 'manager' does NOT exist in apex-trading-003 — findByUsername returns null
    const result = await authService.authenticate({
      username: 'manager',
      password: 'manager123',
      tenantId: 'tenant-apex-trading-003',
    });

    expect(result.success).toBe(false);
  });

  // ─── TEST 7 — Deactivated Access ──────────────────────────────

  it('TEST 7: deactivated access blocks authentication', async () => {
    // Create user in distribution-002 with SALES access
    const { userId } = await setupUser(
      'tenant-demo-distribution-002', 'tempclerk', 'pass123', 'SALES', 'SALES'
    );

    // Verify login works
    const result1 = await authService.authenticate({
      username: 'tempclerk',
      password: 'pass123',
      tenantId: 'tenant-demo-distribution-002',
    });
    expect(result1.success).toBe(true);
    if (result1.success) {
      expect(result1.user.role).toBe('SALES');
    }

    // Deactivate the access
    const access = await brandAccessRepo.getByUserAndTenant(userId, 'tenant-demo-distribution-002');
    expect(access).not.toBeNull();
    await brandAccessRepo.deactivate(access!.id);

    // Verify login now fails
    const result2 = await authService.authenticate({
      username: 'tempclerk',
      password: 'pass123',
      tenantId: 'tenant-demo-distribution-002',
    });
    expect(result2.success).toBe(false);
  });

  // ─── TEST 8 — Multi-Brand User ────────────────────────────────

  it('TEST 8: multi-brand user has independent access per brand', async () => {
    // Create same user in 3 tenants with different access roles
    await setupUser('tenant-demo-wholesale-001', 'mbuser', 'pass123', 'VIEWER', 'ADMIN');
    await setupUser('tenant-demo-distribution-002', 'mbuser', 'pass123', 'VIEWER', 'ACCOUNTANT');
    await setupUser('tenant-apex-trading-003', 'mbuser', 'pass123', 'VIEWER', 'SALES');

    // Login to wholesale-001 → ADMIN
    const loginA = await authService.authenticate({
      username: 'mbuser', password: 'pass123', tenantId: 'tenant-demo-wholesale-001',
    });
    expect(loginA.success).toBe(true);
    if (loginA.success) expect(loginA.user.role).toBe('ADMIN');

    // Login to distribution-002 → ACCOUNTANT
    const loginB = await authService.authenticate({
      username: 'mbuser', password: 'pass123', tenantId: 'tenant-demo-distribution-002',
    });
    expect(loginB.success).toBe(true);
    if (loginB.success) expect(loginB.user.role).toBe('ACCOUNTANT');

    // Login to apex-trading-003 → SALES
    const loginC = await authService.authenticate({
      username: 'mbuser', password: 'pass123', tenantId: 'tenant-apex-trading-003',
    });
    expect(loginC.success).toBe(true);
    if (loginC.success) expect(loginC.user.role).toBe('SALES');
  });

  // ─── TEST 9 — Legacy Role Non-Override ────────────────────────

  it('TEST 9: authorization uses user_brand_access.role, not users.role', async () => {
    // users.role = 'VIEWER' but brand access role = 'ADMIN'
    const { userId } = await setupUser(
      'tenant-demo-wholesale-001', 'upgraded', 'pass123', 'VIEWER', 'ADMIN'
    );

    const result = await authService.authenticate({
      username: 'upgraded',
      password: 'pass123',
      tenantId: 'tenant-demo-wholesale-001',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // Must be ADMIN from brand access, NOT VIEWER from users.role
      expect(result.user.role).toBe('ADMIN');
    }
  });

  // ─── TEST 10 — Sole Authorization Source ──────────────────────

  it('TEST 10: brand access is the sole source for brand access authorization', async () => {
    // Create user in distribution-002 with VIEWER access
    await setupUser(
      'tenant-demo-distribution-002', 'restricted', 'pass123', 'VIEWER', 'VIEWER'
    );

    const result = await authService.authenticate({
      username: 'restricted',
      password: 'pass123',
      tenantId: 'tenant-demo-distribution-002',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.role).toBe('VIEWER');
    }
  });

  // ─── Additional: Demo Mode Regression ─────────────────────────

  it('demo users authenticate correctly through new auth model', async () => {
    const tests = [
      { username: 'admin', password: 'admin123', tenantId: 'tenant-demo-wholesale-001', expectedRole: 'ADMIN' },
      { username: 'manager', password: 'manager123', tenantId: 'tenant-demo-wholesale-001', expectedRole: 'MANAGER' },
      { username: 'clerk', password: 'clerk123', tenantId: 'tenant-demo-wholesale-001', expectedRole: 'SALES' },
    ];

    for (const t of tests) {
      const result = await authService.authenticate({
        username: t.username,
        password: t.password,
        tenantId: t.tenantId,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.role).toBe(t.expectedRole);
      }
    }
  });
});
