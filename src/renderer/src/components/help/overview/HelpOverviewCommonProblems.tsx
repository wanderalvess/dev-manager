import React from 'react';
import { LifeBuoy } from 'lucide-react';
import type { FaqItem } from '../helpData';
import { HELP_COMMON_PROBLEM_IDS } from '../../../utils/helpOverviewRoles';
import { HelpOverviewSectionHeader } from './HelpOverviewSectionHeader';

interface HelpOverviewCommonProblemsProps {
  faqList: FaqItem[];
  onOpenFaq: (id: string) => void;
  onSeeAll: () => void;
}

export const HelpOverviewCommonProblems: React.FC<HelpOverviewCommonProblemsProps> = ({ faqList, onOpenFaq, onSeeAll }) => {
  const common = HELP_COMMON_PROBLEM_IDS.map((id) => faqList.find((f) => f.id === id)).filter(
    (f): f is FaqItem => Boolean(f)
  );

  return (
    <div className="cockpit-panel rounded-[14px] p-5 border border-border shadow-xs space-y-3.5">
      <HelpOverviewSectionHeader
        icon={LifeBuoy}
        title="Problemas mais comuns"
        subtitle={`${faqList.length} respostas em Resolver problemas`}
      />

      <div className="rounded-xl border border-border/80 overflow-hidden divide-y divide-border/60">
        {common.map((faq) => (
          <button
            key={faq.id}
            type="button"
            onClick={() => onOpenFaq(faq.id)}
            className="w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left bg-card/60 hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <span className="min-w-0 text-xs font-semibold text-foreground">{faq.question}</span>
            <span className="text-2xs font-medium px-2 py-0.5 rounded-full bg-accent text-accent-foreground whitespace-nowrap shrink-0">
              {faq.category}
            </span>
          </button>
        ))}
      </div>

      <button type="button" onClick={onSeeAll} className="text-xs font-semibold text-primary hover:underline cursor-pointer">
        Ver todos os problemas
      </button>
    </div>
  );
};
