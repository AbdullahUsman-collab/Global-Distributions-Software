/**
 * PostgreSQL User Brand Access Adapter
 * Persistent user ↔ brand authorization storage.
 *
 * RULE: Persistence ONLY — no business logic, no authorization.
 * RULE: All queries are scoped by userId (access records are user-centric).
 * RULE: Duplicate (userId, tenantId) pairs are rejected by UNIQUE constraint.
 */

import { randomBytes } from 'crypto';
import { UserBrandAccess, CreateUserBrandAccessPayload, UpdateUserBrandAccessPayload } from '../../../domain/types/user-brand-access';
import { IUserBrandAccessRepository } from '../../../domain/repositories/IUserBrandAccessRepository';
import { query } from '../pool.js';

function uuid(): string { return randomBytes(16).toString('hex'); }

/**
 * PostgreSQL implementation of IUserBrandAccessRepository.
 */
export class PostgresUserBrandAccessAdapter implements IUserBrandAccessRepository {

  async getByUserId(userId: string): Promise<UserBrandAccess[]> {
    const result = await query(
      `SELECT id, user_id, tenant_id, role, is_active, created_at, updated_at
       FROM user_brand_access WHERE user_id = $1 ORDER BY created_at`,
      [userId]
    );
    return result.rows.map(r => this.mapRow(r));
  }

  async getByUserAndTenant(userId: string, tenantId: string): Promise<UserBrandAccess | null> {
    const result = await query(
      `SELECT id, user_id, tenant_id, role, is_active, created_at, updated_at
       FROM user_brand_access WHERE user_id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async getActiveByUserId(userId: string): Promise<UserBrandAccess[]> {
    const result = await query(
      `SELECT id, user_id, tenant_id, role, is_active, created_at, updated_at
       FROM user_brand_access WHERE user_id = $1 AND is_active = true ORDER BY created_at`,
      [userId]
    );
    return result.rows.map(r => this.mapRow(r));
  }

  async create(payload: CreateUserBrandAccessPayload): Promise<UserBrandAccess> {
    const id = uuid();
    const result = await query(
      `INSERT INTO user_brand_access (id, user_id, tenant_id, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [id, payload.userId, payload.tenantId, payload.role, payload.isActive ?? true]
    );
    return this.mapRow(result.rows[0]);
  }

  async update(id: string, payload: UpdateUserBrandAccessPayload): Promise<UserBrandAccess> {
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;

    if (payload.role !== undefined) {
      sets.push(`role = $${idx++}`);
      vals.push(payload.role);
    }
    if (payload.isActive !== undefined) {
      sets.push(`is_active = $${idx++}`);
      vals.push(payload.isActive);
    }

    if (sets.length === 0) {
      // Nothing to update — return current record
      const result = await query(
        `SELECT id, user_id, tenant_id, role, is_active, created_at, updated_at
         FROM user_brand_access WHERE id = $1`,
        [id]
      );
      if (result.rows.length === 0) throw new Error(`Access record not found: ${id}`);
      return this.mapRow(result.rows[0]);
    }

    sets.push('updated_at = NOW()');
    vals.push(id);

    const result = await query(
      `UPDATE user_brand_access SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals
    );
    if (result.rows.length === 0) throw new Error(`Access record not found: ${id}`);
    return this.mapRow(result.rows[0]);
  }

  async deactivate(id: string): Promise<boolean> {
    const result = await query(
      `UPDATE user_brand_access SET is_active = false, updated_at = NOW() WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async activate(id: string): Promise<boolean> {
    const result = await query(
      `UPDATE user_brand_access SET is_active = true, updated_at = NOW() WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async isActive(userId: string, tenantId: string): Promise<boolean> {
    const result = await query(
      `SELECT COUNT(*) as cnt FROM user_brand_access
       WHERE user_id = $1 AND tenant_id = $2 AND is_active = true`,
      [userId, tenantId]
    );
    return Number(result.rows[0].cnt) > 0;
  }

  private mapRow(r: any): UserBrandAccess {
    return {
      id: r.id,
      userId: r.user_id,
      tenantId: r.tenant_id,
      role: r.role,
      isActive: r.is_active,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
    };
  }
}
