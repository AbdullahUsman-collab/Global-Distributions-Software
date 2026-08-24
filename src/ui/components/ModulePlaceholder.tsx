/**
 * ModulePlaceholder Component
 * Reusable layout for ERP module foundation pages.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ModulePlaceholderProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  features: string[];
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  title,
  description,
  icon,
  iconBg,
  iconColor,
  features,
}) => {
  const navigate = useNavigate();

  return (
    <div className="page-pad" style={styles.container}>
      <button onClick={() => navigate('/dashboard')} style={styles.backLink}>
        ← Back to Dashboard
      </button>

      <div className="module-header-responsive" style={styles.header}>
        <div style={{ ...styles.icon, backgroundColor: iconBg, color: iconColor }}>
          {icon}
        </div>
        <div>
          <h1 style={styles.title}>{title}</h1>
          <p style={styles.description}>{description}</p>
        </div>
      </div>

      <div style={styles.statusBar}>
        <span style={styles.statusDot} />
        <span style={styles.statusText}>Module Foundation</span>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Planned Functionality</h2>
        <ul style={styles.featureList}>
          {features.map((feature, i) => (
            <li key={i} style={styles.featureItem}>{feature}</li>
          ))}
        </ul>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Implementation Status</h2>
        <p style={styles.statusMessage}>
          This module is a structural placeholder. Business logic, data models, and
          transaction processing will be implemented in later steps according to the
          reverse-engineered specifications.
        </p>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '32px',
    maxWidth: '960px',
    margin: '0 auto',
  },
  backLink: {
    display: 'inline-block',
    marginBottom: '24px',
    padding: '0',
    fontSize: '14px',
    color: '#64748b',
    textDecoration: 'none',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '24px',
  },
  icon: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '4px',
  },
  description: {
    fontSize: '15px',
    color: '#64748b',
  },
  statusBar: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#22c55e',
  },
  statusText: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#166534',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgb(0 0 0 / 0.1)',
    border: '1px solid #e2e8f0',
    marginBottom: '20px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '16px',
  },
  featureList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  featureItem: {
    fontSize: '14px',
    color: '#475569',
    paddingLeft: '20px',
    position: 'relative',
  },
  statusMessage: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: '1.6',
  },
};
