/**
 * Application Mode Configuration
 * Controls whether the application runs in DEMO mode (mock data) or PRODUCTION mode (PostgreSQL).
 *
 * To switch to production:
 *   Set APP_MODE=production (or leave unset)
 *   Configure DATABASE_URL environment variable
 *
 * In DEMO mode:
 *   - Mock/in-memory adapters are used
 *   - Demo data is seeded on startup
 *   - A "DEMO MODE" indicator is displayed in the UI
 *   - No real database is required
 */

/**
 * Check if the application is running in DEMO mode.
 * Server-side: checks process.env.APP_MODE
 * Client-side: always returns true (demo mode is the default for static deployment)
 */
export function isDemoMode(): boolean {
  // Server-side check
  if (typeof process !== 'undefined' && process.env) {
    return process.env.APP_MODE !== 'production';
  }
  // Client-side: always demo mode unless explicitly set
  return true;
}

/**
 * Get the application mode string.
 */
export function getAppMode(): 'demo' | 'production' {
  return isDemoMode() ? 'demo' : 'production';
}

/**
 * Demo mode banner color.
 */
export const DEMO_MODE_COLOR = '#f59e0b';

/**
 * Demo mode label text.
 */
export const DEMO_MODE_LABEL = 'DEMO MODE';
