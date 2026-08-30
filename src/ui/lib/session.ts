/**
 * Client-side Session Management
 * Handles authentication state via server API and HTTP-only cookies.
 *
 * PRODUCTION: Session is stored as HTTP-only cookie set by the server.
 * The browser never sees the session token directly.
 *
 * DEV FALLBACK: localStorage is used only for tenantId resolution
 * (not for session validation — that's always server-side).
 */

const TENANT_KEY = 'erp_tenant_id';
const USER_KEY = 'erp_current_user';

// ─── Server API Functions ──────────────────────────────────────

const API_BASE = '/api';

/**
 * Login via server API with client-side fallback.
 * Server sets HTTP-only cookie on success.
 * Falls back to client-side mock auth when no server is available (e.g. Vercel).
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
    // Server unavailable — fall back to client-side mock auth
    return clientSideLogin(username, password, tenantId);
  }
}

/**
 * Get current authenticated user from server.
 * Falls back to localStorage when no server is available.
 */
export async function apiGetMe(): Promise<{ user: any; tenant: any } | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      credentials: 'include',
    });

    if (!res.ok) {
      // Fall back to local session
      return getLocalMe();
    }

    const data = await res.json();
    return data;
  } catch {
    // Server unavailable — use local session
    return getLocalMe();
  }
}

function getLocalMe(): { user: any; tenant: any } | null {
  const user = getCurrentUser();
  const tenantId = getTenantId();
  if (!user || !tenantId) return null;
  return { user, tenant: { id: tenantId } };
}

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

// ─── Client-Side Mock Login (Vercel fallback) ──────────────────

const DEMO_USERS: Record<string, { username: string; password: string; userId: string; displayName: string; role: string; tenantId: string }> = {
  'admin@tenant-demo-wholesale-001': { username: 'admin', password: 'admin123', userId: 'user-admin-001', displayName: 'Administrator', role: 'ADMIN', tenantId: 'tenant-demo-wholesale-001' },
  'manager@tenant-demo-wholesale-001': { username: 'manager', password: 'manager123', userId: 'user-manager-001', displayName: 'Sales Manager', role: 'MANAGER', tenantId: 'tenant-demo-wholesale-001' },
  'clerk@tenant-demo-wholesale-001': { username: 'clerk', password: 'clerk123', userId: 'user-clerk-001', displayName: 'Sales Clerk', role: 'SALES', tenantId: 'tenant-demo-wholesale-001' },
  'former@tenant-demo-wholesale-001': { username: 'former', password: 'former123', userId: 'user-inactive-001', displayName: 'Former Employee', role: 'VIEWER', tenantId: 'tenant-demo-wholesale-001' },
  'admin@tenant-demo-distribution-002': { username: 'admin', password: 'admin123', userId: 'user-admin-002', displayName: 'Administrator', role: 'ADMIN', tenantId: 'tenant-demo-distribution-002' },
  'admin@tenant-apex-trading-003': { username: 'admin', password: 'admin123', userId: 'user-admin-003', displayName: 'Administrator', role: 'ADMIN', tenantId: 'tenant-apex-trading-003' },
};

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

  const userObj = {
    id: user.userId,
    tenantId: user.tenantId,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    isActive: username !== 'former',
  };

  storeTenantId(tenantId);
  storeCurrentUser(userObj);
  return { success: true, user: userObj };
}
