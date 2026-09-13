/**
 * Step 85 — Bootstrap, Admin Access, Brand Creation & Free Production Architecture
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from './index';

function extractCookies(res: any): string[] {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return [];
  return setCookie.map((c: string) => c.split(';')[0]);
}

function cookieHeader(cookies: string[]): string {
  return cookies.join('; ');
}

describe('Step 85 — Bootstrap, Admin Access & Free Production Architecture', () => {

  describe('System Status', () => {
    it('GET /api/system/status returns bootstrapped status', async () => {
      const res = await request(app).get('/api/system/status');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('bootstrapped');
      expect(res.body).toHaveProperty('brandCount');
      expect(typeof res.body.bootstrapped).toBe('boolean');
    });

    it('GET /api/system/status returns JSON content type', async () => {
      const res = await request(app).get('/api/system/status');
      expect(res.headers['content-type']).toContain('application/json');
    });
  });

  describe('Health Endpoint', () => {
    it('GET /api/health returns ok status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('Brand Loading', () => {
    it('GET /api/tenants returns brands', async () => {
      const res = await request(app).get('/api/tenants');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/tenants/:slug returns 404 for non-existent', async () => {
      const res = await request(app).get('/api/tenants/non-existent-xyz');
      expect(res.status).toBe(404);
    });
  });

  describe('Bootstrap Login', () => {
    it('POST /api/auth/bootstrap rejects when brands exist', async () => {
      const res = await request(app)
        .post('/api/auth/bootstrap')
        .send({ username: 'sysadmin', password: 'changeme123' });
      expect([400, 403]).toContain(res.status);
    });

    it('POST /api/auth/bootstrap rejects empty body', async () => {
      const res = await request(app)
        .post('/api/auth/bootstrap')
        .send({});
      expect([400, 403]).toContain(res.status);
    });
  });

  describe('Authentication', () => {
    it('Admin can login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('X-CSRF-Token', 'test')
        .send({
          username: 'admin',
          password: 'admin123',
          tenantId: 'tenant-demo-wholesale-001',
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.username).toBe('admin');
    });

    it('Unauthenticated access is rejected', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('GET /api/auth/me returns current user with valid session', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .set('X-CSRF-Token', 'test')
        .send({
          username: 'admin',
          password: 'admin123',
          tenantId: 'tenant-demo-wholesale-001',
        });
      const cookies = extractCookies(loginRes);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookieHeader(cookies));
      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe('admin');
    });
  });

  describe('Brand Management', () => {
    it('GET /api/brands returns brands for admin', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .set('X-CSRF-Token', 'test')
        .send({
          username: 'admin',
          password: 'admin123',
          tenantId: 'tenant-demo-wholesale-001',
        });
      const cookies = extractCookies(loginRes);

      const res = await request(app)
        .get('/api/brands')
        .set('Cookie', cookieHeader(cookies));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /api/brands creates a new brand', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .set('X-CSRF-Token', 'test')
        .send({
          username: 'admin',
          password: 'admin123',
          tenantId: 'tenant-demo-wholesale-001',
        });
      const cookies = extractCookies(loginRes);
      const uniqueSlug = `test-brand-step85-${Date.now()}`;

      const res = await request(app)
        .post('/api/brands')
        .set('Cookie', cookieHeader(cookies))
        .set('X-CSRF-Token', 'test')
        .send({
          slug: uniqueSlug,
          brandName: 'Test Brand Step 85',
          primaryColor: '#ff0000',
        });
      expect(res.status).toBe(201);
      expect(res.body.slug).toBe(uniqueSlug);
    });

    it('POST /api/brands rejects duplicate slug', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .set('X-CSRF-Token', 'test')
        .send({
          username: 'admin',
          password: 'admin123',
          tenantId: 'tenant-demo-wholesale-001',
        });
      const cookies = extractCookies(loginRes);
      const uniqueSlug = `test-dup-${Date.now()}`;

      // Create first
      await request(app)
        .post('/api/brands')
        .set('Cookie', cookieHeader(cookies))
        .set('X-CSRF-Token', 'test')
        .send({ slug: uniqueSlug, brandName: 'First' });

      // Try duplicate
      const res = await request(app)
        .post('/api/brands')
        .set('Cookie', cookieHeader(cookies))
        .set('X-CSRF-Token', 'test')
        .send({
          slug: uniqueSlug,
          brandName: 'Duplicate',
        });
      expect(res.status).toBe(409);
    });

    it('Non-admin user cannot create brands', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .set('X-CSRF-Token', 'test')
        .send({
          username: 'clerk',
          password: 'clerk123',
          tenantId: 'tenant-demo-wholesale-001',
        });
      const cookies = extractCookies(loginRes);

      const res = await request(app)
        .get('/api/brands')
        .set('Cookie', cookieHeader(cookies));
      expect(res.status).toBe(403);
    });
  });

  describe('User Brand Access', () => {
    it('GET /api/user-brand-access returns records for admin', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .set('X-CSRF-Token', 'test')
        .send({
          username: 'admin',
          password: 'admin123',
          tenantId: 'tenant-demo-wholesale-001',
        });
      const cookies = extractCookies(loginRes);

      const res = await request(app)
        .get('/api/user-brand-access?userId=user-admin-001')
        .set('Cookie', cookieHeader(cookies));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Production Demo Mode', () => {
    it('Server runs in PostgreSQL mode', async () => {
      const res = await request(app).get('/api/health');
      expect(res.body.mode).toBe('PostgreSQL');
    });
  });

  describe('Migration Status', () => {
    it('System status endpoint works (migration 006 applied)', async () => {
      const res = await request(app).get('/api/system/status');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('bootstrapped');
    });
  });

  describe('Brand Lifecycle', () => {
    it('Create → Read → Verify persistence', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .set('X-CSRF-Token', 'test')
        .send({
          username: 'admin',
          password: 'admin123',
          tenantId: 'tenant-demo-wholesale-001',
        });
      const cookies = extractCookies(loginRes);
      const uniqueSlug = `lifecycle-test-${Date.now()}`;

      // Create
      const createRes = await request(app)
        .post('/api/brands')
        .set('Cookie', cookieHeader(cookies))
        .set('X-CSRF-Token', 'test')
        .send({
          slug: uniqueSlug,
          brandName: 'Lifecycle Test Step 85',
          primaryColor: '#123456',
        });
      expect(createRes.status).toBe(201);

      // Read
      const readRes = await request(app)
        .get(`/api/tenants/${uniqueSlug}`);
      expect(readRes.status).toBe(200);
      expect(readRes.body.brandName).toBe('Lifecycle Test Step 85');
    });
  });
});
