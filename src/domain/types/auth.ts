/**
 * Authentication Domain Types
 * First-party authentication with free-text username support.
 * 
 * RULE: User model MUST NOT contain passwordHash.
 * RULE: Free-text username is supported as login ID (email NOT required).
 * RULE: No third-party auth providers (Auth0, Clerk, Firebase, Supabase).
 */

import { SystemRoleName } from './rbac';

/**
 * Public user entity exposed to UI and application services.
 * NEVER contains passwordHash or sensitive credential data.
 */
export interface User {
  /** Unique user identifier */
  id: string;
  /** Tenant this user belongs to */
  tenantId: string;
  /** Free-text username (NOT email - email is optional) */
  username: string;
  /** Display name for UI rendering */
  displayName: string;
  /** System role determining permissions */
  role: SystemRoleName;
  /** Whether user account is active */
  isActive: boolean;
  /** User creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Isolated credential storage boundary.
 * NEVER exposed to UI or application services.
 * Only accessed via IUserCredentialsRepository for authentication.
 */
export interface UserCredentials {
  /** User identifier */
  userId: string;
  /** Tenant identifier for multi-tenant isolation */
  tenantId: string;
  /** Hashed password (bcrypt, argon2, etc.) */
  passwordHash: string;
  /** Hashing algorithm identifier (optional metadata) */
  algo?: string;
  /** Salt used for hashing (optional - may be embedded in hash) */
  salt?: string;
}

/**
 * User session entity for session management.
 * Tracks active sessions with expiration.
 */
export interface UserSession {
  /** Unique session identifier */
  sessionId: string;
  /** User who owns this session */
  userId: string;
  /** Tenant context for this session */
  tenantId: string;
  /** Session expiration timestamp */
  expiresAt: Date;
  /** Session creation timestamp */
  createdAt: Date;
}

/**
 * Login credentials payload.
 * Free-text username supported (email NOT required).
 */
export interface LoginCredentials {
  /** Free-text username */
  username: string;
  /** Plain text password (will be hashed server-side) */
  password: string;
  /** Tenant context for authentication */
  tenantId: string;
}

/**
 * Authentication result union type.
 * Success contains session, failure contains error message.
 */
export type AuthResult =
  | { success: true; session: UserSession; user: User }
  | { success: false; error: string };

/**
 * Session validation result.
 * Returns session if valid, null if expired or invalid.
 */
export type SessionValidationResult = UserSession | null;

/**
 * User creation payload.
 */
export interface CreateUserPayload {
  tenantId: string;
  username: string;
  displayName: string;
  password: string;
  role?: SystemRoleName;
}

/**
 * User update payload.
 */
export interface UpdateUserPayload {
  displayName?: string;
  isActive?: boolean;
}
