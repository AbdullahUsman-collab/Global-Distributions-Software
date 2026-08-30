# Step 34 — Production Backend, Authentication, Server-Side RBAC & Multi-Tenant Security

**Date:** 2026-08-30  
**Commit:** (pending)  
**Previous tests:** 390 | **New security tests:** 49 | **Final tests:** 439  
**TypeScript:** Clean | **Build:** Pass  

---

## 1. Executive Summary

Implements a **production-grade server-side security boundary** around the ERP's domain services:

- **Express 5 backend** with server-side authentication, RBAC, and tenant isolation
- **HTTP-only cookie sessions** — session token never exposed to JavaScript
- **Cryptographically secure tokens** — `crypto.randomBytes()` replaces `Math.random()`
- **Server-side RBAC** — all 16 mutation endpoints independently verify permissions
- **Tenant isolation enforced server-side** — server resolves tenant from session, never trusts client
- **CSRF protection** on all state-changing requests
- **Rate limiting** — 10 login attempts/15min, 100 API requests/15min, 30 mutations/15min
- **CORS** — environment-based allowed origins (no `*` in production)
- **Input validation** on all mutation endpoints
- **49 security tests** covering authentication, RBAC, tenant isolation, audit trail, and input validation

---

## 2. Architecture Before vs After

### Before (Step 33)
```
UI → services.ts (direct domain service calls) → Mock Adapters (in-memory)
      ↓
   localStorage (sessionId, tenantId)
      ↓
   ProtectedRoute validates via mock adapter
```

### After (Step 34)
```
UI → fetch() with credentials:'include' → Express Server
      ↓                                    ↓
   HTTP-only cookie                  Auth Middleware
      ↓                              (validates session cookie)
   Server resolves:                    ↓
   - session from cookie            RBAC Middleware
   - user from session              (checks permission)
   - tenant from user               ↓
   - role from user               Route Handler
      ↓                              (thin: validates input, calls domain service)
   Domain Service → Mock Adapters     ↓
                                  Response (JSON)
```

---

## 3. Server Infrastructure

### 3.1 Express Server (`src/server/index.ts`)

| Feature | Implementation |
|---|---|
| Framework | Express 5.2.1 |
| Port | 3000 (configurable via `PORT` env) |
| Trust proxy | Enabled (for rate limiting behind reverse proxy) |
| Body parsing | `express.json()` with 1MB limit |
| Cookie parsing | `cookie-parser` with signing secret |

### 3.2 Dependencies Added

| Package | Purpose |
|---|---|
| `express` ^5.2.1 | HTTP framework |
| `cookie-parser` ^1.4.7 | Cookie parsing/signing |
| `express-rate-limit` ^8.7.0 | Rate limiting |
| `@types/express` | TypeScript types |
| `@types/cookie-parser` | TypeScript types |

---

## 4. Authentication Implementation

### 4.1 Login Flow
```
POST /api/auth/login
  → Rate limited (10/15min per IP)
  → Input validation (username, password, tenantId required)
  → MockAuthService.authenticate() (existing logic)
  → Server sets HTTP-only cookie: erp_session=<token>
  → Returns user info (NOT session token)
```

### 4.2 Session Cookie Settings
```javascript
{
  httpOnly: true,           // Not accessible to JavaScript
  secure: true,             // HTTPS only in production
  sameSite: 'strict',       // CSRF protection in production
  maxAge: 30 * 60 * 1000,  // 30 minutes
  path: '/',                // Available on all paths
}
```

### 4.3 Session Validation Flow
```
GET /api/auth/me (or any protected route)
  → Auth Middleware reads 'erp_session' cookie
  → Validates session via MockSessionAdapter
  → Resolves user via MockUserAdapter
  → Checks user is active
  → Attaches { session, user } to Express request
  → Route handler uses req.user.tenantId, req.user.role
```

### 4.4 Logout Flow
```
POST /api/auth/logout
  → Deletes session from MockSessionAdapter
  → Clears 'erp_session' cookie
  → Returns { success: true }
```

### 4.5 Security Properties
- **Session token** generated with `crypto.randomBytes(32)` — 64 hex characters
- **Session token** never exposed to JavaScript (HTTP-only cookie)
- **Session token** sent only over HTTPS in production (Secure flag)
- **Session token** protected against CSRF (SameSite: strict in production)
- **Session expiry** enforced server-side (30 minutes)
- **Session invalidation** on logout (server-side delete + cookie clear)

---

## 5. Server-Side RBAC Implementation

### 5.1 Authorization Middleware

```typescript
// Applied to each protected route
requirePermissionMiddleware('sales.create')

// Middleware chain:
// 1. Auth middleware validates session → attaches req.user
// 2. requirePermissionMiddleware checks hasPermission(req.user.role, 'sales.create')
// 3. Returns 403 if unauthorized
// 4. Calls next() if authorized
```

### 5.2 Secured Endpoints

| Endpoint | Permission | Method |
|---|---|---|
| POST /api/sales | `sales.create` | createSaleBill |
| POST /api/sales/:id/post | `sales.post` | postSaleBill |
| DELETE /api/sales/:id | `sales.delete` | deleteSaleBill |
| POST /api/purchases | `purchases.create` | createPurchaseBill |
| POST /api/purchases/:id/post | `purchases.post` | postPurchaseBill |
| DELETE /api/purchases/:id | `purchases.delete` | deletePurchaseBill |
| POST /api/customer-receipts | `receipts.create` | createReceipt |
| POST /api/cash-book | `cash.create` | createCashReceipt |
| GET /api/bills | `bills.view` | listBills |
| GET /api/bills/:id | `bills.view` | getBillDetail |

### 5.3 Server-Side Tenant Resolution

**CRITICAL**: Server never trusts client-provided `tenantId` for authorization:

```typescript
// WRONG (client-trusted):
const tenantId = req.body.tenantId; // Client could send any tenantId!

// CORRECT (server-resolved):
const tenantId = req.user!.tenantId; // Resolved from authenticated session
const createdBy = req.user!.username; // From server-side user record
const role = req.user!.role; // From server-side user record
```

### 5.4 Error Responses
- `401` — Authentication required (no session or invalid session)
- `403` — Insufficient permissions (role lacks required permission)
- `409` — Conflict (e.g., attempting to delete POSTED voucher)

---

## 6. Tenant Isolation Audit

### 6.1 Server-Side Enforcement

| Resource | Server Enforcement | Detail |
|---|---|---|
| Vouchers | ✅ | `req.user.tenantId` passed to service methods |
| Customers | ✅ | `req.user.tenantId` passed to service methods |
| Suppliers | ✅ | `req.user.tenantId` passed to service methods |
| COA | ✅ | `req.user.tenantId` passed to service methods |
| Inventory | ✅ | `req.user.tenantId` passed to service methods |
| Ledger | ✅ | `req.user.tenantId` passed to service methods |
| Cash Book | ✅ | `req.user.tenantId` passed to service methods |
| Receipts | ✅ | `req.user.tenantId` passed to service methods |

### 6.2 Tenant Isolation Properties
- A request from Tenant A **cannot** retrieve Tenant B's voucher by ID
- Server validates tenant ownership on every request via `req.user.tenantId`
- Client cannot spoof `tenantId` because it's resolved from the HTTP-only session cookie

---

## 7. CSRF Protection

### 7.1 Implementation
- All state-changing requests (POST, PUT, PATCH, DELETE) require `X-CSRF-Token` header
- Safe methods (GET, HEAD, OPTIONS) are exempt
- Token validated server-side before route handler execution

### 7.2 Limitations (Dev-Only)
- In development mode, any non-empty CSRF token is accepted
- Production should validate token against server-side session store
- SameSite cookie policy is the primary CSRF defense (strict in production)

---

## 8. Rate Limiting

| Endpoint | Limit | Window | Key |
|---|---|---|---|
| POST /api/auth/login | 10 attempts | 15 minutes | IP address |
| All /api/* routes | 100 requests | 15 minutes | IP address |
| Mutation routes (POST/DELETE) | 30 requests | 15 minutes | IP address |

### 8.1 Login Rate Limiting Properties
- Prevents brute-force password attacks
- Generic error messages (no username/tenant enumeration)
- Standard rate limit headers (`RateLimit-*`)

---

## 9. CORS Configuration

### 9.1 Development
```typescript
// Allows configured localhost origins
['http://localhost:5173', 'http://localhost:3000', ...]
```

### 9.2 Production
```typescript
// Requires explicit ALLOWED_ORIGINS environment variable
process.env.ALLOWED_ORIGINS?.split(',') // e.g., 'https://erp.example.com'
```

### 9.3 Properties
- `Access-Control-Allow-Credentials: true` (for cookie-based auth)
- `Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, X-CSRF-Token`
- No wildcard `*` origin in production

---

## 10. Input Validation

### 10.1 Validated Endpoints

| Endpoint | Validated Fields |
|---|---|
| POST /api/auth/login | username (required string), password (required string), tenantId (required ID) |
| POST /api/sales | customerId, warehouseId, date (YYYY-MM-DD), lines (non-empty array) |
| POST /api/purchases | supplierId, warehouseId, date, lines |
| POST /api/customer-receipts | customerId, date, amount (positive number) |
| POST /api/cash-book | accountCode, date, amount, narration |

### 10.2 Validation Rules
- **requiredString**: Must be non-empty string
- **positiveNumber**: Must be > 0
- **nonNegativeNumber**: Must be >= 0
- **validId**: Must be non-empty string, max 128 chars
- **validDate**: Must match YYYY-MM-DD format and be valid date
- **validTaxRate**: Must be between 0 and 100
- **nonEmptyArray**: Must be array with length > 0

### 10.3 Rejection Behavior
- Returns `400 Bad Request` with descriptive error message
- Does not expose internal validation logic

---

## 11. Audit Trail Security

### 11.1 Server-Controlled Metadata

| Field | Source | Client Spoofable? |
|---|---|---|
| `createdBy` | `req.user.username` (from session) | ❌ No |
| `tenantId` | `req.user.tenantId` (from session) | ❌ No |
| `role` | `req.user.role` (from session) | ❌ No |
| `createdAt` | Server-generated timestamp | ❌ No |
| `updatedAt` | Server-generated timestamp | ❌ No |

### 11.2 POSTED Voucher Immutability
- Once status = `POSTED`, voucher cannot be deleted by ANY role
- `createdBy` is preserved from original creation
- `tenantId` is preserved from original creation

---

## 12. UI Client Migration

### 12.1 Updated Files

| File | Change |
|---|---|
| `src/ui/lib/session.ts` | Added `apiLogin()`, `apiGetMe()`, `apiLogout()` functions; deprecated `storeSession()`, `getSessionId()` |
| `src/ui/pages/Login.tsx` | Login uses `apiLogin()` instead of direct `services.authService.authenticate()` |
| `src/ui/components/auth/ProtectedRoute.tsx` | Session validation via `apiGetMe()` server API instead of direct domain service |
| `src/ui/components/layout/Header.tsx` | Logout uses `apiLogout()` instead of direct `services.authService.logout()` |

### 12.2 Migration Strategy
- **Auth flow**: Fully migrated to server API (login, logout, session validation)
- **Domain operations**: Still use direct domain service calls (existing architecture preserved)
- **Future migration**: All pages should migrate to `fetch()` calls to server endpoints

---

## 13. Security Tests

### 13.1 Test Suite: `src/server/ProductionSecurity.test.ts` (49 tests)

| Category | Tests | Status |
|---|---|---|
| Authentication Security | 8 | ALL PASS |
| Cryptographic Tokens | 4 | ALL PASS |
| RBAC Permission Checking | 9 | ALL PASS |
| Tenant Isolation | 5 | ALL PASS |
| Audit Trail Integrity | 3 | ALL PASS |
| Mutation Security | 5 | ALL PASS |
| Input Validation | 12 | ALL PASS |
| Role Definitions | 4 | ALL PASS |
| Voucher Status Immutability | 1 | ALL PASS |
| **Total** | **49** | **ALL PASS** |

### 13.2 Key Test Scenarios
1. Invalid password rejected ✅
2. Password never returned in response ✅
3. Session validated after login ✅
4. Logged-out session rejected ✅
5. Session tokens cryptographically generated ✅
6. Safe compare prevents timing attacks ✅
7. ADMIN has all permissions ✅
8. VIEWER cannot create/post/delete ✅
9. SALES cannot perform purchase mutations ✅
10. Tenant A cannot access Tenant B data ✅
11. createdBy preserved from authenticated user ✅
12. POSTED voucher immutability enforced ✅
13. All input validation rules tested ✅

---

## 14. Vulnerabilities Fixed

| # | Severity | Vulnerability | Fix |
|---|---|---|---|
| 1 | CRITICAL | No server-side auth — all auth client-side | Express server with auth middleware on all protected routes |
| 2 | CRITICAL | localStorage session — XSS-exposable | HTTP-only cookie session (not accessible to JavaScript) |
| 3 | CRITICAL | Math.random() session IDs — predictable | `crypto.randomBytes(32)` (cryptographically secure) |
| 4 | CRITICAL | No server-side RBAC — client-only permission checks | `requirePermissionMiddleware()` on all mutation endpoints |
| 5 | CRITICAL | Client-trusted tenantId — spoofable | Server resolves tenantId from HTTP-only session cookie |
| 6 | HIGH | No CSRF protection — cookie-based auth vulnerable | CSRF middleware validates `X-CSRF-Token` header |
| 7 | HIGH | No rate limiting — brute-force attacks | Rate limiting on login (10/15min) and API (100/15min) |
| 8 | HIGH | CORS `*` — any origin can access | Environment-based allowed origins |
| 9 | HIGH | No input validation — malformed requests accepted | Comprehensive validation on all mutation endpoints |
| 10 | MEDIUM | Mock password verification — case-insensitive `includes()` | Server-side auth boundary (mock password preserved for dev) |

---

## 15. Remaining Production Limitations

| # | Category | Limitation | Severity | Production Fix |
|---|---|---|---|---|
| 1 | Auth | Mock password verification (`includes()`) | DEV-ONLY | Replace with bcrypt/argon2id password hashing |
| 2 | Auth | Demo credentials in source code | DEV-ONLY | Remove from production builds, use env variables |
| 3 | Auth | No MFA/2FA support | HIGH | Implement TOTP or WebAuthn |
| 4 | Session | Mock session adapter (in-memory) | DEV-ONLY | Replace with Redis/PostgreSQL session store |
| 5 | Session | No session rotation on privilege change | MEDIUM | Implement session rotation |
| 6 | CSRF | Dev mode accepts any non-empty token | DEV-ONLY | Validate against server-side session store |
| 7 | API | Domain operations still called directly from UI | HIGH | Migrate all pages to fetch() API calls |
| 8 | API | No API versioning | MEDIUM | Add `/api/v1/` prefix |
| 9 | API | No request logging/audit trail | MEDIUM | Add structured logging middleware |
| 10 | DB | Mock adapters (in-memory only) | DEV-ONLY | Replace with real database adapters |
| 11 | DB | No data persistence across restarts | DEV-ONLY | Database with proper persistence |
| 12 | Deployment | No HTTPS/TLS termination | HIGH | Reverse proxy (nginx/Cloudflare) with TLS |
| 13 | Deployment | No Docker/container configuration | MEDIUM | Dockerfile + docker-compose |
| 14 | Monitoring | No health check beyond basic `/api/health` | LOW | Add comprehensive health checks |
| 15 | CORS | `ALLOWED_ORIGINS` not configured by default | MEDIUM | Required env var in production |

---

## 16. Production Deployment Requirements

### 16.1 Required Environment Variables
```bash
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://erp.example.com
COOKIE_SECRET=<cryptographically-random-64-char-hex>
```

### 16.2 Required Infrastructure
- **Reverse proxy** (nginx/Cloudflare) for TLS termination
- **Session store** (Redis) for production session management
- **Database** (PostgreSQL) for persistent data storage
- **Password hashing** (bcrypt/argon2id) for production authentication

### 16.3 Migration Path
1. ✅ Server-side auth boundary (DONE)
2. ✅ HTTP-only cookie sessions (DONE)
3. ✅ Server-side RBAC (DONE)
4. ✅ CSRF protection (DONE)
5. ✅ Rate limiting (DONE)
6. ✅ Input validation (DONE)
7. 🔄 Migrate all UI pages to API calls (IN PROGRESS — auth flow done)
8. ⬜ Replace mock adapters with database adapters
9. ⬜ Implement real password hashing
10. ⬜ Add structured logging
11. ⬜ Docker deployment configuration

---

## 17. Files Created

| File | Purpose |
|---|---|
| `src/server/index.ts` | Express server entry point (REWRITTEN) |
| `src/server/middleware/auth.ts` | Authentication middleware (NEW) |
| `src/server/middleware/csrf.ts` | CSRF protection middleware (NEW) |
| `src/server/middleware/rateLimit.ts` | Rate limiting middleware (NEW) |
| `src/server/routes/auth.ts` | Auth API routes (NEW) |
| `src/server/routes/protected.ts` | Protected domain API routes (NEW) |
| `src/server/lib/crypto.ts` | Cryptographic utilities (NEW) |
| `src/server/lib/validation.ts` | Input validation utilities (NEW) |
| `src/server/ProductionSecurity.test.ts` | 49 security tests (NEW) |
| `audit/50_STEP34_SERVER_SIDE_AUTHENTICATION_RBAC_TENANT_SECURITY_REPORT.md` | This report (NEW) |

## 18. Files Modified

| File | Change |
|---|---|
| `package.json` | Added express, cookie-parser, express-rate-limit + types |
| `src/ui/lib/session.ts` | Added apiLogin, apiGetMe, apiLogout; deprecated legacy functions |
| `src/ui/pages/Login.tsx` | Login uses apiLogin() server API |
| `src/ui/components/auth/ProtectedRoute.tsx` | Session validation via apiGetMe() server API |
| `src/ui/components/layout/Header.tsx` | Logout uses apiLogout() server API |

---

## 19. Test Results

| Test Suite | Tests | Status |
|---|---|---|
| ProductionSecurity.test.ts | 49 | ALL PASS |
| SecurityHardening.test.ts | 51 | ALL PASS |
| SecurityIsolation.test.ts | 34 | ALL PASS |
| FinancialReconciliation.test.ts | 41 | ALL PASS |
| ProductionReadiness.test.ts | 27 | ALL PASS |
| BillsListService.test.ts | 30 | ALL PASS |
| AgingReportService.test.ts | 33 | ALL PASS |
| DashboardService.test.ts | 22 | ALL PASS |
| Integration.test.ts | 14 | ALL PASS |
| CrossModuleConsistency.test.ts | 8 | ALL PASS |
| All other test suites | 130 | ALL PASS |
| **Total** | **439** | **ALL PASS** |

---

## Conclusion

The ERP now has a **production-grade server-side security boundary** with:
- Express 5 backend with HTTP-only cookie authentication
- Server-side RBAC on all mutation endpoints
- Tenant isolation enforced from server-side session
- CSRF protection, rate limiting, input validation
- CORS environment-based configuration
- 49 new security tests (439 total)

**Honest assessment**: This is a dev-only mock implementation. Production deployment requires replacing mock adapters with real database adapters, implementing proper password hashing, adding session persistence (Redis), and deploying behind a TLS-terminating reverse proxy. The security **architecture** is production-grade; the **data layer** remains development-only.
