/**
 * Authentication API Routes
 * Handles login, logout, session validation, user resolution,
 * tenant switching, and authorized brand listing.
 *
 * RULE: Password is NEVER returned to the client.
 * RULE: Session ID is set as HTTP-only cookie, not exposed to JavaScript.
 * RULE: Login failures use generic error messages (no username/tenant enumeration).
 * RULE: Rate-limited to prevent brute-force attacks.
 *
 * RULE (46C-4): Tenant switching validates brand access server-side.
 * Client cannot grant itself access or override role.
 */

import { Router, Request, Response } from 'express';
import { IAuthService } from '../../domain/services/IAuthService';
import { ITenantRepository } from '../../domain/repositories/ITenantRepository';
import { getSessionCookieName } from '../middleware/auth';
import { loginRateLimiter } from '../middleware/rateLimit';
import { validateLoginCredentials } from '../lib/validation';

const SESSION_COOKIE_NAME = getSessionCookieName();

const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export function createAuthRoutes(
  authService: IAuthService,
  tenantRepo: ITenantRepository
): Router {
  const router = Router();

  /**
   * POST /api/auth/login
   * Authenticate user and set session cookie.
   */
  router.post('/login', loginRateLimiter, async (req: Request, res: Response) => {
    try {
      const validation = validateLoginCredentials(req.body);
      if (!validation.valid) {
        res.status(400).json({ success: false, error: validation.error });
        return;
      }

      const { username, password, tenantId } = req.body;
      const result = await authService.authenticate({ username, password, tenantId });

      if (!result.success) {
        // Generic error - do not reveal whether username or tenant exists
        res.status(401).json({ success: false, error: 'Invalid credentials' });
        return;
      }

      // Set session as HTTP-only cookie
      res.cookie(SESSION_COOKIE_NAME, result.session.sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: SESSION_DURATION_MS,
        path: '/',
      });

      // Return user info (NOT the session ID)
      res.json({
        success: true,
        user: {
          id: result.user.id,
          username: result.user.username,
          displayName: result.user.displayName,
          role: result.user.role,
          tenantId: result.user.tenantId,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, error: 'Login failed' });
    }
  });

  /**
   * GET /api/auth/me
   * Get current authenticated user from session cookie.
   */
  router.get('/me', async (req: Request, res: Response) => {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];

    if (!sessionId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    try {
      const session = await authService.validateSession(sessionId);
      if (!session) {
        res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
        res.status(401).json({ error: 'Invalid or expired session' });
        return;
      }

      const user = await authService.getUserBySession(sessionId);
      if (!user) {
        res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
        res.status(401).json({ error: 'User not found' });
        return;
      }

      const tenant = await tenantRepo.getTenantById(session.tenantId);
      if (!tenant) {
        res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
        res.status(401).json({ error: 'Tenant not found' });
        return;
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          tenantId: user.tenantId,
        },
        tenant,
      });
    } catch (error) {
      console.error('Session validation error:', error);
      res.status(500).json({ error: 'Session validation failed' });
    }
  });

  /**
   * POST /api/auth/logout
   * Invalidate session and clear cookie.
   */
  router.post('/logout', async (req: Request, res: Response) => {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];

    if (sessionId) {
      await authService.logout(sessionId);
    }

    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    res.json({ success: true });
  });

  /**
   * POST /api/auth/switch-tenant
   * Switch tenant context for authenticated user.
   *
   * Validates brand access server-side, rotates session,
   * returns user info with access-derived role.
   *
   * Request: { tenantId: string }
   * Client MUST NOT provide: userId, role, permissions
   */
  router.post('/switch-tenant', async (req: Request, res: Response) => {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];

    if (!sessionId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    try {
      const { tenantId } = req.body;

      if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }

      if (tenantId.length > 128) {
        res.status(400).json({ error: 'tenantId is too long' });
        return;
      }

      const result = await authService.switchTenant(sessionId, tenantId);

      if (!result.success) {
        res.status(403).json({ error: result.error });
        return;
      }

      // Set new session as HTTP-only cookie (session rotation)
      res.cookie(SESSION_COOKIE_NAME, result.session.sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: SESSION_DURATION_MS,
        path: '/',
      });

      // Return updated user context (NOT the session ID)
      res.json({
        success: true,
        user: {
          id: result.user.id,
          username: result.user.username,
          displayName: result.user.displayName,
          role: result.user.role,
          tenantId: result.user.tenantId,
        },
      });
    } catch (error) {
      console.error('Switch tenant error:', error);
      res.status(500).json({ error: 'Tenant switch failed' });
    }
  });

  /**
   * GET /api/auth/tenants
   * List authorized tenants (brands) for authenticated user.
   *
   * Returns only brands where:
   * - user_brand_access.is_active = true
   * - tenant.is_active = true
   *
   * Never exposes unauthorized tenants.
   */
  router.get('/tenants', async (req: Request, res: Response) => {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];

    if (!sessionId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    try {
      const session = await authService.validateSession(sessionId);
      if (!session) {
        res.status(401).json({ error: 'Invalid or expired session' });
        return;
      }

      const tenants = await authService.getAuthorizedTenants(session.userId);
      res.json(tenants);
    } catch (error) {
      console.error('Error listing authorized tenants:', error);
      res.status(500).json({ error: 'Failed to list tenants' });
    }
  });

  /**
   * POST /api/auth/change-password
   * Change the authenticated user's own password.
   *
   * SECURITY:
   * - userId derived from session (NOT from request body)
   * - currentPassword verified against stored hash
   * - new password validated for minimum requirements
   * - session preserved after change
   * - no password or hash returned in response
   */
  router.post('/change-password', async (req: Request, res: Response) => {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];

    if (!sessionId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    try {
      const session = await authService.validateSession(sessionId);
      if (!session) {
        res.status(401).json({ success: false, error: 'Invalid or expired session' });
        return;
      }

      const { currentPassword, newPassword, confirmPassword } = req.body;

      // Validate required fields
      if (!currentPassword || typeof currentPassword !== 'string') {
        res.status(400).json({ success: false, error: 'Current password is required' });
        return;
      }
      if (!newPassword || typeof newPassword !== 'string') {
        res.status(400).json({ success: false, error: 'New password is required' });
        return;
      }
      if (!confirmPassword || typeof confirmPassword !== 'string') {
        res.status(400).json({ success: false, error: 'Password confirmation is required' });
        return;
      }

      // Validate new password minimum length
      if (newPassword.length < 6) {
        res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
        return;
      }

      // Validate confirmation matches
      if (newPassword !== confirmPassword) {
        res.status(400).json({ success: false, error: 'New password and confirmation do not match' });
        return;
      }

      // Delegate to auth service — userId derived from session, NOT from body
      const result = await authService.changePassword(session.userId, {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }

      // Success — no password, no hash, no session changes returned
      res.json({ success: true });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ success: false, error: 'Password change failed' });
    }
  });

  return router;
}

/**
 * Tenant discovery routes (public, no auth required).
 * Mounted at /api directly (not /api/auth).
 */
export function createTenantRoutes(tenantRepo: ITenantRepository): Router {
  const router = Router();

  /**
   * GET /api/tenants
   * List public tenants (unauthenticated).
   */
  router.get('/tenants', async (_req: Request, res: Response) => {
    try {
      const tenants = await tenantRepo.getPublicTenants();
      res.json(tenants);
    } catch (error) {
      console.error('Error listing tenants:', error);
      res.status(500).json({ error: 'Failed to list tenants' });
    }
  });

  /**
   * GET /api/tenants/:slug
   * Get a single public tenant by slug (unauthenticated).
   */
  router.get('/tenants/:slug', async (req: Request, res: Response) => {
    try {
      const slug = req.params.slug;
      if (!slug || slug.length > 128) {
        res.status(400).json({ error: 'Invalid slug' });
        return;
      }
      const tenant = await tenantRepo.getTenantBySlug(slug);
      if (!tenant) {
        res.status(404).json({ error: 'Tenant not found' });
        return;
      }
      res.json(tenant);
    } catch (error) {
      console.error('Error fetching tenant by slug:', error);
      res.status(500).json({ error: 'Failed to fetch tenant' });
    }
  });

  return router;
}
