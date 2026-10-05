import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface HelpOverviewSectionHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

export const HelpOverviewSectionHeader: React.FC<HelpOverviewSectionHeaderProps> = ({
  icon: Icon,
  title,
  subtitle
}) => (
  <div className="flex items-center justify-between pb-2 border-b border-border flex-wrap gap-2">
    <div className="flex items-center space-x-2">
      <Icon className="w-4 h-4 text-primary" />
      <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-foreground">
        {title}
      </h3>
    </div>
    <span className="text-[11px] text-muted-foreground font-mono">
      {subtitle}
    </span>
  </div>
);
