import React from 'react';
import { ExternalLink, RotateCw } from 'lucide-react';
import type { JiraTodayIssue, JiraTodayReport } from '../../../../../shared/jiraToday';
import { formatHours, relativeDay, sprintDaysLeft, sprintLeftLabel } from './startHomeUtils';
import { START_CARD, START_EYEBROW, START_LINK, START_ROW, openExternal } from './startCardStyles';

const STATUS_PILL = 'shrink-0 px-2 py-0.5 rounded-full text-2xs font-bold';

/** Onde a pessoa parou: a issue do último lançamento de horas (ou a primeira em andamento). */
export const StartContinueCard: React.FC<{ jira: JiraTodayReport; className?: string }> = ({ jira, className = '' }) => {
  const last = jira.lastWorked;
  if (!last) {
    return (
      <article aria-label="Continuar de onde parou" className={`${START_CARD} ${className}`}>
        <span className={START_EYEBROW}>Continuar de onde parou</span>
        <p className="m-0 text-sm text-muted-foreground">Nenhuma issue em andamento nem horas lançadas nesta semana.</p>
      </article>
    );
  }
  const { issue } = last;
  return (
    <article
      aria-label="Continuar de onde parou"
      className={`${START_CARD} ${className} border-primary/30 bg-gradient-to-b from-primary/10 to-card`}
    >
      <span className={START_EYEBROW}>Continuar de onde parou</span>
      <div className="flex flex-col gap-1.5 min-w-0">
        <span className="font-mono text-xs font-bold text-muted-foreground">{issue.key}</span>
        <p className="m-0 text-xl font-extrabold tracking-tight leading-snug line-clamp-2">{issue.summary}</p>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {issue.status && <span className={`${STATUS_PILL} bg-primary/15 text-primary`}>{issue.status}</span>}
          {last.day && last.seconds > 0 && (
            <span>
              {relativeDay(last.day, new Date())} você lançou <strong className="text-foreground">{formatHours(last.seconds)}</strong>
            </span>
          )}
        </div>
      </div>
      <div className="mt-auto flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => openExternal(issue.url)}
          className="min-h-11 px-4 rounded-xl border border-border bg-card text-sm font-semibold flex items-center gap-2 cursor-pointer hover:border-primary transition-colors"
        >
          <ExternalLink className="w-4 h-4 text-primary" /> Abrir no Jira
        </button>
      </div>
    </article>
  );
};

const IssueRow: React.FC<{ issue: JiraTodayIssue; tag: string; tone: 'info' | 'warning' }> = ({ issue, tag, tone }) => (
  <li>
    <button type="button" onClick={() => openExternal(issue.url)} className={`${START_ROW} w-full text-left cursor-pointer hover:bg-muted`}>
      <span className="font-mono text-xs font-bold text-muted-foreground shrink-0">{issue.key}</span>
      <span className="flex-1 min-w-0 truncate text-sm">{issue.summary}</span>
      <span className={`${STATUS_PILL} ${tone === 'warning' ? 'bg-warning/15 text-warning' : 'bg-info/15 text-info'}`}>{tag}</span>
    </button>
  </li>
);

/** Sprint, issues em andamento e prazos de hoje. */
export const StartJiraCard: React.FC<{ jira: JiraTodayReport; className?: string }> = ({ jira, className = '' }) => {
  const sprint = jira.sprint;
  const left = sprintLeftLabel(sprintDaysLeft(sprint?.endDate, new Date()));
  const dueKeys = new Set(jira.dueSoon.map((i) => i.key));
  const rows = [
    ...jira.dueSoon.map((issue) => ({ issue, tag: 'prazo hoje', tone: 'warning' as const })),
    ...jira.inProgress.filter((i) => !dueKeys.has(i.key)).map((issue) => ({ issue, tag: 'andamento', tone: 'info' as const }))
  ].slice(0, 4);
  const percent = sprint && sprint.total > 0 ? Math.round((sprint.done / sprint.total) * 100) : 0;

  return (
    <article aria-label="Jira hoje" className={`${START_CARD} ${className}`}>
      <span className={START_EYEBROW}>Jira · hoje</span>
      {sprint && (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between gap-2 text-xs">
            <span className="font-bold truncate">{sprint.name}</span>
            <span className="font-mono text-muted-foreground shrink-0">
              {sprint.done} de {sprint.total}
              {left ? ` · ${left}` : ''}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-border overflow-hidden" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da sprint">
            <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}
      {rows.length === 0 ? (
        <p className="m-0 text-sm text-muted-foreground">Nada em andamento nem com prazo para hoje.</p>
      ) : (
        <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
          {rows.map((r) => (
            <IssueRow key={r.issue.key} {...r} />
          ))}
        </ul>
      )}
    </article>
  );
};

/** Jira ainda carregando, ou cadastrado mas respondendo com erro (sem fonte Jira a tela mostra outros cartões). */
export const StartJiraNotice: React.FC<{ jira: JiraTodayReport | null; onRetry: () => void; className?: string }> = ({ jira, onRetry, className = '' }) => (
  <article aria-label="Jira" className={`${START_CARD} ${className}`}>
    <span className={START_EYEBROW}>Jira</span>
    {jira === null ? (
      <p className="m-0 flex items-center gap-2 text-sm text-muted-foreground">
        <RotateCw className="w-4 h-4 animate-spin" /> Lendo suas issues...
      </p>
    ) : (
      <>
        <p className="m-0 text-sm text-muted-foreground">{jira.error}</p>
        <button type="button" onClick={onRetry} className={START_LINK}>
          <RotateCw className="w-3.5 h-3.5" /> Tentar de novo
        </button>
      </>
    )}
  </article>
);
