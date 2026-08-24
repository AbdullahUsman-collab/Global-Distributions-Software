/**
 * Mock User Adapter
 * DEVELOPMENT ONLY - In-memory mock implementation of IUserRepository.
 * 
 * RULE: NEVER exposes passwordHash or credential data.
 * Returns only public User model.
 */

import { User, CreateUserPayload, UpdateUserPayload } from '../../types/auth';
import { IUserRepository } from '../../repositories/IUserRepository';

/**
 * Mock user data for development.
 * Password hashes are stored separately in MockUserCredentialsAdapter.
 */
const DEMO_USERS: User[] = [
  {
    id: 'user-admin-001',
    tenantId: 'tenant-demo-wholesale-001',
    username: 'admin',
    displayName: 'Administrator',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'user-admin-002',
    tenantId: 'tenant-demo-distribution-002',
    username: 'admin',
    displayName: 'Administrator',
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'user-admin-003',
    tenantId: 'tenant-apex-trading-003',
    username: 'admin',
    displayName: 'Administrator',
    isActive: true,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
  {
    id: 'user-manager-001',
    tenantId: 'tenant-demo-wholesale-001',
    username: 'manager',
    displayName: 'Sales Manager',
    isActive: true,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 'user-clerk-001',
    tenantId: 'tenant-demo-wholesale-001',
    username: 'clerk',
    displayName: 'Sales Clerk',
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'user-inactive-001',
    tenantId: 'tenant-demo-wholesale-001',
    username: 'former',
    displayName: 'Former Employee',
    isActive: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-01'),
  },
];

/**
 * In-memory storage for mock users.
 */
let users: User[] = [...DEMO_USERS];

/**
 * Mock implementation of IUserRepository.
 * DEVELOPMENT ONLY - Do not use in production.
 */
export class MockUserAdapter implements IUserRepository {
  /**
   * Find user by username within a tenant.
   */
  async findByUsername(
    tenantId: string,
    username: string
  ): Promise<User | null> {
    return (
      users.find(
        (u) =>
          u.tenantId === tenantId &&
          u.username.toLowerCase() === username.toLowerCase()
      ) || null
    );
  }

  /**
   * Find user by ID.
   */
  async findById(id: string): Promise<User | null> {
    return users.find((u) => u.id === id) || null;
  }

  /**
   * Check if user is active.
   */
  async isUserActive(id: string): Promise<boolean> {
    const user = users.find((u) => u.id === id);
    return user?.isActive ?? false;
  }

  /**
   * Get all users for a tenant.
   */
  async getUsersByTenant(tenantId: string): Promise<User[]> {
    return users.filter((u) => u.tenantId === tenantId);
  }

  /**
   * Create a new user.
   */
  async createUser(payload: CreateUserPayload): Promise<User> {
    const newUser: User = {
      id: `user-${Date.now()}`,
      tenantId: payload.tenantId,
      username: payload.username,
      displayName: payload.displayName,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    users.push(newUser);
    return newUser;
  }

  /**
   * Update an existing user.
   */
  async updateUser(
    id: string,
    payload: UpdateUserPayload
  ): Promise<User> {
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) {
      throw new Error(`User not found: ${id}`);
    }
    users[index] = {
      ...users[index],
      ...payload,
      updatedAt: new Date(),
    };
    return users[index];
  }

  /**
   * Deactivate a user.
   */
  async deactivateUser(id: string): Promise<boolean> {
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) {
      return false;
    }
    users[index].isActive = false;
    users[index].updatedAt = new Date();
    return true;
  }
}
