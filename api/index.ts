/**
 * Vercel Serverless Entry Point
 *
 * Re-exports the Express app from src/server/index.ts with proper
 * database initialization lifecycle management.
 *
 * CRITICAL: Vercel invokes this as a serverless function for all /api/* routes.
 * The database pool MUST be initialized before any request is processed.
 *
 * Architecture:
 *   1. Module loads → src/server/index.ts creates Express app + fires initDatabase()
 *   2. Vercel handler awaits dbReady before passing request to Express
 *   3. Express handles the request with fully initialized pool
 */

import app, { dbReady } from '../src/server/index';

/**
 * Vercel serverless handler.
 * Awaits database initialization, then delegates to Express.
 * This prevents the race condition where requests arrive before the pool is ready.
 */
export default async function handler(req: any, res: any) {
  // Wait for database initialization to complete.
  // If initialization failed, the pool is null and Express routes
  // will handle the error appropriately.
  await dbReady;

  return app(req, res);
}
