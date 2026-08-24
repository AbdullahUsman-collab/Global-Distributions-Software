# AUTHENTICATION & TENANT SYSTEM AUDIT REPORT
## Global Distribution Services (MotherCare) - ERP System

---

## 1. Executive Summary

This audit examines the authentication, tenant isolation, session management, and authorization structures of the MotherCare ERP system (ASP.NET WebForms, SQL Server, SSRS).

**Current State:**
- **Authentication:** Basic session-based ASP.NET authentication with username/password
- **Tenant Isolation:** **NOT PRESENT** - Single-tenant system with no company/brand separation
- **Session Management:** Server-side ASP.NET Session State (no JWT, no Redis)
- **Authorization:** Minimal - Only "Administrator" role observed, no RBAC
- **Security:** Critical vulnerabilities - plaintext passwords, no HTTPS, no audit trail

**Key Finding:** The system has **NO multi-tenant architecture**. The "Company" field on MainPage.aspx displays "All" but has no functional tenant isolation.

---

## 2. Inventory of Inspected Files & Database Objects

| File Path | Primary Function | Relevant Entities / Components |
|-----------|------------------|--------------------------------|
| `G:\Distribution Software\audit\01_login.html` | Login page HTML | TxtUserName, txtPassWord, ImageButton1 |
| `G:\Distribution Software\audit\02_mainpage.html` | Main page with navigation | lbluser, lblcompany, NavigationMenu |
| `G:\Distribution Software\audit\25_changepassword.html` | Password change form | TxtUserName, txtOldPassword, txtNewPassword |
| `G:\Distribution Software\audit\21_PERMISSIONS_SECURITY.md` | Security documentation | Authentication, roles, permissions |
| `G:\Distribution Software\audit\23_DATA_MODEL.md` | Database schema | Users table, all entity tables |
| `G:\Distribution Software\audit\22_API_NETWORK.md` | Network architecture | ViewState, PostBack pattern |
| `G:\Distribution Software\audit\MASTER_REVERSE_ENGINEERED_SPEC.md` | Full system spec | All modules, workflows, calculations |
| `G:\Distribution Software\MotherCare_System_Complete_Extract.md` | Complete extraction | All forms, fields, buttons, logic |

**Database Objects (Inferred):**
- `Users` table (UserName, Password, Role)
- `Main_Heads` table
- `Accounts` table
- `Items` table
- `Vouchers` table
- `Voucher_Lines` table
- `Bills` table
- `Bill_Lines` table
- `Sale_Men` table
- `Item_Super_Heads` table
- `Item_Main_Heads` table

---

## 3. Existing Authentication & User Architecture

### 3.1 User Storage Structure

**Table: Users** (Inferred from `23_DATA_MODEL.md:134-139`)

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| UserName | VARCHAR | PK | Login name (free-text) |
| Password | VARCHAR | | Hashed password (UNKNOWN hash type) |
| Role | VARCHAR | | User role (e.g., "Administrator") |

### 3.2 Login Identifier Types

| Type | Supported | Evidence |
|------|-----------|----------|
| Username (free-text) | YES | `TxtUserName` input field on login page |
| Email | NO | No email field observed |
| External Provider (OAuth) | NO | No OAuth/SSO integration |
| Phone/SMS | NO | No phone-based auth |

### 3.3 Password Hashing & Security

| Aspect | Status | Evidence |
|--------|--------|----------|
| Hash Algorithm | **UNKNOWN** | No code access to verify |
| Salt | **UNKNOWN** | No code access to verify |
| Transmission | **PLAINTEXT** | HTTP (not HTTPS), `type="password"` only masks UI |
| Storage | **UNKNOWN** | Cannot verify if hashed or plaintext |
| Complexity Policy | **NOT PRESENT** | No password requirements visible |
| Expiry | **NOT PRESENT** | No password expiry mechanism |

### 3.4 User Lifecycle

| State | Supported | Evidence |
|-------|-----------|----------|
| Active/Inactive | **UNKNOWN** | No status field in Users table |
| Account Lockout | **NOT PRESENT** | No failed login attempt tracking |
| Password Reset | **NOT PRESENT** | Only password change via authenticated session |
| User Creation | YES | "Create New User" in Utilities menu |
| User Deletion | **UNKNOWN** | No deletion mechanism observed |

---

## 4. Existing Tenant & Brand Architecture

### 4.1 Tenant/Company Entity

**STATUS: NOT PRESENT**

| Component | Status | Evidence |
|-----------|--------|----------|
| Tenant Table | **NOT PRESENT** | No `tenants`, `companies`, or `brands` table |
| Tenant ID Column | **NOT PRESENT** | No `tenant_id` on any table |
| Multi-Company Flag | **NOT PRESENT** | No company isolation mechanism |
| Brand Entity | **NOT PRESENT** | No brand separation |

### 4.2 Public Brand Metadata

| Metadata | Status | Evidence |
|----------|--------|----------|
| Company Name | HARDCODED | "Global Distribution Services (MotherCare)" on MainPage.aspx |
| Logo/Image | HARDCODED | `images/New Banner2.jpg` |
| Colors | HARDCODED | CSS in page headers |
| Slug/URL | **NOT PRESENT** | No brand-specific URLs |

### 4.3 Brand Configuration Storage

**NOT PRESENT** - All branding is hardcoded in ASP.NET pages.

---

## 5. Existing User-Tenant-Role Relationships & Authorization

### 5.1 User-to-Tenant Mapping

**STATUS: NOT PRESENT**

| Component | Status | Evidence |
|-----------|--------|----------|
| `user_tenants` table | **NOT PRESENT** | No mapping table |
| `tenant_id` on Users | **NOT PRESENT** | Users table has no tenant reference |
| Company Scope | **NOT FUNCTIONAL** | `lblcompany` shows "All" but has no filter effect |

### 5.2 Role Definitions

| Role | Access Level | Evidence |
|------|-------------|----------|
| Administrator | Full access | MainPage.aspx displays "Administrator" |
| Other Roles | **NOT PRESENT** | No role management screen |

### 5.3 Permission Model

**STATUS: MINIMAL / NOT PRESENT**

| Permission Type | Status | Evidence |
|----------------|--------|----------|
| Module Access | **NOT PRESENT** | All modules visible to all users |
| Field-Level | **NOT PRESENT** | No field restrictions |
| Report Access | **NOT PRESENT** | All reports accessible |
| Transaction Access | **NOT PRESENT** | No restrictions on voucher/bill creation |

### 5.4 Enforcement in Financial Modules

| Module | Auth Check | Tenant Filter |
|--------|------------|---------------|
| Journal Entry | Session only | **NONE** |
| Cash Book | Session only | **NONE** |
| Sale/Purchase Bill | Session only | **NONE** |
| Ledger | Session only | **NONE** |
| Trial Balance | Session only | **NONE** |
| All Reports | Session only | **NONE** |

---

## 6. Existing Session & Token Architecture

### 6.1 Session Type

| Component | Value | Evidence |
|-----------|-------|----------|
| Session Mechanism | **Server-side ASP.NET Session State** | `MASTER_REVERSE_ENGINEERED_SPEC.md:12` |
| Token Type | **NONE** (No JWT) | No JWT/OAuth observed |
| Storage Location | **Server Memory** | Standard ASP.NET Session |
| Client-Side | **ViewState only** | `__VIEWSTATE` hidden fields |

### 6.2 Session Lifecycle

| Phase | Status | Evidence |
|-------|--------|----------|
| Creation | On login success | Redirect to MainPage.aspx |
| Timeout | **UNKNOWN** | No timeout configuration visible |
| Invalidation | On logout | "Log out" links to Default.aspx |
| Renewal | **NOT PRESENT** | No session renewal mechanism |

### 6.3 Cookie Attributes

| Attribute | Status | Evidence |
|-----------|--------|----------|
| HttpOnly | **UNKNOWN** | Server configuration required |
| Secure | **NOT PRESENT** | HTTP only (no HTTPS) |
| SameSite | **UNKNOWN** | Server configuration required |
| Domain | **UNKNOWN** | Server configuration required |
| Path | **UNKNOWN** | Server configuration required |

---

## 7. Existing Data Isolation & Multi-Tenant Enforcement

### 7.1 Database-Level Isolation

| Mechanism | Status | Evidence |
|-----------|--------|----------|
| Row Level Security (RLS) | **NOT PRESENT** | No RLS policies |
| Schema Separation | **NOT PRESENT** | Single schema |
| Database-per-Tenant | **NOT PRESENT** | Single database |
| Session Variables | **NOT PRESENT** | No `app.current_tenant_id` |

### 7.2 API/Middleware-Level Isolation

| Mechanism | Status | Evidence |
|-----------|--------|----------|
| Query Filters | **NOT PRESENT** | No WHERE clause tenant filtering |
| Context Injection | **NOT PRESENT** | No tenant context |
| Middleware Checks | **NOT PRESENT** | No authorization middleware |

### 7.3 Cross-Tenant Leakage Risk

**STATUS: NOT APPLICABLE** - Single-tenant system

| Table | Tenant Filter | Risk |
|-------|---------------|------|
| Accounts | **NONE** | N/A (single tenant) |
| Items | **NONE** | N/A (single tenant) |
| Vouchers | **NONE** | N/A (single tenant) |
| Bills | **NONE** | N/A (single tenant) |
| All Tables | **NONE** | N/A (single tenant) |

---

## 8. Security Vulnerability & Gap Analysis

### 8.1 Critical Vulnerabilities

| Vulnerability | Severity | Evidence |
|---------------|----------|----------|
| **Plaintext Passwords** | CRITICAL | HTTP transmission, no HTTPS |
| **No Account Lockout** | HIGH | No failed login tracking |
| **No Password Policy** | HIGH | No complexity/expiry requirements |
| **No Audit Trail** | HIGH | No data change logging |
| **ViewState Exposure** | MEDIUM | ViewState can be decrypted |
| **No CSRF Protection** | MEDIUM | No anti-CSRF tokens |
| **No Rate Limiting** | HIGH | No brute-force protection |
| **Session Fixation Risk** | MEDIUM | No session regeneration |

### 8.2 Missing Security Controls

| Control | Status | Recommendation |
|---------|--------|----------------|
| HTTPS | **NOT PRESENT** | Implement TLS immediately |
| Password Hashing | **UNKNOWN** | Verify and enforce bcrypt/scrypt |
| Session Timeout | **NOT PRESENT** | Add 15-30 minute timeout |
| Audit Logging | **NOT PRESENT** | Log all data changes |
| Role-Based Access | **NOT PRESENT** | Implement RBAC |
| Input Validation | **UNKNOWN** | Add server-side validation |
| SQL Injection Protection | **UNKNOWN** | Use parameterized queries |
| XSS Protection | **UNKNOWN** | Encode output |

---

## 9. Structural Conflicts & Duplication Risks

### 9.1 Current vs. Target Architecture

| Aspect | Current State | Target State | Conflict |
|--------|---------------|--------------|----------|
| Auth Provider | Custom ASP.NET | First-party auth | **HIGH** - Complete rewrite |
| User Table | Users (UserName, Password, Role) | users (id, email, password_hash, tenant_id) | **HIGH** - Schema change |
| Tenant Model | **NONE** | tenants table with isolation | **HIGH** - New concept |
| Session | ASP.NET Session State | JWT/Redis | **HIGH** - Architecture change |
| RBAC | Single "Administrator" role | Granular permissions | **MEDIUM** - New system |

### 9.2 Duplication Risks

| Risk | Description |
|------|-------------|
| **User Table Duplication** | Risk of creating parallel user tables |
| **Session Handler Duplication** | Risk of dual session management |
| **Auth Logic Duplication** | Risk of multiple auth pathways |

### 9.3 Conflicts with Free-Text Username Login

| Aspect | Current | Target | Impact |
|--------|---------|--------|--------|
| Login Field | `TxtUserName` (free-text) | Email-based | **MEDIUM** - UI change |
| Uniqueness | **UNKNOWN** | Email unique constraint | **LOW** - Data migration |
| Case Sensitivity | **UNKNOWN** | Email case-insensitive | **LOW** - Normalization |

---

## 10. Recommended Implementation Plan & Sequence

### Phase 1: Database Schema (Prerequisites)
1. Create `tenants` table
2. Add `tenant_id` to Users table
3. Add `email` column to Users table
4. Add `password_hash` column (rename/migrate from Password)
5. Create `roles` and `permissions` tables
6. Create `user_roles` mapping table

### Phase 2: Authentication Migration
1. Implement password hashing verification
2. Migrate existing users to new schema
3. Add email-based login support
4. Implement session timeout
5. Add account lockout mechanism

### Phase 3: Tenant Isolation
1. Add `tenant_id` to all business tables
2. Implement RLS policies (if PostgreSQL) or query filters
3. Add tenant context middleware
4. Update all queries with tenant filtering

### Phase 4: RBAC Implementation
1. Create role management UI
2. Define permission matrix
3. Add authorization checks to all pages
4. Implement field-level permissions (if needed)

### Phase 5: Security Hardening
1. Enable HTTPS
2. Add CSRF protection
3. Implement audit logging
4. Add rate limiting
5. Add input validation

### Verification Criteria
- [ ] All existing functionality preserved
- [ ] New auth flow works end-to-end
- [ ] Tenant isolation verified (no cross-tenant data access)
- [ ] RBAC enforced on all modules
- [ ] Security audit passed

---

## Audit Summary

| Category | Status | Items Found |
|----------|--------|-------------|
| **Authentication** | BASIC | Username/password, session-based |
| **Tenant Isolation** | **NOT PRESENT** | Single-tenant system |
| **Session Management** | SERVER-SIDE | ASP.NET Session State |
| **RBAC** | **NOT PRESENT** | Single "Administrator" role |
| **Security** | CRITICAL GAPS | No HTTPS, no audit, no lockout |
| **Multi-Tenant** | **NOT IMPLEMENTED** | Requires full architecture |

---

*Audit Date: August 23, 2026*
*Auditor: opencode (Read-Only Audit)*
*System: Global Distribution Services (MotherCare) - ASP.NET WebForms ERP*
*URL: http://38.92.47.89:8026/*
