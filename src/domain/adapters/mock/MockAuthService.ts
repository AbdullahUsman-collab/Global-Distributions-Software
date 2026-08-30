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
 */

import {
  LoginCredentials,
  AuthResult,
  UserSession,
  User,
} from '../../types/auth';
import { IAuthService } from '../../services/IAuthService';
import { ITenantRepository } from '../../repositories/ITenantRepository';
import { IUserRepository } from '../../repositories/IUserRepository';
import { IUserCredentialsRepository } from '../../repositories/IUserCredentialsRepository';
import { ISessionRepository } from '../../repositories/ISessionRepository';
import { DEMO_PLAIN_PASSWORDS } from './MockUserCredentialsAdapter';

/**
 * Mock implementation of IAuthService.
 * DEVELOPMENT ONLY - Do not use in production.
 */
export class MockAuthService implements IAuthService {
  constructor(
    private tenantRepository: ITenantRepository,
    private userRepository: IUserRepository,
    private credentialsRepository: IUserCredentialsRepository,
    private sessionRepository: ISessionRepository
  ) {}

  /**
   * Authenticate a user with credentials.
   */
  async authenticate(credentials: LoginCredentials): Promise<AuthResult> {
    const { username, password, tenantId } = credentials;

    // 1. Verify tenant exists and is active
    const tenant = await this.tenantRepository.getTenantById(tenantId);
    if (!tenant || !tenant.isActive) {
      return { success: false, error: 'Invalid tenant' };
    }

    // 2. Find user by username within tenant
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

    // 6. Create session
    const session = await this.sessionRepository.createSession(
      tenantId,
      user.id
    );

    return {
      success: true,
      session,
      user,
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
}
