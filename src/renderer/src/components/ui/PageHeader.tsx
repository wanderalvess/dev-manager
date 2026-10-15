import React from 'react';
import type { LucideIcon } from 'lucide-react';

// Escala tipográfica de títulos: página = text-lg (h1), seção = text-sm (h2/h3), subtítulo = text-xs.
export const PAGE_TITLE_CLASS = 'text-lg font-bold text-foreground tracking-tight';
export const SECTION_TITLE_CLASS = 'text-sm font-semibold text-foreground';

interface PageHeaderProps {
  title: React.ReactNode;
  icon?: LucideIcon;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, icon: Icon, description, actions, className = '' }) => (
  <div className={`flex items-center justify-between gap-3 border-b border-border pb-3 ${className}`}>
    <div className="flex items-center gap-2.5 min-w-0">
      {Icon && <Icon className="w-5 h-5 text-primary shrink-0" />}
      <div className="min-w-0">
        <h1 className={PAGE_TITLE_CLASS}>{title}</h1>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);
