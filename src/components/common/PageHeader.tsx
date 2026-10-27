import React from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Standardized PageHeader component matching Thesis design language.
 * Ensures 100% uniform typography, spacing, icon pill, and button alignment.
 */
export default function PageHeader({
  title,
  subtitle,
  icon,
  badge,
  actions,
  children,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200/80 shadow-2xs px-3 py-1.5 flex items-center justify-between gap-2.5 flex-shrink-0 ${className}`}>
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-[#1e3a8a] text-white flex items-center justify-center shadow-xs shrink-0 [&>svg]:size-3.5 [&>svg]:stroke-[2.2]">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xs font-bold text-gray-900 tracking-tight leading-none truncate">
              {title}
            </h1>
            {badge && (
              typeof badge === 'string' ? (
                <span className="px-1.5 py-0.2 text-[8.5px] rounded bg-blue-50 text-blue-700 border border-blue-200 leading-none">
                  {badge}
                </span>
              ) : (
                <div className="shrink-0 text-[8.5px] leading-none">{badge}</div>
              )
            )}
          </div>
          {subtitle && (
            <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap leading-tight truncate">
              {subtitle}
            </div>
          )}
          {children}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
