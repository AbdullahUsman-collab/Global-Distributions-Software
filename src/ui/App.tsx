/**
 * Main App Component
 * Root component with routing configuration.
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
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
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<BrandSelection />} />
        <Route path="/login/:brandSlug" element={<Login />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/bills" element={<BillsList />} />
            <Route path="/bills/:voucherId" element={<BillDetailPage />} />
            <Route path="/aging" element={<AgingReport />} />
            <Route path="/customer-receipts" element={<CustomerReceipts />} />
            <Route path="/cash-book" element={<CashBook />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
