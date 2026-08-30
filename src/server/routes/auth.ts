/**
 * Authentication API Routes
 * Handles login, logout, session validation, and user resolution.
 *
 * RULE: Password is NEVER returned to the client.
 * RULE: Session ID is set as HTTP-only cookie, not exposed to JavaScript.
 * RULE: Login failures use generic error messages (no username/tenant enumeration).
 * RULE: Rate-limited to prevent brute-force attacks.
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

  return router;
}
