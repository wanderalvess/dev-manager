import React from 'react';
import { X, RefreshCw, Server, Layers2, Plus } from 'lucide-react';

interface Routine801HeaderProps {
  connectionHealth: { ok: boolean; message: string } | null;
  serverUrlInput: string;
  isConfigOpen: boolean;
  isLoading: boolean;
  isExecuting: boolean;
  executeVia: 'karaf_cli' | 'api';
  onToggleConfig: () => void;
  onChangeExecuteVia: (via: 'karaf_cli' | 'api') => void;
  onOpenDirectInstall: () => void;
  onRefresh: () => void;
  onClose: () => void;
}

export const Routine801Header: React.FC<Routine801HeaderProps> = ({
  connectionHealth,
  serverUrlInput,
  isConfigOpen,
  isLoading,
  isExecuting,
  executeVia,
  onToggleConfig,
  onChangeExecuteVia,
  onOpenDirectInstall,
  onRefresh,
  onClose
}) => (
  <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/20 shrink-0">
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 border border-primary/25 text-primary">
        <Layers2 className="w-4 h-4" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold tracking-tight">
            Catálogo Oficial WinThor — Rotina 801
          </h2>
          <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 rounded">
            WTA Serviços
          </span>
          {connectionHealth && (
            <button
              onClick={onToggleConfig}
              className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono rounded border transition-colors hover:border-border"
              title="Clique para gerenciar a URL de conexão"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  connectionHealth.ok ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className="text-muted-foreground text-[10px]">{serverUrlInput}</span>
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Instale e atualize pacotes OSGi oficiais com telemetria direta no Apache Karaf local
        </p>
      </div>
    </div>

    <div className="flex items-center gap-2">
      {/* Seletor de Modo de Instalação */}
      <div className="flex items-center bg-muted/70 p-0.5 rounded-md border border-border text-xs" title="Escolha o mecanismo de execução da instalação">
        <button
          type="button"
          onClick={() => onChangeExecuteVia('karaf_cli')}
          className={`px-2 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
            executeVia === 'karaf_cli'
              ? 'bg-card text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Executa via Apache Karaf CLI (client.bat) com comandos OSGi em tempo real"
        >
          Console Karaf
        </button>
        <button
          type="button"
          onClick={() => onChangeExecuteVia('api')}
          className={`px-2 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
            executeVia === 'api'
              ? 'bg-card text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Executa via API REST do WTA (/winthor/ferramenta/servidor/v1/sistema/instala-com-dependencias)"
        >
          API WTA
        </button>
      </div>

      <button
        onClick={onOpenDirectInstall}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary transition-colors cursor-pointer"
        title="Instalar ou registrar versão específica diretamente no Karaf"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Instalação Direta</span>
      </button>

      <button
        onClick={onToggleConfig}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${
          isConfigOpen
            ? 'bg-primary/15 border-primary/40 text-primary'
            : 'bg-card border-border hover:bg-muted text-foreground'
        }`}
        title="Configurar URL do servidor WTA"
      >
        <Server className="w-3.5 h-3.5 text-muted-foreground" />
        <span>Conexão</span>
      </button>

      <button
        onClick={onRefresh}
        disabled={isLoading || isExecuting}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-border bg-card hover:bg-muted text-foreground disabled:opacity-50 transition-colors"
        title="Sincronizar dados do servidor WTA"
      >
        <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${isLoading ? 'animate-spin text-primary' : ''}`} />
        <span>Sincronizar</span>
      </button>

      <button
        onClick={onClose}
        className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors ml-1"
        title="Fechar (Esc)"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  </div>
);
