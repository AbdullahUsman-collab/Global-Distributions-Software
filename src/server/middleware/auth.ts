/**
 * Authentication Middleware
 * Server-side session validation and user attachment.
 *
 * RULE: tenantId, role, permissions are resolved server-side from session.
 * RULE: Client-provided tenantId/role/createdBy are NEVER trusted.
 * RULE: Session is validated from HTTP-only cookie, not localStorage.
 */

import { Request, Response, NextFunction } from 'express';
import { ISessionRepository } from '../../domain/repositories/ISessionRepository';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserSession, User } from '../../domain/types/auth';

declare global {
  namespace Express {
    interface Request {
      session?: UserSession;
      user?: User;
    }
  }
}

const SESSION_COOKIE_NAME = 'erp_session';

/**
 * Create authentication middleware.
 * Validates session from HTTP-only cookie and attaches user to request.
 */
export function createAuthMiddleware(
  sessionRepo: ISessionRepository,
  userRepo: IUserRepository
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];

    if (!sessionId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    try {
      const session = await sessionRepo.getSession(sessionId);
      if (!session) {
        res.status(401).json({ error: 'Invalid or expired session' });
        return;
      }

      const user = await userRepo.findById(session.userId);
      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      if (!user.isActive) {
        res.status(401).json({ error: 'Account is deactivated' });
        return;
      }

      // Attach session and user to request
      req.session = session;
      req.user = user;

      next();
    } catch (error) {
      console.error('Session validation error:', error);
      res.status(500).json({ error: 'Session validation failed' });
    }
  };
}

/**
 * Middleware to require a specific permission.
 * Must be used AFTER requireAuth.
 */
export function requirePermissionMiddleware(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Import dynamically to avoid circular dependency
    const { hasPermission } = require('../../domain/services/AuthorizationService');
    if (!hasPermission(req.user.role, permission)) {
      res.status(403).json({
        error: `Insufficient permissions: requires "${permission}"`,
      });
      return;
    }

    next();
  };
}

/**
 * Get the session cookie name.
 */
export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}
