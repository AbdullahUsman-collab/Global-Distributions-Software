/**
 * Header Component
 * Top header for the authenticated ERP shell.
 *
 * Displays:
 * - Tenant logo and brand name with brand switcher
 * - Search placeholder
 * - Notification placeholder
 * - User profile trigger
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../auth/ProtectedRoute';
import { apiLogout } from '../../lib/session';
import { switchTenant } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { isDemoMode } from '../../lib/config';
import { useThemeMode, ThemeMode } from '../../lib/theme';
import { TenantPublicConfig } from '../../../domain/types/tenant';

interface HeaderProps {
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { user, tenant, authorizedBrands, refreshAuth } = useAuth();
  const navigate = useNavigate();
  const { mode: themeMode, resolved: resolvedTheme, setMode: setThemeMode } = useThemeMode();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showBrandSwitcher, setShowBrandSwitcher] = useState(false);
  const [switching, setSwitching] = useState(false);
  const brandSwitcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (brandSwitcherRef.current && !brandSwitcherRef.current.contains(e.target as Node)) {
        setShowBrandSwitcher(false);
      }
    };
    if (showBrandSwitcher) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBrandSwitcher]);

  const handleLogout = async () => {
    try { await apiLogout(); } catch { /* ignore */ } finally { navigate('/'); }
  };

  const handleBrandSwitch = async (target: TenantPublicConfig) => {
    if (target.id === tenant.id || switching) return;
    setSwitching(true);
    try {
      await switchTenant(target.id);
      await refreshAuth();
      window.location.reload();
    } catch (err: any) {
      alert(err?.message || 'Failed to switch brand');
    } finally {
      setSwitching(false);
      setShowBrandSwitcher(false);
    }
  };

  const otherBrands = authorizedBrands.filter(b => b.id !== tenant.id);

  return (
    <header className="erp-header" style={styles.header}>
      <div style={styles.leftSection}>
        <button onClick={onMenuToggle} style={styles.menuToggle} aria-label="Toggle menu">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </button>

        <div ref={brandSwitcherRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowBrandSwitcher(!showBrandSwitcher)}
            style={styles.brandContainer}
            disabled={switching}
          >
            <div style={{ ...styles.logo, backgroundColor: tenant.primaryColor }}>
              {tenant.brandName.charAt(0)}
            </div>
            <span className="brand-name" style={styles.brandName}>{tenant.brandName}</span>
            {authorizedBrands.length > 1 && (
              <svg style={styles.chevron} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 5.293a1 1 0 011.414 0L8 8.586l2.293-2.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            )}
            {isDemoMode() && <span style={styles.demoBadge}>DEMO</span>}
          </button>

          {showBrandSwitcher && (
            <>
              <div style={styles.overlay} onClick={() => setShowBrandSwitcher(false)} />
              <div style={styles.brandDropdown}>
                <div style={styles.brandDropdownHeader}>Switch Brand</div>
                {authorizedBrands.map(brand => {
                  const isActive = brand.id === tenant.id;
                  return (
                    <button
                      key={brand.id}
                      onClick={() => handleBrandSwitch(brand)}
                      style={{
                        ...styles.brandOption,
                        backgroundColor: isActive ? 'var(--accent-soft)' : 'transparent',
                        cursor: isActive || switching ? 'default' : 'pointer',
                        opacity: switching ? 0.6 : 1,
                      }}
                      disabled={isActive || switching}
                    >
                      <div style={{ ...styles.brandLogo, backgroundColor: brand.primaryColor }}>
                        {brand.brandName.charAt(0)}
                      </div>
                      <div style={styles.brandInfo}>
                        <span style={styles.brandOptionName}>{brand.brandName}</span>
                        {isActive && <span style={styles.activeLabel}>Current</span>}
                      </div>
                      {isActive && (
                        <svg style={{ ...styles.checkIcon, color: 'var(--accent)' }} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path fillRule="evenodd" d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  );
                })}
                {switching && <div style={styles.switchingText}>Switching...</div>}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="search-bar" style={styles.centerSection}>
        <div style={styles.searchContainer}>
          <svg style={styles.searchIcon} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d="M9.965 11.026a5 5 0 111.06-1.06l2.755 2.754a.75.75 0 11-1.06 1.06l-2.755-2.754zM10.5 7a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z" clipRule="evenodd" />
          </svg>
          <input type="text" placeholder="Search..." style={styles.searchInput} disabled />
        </div>
      </div>

      <div style={styles.rightSection}>
        {/* Theme toggle: light → dark → system (persisted via lib/theme.ts) */}
        <button
          className="header-btn"
          onClick={() => setThemeMode(((() => {
            const order: ThemeMode[] = ['light', 'dark', 'system'];
            return order[(order.indexOf(themeMode) + 1) % order.length];
          })()) as ThemeMode)}
          style={styles.themeButton}
          aria-label={`Theme: ${themeMode}. Activate to switch theme.`}
          title={`Theme: ${themeMode}`}
        >
          {resolvedTheme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          ) : themeMode === 'system' ? (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M2 4.5A2.5 2.5 0 014.5 2h11A2.5 2.5 0 0118 4.5v7a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 012 11.5v-7zM4.5 3.5a1 1 0 00-1 1v7a1 1 0 001 1h11a1 1 0 001-1v-7a1 1 0 00-1-1h-11zM7 15a.75.75 0 00-.75.75v.5a.75.75 0 01-.75.75h-1a.75.75 0 000 1.5h11a.75.75 0 000-1.5h-1a.75.75 0 01-.75-.75v-.5A.75.75 0 0013 15H7z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fillRule="evenodd" clipRule="evenodd" />
            </svg>
          )}
        </button>

        <button className="header-icon-btn" style={styles.iconButton} disabled>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 2a6 6 0 00-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 00.515 1.076 32.91 32.91 0 003.256.508 3.5 3.5 0 006.972 0 32.903 32.903 0 003.256-.508.75.75 0 00.515-1.076A11.448 11.448 0 0116 8a6 6 0 00-6-6zm0 14.5a2 2 0 01-1.95-1.557 33.146 33.146 0 003.9 0A2 2 0 0110 16.5z" clipRule="evenodd" />
          </svg>
        </button>

        <div style={styles.profileContainer}>
          <button onClick={() => setShowProfileMenu(!showProfileMenu)} style={styles.profileButton} aria-expanded={showProfileMenu} aria-haspopup="true">
            <div style={styles.avatar}>{user.displayName.charAt(0).toUpperCase()}</div>
            <span className="profile-name" style={styles.userName}>{user.displayName}</span>
            <svg style={styles.chevron} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 5.293a1 1 0 011.414 0L8 8.586l2.293-2.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {showProfileMenu && (
            <>
              <div style={styles.overlay} onClick={() => setShowProfileMenu(false)} />
              <div style={styles.dropdown}>
                <div style={styles.dropdownHeader}>
                  <div style={styles.dropdownAvatar}>{user.displayName.charAt(0).toUpperCase()}</div>
                  <div>
                    <div style={styles.dropdownName}>{user.displayName}</div>
                    <div style={styles.dropdownUsername}>@{user.username} &middot; {user.role}</div>
                  </div>
                </div>
                <div style={styles.dropdownDivider} />
                <div style={styles.dropdownInfo}>
                  <span style={styles.dropdownLabel}>Brand</span>
                  <span style={styles.dropdownValue}>{tenant.brandName}</span>
                </div>
                <div style={styles.dropdownInfo}>
                  <span style={styles.dropdownLabel}>Role</span>
                  <span style={styles.dropdownValue}>{user.role}</span>
                </div>
                <div style={styles.dropdownDivider} />
                <button onClick={handleLogout} style={styles.logoutButton}>
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

const styles: { [key: string]: React.CSSProperties } = {
  header: {
    height: '64px', backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 24px', position: 'sticky', top: 0, zIndex: 40,
  },
  themeButton: {
    width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent', border: 'none', borderRadius: '8px', color: 'var(--text-muted)',
    cursor: 'pointer', transition: 'background-color 0.2s ease, color 0.2s ease', flexShrink: 0,
  },
  leftSection: { display: 'flex', alignItems: 'center', gap: '12px' },
  menuToggle: {
    width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent', border: 'none', borderRadius: '8px', color: 'var(--text-muted)',
    cursor: 'pointer', transition: 'background-color 0.2s ease', flexShrink: 0,
  },
  brandContainer: {
    display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, background: 'none',
    border: '1px solid transparent', borderRadius: '8px', padding: '4px 8px', cursor: 'pointer',
    transition: 'border-color 0.15s ease',
  },
  logo: {
    width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: '#ffffff', fontSize: '14px', fontWeight: 'bold', flexShrink: 0,
  },
  brandName: {
    fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden',
    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  centerSection: { flex: 1, maxWidth: '400px', margin: '0 24px' },
  searchContainer: { position: 'relative' },
  searchIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' },
  searchInput: {
    width: '100%', padding: '10px 12px 10px 36px', fontSize: '14px', border: '1px solid var(--border)',
    borderRadius: '8px', backgroundColor: 'var(--surface-2)', color: 'var(--text-primary)', outline: 'none',
  },
  rightSection: { display: 'flex', alignItems: 'center', gap: '8px' },
  iconButton: {
    width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent', border: 'none', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer',
  },
  profileContainer: { position: 'relative' },
  profileButton: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px',
    backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px',
    cursor: 'pointer', minHeight: '40px',
  },
  avatar: {
    width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--accent)',
    color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', fontWeight: '600', flexShrink: 0,
  },
  userName: { fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' },
  chevron: { color: 'var(--text-disabled)', flexShrink: 0 },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 },
  dropdown: {
    position: 'absolute', top: '100%', right: 0, marginTop: '8px', width: '240px',
    backgroundColor: 'var(--surface-raised)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--border)', zIndex: 51,
  },
  dropdownHeader: { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px' },
  dropdownAvatar: {
    width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--accent)',
    color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '16px', fontWeight: '600',
  },
  dropdownName: { fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' },
  dropdownUsername: { fontSize: '12px', color: 'var(--text-muted)' },
  dropdownDivider: { height: '1px', backgroundColor: 'var(--border)', margin: '0 16px' },
  dropdownInfo: { display: 'flex', justifyContent: 'space-between', padding: '12px 16px' },
  dropdownLabel: { fontSize: '12px', color: 'var(--text-muted)' },
  dropdownValue: { fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' },
  logoutButton: {
    display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '12px 16px',
    backgroundColor: 'transparent', border: 'none', color: 'var(--danger)', fontSize: '14px',
    cursor: 'pointer', textAlign: 'left',
  },
  demoBadge: {
    display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
    backgroundColor: '#fef3c7', color: '#92400e', fontSize: '10px', fontWeight: '700',
    borderRadius: '4px', letterSpacing: '0.05em', border: '1px solid #fcd34d', marginLeft: '8px',
  },
  brandDropdown: {
    position: 'absolute', top: '100%', left: 0, marginTop: '8px', width: '260px',
    backgroundColor: 'var(--surface-raised)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--border)', zIndex: 51, padding: '4px',
  },
  brandDropdownHeader: {
    fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase',
    letterSpacing: '0.05em', padding: '8px 12px 4px',
  },
  brandOption: {
    display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px',
    border: 'none', borderRadius: '8px', textAlign: 'left', transition: 'background-color 0.15s ease',
  },
  brandLogo: {
    width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: '#ffffff', fontSize: '12px', fontWeight: 'bold', flexShrink: 0,
  },
  brandInfo: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1px' },
  brandOptionName: { fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  activeLabel: { fontSize: '11px', color: 'var(--accent)', fontWeight: '500' },
  checkIcon: { flexShrink: 0 },
  switchingText: { fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '8px' },
};
