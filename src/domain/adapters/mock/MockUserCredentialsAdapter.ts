/**
 * Mock User Credentials Adapter
 * DEVELOPMENT ONLY - In-memory mock implementation of IUserCredentialsRepository.
 * 
 * RULE: This is an ISOLATED credential boundary.
 * Password hashes are stored here and NEVER exposed to other layers.
 * 
 * RULE: This repository is for persistence ONLY.
 * Password hashing and verification belong in IAuthService.
 */

import { UserCredentials } from '../../types/auth';
import { IUserCredentialsRepository } from '../../repositories/IUserCredentialsRepository';

/**
 * Demo credential data for development.
 * Uses real bcrypt hashes so authentication works in both mock and PostgreSQL modes.
 * 
 * Passwords: admin123, manager123, clerk123, former123
 */
const DEMO_CREDENTIALS: UserCredentials[] = [
  // Demo Wholesale - admin (password: "admin123")
  {
    userId: 'user-admin-001',
    tenantId: 'tenant-demo-wholesale-001',
    passwordHash: '$2b$10$97vdNbR7uT5I/6ZQ9jgB4OMOfT3bVQt6vhQSZN8RaXLBMGIau8e1O',
    algo: 'bcrypt',
  },
  // Demo Wholesale - manager (password: "manager123")
  {
    userId: 'user-manager-001',
    tenantId: 'tenant-demo-wholesale-001',
    passwordHash: '$2b$10$1yJmsm.CDxVD19KzYFmLCO4iRNLKVjHb4lOD5loIMbXjyfdxWUSF6',
    algo: 'bcrypt',
  },
  // Demo Wholesale - clerk (password: "clerk123")
  {
    userId: 'user-clerk-001',
    tenantId: 'tenant-demo-wholesale-001',
    passwordHash: '$2b$10$WkqFCEoVlZPdmUZIXPM2POCVyVicy965RpyJFz1/UswZUUoLK5vNG',
    algo: 'bcrypt',
  },
  // Demo Wholesale - former employee (inactive)
  {
    userId: 'user-inactive-001',
    tenantId: 'tenant-demo-wholesale-001',
    passwordHash: '$2b$10$r.6KiJJeN/we1Fu5HQCuNeNkT3g6Sp9aq8lLPV/Ej/MCbvKsEDSpK',
    algo: 'bcrypt',
  },
  // Demo Distribution - admin (password: "admin123")
  {
    userId: 'user-admin-002',
    tenantId: 'tenant-demo-distribution-002',
    passwordHash: '$2b$10$97vdNbR7uT5I/6ZQ9jgB4OMOfT3bVQt6vhQSZN8RaXLBMGIau8e1O',
    algo: 'bcrypt',
  },
  // Apex Trading - admin (password: "admin123")
  {
    userId: 'user-admin-003',
    tenantId: 'tenant-apex-trading-003',
    passwordHash: '$2b$10$97vdNbR7uT5I/6ZQ9jgB4OMOfT3bVQt6vhQSZN8RaXLBMGIau8e1O',
    algo: 'bcrypt',
  },
];

/**
 * In-memory storage for mock credentials.
 */
let credentials: UserCredentials[] = [...DEMO_CREDENTIALS];

/**
 * Mock implementation of IUserCredentialsRepository.
 * DEVELOPMENT ONLY - Do not use in production.
 */
export class MockUserCredentialsAdapter implements IUserCredentialsRepository {
  /**
   * Get credentials by username within a tenant.
   */
  async getCredentialsByUsername(
    tenantId: string,
    username: string
  ): Promise<UserCredentials | null> {
    // NOTE: In real implementation, this would join with users table.
    // For mock, we assume username lookup is done via MockUserAdapter
    // and this is called with the userId.
    // For simplicity, we'll find by tenantId only (mock behavior).
    return (
      credentials.find((c) => c.tenantId === tenantId) || null
    );
  }

  /**
   * Get credentials by user ID.
   */
  async getCredentialsByUserId(userId: string): Promise<UserCredentials | null> {
    return credentials.find((c) => c.userId === userId) || null;
  }

  /**
   * Store new credentials.
   */
  async storeCredentials(
    userId: string,
    tenantId: string,
    passwordHash: string,
    algo?: string
  ): Promise<boolean> {
    const existing = credentials.find((c) => c.userId === userId);
    if (existing) {
      return false;
    }
    credentials.push({
      userId,
      tenantId,
      passwordHash,
      algo: algo || 'bcrypt',
    });
    return true;
  }

  /**
   * Update existing credentials.
   */
  async updateCredentials(
    userId: string,
    passwordHash: string,
    algo?: string
  ): Promise<boolean> {
    const index = credentials.findIndex((c) => c.userId === userId);
    if (index === -1) {
      return false;
    }
    credentials[index] = {
      ...credentials[index],
      passwordHash,
      algo: algo || credentials[index].algo,
    };
    return true;
  }

  /**
   * Check if credentials exist for a user.
   */
  async hasCredentials(userId: string): Promise<boolean> {
    return credentials.some((c) => c.userId === userId);
  }
}
