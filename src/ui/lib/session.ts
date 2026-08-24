/**
 * Client-side Session Management
 * Stores and retrieves sessionId for authenticated users.
 * 
 * NOTE: This is a development-only implementation using localStorage.
 * Production would use secure HTTP-only cookies.
 */

const SESSION_KEY = 'erp_session_id';
const TENANT_KEY = 'erp_tenant_id';

/**
 * Store session information after successful login.
 */
export function storeSession(sessionId: string, tenantId: string): void {
  localStorage.setItem(SESSION_KEY, sessionId);
  localStorage.setItem(TENANT_KEY, tenantId);
}

/**
 * Retrieve the active session ID.
 */
export function getSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

/**
 * Retrieve the active tenant ID.
 */
export function getTenantId(): string | null {
  return localStorage.getItem(TENANT_KEY);
}

/**
 * Clear session information (logout).
 */
export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(TENANT_KEY);
}

/**
 * Check if a session exists.
 */
export function hasSession(): boolean {
  return getSessionId() !== null;
}
