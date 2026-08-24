import React, { useState } from 'react';
import { useAuth } from '../auth/ProtectedRoute';
import { clearSession } from '../../lib/session';
import { services } from '../../services';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { user, tenant } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = async () => {
    try {
      const sessionId = localStorage.getItem('erp_session_id');
      if (sessionId) await services.authService.logout(sessionId);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      clearSession();
      navigate('/');
    }
  };

  return (
    <header className="sticky top-0 z-50 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onMenuToggle} className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Toggle menu">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: tenant.primaryColor }}>
            {tenant.brandName.charAt(0)}
          </div>
          <span className="text-base font-semibold text-slate-800 hidden sm:block">{tenant.brandName}</span>
        </div>
      </div>

      <div className="hidden md:flex flex-1 max-w-xs mx-6">
        <div className="relative w-full">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d="M9.965 11.026a5 5 0 111.06-1.06l2.755 2.754a.75.75 0 11-1.06 1.06l-2.755-2.754zM10.5 7a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z" clipRule="evenodd" />
          </svg>
          <input type="text" placeholder="Search..." className="w-full py-2 pl-10 pr-3 text-sm border border-slate-200 rounded-lg bg-slate-50 outline-none" disabled />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg min-h-[44px]" aria-expanded={showProfileMenu}>
            <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold shrink-0">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-slate-700 hidden sm:block">{user.displayName}</span>
            <svg className="text-slate-400" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 5.293a1 1 0 011.414 0L8 8.586l2.293-2.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {showProfileMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
              <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-50">
                <div className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center text-base font-semibold shrink-0">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">{user.displayName}</div>
                    <div className="text-xs text-slate-500 truncate">@{user.username}</div>
                  </div>
                </div>
                <div className="border-t border-slate-100 mx-4" />
                <div className="flex justify-between px-4 py-3">
                  <span className="text-xs text-slate-500">Brand</span>
                  <span className="text-xs font-medium text-slate-700">{tenant.brandName}</span>
                </div>
                <div className="border-t border-slate-100 mx-4" />
                <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 min-h-[44px]">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path fillRule="evenodd" d="M2 2.75A.75.75 0 012.75 2h4.5a.75.75 0 010 1.5h-4.5v9h4.5a.75.75 0 010 1.5h-4.5A.75.75 0 012 13.25V2.75z" />
                    <path fillRule="evenodd" d="M10.947 8.679a.75.75 0 00-1.06-1.06l-3.72 3.72-1.06-1.06a.75.75 0 00-1.06 1.06l4.25 4.25a.75.75 0 001.06 0l4.25-4.25z" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
