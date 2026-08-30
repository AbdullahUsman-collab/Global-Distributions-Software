/**
 * Database Migration Runner
 * Simple, deterministic migration mechanism.
 *
 * RULE: Migrations are idempotent (safe to re-run).
 * RULE: Uses a migrations table to track applied migrations.
 * RULE: Each migration runs in a single transaction.
 */

import { getClient } from './pool.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const MIGRATIONS_TABLE = 'schema_migrations';

/**
 * Ensure the migrations tracking table exists.
 */
async function ensureMigrationsTable(client: any): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      version VARCHAR(64) PRIMARY KEY,
      name VARCHAR(256) NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

/**
 * Get list of already-applied migration versions.
 */
async function getAppliedMigrations(client: any): Promise<Set<string>> {
  const result = await client.query(`SELECT version FROM ${MIGRATIONS_TABLE}`);
  return new Set(result.rows.map((r: any) => r.version));
}

/**
 * Run all pending migrations.
 * Returns list of applied migration versions.
 */
export async function runMigrations(): Promise<string[]> {
  const client = await getClient();
  const applied: string[] = [];

  try {
    await ensureMigrationsTable(client);
    const appliedSet = await getAppliedMigrations(client);

    // Define migrations in order
    const migrations = [
      { version: '001', name: 'initial_schema', file: '001_initial.sql' },
    ];

    for (const migration of migrations) {
      if (appliedSet.has(migration.version)) {
        continue; // Already applied
      }

      console.log(`  Applying migration ${migration.version}: ${migration.name}...`);

      const sqlPath = resolve(__dirname, 'migrations', migration.file);
      const sql = readFileSync(sqlPath, 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO ${MIGRATIONS_TABLE} (version, name) VALUES ($1, $2)`,
          [migration.version, migration.name]
        );
        await client.query('COMMIT');
        applied.push(migration.version);
        console.log(`  ✓ Migration ${migration.version} applied`);
      } catch (e) {
        await client.query('ROLLBACK');
        console.error(`  ✗ Migration ${migration.version} failed:`, e);
        throw e;
      }
    }

    if (applied.length === 0) {
      console.log('  No pending migrations');
    }
  } finally {
    client.release();
  }

  return applied;
}

/**
 * Get status of all migrations.
 */
export async function getMigrationStatus(): Promise<{ version: string; name: string; applied: boolean }[]> {
  const client = await getClient();
  try {
    await ensureMigrationsTable(client);
    const appliedSet = await getAppliedMigrations(client);

    const migrations = [
      { version: '001', name: 'initial_schema' },
    ];

    return migrations.map(m => ({
      ...m,
      applied: appliedSet.has(m.version),
    }));
  } finally {
    client.release();
  }
}
