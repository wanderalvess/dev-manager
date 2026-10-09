import React from 'react';
import { Sliders, Eye, EyeOff, Save } from 'lucide-react';
import { LlmProviderConfig, LlmProviderType } from '../../../../../shared/types';
import {
  describeTemperature,
  formatTimeoutSeconds,
  secondsToTimeoutMs,
  switchProviderType
} from '../../../utils/aiTabUtils';

interface AiProviderFormProps {
  provider: Partial<LlmProviderConfig>;
  onChange: (provider: Partial<LlmProviderConfig> | null) => void;
  showKey: boolean;
  onToggleShowKey: (show: boolean) => void;
  onSave: () => void;
}

export const AiProviderForm: React.FC<AiProviderFormProps> = ({
  provider,
  onChange,
  showKey,
  onToggleShowKey,
  onSave
}) => (
  <div className="p-5 rounded-xl border border-primary/40 bg-card shadow-2xl space-y-4 animate-in fade-in-0">
    <div className="flex items-center justify-between pb-2 border-b border-border">
      <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
        <Sliders className="w-4 h-4 text-primary" />
        {provider.id ? 'Configurar Motor de LLM' : 'Novo Motor de LLM'}
      </h4>
      <button
        type="button"
        onClick={() => onChange(null)}
        className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
      >
        Fechar
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
      {/* Nome de Exibição */}
      <div className="space-y-1">
        <label htmlFor="ai-provider-form-1" className="font-semibold text-foreground">Nome de Identificação</label>
        <input id="ai-provider-form-1"
          type="text"
          value={provider.name || ''}
          onChange={(e) => onChange({ ...provider, name: e.target.value })}
          placeholder="Ex: OpenAI Produtivo, Ollama Local"
          className="w-full bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground text-xs focus:outline-hidden focus:border-primary shadow-2xs"
        />
      </div>

      {/* Família de Provedor */}
      <div className="space-y-1">
        <label htmlFor="ai-provider-form-2" className="font-semibold text-foreground">Tipo de Provedor / Protocolo</label>
        <select id="ai-provider-form-2"
          value={provider.provider || 'openai'}
          onChange={(e) => onChange(switchProviderType(provider, e.target.value as LlmProviderType))}
          className="w-full bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground text-xs focus:outline-hidden focus:border-primary shadow-2xs cursor-pointer"
        >
          <option value="openai">OpenAI / Compatível (OpenAI, Groq, DeepSeek)</option>
          <option value="gemini">Google Gemini (REST nativo v1beta)</option>
          <option value="anthropic">Anthropic Claude (Messages API)</option>
          <option value="ollama">Ollama (Modelo Local Offline)</option>
          <option value="openrouter">OpenRouter</option>
          <option value="custom">Personalizado (OpenAI compatible)</option>
        </select>
      </div>

      {/* URL Base */}
      <div className="space-y-1">
        <label htmlFor="ai-provider-form-3" className="font-semibold text-foreground">URL Base do Endpoint</label>
        <input id="ai-provider-form-3"
          type="text"
          value={provider.baseUrl || ''}
          onChange={(e) => onChange({ ...provider, baseUrl: e.target.value })}
          placeholder="Ex: https://api.openai.com/v1 ou http://localhost:11434/v1"
          className="w-full bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-hidden focus:border-primary shadow-2xs"
        />
      </div>

      {/* Nome do Modelo */}
      <div className="space-y-1">
        <label htmlFor="ai-provider-form-4" className="font-semibold text-foreground">Identificador do Modelo</label>
        <input id="ai-provider-form-4"
          type="text"
          value={provider.model || ''}
          onChange={(e) => onChange({ ...provider, model: e.target.value })}
          placeholder="Ex: gpt-4o-mini, gemini-2.0-flash, claude-3-5-sonnet, llama3.2"
          className="w-full bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-hidden focus:border-primary shadow-2xs"
        />
      </div>

      {/* Chave de API */}
      <div className="space-y-1 md:col-span-2">
        <div className="flex items-center justify-between">
          <label htmlFor="ai-provider-form-5" className="font-semibold text-foreground">Chave de API (API Key)</label>
          <span className="text-2xs text-muted-foreground">
            {provider.provider === 'ollama'
              ? 'Opcional para Ollama local'
              : 'Armazenada localmente e sanitizada em exportações'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <input id="ai-provider-form-5"
            type={showKey ? 'text' : 'password'}
            value={provider.apiKey || ''}
            onChange={(e) => onChange({ ...provider, apiKey: e.target.value })}
            placeholder="sk-..., AIzaSy..., ou deixe em branco para Ollama"
            className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-hidden focus:border-primary shadow-2xs"
          />
          <button
            type="button"
            onClick={() => onToggleShowKey(!showKey)}
            className="p-2 bg-card hover:bg-muted border border-border rounded-xl text-muted-foreground hover:text-foreground shadow-2xs cursor-pointer"
            title={showKey ? 'Ocultar chave' : 'Mostrar chave'} aria-label={showKey ? 'Ocultar chave' : 'Mostrar chave'}
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Temperatura Slider */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label htmlFor="ai-provider-form-6" className="font-semibold text-foreground">Temperatura (Calibração)</label>
          <span className="font-mono text-muted-foreground">
            {(provider.temperature ?? 0.7).toFixed(2)} ({describeTemperature(provider.temperature)})
          </span>
        </div>
        <input id="ai-provider-form-6"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={provider.temperature ?? 0.7}
          onChange={(e) => onChange({ ...provider, temperature: parseFloat(e.target.value) })}
          className="w-full accent-primary cursor-pointer"
        />
      </div>

      {/* Timeout em segundos */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label htmlFor="ai-provider-form-7" className="font-semibold text-foreground">Timeout da Requisição (segundos)</label>
          <span className="font-mono text-muted-foreground">{formatTimeoutSeconds(provider.timeoutMs)}s</span>
        </div>
        <input id="ai-provider-form-7"
          type="number"
          min="5"
          max="180"
          value={(provider.timeoutMs ?? 30000) / 1000}
          onChange={(e) => onChange({ ...provider, timeoutMs: secondsToTimeoutMs(Number(e.target.value)) })}
          className="w-full bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-1.5 text-foreground font-mono text-xs focus:outline-hidden focus:border-primary shadow-2xs"
        />
      </div>
    </div>

    <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
      <button
        type="button"
        onClick={() => onChange(null)}
        className="px-3 py-1.5 rounded-xl border border-border text-foreground hover:bg-muted text-xs font-semibold transition-all cursor-pointer"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={onSave}
        className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
      >
        <Save className="w-3.5 h-3.5" />
        Salvar Motor
      </button>
    </div>
  </div>
);
