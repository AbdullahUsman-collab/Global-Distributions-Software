/**
 * PostgreSQL Connection Pool
 * Manages database connections with pooling, health checks, and graceful shutdown.
 *
 * RULE: Connection pool is a singleton.
 * RULE: All queries use parameterized statements (no SQL concatenation).
 * RULE: Pool connections are released after each query.
 * RULE: Graceful shutdown closes all connections.
 */

import pg from 'pg';
import { DatabaseConfig } from './env.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

/**
 * Initialize the PostgreSQL connection pool.
 */
export function initPool(config: DatabaseConfig): pg.Pool {
  if (pool) {
    return pool;
  }

  pool = new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    max: config.maxConnections,
    idleTimeoutMillis: config.idleTimeoutMs,
    connectionTimeoutMillis: 10000,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
  });

  pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
  });

  return pool;
}

/**
 * Get the current connection pool.
 * Throws if pool not initialized.
 */
export function getPool(): pg.Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initPool() first.');
  }
  return pool;
}

/**
 * Execute a query using the connection pool.
 * Automatically acquires and releases a client.
 */
export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const p = getPool();
  return p.query<T>(text, params);
}

/**
 * Get a client from the pool for transactions.
 * Caller MUST call client.release() when done.
 */
export async function getClient(): Promise<pg.PoolClient> {
  const p = getPool();
  return p.connect();
}

/**
 * Test database connectivity.
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW()');
    return result.rows.length > 0;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

/**
 * Gracefully close the connection pool.
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
