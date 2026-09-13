/**
 * Vercel Serverless Entry Point
 *
 * Re-exports the Express app from src/server/index.ts.
 * Vercel invokes this as a serverless function for all /api/* routes.
 *
 * IMPORTANT: This file must import the real server to get:
 * - Database connection and migrations
 * - All API routes (auth, protected, system)
 * - Middleware (CORS, CSRF, rate limiting, auth)
 * - Domain services and adapters
 */

// Import the main server module which creates and configures the Express app.
// Side effects: creates adapters, services, sets up middleware and routes,
// and initializes the database connection pool.
import app from '../src/server/index';

// Re-export the Express app as the default export for Vercel.
export default app;
