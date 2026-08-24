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

  useEffect(() => {
    const fetchTenant = async () => {
      if (!brandSlug) { setLoading(false); return; }
      try {
        const data = await services.tenantRepository.getTenantBySlug(brandSlug);
        setTenant(data);
        if (!data) setError('Brand not found');
      } catch { setError('Failed to load brand information'); }
      finally { setLoading(false); }
    };
    fetchTenant();
  }, [brandSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await services.authService.authenticate({ username, password, tenantId: tenant.id });
      if (result.success === true) {
        storeSession(result.session.sessionId, result.session.tenantId);
        navigate('/dashboard');
      } else { setSubmitError(result.error); }
    } catch { setSubmitError('An unexpected error occurred. Please try again.'); }
    finally { setIsSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-200">
        <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-xl border-2 border-slate-200">
          <div className="skeleton w-20 h-20 rounded-2xl mx-auto mb-4" />
          <div className="skeleton w-48 h-6 mx-auto mb-2" />
          <div className="skeleton w-36 h-4 mx-auto" />
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-200">
        <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-xl border-2 border-slate-200 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-xl md:text-2xl font-semibold text-slate-800 mb-2">Brand Not Found</h1>
          <p className="text-slate-500 mb-6">The brand you're looking for doesn't exist or is no longer available.</p>
          <Link to="/" className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg text-base font-medium hover:bg-blue-600 min-h-[44px]">← Back to Brand Selection</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-200">
      <div className="fade-in w-full max-w-sm bg-white rounded-2xl p-6 md:p-8 shadow-xl" style={{ border: `2px solid ${tenant.primaryColor}` }}>
        <Link to="/" className="inline-block mb-6 text-sm text-slate-500 hover:text-slate-700">← Back to Brand Selection</Link>

        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${tenant.primaryColor}10` }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-bold" style={{ backgroundColor: tenant.primaryColor }}>
              {tenant.brandName.charAt(0)}
            </div>
          </div>
          <h1 className="text-xl md:text-2xl font-semibold text-slate-800 mb-1">Sign In</h1>
          <p className="text-base font-medium" style={{ color: tenant.primaryColor }}>{tenant.brandName}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-sm font-medium text-slate-700">Username / Login ID</label>
            <input id="username" type="text" required autoComplete="username" autoFocus value={username} onChange={e => setUsername(e.target.value)} disabled={isSubmitting}
              placeholder="Enter your username"
              className="w-full px-4 py-3 text-base border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-colors min-h-[44px]"
              style={{ borderColor: username ? tenant.primaryColor : undefined }} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">Password</label>
            <input id="password" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} disabled={isSubmitting}
              placeholder="Enter your password"
              className="w-full px-4 py-3 text-base border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-colors min-h-[44px]"
              style={{ borderColor: password ? tenant.primaryColor : undefined }} />
          </div>
          {submitError && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600" role="alert">{submitError}</div>}
          <button type="submit" disabled={isSubmitting || !username || !password}
            className="w-full py-3.5 text-base font-semibold text-white rounded-lg min-h-[44px] transition-opacity disabled:opacity-70"
            style={{ backgroundColor: tenant.primaryColor }}>
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner" style={{ borderColor: '#ffffff', borderTopColor: 'transparent' }} /> Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
