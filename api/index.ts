/**
 * Vercel Serverless Function Entry Point
 * Uses lazy initialization so module errors don't crash the function.
 */

let appPromise: Promise<any> | null = null;

function loadApp(): Promise<any> {
  if (!appPromise) {
    appPromise = import('../src/server/index')
      .then((mod) => mod.default)
      .catch((err) => {
        console.error('Failed to load Express app:', err);
        appPromise = null;
        throw err;
      });
  }
  return appPromise;
}

export default async function handler(req: any, res: any) {
  try {
    const app = await loadApp();
    return app(req, res);
  } catch (err: any) {
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({
      error: 'Server initialization failed',
      message: err?.message || String(err),
    });
  }
}
