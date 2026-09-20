/**
 * Brand Card Component
 * Displays a single brand/tenant as a clickable card for selection.
 *
 * Step 91A — full-card brand identity: the card carries a brand-color
 * gradient wash derived from tenant data, so the whole surface belongs to
 * the brand (light AND dark mode).
 *
 * Step 91B/91C — the logo IS the card content: a large, centered,
 * full-opacity logo rendered DIRECTLY on the brand surface — no tile, no
 * checkerboard, no frame, no avatar chip, no watermark. Transparent logo
 * areas stay transparent so the brand surface shows through. Brands
 * without a logo keep the Step-91 letter-chip fallback, scaled to match
 * the logo's visual weight.
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
  /** Logo layer hides itself gracefully if the logo URL fails to load. */
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
          ? `linear-gradient(160deg, ${brand}2E 0%, ${brand}14 48%, var(--surface) 100%)`
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
      {/* Large brand logo directly on the card surface — full opacity,
          centered, contain-fit, transparent areas stay transparent. No
          tile, no checkerboard, no frame, no background box. */}
      {showLogoImage ? (
        <img
          src={tenant.logoUrl}
          alt=""
          onError={() => setLogoFailed(true)}
          className="brand-card-logo"
          style={{
            position: 'relative',
            zIndex: 2,
            width: 'min(80%, 260px)',
            height: 'auto',
            maxHeight: '118px',
            objectFit: 'contain' as const,
            display: 'block',
            marginBottom: '14px',
          }}
        />
      ) : (
        /* Letter-chip fallback keeps the Step-91 identity for logo-less
           brands (or broken URLs), scaled to the logo's visual weight. */
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            marginBottom: '14px',
          }}
        >
          <BrandLogo
            logoUrl={tenant.logoUrl}
            brandName={tenant.brandName}
            color={brand || 'var(--accent)'}
            size={72}
            radius={18}
            fontSize={32}
          />
        </div>
      )}

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
