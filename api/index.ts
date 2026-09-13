/**
 * Vercel Serverless Function Entry Point
 * Wraps Express app for Vercel deployment.
 * Vercel auto-detects this as an Express app and deploys it as a serverless function.
 */

import app from '../src/server/index';

export default app;
