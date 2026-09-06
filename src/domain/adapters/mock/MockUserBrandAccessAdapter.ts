/**
 * Mock User Brand Access Adapter
 * DEVELOPMENT ONLY — In-memory mock implementation of IUserBrandAccessRepository.
 *
 * Seeds access records matching existing demo user/tenant assignments.
 * Each record mirrors users.tenant_id + users.role for the current demo model.
 */

import { UserBrandAccess, CreateUserBrandAccessPayload, UpdateUserBrandAccessPayload } from '../../types/user-brand-access';
import { IUserBrandAccessRepository } from '../../repositories/IUserBrandAccessRepository';

/* ─── Helpers ──────────────────────────────────────────────── */

let nextId = 9000;

function uid(): string {
  return `uba-${nextId++}`;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/* ─── Seed Data ────────────────────────────────────────────── */

/**
 * Seed access records matching MockUserAdapter's demo users.
 * Each user's existing tenant_id + role becomes their first access row.
 */
const SEED_ACCESS: UserBrandAccess[] = [
  {
    id: 'uba-001',
    userId: 'user-admin-001',
    tenantId: 'tenant-demo-wholesale-001',
    role: 'ADMIN',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'uba-002',
    userId: 'user-admin-002',
    tenantId: 'tenant-demo-distribution-002',
    role: 'ADMIN',
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'uba-003',
    userId: 'user-admin-003',
    tenantId: 'tenant-apex-trading-003',
    role: 'ADMIN',
    isActive: true,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
  {
    id: 'uba-004',
    userId: 'user-manager-001',
    tenantId: 'tenant-demo-wholesale-001',
    role: 'MANAGER',
    isActive: true,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 'uba-005',
    userId: 'user-clerk-001',
    tenantId: 'tenant-demo-wholesale-001',
    role: 'SALES',
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'uba-006',
    userId: 'user-inactive-001',
    tenantId: 'tenant-demo-wholesale-001',
    role: 'VIEWER',
    isActive: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-01'),
  },
];

/* ─── In-Memory Store ──────────────────────────────────────── */

let accessStore: UserBrandAccess[] = [...SEED_ACCESS.map(a => deepClone(a))];

/**
 * Reset store to seed data. Use in test beforeEach to isolate tests.
 */
export function resetBrandAccessStore(): void {
  accessStore = [...SEED_ACCESS.map(a => deepClone(a))];
}

/**
 * Get direct access to store for test setup (bypasses adapter).
 */
export function getBrandAccessStore(): UserBrandAccess[] {
  return accessStore;
}

/* ─── Adapter Implementation ───────────────────────────────── */

/**
 * Mock implementation of IUserBrandAccessRepository.
 * DEVELOPMENT ONLY — Do not use in production.
 */
export class MockUserBrandAccessAdapter implements IUserBrandAccessRepository {

  async getByUserId(userId: string): Promise<UserBrandAccess[]> {
    return accessStore
      .filter(a => a.userId === userId)
      .map(a => deepClone(a));
  }

  async getByUserAndTenant(userId: string, tenantId: string): Promise<UserBrandAccess | null> {
    const found = accessStore.find(a => a.userId === userId && a.tenantId === tenantId);
    return found ? deepClone(found) : null;
  }

  async getActiveByUserId(userId: string): Promise<UserBrandAccess[]> {
    return accessStore
      .filter(a => a.userId === userId && a.isActive)
      .map(a => deepClone(a));
  }

  async create(payload: CreateUserBrandAccessPayload): Promise<UserBrandAccess> {
    // Check for duplicate
    const existing = accessStore.find(a => a.userId === payload.userId && a.tenantId === payload.tenantId);
    if (existing) {
      throw new Error(`Access already exists for user ${payload.userId} in tenant ${payload.tenantId}`);
    }

    const record: UserBrandAccess = {
      id: uid(),
      userId: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
      isActive: payload.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    accessStore.push(record);
    return deepClone(record);
  }

  async update(id: string, payload: UpdateUserBrandAccessPayload): Promise<UserBrandAccess> {
    const idx = accessStore.findIndex(a => a.id === id);
    if (idx === -1) throw new Error(`Access record not found: ${id}`);

    accessStore[idx] = {
      ...accessStore[idx],
      ...payload,
      updatedAt: new Date(),
    };
    return deepClone(accessStore[idx]);
  }

  async deactivate(id: string): Promise<boolean> {
    const idx = accessStore.findIndex(a => a.id === id);
    if (idx === -1) return false;
    accessStore[idx].isActive = false;
    accessStore[idx].updatedAt = new Date();
    return true;
  }

  async activate(id: string): Promise<boolean> {
    const idx = accessStore.findIndex(a => a.id === id);
    if (idx === -1) return false;
    accessStore[idx].isActive = true;
    accessStore[idx].updatedAt = new Date();
    return true;
  }

  async isActive(userId: string, tenantId: string): Promise<boolean> {
    return accessStore.some(a => a.userId === userId && a.tenantId === tenantId && a.isActive);
  }
}
