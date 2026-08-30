/**
 * Sidebar Component
 * Responsive sidebar navigation for the ERP shell.
 *
 * Features:
 * - Overlay on mobile, inline on desktop
 * - Active state highlighting
 * - Smooth transitions
 * - Role-based navigation visibility
 */

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/ProtectedRoute';
import { hasPermission, Permission } from '../../../domain/services/AuthorizationService';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  permission?: Permission;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
      </svg>
    ),
    permission: 'dashboard.view',
  },
  {
    label: 'Finance',
    path: '/finance',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
        <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
      </svg>
    ),
    permission: 'finance.view',
  },
  {
    label: 'Inventory',
    path: '/inventory',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 2L3 7v11h14V7l-7-5zM5 8.13v7.74h2V8.13L10 5.27l3 2.86v7.74h2V8.13l3-2.86V17H2V5.27l3 2.86z" clipRule="evenodd" />
      </svg>
    ),
    permission: 'inventory.view',
  },
  {
    label: 'Sales',
    path: '/sales',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 11.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l3-3A1 1 0 0011 10.586V7z" clipRule="evenodd" />
      </svg>
    ),
    permission: 'sales.view',
  },
  {
    label: 'Purchases',
    path: '/purchases',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 11.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l3-3A1 1 0 0011 10.586V7z" clipRule="evenodd" />
      </svg>
    ),
    permission: 'purchases.view',
  },
  {
    label: 'Bills',
    path: '/bills',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
      </svg>
    ),
    permission: 'bills.view',
  },
  {
    label: 'Aging',
    path: '/aging',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
      </svg>
    ),
    permission: 'aging.view',
  },
  {
    label: 'Receipts',
    path: '/customer-receipts',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
      </svg>
    ),
    permission: 'receipts.view',
  },
  {
    label: 'Cash Book',
    path: '/cash-book',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11a1 1 0 11-2 0V9a1 1 0 112 0v4zm0-6a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
      </svg>
    ),
    permission: 'cash.view',
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
      </svg>
    ),
    permission: 'tenant.manage',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const handleNav = (path: string) => {
    navigate(path);
    onClose();
  };

  const visibleItems = navItems.filter(
    (item) => !item.permission || hasPermission(user.role, item.permission)
  );

  return (
    <aside className={`erp-sidebar ${open ? 'open' : ''}`} style={styles.sidebar}>
      <nav style={styles.nav}>
        {visibleItems.map((item) => (
          <button
            key={item.path}
            onClick={() => handleNav(item.path)}
            style={{
              ...styles.navItem,
              backgroundColor: isActive(item.path) ? '#eff6ff' : 'transparent',
              color: isActive(item.path) ? '#2563eb' : '#64748b',
            }}
          >
            <span style={styles.navIcon}>{item.icon}</span>
            <span style={styles.navLabel}>{item.label}</span>
          </button>
        ))}
      </nav>

      <div style={styles.footer}>
        <p style={styles.footerText}>More modules coming soon</p>
      </div>
    </aside>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  sidebar: {
    height: 'calc(100vh - 64px)',
    backgroundColor: '#ffffff',
    borderRight: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    width: '240px',
    flexShrink: 0,
    overflow: 'hidden',
  },
  nav: {
    flex: 1,
    padding: '12px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    overflowY: 'auto',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    minHeight: '40px',
    width: '100%',
    textAlign: 'left',
  },
  navIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    flexShrink: 0,
  },
  navLabel: {
    flex: 1,
    textAlign: 'left',
  },
  footer: {
    padding: '16px',
    borderTop: '1px solid #e2e8f0',
  },
  footerText: {
    fontSize: '12px',
    color: '#94a3b8',
    textAlign: 'center',
  },
};
