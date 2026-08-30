/**
 * Environment Configuration
 * Loads and validates required environment variables.
 *
 * RULE: Required production variables must be set or startup fails.
 * RULE: Secrets are never committed to source control.
 * RULE: Development defaults are clearly marked as DEV-ONLY.
 */

/**
 * Database configuration.
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  maxConnections: number;
  idleTimeoutMs: number;
}

/**
 * Session configuration.
 */
export interface SessionConfig {
  secret: string;
  maxAgeMs: number;
  cookieName: string;
}

/**
 * CORS configuration.
 */
export interface CorsConfig {
  allowedOrigins: string[];
}

/**
 * Server configuration.
 */
export interface ServerConfig {
  port: number;
  nodeEnv: string;
  isProduction: boolean;
  databaseUrl: string | null;
  database: DatabaseConfig;
  session: SessionConfig;
  cors: CorsConfig;
}

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid integer for ${key}: ${value}`);
  }
  return parsed;
}

function getEnvBool(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value === 'true' || value === '1';
}

/**
 * Parse DATABASE_URL into components.
 * Format: postgresql://user:password@host:port/database?sslmode=require
 */
function parseDatabaseUrl(url: string): DatabaseConfig {
  try {
    const parsed = new URL(url);
    const sslMode = parsed.searchParams.get('sslmode');
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '5432', 10),
      database: parsed.pathname.slice(1),
      user: parsed.username,
      password: parsed.password,
      ssl: sslMode === 'require' || sslMode === 'verify-full',
      maxConnections: getEnvInt('DB_POOL_MAX', 20),
      idleTimeoutMs: getEnvInt('DB_IDLE_TIMEOUT', 30000),
    };
  } catch {
    throw new Error(`Invalid DATABASE_URL format`);
  }
}

/**
 * Load server configuration from environment.
 */
export function loadConfig(): ServerConfig {
  const nodeEnv = getEnv('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';
  const databaseUrl = process.env.DATABASE_URL || null;

  return {
    port: getEnvInt('PORT', 3000),
    nodeEnv,
    isProduction,
    databaseUrl,
    database: databaseUrl
      ? parseDatabaseUrl(databaseUrl)
      : {
          host: getEnv('DB_HOST', 'localhost'),
          port: getEnvInt('DB_PORT', 5432),
          database: getEnv('DB_NAME', 'distribution_erp'),
          user: getEnv('DB_USER', 'postgres'),
          password: getEnv('DB_PASSWORD', ''),
          ssl: getEnvBool('DB_SSL', false),
          maxConnections: getEnvInt('DB_POOL_MAX', 20),
          idleTimeoutMs: getEnvInt('DB_IDLE_TIMEOUT', 30000),
        },
    session: {
      secret: getEnv('SESSION_SECRET', isProduction ? '' : 'dev-only-session-secret-change-in-production'),
      maxAgeMs: getEnvInt('SESSION_MAX_AGE_MS', 30 * 60 * 1000),
      cookieName: getEnv('SESSION_COOKIE_NAME', 'erp_session'),
    },
    cors: {
      allowedOrigins: getEnv('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000').split(',').map(o => o.trim()),
    },
  };
}

/**
 * Validate that critical production config is set.
 * Throws on startup if required variables are missing.
 */
export function validateProductionConfig(config: ServerConfig): void {
  if (!config.isProduction) return;

  const required = [
    { key: 'DATABASE_URL', value: config.databaseUrl },
    { key: 'SESSION_SECRET', value: config.session.secret },
    { key: 'CORS_ORIGINS', value: process.env.CORS_ORIGINS },
  ];

  const missing = required.filter(r => !r.value);
  if (missing.length > 0) {
    throw new Error(
      `CRITICAL: Missing required production environment variables: ${missing.map(r => r.key).join(', ')}. ` +
      `Set these before starting in production mode.`
    );
  }
}
