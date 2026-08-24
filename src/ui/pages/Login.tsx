/**
 * Brand-Specific Login Page
 * Login form customized with selected brand's theme.
 * 
 * Features:
 * - Resolves brand from URL slug
 * - Dynamic theming based on brand colors
 * - Free-text username input (no email validation)
 * - Form submission with loading state
 * - Success/failure feedback
 * - Back navigation to brand selection
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Tenant } from '../../domain/types/tenant';
import { services } from '../services';
import { storeSession } from '../lib/session';

export const Login: React.FC = () => {
  const { brandSlug } = useParams<{ brandSlug: string }>();
  const navigate = useNavigate();
  
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    const fetchTenant = async () => {
      if (!brandSlug) {
        setLoading(false);
        return;
      }

      try {
        const data = await services.tenantRepository.getTenantBySlug(brandSlug);
        setTenant(data);
        if (!data) {
          setError('Brand not found');
        }
      } catch (err) {
        setError('Failed to load brand information');
        console.error('Error fetching tenant:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTenant();
  }, [brandSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenant) return;
    
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const result = await services.authService.authenticate({
        username,
        password,
        tenantId: tenant.id,
      });

      if (result.success === true) {
        storeSession(result.session.sessionId, result.session.tenantId);
        navigate('/dashboard');
      } else {
        setSubmitError(result.error);
      }
    } catch (err) {
      setSubmitError('An unexpected error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div className="skeleton" style={{ width: '80px', height: '80px', borderRadius: '16px', margin: '0 auto 16px' }} />
          <div className="skeleton" style={{ width: '200px', height: '24px', margin: '0 auto 8px' }} />
          <div className="skeleton" style={{ width: '150px', height: '16px', margin: '0 auto' }} />
        </div>
      </div>
    );
  }

  // Brand not found
  if (!tenant) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.errorIcon}>🔍</div>
          <h1 style={styles.errorTitle}>Brand Not Found</h1>
          <p style={styles.errorMessage}>
            The brand you're looking for doesn't exist or is no longer available.
          </p>
          <Link to="/" style={styles.backLink}>
            ← Back to Brand Selection
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (submitSuccess) {
    return (
      <div style={styles.container}>
        <div style={{
          ...styles.card,
          borderColor: tenant.primaryColor,
        }}>
          <div style={{
            ...styles.successIcon,
            backgroundColor: `${tenant.primaryColor}20`,
            color: tenant.primaryColor,
          }}>
            ✓
          </div>
          <h1 style={styles.successTitle}>Welcome, {username}!</h1>
          <p style={styles.successMessage}>
            You have successfully signed in to {tenant.brandName}.
          </p>
          <p style={{ ...styles.successSubmessage, color: '#64748b' }}>
            Dashboard will be available in the next step.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div className="fade-in login-card" style={{
        ...styles.card,
        borderColor: tenant.primaryColor,
      }}>
        {/* Back link */}
        <Link to="/" style={styles.backLinkTop}>
          ← Back to Brand Selection
        </Link>

        {/* Brand header */}
        <div style={styles.header}>
          <div style={{
            ...styles.logoContainer,
            backgroundColor: `${tenant.primaryColor}10`,
          }}>
            <div style={{
              ...styles.logoPlaceholder,
              backgroundColor: tenant.primaryColor,
            }}>
              {tenant.brandName.charAt(0)}
            </div>
          </div>
          <h1 style={styles.title}>Sign In</h1>
          <p style={{
            ...styles.subtitle,
            color: tenant.primaryColor,
          }}>
            {tenant.brandName}
          </p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Username field */}
          <div style={styles.fieldGroup}>
            <label htmlFor="username" style={styles.label}>
              Username / Login ID
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting}
              aria-label="Username or Login ID"
              placeholder="Enter your username"
              style={{
                ...styles.input,
                borderColor: username ? tenant.primaryColor : '#e2e8f0',
              }}
            />
          </div>

          {/* Password field */}
          <div style={styles.fieldGroup}>
            <label htmlFor="password" style={styles.label}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              aria-label="Password"
              placeholder="Enter your password"
              style={{
                ...styles.input,
                borderColor: password ? tenant.primaryColor : '#e2e8f0',
              }}
            />
          </div>

          {/* Error message */}
          {submitError && (
            <div style={styles.errorBanner} role="alert">
              {submitError}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting || !username || !password}
            style={{
              ...styles.submitButton,
              backgroundColor: tenant.primaryColor,
              opacity: isSubmitting || !username || !password ? 0.7 : 1,
            }}
          >
            {isSubmitting ? (
              <span style={styles.buttonContent}>
                <span className="spinner" style={{ borderColor: '#ffffff', borderTopColor: 'transparent' }} />
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
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
    maxWidth: '400px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 10px 40px -10px rgb(0 0 0 / 0.15)',
    border: '2px solid #e2e8f0',
    position: 'relative',
  },
  backLinkTop: {
    display: 'inline-block',
    marginBottom: '24px',
    fontSize: '14px',
    color: '#64748b',
    textDecoration: 'none',
    transition: 'color 0.2s ease',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logoContainer: {
    width: '80px',
    height: '80px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  logoPlaceholder: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: '20px',
    fontWeight: 'bold',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '16px',
    fontWeight: '500',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
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
  errorBanner: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '14px',
  },
  submitButton: {
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
  },
  buttonContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  // Success state styles
  successIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    margin: '0 auto 16px',
  },
  successTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: '8px',
  },
  successMessage: {
    fontSize: '16px',
    color: '#374151',
    textAlign: 'center',
    marginBottom: '8px',
  },
  successSubmessage: {
    fontSize: '14px',
    textAlign: 'center',
  },
  // Error state styles
  errorIcon: {
    fontSize: '48px',
    textAlign: 'center',
    marginBottom: '16px',
  },
  errorTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: '8px',
  },
  errorMessage: {
    fontSize: '16px',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: '24px',
  },
  backLink: {
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
  },
};
