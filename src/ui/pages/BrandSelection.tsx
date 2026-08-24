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

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TenantPublicConfig } from '../../domain/types/tenant';
import { services } from '../services';
import { BrandCard } from '../components/BrandCard';

export const BrandSelection: React.FC = () => {
  const [tenants, setTenants] = useState<TenantPublicConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const data = await services.tenantRepository.getPublicTenants();
        setTenants(data);
      } catch (err) {
        setError('Failed to load brands. Please try again.');
        console.error('Error fetching tenants:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTenants();
  }, []);

  const handleBrandSelect = (tenant: TenantPublicConfig) => {
    navigate(`/login/${tenant.slug}`);
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
            onClick={() => window.location.reload()}
            style={styles.retryButton}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (tenants.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>📋</div>
          <h2 style={styles.errorTitle}>No Brands Available</h2>
          <p style={styles.errorMessage}>
            There are no brands configured yet. Please contact your administrator.
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
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
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
    backgroundColor: '#ffffff',
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
    color: '#1e293b',
    marginBottom: '8px',
  },
  errorMessage: {
    fontSize: '15px',
    color: '#64748b',
    marginBottom: '24px',
    lineHeight: '1.5',
  },
  retryButton: {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    minHeight: '44px',
  },
};
