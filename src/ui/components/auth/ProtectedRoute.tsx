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
 */

import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { UserSession, User } from '../../../domain/types/auth';
import { Tenant } from '../../../domain/types/tenant';
import { apiGetMe, clearLocalSession } from '../../lib/session';

interface AuthContext {
  session: UserSession;
  user: User;
  tenant: Tenant;
}

export const AuthContext = React.createContext<AuthContext | null>(null);

export const ProtectedRoute: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [authContext, setAuthContext] = useState<AuthContext | null>(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    const validateAndLoad = async () => {
      try {
        // Validate session via server API (reads HTTP-only cookie)
        const result = await apiGetMe();

        if (!result || !result.user || !result.tenant) {
          clearLocalSession();
          setShouldRedirect(true);
          setLoading(false);
          return;
        }

        // Create a minimal session object from the server response
        const session: UserSession = {
          sessionId: 'cookie-based',
          userId: result.user.id,
          tenantId: result.user.tenantId,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        };

        setAuthContext({
          session,
          user: result.user as User,
          tenant: result.tenant as Tenant,
        });
      } catch (err) {
        console.error('Session validation error:', err);
        clearLocalSession();
        setShouldRedirect(true);
      } finally {
        setLoading(false);
      }
    };

    validateAndLoad();
  }, []);

  // Loading state
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

  // Redirect if no valid session
  if (shouldRedirect || !authContext) {
    return <Navigate to="/" replace />;
  }

  // Render children with auth context
  return (
    <AuthContext.Provider value={authContext}>
      <Outlet />
    </AuthContext.Provider>
  );
};

/**
 * Hook to access auth context in child components.
 */
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
