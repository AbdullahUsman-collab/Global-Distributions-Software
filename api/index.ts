/**
 * Vercel Serverless Entry Point
 *
 * Re-exports the Express app from src/server/index.ts with proper
 * database initialization lifecycle management.
 *
 * Architecture:
 *   1. Module loads → src/server/index.ts creates Express app + fires initDatabase()
 *   2. Vercel handler awaits dbReady before passing request to Express
 *   3. Express handles the request with fully initialized pool
 */

import app, { dbReady } from '../src/server/index.js';

export default async function handler(req: any, res: any) {
  await dbReady;
  return app(req, res);
}
