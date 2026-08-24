/**
 * Brand Card Component
 * Displays a single brand/tenant as a clickable card for selection.
 * 
 * Features:
 * - Responsive square card design
 * - Brand logo and name display
 * - Hover/focus states with brand colors
 * - Keyboard accessible
 * - Smooth 60fps transitions
 */

import React from 'react';
import { TenantPublicConfig } from '../../domain/types/tenant';

interface BrandCardProps {
  tenant: TenantPublicConfig;
  onClick: (tenant: TenantPublicConfig) => void;
}

export const BrandCard: React.FC<BrandCardProps> = ({ tenant, onClick }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  const isActive = isHovered || isFocused;

  const handleClick = () => {
    onClick(tenant);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(tenant);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      aria-label={`Select ${tenant.brandName}`}
      style={{
        width: '100%',
        aspectRatio: '1',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: `2px solid ${isActive ? tenant.primaryColor : '#e2e8f0'}`,
        boxShadow: isActive
          ? `0 20px 40px ${tenant.primaryColor}33`
          : '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isActive ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      {/* Logo Container */}
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '16px',
          backgroundColor: `${tenant.primaryColor}10`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          transition: 'all 0.2s ease',
          transform: isActive ? 'scale(1.05)' : 'scale(1)',
        }}
      >
        {/* Placeholder logo - will be replaced with actual logo */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: tenant.primaryColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '20px',
            fontWeight: 'bold',
          }}
        >
          {tenant.brandName.charAt(0)}
        </div>
      </div>

      {/* Brand Name */}
      <div
        style={{
          fontSize: '18px',
          fontWeight: '600',
          color: isActive ? tenant.primaryColor : '#1e293b',
          textAlign: 'center',
          transition: 'color 0.2s ease',
        }}
      >
        {tenant.brandName}
      </div>

      {/* Subtle indicator */}
      <div
        style={{
          marginTop: '8px',
          fontSize: '12px',
          color: '#94a3b8',
          opacity: isActive ? 1 : 0.7,
          transition: 'opacity 0.2s ease',
        }}
      >
        Click to sign in
      </div>
    </div>
  );
};
