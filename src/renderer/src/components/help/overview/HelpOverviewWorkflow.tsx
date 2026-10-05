import React from 'react';
import { ArrowRight, Workflow } from 'lucide-react';
import { HELP_OVERVIEW_STEPS } from '../../../utils/helpOverviewSteps';
import { HelpOverviewSectionHeader } from './HelpOverviewSectionHeader';

interface HelpOverviewWorkflowProps {
  debugPort: number;
  onNavigate?: (tab: string) => void;
}

export const HelpOverviewWorkflow: React.FC<HelpOverviewWorkflowProps> = ({ debugPort, onNavigate }) => (
  <div className="cockpit-panel rounded-2xl p-5 border border-border shadow-xl space-y-3.5">
    <HelpOverviewSectionHeader
      icon={Workflow}
      title="Fluxo de Trabalho Diário Recomendado"
      subtitle="5 passos essenciais para máxima produtividade"
    />

    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {HELP_OVERVIEW_STEPS.map((step) => (
        <div
          key={step.number}
          className={`p-4 rounded-xl bg-card/60 border ${step.cardClass} transition-all duration-200 flex flex-col justify-between space-y-3 group shadow-sm hover:shadow-md`}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`w-7 h-7 rounded-lg ${step.numberClass} flex items-center justify-center font-bold text-xs`}>
                {step.number}
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${step.badgeClass} font-semibold`}>
                {step.badge}
              </span>
            </div>
            <h4 className={`text-xs font-bold text-foreground ${step.titleHoverClass} transition-colors`}>
              {step.title}
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {step.description}
              {step.inlineCode && <code className="font-mono text-primary">{step.inlineCode}</code>}
              {step.descriptionSuffix}
            </p>
            <div className="flex flex-wrap gap-1 pt-1 font-mono text-[9px] text-muted-foreground">
              {step.chips(debugPort).map((chip) => (
                <span key={chip} className="px-1.5 py-0.5 rounded bg-muted/70">{chip}</span>
              ))}
            </div>
          </div>

          {onNavigate && (
            <button
              onClick={() => onNavigate(step.navTarget)}
              className={`pt-2 text-[11px] ${step.linkClass} font-bold flex items-center gap-1 hover:underline cursor-pointer`}
            >
              <span>{step.linkLabel}</span> <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  </div>
);
