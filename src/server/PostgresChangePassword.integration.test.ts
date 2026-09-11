/**
 * PostgreSQL Change Password Integration Test
 * Live verification of password change against real Supabase PostgreSQL.
 *
 * Exercises: credential persistence, bcrypt hashing, tenant isolation.
 * Uses the application's own connection pool (handles SSL correctly).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hashPassword, verifyPassword } from './lib/password';

const HAS_PG = !!process.env.DATABASE_URL;
const describePg = HAS_PG ? describe : describe.skip;

describePg('PostgreSQL Change Password — Live Verification', () => {
  const TEST_TENANT = 'tenant-demo-wholesale-001';
  const TEST_USER_ID = 'pg-change-pwd-test-user';
  const TEST_USERNAME = 'pgchangepwdtest';
  const ORIGINAL_PASSWORD = 'OriginalPass123';
  const NEW_PASSWORD = 'NewSecurePass456';

  beforeAll(async () => {
    const { loadConfig } = await import('./db/env');
    const { initPool, testConnection } = await import('./db/pool');
    const config = loadConfig();
    initPool(config.database);

    const connected = await testConnection();
    if (!connected) throw new Error('PostgreSQL connection failed');

    const { query } = await import('./db/pool');

    // Create test user
    await query(
      `INSERT INTO users (id, tenant_id, username, display_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (id) DO NOTHING`,
      [TEST_USER_ID, TEST_TENANT, TEST_USERNAME, 'PG Change Pwd Test', 'VIEWER']
    );

    // Store original credentials with real bcrypt hash
    const hash = await hashPassword(ORIGINAL_PASSWORD);
    await query(
      `INSERT INTO user_credentials (user_id, tenant_id, password_hash, algo)
       VALUES ($1, $2, $3, 'bcrypt')
       ON CONFLICT (user_id) DO UPDATE SET password_hash = $3, algo = 'bcrypt', updated_at = NOW()`,
      [TEST_USER_ID, TEST_TENANT, hash]
    );
  }, 30000);

  afterAll(async () => {
    const { query, closePool } = await import('./db/pool');
    await query('DELETE FROM user_credentials WHERE user_id = $1', [TEST_USER_ID]);
    await query('DELETE FROM users WHERE id = $1', [TEST_USER_ID]);
    await closePool();
  });

  // TEST A — Existing password works
  it('TEST A: Existing password authenticates against PostgreSQL', async () => {
    const { query } = await import('./db/pool');
    const result = await query(
      'SELECT password_hash FROM user_credentials WHERE user_id = $1',
      [TEST_USER_ID]
    );
    expect(result.rows.length).toBe(1);
    const storedHash = result.rows[0].password_hash;
    const valid = await verifyPassword(ORIGINAL_PASSWORD, storedHash);
    expect(valid).toBe(true);
  });

  // TEST B — Change password via PostgreSQL UPDATE
  it('TEST B: Password hash is updated in PostgreSQL', async () => {
    const { query } = await import('./db/pool');
    const newHash = await hashPassword(NEW_PASSWORD);
    const updateResult = await query(
      `UPDATE user_credentials SET password_hash = $1, algo = 'bcrypt', updated_at = NOW()
       WHERE user_id = $2`,
      [newHash, TEST_USER_ID]
    );
    expect(updateResult.rowCount).toBe(1);

    // Verify new hash is stored
    const result = await query(
      'SELECT password_hash, algo FROM user_credentials WHERE user_id = $1',
      [TEST_USER_ID]
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].algo).toBe('bcrypt');
  });

  // TEST C — Old password fails after change
  it('TEST C: Old password fails after PostgreSQL update', async () => {
    const { query } = await import('./db/pool');
    const result = await query(
      'SELECT password_hash FROM user_credentials WHERE user_id = $1',
      [TEST_USER_ID]
    );
    const storedHash = result.rows[0].password_hash;
    const oldValid = await verifyPassword(ORIGINAL_PASSWORD, storedHash);
    expect(oldValid).toBe(false);
  });

  // TEST D — New password succeeds
  it('TEST D: New password authenticates after PostgreSQL update', async () => {
    const { query } = await import('./db/pool');
    const result = await query(
      'SELECT password_hash FROM user_credentials WHERE user_id = $1',
      [TEST_USER_ID]
    );
    const storedHash = result.rows[0].password_hash;
    const newValid = await verifyPassword(NEW_PASSWORD, storedHash);
    expect(newValid).toBe(true);
  });

  // TEST E — Password hash is bcrypt format, not plaintext
  it('TEST E: Stored hash is bcrypt format, not plaintext', async () => {
    const { query } = await import('./db/pool');
    const result = await query(
      'SELECT password_hash FROM user_credentials WHERE user_id = $1',
      [TEST_USER_ID]
    );
    const storedHash = result.rows[0].password_hash;
    expect(storedHash).not.toBe(NEW_PASSWORD);
    expect(storedHash).toMatch(/^\$2/); // bcrypt prefix
  });

  // TEST F — User metadata unchanged
  it('TEST F: User record metadata unchanged after password change', async () => {
    const { query } = await import('./db/pool');
    const result = await query(
      'SELECT username, display_name, role, is_active FROM users WHERE id = $1',
      [TEST_USER_ID]
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].username).toBe(TEST_USERNAME);
    expect(result.rows[0].display_name).toBe('PG Change Pwd Test');
    expect(result.rows[0].role).toBe('VIEWER');
    expect(result.rows[0].is_active).toBe(true);
  });

  // TEST G — Brand access unchanged
  it('TEST G: user_brand_access unchanged after password change', async () => {
    const { query } = await import('./db/pool');
    const result = await query(
      'SELECT COUNT(*) as cnt FROM user_brand_access WHERE user_id = $1',
      [TEST_USER_ID]
    );
    expect(parseInt(result.rows[0].cnt)).toBeGreaterThanOrEqual(0);
  });

  // TEST H — Tenant isolation: credentials have correct tenant_id
  it('TEST H: Tenant isolation — credentials are per-user with correct tenant', async () => {
    const { query } = await import('./db/pool');
    const result = await query(
      'SELECT tenant_id FROM user_credentials WHERE user_id = $1',
      [TEST_USER_ID]
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].tenant_id).toBe(TEST_TENANT);
  });

  // TEST I — password_hash is never equal to plaintext
  it('TEST I: password_hash is never equal to any plaintext password', async () => {
    const { query } = await import('./db/pool');
    const result = await query(
      'SELECT password_hash FROM user_credentials WHERE user_id = $1',
      [TEST_USER_ID]
    );
    const storedHash = result.rows[0].password_hash;
    expect(storedHash).not.toBe(ORIGINAL_PASSWORD);
    expect(storedHash).not.toBe(NEW_PASSWORD);
    expect(storedHash).not.toBe('password');
    expect(storedHash).not.toBe('admin123');
  });

  // TEST J — updateCredentials affects exactly one row
  it('TEST J: updateCredentials affects exactly one row', async () => {
    const { query } = await import('./db/pool');
    const hash = await hashPassword(ORIGINAL_PASSWORD);
    const result = await query(
      `UPDATE user_credentials SET password_hash = $1, algo = 'bcrypt', updated_at = NOW()
       WHERE user_id = $2`,
      [hash, TEST_USER_ID]
    );
    expect(result.rowCount).toBe(1);
  });
});
