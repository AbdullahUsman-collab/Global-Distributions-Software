/**
 * Mock Auth Service
 * DEVELOPMENT ONLY - In-memory mock implementation of IAuthService.
 * 
 * RULE: This is where authentication business logic lives.
 * Coordinates between repositories and enforces auth rules.
 * 
 * RULE: Free-text username is supported (email NOT required).
 * 
 * RULE: This is a MOCK implementation for development only.
 * Uses simple password comparison instead of proper hashing.
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

/**
 * MOCK PASSWORD VERIFICATION - DEVELOPMENT ONLY.
 * In production, this would use bcrypt.compare() or argon2.verify().
 * 
 * For mock purposes, we use a simple comparison:
 * - Mock hashes follow pattern: $2b$10$mockHashFor{Password}{Tenant}
 * - We "verify" by checking if the password matches the pattern
 */
function mockVerifyPassword(
  password: string,
  storedHash: string
): boolean {
  // DEVELOPMENT ONLY: Simple mock verification
  // In production, use bcrypt.compare() or argon2.verify()
  const lowerPassword = password.toLowerCase();
  const lowerHash = storedHash.toLowerCase();
  
  // Check if password appears in the mock hash
  // This is a simplistic mock - NOT secure for production
  return lowerHash.includes(lowerPassword);
}

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

    // 5. Verify password (MOCK - development only)
    const isPasswordValid = mockVerifyPassword(
      password,
      userCredentials.passwordHash
    );
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
