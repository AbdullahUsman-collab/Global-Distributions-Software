import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TenantPublicConfig } from '../../domain/types/tenant';
import { services } from '../services';
import { BrandCard } from '../components/BrandCard';

export const BrandSelection: React.FC = () => {
  const [tenants, setTenants] = useState<TenantPublicConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const data = await services.tenantRepository.getPublicTenants();
        setTenants(data);
      } catch (err) {
        setError('Failed to load brands. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchTenants();
  }, []);

  const handleBrandSelect = (tenant: TenantPublicConfig) => navigate(`/login/${tenant.slug}`);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-200">
        <div className="text-center mb-12">
          <h1 className="text-2xl md:text-4xl font-bold text-slate-800 mb-2">Select Your Brand</h1>
          <p className="text-base md:text-lg text-slate-500">Choose your organization to sign in</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-2xl w-full">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton w-full aspect-square rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-200">
        <div className="text-center p-8 md:p-12 bg-white rounded-2xl shadow-lg max-w-md w-full">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl md:text-2xl font-semibold text-slate-800 mb-2">Something went wrong</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-3 bg-blue-500 text-white rounded-lg text-base font-medium hover:bg-blue-600 min-h-[44px]">Try Again</button>
        </div>
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-200">
        <div className="text-center p-8 md:p-12 bg-white rounded-2xl shadow-lg max-w-md w-full">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl md:text-2xl font-semibold text-slate-800 mb-2">No Brands Available</h2>
          <p className="text-slate-500">There are no brands configured yet. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-200">
      <div className="fade-in text-center mb-8 md:mb-12">
        <h1 className="text-2xl md:text-4xl font-bold text-slate-800 mb-2">Select Your Brand</h1>
        <p className="text-base md:text-lg text-slate-500">Choose your organization to sign in</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-2xl w-full">
        {tenants.map((tenant, index) => (
          <div key={tenant.id} className="scale-in" style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'both' }}>
            <BrandCard tenant={tenant} onClick={handleBrandSelect} />
          </div>
        ))}
      </div>
    </div>
  );
};
