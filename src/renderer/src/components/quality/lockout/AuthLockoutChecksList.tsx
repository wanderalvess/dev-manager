import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Circle, Hand, Info, Loader2, MinusCircle, XCircle } from 'lucide-react';
import { authLockoutCheckDefinition } from '../../../../../shared/authLockoutCatalog';
import { AUTH_LOCKOUT_STATUS_LABELS } from '../../../../../shared/authLockoutReport';
import type { AuthLockoutCheckResult, AuthLockoutCheckStatus } from '../../../../../shared/authLockoutTypes';
import { evidenceToText } from '../../../../../shared/scenarioExports';
import { STATUS_TONE } from '../../../utils/authLockoutView';
import { CopyButton } from '../scenarios/CopyButton';
import { TONE_BADGE, TONE_TEXT } from '../../integrationtrace/toneClasses';

const STATUS_ICON: Record<AuthLockoutCheckStatus, React.ElementType> = {
  pending: Circle,
  running: Loader2,
  passed: CheckCircle2,
  failed: XCircle,
  warning: AlertTriangle,
  info: Info,
  manual: Hand,
  skipped: MinusCircle
};

interface AuthLockoutChecksListProps {
  checks: AuthLockoutCheckResult[];
  running: boolean;
}

/** As 12 linhas da tabela de regras, com o resultado observado e as evidências de cada uma. */
export const AuthLockoutChecksList: React.FC<AuthLockoutChecksListProps> = ({ checks, running }) => {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Só a próxima da fila gira: as demais continuam como pendentes
  const currentId = running ? checks.find((c) => c.status === 'pending')?.id : undefined;

  return (
    <ul className="divide-y divide-border border border-border rounded-xl bg-card">
      {checks.map((check) => {
        const def = authLockoutCheckDefinition(check.id);
        const tone = STATUS_TONE[check.status];
        const Icon = STATUS_ICON[check.id === currentId ? 'running' : check.status];
        const expanded = open.has(check.id);
        return (
          <li key={check.id} className="p-3">
            <button
              type="button"
              onClick={() => toggle(check.id)}
              className="w-full flex items-start gap-3 text-left"
              aria-expanded={expanded}
              disabled={check.evidence.length === 0 && !check.plan}
            >
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${TONE_TEXT[tone]} ${Icon === Loader2 ? 'animate-spin' : ''}`} />
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">{check.title}</span>
                  <span className={`px-2 rounded-full text-2xs font-medium ${TONE_BADGE[tone]}`}>{AUTH_LOCKOUT_STATUS_LABELS[check.status]}</span>
                  {check.durationMs !== undefined && (
                    <span className="text-2xs font-mono text-muted-foreground">{(check.durationMs / 1000).toFixed(1)}s</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-foreground/80">{def.attempt}.</span> {def.expectation}
                </p>
                {check.status !== 'pending' && check.status !== 'skipped' && <p className="text-xs text-foreground">{check.summary}</p>}
                {check.status === 'skipped' && check.summary !== 'Não selecionada.' && <p className="text-xs text-muted-foreground">{check.summary}</p>}
              </div>
              {(check.evidence.length > 0 || check.plan) &&
                (expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />)}
            </button>
            {expanded && (
              <div className="mt-2 ml-7 space-y-2">
                {check.plan && (
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-foreground">Como foi testado: </span>
                    {check.plan}
                  </div>
                )}
                {check.evidence.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-foreground">Evidências ({check.evidence.length})</span>
                      <CopyButton label="Copiar evidências" done="Evidências copiadas." getText={() => evidenceToText(check)} />
                    </div>
                    <ul className="space-y-1 text-2xs font-mono text-muted-foreground bg-muted/40 rounded-lg p-2 max-h-64 overflow-y-auto">
                      {check.evidence.map((line, i) => (
                        <li key={i} className="break-all">
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};
