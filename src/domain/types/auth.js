"use strict";
/**
 * Authentication Domain Types
 * First-party authentication with free-text username support.
 *
 * RULE: User model MUST NOT contain passwordHash.
 * RULE: Free-text username is supported as login ID (email NOT required).
 * RULE: No third-party auth providers (Auth0, Clerk, Firebase, Supabase).
 */
Object.defineProperty(exports, "__esModule", { value: true });
