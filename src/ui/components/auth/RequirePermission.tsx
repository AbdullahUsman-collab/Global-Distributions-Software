/**
 * RequirePermission Component
 * Guards routes that require a specific permission.
 *
 * Usage:
 *   <RequirePermission permission="sales.view">
 *     <SalesPage />
 *   </RequirePermission>
 *
 * Shows "Access Denied" if the user lacks the permission.
 * Shows nothing during auth loading.
 */

import React from 'react';
import { useAuth } from './ProtectedRoute';
import { hasPermission, Permission } from '../../../domain/services/AuthorizationService';

interface RequirePermissionProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RequirePermission: React.FC<RequirePermissionProps> = ({
  permission,
  children,
  fallback,
}) => {
  const { user } = useAuth();

  if (!hasPermission(user.role, permission)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div style={styles.container}>
        <div style={styles.icon}>🔒</div>
        <h2 style={styles.title}>Access Denied</h2>
        <p style={styles.message}>
          You do not have permission to access this page.
        </p>
        <p style={styles.detail}>
          Required: <code style={styles.code}>{permission}</code>
        </p>
        <p style={styles.role}>
          Your role: <strong>{user.role}</strong>
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 32px',
    textAlign: 'center',
    minHeight: '400px',
  },
  icon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '8px',
  },
  message: {
    fontSize: '16px',
    color: '#64748b',
    marginBottom: '16px',
  },
  detail: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  code: {
    backgroundColor: '#f1f5f9',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '13px',
  },
  role: {
    fontSize: '14px',
    color: '#94a3b8',
    marginTop: '8px',
  },
};
