/**
 * Brand Card Component
 * Displays a single brand/tenant as a clickable card for selection.
 *
 * Step 91A — full-card brand identity: the card carries a subtle brand-color
 * gradient wash derived from tenant data, so the whole surface belongs to the
 * brand (light AND dark mode).
 *
 * Step 91B — prominent foreground logo: the logo is no longer a faint
 * background watermark. It sits in the content flow ABOVE the brand name as a
 * large, centered, full-opacity presentation tile (the existing studio
 * `logoBox` checkerboard pattern) so white, dark, transparent and colorful
 * logos all stay clearly visible. Brands without a logo keep the Step-91
 * `BrandLogo` letter-chip fallback, enlarged to the same prominent scale.
 *
 * Interaction, keyboard activation, aria semantics and hover/focus behavior
 * are unchanged. Colors derive per-brand from tenant data (no hardcoding).
 */

import React from 'react';
import { TenantPublicConfig } from '../../domain/types/tenant';
import { BrandLogo } from './BrandLogo';

interface BrandCardProps {
  tenant: TenantPublicConfig;
  onClick: (tenant: TenantPublicConfig) => void;
}

/** Only trust well-formed hex colors for alpha-suffix gradients. */
function safeBrandColor(raw: string | undefined): string {
  const c = (raw || '').trim();
  return /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(c) ? c : '';
}

export const BrandCard: React.FC<BrandCardProps> = ({ tenant, onClick }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  /** Foreground logo hides itself gracefully if the logo URL fails to load. */
  const [logoFailed, setLogoFailed] = React.useState(false);

  const isActive = isHovered || isFocused;
  const brand = safeBrandColor(tenant.primaryColor);
  const hasLogo = !!(tenant.logoUrl || '').trim();
  const showLogoImage = hasLogo && !logoFailed;

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
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        minHeight: '250px',
        backgroundColor: 'var(--surface)',
        background: brand
          ? `linear-gradient(160deg, ${brand}24 0%, ${brand}0D 48%, var(--surface) 100%)`
          : undefined,
        borderRadius: '16px',
        border: `2px solid ${isActive ? (brand || 'var(--accent)') : 'var(--border)'}`,
        boxShadow: isActive
          ? `0 20px 40px ${brand ? brand + '33' : 'rgb(0 0 0 / 0.18)'}`
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
      {/* Prominent foreground logo — full opacity, centered, never distorted.
          The premium presentation tile guarantees contrast for every logo
          polarity (white / dark / transparent / colorful) in both themes,
          reusing the existing studio logoBox checkerboard pattern. */}
      <div
        className="brand-card-logo-tile"
        style={{
          position: 'relative',
          zIndex: 2,
          width: 'min(72%, 240px)',
          height: '108px',
          marginBottom: '16px',
          backgroundColor: 'var(--surface)',
          backgroundImage:
            'linear-gradient(45deg, var(--border) 25%, transparent 25%, transparent 75%, var(--border) 75%), linear-gradient(45deg, var(--border) 25%, transparent 25%, transparent 75%, var(--border) 75%)',
          backgroundSize: '16px 16px',
          backgroundPosition: '0 0, 8px 8px',
          border: `1px solid ${isActive ? (brand || 'var(--accent)') : 'var(--border)'}`,
          borderRadius: '14px',
          boxShadow: '0 6px 16px rgb(0 0 0 / 0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          transition: 'border-color 0.2s ease',
        }}
      >
        {showLogoImage ? (
          <img
            src={tenant.logoUrl}
            alt=""
            onError={() => setLogoFailed(true)}
            style={{
              maxWidth: 'calc(100% - 16px)',
              maxHeight: 'calc(100% - 16px)',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain' as const,
              display: 'block',
            }}
          />
        ) : (
          /* Letter-chip fallback keeps the Step-91 identity for logo-less
             brands (or broken URLs) at the same prominent scale. */
          <BrandLogo
            logoUrl={tenant.logoUrl}
            brandName={tenant.brandName}
            color={brand || 'var(--accent)'}
            size={64}
            radius={16}
            fontSize={28}
          />
        )}
      </div>

      {/* Foreground content */}
      <div
        className="brand-title"
        style={{
          position: 'relative',
          zIndex: 2,
          fontSize: '18px',
          fontWeight: '600',
          color: 'var(--text-primary)',
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
          position: 'relative',
          zIndex: 2,
          marginTop: '8px',
          fontSize: '12px',
          color: 'var(--text-muted)',
          opacity: isActive ? 1 : 0.85,
          transition: 'opacity 0.2s ease',
        }}
      >
        Click to sign in
      </div>
    </div>
  );
};
