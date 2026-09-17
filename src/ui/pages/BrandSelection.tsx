/**
 * Brand Selection Page
 * Primary landing view for unauthenticated users.
 *
 * Features:
 * - Fetches available brands from ITenantRepository
 * - Displays animated loading skeleton during fetch
 * - Responsive grid layout for brand cards
 * - Navigates to /login/[brand-slug] on selection
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TenantPublicConfig } from '../../domain/types/tenant';
import { BrandCard } from '../components/BrandCard';
import { apiGetTenants } from '../lib/session';

export const BrandSelection: React.FC = () => {
  const [tenants, setTenants] = useState<TenantPublicConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);
  const navigate = useNavigate();

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsEmpty(false);
    try {
      const data = await apiGetTenants();
      setTenants(data);
      if (data.length === 0) {
        setIsEmpty(true);
      }
    } catch (err) {
      setError('Failed to load brands. Please try again.');
      console.error('Error fetching tenants:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const handleBrandSelect = (tenant: TenantPublicConfig) => {
    navigate(`/login/${tenant.slug}`);
  };

  const handleSetupClick = () => {
    navigate('/setup');
  };

  // Loading skeleton
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Select Your Brand</h1>
          <p style={styles.subtitle}>Choose your organization to sign in</p>
        </div>
        <div className="brand-grid-responsive" style={styles.grid}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{
                width: '100%',
                aspectRatio: '1',
                borderRadius: '16px',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>⚠️</div>
          <h2 style={styles.errorTitle}>Something went wrong</h2>
          <p style={styles.errorMessage}>{error}</p>
          <button
            onClick={fetchTenants}
            style={styles.retryButton}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state - system needs setup
  if (isEmpty) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>📋</div>
          <h2 style={styles.errorTitle}>System Setup Required</h2>
          <p style={styles.errorMessage}>
            No brands have been configured yet. The system administrator needs to create the first brand.
          </p>
          <button
            onClick={handleSetupClick}
            style={styles.setupButton}
          >
            System Setup
          </button>
          <p style={styles.helpText}>
            If you are not the administrator, please contact them to set up the system.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div className="fade-in" style={styles.header}>
        <h1 style={styles.title}>Select Your Brand</h1>
        <p style={styles.subtitle}>Choose your organization to sign in</p>
      </div>

      <div className="brand-grid-responsive" style={styles.grid}>
        {tenants.map((tenant, index) => (
          <div
            key={tenant.id}
            className="scale-in"
            style={{
              animationDelay: `${index * 0.1}s`,
              animationFillMode: 'both',
            }}
          >
            <BrandCard tenant={tenant} onClick={handleBrandSelect} />
          </div>
        ))}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 16px',
    background: 'linear-gradient(135deg, var(--surface-2) 0%, var(--border) 100%)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '16px',
    color: 'var(--text-muted)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    maxWidth: '700px',
    width: '100%',
  },
  errorContainer: {
    textAlign: 'center',
    padding: '40px 24px',
    backgroundColor: 'var(--surface)',
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    maxWidth: '400px',
    width: '100%',
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  errorTitle: {
    fontSize: '22px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '8px',
  },
  errorMessage: {
    fontSize: '15px',
    color: 'var(--text-muted)',
    marginBottom: '24px',
    lineHeight: '1.5',
  },
  retryButton: {
    padding: '12px 24px',
    backgroundColor: 'var(--accent)',
    color: 'var(--accent-contrast)',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    minHeight: '44px',
  },
  setupButton: {
    padding: '12px 24px',
    backgroundColor: 'var(--accent)',
    color: 'var(--accent-contrast)',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    minHeight: '44px',
    marginBottom: '16px',
  },
  helpText: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    marginTop: '12px',
  },
};
