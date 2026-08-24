/**
 * Dashboard Page
 * Landing view for authenticated users.
 * 
 * Displays:
 * - Welcome message
 * - Active brand info
 * - Session summary
 * - Module placeholders
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth/ProtectedRoute';

export const Dashboard: React.FC = () => {
  const { user, tenant, session } = useAuth();
  const navigate = useNavigate();

  const formatExpiry = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="page-pad" style={styles.container}>
      {/* Welcome Section */}
      <div className="fade-in" style={styles.welcomeSection}>
        <h1 className="dashboard-welcome-title" style={styles.welcomeTitle}>Welcome, {user.displayName}</h1>
        <p style={styles.welcomeSubtitle}>
          You are signed in to <strong>{tenant.brandName}</strong>
        </p>
      </div>

      {/* Session Info Card */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Session Information</h2>
        <div className="dashboard-info-grid" style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Status</span>
            <span style={styles.infoValue}>
              <span style={styles.statusDot} />
              Active
            </span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Session ID</span>
            <span style={styles.infoValueMono}>{session.sessionId}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Expires At</span>
            <span style={styles.infoValue}>{formatExpiry(session.expiresAt)}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Tenant ID</span>
            <span style={styles.infoValueMono}>{tenant.id}</span>
          </div>
        </div>
      </div>

      {/* Module Placeholders */}
      <div className="dashboard-modules-grid" style={styles.modulesGrid}>
        {/* Finance Card */}
        <button onClick={() => navigate('/finance')} style={styles.moduleCard}>
          <div style={{
            ...styles.moduleIcon,
            backgroundColor: '#dbeafe',
            color: '#2563eb',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 style={styles.moduleTitle}>Finance</h3>
          <p style={styles.moduleDescription}>
            Accounting, vouchers, ledgers, and financial reports
          </p>
          <span style={styles.comingSoon}>Coming Soon</span>
        </button>

        {/* Inventory Card */}
        <button onClick={() => navigate('/inventory')} style={styles.moduleCard}>
          <div style={{
            ...styles.moduleIcon,
            backgroundColor: '#dcfce7',
            color: '#16a34a',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M12 2L3 7v11h18V7l-9-5zM6 9.13v7.74h2V9.13L12 6.27l4 2.86v7.74h2V9.13L12 5.27 6 9.13z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 style={styles.moduleTitle}>Inventory</h3>
          <p style={styles.moduleDescription}>
            Stock management, item ledger, and valuation
          </p>
          <span style={styles.comingSoon}>Coming Soon</span>
        </button>

        {/* Sales Card */}
        <button onClick={() => navigate('/sales')} style={styles.moduleCard}>
          <div style={{
            ...styles.moduleIcon,
            backgroundColor: '#fef3c7',
            color: '#d97706',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M12 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L13 10.586V7z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 style={styles.moduleTitle}>Sales</h3>
          <p style={styles.moduleDescription}>
            Sale bills, purchase orders, and returns
          </p>
          <span style={styles.comingSoon}>Coming Soon</span>
        </button>

        {/* Settings Card */}
        <button onClick={() => navigate('/settings')} style={styles.moduleCard}>
          <div style={{
            ...styles.moduleIcon,
            backgroundColor: '#f3e8ff',
            color: '#9333ea',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 style={styles.moduleTitle}>Settings</h3>
          <p style={styles.moduleDescription}>
            User management, company settings, and preferences
          </p>
          <span style={styles.comingSoon}>Coming Soon</span>
        </button>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '32px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  welcomeSection: {
    marginBottom: '32px',
  },
  welcomeTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '8px',
  },
  welcomeSubtitle: {
    fontSize: '16px',
    color: '#64748b',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '32px',
    boxShadow: '0 1px 3px rgb(0 0 0 / 0.1)',
    border: '1px solid #e2e8f0',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '20px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  infoLabel: {
    fontSize: '12px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  infoValue: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  infoValueMono: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#22c55e',
  },
  modulesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '24px',
  },
  moduleCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgb(0 0 0 / 0.1)',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    font: 'inherit',
    transition: 'border-color 0.2s ease',
  },
  moduleIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  moduleTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '8px',
  },
  moduleDescription: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '16px',
    flex: 1,
  },
  comingSoon: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
};
