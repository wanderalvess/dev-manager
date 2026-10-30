import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { reportFileName } from '../../../../../shared/scenarioExports';
import { SCENARIO_RUN_KIND_LABELS, formatRunDuration, recordMarkdown, type ScenarioRunRecord } from '../../../../../shared/scenarioHistoryTypes';
import { ApiScenarioResultView } from '../apiScenarios/ApiScenarioResultView';
import { AuthLockoutActivityLog } from '../lockout/AuthLockoutActivityLog';
import { AuthLockoutChecksList } from '../lockout/AuthLockoutChecksList';
import { CopyButton, DownloadMdButton } from './CopyButton';

interface ScenarioRunDetailProps {
  record: ScenarioRunRecord;
  onBack: () => void;
}

/** Uma execução do histórico, só leitura: as mesmas telas do resultado, com os mesmos botões de copiar. */
export const ScenarioRunDetail: React.FC<ScenarioRunDetailProps> = ({ record, onBack }) => {
  const markdown = recordMarkdown(record);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="h-8 px-2 rounded-[8px] text-xs text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar
          </button>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{record.name}</p>
            <p className="text-2xs text-muted-foreground">
              {SCENARIO_RUN_KIND_LABELS[record.kind]} · {new Date(record.startedAt).toLocaleString()} · {formatRunDuration(record.durationMs)}
            </p>
          </div>
        </div>
        {/* A Validação de API já traz os botões no próprio resultado */}
        {record.lockout && (
          <div className="flex items-center gap-2">
            <DownloadMdButton fileName={reportFileName(record.name, record.startedAt)} getText={() => markdown} disabled={!markdown} />
            <CopyButton label="Copiar relatório (Jira)" done="Relatório copiado (Markdown para o Jira)." getText={() => markdown} disabled={!markdown} />
          </div>
        )}
      </div>
      {record.lockout && (
        <>
          {record.lockout.error && <p className="text-xs text-danger">{record.lockout.error}</p>}
          <AuthLockoutChecksList checks={record.lockout.checks} running={false} />
          <AuthLockoutActivityLog lines={record.lockout.log} requestsCount={record.lockout.attempts.length} />
        </>
      )}
      {record.api && (
        <>
          <ApiScenarioResultView result={record.api} />
          <AuthLockoutActivityLog lines={record.api.log} />
        </>
      )}
    </div>
  );
};
