import React from 'react';
import {
  ArrowRight,
  BellRing,
  Bot,
  BookOpen,
  Cloud,
  FlaskConical,
  GitBranch,
  GitPullRequest,
  Radar,
  Sparkles,
  Ticket,
  type LucideIcon
} from 'lucide-react';
import type { IntegrationItem, IntegrationStatus } from '../../utils/integrationsStatus';

const ICONS: Record<string, LucideIcon> = {
  mcp: Bot,
  llm: Sparkles,
  confluence: BookOpen,
  jira: Ticket,
  azure: Cloud,
  'git-hosts': GitBranch,
  ccw: GitPullRequest,
  'quality-sources': FlaskConical,
  otlp: Radar,
  webhooks: BellRing
};

const STATUS_CLASS: Record<IntegrationStatus, string> = {
  active: 'bg-success/10 text-success',
  detected: 'bg-info/10 text-info',
  unconfigured: 'bg-muted text-muted-foreground',
  none: 'bg-muted text-muted-foreground'
};

interface IntegrationCardProps {
  item: IntegrationItem;
  onOpen: (item: IntegrationItem) => void;
}

/** Cartão de uma integração: o que ela faz, em que estado está e o atalho para configurá-la. */
export const IntegrationCard: React.FC<IntegrationCardProps> = ({ item, onOpen }) => {
  const Icon = ICONS[item.id] ?? Sparkles;
  return (
    <div
      data-testid={`integration-${item.id}`}
      className="bg-card border border-border rounded-[14px] shadow-xs p-4 flex flex-col gap-3"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-[11px] bg-accent text-accent-foreground flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-foreground leading-tight">{item.title}</h3>
          {item.statusLabel && (
            <span
              className={`inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-full text-[13px] font-medium ${STATUS_CLASS[item.status]}`}
            >
              {item.status !== 'unconfigured' && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
              {item.statusLabel}
            </span>
          )}
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed flex-1">{item.description}</p>
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="self-start inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline cursor-pointer"
      >
        {item.actionLabel}
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
