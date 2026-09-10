# Step 70: User Management Full CRUD + Multi-Brand RBAC Parity Audit

## Summary
Implemented complete user management CRUD with server endpoints, API client, UI page, sidebar navigation, and comprehensive security tests. Verified full parity with legacy User Management functionality.

## Files Modified/Created

### Server-Side (User CRUD Endpoints)
- `src/server/routes/protected.ts` — Added 6 user CRUD endpoints: GET /users, GET /users/:id, POST /users, PUT /users/:id, POST /users/:id/deactivate, POST /users/:id/activate. All require `users.manage` permission. Added `IUserRepository` import and `userRepo` parameter.
- `src/server/index.ts` — Wired `userAdapter` to `createProtectedRoutes` call.

### Client-Side (API + UI)
- `src/ui/lib/api.ts` — Added 6 user API client functions: getUsers, getUser, createUser, updateUser, deactivateUser, activateUser.
- `src/ui/App.tsx` — Added `/users` route, `Users` import.
- `src/ui/components/layout/Sidebar.tsx` — Added "Users" navigation item with `users.manage` permission.
- `src/ui/pages/Users.tsx` — NEW: Full user management page with search, table, create modal, edit modal, activate/deactivate actions, brand access count display.

### Security Tests
- `src/domain/services/UserManagementSecurity.test.ts` — NEW: 20 comprehensive security tests.

## Test Results
- **Tests:** 669 passed | 1 failed (ENVIRONMENT BLOCKED: PostgreSQL) | 9 skipped | Total: 679
- **New tests:** 20 security tests (UserManagementSecurity.test.ts)
- **Regressions:** None
- **TypeScript:** Clean compilation

## Security Verification

| # | Test | Status |
|---|------|--------|
| 1 | USERS_MANAGE permission correctly assigned to ADMIN only | ✅ PASS |
| 2 | Non-ADMIN roles lack users.manage permission | ✅ PASS |
| 3 | getUsersByTenant returns only tenant-scoped users | ✅ PASS |
| 4 | createUser creates new user with correct fields | ✅ PASS |
| 5 | Duplicate username detection works | ✅ PASS |
| 6 | updateUser updates user metadata | ✅ PASS |
| 7 | updateUser throws for non-existent user | ✅ PASS |
| 8 | deactivateUser sets isActive to false | ✅ PASS |
| 9 | deactivateUser returns false for non-existent user | ✅ PASS |
| 10 | isUserActive returns false for inactive user | ✅ PASS |
| 11 | All valid roles defined in system | ✅ PASS |
| 12 | Only ADMIN has users.manage permission | ✅ PASS |
| 13 | User creation uses server-derived tenantId | ✅ PASS |
| 14 | Brand membership comes from user_brand_access | ✅ PASS |
| 15 | users.role does not override user_brand_access.role | ✅ PASS |
| 16 | User can have brand access beyond primary tenantId | ✅ PASS |
| 17 | Brand access isActive check works correctly | ✅ PASS |
| 18 | Auth middleware derives role from session, not client | ✅ PASS |
| 19 | Full CRUD cycle works in mock mode | ✅ PASS |
| 20 | Brand access full lifecycle works in mock mode | ✅ PASS |

## Authorization Chain (Verified)
```
HTTP → Auth Middleware → Session → Selected Tenant → Active user_brand_access
     → req.user.role → Permission Middleware → Protected Route
```

## API Endpoints Added
| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /api/users | users.manage | List all users for current tenant |
| GET | /api/users/:id | users.manage | Get specific user by ID |
| POST | /api/users | users.manage | Create new user (username, displayName, password, role) |
| PUT | /api/users/:id | users.manage | Update user (displayName, isActive) |
| POST | /api/users/:id/deactivate | users.manage | Deactivate user |
| POST | /api/users/:id/activate | users.manage | Activate user |

## Implementation Notes
- Server uses `req.user!.tenantId` (not client body) for tenant isolation
- Server uses `req.user!.role` (not client body) for authorization
- `MockUserAdapter` supports full CRUD operations for demo mode
- `Users.tsx` page includes search, create modal, edit modal, activate/deactivate actions
- Brand access count displayed per user (links to /brand-access page)
- All endpoints protected by `users.manage` permission middleware
- Session-based auth pattern preserved (no client-supplied tenant/role)
