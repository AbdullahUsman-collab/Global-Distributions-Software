import express from 'express';

const app = express();
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, status: 'minimal express works' });
});

app.all('/api/*', (_req, res) => {
  res.json({ message: 'API works' });
});

export default app;
