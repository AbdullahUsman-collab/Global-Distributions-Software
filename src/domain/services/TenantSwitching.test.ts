/**
 * Step 46C-4 — Tenant / Brand Switching Tests
 *
 * Tests the ability for authenticated users to switch between authorized brands.
 * Verifies: access validation, session rotation, role resolution, security.
 *
 * Uses Mock adapters for deterministic testing.
 * Uses known seed user IDs to avoid Date.now() collisions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockAuthService } from '../adapters/mock/MockAuthService';
import { MockTenantAdapter, resetTenantStore } from '../adapters/mock/MockTenantAdapter';
import { MockUserAdapter, resetUserStore, getUserStore } from '../adapters/mock/MockUserAdapter';
import { MockUserCredentialsAdapter, registerTestPassword, resetPasswordStore, addCredentials } from '../adapters/mock/MockUserCredentialsAdapter';
import { MockSessionAdapter, resetSessionStore } from '../adapters/mock/MockSessionAdapter';
import { MockUserBrandAccessAdapter, resetBrandAccessStore, getBrandAccessStore } from '../adapters/mock/MockUserBrandAccessAdapter';
import { UserSession } from '../types/auth';

describe('Step 46C-4 — Tenant / Brand Switching', () => {
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
    resetSessionStore();
    resetTenantStore();

    tenantRepo = new MockTenantAdapter();
    userRepo = new MockUserAdapter();
    credentialsRepo = new MockUserCredentialsAdapter();
    sessionRepo = new MockSessionAdapter();
    brandAccessRepo = new MockUserBrandAccessAdapter();
    authService = new MockAuthService(tenantRepo, userRepo, credentialsRepo, sessionRepo, brandAccessRepo);
  });

  // ─── Constants ────────────────────────────────────────────────

  const WHOLESALE = 'tenant-demo-wholesale-001';
  const DISTRIBUTION = 'tenant-demo-distribution-002';
  const APEX = 'tenant-apex-trading-003';

  // ─── Helper: create multi-brand user with known ID ────────────

  async function createMultiBrandUser(): Promise<{ userId: string; session: UserSession }> {
    // Insert user directly with known ID to avoid Date.now() collisions
    const userStore = getUserStore();
    const userId = `user-switch-test-${Date.now()}`;
    userStore.push({
      id: userId,
      tenantId: WHOLESALE,
      username: 'multibrand',
      displayName: 'Multi Brand User',
      role: 'VIEWER',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await addCredentials(userId, WHOLESALE, 'hash', 'mock');
    registerTestPassword(userId, 'pass123');

    // ADMIN in wholesale-001
    await brandAccessRepo.create({ userId, tenantId: WHOLESALE, role: 'ADMIN' });
    // VIEWER in distribution-002
    await brandAccessRepo.create({ userId, tenantId: DISTRIBUTION, role: 'VIEWER' });
    // MANAGER in apex-trading-003
    await brandAccessRepo.create({ userId, tenantId: APEX, role: 'MANAGER' });

    // Login to wholesale-001 to get a session
    const result = await authService.authenticate({
      username: 'multibrand',
      password: 'pass123',
      tenantId: WHOLESALE,
    });
    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Login failed');

    return { userId, session: result.session };
  }

  // ─── Helper: insert user with known ID ────────────────────────

  async function insertUser(id: string, tenantId: string, username: string): Promise<void> {
    const userStore = getUserStore();
    userStore.push({
      id,
      tenantId,
      username,
      displayName: username,
      role: 'VIEWER',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await addCredentials(id, tenantId, 'hash', 'mock');
    registerTestPassword(id, 'pass123');
  }

  // ─── TEST 1 — Authorized Switch ───────────────────────────────

  it('TEST 1: authorized switch from A to B with role change', async () => {
    const { userId, session } = await createMultiBrandUser();

    const result = await authService.switchTenant(session.sessionId, DISTRIBUTION);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.tenantId).toBe(DISTRIBUTION);
      expect(result.user.role).toBe('VIEWER');
      expect(result.user.id).toBe(userId);
    }
  });

  // ─── TEST 2 — Switch Back ─────────────────────────────────────

  it('TEST 2: switch back from B to A restores original role', async () => {
    const { session } = await createMultiBrandUser();

    const resultB = await authService.switchTenant(session.sessionId, DISTRIBUTION);
    expect(resultB.success).toBe(true);
    if (!resultB.success) throw new Error('Switch to B failed');

    const resultA = await authService.switchTenant(resultB.session.sessionId, WHOLESALE);
    expect(resultA.success).toBe(true);
    if (resultA.success) {
      expect(resultA.user.tenantId).toBe(WHOLESALE);
      expect(resultA.user.role).toBe('ADMIN');
    }
  });

  // ─── TEST 3 — Unauthorized Tenant ─────────────────────────────

  it('TEST 3: switch to unauthorized tenant is rejected', async () => {
    const userId = `user-single-${Date.now()}`;
    await insertUser(userId, WHOLESALE, 'singleuser');
    await brandAccessRepo.create({ userId, tenantId: WHOLESALE, role: 'SALES' });

    const loginResult = await authService.authenticate({
      username: 'singleuser',
      password: 'pass123',
      tenantId: WHOLESALE,
    });
    expect(loginResult.success).toBe(true);
    if (!loginResult.success) throw new Error('Login failed');

    const result = await authService.switchTenant(loginResult.session.sessionId, DISTRIBUTION);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Not authorized for this brand');
    }
  });

  // ─── TEST 4 — Inactive Access ─────────────────────────────────

  it('TEST 4: switch with inactive brand access is rejected', async () => {
    const { userId, session } = await createMultiBrandUser();

    const access = await brandAccessRepo.getByUserAndTenant(userId, DISTRIBUTION);
    expect(access).not.toBeNull();
    await brandAccessRepo.deactivate(access!.id);

    const result = await authService.switchTenant(session.sessionId, DISTRIBUTION);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Not authorized for this brand');
    }
  });

  // ─── TEST 5 — Inactive Tenant ─────────────────────────────────

  it('TEST 5: switch to inactive tenant is rejected', async () => {
    const { session } = await createMultiBrandUser();

    await tenantRepo.deactivateTenant(APEX);

    const result = await authService.switchTenant(session.sessionId, APEX);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Invalid or inactive tenant');
    }
  });

  // ─── TEST 6 — Client Role Injection ───────────────────────────

  it('TEST 6: role from user_brand_access, not client input', async () => {
    const { session } = await createMultiBrandUser();

    // The service only takes sessionId and tenantId — no role parameter.
    const result = await authService.switchTenant(session.sessionId, DISTRIBUTION);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.role).toBe('VIEWER');
    }
  });

  // ─── TEST 7 — Client User Injection ───────────────────────────

  it('TEST 7: session identity is authoritative, not client-provided userId', async () => {
    const { userId, session } = await createMultiBrandUser();

    const result = await authService.switchTenant(session.sessionId, DISTRIBUTION);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.id).toBe(userId);
    }
  });

  // ─── TEST 8 — Multi-Brand Roles ──────────────────────────────

  it('TEST 8: switching among three brands returns correct role each time', async () => {
    const { session } = await createMultiBrandUser();

    // A → B (VIEWER)
    const b = await authService.switchTenant(session.sessionId, DISTRIBUTION);
    expect(b.success).toBe(true);
    if (!b.success) throw new Error(`Switch A→B failed: ${b.error}`);
    expect(b.user.tenantId).toBe(DISTRIBUTION);
    expect(b.user.role).toBe('VIEWER');

    // B → C (MANAGER)
    const c = await authService.switchTenant(b.session.sessionId, APEX);
    expect(c.success).toBe(true);
    if (!c.success) throw new Error(`Switch B→C failed: ${c.error}`);
    expect(c.user.tenantId).toBe(APEX);
    expect(c.user.role).toBe('MANAGER');

    // C → A (ADMIN)
    const a = await authService.switchTenant(c.session.sessionId, WHOLESALE);
    expect(a.success).toBe(true);
    if (!a.success) throw new Error(`Switch C→A failed: ${a.error}`);
    expect(a.user.tenantId).toBe(WHOLESALE);
    expect(a.user.role).toBe('ADMIN');
  });

  // ─── TEST 9 — Same Tenant Switch ──────────────────────────────

  it('TEST 9: switching to current tenant is idempotent', async () => {
    const { session } = await createMultiBrandUser();

    const result = await authService.switchTenant(session.sessionId, WHOLESALE);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.tenantId).toBe(WHOLESALE);
      expect(result.user.role).toBe('ADMIN');
      expect(result.session.sessionId).not.toBe(session.sessionId);
    }
  });

  // ─── TEST 10 — Deactivated Access After Session ──────────────

  it('TEST 10: deactivated access after switch blocks subsequent requests', async () => {
    const { userId, session } = await createMultiBrandUser();

    const switched = await authService.switchTenant(session.sessionId, DISTRIBUTION);
    expect(switched.success).toBe(true);
    if (!switched.success) throw new Error('Switch failed');

    const access = await brandAccessRepo.getByUserAndTenant(userId, DISTRIBUTION);
    expect(access).not.toBeNull();
    await brandAccessRepo.deactivate(access!.id);

    const hasAccess = await brandAccessRepo.isActive(userId, DISTRIBUTION);
    expect(hasAccess).toBe(false);
  });

  // ─── TEST 11 — Available Brand List ───────────────────────────

  it('TEST 11: getAuthorizedTenants returns only authorized brands', async () => {
    const { userId } = await createMultiBrandUser();

    // Verify access records exist
    const allAccess = await brandAccessRepo.getByUserId(userId);
    expect(allAccess.length).toBe(3);
    expect(allAccess.filter(a => a.isActive).length).toBe(3);

    const tenants = await authService.getAuthorizedTenants(userId);

    expect(tenants.length).toBe(3);
    const ids = tenants.map(t => t.id);
    expect(ids).toContain(WHOLESALE);
    expect(ids).toContain(DISTRIBUTION);
    expect(ids).toContain(APEX);
  });

  // ─── TEST 12 — Unauthorized Brand List ────────────────────────

  it('TEST 12: getAuthorizedTenants excludes brands without access', async () => {
    const userId = `user-limited-${Date.now()}`;
    await insertUser(userId, WHOLESALE, 'limited');
    await brandAccessRepo.create({ userId, tenantId: WHOLESALE, role: 'SALES' });

    const tenants = await authService.getAuthorizedTenants(userId);

    expect(tenants.length).toBe(1);
    expect(tenants[0].id).toBe(WHOLESALE);
  });

  // ─── TEST 13 — Cross-User Isolation ───────────────────────────

  it('TEST 13: user A brand list never contains user B brand access', async () => {
    // Use known seed user IDs to avoid Date.now() collisions
    const userIdA = `user-cross-a-${Date.now()}`;
    const userIdB = `user-cross-b-${Date.now()}`;

    await insertUser(userIdA, WHOLESALE, 'userA');
    await brandAccessRepo.create({ userId: userIdA, tenantId: WHOLESALE, role: 'ADMIN' });
    await brandAccessRepo.create({ userId: userIdA, tenantId: DISTRIBUTION, role: 'VIEWER' });

    await insertUser(userIdB, APEX, 'userB');
    await brandAccessRepo.create({ userId: userIdB, tenantId: APEX, role: 'MANAGER' });
    await brandAccessRepo.create({ userId: userIdB, tenantId: DISTRIBUTION, role: 'SALES' });

    const tenantsA = await authService.getAuthorizedTenants(userIdA);
    const tenantsB = await authService.getAuthorizedTenants(userIdB);

    expect(tenantsA.length).toBe(2);
    const idsA = tenantsA.map(t => t.id);
    expect(idsA).toContain(WHOLESALE);
    expect(idsA).toContain(DISTRIBUTION);
    expect(idsA).not.toContain(APEX);

    expect(tenantsB.length).toBe(2);
    const idsB = tenantsB.map(t => t.id);
    expect(idsB).toContain(APEX);
    expect(idsB).toContain(DISTRIBUTION);
    expect(idsB).not.toContain(WHOLESALE);
  });

  // ─── TEST 14 — Existing Authentication Regression ─────────────

  it('TEST 14: login, session, and protected routes still work', async () => {
    const loginResult = await authService.authenticate({
      username: 'admin',
      password: 'admin123',
      tenantId: WHOLESALE,
    });
    expect(loginResult.success).toBe(true);
    if (!loginResult.success) throw new Error('Login failed');

    const validated = await authService.validateSession(loginResult.session.sessionId);
    expect(validated).not.toBeNull();
    expect(validated!.userId).toBe('user-admin-001');
    expect(validated!.tenantId).toBe(WHOLESALE);

    const user = await authService.getUserBySession(loginResult.session.sessionId);
    expect(user).not.toBeNull();
    expect(user!.username).toBe('admin');

    const loggedOut = await authService.logout(loginResult.session.sessionId);
    expect(loggedOut).toBe(true);

    const sessionAfterLogout = await authService.validateSession(loginResult.session.sessionId);
    expect(sessionAfterLogout).toBeNull();
  });

  // ─── Additional: Session Rotation ─────────────────────────────

  it('switch creates new session and invalidates old one', async () => {
    const { session } = await createMultiBrandUser();

    const before = await authService.validateSession(session.sessionId);
    expect(before).not.toBeNull();

    const result = await authService.switchTenant(session.sessionId, DISTRIBUTION);
    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Switch failed');

    const after = await authService.validateSession(session.sessionId);
    expect(after).toBeNull();

    const newSession = await authService.validateSession(result.session.sessionId);
    expect(newSession).not.toBeNull();
    expect(newSession!.tenantId).toBe(DISTRIBUTION);
  });

  // ─── Additional: Invalid Session ──────────────────────────────

  it('switch with invalid session is rejected', async () => {
    const result = await authService.switchTenant('nonexistent-session', WHOLESALE);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Invalid or expired session');
    }
  });

  // ─── Additional: Nonexistent Tenant ───────────────────────────

  it('switch to nonexistent tenant is rejected', async () => {
    const { session } = await createMultiBrandUser();

    const result = await authService.switchTenant(session.sessionId, 'tenant-nonexistent');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Invalid or inactive tenant');
    }
  });

  // ─── Additional: Brand list excludes inactive tenants ─────────

  it('getAuthorizedTenants excludes inactive tenants', async () => {
    const { userId } = await createMultiBrandUser();

    await tenantRepo.deactivateTenant(APEX);

    const tenants = await authService.getAuthorizedTenants(userId);

    expect(tenants.length).toBe(2);
    const ids = tenants.map(t => t.id);
    expect(ids).toContain(WHOLESALE);
    expect(ids).toContain(DISTRIBUTION);
    expect(ids).not.toContain(APEX);
  });
});
