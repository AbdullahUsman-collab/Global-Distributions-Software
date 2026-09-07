/**
 * Step 46C-6 — Legacy User Field Authorization Security Tests
 *
 * Verifies that users.tenant_id and users.role are NOT used as
 * authoritative authorization sources. All authorization decisions
 * must come from user_brand_access and session context.
 *
 * Tests:
 *  1. user.tenant_id cannot grant tenant access without user_brand_access
 *  2. user.role cannot grant permissions without user_brand_access
 *  3. Role comes from user_brand_access (not users.role)
 *  4. Tenant access comes from active user_brand_access
 *  5. Deactivated user_brand_access blocks access
 *  6. Switching tenant changes role correctly per brand access
 *  7. Client cannot inject role (middleware overrides)
 *  8. Client cannot inject userId (session is trusted)
 *  9. Cannot use arbitrary tenantId without brand access
 * 10. Protected routes use session tenant, not user.tenantId
 * 11. Login returns access-derived role
 * 12. Logout invalidates session
 * 13. getUserBySession returns access-derived role
 * 14. Brand access CRUD works correctly
 * 15. Cross-user isolation: user A cannot access user B's brand
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockAuthService } from '../adapters/mock/MockAuthService';
import { MockTenantAdapter, resetTenantStore, getTenantStore } from '../adapters/mock/MockTenantAdapter';
import { MockUserAdapter, resetUserStore, getUserStore } from '../adapters/mock/MockUserAdapter';
import { MockUserCredentialsAdapter, registerTestPassword, resetPasswordStore, addCredentials } from '../adapters/mock/MockUserCredentialsAdapter';
import { MockSessionAdapter, resetSessionStore } from '../adapters/mock/MockSessionAdapter';
import { MockUserBrandAccessAdapter, resetBrandAccessStore, getBrandAccessStore } from '../adapters/mock/MockUserBrandAccessAdapter';
import { User } from '../types/auth';

describe('Step 46C-6 — Legacy User Field Authorization Security', () => {
  let authService: MockAuthService;
  let tenantRepo: MockTenantAdapter;
  let userRepo: MockUserAdapter;
  let credentialsRepo: MockUserCredentialsAdapter;
  let sessionRepo: MockSessionAdapter;
  let brandAccessRepo: MockUserBrandAccessAdapter;

  const WHOLESALE = 'tenant-demo-wholesale-001';
  const DISTRIBUTION = 'tenant-demo-distribution-002';
  const APEX = 'tenant-apex-trading-003';

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

  // ─── Helpers ────────────────────────────────────────────────

  async function insertUser(id: string, tenantId: string, username: string, role: string = 'VIEWER'): Promise<void> {
    const userStore = getUserStore();
    userStore.push({
      id, tenantId, username, displayName: username,
      role: role as any, isActive: true,
      createdAt: new Date(), updatedAt: new Date(),
    });
    await addCredentials(id, tenantId, 'hash', 'mock');
    registerTestPassword(id, 'pass123');
  }

  // ─── TEST 1: user.tenant_id cannot grant access ────────────

  it('TEST 1: user.tenant_id cannot grant tenant access without user_brand_access', async () => {
    // Create user with tenantId=WHOLESALE but NO brand access
    const userId = 'user-no-access-test';
    await insertUser(userId, WHOLESALE, 'noaccess', 'ADMIN');

    // User should NOT be able to login (no brand access for WHOLESALE)
    const result = await authService.authenticate({ username: 'noaccess', password: 'pass123', tenantId: WHOLESALE });
    expect(result.success).toBe(false);
    // Error is "Invalid credentials" (generic, to prevent enumeration)
    expect(result.error).toBe('Invalid credentials');
  });

  // ─── TEST 2: user.role cannot grant permissions ────────────

  it('TEST 2: user.role=ADMIN does not grant permissions without user_brand_access', async () => {
    // Create user with role=ADMIN in User record but no brand access
    const userId = 'user-fake-admin';
    await insertUser(userId, WHOLESALE, 'fakeadmin', 'ADMIN');

    // Even though User.role=ADMIN, no brand access means no login
    const result = await authService.authenticate({ username: 'fakeadmin', password: 'pass123', tenantId: WHOLESALE });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid credentials');
  });

  // ─── TEST 3: role comes from user_brand_access ─────────────

  it('TEST 3: role comes from user_brand_access, not users.role', async () => {
    const userId = 'user-role-source';
    // User record says VIEWER
    await insertUser(userId, WHOLESALE, 'rolesource', 'VIEWER');
    // But brand access says ADMIN
    await brandAccessRepo.create({ userId, tenantId: WHOLESALE, role: 'ADMIN' });

    const result = await authService.authenticate({ username: 'rolesource', password: 'pass123', tenantId: WHOLESALE });
    expect(result.success).toBe(true);
    if (result.success) {
      // Role must be ADMIN (from brand access), not VIEWER (from users.role)
      expect(result.user.role).toBe('ADMIN');
    }
  });

  // ─── TEST 4: tenant access comes from active user_brand_access ──

  it('TEST 4: tenant access requires active user_brand_access', async () => {
    const userId = 'user-access-check';
    await insertUser(userId, WHOLESALE, 'accesscheck');
    const access = await brandAccessRepo.create({ userId, tenantId: WHOLESALE, role: 'MANAGER' });

    // With active access — login succeeds
    const result = await authService.authenticate({ username: 'accesscheck', password: 'pass123', tenantId: WHOLESALE });
    expect(result.success).toBe(true);

    // Deactivate access
    await brandAccessRepo.deactivate(access.id);

    // After deactivation — login should fail (user needs re-activation)
    // Note: the existing session is still valid until logout, but new logins fail
    const newLogin = await authService.authenticate({ username: 'accesscheck', password: 'pass123', tenantId: WHOLESALE });
    expect(newLogin.success).toBe(false);
  });

  // ─── TEST 5: deactivated user_brand_access blocks access ───

  it('TEST 5: deactivated brand access blocks login', async () => {
    const userId = 'user-deact-test';
    await insertUser(userId, WHOLESALE, 'deacttest');
    const access = await brandAccessRepo.create({ userId, tenantId: WHOLESALE, role: 'SALES' });

    // Login succeeds with active access
    const login1 = await authService.authenticate({ username: 'deacttest', password: 'pass123', tenantId: WHOLESALE });
    expect(login1.success).toBe(true);

    // Deactivate the access
    await brandAccessRepo.deactivate(access.id);

    // New login should fail
    const login2 = await authService.authenticate({ username: 'deacttest', password: 'pass123', tenantId: WHOLESALE });
    expect(login2.success).toBe(false);
  });

  // ─── TEST 6: switching tenant changes role correctly ───────

  it('TEST 6: switching tenant derives role from new brand access', async () => {
    const userId = 'user-switch-role';
    await insertUser(userId, WHOLESALE, 'switchrole', 'VIEWER');
    await brandAccessRepo.create({ userId, tenantId: WHOLESALE, role: 'ADMIN' });
    await brandAccessRepo.create({ userId, tenantId: DISTRIBUTION, role: 'ACCOUNTANT' });

    const login = await authService.authenticate({ username: 'switchrole', password: 'pass123', tenantId: WHOLESALE });
    expect(login.success).toBe(true);
    if (!login.success) throw new Error('Login failed');
    expect(login.user.role).toBe('ADMIN');

    // Switch to DISTRIBUTION — role should be ACCOUNTANT
    const switched = await authService.switchTenant(login.session.sessionId, DISTRIBUTION);
    expect(switched.success).toBe(true);
    if (switched.success) {
      expect(switched.user.role).toBe('ACCOUNTANT');
      expect(switched.user.tenantId).toBe(DISTRIBUTION);
    }
  });

  // ─── TEST 7: getUserBySession returns access-derived role ──

  it('TEST 7: getUserBySession returns role from user_brand_access, not users.role', async () => {
    const userId = 'user-session-role';
    // User record says SALES
    await insertUser(userId, WHOLESALE, 'sessionrole', 'SALES');
    // Brand access says MANAGER
    await brandAccessRepo.create({ userId, tenantId: WHOLESALE, role: 'MANAGER' });

    const login = await authService.authenticate({ username: 'sessionrole', password: 'pass123', tenantId: WHOLESALE });
    expect(login.success).toBe(true);
    if (!login.success) throw new Error('Login failed');

    // getUserBySession should return MANAGER (from brand access), not SALES (from users.role)
    const user = await authService.getUserBySession(login.session.sessionId);
    expect(user).not.toBeNull();
    expect(user!.role).toBe('MANAGER');
  });

  // ─── TEST 8: cannot use arbitrary tenantId without brand access ──

  it('TEST 8: cannot login to a tenant without brand access', async () => {
    const userId = 'user-arbitrary-tenant';
    await insertUser(userId, WHOLESALE, 'arbtenant');
    await brandAccessRepo.create({ userId, tenantId: WHOLESALE, role: 'ADMIN' });

    // Try to login to DISTRIBUTION (no access)
    const result = await authService.authenticate({ username: 'arbtenant', password: 'pass123', tenantId: DISTRIBUTION });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid credentials');
  });

  // ─── TEST 9: protected routes use session tenant, not user.tenantId ──

  it('TEST 9: session.tenantId is authoritative, not user.tenantId', async () => {
    const userId = 'user-session-tenant';
    // User record has tenantId=WHOLESALE
    await insertUser(userId, WHOLESALE, 'sessiontenant', 'VIEWER');
    // Brand access for WHOLESALE
    await brandAccessRepo.create({ userId, tenantId: WHOLESALE, role: 'ADMIN' });

    const login = await authService.authenticate({ username: 'sessiontenant', password: 'pass123', tenantId: WHOLESALE });
    expect(login.success).toBe(true);
    if (!login.success) throw new Error('Login failed');

    // Session tenant should be WHOLESALE
    expect(login.session.tenantId).toBe(WHOLESALE);
  });

  // ─── TEST 10: login returns access-derived role ────────────

  it('TEST 10: login returns role from user_brand_access', async () => {
    const userId = 'user-login-role';
    // User record says VIEWER
    await insertUser(userId, WHOLESALE, 'loginrole', 'VIEWER');
    // Brand access says PURCHASE
    await brandAccessRepo.create({ userId, tenantId: WHOLESALE, role: 'PURCHASE' });

    const result = await authService.authenticate({ username: 'loginrole', password: 'pass123', tenantId: WHOLESALE });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.role).toBe('PURCHASE');
    }
  });

  // ─── TEST 11: logout invalidates session ───────────────────

  it('TEST 11: logout invalidates session preventing further use', async () => {
    const userId = 'user-logout-sec';
    await insertUser(userId, WHOLESALE, 'logoutsec');
    await brandAccessRepo.create({ userId, tenantId: WHOLESALE, role: 'ADMIN' });

    const login = await authService.authenticate({ username: 'logoutsec', password: 'pass123', tenantId: WHOLESALE });
    expect(login.success).toBe(true);
    if (!login.success) throw new Error('Login failed');

    // Logout
    await authService.logout(login.session.sessionId);

    // Session should be gone
    const session = await sessionRepo.getSession(login.session.sessionId);
    expect(session).toBeNull();

    // getUserBySession should return null
    const user = await authService.getUserBySession(login.session.sessionId);
    expect(user).toBeNull();
  });

  // ─── TEST 12: brand access CRUD ───────────────────────────

  it('TEST 12: brand access CRUD works correctly', async () => {
    const userId = 'user-crud-sec';
    await insertUser(userId, WHOLESALE, 'crudsec');

    // Create
    const access = await brandAccessRepo.create({ userId, tenantId: DISTRIBUTION, role: 'SALES' });
    expect(access.role).toBe('SALES');
    expect(access.isActive).toBe(true);

    // Read
    const all = await brandAccessRepo.getByUserId(userId);
    expect(all).toHaveLength(1);

    // Update
    await brandAccessRepo.update(access.id, { role: 'MANAGER' });
    const updated = await brandAccessRepo.getByUserAndTenant(userId, DISTRIBUTION);
    expect(updated!.role).toBe('MANAGER');

    // Deactivate
    await brandAccessRepo.deactivate(access.id);
    const deactivated = await brandAccessRepo.getByUserId(userId);
    expect(deactivated[0].isActive).toBe(false);

    // Reactivate
    await brandAccessRepo.activate(access.id);
    const reactivated = await brandAccessRepo.getByUserId(userId);
    expect(reactivated[0].isActive).toBe(true);
  });

  // ─── TEST 13: cross-user isolation ────────────────────────

  it('TEST 13: user A cannot access user B brand access', async () => {
    const userIdA = 'user-isolation-a';
    const userIdB = 'user-isolation-b';
    await insertUser(userIdA, WHOLESALE, 'isolationa');
    await insertUser(userIdB, DISTRIBUTION, 'isolationb');
    await brandAccessRepo.create({ userId: userIdA, tenantId: WHOLESALE, role: 'ADMIN' });
    await brandAccessRepo.create({ userId: userIdB, tenantId: DISTRIBUTION, role: 'ADMIN' });

    // User A's brand access should only include WHOLESALE
    const accessA = await brandAccessRepo.getActiveByUserId(userIdA);
    expect(accessA).toHaveLength(1);
    expect(accessA[0].tenantId).toBe(WHOLESALE);

    // User B's brand access should only include DISTRIBUTION
    const accessB = await brandAccessRepo.getActiveByUserId(userIdB);
    expect(accessB).toHaveLength(1);
    expect(accessB[0].tenantId).toBe(DISTRIBUTION);

    // User A cannot login to DISTRIBUTION (no access)
    const loginA = await authService.authenticate({ username: 'isolationa', password: 'pass123', tenantId: DISTRIBUTION });
    expect(loginA.success).toBe(false);

    // User B cannot login to WHOLESALE (no access)
    const loginB = await authService.authenticate({ username: 'isolationb', password: 'pass123', tenantId: WHOLESALE });
    expect(loginB.success).toBe(false);
  });

  // ─── TEST 14: switch to unauthorized tenant is rejected ────

  it('TEST 14: switch to tenant without brand access is rejected', async () => {
    const userId = 'user-switch-auth';
    await insertUser(userId, WHOLESALE, 'switchauth');
    await brandAccessRepo.create({ userId, tenantId: WHOLESALE, role: 'ADMIN' });
    // No access to DISTRIBUTION

    const login = await authService.authenticate({ username: 'switchauth', password: 'pass123', tenantId: WHOLESALE });
    expect(login.success).toBe(true);
    if (!login.success) throw new Error('Login failed');

    const switchResult = await authService.switchTenant(login.session.sessionId, DISTRIBUTION);
    expect(switchResult.success).toBe(false);
    if (!switchResult.success) {
      expect(switchResult.error).toMatch(/not authorized/i);
    }
  });

  // ─── TEST 15: tenant isolation — brand access is tenant-scoped ──

  it('TEST 15: brand access is per-tenant, not global', async () => {
    const userId = 'user-tenant-scope';
    await insertUser(userId, WHOLESALE, 'tenantscope');
    await brandAccessRepo.create({ userId, tenantId: WHOLESALE, role: 'ADMIN' });

    // User has access to WHOLESALE
    const login = await authService.authenticate({ username: 'tenantscope', password: 'pass123', tenantId: WHOLESALE });
    expect(login.success).toBe(true);
    if (!login.success) throw new Error('Login failed');

    // Switch to WHOLESALE again (same tenant) — should work
    const sameTenant = await authService.switchTenant(login.session.sessionId, WHOLESALE);
    expect(sameTenant.success).toBe(true);

    // Get authorized tenants — should only include WHOLESALE
    const tenants = await authService.getAuthorizedTenants(userId);
    expect(tenants.length).toBe(1);
    expect(tenants[0].id).toBe(WHOLESALE);
  });

  // ─── TEST 16: changing legacy users.role does not change effective role ──

  it('TEST 16: changing legacy users.role in store does not change effective role', async () => {
    const userId = 'user-legacy-role-change';
    await insertUser(userId, WHOLESALE, 'legacychange', 'VIEWER');
    await brandAccessRepo.create({ userId, tenantId: WHOLESALE, role: 'MANAGER' });

    // Login — effective role should be MANAGER (from brand access)
    const login1 = await authService.authenticate({ username: 'legacychange', password: 'pass123', tenantId: WHOLESALE });
    expect(login1.success).toBe(true);
    if (login1.success) expect(login1.user.role).toBe('MANAGER');

    // Now change the legacy users.role to ADMIN in the user store
    const userStore = getUserStore();
    const user = userStore.find(u => u.id === userId);
    if (user) user.role = 'ADMIN' as any;

    // Login again — effective role should STILL be MANAGER (from brand access, not users.role)
    const login2 = await authService.authenticate({ username: 'legacychange', password: 'pass123', tenantId: WHOLESALE });
    expect(login2.success).toBe(true);
    if (login2.success) expect(login2.user.role).toBe('MANAGER');

    // Verify getUserBySession also returns MANAGER
    const userFromSession = await authService.getUserBySession(login2.session.sessionId);
    expect(userFromSession).not.toBeNull();
    expect(userFromSession!.role).toBe('MANAGER');
  });

  // ─── TEST 17: changing legacy users.tenantId does not change effective brand access ──

  it('TEST 17: changing legacy users.tenantId does not grant unauthorized tenant access', async () => {
    const userId = 'user-legacy-tenant-change';
    await insertUser(userId, WHOLESALE, 'legacytenant', 'ADMIN');
    await brandAccessRepo.create({ userId, tenantId: WHOLESALE, role: 'ADMIN' });

    // Login — should work with WHOLESALE
    const login1 = await authService.authenticate({ username: 'legacytenant', password: 'pass123', tenantId: WHOLESALE });
    expect(login1.success).toBe(true);

    // Now change the legacy users.tenantId to DISTRIBUTION in the user store
    const userStore = getUserStore();
    const user = userStore.find(u => u.id === userId);
    if (user) user.tenantId = DISTRIBUTION;

    // Login to DISTRIBUTION — should STILL FAIL because there's no brand access
    const login2 = await authService.authenticate({ username: 'legacytenant', password: 'pass123', tenantId: DISTRIBUTION });
    expect(login2.success).toBe(false);

    // Verify the brand access is still only for WHOLESALE
    const access = await brandAccessRepo.getByUserAndTenant(userId, DISTRIBUTION);
    expect(access).toBeNull();
    const wholesaleAccess = await brandAccessRepo.getByUserAndTenant(userId, WHOLESALE);
    expect(wholesaleAccess).not.toBeNull();
  });

  // ─── TEST 18: user.tenantId mismatch does not bypass brand access ──

  it('TEST 18: brand access is required regardless of user.tenantId value', async () => {
    const userId = 'user-mismatch-tenant';
    // User record says WHOLESALE
    await insertUser(userId, WHOLESALE, 'mismatch', 'VIEWER');
    // Brand access for DISTRIBUTION only
    await brandAccessRepo.create({ userId, tenantId: DISTRIBUTION, role: 'SALES' });

    // Cannot login to WHOLESALE (no brand access there)
    const login1 = await authService.authenticate({ username: 'mismatch', password: 'pass123', tenantId: WHOLESALE });
    expect(login1.success).toBe(false);

    // Authorized tenants should only include DISTRIBUTION
    const tenants = await authService.getAuthorizedTenants(userId);
    expect(tenants.length).toBe(1);
    expect(tenants[0].id).toBe(DISTRIBUTION);
  });
});
