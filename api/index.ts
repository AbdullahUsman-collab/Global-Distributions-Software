/**
 * Vercel Serverless Function Entry Point
 * Imports the pre-bundled Express server.
 * The server is bundled by esbuild (src/server/index.ts → api/dist/server.js)
 * with bcrypt/pg as externals so @vercel/node can resolve them from node_modules.
 */

import app from './dist/server';

export default app;
