"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockUserCredentialsAdapter = exports.DEMO_PLAIN_PASSWORDS = void 0;
exports.registerTestPassword = registerTestPassword;
exports.resetPasswordStore = resetPasswordStore;
exports.addCredentials = addCredentials;
/**
 * Demo credential data for development.
 * Uses real bcrypt hashes so authentication works in both mock and PostgreSQL modes.
 *
 * Passwords: admin123, manager123, clerk123, former123
 */
const DEMO_CREDENTIALS = [
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
 * Plain-text passwords for client-side mock authentication.
 * Server-side uses real bcrypt; client uses this for mock mode.
 */
exports.DEMO_PLAIN_PASSWORDS = {
    'user-admin-001': 'admin123',
    'user-manager-001': 'manager123',
    'user-clerk-001': 'clerk123',
    'user-inactive-001': 'former123',
    'user-admin-002': 'admin123',
    'user-admin-003': 'admin123',
};
/**
 * Register a plain-text password for a dynamically created user (test only).
 */
function registerTestPassword(userId, password) {
    exports.DEMO_PLAIN_PASSWORDS[userId] = password;
}
/**
 * Reset plain-password registry to seed data. Use in test beforeEach.
 */
function resetPasswordStore() {
    const keys = Object.keys(exports.DEMO_PLAIN_PASSWORDS);
    for (const k of keys) {
        delete exports.DEMO_PLAIN_PASSWORDS[k];
    }
    exports.DEMO_PLAIN_PASSWORDS['user-admin-001'] = 'admin123';
    exports.DEMO_PLAIN_PASSWORDS['user-manager-001'] = 'manager123';
    exports.DEMO_PLAIN_PASSWORDS['user-clerk-001'] = 'clerk123';
    exports.DEMO_PLAIN_PASSWORDS['user-inactive-001'] = 'former123';
    exports.DEMO_PLAIN_PASSWORDS['user-admin-002'] = 'admin123';
    exports.DEMO_PLAIN_PASSWORDS['user-admin-003'] = 'admin123';
}
/**
 * In-memory storage for mock credentials.
 */
let credentials = [...DEMO_CREDENTIALS];
/**
 * Add credentials directly (for test setup, bypasses adapter).
 */
function addCredentials(userId, tenantId, passwordHash, algo) {
    const existing = credentials.find(c => c.userId === userId);
    if (existing)
        return;
    credentials.push({ userId, tenantId, passwordHash, algo: algo || 'bcrypt' });
}
/**
 * Mock implementation of IUserCredentialsRepository.
 * DEVELOPMENT ONLY - Do not use in production.
 */
class MockUserCredentialsAdapter {
    /**
     * Get credentials by username within a tenant.
     */
    async getCredentialsByUsername(tenantId, username) {
        // Find user by tenantId + username via user adapter
        // For mock, we find by tenantId — the auth service resolves userId separately
        return (credentials.find((c) => c.tenantId === tenantId) || null);
    }
    /**
     * Get credentials by user ID.
     */
    async getCredentialsByUserId(userId) {
        return credentials.find((c) => c.userId === userId) || null;
    }
    /**
     * Store new credentials.
     */
    async storeCredentials(userId, tenantId, passwordHash, algo) {
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
    async updateCredentials(userId, passwordHash, algo) {
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
    async hasCredentials(userId) {
        return credentials.some((c) => c.userId === userId);
    }
}
exports.MockUserCredentialsAdapter = MockUserCredentialsAdapter;
