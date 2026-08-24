/**
 * Layout Component
 * Main layout wrapper for authenticated ERP shell.
 * 
 * Features:
 * - Header with user profile
 * - Collapsible sidebar
 * - Content area
 * - Responsive design
 */

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const Layout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div style={styles.container}>
      {/* Header */}
      <Header
        onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        sidebarCollapsed={sidebarCollapsed}
      />

      {/* Main content area */}
      <div style={styles.main}>
        {/* Sidebar */}
        <Sidebar collapsed={sidebarCollapsed} />

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
  },
  content: {
    flex: 1,
    overflow: 'auto',
  },
};
