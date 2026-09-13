/**
 * Vercel Serverless Function — Self-Contained Minimal Server
 * 
 * Handles core API routes directly without the full server import chain.
 * Connects to Supabase PostgreSQL when DATABASE_URL is set.
 */

import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const app = express();
app.use(cookieParser());
app.use(express.json());

// ─── Helpers ────────────────────────────────────────────────
const SALT_ROUNDS = 12;

let pgPool: any = null;

async function getPool() {
  if (pgPool) return pgPool;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  const { default: pg } = await import('pg');
  pgPool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
  return pgPool;
}

async function query(text: string, params?: any[]) {
  const pool = await getPool();
  if (!pool) throw new Error('No database configured');
  return pool.query(text, params);
}

// ─── Health ─────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  const pool = await getPool();
  let dbStatus = 'not configured';
  if (pool) {
    try { await pool.query('SELECT 1'); dbStatus = 'connected'; } catch { dbStatus = 'failed'; }
  }
  res.json({ status: 'ok', database: dbStatus, timestamp: new Date().toISOString() });
});

// ─── System Status (public) ─────────────────────────────────
app.get('/api/system/status', async (_req, res) => {
  try {
    const result = await query(
      `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'`
    );
    const tableCount = parseInt(result.rows[0]?.count || '0');
    res.json({ bootstrapped: tableCount > 5, tableCount, message: tableCount > 5 ? 'System ready' : 'Setup required' });
  } catch (err: any) {
    res.json({ bootstrapped: false, tableCount: 0, message: 'Database not available', error: err.message });
  }
});

// ─── Tenants (public) ───────────────────────────────────────
app.get('/api/tenants', async (_req, res) => {
  try {
    const result = await query(
      `SELECT id, "tenantId" as "tenantId", "brandName" as "brandName", slug, "primaryColor" as "primaryColor", "isActive" as "isActive"
       FROM tenants WHERE "isActive" = true ORDER BY "brandName"`
    );
    res.json(result.rows);
  } catch {
    res.json([]);
  }
});

app.get('/api/tenants/:slug', async (req, res) => {
  try {
    const result = await query(`SELECT * FROM tenants WHERE slug = $1 AND "isActive" = true`, [req.params.slug]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Brand not found' });
    res.json(result.rows[0]);
  } catch {
    res.status(404).json({ error: 'Brand not found' });
  }
});

// ─── Auth ───────────────────────────────────────────────────
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function getCorsOrigins(): string[] {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(',').map((o: string) => o.trim());
  }
  return ['http://localhost:5173', 'http://localhost:3000'];
}

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, tenantId } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const userResult = await query(
      `SELECT u.id, u.username, u."fullName" as "fullName", u.role, u."isActive" as "isActive"
       FROM users u JOIN user_credentials uc ON u.id = uc.user_id
       WHERE u.username = $1 AND u."tenantId" = $2 AND u."isActive" = true`,
      [username, tenantId || 'tenant-demo-wholesale-001']
    );
    if (userResult.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = userResult.rows[0];
    const credResult = await query(`SELECT password_hash FROM user_credentials WHERE user_id = $1`, [user.id]);
    if (credResult.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, credResult.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION).toISOString();
    await query(`INSERT INTO sessions (id, user_id, "tenantId", "expiresAt") VALUES ($1, $2, $3, $4)`,
      [token, user.id, user.tenant_id || tenantId || 'tenant-demo-wholesale-001', expiresAt]);

    const origins = getCorsOrigins();
    const sameSite = process.env.NODE_ENV === 'production' && process.env.ALLOWED_ORIGINS ? 'none' : 'lax';
    res.setHeader('Set-Cookie', `session=${token}; HttpOnly; Path=/; SameSite=${sameSite}; Max-Age=${SESSION_DURATION / 1000}${sameSite === 'none' ? '; Secure' : ''}`);
    res.json({ user: { id: user.id, username: user.username, fullName: user.fullName, role: user.role, tenantId: user.tenant_id || tenantId || 'tenant-demo-wholesale-001' } });
  } catch (err: any) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const cookie = req.headers.cookie || '';
    const match = cookie.match(/session=([^;]+)/);
    if (!match) return res.status(401).json({ error: 'Not authenticated' });

    const sessionResult = await query(
      `SELECT s.*, u.username, u."fullName" as "fullName", u.role
       FROM sessions s JOIN users u ON s.user_id = u.id
       WHERE s.id = $1 AND s."expiresAt" > NOW()`,
      [match[1]]
    );
    if (sessionResult.rows.length === 0) return res.status(401).json({ error: 'Session expired' });

    const s = sessionResult.rows[0];
    res.json({ user: { id: s.user_id, username: s.username, fullName: s.fullName, role: s.role, tenantId: s.tenantId } });
  } catch {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const cookie = req.headers.cookie || '';
    const match = cookie.match(/session=([^;]+)/);
    if (match) await query(`DELETE FROM sessions WHERE id = $1`, [match[1]]);
    res.setHeader('Set-Cookie', 'session=; HttpOnly; Path=/; Max-Age=0');
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

// ─── Brands (admin) ─────────────────────────────────────────
async function requireAuth(req: any, res: any): Promise<any | null> {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/session=([^;]+)/);
  if (!match) { res.status(401).json({ error: 'Not authenticated' }); return null; }
  const r = await query(
    `SELECT s.*, u.username, u."fullName" as "fullName", u.role
     FROM sessions s JOIN users u ON s.user_id = u.id
     WHERE s.id = $1 AND s."expiresAt" > NOW()`, [match[1]]);
  if (r.rows.length === 0) { res.status(401).json({ error: 'Session expired' }); return null; }
  return r.rows[0];
}

app.get('/api/brands', async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;
  if (user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
  try {
    const result = await query(`SELECT * FROM tenants ORDER BY "brandName"`);
    res.json(result.rows);
  } catch { res.json([]); }
});

app.post('/api/brands', async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;
  if (user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
  const { slug, brandName, primaryColor } = req.body;
  if (!slug || !brandName) return res.status(400).json({ error: 'slug and brandName required' });
  try {
    const existing = await query(`SELECT id FROM tenants WHERE slug = $1`, [slug]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Slug already exists' });
    const id = `tenant-${slug}-${Date.now()}`;
    await query(`INSERT INTO tenants (id, "tenantId", slug, "brandName", "primaryColor", "isActive", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())`, [id, id, slug, brandName, primaryColor || '#1a5276']);
    res.status(201).json({ id, slug, brandName, primaryColor: primaryColor || '#1a5276', isActive: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/brands/:id', async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;
  if (user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
  const { brandName, primaryColor } = req.body;
  try {
    await query(`UPDATE tenants SET "brandName" = COALESCE($1, "brandName"), "primaryColor" = COALESCE($2, "primaryColor"), "updatedAt" = NOW() WHERE id = $3`,
      [brandName, primaryColor, req.params.id]);
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── User Brand Access ──────────────────────────────────────
app.get('/api/user-brand-access', async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;
  try {
    const result = await query(`SELECT * FROM user_brand_access WHERE "tenantId" = $1`, [user.tenantId]);
    res.json(result.rows);
  } catch { res.json([]); }
});

// ─── Users ──────────────────────────────────────────────────
app.get('/api/users', async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;
  if (user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
  try {
    const result = await query(`SELECT id, username, "fullName" as "fullName", role, "isActive" as "isActive", "tenantId" FROM users ORDER BY "fullName"`);
    res.json(result.rows);
  } catch { res.json([]); }
});

// ─── Catch-all for unmatched API routes ─────────────────────
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found', path: req.path });
});

export default app;
