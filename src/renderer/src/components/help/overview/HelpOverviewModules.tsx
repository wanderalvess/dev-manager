import React from 'react';
import { Boxes } from 'lucide-react';
import { HELP_OVERVIEW_MODULES } from '../../../utils/helpOverviewModules';
import { HelpOverviewSectionHeader } from './HelpOverviewSectionHeader';

interface HelpOverviewModulesProps {
  onNavigate?: (tab: string) => void;
}

export const HelpOverviewModules: React.FC<HelpOverviewModulesProps> = ({ onNavigate }) => (
  <div className="cockpit-panel rounded-xl p-5 border border-border shadow-xl space-y-3.5">
    <HelpOverviewSectionHeader
      icon={Boxes}
      title="Ecossistema & Módulos do Sistema"
      subtitle="Atalhos globais de acesso direto (Alt + 0..9)"
    />

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 gap-3">
      {HELP_OVERVIEW_MODULES.map((mod) => {
        const Icon = mod.icon;
        return (
          <div
            key={mod.navTarget}
            onClick={() => onNavigate?.(mod.navTarget)}
            className={`p-3 rounded-xl bg-card/60 border border-border ${mod.hoverBorderClass} transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-2xs`}
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Icon className={`w-4 h-4 ${mod.iconClass} shrink-0`} />
                <span className={`text-xs font-bold text-foreground ${mod.titleHoverClass} transition-colors truncate`}>
                  {mod.title}
                </span>
              </div>
              <p className="text-2xs text-muted-foreground line-clamp-2">
                {mod.description}
              </p>
            </div>
            {mod.shortcut && (
              <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-2xs text-foreground font-bold shrink-0">
                {mod.shortcut}
              </kbd>
            )}
          </div>
        );
      })}
    </div>
  </div>
);
