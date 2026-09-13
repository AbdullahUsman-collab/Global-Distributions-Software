/**
 * Vercel Serverless Function Entry Point
 * Lazily initializes the Express app on first request.
 */

let app: any = null;

async function getApp() {
  if (!app) {
    const mod = await import('../src/server/index');
    app = mod.default;
  }
  return app;
}

export default async function handler(req: any, res: any) {
  const expressApp = await getApp();
  return expressApp(req, res);
}
