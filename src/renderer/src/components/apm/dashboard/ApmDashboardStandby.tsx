import React from 'react';
import { Sparkles, Terminal, Copy, Check, Zap } from 'lucide-react';
import { ObservabilityOverview, DEFAULT_APM_OTLP_PORT } from '../../../../../shared/types';
import { showToast } from '../../ToastHost';
import { buildApmSetupSnippets } from '../../../utils/apmUiUtils';

interface ApmDashboardStandbyProps {
  overview: ObservabilityOverview | null;
  copyToClipboard: (text: string, key: string) => void;
  copyFeedback: string | null;
  onGenerateDemo?: () => void;
  /** Abre "Como Conectar", onde a porta do receptor pode ser trocada */
  onOpenSetup?: () => void;
}

/** Painel de Standby Operacional (em vez do estado vazio genérico). */
export const ApmDashboardStandby: React.FC<ApmDashboardStandbyProps> = ({
  overview,
  copyToClipboard,
  copyFeedback,
  onGenerateDemo,
  onOpenSetup
}) => {
  const receiver = overview?.receiverStatus;
  const port = receiver?.port || DEFAULT_APM_OTLP_PORT;
  const snippets = buildApmSetupSnippets(port);
  // Sem overview ainda não se sabe o estado do receptor: não afirmar que está pronto
  const receiverState: 'checking' | 'listening' | 'down' = !receiver ? 'checking' : receiver.listening ? 'listening' : 'down';

  return (
    <div className="flex-1 flex flex-col p-6 items-center justify-center select-text bg-background">
      <div className="w-full max-w-xl flex flex-col gap-4 p-5 rounded-xl border border-border bg-card shadow-2xs">
        {/* Header de Instrumento */}
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {receiverState === 'listening' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  receiverState === 'listening' ? 'bg-emerald-500' : receiverState === 'down' ? 'bg-rose-500' : 'bg-neutral-400'
                }`}
              />
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-foreground">
              {receiverState === 'down' ? 'Receptor OTLP Inativo' : 'Receptor OTLP Standby'} • Porta :{port}
            </h3>
          </div>
          <span
            className={`text-2xs font-mono px-2 py-0.5 rounded border ${
              receiverState === 'listening'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : receiverState === 'down'
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                : 'bg-muted text-muted-foreground border-border'
            }`}
          >
            {receiverState === 'listening' ? 'Pronto para Escuta' : receiverState === 'down' ? 'Indisponível' : 'Verificando…'}
          </span>
        </div>

        {receiverState === 'down' ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
              O receptor não conseguiu abrir a porta {port}: <strong>{receiver?.error || 'erro desconhecido'}</strong>. Se
              outro coletor OpenTelemetry (OTel Collector, Jaeger, SigNoz) estiver usando a porta, encerre-o ou escolha
              outra porta para o receptor.
            </p>
            {onOpenSetup && (
              <button
                type="button"
                onClick={onOpenSetup}
                className="self-start px-3 py-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-semibold cursor-pointer transition"
              >
                Trocar porta do receptor
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground leading-relaxed">
            O hub de observabilidade do Hub Manager aguarda requisições em{' '}
            <code className="text-foreground font-mono">{snippets.endpoint}</code> vindas do Apache Karaf (CXF / Oracle)
            ou de qualquer microserviço instrumentado via OpenTelemetry.
          </p>
        )}

        {/* Teste Rápido / Chamada */}
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs">
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span className="flex items-center gap-1.5 font-mono">
              <Terminal className="w-3.5 h-3.5 text-sky-400" />
              Disparo de Teste Rápido (PowerShell):
            </span>
            <button
              type="button"
              onClick={() => {
                copyToClipboard(snippets.powershellCopy, 'ps-cmd');
                showToast('Comando PowerShell copiado!', 'info');
              }}
              className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-2xs text-neutral-300 flex items-center gap-1 cursor-pointer transition"
            >
              {copyFeedback === 'ps-cmd' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              Copiar
            </button>
          </div>
          <pre className="text-2xs font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-20 no-scrollbar">
            Invoke-RestMethod -Uri "{snippets.tracesUrl}" -Method POST ...
          </pre>
        </div>

        {/* Ações de Inicialização */}
        <div className="flex items-center justify-between pt-1">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Dica: ligue "Anexar o agente automaticamente" em Como Conectar para o Karaf exportar sozinho.</span>
          </div>
          {onGenerateDemo && (
            <button
              type="button"
              onClick={onGenerateDemo}
              className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Simular Tráfego de Demonstração
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
