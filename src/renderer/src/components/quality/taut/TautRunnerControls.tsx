import React from 'react';
import { Play, Square, ExternalLink, Sliders } from 'lucide-react';
import { MODULE_TAGS, META_TAGS } from '../../../utils/tautPanelConstants';

interface TautRunnerControlsProps {
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  effectiveTagsString: string;
  onCustomTagChange: (value: string) => void;
  customSpecInput: string;
  onCustomSpecChange: (value: string) => void;
  apiUrlMode: 'v39' | 'legacy';
  onApiUrlModeChange: (mode: 'v39' | 'legacy') => void;
  isRunning: boolean;
  projectExists: boolean;
  onRun: () => void;
  onOpenInteractive: () => void;
  onAbort: () => void;
}

export const TautRunnerControls: React.FC<TautRunnerControlsProps> = ({
  selectedTags,
  onToggleTag,
  effectiveTagsString,
  onCustomTagChange,
  customSpecInput,
  onCustomSpecChange,
  apiUrlMode,
  onApiUrlModeChange,
  isRunning,
  projectExists,
  onRun,
  onOpenInteractive,
  onAbort
}) => (
  <div className="lg:col-span-5 space-y-4">
    {/* Meta Tags (Esteira, Crítico, Regressão, Contrato) */}
    <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs space-y-2.5">
      <label className="text-xs font-bold text-foreground flex items-center justify-between">
        <span>Filtro de Meta-Tags (@cypress/grep)</span>
        <span className="text-[10px] text-muted-foreground font-normal">Clique para alternar</span>
      </label>

      <div className="flex flex-wrap gap-1.5">
        {META_TAGS.map((meta) => {
          const isSelected = selectedTags.includes(meta.id);
          return (
            <button
              key={meta.id}
              type="button"
              onClick={() => onToggleTag(meta.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition cursor-pointer border ${
                isSelected
                  ? `${meta.color} font-bold ring-1 ring-primary/40`
                  : 'bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground'
              }`}
            >
              {isSelected ? `✓ ${meta.label}` : meta.label}
            </button>
          );
        })}
      </div>
    </div>

    {/* Módulos do WinThor */}
    <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs space-y-2.5">
      <label className="text-xs font-bold text-foreground flex items-center justify-between">
        <span>Módulos de Negócio (Serviços WTA)</span>
        <span className="text-[10px] text-muted-foreground font-normal">Selecione para focar</span>
      </label>

      <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
        {MODULE_TAGS.map((mod) => {
          const isSelected = selectedTags.includes(mod.id);
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => onToggleTag(mod.id)}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer border ${
                isSelected
                  ? 'bg-primary text-primary-foreground font-bold border-primary shadow-xs'
                  : 'bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground'
              }`}
              title={`Tag: ${mod.id} (${mod.group})`}
            >
              {mod.label}
            </button>
          );
        })}
      </div>
    </div>

    {/* Parâmetros Avançados de Execução */}
    <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs space-y-3">
      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
        <Sliders className="w-3.5 h-3.5 text-primary" />
        <span>Parâmetros de Execução</span>
      </div>

      <div className="space-y-2 text-xs">
        <div>
          <label className="text-[11px] text-muted-foreground">Filtro de Tags Combinado:</label>
          <input
            type="text"
            value={effectiveTagsString}
            onChange={(e) => onCustomTagChange(e.target.value)}
            placeholder="ex: critico,winthor-pedido-venda,-develop"
            className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary mt-1"
          />
        </div>

        <div>
          <label className="text-[11px] text-muted-foreground">Filtro de Arquivo Spec (Opcional):</label>
          <input
            type="text"
            value={customSpecInput}
            onChange={(e) => onCustomSpecChange(e.target.value)}
            placeholder="cypress/e2e/api/Pedido/**/*"
            className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary mt-1"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-muted-foreground">Modo de URL (API_URL_MODE):</span>
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => onApiUrlModeChange('v39')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                apiUrlMode === 'v39'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              v39 (Atual)
            </button>
            <button
              type="button"
              onClick={() => onApiUrlModeChange('legacy')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                apiUrlMode === 'legacy'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              legacy
            </button>
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-border/60">
        <button
          type="button"
          onClick={onRun}
          disabled={isRunning || !projectExists}
          className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
          <span>{isRunning ? 'Executando...' : 'Rodar Headless'}</span>
        </button>

        <button
          type="button"
          onClick={onOpenInteractive}
          disabled={isRunning || !projectExists}
          className="w-full sm:w-auto py-2 px-3 rounded-lg bg-card hover:bg-muted text-foreground border border-border/70 hover:border-border text-xs font-semibold transition cursor-pointer flex items-center justify-center space-x-1.5 whitespace-nowrap disabled:opacity-50"
          title="Abre o Cypress Runner Interativo com navegador (cy:open)"
        >
          <ExternalLink className="w-3.5 h-3.5 text-primary" />
          <span>Abrir cy:open</span>
        </button>

        {isRunning && (
          <button
            type="button"
            onClick={onAbort}
            className="w-full sm:w-auto py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center space-x-1.5"
            title="Interromper execução do processo Cypress"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Parar</span>
          </button>
        )}
      </div>
    </div>
  </div>
);
