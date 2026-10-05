import React from 'react';
import {
  Bot,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Zap,
  Sliders,
  Trash2
} from 'lucide-react';
import { LlmProviderConfig, LlmTestResult } from '../../../../../shared/types';
import { formatEndpoint, formatTimeoutSeconds, maskApiKey } from '../../../utils/aiTabUtils';

interface AiProviderCardProps {
  provider: LlmProviderConfig;
  isActive: boolean;
  isTesting: boolean;
  testResult: LlmTestResult | undefined;
  onSetActive: (id: string) => void;
  onTest: (provider: LlmProviderConfig) => Promise<void>;
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (provider: Partial<LlmProviderConfig>) => void;
  onDelete: (id: string) => void;
}

export const AiProviderCard: React.FC<AiProviderCardProps> = ({
  provider,
  isActive,
  isTesting,
  testResult,
  onSetActive,
  onTest,
  onToggle,
  onEdit,
  onDelete
}) => (
  <div
    className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3.5 ${
      isActive
        ? 'border-primary/60 bg-card shadow-sm ring-1 ring-primary/20'
        : 'border-border bg-card hover:border-border/80'
    } ${!provider.enabled ? 'opacity-55' : ''}`}
  >
    <div className="space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
              isActive
                ? 'bg-primary/10 border-primary/40 text-primary'
                : 'bg-muted border-border text-muted-foreground'
            }`}
          >
            <Bot className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-sm text-foreground truncate block">{provider.name}</span>
            <span className="text-2xs font-mono text-muted-foreground uppercase">{provider.provider}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isActive ? (
            <span className="px-2 py-0.5 text-2xs font-mono font-bold rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              ATIVO
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onSetActive(provider.id)}
              className="px-2 py-0.5 text-2xs font-mono font-bold rounded-lg bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary border border-border transition-colors cursor-pointer"
              title="Definir como motor ativo"
            >
              Ativar
            </button>
          )}
        </div>
      </div>

      <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1.5 font-mono">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Modelo:</span>
          <span className="text-foreground font-bold truncate max-w-[180px]">{provider.model}</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Endpoint:</span>
          <span
            className="text-muted-foreground truncate max-w-[180px]"
            title={provider.baseUrl || 'Endpoint padrão'}
          >
            {formatEndpoint(provider.baseUrl)}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Credencial:</span>
          <span className="text-muted-foreground">{maskApiKey(provider)}</span>
        </div>
        <div className="flex items-center justify-between text-2xs pt-1 border-t border-border/40 text-muted-foreground">
          <span>Temp: {(provider.temperature ?? 0.7).toFixed(2)}</span>
          <span>Timeout: {formatTimeoutSeconds(provider.timeoutMs)}s</span>
        </div>
      </div>
    </div>

    {/* Telemetria do Teste de Conexão */}
    {testResult && (
      <div
        className={`p-2.5 rounded-xl text-xs border font-mono ${
          testResult.success
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-semibold text-[11px] min-w-0">
            {testResult.success ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
            )}
            <span className="truncate">{testResult.message}</span>
          </div>
          {testResult.latencyMs !== undefined && (
            <span className="px-1.5 py-0.5 rounded bg-background/80 border border-current text-2xs font-bold shrink-0">
              ⚡ {testResult.latencyMs}ms
            </span>
          )}
        </div>
      </div>
    )}

    {/* Ações do Card */}
    <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onTest(provider)}
          disabled={isTesting}
          className="px-2.5 py-1.5 rounded-xl bg-card hover:bg-muted text-foreground text-[11px] font-semibold border border-border hover:border-primary/40 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-2xs"
        >
          {isTesting ? (
            <RotateCcw className="w-3 h-3 animate-spin text-primary" />
          ) : (
            <Zap className="w-3 h-3 text-amber-500" />
          )}
          <span>{isTesting ? 'Testando...' : 'Testar Conexão'}</span>
        </button>

        <button
          type="button"
          onClick={() => onToggle(provider.id, !provider.enabled)}
          className="px-2.5 py-1.5 rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-[11px] border border-border transition-all cursor-pointer shadow-2xs"
        >
          {provider.enabled ? 'Desativar' : 'Habilitar'}
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onEdit({ ...provider })}
          className="p-1.5 rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-all cursor-pointer shadow-2xs"
          title="Editar parâmetros"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(provider.id)}
          className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
          title="Remover este motor"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
);
