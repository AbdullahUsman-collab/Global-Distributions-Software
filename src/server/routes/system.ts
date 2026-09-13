/**
 * System Bootstrap Routes
 * Handles initial system setup when zero brands exist.
 *
 * SECURITY:
 * - Bootstrap login only works when zero non-system brands exist
 * - System admin credentials are set during first bootstrap
 * - All bootstrap operations are logged for audit
 * - Rate limiting prevents brute-force attacks
 */

import { Router, Request, Response } from 'express';
import { randomBytes, createHash } from 'crypto';
import { ITenantRepository } from '../../domain/repositories/ITenantRepository';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { IUserCredentialsRepository } from '../../domain/repositories/IUserCredentialsRepository';
import { IUserBrandAccessRepository } from '../../domain/repositories/IUserBrandAccessRepository';
import { ISessionRepository } from '../../domain/repositories/ISessionRepository';
import { loginRateLimiter } from '../middleware/rateLimit';
import { hashPassword, verifyPassword } from '../lib/password';

const SYSTEM_TENANT_ID = 'system-000';
const SYSTEM_ADMIN_USER_ID = 'user-system-admin-000';
const SESSION_COOKIE_NAME = 'erp_session';
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Get cookie options based on environment.
 */
function getCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  const isCrossOrigin = isProd && !!process.env.ALLOWED_ORIGINS;
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isCrossOrigin ? ('none' as const) : (isProd ? ('strict' as const) : ('lax' as const)),
    maxAge: SESSION_DURATION_MS,
    path: '/',
  };
}

export function createSystemRoutes(
  tenantRepo: ITenantRepository,
  userRepo: IUserRepository,
  credentialsRepo: IUserCredentialsRepository,
  brandAccessRepo: IUserBrandAccessRepository,
  sessionRepo: ISessionRepository
): Router {
  const router = Router();

  /**
   * GET /api/system/status
   * Public endpoint to check if system is bootstrapped.
   * Returns whether brands exist and system is ready.
   */
  router.get('/status', async (_req: Request, res: Response) => {
    try {
      const tenants = await tenantRepo.getPublicTenants();
      const hasBrands = tenants.length > 0;
      
      res.json({
        bootstrapped: hasBrands,
        brandCount: tenants.length,
        message: hasBrands 
          ? 'System is ready'
          : 'System setup required — no brands configured',
      });
    } catch (error) {
      console.error('System status error:', error);
      res.status(500).json({ error: 'Failed to check system status' });
    }
  });

  /**
   * POST /bootstrap
   * Bootstrap login for initial system setup.
   * ONLY works when zero non-system brands exist.
   * 
   * Security:
   * - Only sysadmin can bootstrap
   * - Only works when zero brands exist
   * - Rate limited to prevent brute-force
   * - Password is verified against stored hash
   */
  router.post('/bootstrap', loginRateLimiter, async (req: Request, res: Response) => {
    try {
      // Check if brands already exist
      const tenants = await tenantRepo.getPublicTenants();
      if (tenants.length > 0) {
        res.status(400).json({ 
          error: 'System is already bootstrapped. Use normal login.' 
        });
        return;
      }

      const { username, password, newPassword } = req.body;
      
      // Validate input
      if (!username || typeof username !== 'string') {
        res.status(400).json({ error: 'Username is required' });
        return;
      }
      if (!password || typeof password !== 'string') {
        res.status(400).json({ error: 'Password is required' });
        return;
      }

      // Only allow sysadmin username
      if (username !== 'sysadmin') {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Get system admin user
      const user = await userRepo.findById(SYSTEM_ADMIN_USER_ID);
      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      if (!user.isActive) {
        res.status(401).json({ error: 'Account is deactivated' });
        return;
      }

      // Get credentials
      const credentials = await credentialsRepo.getCredentialsByUserId(SYSTEM_ADMIN_USER_ID);
      if (!credentials) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Verify password
      const isValid = await verifyPassword(password, credentials.passwordHash);
      if (!isValid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // If newPassword provided, update the password
      if (newPassword && typeof newPassword === 'string' && newPassword.length >= 6) {
        const newHash = await hashPassword(newPassword);
        await credentialsRepo.updateCredentials(SYSTEM_ADMIN_USER_ID, newHash);
      }

      // Create session
      const session = await sessionRepo.createSession(SYSTEM_TENANT_ID, SYSTEM_ADMIN_USER_ID);

      // Set session cookie
      res.cookie(SESSION_COOKIE_NAME, session.sessionId, getCookieOptions());

      // Return user info
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: 'ADMIN',
          tenantId: SYSTEM_TENANT_ID,
        },
        isBootstrap: true,
        message: 'System admin authenticated. Create your first brand.',
      });
    } catch (error) {
      console.error('Bootstrap login error:', error);
      res.status(500).json({ error: 'Bootstrap login failed' });
    }
  });

  /**
   * POST /api/system/complete-bootstrap
   * Complete bootstrap by creating first brand and assigning admin access.
   * Only works when authenticated as system admin and zero brands exist.
   */
  router.post('/complete-bootstrap', async (req: Request, res: Response) => {
    try {
      // Verify authentication
      const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
      if (!sessionId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const session = await sessionRepo.getSession(sessionId);
      if (!session || session.userId !== SYSTEM_ADMIN_USER_ID) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Check if brands already exist
      const tenants = await tenantRepo.getPublicTenants();
      if (tenants.length > 0) {
        res.status(400).json({ 
          error: 'System is already bootstrapped' 
        });
        return;
      }

      const { brandName, slug, primaryColor, accentColor } = req.body;
      
      // Validate input
      if (!brandName || typeof brandName !== 'string' || brandName.trim() === '') {
        res.status(400).json({ error: 'brandName is required' });
        return;
      }
      if (!slug || typeof slug !== 'string' || slug.trim() === '') {
        res.status(400).json({ error: 'slug is required' });
        return;
      }

      // Check slug uniqueness
      const existing = await tenantRepo.getTenantBySlug(slug);
      if (existing) {
        res.status(409).json({ error: 'A brand with this slug already exists' });
        return;
      }

      // Create brand
      const brand = await tenantRepo.createTenant({
        slug,
        brandName,
        logoUrl: '',
        primaryColor: primaryColor || '#3b82f6',
        accentColor: accentColor || '#1e40af',
      });

      // Create user_brand_access for system admin
      await brandAccessRepo.create({
        userId: SYSTEM_ADMIN_USER_ID,
        tenantId: brand.id,
        role: 'ADMIN',
        isActive: true,
      });

      res.status(201).json({
        success: true,
        brand,
        message: 'First brand created. System is now bootstrapped.',
      });
    } catch (error) {
      console.error('Complete bootstrap error:', error);
      res.status(500).json({ error: 'Failed to complete bootstrap' });
    }
  });

  return router;
}
