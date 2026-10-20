import React from 'react';
import { CheckCircle2, CircleSlash, XCircle } from 'lucide-react';
import type { DelphiBuildResult, DelphiPipelineResult } from '../../../../shared/types';
import { showToast } from '../ToastHost';
import {
  diagnosticClipboardText,
  diagnosticLocation,
  formatDelphiDuration,
  pipelineStepLabel
} from '../../utils/delphiBuildView';

const SEVERITY_CLASS = {
  error: 'text-danger border-danger/30 bg-danger/5',
  warning: 'text-warning border-warning/30 bg-warning/5',
  hint: 'text-muted-foreground border-border bg-muted/30'
} as const;

const StepIcon: React.FC<{ status: 'success' | 'skipped' | 'failed' }> = ({ status }) => {
  if (status === 'success') return <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />;
  if (status === 'failed') return <XCircle className="w-3.5 h-3.5 text-danger shrink-0" />;
  return <CircleSlash className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
};

interface DelphiBuildResultPanelProps {
  build: DelphiBuildResult | null;
  pipeline: DelphiPipelineResult | null;
}

/** Resumo do build, etapas do pipeline e a lista de erros do compilador (clique copia "arquivo(linha): código"). */
export const DelphiBuildResultPanel: React.FC<DelphiBuildResultPanelProps> = ({ build, pipeline }) => {
  const copy = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => showToast('Erro copiado.'))
      .catch(() => showToast('Não foi possível copiar.', 'error'));
  };

  return (
    <div className="space-y-2.5">
      {pipeline && (
        <ol className="space-y-1">
          {pipeline.steps.map((step) => (
            <li key={step.id} className="flex items-start gap-2 text-xs">
              <StepIcon status={step.status} />
              <span className="font-semibold text-foreground w-32 shrink-0">{pipelineStepLabel(step)}</span>
              <span className="text-muted-foreground break-all">{step.detail}</span>
            </li>
          ))}
        </ol>
      )}

      {build && (
        <>
          <div
            className={`flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2 text-xs font-semibold ${
              build.success ? 'border-success/30 bg-success/10 text-success' : 'border-danger/30 bg-danger/10 text-danger'
            }`}
          >
            <span>{build.cancelled ? 'Build cancelado' : build.success ? 'Build concluído' : 'Build com erros'}</span>
            <span className="font-mono">{formatDelphiDuration(build.durationMs)}</span>
            <span className="font-mono">{build.errorCount} erro(s)</span>
            <span className="font-mono">{build.warningCount} aviso(s)</span>
            {build.outputExePath && <span className="font-mono text-foreground break-all">{build.outputExePath}</span>}
          </div>

          {build.logTail && build.errorCount === 0 && (
            <pre className="max-h-32 overflow-auto rounded-md border border-danger/30 bg-danger/5 p-2 text-2xs font-mono text-danger whitespace-pre-wrap select-text">
              {build.logTail}
            </pre>
          )}

          {build.diagnostics.length > 0 && (
            <ul className="max-h-56 overflow-y-auto space-y-1 pr-1">
              {build.diagnostics.map((d, i) => (
                <li key={`${d.code}-${d.file}-${d.line}-${i}`}>
                  <button
                    type="button"
                    onClick={() => copy(diagnosticClipboardText(d))}
                    title="Copiar caminho, linha e mensagem"
                    className={`w-full text-left rounded-md border px-2.5 py-1.5 text-xs cursor-pointer hover:brightness-110 ${SEVERITY_CLASS[d.severity]}`}
                  >
                    <span className="font-mono font-bold">{d.code}</span>{' '}
                    <span className="font-mono text-foreground">{diagnosticLocation(d)}</span>
                    <span className="block text-muted-foreground">{d.message}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};
