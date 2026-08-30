/**
 * PostgreSQL User Adapter
 * Persistent user storage.
 *
 * RULE: NEVER exposes passwordHash or credential data.
 * RULE: Returns only public User model.
 */

import { User, CreateUserPayload, UpdateUserPayload } from '../../../domain/types/auth';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { query } from '../pool.js';

/**
 * PostgreSQL implementation of IUserRepository.
 */
export class PostgresUserAdapter implements IUserRepository {
  /**
   * Find user by username within a tenant.
   */
  async findByUsername(tenantId: string, username: string): Promise<User | null> {
    const result = await query(
      `SELECT id, tenant_id, username, display_name, role, is_active, created_at, updated_at
       FROM users
       WHERE tenant_id = $1 AND LOWER(username) = LOWER($2)`,
      [tenantId, username]
    );

    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  /**
   * Find user by ID.
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
   * Get all users for a tenant.
   */
  async getUsersByTenant(tenantId: string): Promise<User[]> {
    const result = await query(
      `SELECT id, tenant_id, username, display_name, role, is_active, created_at, updated_at
       FROM users
       WHERE tenant_id = $1
       ORDER BY username`,
      [tenantId]
    );

    return result.rows.map(r => this.mapRow(r));
  }

  /**
   * Create a new user.
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
