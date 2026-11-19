import React from 'react';
import { ExternalLink, RotateCw } from 'lucide-react';
import type { JiraTodayIssue, JiraTodayReport } from '../../../../../shared/jiraToday';
import { formatHours, relativeDay, sprintDaysLeft, sprintLeftLabel } from './startHomeUtils';
import { START_CARD, START_EYEBROW, START_LINK, START_ROW, openExternal } from './startCardStyles';

const STATUS_PILL = 'shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none';

/** Onde a pessoa parou: a issue do último lançamento de horas (ou a primeira em andamento). */
export const StartContinueCard: React.FC<{
  jira: JiraTodayReport;
  className?: string;
}> = ({ jira, className = '' }) => {
  const last = jira.lastWorked;
  if (!last) {
    return (
      <article aria-label="Continuar de onde parou" className={`${START_CARD} ${className}`}>
        <span className={START_EYEBROW}>Continuar de onde parou</span>
        <p className="m-0 text-xs sm:text-sm text-muted-foreground">Nenhuma issue em andamento nem horas lançadas nesta semana.</p>
      </article>
    );
  }
  const { issue } = last;
  // O número da issue em marca d'água, grande e vazado, ocupa o canto que sobra quando o cartão estica
  const issueNumber = issue.key.split('-').pop() ?? '';
  return (
    <article
      aria-label="Continuar de onde parou"
      className={`${START_CARD} ${className} border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-card`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-3 -bottom-8 font-mono text-[9rem] 2xl:text-[11rem] font-black leading-none tracking-tighter text-transparent [-webkit-text-stroke:1.5px_hsl(var(--primary)/0.16)]"
      >
        {issueNumber}
      </span>
      <div className="relative flex items-center justify-between gap-2">
        <span className={START_EYEBROW}>Continuar de onde parou</span>
        {issue.status && <span className={`${STATUS_PILL} bg-primary/15 text-primary`}>{issue.status}</span>}
      </div>
      <div className="relative flex flex-col gap-1.5 min-w-0">
        <span className="font-mono text-xs font-bold text-primary">{issue.key}</span>
        <p className="m-0 text-lg sm:text-xl xl:text-2xl 2xl:text-3xl font-extrabold tracking-tight leading-snug line-clamp-3">
          {issue.summary}
        </p>
      </div>
      <div className="relative mt-auto flex flex-wrap items-end justify-between gap-3">
        {last.day && last.seconds > 0 ? (
          <div>
            <p className="m-0 text-2xs sm:text-xs text-muted-foreground">{relativeDay(last.day, new Date())} você lançou</p>
            <p className="m-0 text-2xl sm:text-3xl font-extrabold tracking-tight leading-none">{formatHours(last.seconds)}</p>
          </div>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => openExternal(issue.url)}
          className="h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm shadow-primary/30 transition-all hover:-translate-y-0.5"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Abrir no Jira
        </button>
      </div>
    </article>
  );
};

const IssueRow: React.FC<{
  issue: JiraTodayIssue;
  tag: string;
  tone: 'info' | 'warning';
}> = ({ issue, tag, tone }) => (
  <li>
    <button type="button" onClick={() => openExternal(issue.url)} className={`${START_ROW} w-full text-left cursor-pointer`}>
      <span className="font-mono text-xs font-bold text-muted-foreground shrink-0">{issue.key}</span>
      <span className="flex-1 min-w-0 truncate text-xs font-medium">{issue.summary}</span>
      <span className={`${STATUS_PILL} ${tone === 'warning' ? 'bg-warning/15 text-warning' : 'bg-info/15 text-info'}`}>{tag}</span>
    </button>
  </li>
);

/** Sprint, issues em andamento e prazos de hoje. */
export const StartJiraCard: React.FC<{
  jira: JiraTodayReport;
  className?: string;
}> = ({ jira, className = '' }) => {
  const sprint = jira.sprint;
  const left = sprintLeftLabel(sprintDaysLeft(sprint?.endDate, new Date()));
  const dueKeys = new Set(jira.dueSoon.map((i) => i.key));
  const allRows = [
    ...jira.dueSoon.map((issue) => ({
      issue,
      tag: 'prazo hoje',
      tone: 'warning' as const
    })),
    ...jira.inProgress.filter((i) => !dueKeys.has(i.key)).map((issue) => ({ issue, tag: 'andamento', tone: 'info' as const }))
  ];
  const maxRows = sprint ? 4 : 5;
  const rows = allRows.slice(0, maxRows);
  const remaining = allRows.length - maxRows;
  const percent = sprint && sprint.total > 0 ? Math.round((sprint.done / sprint.total) * 100) : 0;

  return (
    <article aria-label="Jira hoje" className={`${START_CARD} ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={START_EYEBROW}>Jira · hoje</span>
      </div>
      {sprint && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-xs sm:text-sm font-bold truncate">{sprint.name}</p>
              <p className="m-0 font-mono text-2xs text-muted-foreground">
                {sprint.done} de {sprint.total} concluídas
                {left ? ` · ${left}` : ''}
              </p>
            </div>
            <span className="shrink-0 text-2xl font-extrabold tracking-tight leading-none tabular-nums">
              {percent}
              <span className="text-sm text-muted-foreground">%</span>
            </span>
          </div>
          <div
            className="h-2 rounded-full bg-border overflow-hidden"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso da sprint"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-[width] duration-700"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}
      {rows.length === 0 ? (
        <p className="m-0 text-xs sm:text-sm text-muted-foreground">Nada em andamento nem com prazo para hoje.</p>
      ) : (
        <ul className="m-0 p-0 list-none flex flex-col gap-1 min-w-0">
          {rows.map((r) => (
            <IssueRow key={r.issue.key} {...r} />
          ))}
        </ul>
      )}
      <p className="m-0 mt-auto pt-1 font-mono text-2xs text-muted-foreground">
        <strong className="text-foreground">{jira.inProgress.length}</strong> em andamento ·{' '}
        <strong className={jira.dueSoon.length > 0 ? 'text-warning' : 'text-foreground'}>{jira.dueSoon.length}</strong> com prazo hoje
        {remaining > 0 ? ` · +${remaining} fora da lista` : ''}
      </p>
    </article>
  );
};

/** Jira ainda carregando, ou cadastrado mas respondendo com erro (sem fonte Jira a tela mostra outros cartões). */
export const StartJiraNotice: React.FC<{
  jira: JiraTodayReport | null;
  onRetry: () => void;
  className?: string;
}> = ({ jira, onRetry, className = '' }) => (
  <article aria-label="Jira" className={`${START_CARD} ${className}`}>
    <span className={START_EYEBROW}>Jira</span>
    {jira === null ? (
      <p className="m-0 flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
        <RotateCw className="w-4 h-4 animate-spin" /> Lendo suas issues...
      </p>
    ) : (
      <>
        <p className="m-0 text-xs sm:text-sm text-muted-foreground">{jira.error}</p>
        <button type="button" onClick={onRetry} className={START_LINK}>
          <RotateCw className="w-3.5 h-3.5" /> Tentar de novo
        </button>
      </>
    )}
  </article>
);
