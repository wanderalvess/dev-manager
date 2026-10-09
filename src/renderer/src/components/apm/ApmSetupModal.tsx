import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Terminal, X } from 'lucide-react';
import type { ApmReceiverPortChangeResult, ObservabilityOverview } from '../../../../shared/types';
import { DEFAULT_APM_SERVICE_NAME } from '../../../../shared/types';
import type { buildApmSetupSnippets } from '../../utils/apmUiUtils';
import { Modal } from '../ui/Modal';

export interface ApmSetupModalProps {
  isOpen: boolean;
  overview: ObservabilityOverview | null;
  receiverPort: number;
  instrumentationEnabled: boolean;
  isSavingInstrumentation: boolean;
  onToggleInstrumentation: (enabled: boolean) => void;
  onApplyReceiverPort: (portDraft: string) => Promise<ApmReceiverPortChangeResult | undefined>;
  isChangingPort: boolean;
  serviceName: string;
  onApplyServiceName: (serviceName: string) => void | Promise<void>;
  isSavingServiceName: boolean;
  setupSnippets: ReturnType<typeof buildApmSetupSnippets>;
  copyToClipboard: (text: string, key: string) => void;
  copyFeedback: string | null;
  onClose: () => void;
}

export const ApmSetupModal: React.FC<ApmSetupModalProps> = ({
  isOpen, overview, receiverPort, instrumentationEnabled, isSavingInstrumentation,
  onToggleInstrumentation, onApplyReceiverPort, isChangingPort, serviceName, onApplyServiceName,
  isSavingServiceName, setupSnippets, copyToClipboard, copyFeedback, onClose
}) => {
  const [portDraft, setPortDraft] = useState('');
  const [serviceNameDraft, setServiceNameDraft] = useState('');
  const [setupTab, setSetupTab] = useState<'karaf' | 'curl' | 'node'>('karaf');
  const wasOpen = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      setPortDraft(String(receiverPort));
      setServiceNameDraft(serviceName);
    }
    wasOpen.current = isOpen;
  }, [isOpen, receiverPort, serviceName]);

  const applyReceiverPort = async () => {
    const result = await onApplyReceiverPort(portDraft);
    if (result) setPortDraft(String(result.status.port));
  };

  if (!isOpen) return null;
  return (
        <Modal
          open
          onClose={onClose}
          bare
          panelClassName="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden font-sans"
          closeOnBackdrop={false}
          closeOnEscape={false}
          ariaLabel="Como Conectar no Receptor OpenTelemetry (APM)"
        >
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Como Conectar no Receptor OpenTelemetry (APM)</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex flex-col gap-3 font-mono text-xs">
              <p className="text-muted-foreground leading-relaxed font-sans text-xs">
                O Hub Manager escuta traces padrão <strong>OpenTelemetry (OTLP/HTTP, JSON ou Protobuf)</strong> na porta{' '}
                <code className="text-primary font-bold">{receiverPort}</code>. Qualquer aplicação instrumentada envia
                seus spans automaticamente — métricas e logs OTLP não são coletados.
              </p>

              {/* Liga/desliga o anexo automático do agente Java ao iniciar o Karaf pelo Cockpit */}
              <label
                htmlFor="apm-instrumentation-toggle"
                className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-muted/20 font-sans text-xs cursor-pointer"
              >
                <input
                  id="apm-instrumentation-toggle"
                  type="checkbox"
                  checked={instrumentationEnabled}
                  disabled={isSavingInstrumentation}
                  onChange={(e) => onToggleInstrumentation(e.target.checked)}
                  className="mt-0.5 w-3.5 h-3.5 accent-primary cursor-pointer disabled:cursor-wait"
                />
                <span className="text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Anexar o agente automaticamente ao iniciar o Karaf pelo Cockpit.</strong>{' '}
                  Desligado por padrão: o agente OpenTelemetry deixa o log do Karaf mais verboso, então só liga quando
                  você quiser mesmo capturar traces. Com a opção desligada, o Karaf sobe normalmente mesmo com o
                  <code className="font-mono text-primary mx-1">opentelemetry-javaagent.jar</code>presente em
                  <code className="font-mono text-primary mx-1">bin</code>.
                </span>
              </label>

              {overview && !overview.receiverStatus.listening && (
                <div className="px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800/60 dark:text-rose-300 font-sans text-xs leading-relaxed">
                  <strong>Receptor inativo:</strong> {overview.receiverStatus.error || 'não foi possível abrir a porta'}.
                  Se outro coletor OpenTelemetry (OTel Collector, Jaeger, SigNoz) estiver usando a porta, encerre-o e
                  aplique a porta de novo — ou escolha outra porta abaixo.
                </div>
              )}

              {/* Porta do receptor (persistida em config.json; o Karaf iniciado pelo app a segue) */}
              <div className="flex flex-wrap items-center gap-2 font-sans text-xs">
                <label htmlFor="apm-receiver-port" className="text-muted-foreground font-medium">
                  Porta do receptor
                </label>
                <input
                  id="apm-receiver-port"
                  type="number"
                  min={1024}
                  max={65535}
                  value={portDraft}
                  onChange={(e) => setPortDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyReceiverPort();
                  }}
                  className="h-7 w-24 px-2 bg-background border border-border rounded font-mono text-xs text-foreground focus:outline-hidden focus:border-primary"
                />
                <button
                  type="button"
                  onClick={applyReceiverPort}
                  disabled={isChangingPort}
                  className="h-7 px-3 rounded bg-primary text-primary-foreground text-2xs font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-wait cursor-pointer transition"
                >
                  {isChangingPort ? 'Aplicando…' : 'Aplicar'}
                </button>
                <span className="text-2xs text-muted-foreground">
                  O Karaf iniciado pelo Hub Manager passa a exportar para esta porta no próximo start.
                </span>
              </div>

              {/* Nome de serviço (otel.service.name) do agente Java anexado automaticamente pelo Cockpit */}
              <div className="flex flex-wrap items-center gap-2 font-sans text-xs">
                <label htmlFor="apm-service-name" className="text-muted-foreground font-medium">
                  Nome do serviço
                </label>
                <input
                  id="apm-service-name"
                  type="text"
                  value={serviceNameDraft}
                  onChange={(e) => setServiceNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onApplyServiceName(serviceNameDraft);
                  }}
                  placeholder={DEFAULT_APM_SERVICE_NAME}
                  className="h-7 w-40 px-2 bg-background border border-border rounded font-mono text-xs text-foreground focus:outline-hidden focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => onApplyServiceName(serviceNameDraft)}
                  disabled={isSavingServiceName}
                  className="h-7 px-3 rounded bg-primary text-primary-foreground text-2xs font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-wait cursor-pointer transition"
                >
                  {isSavingServiceName ? 'Salvando…' : 'Aplicar'}
                </button>
                <span className="text-2xs text-muted-foreground">
                  Identifica esta aplicação no APM (<code className="font-mono">otel.service.name</code>); use o nome do seu sistema.
                </span>
              </div>

              {/* Tabs de Conexão */}
              <div className="flex items-center gap-1 border-b border-border pb-1">
                <button
                  type="button"
                  onClick={() => setSetupTab('karaf')}
                  className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition ${
                    setupTab === 'karaf' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Karaf / WinThor (Java)
                </button>
                <button
                  type="button"
                  onClick={() => setSetupTab('curl')}
                  className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition ${
                    setupTab === 'curl' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  cURL (Teste Rápido)
                </button>
                <button
                  type="button"
                  onClick={() => setSetupTab('node')}
                  className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition ${
                    setupTab === 'node' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Node.js / Express
                </button>
              </div>

              {/* Guia Karaf */}
              {setupTab === 'karaf' && (
                <div className="flex flex-col gap-2 mt-1">
                  <p className="text-muted-foreground font-sans text-xs">
                    Coloque o arquivo <code className="text-foreground font-mono">opentelemetry-javaagent.jar</code> dentro da pasta <code className="text-foreground font-mono">bin</code> do seu Karaf e ligue <strong className="text-foreground">"Anexar o agente automaticamente"</strong> acima — o Hub Manager passa a anexar o agente sozinho ao iniciar pelo Cockpit. Para scripts externos (<code className="text-foreground font-mono">winthor.bat</code>), use:
                  </p>
                  <div className="relative">
                    <pre className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-emerald-400 text-2xs overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {setupSnippets.karafDisplay}
                    </pre>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(setupSnippets.karafCopy, 'karafCmd')}
                      className="absolute top-2 right-2 px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 cursor-pointer flex items-center gap-1"
                    >
                      {copyFeedback === 'karafCmd' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      Copiar
                    </button>
                  </div>
                </div>
              )}

              {/* Guia cURL */}
              {setupTab === 'curl' && (
                <div className="flex flex-col gap-2 mt-1">
                  <p className="text-muted-foreground font-sans text-xs">
                    Teste o envio de um span diretamente via linha de comando:
                  </p>
                  <div className="relative">
                    <pre className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-sky-300 text-2xs overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {setupSnippets.curlDisplay}
                    </pre>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(setupSnippets.curlCopy, 'curlCmd')}
                      className="absolute top-2 right-2 px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 cursor-pointer flex items-center gap-1"
                    >
                      {copyFeedback === 'curlCmd' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      Copiar
                    </button>
                  </div>
                </div>
              )}

              {/* Guia Node */}
              {setupTab === 'node' && (
                <div className="flex flex-col gap-2 mt-1">
                  <p className="text-muted-foreground font-sans text-xs">
                    Com a biblioteca oficial <code className="text-foreground">@opentelemetry/sdk-node</code>:
                  </p>
                  <pre className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-amber-300 text-2xs overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {setupSnippets.nodeDisplay}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 border-t border-border bg-muted/10 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="h-8 px-4 rounded bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 cursor-pointer"
              >
                Entendi
              </button>
            </div>
        </Modal>
  );
};
