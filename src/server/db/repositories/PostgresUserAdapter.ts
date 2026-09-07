/**
 * PostgreSQL User Adapter
 * Persistent user storage.
 *
 * RULE: NEVER exposes passwordHash or credential data.
 * RULE: Returns only public User model.
 *
 * RULE (46C-7): Tenant scoping uses user_brand_access, NOT users.tenant_id.
 * The users.tenant_id column is legacy compatibility — not authorization authority.
 * findByUsername() verifies active brand access for the requested tenant.
 * getUsersByTenant() lists users through active brand access records.
 */

import { User, CreateUserPayload, UpdateUserPayload } from '../../../domain/types/auth';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { query } from '../pool.js';

/**
 * PostgreSQL implementation of IUserRepository.
 *
 * 46C-7 DECOUPLING:
 * - findByUsername: joins user_brand_access for tenant scoping
 * - getUsersByTenant: joins user_brand_access for tenant scoping
 * - findById: no tenant scoping needed (identity lookup)
 * - createUser: writes users.tenant_id/role for legacy schema compatibility
 * - mapRow: reads legacy columns for User type compatibility
 *
 * Authorization source: user_brand_access (NOT users.tenant_id or users.role)
 */
export class PostgresUserAdapter implements IUserRepository {
  /**
   * Find user by username with ACTIVE brand access for the requested tenant.
   *
   * 46C-7: Joins user_brand_access instead of using users.tenant_id.
   * This ensures only users with active brand access are found.
   */
  async findByUsername(tenantId: string, username: string): Promise<User | null> {
    const result = await query(
      `SELECT u.id, u.tenant_id, u.username, u.display_name, u.role, u.is_active, u.created_at, u.updated_at
       FROM users u
       INNER JOIN user_brand_access uba ON uba.user_id = u.id AND uba.tenant_id = $1 AND uba.is_active = true
       WHERE LOWER(u.username) = LOWER($2)`,
      [tenantId, username]
    );

    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  /**
   * Find user by ID.
   * No tenant scoping — identity lookup only.
   */
  async findById(id: string): Promise<User | null> {
    const result = await query(
      `SELECT id, tenant_id, username, display_name, role, is_active, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  /**
   * Check if user is active.
   */
  async isUserActive(id: string): Promise<boolean> {
    const result = await query(
      'SELECT is_active FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0]?.is_active ?? false;
  }

  /**
   * Get all users with ACTIVE brand access for a tenant.
   *
   * 46C-7: Joins user_brand_access instead of using users.tenant_id.
   * Users who only have a legacy users.tenant_id matching but no
   * active brand access record are NOT returned.
   */
  async getUsersByTenant(tenantId: string): Promise<User[]> {
    const result = await query(
      `SELECT DISTINCT u.id, u.tenant_id, u.username, u.display_name, u.role, u.is_active, u.created_at, u.updated_at
       FROM users u
       INNER JOIN user_brand_access uba ON uba.user_id = u.id AND uba.tenant_id = $1 AND uba.is_active = true
       ORDER BY u.username`,
      [tenantId]
    );

    return result.rows.map(r => this.mapRow(r));
  }

  /**
   * Create a new user.
   *
   * 46C-7: Still writes users.tenant_id and users.role for legacy schema
   * compatibility. These columns remain in the physical database.
   * Authorization is NOT derived from these values — user_brand_access
   * is the authoritative source.
   */
  async createUser(payload: CreateUserPayload): Promise<User> {
    const id = `user-${Date.now()}`;
    const result = await query(
      `INSERT INTO users (id, tenant_id, username, display_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, tenant_id, username, display_name, role, is_active, created_at, updated_at`,
      [id, payload.tenantId, payload.username, payload.displayName, payload.role || 'VIEWER']
    );

    return this.mapRow(result.rows[0]);
  }

  /**
   * Update an existing user.
   */
  async updateUser(id: string, payload: UpdateUserPayload): Promise<User> {
    const sets: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    if (payload.displayName !== undefined) {
      sets.push(`display_name = $${paramIdx++}`);
      values.push(payload.displayName);
    }
    if (payload.isActive !== undefined) {
      sets.push(`is_active = $${paramIdx++}`);
      values.push(payload.isActive);
    }
    sets.push(`updated_at = NOW()`);

    values.push(id);

    const result = await query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${paramIdx}
       RETURNING id, tenant_id, username, display_name, role, is_active, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error(`User not found: ${id}`);
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Deactivate a user.
   */
  async deactivateUser(id: string): Promise<boolean> {
    const result = await query(
      'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Map database row to User model.
   *
   * 46C-7: Reads legacy users.tenant_id and users.role for User type
   * compatibility. These values are NOT used for authorization —
   * user_brand_access.role is the authoritative per-brand role.
   */
  private mapRow(row: any): User {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      username: row.username,
      displayName: row.display_name,
      role: row.role,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
