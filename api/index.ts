/**
 * Vercel Serverless Function Entry Point
 */

let app: any = null;
let initError: string | null = null;

async function getApp() {
  if (app) return app;
  try {
    const mod = await import('./dist/server');
    app = mod.default;
    return app;
  } catch (err: any) {
    initError = err?.message || String(err);
    console.error('Failed to initialize Express app:', err);
    return null;
  }
}

export default async function handler(req: any, res: any) {
  const expressApp = await getApp();
  if (!expressApp) {
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({
      error: 'Server initialization failed',
      message: initError,
    });
    return;
  }
  return expressApp(req, res);
}
