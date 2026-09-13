/**
 * Vercel Serverless Function Entry Point
 * Wraps the Express app for Vercel deployment.
 *
 * This file exports the Express app as a Vercel serverless function.
 * Vercel detects the Express app and converts it to a serverless function.
 */

import app from '../src/server/index';

export default app;
