/**
 * Main App Component
 * Root component with routing configuration.
 *
 * Page components are lazy-loaded via React.lazy() + Suspense to split
 * the frontend bundle into per-route chunks. Shell components (Layout,
 * ProtectedRoute, ErrorBoundary, BrandSelection, Login, NotFound) remain
 * in the main bundle since they're needed on every navigation.
 */

import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BrandSelection } from './pages/BrandSelection';
import { Login } from './pages/Login';
import { Layout } from './components/layout/Layout';
import { NotFound } from './pages/NotFound';

// Lazy-loaded page components — each becomes a separate chunk
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Finance = React.lazy(() => import('./pages/Finance').then(m => ({ default: m.Finance })));
const Inventory = React.lazy(() => import('./pages/Inventory').then(m => ({ default: m.Inventory })));
const Sales = React.lazy(() => import('./pages/Sales').then(m => ({ default: m.Sales })));
const Purchases = React.lazy(() => import('./pages/Purchases').then(m => ({ default: m.Purchases })));
const CustomerReceipts = React.lazy(() => import('./pages/CustomerReceipts').then(m => ({ default: m.CustomerReceipts })));
const CashBook = React.lazy(() => import('./pages/CashBook').then(m => ({ default: m.CashBook })));
const BillsList = React.lazy(() => import('./pages/BillsList').then(m => ({ default: m.BillsList })));
const BillDetailPage = React.lazy(() => import('./pages/BillDetail').then(m => ({ default: m.BillDetailPage })));
const AgingReport = React.lazy(() => import('./pages/AgingReport').then(m => ({ default: m.AgingReport })));
const Settings = React.lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Users = React.lazy(() => import('./pages/Users').then(m => ({ default: m.Users })));
const UserBrandAccessPage = React.lazy(() => import('./pages/UserBrandAccess').then(m => ({ default: m.UserBrandAccessPage })));
const Brands = React.lazy(() => import('./pages/Brands').then(m => ({ default: m.Brands })));
const SystemSetup = React.lazy(() => import('./pages/SystemSetup').then(m => ({ default: m.SystemSetup })));

const PageFallback = (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
    <div style={{ textAlign: 'center' }}>
      <div className="spinner" style={{ width: 40, height: 40, borderColor: 'var(--accent, #6366f1)', borderTopColor: 'transparent', margin: '0 auto 16px' }} />
    </div>
  </div>
);

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary fallbackTitle="Application Error" fallbackMessage="The application encountered an unexpected error.">
        <Suspense fallback={PageFallback}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<ErrorBoundary><BrandSelection /></ErrorBoundary>} />
            <Route path="/login/:brandSlug" element={<ErrorBoundary><Login /></ErrorBoundary>} />
            <Route path="/setup" element={<ErrorBoundary><SystemSetup /></ErrorBoundary>} />
            {/* Catch-all (Step 92): unknown URLs previously rendered a blank page. */}
            <Route path="*" element={<ErrorBoundary><NotFound /></ErrorBoundary>} />

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
                <Route path="/users" element={<ErrorBoundary><Users /></ErrorBoundary>} />
                <Route path="/brand-access" element={<ErrorBoundary><UserBrandAccessPage /></ErrorBoundary>} />
                <Route path="/brands" element={<ErrorBoundary><Brands /></ErrorBoundary>} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
};
