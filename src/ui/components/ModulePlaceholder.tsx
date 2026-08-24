import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ModulePlaceholderProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  features: string[];
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({ title, description, icon, iconBg, iconColor, features }) => {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <button onClick={() => navigate('/dashboard')} className="inline-block mb-6 text-sm text-slate-500 hover:text-slate-700 min-h-[44px]">← Back to Dashboard</button>

      <div className="flex items-center gap-4 md:gap-5 mb-6">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: iconBg, color: iconColor }}>{icon}</div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-1">{title}</h1>
          <p className="text-sm md:text-base text-slate-500">{description}</p>
        </div>
      </div>

      <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg mb-6">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-xs md:text-sm font-medium text-green-700">Module Foundation</span>
      </div>

      <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 mb-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Planned Functionality</h2>
        <ul className="flex flex-col gap-2.5">
          {features.map((f, i) => (
            <li key={i} className="text-sm text-slate-600 pl-5 relative before:content-['•'] before:absolute before:left-0 before:text-slate-400">{f}</li>
          ))}
        </ul>
      </div>

      <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Implementation Status</h2>
        <p className="text-sm text-slate-500 leading-relaxed">This module is a structural placeholder. Business logic, data models, and transaction processing will be implemented in later steps according to the reverse-engineered specifications.</p>
      </div>
    </div>
  );
};
