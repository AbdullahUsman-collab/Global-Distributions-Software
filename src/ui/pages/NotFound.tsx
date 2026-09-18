/**
 * 404 / Not Found page (Step 92)
 *
 * Unknown URLs previously rendered a completely blank page (no route match
 * and no catch-all route). This component gives every unmatched URL a clear,
 * theme-aware error state consistent with the rest of the ERP, plus usable
 * recovery navigation. Presentation only — no routing architecture changes.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  const hasSession = !!localStorage.getItem('erp_current_user');

  const styles: { [key: string]: React.CSSProperties } = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
      background: 'linear-gradient(135deg, var(--surface-2) 0%, var(--border) 100%)',
      textAlign: 'center',
    },
    code: {
      fontSize: '64px',
      fontWeight: '700',
      color: 'var(--accent)',
      margin: 0,
      lineHeight: 1,
    },
    title: {
      fontSize: '22px',
      fontWeight: '600',
      color: 'var(--text-primary)',
      margin: '16px 0 8px',
    },
    message: {
      fontSize: '15px',
      color: 'var(--text-muted)',
      margin: '0 0 24px',
      lineHeight: 1.5,
      maxWidth: '420px',
    },
    actions: {
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    button: {
      padding: '12px 24px',
      minHeight: '44px',
      backgroundColor: 'var(--accent)',
      color: 'var(--accent-contrast)',
      border: 'none',
      borderRadius: '8px',
      fontSize: '15px',
      fontWeight: '500',
      cursor: 'pointer',
      textDecoration: 'none',
      display: 'inline-flex',
      alignItems: 'center',
    },
    secondaryButton: {
      padding: '12px 24px',
      minHeight: '44px',
      backgroundColor: 'transparent',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      fontSize: '15px',
      fontWeight: '500',
      cursor: 'pointer',
      textDecoration: 'none',
      display: 'inline-flex',
      alignItems: 'center',
    },
  };

  return (
    <div style={styles.container}>
      <p style={styles.code} aria-hidden="true">404</p>
      <h1 style={styles.title}>Page Not Found</h1>
      <p style={styles.message}>
        The page you are looking for does not exist or has been moved.
      </p>
      <div style={styles.actions}>
        <button type="button" onClick={() => navigate(-1)} style={styles.secondaryButton}>
          ← Go Back
        </button>
        <button
          type="button"
          onClick={() => navigate(hasSession ? '/dashboard' : '/')}
          style={styles.button}
        >
          {hasSession ? 'Go to Dashboard' : 'Go to Brand Selection'}
        </button>
      </div>
    </div>
  );
};
