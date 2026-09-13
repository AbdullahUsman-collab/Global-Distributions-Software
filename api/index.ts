/**
 * Vercel Serverless Entry Point
 *
 * Dynamic-import approach: loads src/server/index lazily so any
 * import-time crash is caught and reported instead of silently
 * producing FUNCTION_INVOCATION_FAILED.
 */

import type { IncomingMessage, ServerResponse } from 'http';

let appPromise: Promise<any> | null = null;

function getApp(): Promise<any> {
  if (!appPromise) {
    appPromise = import('../src/server/index').then((mod) => {
      const app = mod.default;
      const dbReady = mod.dbReady as Promise<void>;
      return { app, dbReady };
    });
  }
  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('X-Powered-By', 'distribution-erp');

  try {
    const { app, dbReady } = await getApp();
    await dbReady;
    return app(req, res);
  } catch (error: any) {
    console.error('Vercel handler error:', error);
    const statusCode = 500;
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      status: 'error',
      message: 'Server initialization failed',
      detail: process.env.NODE_ENV === 'production'
        ? 'Internal server error — check function logs'
        : error?.message || String(error),
    }));
  }
}
