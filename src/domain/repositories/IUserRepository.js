"use strict";
/**
 * User Repository Interface
 * Persistence boundary for user data access.
 *
 * RULE: NEVER exposes passwordHash or credential data.
 * Returns only public User model.
 */
Object.defineProperty(exports, "__esModule", { value: true });
