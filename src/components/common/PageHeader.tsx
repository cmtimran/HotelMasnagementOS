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
    <div className={`flex flex-wrap items-center justify-between gap-3.5 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs ${className}`}>
      <div className="flex items-center gap-3.5 min-w-0 sm:min-w-[380px] flex-1">
        {icon && (
          <div className="size-11 rounded-2xl bg-primary-subtle text-primary border border-primary-border/60 flex items-center justify-center shrink-0 shadow-2xs">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-base sm:text-lg tracking-tight text-slate-900 leading-snug">
              {title}
            </h1>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {subtitle && (
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
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
