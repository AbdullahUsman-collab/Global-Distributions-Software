/**
 * Sales Module Page
 * Foundation placeholder for sales and purchasing operations.
 */

import React from 'react';
import { ModulePlaceholder } from '../components/ModulePlaceholder';

export const Sales: React.FC = () => (
  <ModulePlaceholder
    title="Sales"
    description="Sale bills, purchase orders, and return management"
    iconBg="#fef3c7"
    iconColor="#d97706"
    icon={
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M12 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L13 10.586V7z" clipRule="evenodd" />
      </svg>
    }
    features={[
      'Sale Bills',
      'Sale Returns',
      'Purchase Orders',
      'Purchase Returns',
      'Customer Master',
      'Supplier Master',
      'Sales Reports',
      'Purchase Reports',
    ]}
  />
);
