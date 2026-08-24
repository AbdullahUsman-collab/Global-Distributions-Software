/**
 * Protected Route Component
 * Guards routes that require authentication.
 * 
 * Features:
 * - Reads sessionId from localStorage
 * - Validates session through IAuthService
 * - Shows loading state during validation
 * - Redirects to / if no session or invalid session
 * - Resolves user and tenant context for children
 */

import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { UserSession, User } from '../../../domain/types/auth';
import { Tenant } from '../../../domain/types/tenant';
import { services } from '../../services';
import { getSessionId, clearSession } from '../../lib/session';

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
      const sessionId = getSessionId();

      if (!sessionId) {
        setShouldRedirect(true);
        setLoading(false);
        return;
      }

      try {
        // Validate session
        const session = await services.authService.validateSession(sessionId);

        if (!session) {
          clearSession();
          setShouldRedirect(true);
          setLoading(false);
          return;
        }

        // Resolve user
        const user = await services.authService.getUserBySession(sessionId);
        if (!user) {
          clearSession();
          setShouldRedirect(true);
          setLoading(false);
          return;
        }

        // Resolve tenant
        const tenant = await services.tenantRepository.getTenantById(session.tenantId);
        if (!tenant) {
          clearSession();
          setShouldRedirect(true);
          setLoading(false);
          return;
        }

        setAuthContext({ session, user, tenant });
      } catch (err) {
        console.error('Session validation error:', err);
        clearSession();
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
