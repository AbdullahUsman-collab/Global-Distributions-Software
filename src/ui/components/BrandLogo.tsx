/**
 * BrandLogo — Step 91
 *
 * Renders a brand's logo when available, with a letter-chip fallback that
 * preserves the exact pre-Step-91 appearance otherwise. Never shows a broken
 * image: load errors and empty URLs fall back to the letter chip.
 *
 * Presentation only. Consumes the existing tenant.logoUrl field.
 */

import React, { useEffect, useState } from 'react';

interface BrandLogoProps {
  logoUrl?: string | null;
  brandName: string;
  /** Chip background (brand color) for the letter fallback and behind transparent logos. */
  color: string;
  /** Square box size in px. The logo itself uses object-fit: contain inside. */
  size?: number;
  /** Border radius override (defaults scale with size). */
  radius?: number;
  /** Applied to the <img> only (letter chips keep bold white). */
  fontSize?: number;
}

/**
 * Shared logo <img> with graceful fallback. Used by Header brand button,
 * brand switcher, BrandCard and the Brands table so every brand surface
 * behaves identically.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  logoUrl,
  brandName,
  color,
  size = 32,
  radius,
  fontSize,
}) => {
  const [failed, setFailed] = useState(false);
  const url = (logoUrl || '').trim();

  // Reset error state when the source changes (brand switch, re-edit).
  useEffect(() => { setFailed(false); }, [url]);

  const effectiveRadius = radius ?? Math.max(6, Math.round(size * 0.25));
  const showImage = !!url && !failed;
  const hasAlpha = /\.(png|webp|gif|svg|avif)(\?|$)/i.test(url);

  if (!showImage) {
    // Pre-Step-91 fallback: letter chip on brand color.
    return (
      <div
        aria-hidden="true"
        style={{
          width: size,
          height: size,
          borderRadius: effectiveRadius,
          backgroundColor: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontSize: fontSize ?? Math.max(11, Math.round(size * 0.44)),
          fontWeight: 700,
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {brandName?.charAt(0) || '?'}
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: effectiveRadius,
        backgroundColor: hasAlpha ? color : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      <img
        src={url}
        alt=""
        onError={() => setFailed(true)}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain' as const,
          display: 'block',
        }}
      />
    </div>
  );
};
