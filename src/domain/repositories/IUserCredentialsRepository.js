"use strict";
/**
 * User Credentials Repository Interface
 * ISOLATED persistence boundary for credential verification.
 *
 * RULE: NEVER exposed to UI or application services directly.
 * Only accessed for authentication verification.
 *
 * RULE: This repository is for persistence ONLY.
 * Password hashing and verification belong in IAuthService.
 */
Object.defineProperty(exports, "__esModule", { value: true });
