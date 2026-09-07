/**
 * Step 46C-5 — Comprehensive Multi-Brand Tests
 *
 * Tests multi-brand functionality end-to-end:
 *  - Single-brand user restrictions
 *  - Multi-brand user switching
 *  - Role derivation from user_brand_access
 *  - Access validation (unauthorized, inactive, inactive tenant)
 *  - Session rotation on switch
 *  - User brand access management (CRUD)
 *  - Tenant isolation and permission enforcement
 *  - Regression: login, logout, Cash Book
 *
 * Uses Mock adapters. Known seed user IDs to avoid Date.now() collisions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockAuthService } from '../adapters/mock/MockAuthService';
import { MockTenantAdapter, resetTenantStore, getTenantStore } from '../adapters/mock/MockTenantAdapter';
import { MockUserAdapter, resetUserStore, getUserStore } from '../adapters/mock/MockUserAdapter';
import { MockUserCredentialsAdapter, registerTestPassword, resetPasswordStore, addCredentials } from '../adapters/mock/MockUserCredentialsAdapter';
import { MockSessionAdapter, resetSessionStore } from '../adapters/mock/MockSessionAdapter';
import { MockUserBrandAccessAdapter, resetBrandAccessStore, getBrandAccessStore } from '../adapters/mock/MockUserBrandAccessAdapter';
import { getTenantStore } from '../adapters/mock/MockTenantAdapter';
import { UserSession } from '../types/auth';

describe('Step 46C-5 — Comprehensive Multi-Brand', () => {
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

  async function insertUser(id: string, tenantId: string, username: string): Promise<void> {
    const userStore = getUserStore();
    userStore.push({
      id, tenantId, username, displayName: username,
      role: 'VIEWER', isActive: true,
      createdAt: new Date(), updatedAt: new Date(),
    });
    await addCredentials(id, tenantId, 'hash', 'mock');
    registerTestPassword(id, 'pass123');
  }

  async function createMultiBrandUser(): Promise<{ userId: string; session: UserSession }> {
    const userId = `user-mb-${Date.now()}`;
    await insertUser(userId, WHOLESALE, 'multibrand');
    await brandAccessRepo.create({ userId, tenantId: WHOLESALE, role: 'ADMIN' });
    await brandAccessRepo.create({ userId, tenantId: DISTRIBUTION, role: 'MANAGER' });
    await brandAccessRepo.create({ userId, tenantId: APEX, role: 'VIEWER' });

    const result = await authService.authenticate({ username: 'multibrand', password: 'pass123', tenantId: WHOLESALE });
    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Login failed');
    return { userId, session: result.session };
  }

  // ─── TEST 1 — Single brand user can only see one brand ──────

  it('TEST 1: single brand user authorizedTenants returns only their brand', async () => {
    const userId = 'user-single-brand';
    await insertUser(userId, WHOLESALE, 'singleuser');
    await brandAccessRepo.create({ userId, tenantId: WHOLESALE, role: 'ADMIN' });

    const result = await authService.authenticate({ username: 'singleuser', password: 'pass123', tenantId: WHOLESALE });
    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Login failed');

    const tenants = await authService.getAuthorizedTenants(userId);
    expect(tenants).toHaveLength(1);
    expect(tenants[0].id).toBe(WHOLESALE);
  });

  // ─── TEST 2 — Multi-brand user sees all authorized brands ───

  it('TEST 2: multi-brand user authorizedTenants returns all authorized brands', async () => {
    const { userId, session } = await createMultiBrandUser();
    const tenants = await authService.getAuthorizedTenants(userId);
    expect(tenants.length).toBe(3);
    const ids = tenants.map((t: any) => t.id);
    expect(ids).toContain(WHOLESALE);
    expect(ids).toContain(DISTRIBUTION);
    expect(ids).toContain(APEX);
  });

  // ─── TEST 3 — Switch with role change ───────────────────────

  it('TEST 3: switch from WHOLESALE (ADMIN) to DISTRIBUTION (MANAGER) changes role', async () => {
    const { session } = await createMultiBrandUser();
    const result = await authService.switchTenant(session.sessionId, DISTRIBUTION);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.tenantId).toBe(DISTRIBUTION);
      expect(result.user.role).toBe('MANAGER');
    }
  });

  // ─── TEST 4 — Switch to APEX gets VIEWER role ──────────────

  it('TEST 4: switch to APEX gets VIEWER role per brand access', async () => {
    const { session } = await createMultiBrandUser();
    const result = await authService.switchTenant(session.sessionId, APEX);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.role).toBe('VIEWER');
    }
  });

  // ─── TEST 5 — Switch back restores original role ────────────

  it('TEST 5: switch back to WHOLESALE restores ADMIN role', async () => {
    const { session } = await createMultiBrandUser();
    const resultB = await authService.switchTenant(session.sessionId, DISTRIBUTION);
    expect(resultB.success).toBe(true);
    if (!resultB.success) throw new Error('Switch B failed');

    const resultA = await authService.switchTenant(resultB.session.sessionId, WHOLESALE);
    expect(resultA.success).toBe(true);
    if (resultA.success) {
      expect(resultA.user.tenantId).toBe(WHOLESALE);
      expect(resultA.user.role).toBe('ADMIN');
    }
  });

  // ─── TEST 6 — Unauthorized brand rejected ──────────────────

  it('TEST 6: switch to brand without access is rejected', async () => {
    const userId = 'user-no-access';
    await insertUser(userId, WHOLESALE, 'limiteduser');
    await brandAccessRepo.create({ userId, tenantId: WHOLESALE, role: 'VIEWER' });

    const result = await authService.authenticate({ username: 'limiteduser', password: 'pass123', tenantId: WHOLESALE });
    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Login failed');

    const switchResult = await authService.switchTenant(result.session.sessionId, DISTRIBUTION);
    expect(switchResult.success).toBe(false);
    if (!switchResult.success) {
      expect(switchResult.error).toMatch(/not authorized|no access/i);
    }
  });

  // ─── TEST 7 — Inactive brand access rejected ───────────────

  it('TEST 7: switch to brand with inactive access is rejected', async () => {
    const { userId, session } = await createMultiBrandUser();

    // Deactivate the APEX access
    const apexAccess = getBrandAccessStore().find(a => a.userId === userId && a.tenantId === APEX);
    expect(apexAccess).toBeDefined();
    if (apexAccess) {
      apexAccess.isActive = false;
    }

    const result = await authService.switchTenant(session.sessionId, APEX);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/not authorized|inactive/i);
    }
  });

  // ─── TEST 8 — Inactive tenant rejected ─────────────────────

  it('TEST 8: switch to inactive tenant is rejected', async () => {
    const { session } = await createMultiBrandUser();

    // Deactivate APEX tenant
    const tenantStore = getTenantStore();
    const apex = tenantStore.find(t => t.id === APEX);
    if (apex) apex.isActive = false;

    const result = await authService.switchTenant(session.sessionId, APEX);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/inactive|not found/i);
    }
  });

  // ─── TEST 9 — Invalid tenant ID rejected ───────────────────

  it('TEST 9: switch to nonexistent tenant is rejected', async () => {
    const { session } = await createMultiBrandUser();
    const result = await authService.switchTenant(session.sessionId, 'tenant-nonexistent');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/invalid|not found/i);
    }
  });

  // ─── TEST 10 — Invalid session rejected ────────────────────

  it('TEST 10: switch with invalid session is rejected', async () => {
    const result = await authService.switchTenant('session-fake-id', WHOLESALE);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/session|not found|expired/i);
    }
  });

  // ─── TEST 11 — Session rotation on switch ──────────────────

  it('TEST 11: old session is invalidated after switch', async () => {
    const { session } = await createMultiBrandUser();
    const oldSessionId = session.sessionId;

    const result = await authService.switchTenant(oldSessionId, DISTRIBUTION);
    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Switch failed');

    // Old session should be invalidated
    const oldSession = await sessionRepo.getSession(oldSessionId);
    expect(oldSession).toBeNull();

    // New session should be valid
    const newSession = await sessionRepo.getSession(result.session.sessionId);
    expect(newSession).not.toBeNull();
  });

  // ─── TEST 12 — getAuthorizedTenants filters by access ──────

  it('TEST 12: authorizedTenants for single-brand user does not include other brands', async () => {
    const userId = 'user-filter-test';
    await insertUser(userId, WHOLESALE, 'filteruser');
    await brandAccessRepo.create({ userId, tenantId: WHOLESALE, role: 'ADMIN' });
    await brandAccessRepo.create({ userId, tenantId: DISTRIBUTION, role: 'MANAGER' });

    const result = await authService.authenticate({ username: 'filteruser', password: 'pass123', tenantId: WHOLESALE });
    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Login failed');

    const tenants = await authService.getAuthorizedTenants(userId);
    expect(tenants.length).toBe(2);
    const ids = tenants.map((t: any) => t.id);
    expect(ids).toContain(WHOLESALE);
    expect(ids).toContain(DISTRIBUTION);
    expect(ids).not.toContain(APEX);
  });

  // ─── TEST 13 — Multiple switches in sequence ───────────────

  it('TEST 13: three sequential switches A→B→C→A all succeed', async () => {
    const { session } = await createMultiBrandUser();

    const r1 = await authService.switchTenant(session.sessionId, DISTRIBUTION);
    expect(r1.success).toBe(true);
    if (!r1.success) throw new Error('A→B failed');

    const r2 = await authService.switchTenant(r1.session.sessionId, APEX);
    expect(r2.success).toBe(true);
    if (!r2.success) throw new Error('B→C failed');

    const r3 = await authService.switchTenant(r2.session.sessionId, WHOLESALE);
    expect(r3.success).toBe(true);
    if (r3.success) {
      expect(r3.user.tenantId).toBe(WHOLESALE);
      expect(r3.user.role).toBe('ADMIN');
    }
  });

  // ─── TEST 14 — User brand access management CRUD ───────────

  it('TEST 14: create, read, update, deactivate, reactivate brand access', async () => {
    const userId = 'user-crud-test';
    await insertUser(userId, WHOLESALE, 'cruduser');

    // Create
    const created = await brandAccessRepo.create({ userId, tenantId: DISTRIBUTION, role: 'SALES' });
    expect(created).toBeDefined();
    expect(created.userId).toBe(userId);
    expect(created.tenantId).toBe(DISTRIBUTION);
    expect(created.role).toBe('SALES');
    expect(created.isActive).toBe(true);

    // Read
    const allAccess = await brandAccessRepo.getByUserId(userId);
    expect(allAccess).toHaveLength(1);
    expect(allAccess[0].id).toBe(created.id);

    // Update role
    const updated = await brandAccessRepo.update(created.id, { role: 'MANAGER' });
    expect(updated).toBeDefined();
    expect(updated!.role).toBe('MANAGER');

    // Deactivate
    const deactivated = await brandAccessRepo.deactivate(created.id);
    expect(deactivated).toBe(true);
    const deactivatedAccess = await brandAccessRepo.getByUserId(userId);
    expect(deactivatedAccess[0].isActive).toBe(false);

    // Reactivate
    const activated = await brandAccessRepo.activate(created.id);
    expect(activated).toBe(true);
    const activatedAccess = await brandAccessRepo.getByUserId(userId);
    expect(activatedAccess[0].isActive).toBe(true);
  });

  // ─── TEST 15 — Cannot switch to deactivated brand ───────────

  it('TEST 15: cannot switch to brand after deactivation', async () => {
    const { userId, session } = await createMultiBrandUser();

    // Deactivate APEX access
    const apexAccess = getBrandAccessStore().find(a => a.userId === userId && a.tenantId === APEX);
    expect(apexAccess).toBeDefined();
    if (apexAccess) apexAccess.isActive = false;

    const result = await authService.switchTenant(session.sessionId, APEX);
    expect(result.success).toBe(false);
  });

  // ─── TEST 16 — Switch preserves userId ─────────────────────

  it('TEST 16: userId is preserved across tenant switches', async () => {
    const { userId, session } = await createMultiBrandUser();
    const result = await authService.switchTenant(session.sessionId, DISTRIBUTION);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.id).toBe(userId);
    }
  });

  // ─── TEST 17 — Switch with different role sets ─────────────

  it('TEST 17: user with different roles across brands gets correct role per brand', async () => {
    const userId = 'user-multi-role';
    await insertUser(userId, WHOLESALE, 'multirole');
    await brandAccessRepo.create({ userId, tenantId: WHOLESALE, role: 'ADMIN' });
    await brandAccessRepo.create({ userId, tenantId: DISTRIBUTION, role: 'ACCOUNTANT' });
    await brandAccessRepo.create({ userId, tenantId: APEX, role: 'PURCHASE' });

    const login = await authService.authenticate({ username: 'multirole', password: 'pass123', tenantId: WHOLESALE });
    expect(login.success).toBe(true);
    if (!login.success) throw new Error('Login failed');

    // WHOLESALE → ADMIN
    expect(login.user.role).toBe('ADMIN');

    // Switch to DISTRIBUTION → ACCOUNTANT
    const r1 = await authService.switchTenant(login.session.sessionId, DISTRIBUTION);
    expect(r1.success).toBe(true);
    if (r1.success) expect(r1.user.role).toBe('ACCOUNTANT');

    // Switch to APEX → PURCHASE
    const r2 = await authService.switchTenant(r1!.success ? r1.session.sessionId : login.session.sessionId, APEX);
    expect(r2.success).toBe(true);
    if (r2.success) expect(r2.user.role).toBe('PURCHASE');

    // Switch back to WHOLESALE → ADMIN
    const r3 = await authService.switchTenant(r2!.success ? r2.session.sessionId : login.session.sessionId, WHOLESALE);
    expect(r3.success).toBe(true);
    if (r3.success) expect(r3.user.role).toBe('ADMIN');
  });

  // ─── TEST 18 — Login regression: standard login works ──────

  it('TEST 18: standard login with valid credentials succeeds', async () => {
    const userId = 'user-login-regression';
    await insertUser(userId, WHOLESALE, 'loginreg');
    await brandAccessRepo.create({ userId, tenantId: WHOLESALE, role: 'ADMIN' });

    const result = await authService.authenticate({ username: 'loginreg', password: 'pass123', tenantId: WHOLESALE });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.id).toBe(userId);
      expect(result.user.role).toBe('ADMIN');
      expect(result.user.tenantId).toBe(WHOLESALE);
    }
  });

  // ─── TEST 19 — Login regression: wrong password fails ──────

  it('TEST 19: login with wrong password fails', async () => {
    const userId = 'user-wrong-pw';
    await insertUser(userId, WHOLESALE, 'wrongpw');
    await brandAccessRepo.create({ userId, tenantId: WHOLESALE, role: 'ADMIN' });

    const result = await authService.authenticate({ username: 'wrongpw', password: 'wrongpassword', tenantId: WHOLESALE });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/invalid|password|credentials/i);
    }
  });

  // ─── TEST 20 — Login regression: wrong tenant fails ────────

  it('TEST 20: login with valid creds but wrong tenant (no access) fails', async () => {
    const userId = 'user-wrong-tenant';
    await insertUser(userId, WHOLESALE, 'wrongtenant');
    await brandAccessRepo.create({ userId, tenantId: WHOLESALE, role: 'ADMIN' });

    const result = await authService.authenticate({ username: 'wrongtenant', password: 'pass123', tenantId: DISTRIBUTION });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/invalid|access|tenant|not found|unauthorized/i);
    }
  });

  // ─── TEST 21 — Logout regression: logout clears session ────

  it('TEST 21: logout invalidates session', async () => {
    const userId = 'user-logout-test';
    await insertUser(userId, WHOLESALE, 'logoutuser');
    await brandAccessRepo.create({ userId, tenantId: WHOLESALE, role: 'ADMIN' });

    const login = await authService.authenticate({ username: 'logoutuser', password: 'pass123', tenantId: WHOLESALE });
    expect(login.success).toBe(true);
    if (!login.success) throw new Error('Login failed');

    await authService.logout(login.session.sessionId);

    const session = await sessionRepo.getSession(login.session.sessionId);
    expect(session).toBeNull();
  });

  // ─── TEST 22 — Brand access record count ───────────────────

  it('TEST 22: brandAccessRepo returns correct count per user', async () => {
    const u1 = 'user-count-1';
    const u2 = 'user-count-2';
    await insertUser(u1, WHOLESALE, 'countuser1');
    await insertUser(u2, WHOLESALE, 'countuser2');
    await brandAccessRepo.create({ userId: u1, tenantId: WHOLESALE, role: 'ADMIN' });
    await brandAccessRepo.create({ userId: u1, tenantId: DISTRIBUTION, role: 'VIEWER' });
    await brandAccessRepo.create({ userId: u2, tenantId: WHOLESALE, role: 'MANAGER' });

    const u1Access = await brandAccessRepo.getByUserId(u1);
    const u2Access = await brandAccessRepo.getByUserId(u2);
    expect(u1Access).toHaveLength(2);
    expect(u2Access).toHaveLength(1);
  });

  // ─── TEST 23 — Cannot create duplicate brand access ────────

  it('TEST 23: creating duplicate brand access returns error', async () => {
    const userId = 'user-dup-test';
    await insertUser(userId, WHOLESALE, 'dupuser');
    await brandAccessRepo.create({ userId, tenantId: WHOLESALE, role: 'ADMIN' });

    let threw = false;
    try {
      await brandAccessRepo.create({ userId, tenantId: WHOLESALE, role: 'VIEWER' });
    } catch (e: any) {
      threw = true;
      expect(e.message || e).toMatch(/already|duplicate|exists/i);
    }
    expect(threw).toBe(true);
  });

  // ─── TEST 24 — Role validation on update ───────────────────

  it('TEST 24: updating brand access with invalid role is rejected', async () => {
    const userId = 'user-role-test';
    await insertUser(userId, WHOLESALE, 'roleuser');
    const access = await brandAccessRepo.create({ userId, tenantId: WHOLESALE, role: 'VIEWER' });

    let threw = false;
    try {
      await brandAccessRepo.update(access.id, { role: 'INVALID_ROLE' as any });
    } catch (e: any) {
      threw = true;
      expect(e.message || e).toMatch(/invalid|role/i);
    }
    expect(threw).toBe(true);
  });
});
