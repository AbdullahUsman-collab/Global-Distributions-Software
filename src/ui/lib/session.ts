/**
 * Client-side Session Management
 * Handles authentication state via server API and HTTP-only cookies.
 *
 * PRODUCTION (VITE_DEMO_MODE=false or unset):
 *   All auth goes through the real Express API.
 *   If the server is unavailable, errors are thrown — NEVER silent demo fallback.
 *
 * DEMO MODE (VITE_DEMO_MODE=true):
 *   Falls back to client-side mock auth when no server is available.
 *   For development/Vercel demo only.
 */

const TENANT_KEY = 'erp_tenant_id';
const USER_KEY = 'erp_current_user';

// ─── Server API Functions ──────────────────────────────────────

/**
 * API base URL — configurable for cross-origin deployments.
 * Development: '/api' (proxied by Vite to localhost:3000)
 * Production: set VITE_API_URL to the deployed backend URL
 */
const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Production mode flag.
 * When false (default), demo fallback is disabled.
 * Set VITE_DEMO_MODE=true in .env for development/Vercel demo.
 */
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

/**
 * Login via server API.
 * Server sets HTTP-only cookie on success.
 * In production: throws error if server is unavailable.
 * In demo mode: falls back to client-side mock auth.
 */
export async function apiLogin(
  username: string,
  password: string,
  tenantId: string,
): Promise<{ success: true; user: any } | { success: false; error: string }> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password, tenantId }),
    });

    const data = await res.json();
    if (data.success) {
      storeTenantId(tenantId);
      storeCurrentUser(data.user);
      return { success: true, user: data.user };
    }
    return { success: false, error: data.error || 'Login failed' };
  } catch {
    if (DEMO_MODE) {
      return clientSideLogin(username, password, tenantId);
    }
    return { success: false, error: 'Server unavailable — cannot login. Please ensure the backend API is running.' };
  }
}

/**
 * Get current authenticated user from server.
 * In production: throws error if server is unavailable.
 * In demo mode: falls back to localStorage session.
 */
export async function apiGetMe(): Promise<{ user: any; tenant: any } | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      credentials: 'include',
    });

    if (!res.ok) {
      if (DEMO_MODE) return getLocalMe();
      return null;
    }

    const data = await res.json();
    return data;
  } catch {
    if (DEMO_MODE) return getLocalMe();
    return null;
  }
}

function getLocalMe(): { user: any; tenant: any } | null {
  const user = getCurrentUser();
  const tenantId = getTenantId();
  if (!user || !tenantId) return null;
  const tenant = DEMO_TENANTS[tenantId] || { id: tenantId, brandName: 'ERP', slug: '', logoUrl: '', primaryColor: '#3b82f6', accentColor: '#1d4ed8', isActive: true, createdAt: new Date(), updatedAt: new Date() };
  return { user, tenant };
}

const DEMO_TENANTS: Record<string, any> = {
  'tenant-demo-wholesale-001': {
    id: 'tenant-demo-wholesale-001', slug: 'demo-wholesale', brandName: 'Demo Wholesale',
    logoUrl: '', primaryColor: '#3b82f6', accentColor: '#1d4ed8', isActive: true,
    createdAt: new Date('2025-01-01'), updatedAt: new Date('2025-01-01'),
  },
  'tenant-demo-distribution-002': {
    id: 'tenant-demo-distribution-002', slug: 'demo-distribution', brandName: 'Demo Distribution',
    logoUrl: '', primaryColor: '#10b981', accentColor: '#059669', isActive: true,
    createdAt: new Date('2025-01-01'), updatedAt: new Date('2025-01-01'),
  },
  'tenant-apex-trading-003': {
    id: 'tenant-apex-trading-003', slug: 'apex-trading', brandName: 'Apex Trading',
    logoUrl: '', primaryColor: '#f59e0b', accentColor: '#d97706', isActive: true,
    createdAt: new Date('2025-01-01'), updatedAt: new Date('2025-01-01'),
  },
};

/**
 * Logout via server API.
 * Server clears HTTP-only cookie and invalidates session.
 */
export async function apiLogout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } finally {
    clearLocalSession();
  }
}

// ─── Local Storage Helpers ─────────────────────────────────────

/**
 * Store tenant ID locally (for UI convenience only).
 * NOT used for authorization — server resolves tenant from session.
 */
function storeTenantId(tenantId: string): void {
  localStorage.setItem(TENANT_KEY, tenantId);
}

/**
 * Store current user locally (for UI convenience only).
 * NOT used for authorization — server resolves user from session.
 */
function storeCurrentUser(user: any): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Get stored tenant ID (UI convenience only).
 */
export function getTenantId(): string | null {
  return localStorage.getItem(TENANT_KEY);
}

/**
 * Get stored current user (UI convenience only).
 */
export function getCurrentUser(): any {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Check if a local session exists (UI convenience only).
 */
export function hasLocalSession(): boolean {
  return localStorage.getItem(TENANT_KEY) !== null;
}

/**
 * Clear all local session data.
 */
export function clearLocalSession(): void {
  localStorage.removeItem(TENANT_KEY);
  localStorage.removeItem(USER_KEY);
}

// ─── Legacy API (backward compatibility) ───────────────────────

/**
 * @deprecated Use apiLogin() instead.
 * Store session information after successful login.
 */
export function storeSession(sessionId: string, tenantId: string): void {
  console.warn('storeSession is deprecated. Use apiLogin() instead.');
  storeTenantId(tenantId);
}

/**
 * @deprecated Use apiGetMe() instead.
 * Retrieve the active session ID.
 */
export function getSessionId(): string | null {
  console.warn('getSessionId is deprecated. Sessions are now HTTP-only cookies.');
  return null;
}

/**
 * @deprecated Use clearLocalSession() instead.
 * Clear session information (logout).
 */
export function clearSession(): void {
  clearLocalSession();
}

/**
 * @deprecated Use hasLocalSession() instead.
 * Check if a session exists.
 */
export function hasSession(): boolean {
  return hasLocalSession();
}

// ─── Tenant Discovery (Vercel fallback) ──────────────────────

/**
 * DEMO_TENANTS keyed by tenant ID — used for client-side fallback
 * when the Express API is not available (e.g. Vercel static hosting).
 */
const DEMO_TENANT_LIST: Array<{ id: string; slug: string; brandName: string; logoUrl: string; primaryColor: string; accentColor: string; isActive: boolean; createdAt: Date; updatedAt: Date }> = Object.values(DEMO_TENANTS);

/**
 * Get public tenants (brand selection).
 * In production: only returns server data, throws on failure.
 * In demo mode: falls back to client-side mock data.
 */
export async function apiGetTenants(): Promise<Array<{ id: string; slug: string; brandName: string; logoUrl: string; primaryColor: string }>> {
  try {
    const res = await fetch(`${API_BASE}/tenants`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) return data;
    throw new Error('Empty tenant list');
  } catch {
    if (DEMO_MODE) {
      return DEMO_TENANT_LIST.map(t => ({
        id: t.id,
        slug: t.slug,
        brandName: t.brandName,
        logoUrl: t.logoUrl,
        primaryColor: t.primaryColor,
      }));
    }
    throw new Error('Server unavailable — cannot load tenants. Please ensure the backend API is running.');
  }
}

/**
 * Get a single tenant by slug (login page).
 * In production: only returns server data.
 * In demo mode: falls back to client-side mock data.
 */
export async function apiGetTenantBySlug(slug: string): Promise<{ id: string; slug: string; brandName: string; logoUrl: string; primaryColor: string; accentColor: string; isActive: boolean; createdAt: Date; updatedAt: Date } | null> {
  try {
    const res = await fetch(`${API_BASE}/tenants/${encodeURIComponent(slug)}`, { credentials: 'include' });
    if (res.status === 404) {
      if (DEMO_MODE) {
        const fallback = DEMO_TENANT_LIST.find(t => t.slug === slug);
        return fallback || null;
      }
      return null;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    if (DEMO_MODE) {
      const fallback = DEMO_TENANT_LIST.find(t => t.slug === slug);
      return fallback || null;
    }
    return null;
  }
}

// ─── Client-Side Mock Login (Vercel fallback) ──────────────────

const DEMO_USERS: Record<string, { username: string; password: string; userId: string; displayName: string; tenantId: string }> = {
  'admin@tenant-demo-wholesale-001': { username: 'admin', password: 'admin123', userId: 'user-admin-001', displayName: 'Administrator', tenantId: 'tenant-demo-wholesale-001' },
  'manager@tenant-demo-wholesale-001': { username: 'manager', password: 'manager123', userId: 'user-manager-001', displayName: 'Sales Manager', tenantId: 'tenant-demo-wholesale-001' },
  'clerk@tenant-demo-wholesale-001': { username: 'clerk', password: 'clerk123', userId: 'user-clerk-001', displayName: 'Sales Clerk', tenantId: 'tenant-demo-wholesale-001' },
  'former@tenant-demo-wholesale-001': { username: 'former', password: 'former123', userId: 'user-inactive-001', displayName: 'Former Employee', tenantId: 'tenant-demo-wholesale-001' },
  'admin@tenant-demo-distribution-002': { username: 'admin', password: 'admin123', userId: 'user-admin-002', displayName: 'Administrator', tenantId: 'tenant-demo-distribution-002' },
  'admin@tenant-apex-trading-003': { username: 'admin', password: 'admin123', userId: 'user-admin-003', displayName: 'Administrator', tenantId: 'tenant-apex-trading-003' },
};

const DEMO_BRAND_ACCESS: Array<{ userId: string; tenantId: string; role: string; isActive: boolean }> = [
  { userId: 'user-admin-001', tenantId: 'tenant-demo-wholesale-001', role: 'ADMIN', isActive: true },
  { userId: 'user-admin-001', tenantId: 'tenant-demo-distribution-002', role: 'ACCOUNTANT', isActive: true },
  { userId: 'user-admin-001', tenantId: 'tenant-apex-trading-003', role: 'VIEWER', isActive: true },
  { userId: 'user-manager-001', tenantId: 'tenant-demo-wholesale-001', role: 'MANAGER', isActive: true },
  { userId: 'user-clerk-001', tenantId: 'tenant-demo-wholesale-001', role: 'SALES', isActive: true },
  { userId: 'user-admin-002', tenantId: 'tenant-demo-distribution-002', role: 'ADMIN', isActive: true },
  { userId: 'user-admin-003', tenantId: 'tenant-apex-trading-003', role: 'ADMIN', isActive: true },
];

function clientSideLogin(
  username: string,
  password: string,
  tenantId: string,
): { success: true; user: any } | { success: false; error: string } {
  const key = `${username}@${tenantId}`;
  const user = DEMO_USERS[key];

  if (!user) {
    return { success: false, error: 'Invalid credentials' };
  }
  if (user.password !== password) {
    return { success: false, error: 'Invalid credentials' };
  }
  if (username === 'former') {
    return { success: false, error: 'Account is deactivated' };
  }

  // Derive role from user_brand_access (not from DEMO_USERS)
  const access = DEMO_BRAND_ACCESS.find(a => a.userId === user.userId && a.tenantId === tenantId && a.isActive);
  const role = access ? access.role : 'VIEWER';

  const userObj = {
    id: user.userId,
    tenantId: user.tenantId,
    username: user.username,
    displayName: user.displayName,
    role,
    isActive: username !== 'former',
  };

  storeTenantId(tenantId);
  storeCurrentUser(userObj);
  return { success: true, user: userObj };
}
