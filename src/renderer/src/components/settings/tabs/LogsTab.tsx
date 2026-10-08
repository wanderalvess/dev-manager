import React from 'react';
import {
  ScrollText,
  RotateCcw,
  Plus,
  FolderOpen,
  Trash2,
  Sparkles
} from 'lucide-react';
import { AppSettings, RealtimeLogSource } from '../../../../../shared/types';

interface LogsTabProps {
  settings: AppSettings;
  defaultLogSources: RealtimeLogSource[];
  handleResetLogSources: () => void;
  handleAddLogSource: () => void;
  handleUpdateLogSource: (index: number, field: keyof RealtimeLogSource, value: any) => void;
  handleRemoveLogSource: (index: number) => void;
  handleBrowseLogPath: (index: number) => Promise<void>;
}

export const LogsTab: React.FC<LogsTabProps> = ({
  settings,
  defaultLogSources,
  handleResetLogSources,
  handleAddLogSource,
  handleUpdateLogSource,
  handleRemoveLogSource,
  handleBrowseLogPath
}) => {
  return (
    <div className="space-y-4 flex flex-col flex-1" id="field-logs">
      <div className="cockpit-panel rounded-2xl p-5 space-y-4 shadow-xl border border-border">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div>
            <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-emerald-500" /> Fontes de Logs em Tempo Real (Tail -f)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Arquivos de saída de serviços e rotinas monitorados continuamente pela aba &quot;Logs em Tempo Real&quot;.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleResetLogSources}
              className="px-3 py-1.5 bg-muted hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/40 hover:border-rose-500/70 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              title="Remove todas as fontes de log configuradas"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar Todas</span>
            </button>
            <button
              type="button"
              onClick={handleAddLogSource}
              className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Fonte de Log</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {(settings.realtimeLogSources || defaultLogSources).map((src, idx) => (
            <div
              key={src.id || idx}
              className="bg-card/70 border border-border/80 rounded-xl p-4 space-y-3 hover:border-border transition-colors"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label htmlFor={`logs-tab-1-${idx}`} className="text-[11px] font-bold text-foreground block">Nome de Exibição</label>
                  <input id={`logs-tab-1-${idx}`}
                    type="text"
                    value={src.name || ''}
                    onChange={(e) => handleUpdateLogSource(idx, 'name', e.target.value)}
                    placeholder="Ex: API Backend, Serviço de Integração..."
                    className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor={`logs-tab-2-${idx}`} className="text-[11px] font-bold text-foreground block">Caminho do Arquivo de Log (.log, .out, .txt)</label>
                    <span className="text-2xs text-muted-foreground font-mono">Windows Local</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input id={`logs-tab-2-${idx}`}
                      type="text"
                      value={src.filePath || ''}
                      onChange={(e) => handleUpdateLogSource(idx, 'filePath', e.target.value)}
                      placeholder="Ex: C:\meu-servico\logs\saida.log"
                      className="flex-1 px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleBrowseLogPath(idx)}
                      className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg text-xs font-semibold flex items-center space-x-1 shrink-0 transition-colors"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Procurar...</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between pt-1 gap-2">
                <div className="flex items-center space-x-2">
                  <label htmlFor={`logs-tab-3-${idx}`} className="text-[11px] font-semibold text-muted-foreground">Codificação:</label>
                  <select id={`logs-tab-3-${idx}`}
                    value={src.encoding || 'utf-8'}
                    onChange={(e) => handleUpdateLogSource(idx, 'encoding', e.target.value)}
                    className="px-2.5 py-1 bg-background border border-border rounded-lg text-xs"
                  >
                    <option value="utf-8">UTF-8 (Padrão)</option>
                    <option value="latin1">Latin1 / ISO-8859-1 (Delphi legada)</option>
                    <option value="windows-1252">Windows-1252 (ANSI)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveLogSource(idx)}
                  className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center space-x-1 p-1 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remover</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-muted/30 border border-border/50 rounded-xl p-3.5 text-xs text-muted-foreground space-y-1">
          <span className="font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" /> Dica de Produtividade
          </span>
          <p>
            Os logs cadastrados aqui aparecem instantaneamente na aba <strong>Logs em Tempo Real (Alt+8)</strong>{' '}
            com auto-scroll, busca regex e filtro por nível (ERROR, WARN, INFO). Se o arquivo ainda não existir, o
            sistema aguardará o serviço criá-lo sem travar a interface.
          </p>
        </div>
      </div>
    </div>
  );
};
