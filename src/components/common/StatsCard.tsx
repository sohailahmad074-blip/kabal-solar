import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  accentColor?: 'amber' | 'emerald' | 'blue' | 'purple' | 'rose' | 'cyan';
  onClick?: () => void;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  accentColor = 'amber',
  onClick,
}) => {
  const iconAccentStyles = {
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    rose: 'bg-rose-50 text-rose-600 border-rose-200',
    cyan: 'bg-cyan-50 text-cyan-600 border-cyan-200',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white p-4 border border-slate-200 rounded-lg shadow-sm transition-all duration-150 ${
        onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">
            {title}
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {value}
          </div>
          {subtitle && (
            <div className="text-xs text-slate-500 mt-1 font-normal truncate">
              {subtitle}
            </div>
          )}
        </div>

        {icon && (
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-sm ${iconAccentStyles[accentColor]}`}>
            {icon}
          </div>
        )}
      </div>

      {trend && (
        <div className={`text-xs font-medium mt-1.5 flex items-center gap-1 ${
          trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
        }`}>
          <span>{trend.isPositive ? '↑' : '↓'} {trend.value}</span>
          <span className="text-slate-400 font-normal">vs last mo</span>
        </div>
      )}
    </div>
  );
};
