/**
 * Mock Auth Service
 * In-memory mock implementation of IAuthService.
 *
 * RULE: This is where authentication business logic lives.
 * Coordinates between repositories and enforces auth rules.
 *
 * RULE: Free-text username is supported (email NOT required).
 *
 * RULE: Uses simple string comparison for client-side mock.
 * Server-side uses real bcrypt (src/server/lib/password.ts).
 *
 * RULE (46C-3): Authorization source is user_brand_access, not users.role.
 * The role returned in AuthResult and used for session creation comes from
 * the verified user_brand_access record for the requested tenant.
 */

import {
  LoginCredentials,
  AuthResult,
  SwitchTenantResult,
  UserSession,
  User,
} from '../../types/auth';
import { IAuthService } from '../../services/IAuthService';
import { ITenantRepository } from '../../repositories/ITenantRepository';
import { IUserRepository } from '../../repositories/IUserRepository';
import { IUserCredentialsRepository } from '../../repositories/IUserCredentialsRepository';
import { ISessionRepository } from '../../repositories/ISessionRepository';
import { IUserBrandAccessRepository } from '../../repositories/IUserBrandAccessRepository';
import { DEMO_PLAIN_PASSWORDS } from './MockUserCredentialsAdapter';
import { TenantPublicConfig } from '../../types/tenant';

/**
 * Mock implementation of IAuthService.
 * DEVELOPMENT ONLY - Do not use in production.
 */
export class MockAuthService implements IAuthService {
  constructor(
    private tenantRepository: ITenantRepository,
    private userRepository: IUserRepository,
    private credentialsRepository: IUserCredentialsRepository,
    private sessionRepository: ISessionRepository,
    private brandAccessRepository: IUserBrandAccessRepository
  ) {}

  /**
   * Authenticate a user with credentials.
   *
   * Authorization flow (46C-3):
   * 1. Verify tenant exists and is active
   * 2. Find user by username (legacy: within tenant)
   * 3. Verify user is active
   * 4. Verify password
   * 5. Verify user has ACTIVE user_brand_access for the requested tenant
   * 6. Derive role from user_brand_access (NOT from users.role)
   * 7. Create session with verified tenantId
   * 8. Return user with access-derived role
   */
  async authenticate(credentials: LoginCredentials): Promise<AuthResult> {
    const { username, password, tenantId } = credentials;

    // 1. Verify tenant exists and is active
    const tenant = await this.tenantRepository.getTenantById(tenantId);
    if (!tenant || !tenant.isActive) {
      return { success: false, error: 'Invalid tenant' };
    }

    // 2. Find user by username within tenant (legacy compatibility)
    const user = await this.userRepository.findByUsername(tenantId, username);
    if (!user) {
      return { success: false, error: 'Invalid credentials' };
    }

    // 3. Verify user is active
    if (!user.isActive) {
      return { success: false, error: 'Account is deactivated' };
    }

    // 4. Get credentials for password verification
    const userCredentials =
      await this.credentialsRepository.getCredentialsByUserId(user.id);
    if (!userCredentials) {
      return { success: false, error: 'Invalid credentials' };
    }

    // 5. Verify password using plain-text comparison (mock mode)
    // Server-side uses real bcrypt; client-side uses this for dev/preview.
    const plainPassword = DEMO_PLAIN_PASSWORDS[user.id];
    const isPasswordValid = plainPassword === password;
    if (!isPasswordValid) {
      return { success: false, error: 'Invalid credentials' };
    }

    // 6. Verify user has ACTIVE user_brand_access for the requested tenant
    const access = await this.brandAccessRepository.getByUserAndTenant(user.id, tenantId);
    if (!access || !access.isActive) {
      return { success: false, error: 'Invalid credentials' };
    }

    // 7. Derive role from user_brand_access (NOT from users.role)
    const accessDerivedRole = access.role;

    // 8. Create session with verified tenantId
    const session = await this.sessionRepository.createSession(
      tenantId,
      user.id
    );

    // 9. Return user with access-derived role (overrides users.role)
    const authorizedUser: User = {
      ...user,
      role: accessDerivedRole,
    };

    return {
      success: true,
      session,
      user: authorizedUser,
    };
  }

  /**
   * Validate an existing session.
   */
  async validateSession(sessionId: string): Promise<UserSession | null> {
    return this.sessionRepository.getSession(sessionId);
  }

  /**
   * End a session (logout).
   */
  async logout(sessionId: string): Promise<boolean> {
    return this.sessionRepository.deleteSession(sessionId);
  }

  /**
   * Get user by session.
   */
  async getUserBySession(sessionId: string): Promise<User | null> {
    const session = await this.sessionRepository.getSession(sessionId);
    if (!session) {
      return null;
    }
    return this.userRepository.findById(session.userId);
  }

  /**
   * Refresh a session.
   */
  async refreshSession(sessionId: string): Promise<UserSession | null> {
    const session = await this.sessionRepository.getSession(sessionId);
    if (!session) {
      return null;
    }
    // Delete old session and create new one
    await this.sessionRepository.deleteSession(sessionId);
    return this.sessionRepository.createSession(
      session.tenantId,
      session.userId
    );
  }

  /**
   * Switch tenant context for an authenticated session.
   *
   * Flow (46C-4):
   * 1. Validate current session exists
   * 2. Verify user is active
   * 3. Validate target tenant exists and is active
   * 4. Verify user has ACTIVE brand access for target tenant
   * 5. Delete old session (prevent session fixation)
   * 6. Create new session with target tenantId
   * 7. Return user with access-derived role for new tenant
   */
  async switchTenant(sessionId: string, targetTenantId: string): Promise<SwitchTenantResult> {
    // 1. Validate current session exists
    const session = await this.sessionRepository.getSession(sessionId);
    if (!session) {
      return { success: false, error: 'Invalid or expired session' };
    }

    // 2. Verify user is active
    const user = await this.userRepository.findById(session.userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    if (!user.isActive) {
      return { success: false, error: 'Account is deactivated' };
    }

    // 3. Validate target tenant exists and is active
    const tenant = await this.tenantRepository.getTenantById(targetTenantId);
    if (!tenant || !tenant.isActive) {
      return { success: false, error: 'Invalid or inactive tenant' };
    }

    // 4. Verify user has ACTIVE brand access for target tenant
    const access = await this.brandAccessRepository.getByUserAndTenant(user.id, targetTenantId);
    if (!access || !access.isActive) {
      return { success: false, error: 'Not authorized for this brand' };
    }

    // 5. Delete old session (prevent session fixation)
    await this.sessionRepository.deleteSession(sessionId);

    // 6. Create new session with target tenantId
    const newSession = await this.sessionRepository.createSession(
      targetTenantId,
      user.id
    );

    // 7. Return user with access-derived role for new tenant
    const authorizedUser: User = {
      ...user,
      tenantId: targetTenantId,
      role: access.role,
    };

    return {
      success: true,
      session: newSession,
      user: authorizedUser,
    };
  }

  /**
   * Get all authorized tenants for a user.
   * Returns only tenants where the user has ACTIVE brand access
   * and the tenant itself is active.
   */
  async getAuthorizedTenants(userId: string): Promise<TenantPublicConfig[]> {
    const activeAccess = await this.brandAccessRepository.getActiveByUserId(userId);
    const tenants: TenantPublicConfig[] = [];

    for (const access of activeAccess) {
      const tenant = await this.tenantRepository.getTenantById(access.tenantId);
      if (tenant && tenant.isActive) {
        tenants.push({
          id: tenant.id,
          slug: tenant.slug,
          brandName: tenant.brandName,
          logoUrl: tenant.logoUrl,
          primaryColor: tenant.primaryColor,
        });
      }
    }

    return tenants;
  }
}
