/**
 * Vercel Serverless Function Entry Point
 * Wraps Express app for Vercel deployment.
 */

let app: any = null;

async function getApp() {
  if (app) return app;
  try {
    const mod = await import('../src/server/index');
    app = mod.default;
    return app;
  } catch (err: any) {
    console.error('INIT_ERROR:', err?.message || String(err));
    console.error('INIT_STACK:', err?.stack || 'no stack');
    throw err;
  }
}

export default async function handler(req: any, res: any) {
  try {
    const expressApp = await getApp();
    return expressApp(req, res);
  } catch (err: any) {
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({
      error: 'Server initialization failed',
      message: err?.message || String(err),
    });
  }
}
