import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth/ProtectedRoute';

export const Dashboard: React.FC = () => {
  const { user, tenant, session } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="fade-in mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">Welcome, {user.displayName}</h1>
        <p className="text-slate-500">You are signed in to <strong>{tenant.brandName}</strong></p>
      </div>

      <div className="bg-white rounded-xl p-4 md:p-6 mb-8 shadow-sm border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Session Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 uppercase tracking-wide">Status</span>
            <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <span className="w-2 h-2 rounded-full bg-green-500" /> Active
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 uppercase tracking-wide">Session ID</span>
            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded truncate">{session.sessionId}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 uppercase tracking-wide">Expires At</span>
            <span className="text-sm font-medium text-slate-800">{new Date(session.expiresAt).toLocaleString()}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 uppercase tracking-wide">Tenant ID</span>
            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded truncate">{tenant.id}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Finance', desc: 'Accounting, vouchers, ledgers, and financial reports', path: '/finance', bg: 'bg-blue-50', color: 'text-blue-600', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg> },
          { label: 'Inventory', desc: 'Stock management, item ledger, and valuation', path: '/inventory', bg: 'bg-green-50', color: 'text-green-600', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M12 2L3 7v11h18V7l-9-5zM6 9.13v7.74h2V9.13L12 6.27l4 2.86v7.74h2V9.13L12 5.27 6 9.13z" clipRule="evenodd" /></svg> },
          { label: 'Sales', desc: 'Sale bills, purchase orders, and returns', path: '/sales', bg: 'bg-amber-50', color: 'text-amber-600', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M12 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L13 10.586V7z" clipRule="evenodd" /></svg> },
          { label: 'Settings', desc: 'User management, company settings, and preferences', path: '/settings', bg: 'bg-purple-50', color: 'text-purple-600', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg> },
        ].map(m => (
          <button key={m.path} onClick={() => navigate(m.path)} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col text-left hover:border-slate-300 transition-colors min-h-[44px]">
            <div className={`w-12 h-12 rounded-xl ${m.bg} ${m.color} flex items-center justify-center mb-4`}>{m.icon}</div>
            <h3 className="text-base font-semibold text-slate-800 mb-2">{m.label}</h3>
            <p className="text-sm text-slate-500 flex-1 mb-3">{m.desc}</p>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Coming Soon</span>
          </button>
        ))}
      </div>
    </div>
  );
};
