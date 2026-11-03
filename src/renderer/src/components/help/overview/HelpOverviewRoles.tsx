import React from 'react';
import { ArrowRight, Users } from 'lucide-react';
import { HELP_OVERVIEW_ROLES } from '../../../utils/helpOverviewRoles';
import { HelpOverviewSectionHeader } from './HelpOverviewSectionHeader';

interface HelpOverviewRolesProps {
  onNavigate?: (tab: string) => void;
}

export const HelpOverviewRoles: React.FC<HelpOverviewRolesProps> = ({ onNavigate }) => (
  <div className="cockpit-panel rounded-[14px] p-5 border border-border shadow-xs space-y-3.5">
    <HelpOverviewSectionHeader icon={Users} title="Comece pelo seu papel" subtitle="Onde cada pessoa costuma começar" />

    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {HELP_OVERVIEW_ROLES.map((role) => (
        <div key={role.name} className="p-4 rounded-xl bg-card/60 border border-border space-y-2.5">
          <div>
            <h4 className="text-sm font-bold text-foreground">{role.name}</h4>
            <span className="text-xs text-muted-foreground">{role.subtitle}</span>
          </div>
          <div className="flex flex-col">
            {role.links.map((link) => (
              <button
                key={link.label}
                type="button"
                disabled={!onNavigate}
                onClick={() => onNavigate?.(link.navTarget)}
                className="min-h-9 py-1.5 flex items-center justify-between gap-2 border-t border-border/60 text-left text-xs text-foreground hover:text-primary transition-colors cursor-pointer"
              >
                <span>{link.label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);
