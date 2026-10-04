import React from 'react';
import { Cpu, Eye, EyeOff, RefreshCw, RotateCcw } from 'lucide-react';
import type { LlmProviderConfig, LlmTestResult } from '../../../../shared/types';
import { DEFAULT_SYSTEM_PROMPT, PROVIDER_PRESETS, type ProviderPreset } from '../../utils/docSettingsPresets';
import { DocSettingsLlmTestResult } from './DocSettingsLlmTestResult';

interface DocSettingsLlmProviderFormProps {
  editing: Partial<LlmProviderConfig>;
  setEditing: (value: Partial<LlmProviderConfig> | null) => void;
  showApiKey: boolean;
  setShowApiKey: (value: boolean) => void;
  isTesting: boolean;
  testResult: LlmTestResult | null;
  onSelectPreset: (preset: ProviderPreset) => void;
  onSubmit: (e: React.FormEvent) => void;
  onTest: () => void;
}

const INPUT_BASE =
  'w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';

export const DocSettingsLlmProviderForm: React.FC<DocSettingsLlmProviderFormProps> = ({
  editing,
  setEditing,
  showApiKey,
  setShowApiKey,
  isTesting,
  testResult,
  onSelectPreset,
  onSubmit,
  onTest
}) => {
  const matchedPreset = PROVIDER_PRESETS.find((p) => p.type === (editing.provider || 'openai'));

  return (
    <form
      onSubmit={onSubmit}
      className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3.5 shadow-xs animate-in fade-in-0"
    >
      <div className="flex items-center justify-between border-b border-primary/15 pb-2.5">
        <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-primary" />
          <span>{editing.id ? 'Editar Provedor de IA' : 'Novo Provedor de IA'}</span>
        </h5>
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="text-xs text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          Cancelar
        </button>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-foreground">Provedores Recomendados</label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {PROVIDER_PRESETS.map((preset) => {
            const isSelected = (editing.provider || 'openai') === preset.type;
            return (
              <button
                key={preset.type}
                type="button"
                onClick={() => onSelectPreset(preset)}
                className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary/15 border-primary text-primary font-bold shadow-xs'
                    : 'bg-background/80 border-border text-foreground hover:border-primary/40'
                }`}
              >
                <div className="text-xs truncate">{preset.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-foreground">Nome Identificador</label>
          <input
            type="text"
            required
            placeholder="Ex: OpenAI ChatGPT ou Ollama Local"
            value={editing.name || ''}
            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            className={INPUT_BASE}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-foreground">Nome do Modelo (Model ID)</label>
          <input
            type="text"
            required
            placeholder="Ex: gpt-4o-mini, gemini-2.0-flash, llama3.2"
            value={editing.model || ''}
            onChange={(e) => setEditing({ ...editing, model: e.target.value })}
            className={`${INPUT_BASE} font-mono`}
          />
        </div>
      </div>

      {matchedPreset && matchedPreset.models.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground font-semibold">Modelos sugeridos:</span>
          {matchedPreset.models.map((mod) => (
            <button
              key={mod}
              type="button"
              onClick={() => setEditing({ ...editing, model: mod })}
              className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border cursor-pointer transition ${
                editing.model === mod
                  ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                  : 'bg-background hover:bg-muted text-foreground border-border'
              }`}
            >
              {mod}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2.5">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-foreground flex items-center justify-between">
            <span>URL Base da API (Endpoint)</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              {editing.provider === 'ollama' ? 'Padrão local Ollama' : 'Compatível com OpenAI'}
            </span>
          </label>
          <input
            type="text"
            placeholder="https://api.openai.com/v1 ou http://localhost:11434/v1"
            value={editing.baseUrl || ''}
            onChange={(e) => setEditing({ ...editing, baseUrl: e.target.value })}
            className={`${INPUT_BASE} font-mono`}
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-foreground">Chave de API / Token</label>
            <span className="text-[10px] text-muted-foreground">
              {editing.provider === 'ollama' ? 'Opcional para Ollama local' : 'Fica salva localmente nas configurações'}
            </span>
          </div>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              placeholder={
                editing.provider === 'ollama' ? 'Não necessária para Ollama' : 'sk-... ou token de autenticação'
              }
              value={editing.apiKey || ''}
              onChange={(e) => setEditing({ ...editing, apiKey: e.target.value })}
              className="w-full bg-background border border-border rounded-xl pl-3 pr-10 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
              title={showApiKey ? 'Ocultar chave' : 'Mostrar chave'}
            >
              {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-foreground">Temperatura</label>
            <span className="text-[10px] font-mono text-primary font-bold">{editing.temperature ?? 0.3}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={editing.temperature ?? 0.3}
            onChange={(e) => setEditing({ ...editing, temperature: parseFloat(e.target.value) })}
            className="w-full accent-primary cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>Preciso (0.0)</span>
            <span>Equilibrado (0.3)</span>
            <span>Criativo (1.0)</span>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-foreground">Limite Máximo de Tokens</label>
          <input
            type="number"
            min={256}
            max={8192}
            step={256}
            value={editing.maxTokens ?? 2048}
            onChange={(e) => setEditing({ ...editing, maxTokens: parseInt(e.target.value) || 2048 })}
            className={`${INPUT_BASE} font-mono`}
          />
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-foreground">Instruções de Sistema (RAG Context)</label>
          <button
            type="button"
            onClick={() => setEditing({ ...editing, systemPrompt: DEFAULT_SYSTEM_PROMPT })}
            className="text-[10px] text-primary hover:underline font-semibold cursor-pointer flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Restaurar padrão WinThor
          </button>
        </div>
        <textarea
          rows={3}
          value={editing.systemPrompt || ''}
          onChange={(e) => setEditing({ ...editing, systemPrompt: e.target.value })}
          placeholder="Instruções para orientar o assistente sobre o domínio do projeto..."
          className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
        />
      </div>

      {testResult && <DocSettingsLlmTestResult result={testResult} />}

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-primary/15">
        <button
          type="button"
          onClick={onTest}
          disabled={isTesting || !editing.model}
          className="px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
          <span>{isTesting ? 'Testando Conexão...' : 'Testar Conexão'}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="px-3.5 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:bg-muted cursor-pointer transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold shadow-xs cursor-pointer transition active:scale-95"
          >
            Salvar Provedor
          </button>
        </div>
      </div>
    </form>
  );
};
