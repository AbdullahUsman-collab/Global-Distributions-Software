/**
 * Brand Card Component
 * Displays a single brand/tenant as a clickable card for selection.
 *
 * Features:
 * - Responsive card design (square on desktop, compact on mobile)
 * - Brand logo and name display
 * - Hover/focus states with brand colors
 * - Keyboard accessible
 * - Smooth 60fps transitions
 */

import React from 'react';
import { TenantPublicConfig } from '../../domain/types/tenant';
import { BrandLogo } from './BrandLogo';

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
      className="brand-card-responsive"
      style={{
        width: '100%',
        backgroundColor: 'var(--surface)',
        borderRadius: '16px',
        border: `2px solid ${isActive ? tenant.primaryColor : 'var(--border)'}`,
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
        className="brand-logo"
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
        <BrandLogo
          logoUrl={tenant.logoUrl}
          brandName={tenant.brandName}
          color={tenant.primaryColor}
          size={48}
          radius={12}
          fontSize={20}
        />
      </div>

      {/* Brand Name */}
      <div
        className="brand-title"
        style={{
          fontSize: '18px',
          fontWeight: '600',
          color: isActive ? tenant.primaryColor : 'var(--text-primary)',
          textAlign: 'center',
          transition: 'color 0.2s ease',
        }}
      >
        {tenant.brandName}
      </div>

      {/* Subtle indicator */}
      <div
        className="brand-subtitle"
        style={{
          marginTop: '8px',
          fontSize: '12px',
          color: 'var(--text-muted)',
          opacity: isActive ? 1 : 0.7,
          transition: 'opacity 0.2s ease',
        }}
      >
        Click to sign in
      </div>
    </div>
  );
};
