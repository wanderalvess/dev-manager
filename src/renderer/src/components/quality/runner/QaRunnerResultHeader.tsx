import React from 'react';
import { CheckCircle2, XCircle, Copy, Check, Table } from 'lucide-react';
import type { QaExecutionResult } from '../../../../../shared/types';

interface QaRunnerResultHeaderProps {
  result: QaExecutionResult;
  issueKey: string;
  onChangeIssueKey: (value: string) => void;
  copiedKey: string | null;
  onCopyMarkdown: () => void;
  onCopyJira: () => void;
}

export const QaRunnerResultHeader: React.FC<QaRunnerResultHeaderProps> = ({
  result,
  issueKey,
  onChangeIssueKey,
  copiedKey,
  onCopyMarkdown,
  onCopyJira
}) => {
  return (
    <div className="px-4 py-2.5 border-b border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Badge de Status Técnico */}
        <span
          className={`px-2 py-0.5 rounded text-xs font-mono font-bold uppercase inline-flex items-center gap-1.5 border ${
            result.success
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
          }`}
        >
          {result.success ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>CONFORME (100%)</span>
            </>
          ) : (
            <>
              <XCircle className="w-3.5 h-3.5" />
              <span>DIVERGÊNCIA DETECTADA</span>
            </>
          )}
        </span>

        {/* Telemetria com tabular-nums */}
        <div className="flex items-center gap-2.5 text-xs text-muted-foreground font-mono">
          <span>
            Total: <b className="text-foreground tabular-nums">{result.totalAssertions}</b>
          </span>
          <span className="text-border">|</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
            Pass: <span className="tabular-nums">{result.passedAssertions}</span>
          </span>
          <span className="text-border">|</span>
          <span className="text-rose-600 dark:text-rose-400 font-semibold">
            Fail: <span className="tabular-nums">{result.failedAssertions}</span>
          </span>
          {result.warningAssertions > 0 && (
            <>
              <span className="text-border">|</span>
              <span className="text-amber-500 font-semibold">
                Warn: <span className="tabular-nums">{result.warningAssertions}</span>
              </span>
            </>
          )}
          <span className="text-border">|</span>
          <span className="text-muted-foreground tabular-nums">{result.durationMs}ms</span>
        </div>
      </div>

      {/* Ações de Evidência para Jira */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center bg-background border border-border rounded-md px-2 py-1 text-xs">
          <span className="text-muted-foreground mr-1.5 font-mono text-[11px]">Issue:</span>
          <input
            type="text"
            value={issueKey}
            onChange={(e) => onChangeIssueKey(e.target.value)}
            placeholder="DDWMISSI-T..."
            className="bg-transparent border-none text-foreground font-mono font-bold text-xs focus:outline-none w-28 uppercase"
            title="Chave da issue no Jira (ex: DDWMISSI-T966)"
          />
        </div>

        <button
          type="button"
          onClick={onCopyMarkdown}
          className="px-2.5 py-1 rounded-md bg-background hover:bg-muted text-foreground border border-border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Copiar relatório completo com queries e tabelas em Markdown"
        >
          {copiedKey === 'markdown-report' ? (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <span>Copiar Markdown</span>
        </button>

        <button
          type="button"
          onClick={onCopyJira}
          className="px-2.5 py-1 rounded-md bg-background hover:bg-muted text-foreground border border-border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Copiar tabela formatada em markup clássico do Jira"
        >
          {copiedKey === 'jira-markup' ? (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <Table className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <span>Jira Table</span>
        </button>
      </div>
    </div>
  );
};
