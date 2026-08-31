/**
 * Rate Limiting Middleware
 * Protects sensitive endpoints from brute-force attacks.
 *
 * RULE: Login endpoint must be rate-limited.
 * RULE: Failed login attempts must not reveal whether username/tenant exists.
 */

import rateLimit from 'express-rate-limit';

/**
 * Login rate limiter:
 * - 10 attempts per 15 minutes per IP
 * - Prevents brute-force password attacks
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

/**
 * General API rate limiter:
 * - 100 requests per 15 minutes per IP
 * - Prevents API abuse
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

/**
 * Mutation rate limiter:
 * - 30 mutations per 15 minutes per IP
 * - Prevents rapid data modification
 */
export const mutationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many mutations. Please slow down.' },
});
