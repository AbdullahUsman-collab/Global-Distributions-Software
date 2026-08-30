/**
 * Header Component
 * Top header for the authenticated ERP shell.
 *
 * Displays:
 * - Tenant logo and brand name
 * - Search placeholder
 * - Notification placeholder
 * - User profile trigger
 */

import React, { useState } from 'react';
import { useAuth } from '../auth/ProtectedRoute';
import { clearSession, getSessionId } from '../../lib/session';
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
      const sessionId = getSessionId();
      if (sessionId) {
        await services.authService.logout(sessionId);
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      clearSession();
      navigate('/');
    }
  };

  return (
    <header className="erp-header" style={styles.header}>
      {/* Left section: Menu toggle + Brand */}
      <div style={styles.leftSection}>
        <button
          onClick={onMenuToggle}
          style={styles.menuToggle}
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </button>

        <div style={styles.brandContainer}>
          <div style={{
            ...styles.logo,
            backgroundColor: tenant.primaryColor,
          }}>
            {tenant.brandName.charAt(0)}
          </div>
          <span className="brand-name" style={styles.brandName}>{tenant.brandName}</span>
        </div>
      </div>

      {/* Center section: Search */}
      <div className="search-bar" style={styles.centerSection}>
        <div style={styles.searchContainer}>
          <svg style={styles.searchIcon} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d="M9.965 11.026a5 5 0 111.06-1.06l2.755 2.754a.75.75 0 11-1.06 1.06l-2.755-2.754zM10.5 7a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            style={styles.searchInput}
            disabled
          />
        </div>
      </div>

      {/* Right section: Notifications + User Profile */}
      <div style={styles.rightSection}>
        {/* Notification bell placeholder */}
        <button className="header-icon-btn" style={styles.iconButton} disabled>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 2a6 6 0 00-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 00.515 1.076 32.91 32.91 0 003.256.508 3.5 3.5 0 006.972 0 32.903 32.903 0 003.256-.508.75.75 0 00.515-1.076A11.448 11.448 0 0116 8a6 6 0 00-6-6zm0 14.5a2 2 0 01-1.95-1.557 33.146 33.146 0 003.9 0A2 2 0 0110 16.5z" clipRule="evenodd" />
          </svg>
        </button>

        {/* User Profile Button */}
        <div style={styles.profileContainer}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={styles.profileButton}
            aria-expanded={showProfileMenu}
            aria-haspopup="true"
          >
            <div style={styles.avatar}>
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <span className="profile-name" style={styles.userName}>{user.displayName}</span>
            <svg style={styles.chevron} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 5.293a1 1 0 011.414 0L8 8.586l2.293-2.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <>
              <div
                style={styles.overlay}
                onClick={() => setShowProfileMenu(false)}
              />
              <div style={styles.dropdown}>
                <div style={styles.dropdownHeader}>
                  <div style={styles.dropdownAvatar}>
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
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
    height: '64px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    position: 'sticky',
    top: 0,
    zIndex: 40,
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  menuToggle: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    flexShrink: 0,
  },
  brandContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: 0,
  },
  logo: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 'bold',
    flexShrink: 0,
  },
  brandName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  centerSection: {
    flex: 1,
    maxWidth: '400px',
    margin: '0 24px',
  },
  searchContainer: {
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#94a3b8',
  },
  searchInput: {
    width: '100%',
    padding: '10px 12px 10px 36px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: '#f8fafc',
    outline: 'none',
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  iconButton: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: '#64748b',
    cursor: 'pointer',
  },
  profileContainer: {
    position: 'relative',
  },
  profileButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    minHeight: '40px',
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '600',
    flexShrink: 0,
  },
  userName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
  },
  chevron: {
    color: '#94a3b8',
    flexShrink: 0,
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '8px',
    width: '240px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 10px 40px -10px rgb(0 0 0 / 0.15)',
    border: '1px solid #e2e8f0',
    zIndex: 51,
  },
  dropdownHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
  },
  dropdownAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '600',
  },
  dropdownName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
  dropdownUsername: {
    fontSize: '12px',
    color: '#64748b',
  },
  dropdownDivider: {
    height: '1px',
    backgroundColor: '#e2e8f0',
    margin: '0 16px',
  },
  dropdownInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 16px',
  },
  dropdownLabel: {
    fontSize: '12px',
    color: '#64748b',
  },
  dropdownValue: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#1e293b',
  },
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#dc2626',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'left',
  },
};
