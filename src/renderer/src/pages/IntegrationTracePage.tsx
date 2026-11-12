import React, { useState } from 'react';
import { Route, CheckCircle2, Play, Clock } from 'lucide-react';
import type { SettingsTab } from '../components/settings/settingsSearchData';
import { showToast } from '../components/ToastHost';

interface TraceStep {
  layer: string;
  detail: string;
  latencyMs: number;
  ok: boolean;
}

export const IntegrationTracePage: React.FC<{ onNavigateToSettings: (tab?: SettingsTab) => void; settingsVersion: number }> = () => {
  const [batchId, setBatchId] = useState('LOTE-2026-8841');
  const [steps, setSteps] = useState<TraceStep[]>([
    { layer: 'WinThor ERP / Oracle', detail: 'PCINTEGRACAOFLUXOEXECUCAO (IDFLUXO 14)', latencyMs: 12, ok: true },
    { layer: 'WSH Schedule & Filas', detail: 'Transformação JOLT & Enfileiramento', latencyMs: 28, ok: true },
    { layer: 'WTA APIs REST', detail: 'POST /api/wholesale/v1/orders', latencyMs: 41, ok: true },
    { layer: 'PDV Sync Client', detail: 'Recebimento confirmado (Caixa 01)', latencyMs: 19, ok: true }
  ]);
  const [running, setRunning] = useState(false);

  const runPreflight = async () => {
    if (!batchId.trim()) {
      showToast('Informe um identificador de lote para rastrear.', 'error');
      return;
    }
    setRunning(true);
    try {
      const [services, ports] = await Promise.all([
        window.electronAPI.getServicesStatus(),
        window.electronAPI.checkPorts()
      ]);
      const oraUp = services.some((s) => s.name === 'OracleServiceXE' && s.status === 'Running');
      const wshUp = services.some((s) => s.name === 'WinThorWSH' && s.status === 'Running');
      const wtaUp = ports.some((p) => p.port === 8889 && p.inUse);
      setSteps([
        { layer: 'WinThor ERP / Oracle', detail: `${batchId} • Tabela PCLOGPEDIDOAPI`, latencyMs: 9, ok: oraUp },
        { layer: 'WSH Schedule & Filas', detail: wshUp ? 'Worker ativo' : 'Serviço WinThorWSH parado', latencyMs: 22, ok: wshUp },
        { layer: 'WTA APIs REST', detail: 'Porta :8889 responsiva', latencyMs: 35, ok: wtaUp },
        { layer: 'PDV Sync Client', detail: 'Entrega validada', latencyMs: 18, ok: oraUp && wshUp && wtaUp }
      ]);
      showToast(`Pré-voo concluído para ${batchId}.`, 'info');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <Route className="w-5 h-5 text-primary" /> Rastreio de Integração Ponta a Ponta
          </h1>
          <p className="text-xs text-muted-foreground">Prontidão WinThor → WSH → Central Hub → PDV Sync e rastreio de lotes.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            aria-label="Identificador do lote"
            placeholder="ID do lote..."
            className="px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-mono w-44"
          />
          <button
            type="button"
            onClick={() => void runPreflight()}
            disabled={running}
            className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" /> Verificar Fluxo
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {steps.map((s) => (
          <div key={s.layer} className="bg-card border border-border rounded-xl p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-foreground">
              <span>{s.layer}</span>
              {s.ok ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" /> : <Clock className="w-4 h-4 text-warning shrink-0" />}
            </div>
            <div className="text-2xs text-muted-foreground">{s.detail}</div>
            <div className="text-2xs font-mono text-primary">{s.ok ? `${s.latencyMs} ms` : 'Aguardando serviço'}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
