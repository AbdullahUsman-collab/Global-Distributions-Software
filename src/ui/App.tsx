/**
 * Main App Component
 * Root component with routing configuration.
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BrandSelection } from './pages/BrandSelection';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Finance } from './pages/Finance';
import { Inventory } from './pages/Inventory';
import { Sales } from './pages/Sales';
import { Purchases } from './pages/Purchases';
import { CustomerReceipts } from './pages/CustomerReceipts';
import { CashBook } from './pages/CashBook';
import { BillsList } from './pages/BillsList';
import { BillDetailPage } from './pages/BillDetail';
import { AgingReport } from './pages/AgingReport';
import { Settings } from './pages/Settings';
import { Layout } from './components/layout/Layout';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary fallbackTitle="Application Error" fallbackMessage="The application encountered an unexpected error.">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<ErrorBoundary><BrandSelection /></ErrorBoundary>} />
          <Route path="/login/:brandSlug" element={<ErrorBoundary><Login /></ErrorBoundary>} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
              <Route path="/finance" element={<ErrorBoundary><Finance /></ErrorBoundary>} />
              <Route path="/inventory" element={<ErrorBoundary><Inventory /></ErrorBoundary>} />
              <Route path="/sales" element={<ErrorBoundary><Sales /></ErrorBoundary>} />
              <Route path="/purchases" element={<ErrorBoundary><Purchases /></ErrorBoundary>} />
              <Route path="/bills" element={<ErrorBoundary><BillsList /></ErrorBoundary>} />
              <Route path="/bills/:voucherId" element={<ErrorBoundary><BillDetailPage /></ErrorBoundary>} />
              <Route path="/aging" element={<ErrorBoundary><AgingReport /></ErrorBoundary>} />
              <Route path="/customer-receipts" element={<ErrorBoundary><CustomerReceipts /></ErrorBoundary>} />
              <Route path="/cash-book" element={<ErrorBoundary><CashBook /></ErrorBoundary>} />
              <Route path="/settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
            </Route>
          </Route>
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};
