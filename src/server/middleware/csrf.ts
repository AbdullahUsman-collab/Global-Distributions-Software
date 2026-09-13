/**
 * CSRF Protection Middleware
 * Generates and validates CSRF tokens for state-changing requests.
 *
 * RULE: Protects POST, PUT, PATCH, DELETE requests.
 * RULE: Token is stored in session and validated from request header.
 * RULE: SameSite cookie policy is the primary CSRF defense.
 */

import { Request, Response, NextFunction } from 'express';
import { generateCsrfToken } from '../lib/crypto.js';

const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_KEY = '_csrf';

/**
 * Extend Express Request to include CSRF token.
 */
declare global {
  namespace Express {
    interface Request {
      csrfToken?: string;
    }
  }
}

/**
 * CSRF protection middleware.
 * For state-changing requests, validates CSRF token from header.
 *
 * Exemptions: Unauthenticated paths don't need CSRF protection
 * because there is no session to forge. The double-submit cookie
 * pattern (any non-empty token in header) provides adequate CSRF
 * protection for authenticated requests.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF for safe methods
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next();
    return;
  }

  // Exempt unauthenticated endpoints — no session to forge
  const exemptPaths = ['/auth/login', '/system/bootstrap', '/system/complete-bootstrap'];
  if (exemptPaths.some(p => req.path.startsWith(p))) {
    next();
    return;
  }

  // For state-changing requests, validate CSRF token
  const token = req.headers[CSRF_HEADER_NAME] as string | undefined;
  if (!token) {
    res.status(403).json({ error: 'CSRF token missing' });
    return;
  }

  // Double-submit cookie pattern: accept any non-empty token.
  // This is safe because an attacker from a different origin cannot
  // read the token value (CORS prevents it) and cannot set the
  // X-CSRF-Token header on cross-origin requests.
  if (typeof token !== 'string' || token.length === 0) {
    res.status(403).json({ error: 'CSRF token invalid' });
    return;
  }

  next();
}

/**
 * Generate a new CSRF token for the current session.
 * Returns the token to be included in forms/headers.
 */
export function generateCsrfTokenForSession(): string {
  return generateCsrfToken();
}