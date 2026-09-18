/**
 * Brand Card Component
 * Displays a single brand/tenant as a clickable card for selection.
 *
 * Step 91A — full-card brand identity:
 * The ENTIRE card is the brand's visual surface — a subtle brand-color
 * gradient wash, a large non-distorting logo watermark (object-fit: contain),
 * and a contrast overlay that keeps the brand name and "Click to sign in"
 * fully readable in light AND dark mode. No small standalone logo box when a
 * logo exists; brands without a logo keep the Step-91 letter-chip fallback
 * plus a faint oversized letter watermark so every card still feels branded.
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
  /** Watermark hides itself gracefully if the logo URL fails to load. */
  const [watermarkFailed, setWatermarkFailed] = React.useState(false);

  const isActive = isHovered || isFocused;
  const brand = safeBrandColor(tenant.primaryColor);
  const hasLogo = !!(tenant.logoUrl || '').trim();
  const showWatermarkImage = hasLogo && !watermarkFailed;

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
        minHeight: '210px',
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
        justifyContent: 'flex-end',
        padding: '24px',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isActive ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      {/* Full-card brand watermark — large, contained, never distorted. */}
      <div
        aria-hidden="true"
        className="brand-card-watermark"
        style={{
          position: 'absolute',
          top: '7%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '62%',
          height: '56%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.14,
          pointerEvents: 'none',
        }}
      >
        {showWatermarkImage ? (
          <img
            src={tenant.logoUrl}
            alt=""
            onError={() => setWatermarkFailed(true)}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain' as const,
              display: 'block',
            }}
          />
        ) : (
          <span
            className="brand-card-watermark-letter"
            style={{
              fontSize: '96px',
              fontWeight: 800,
              lineHeight: 1,
              color: brand || 'var(--accent)',
              userSelect: 'none',
            }}
          >
            {tenant.brandName?.charAt(0) || '?'}
          </span>
        )}
      </div>

      {/* Contrast overlay: clean surface behind the text zone so the name and
          hint stay readable over the brand wash in light and dark mode. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, var(--surface) 0%, var(--surface) 38%, transparent 72%)',
          pointerEvents: 'none',
        }}
      />

      {/* Letter-chip fallback keeps the pre-Step-91 identity for logo-less brands. */}
      {!hasLogo && (
        <div
          className="brand-logo"
          style={{
            position: 'relative',
            zIndex: 2,
            marginBottom: '12px',
          }}
        >
          <BrandLogo
            logoUrl={tenant.logoUrl}
            brandName={tenant.brandName}
            color={brand || 'var(--accent)'}
            size={48}
            radius={12}
            fontSize={20}
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
