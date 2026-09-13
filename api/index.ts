/**
 * Vercel Serverless Function — Express Minimal
 */
import express from 'express';

const app = express();
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.all('/api/*', (_req, res) => {
  res.json({ message: 'API works' });
});

export default app;
