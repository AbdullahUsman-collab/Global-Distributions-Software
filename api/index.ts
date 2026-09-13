/**
 * Vercel Serverless Function Entry Point
 * Wraps the Express app for Vercel deployment.
 */

import app from '../src/server/index';

// Export the Express app as a Vercel serverless function.
// DB initialization is triggered at module import time by src/server/index.ts.
export default app;
