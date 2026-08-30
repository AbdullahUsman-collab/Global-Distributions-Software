/**
 * PostgreSQL User Credentials Adapter
 * Persistent credential storage for authentication.
 *
 * RULE: This is an ISOLATED credential boundary.
 * RULE: Password hashes are stored here and NEVER exposed to other layers.
 * RULE: This repository is for persistence ONLY.
 * RULE: Password hashing and verification belong in IAuthService.
 */

import { IUserCredentialsRepository } from '../../../domain/repositories/IUserCredentialsRepository';
import { UserCredentials } from '../../../domain/types/auth';
import { query } from '../pool.js';

/**
 * PostgreSQL implementation of IUserCredentialsRepository.
 */
export class PostgresUserCredentialsAdapter implements IUserCredentialsRepository {
  /**
   * Get credentials by user ID.
   */
  async getCredentialsByUserId(userId: string): Promise<UserCredentials | null> {
    const result = await query(
      `SELECT user_id, tenant_id, password_hash, algo, salt
       FROM user_credentials
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      userId: row.user_id,
      tenantId: row.tenant_id,
      passwordHash: row.password_hash,
      algo: row.algo,
      salt: row.salt,
    };
  }

  /**
   * Get credentials by username within a tenant.
   * Joins with users table to find by username.
   */
  async getCredentialsByUsername(
    tenantId: string,
    username: string
  ): Promise<UserCredentials | null> {
    const result = await query(
      `SELECT uc.user_id, uc.tenant_id, uc.password_hash, uc.algo, uc.salt
       FROM user_credentials uc
       JOIN users u ON u.id = uc.user_id
       WHERE uc.tenant_id = $1 AND u.username = $2`,
      [tenantId, username]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      userId: row.user_id,
      tenantId: row.tenant_id,
      passwordHash: row.password_hash,
      algo: row.algo,
      salt: row.salt,
    };
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
    const result = await query(
      `INSERT INTO user_credentials (user_id, tenant_id, password_hash, algo)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, tenantId, passwordHash, algo || 'bcrypt']
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Update existing credentials.
   */
  async updateCredentials(
    userId: string,
    passwordHash: string,
    algo?: string
  ): Promise<boolean> {
    const result = await query(
      `UPDATE user_credentials
       SET password_hash = $1, algo = $2, updated_at = NOW()
       WHERE user_id = $3`,
      [passwordHash, algo || 'bcrypt', userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Check if credentials exist for a user.
   */
  async hasCredentials(userId: string): Promise<boolean> {
    const result = await query(
      'SELECT 1 FROM user_credentials WHERE user_id = $1',
      [userId]
    );
    return result.rows.length > 0;
  }
}
