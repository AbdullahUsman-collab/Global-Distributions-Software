/**
 * Layout Component
 * Main layout wrapper for authenticated ERP shell.
 *
 * Features:
 * - Header with user profile
 * - Collapsible sidebar (overlay on mobile, inline on desktop)
 * - Content area
 * - Responsive design
 */

import React, { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="layout-container" style={styles.container}>
      {/* Header */}
      <Header onMenuToggle={toggleSidebar} />

      {/* Main content area */}
      <div style={styles.main}>
        {/* Sidebar overlay backdrop (mobile) */}
        <div
          className={`erp-sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
          onClick={closeSidebar}
        />

        {/* Sidebar */}
        <Sidebar open={sidebarOpen} onClose={closeSidebar} />

        {/* Content */}
        <main style={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f8fafc',
  },
  main: {
    display: 'flex',
    flex: 1,
    position: 'relative',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    minWidth: 0,
  },
};
