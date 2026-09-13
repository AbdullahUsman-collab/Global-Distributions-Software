/**
 * System Setup Page
 * Bootstrap page for initial system setup when zero brands exist.
 *
 * Features:
 * - System admin login with password change
 * - First brand creation
 * - Clean, professional UI matching existing design
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGetSystemStatus, apiBootstrapLogin, apiCompleteBootstrap } from '../lib/session';

type SetupStep = 'loading' | 'login' | 'create-brand' | 'success' | 'error';

export const SystemSetup: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<SetupStep>('loading');
  const [error, setError] = useState<string | null>(null);
  
  // Login form state
  const [username, setUsername] = useState('sysadmin');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Brand creation state
  const [brandName, setBrandName] = useState('');
  const [slug, setSlug] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [isBrandSubmitting, setIsBrandSubmitting] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    try {
      const status = await apiGetSystemStatus();
      if (status.bootstrapped) {
        navigate('/');
        return;
      }
      setStep('login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check system status');
      setStep('error');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoginSubmitting(true);
    setLoginError(null);

    if (newPassword && newPassword !== confirmPassword) {
      setLoginError('New password and confirmation do not match');
      setIsLoginSubmitting(false);
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setLoginError('New password must be at least 6 characters');
      setIsLoginSubmitting(false);
      return;
    }

    try {
      const result = await apiBootstrapLogin(username, password, newPassword || undefined);
      if (result.success === true) {
        setStep('create-brand');
      } else {
        setLoginError(result.error || 'Login failed');
      }
    } catch (err) {
      setLoginError('An unexpected error occurred');
    } finally {
      setIsLoginSubmitting(false);
    }
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBrandSubmitting(true);
    setBrandError(null);

    if (!brandName.trim()) {
      setBrandError('Brand name is required');
      setIsBrandSubmitting(false);
      return;
    }

    if (!slug.trim()) {
      setBrandError('Slug is required');
      setIsBrandSubmitting(false);
      return;
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      setBrandError('Slug must contain only lowercase letters, numbers, and hyphens');
      setIsBrandSubmitting(false);
      return;
    }

    try {
      const result = await apiCompleteBootstrap(brandName, slug, primaryColor);
      if (result.success === true) {
        setStep('success');
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        setBrandError(result.error || 'Failed to create brand');
      }
    } catch (err) {
      setBrandError('An unexpected error occurred');
    } finally {
      setIsBrandSubmitting(false);
    }
  };

  const handleSlugChange = (value: string) => {
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'));
  };

  if (step === 'loading') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.loadingIcon}>⚙️</div>
          <h1 style={styles.title}>System Setup</h1>
          <p style={styles.message}>Checking system status...</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.errorIcon}>❌</div>
          <h1 style={styles.title}>System Error</h1>
          <p style={styles.message}>{error}</p>
          <button onClick={() => navigate('/')} style={styles.button}>
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.successIcon}>✓</div>
          <h1 style={styles.title}>System Setup Complete</h1>
          <p style={styles.message}>Your first brand has been created successfully.</p>
          <p style={styles.submessage}>Redirecting to brand selection...</p>
        </div>
      </div>
    );
  }

  if (step === 'login') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.logoContainer}>
              <div style={styles.logoPlaceholder}>⚙️</div>
            </div>
            <h1 style={styles.title}>System Setup</h1>
            <p style={styles.subtitle}>Initial system configuration</p>
          </div>

          <div style={styles.infoBox}>
            <p style={styles.infoText}>
              <strong>Welcome to the ERP System.</strong>
            </p>
            <p style={styles.infoText}>
              No brands have been configured yet. Please sign in as the system administrator to create your first brand.
            </p>
          </div>

          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.fieldGroup}>
              <label htmlFor="username" style={styles.label}>Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={styles.input}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div style={styles.fieldGroup}>
              <label htmlFor="password" style={styles.label}>Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                autoComplete="current-password"
                required
              />
            </div>

            <div style={styles.divider}>
              <span style={styles.dividerText}>Optional: Change Password</span>
            </div>

            <div style={styles.fieldGroup}>
              <label htmlFor="newPassword" style={styles.label}>New Password (optional)</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={styles.input}
                autoComplete="new-password"
                placeholder="Leave blank to keep current"
              />
            </div>

            <div style={styles.fieldGroup}>
              <label htmlFor="confirmPassword" style={styles.label}>Confirm New Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={styles.input}
                autoComplete="new-password"
                placeholder="Confirm new password"
              />
            </div>

            {loginError && (
              <div style={styles.errorBanner} role="alert">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoginSubmitting || !password}
              style={{
                ...styles.button,
                opacity: isLoginSubmitting || !password ? 0.7 : 1,
              }}
            >
              {isLoginSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === 'create-brand') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.logoContainer}>
              <div style={styles.logoPlaceholder}>🏢</div>
            </div>
            <h1 style={styles.title}>Create Your First Brand</h1>
            <p style={styles.subtitle}>Set up your organization</p>
          </div>

          <form onSubmit={handleCreateBrand} style={styles.form}>
            <div style={styles.fieldGroup}>
              <label htmlFor="brandName" style={styles.label}>Brand Name *</label>
              <input
                id="brandName"
                type="text"
                value={brandName}
                onChange={(e) => {
                  setBrandName(e.target.value);
                  handleSlugChange(e.target.value);
                }}
                style={styles.input}
                placeholder="e.g., My Company"
                autoFocus
                required
              />
            </div>

            <div style={styles.fieldGroup}>
              <label htmlFor="slug" style={styles.label}>URL Slug *</label>
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                style={styles.input}
                placeholder="e.g., my-company"
                required
              />
              <p style={styles.helpText}>Lowercase letters, numbers, and hyphens only</p>
            </div>

            <div style={styles.fieldGroup}>
              <label htmlFor="primaryColor" style={styles.label}>Primary Color</label>
              <div style={styles.colorInputContainer}>
                <input
                  id="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  style={styles.colorInput}
                />
                <span style={styles.colorValue}>{primaryColor}</span>
              </div>
            </div>

            {brandError && (
              <div style={styles.errorBanner} role="alert">
                {brandError}
              </div>
            )}

            <button
              type="submit"
              disabled={isBrandSubmitting || !brandName || !slug}
              style={{
                ...styles.button,
                opacity: isBrandSubmitting || !brandName || !slug ? 0.7 : 1,
              }}
            >
              {isBrandSubmitting ? 'Creating...' : 'Create Brand'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return null;
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 16px',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 10px 40px -10px rgb(0 0 0 / 0.15)',
    border: '2px solid #e2e8f0',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  logoContainer: {
    width: '80px',
    height: '80px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    backgroundColor: '#f1f5f9',
  },
  logoPlaceholder: {
    fontSize: '32px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
  },
  infoBox: {
    padding: '16px',
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  infoText: {
    fontSize: '14px',
    color: '#0c4a6e',
    margin: '0 0 8px 0',
    lineHeight: '1.5',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    backgroundColor: '#ffffff',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '8px 0',
  },
  dividerText: {
    fontSize: '12px',
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  helpText: {
    fontSize: '12px',
    color: '#64748b',
    margin: '0',
  },
  colorInputContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  colorInput: {
    width: '48px',
    height: '48px',
    padding: '0',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  colorValue: {
    fontSize: '14px',
    color: '#64748b',
    fontFamily: 'monospace',
  },
  errorBanner: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '14px',
  },
  button: {
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    marginTop: '8px',
  },
  loadingIcon: {
    fontSize: '48px',
    textAlign: 'center',
    marginBottom: '16px',
  },
  errorIcon: {
    fontSize: '48px',
    textAlign: 'center',
    marginBottom: '16px',
  },
  successIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    margin: '0 auto 16px',
    backgroundColor: '#dcfce7',
    color: '#16a34a',
  },
  message: {
    fontSize: '16px',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: '8px',
  },
  submessage: {
    fontSize: '14px',
    color: '#94a3b8',
    textAlign: 'center',
  },
};
