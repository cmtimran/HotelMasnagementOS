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
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs ${className}`}>
      <div className="flex items-center gap-3.5 min-w-0">
        {icon && (
          <div className="size-11 sm:size-12 rounded-2xl bg-primary-subtle text-primary flex items-center justify-center shrink-0 shadow-2xs">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate">
              {title}
            </h1>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {subtitle && (
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
              {subtitle}
            </div>
          )}
          {children}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 flex-wrap shrink-0 self-start sm:self-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
