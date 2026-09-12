/**
 * Application Mode Configuration
 * Controls whether the application runs in DEMO mode (mock data) or PRODUCTION mode (PostgreSQL).
 *
 * Production (VITE_DEMO_MODE=false or unset):
 *   - Real PostgreSQL adapters are used
 *   - All API calls go to the Express backend
 *   - Errors are thrown if backend is unavailable
 *
 * Demo (VITE_DEMO_MODE=true):
 *   - Client-side mock data is used
 *   - For development/Vercel demo only
 */

/**
 * Check if the application is running in DEMO mode.
 * Uses Vite's import.meta.env on the client side.
 */
export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO_MODE === 'true';
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
