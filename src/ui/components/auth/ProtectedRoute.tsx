/**
 * Protected Route Component
 * Guards routes that require authentication.
 *
 * PRODUCTION: Validates session via server API (HTTP-only cookie).
 * The browser never reads session tokens directly.
 *
 * Features:
 * - Validates session through server /api/auth/me endpoint
 * - Shows loading state during validation
 * - Redirects to / if no session or invalid session
 * - Resolves user and tenant context for children from server
 * - Supports brand switching via refreshAuth()
 * - Tracks authorized brands for the brand switcher
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { UserSession, User } from '../../../domain/types/auth';
import { Tenant, TenantPublicConfig } from '../../../domain/types/tenant';
import { apiGetMe, clearLocalSession } from '../../lib/session';
import { getAuthorizedTenants } from '../../lib/api';

interface AuthContext {
  session: UserSession;
  user: User;
  tenant: Tenant;
  authorizedBrands: TenantPublicConfig[];
  refreshAuth: () => Promise<void>;
}

export const AuthContext = React.createContext<AuthContext | null>(null);

export const ProtectedRoute: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [authContext, setAuthContext] = useState<AuthContext | null>(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  const loadAuth = useCallback(async () => {
    try {
      const result = await apiGetMe();
      if (!result || !result.user || !result.tenant) {
        clearLocalSession();
        setShouldRedirect(true);
        setLoading(false);
        return;
      }

      const session: UserSession = {
        sessionId: 'cookie-based',
        userId: result.user.id,
        tenantId: result.user.tenantId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      };

      let brands: TenantPublicConfig[] = [];
      try {
        brands = await getAuthorizedTenants();
      } catch {
        brands = [{ id: result.tenant.id, slug: result.tenant.slug, brandName: result.tenant.brandName, logoUrl: result.tenant.logoUrl, primaryColor: result.tenant.primaryColor }];
      }

      const refreshAuth = async () => {
        try {
          const refreshed = await apiGetMe();
          if (!refreshed || !refreshed.user || !refreshed.tenant) {
            clearLocalSession();
            setShouldRedirect(true);
            return;
          }
          const newSession: UserSession = {
            sessionId: 'cookie-based',
            userId: refreshed.user.id,
            tenantId: refreshed.user.tenantId,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          };
          let newBrands: TenantPublicConfig[] = [];
          try {
            newBrands = await getAuthorizedTenants();
          } catch {
            newBrands = [{ id: refreshed.tenant.id, slug: refreshed.tenant.slug, brandName: refreshed.tenant.brandName, logoUrl: refreshed.tenant.logoUrl, primaryColor: refreshed.tenant.primaryColor }];
          }
          setAuthContext({
            session: newSession,
            user: refreshed.user as User,
            tenant: refreshed.tenant as Tenant,
            authorizedBrands: newBrands,
            refreshAuth: async () => { await loadAuth(); },
          });
        } catch {
          clearLocalSession();
          setShouldRedirect(true);
        }
      };

      setAuthContext({
        session,
        user: result.user as User,
        tenant: result.tenant as Tenant,
        authorizedBrands: brands,
        refreshAuth,
      });
    } catch (err) {
      console.error('Session validation error:', err);
      clearLocalSession();
      setShouldRedirect(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAuth(); }, [loadAuth]);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div className="spinner" style={styles.loadingSpinner} />
          <p style={styles.loadingText}>Validating session...</p>
        </div>
      </div>
    );
  }

  if (shouldRedirect || !authContext) {
    return <Navigate to="/" replace />;
  }

  return (
    <AuthContext.Provider value={authContext}>
      <Outlet />
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContext {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within ProtectedRoute');
  }
  return context;
}

const styles: { [key: string]: React.CSSProperties } = {
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
  },
  loadingContent: {
    textAlign: 'center',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    borderColor: '#3b82f6',
    borderTopColor: 'transparent',
    margin: '0 auto 16px',
  },
  loadingText: {
    fontSize: '16px',
    color: '#64748b',
  },
};
