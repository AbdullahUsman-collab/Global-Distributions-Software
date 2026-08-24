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

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(tenant)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(tenant); } }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      aria-label={`Select ${tenant.brandName}`}
      className="w-full aspect-square bg-white rounded-2xl flex flex-col items-center justify-center p-6 cursor-pointer transition-all duration-200"
      style={{
        border: `2px solid ${isActive ? tenant.primaryColor : '#e2e8f0'}`,
        boxShadow: isActive ? `0 20px 40px ${tenant.primaryColor}33` : '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        transform: isActive ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 transition-transform" style={{ backgroundColor: `${tenant.primaryColor}10`, transform: isActive ? 'scale(1.05)' : 'scale(1)' }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-bold" style={{ backgroundColor: tenant.primaryColor }}>
          {tenant.brandName.charAt(0)}
        </div>
      </div>
      <div className="text-lg font-semibold text-center transition-colors" style={{ color: isActive ? tenant.primaryColor : '#1e293b' }}>
        {tenant.brandName}
      </div>
      <div className="mt-2 text-xs text-slate-400 transition-opacity" style={{ opacity: isActive ? 1 : 0.7 }}>
        Click to sign in
      </div>
    </div>
  );
};
