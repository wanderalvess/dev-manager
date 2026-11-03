import React, { useEffect, useRef, useState } from 'react';
import { Sliders, Eye, EyeOff, Save } from 'lucide-react';
import { LlmProviderConfig, LlmProviderType } from '../../../../../shared/types';
import {
  apiKeyPlaceholder,
  describeTemperature,
  formatTimeoutSeconds,
  secondsToTimeoutMs,
  switchProviderType
} from '../../../utils/aiTabUtils';
import { SETTINGS_INPUT_CLASS, SETTINGS_GHOST_BUTTON_CLASS, SETTINGS_PRIMARY_BUTTON_CLASS, SettingsAdvanced } from '../SettingsCard';

interface AiProviderFormProps {
  provider: Partial<LlmProviderConfig>;
  onChange: (provider: Partial<LlmProviderConfig> | null) => void;
  showKey: boolean;
  onToggleShowKey: (show: boolean) => void;
  onSave: () => void;
}

/**
 * Guarda o texto digitado e só aplica o piso de 5s ao sair do campo: com o valor preso a
 * `max(5, n)` a cada tecla, digitar "45" virava "55" (o "4" já era corrigido para 5).
 */
const TimeoutInput: React.FC<{ timeoutMs: number | undefined; onCommit: (timeoutMs: number) => void }> = ({
  timeoutMs,
  onCommit
}) => {
  const [text, setText] = useState(formatTimeoutSeconds(timeoutMs));

  useEffect(() => {
    setText(formatTimeoutSeconds(timeoutMs));
  }, [timeoutMs]);

  const handleChange = (value: string) => {
    setText(value);
    const seconds = Number(value);
    if (value.trim() && Number.isFinite(seconds)) onCommit(secondsToTimeoutMs(seconds));
  };

  return (
    <input id="ai-provider-form-7"
      type="number"
      min="5"
      max="180"
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={() => setText(formatTimeoutSeconds(timeoutMs))}
      className={SETTINGS_INPUT_CLASS}
    />
  );
};

export const AiProviderForm: React.FC<AiProviderFormProps> = ({
  provider,
  onChange,
  showKey,
  onToggleShowKey,
  onSave
}) => {
  const rootRef = useRef<HTMLDivElement>(null);

  // O formulário abre abaixo da lista de motores, fora da tela de quem clicou num preset ou em
  // "Novo Motor": traz ele para a vista ao abrir (ou ao trocar de motor).
  useEffect(() => {
    rootRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [provider.id]);

  return (
  <div ref={rootRef} className="p-5 rounded-xl border border-primary/40 bg-card space-y-4 animate-in fade-in-0">
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
      {/* Nome do Modelo */}
      <div className="space-y-1">
        <label htmlFor="ai-provider-form-4" className="font-semibold text-foreground">Identificador do Modelo</label>
        <input id="ai-provider-form-4"
          type="text"
          value={provider.model || ''}
          onChange={(e) => onChange({ ...provider, model: e.target.value })}
          placeholder="Ex: gpt-4o-mini, gemini-2.0-flash, claude-sonnet-5-5, llama3.2"
          className={SETTINGS_INPUT_CLASS}
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
            placeholder={apiKeyPlaceholder(provider.provider)}
            className={`${SETTINGS_INPUT_CLASS} flex-1`}
          />
          <button
            type="button"
            onClick={() => onToggleShowKey(!showKey)}
            className="h-9 w-9 shrink-0 flex items-center justify-center bg-card hover:bg-muted border border-border rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
            title={showKey ? 'Ocultar chave' : 'Mostrar chave'} aria-label={showKey ? 'Ocultar chave' : 'Mostrar chave'}
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

    </div>

    <SettingsAdvanced summary="Avançado: nome, endereço, protocolo, temperatura e timeout" defaultOpen={provider.provider === 'custom' || !provider.baseUrl}>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
      {/* Nome de Exibição */}
      <div className="space-y-1">
        <label htmlFor="ai-provider-form-1" className="font-semibold text-foreground">Nome de Identificação</label>
        <input id="ai-provider-form-1"
          type="text"
          value={provider.name || ''}
          onChange={(e) => onChange({ ...provider, name: e.target.value })}
          placeholder="Ex: OpenAI Produtivo, Ollama Local"
          className={SETTINGS_INPUT_CLASS.replace('font-mono', 'font-sans')}
        />
      </div>

      {/* Família de Provedor */}
      <div className="space-y-1">
        <label htmlFor="ai-provider-form-2" className="font-semibold text-foreground">Tipo de Provedor / Protocolo</label>
        <select id="ai-provider-form-2"
          value={provider.provider || 'openai'}
          onChange={(e) => onChange(switchProviderType(provider, e.target.value as LlmProviderType))}
          className={`${SETTINGS_INPUT_CLASS.replace('font-mono', 'font-sans')} cursor-pointer`}
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
          className={SETTINGS_INPUT_CLASS}
        />
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
        <TimeoutInput
          timeoutMs={provider.timeoutMs}
          onCommit={(timeoutMs) => onChange({ ...provider, timeoutMs })}
        />
      </div>
    </div>
    </SettingsAdvanced>

    <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={SETTINGS_GHOST_BUTTON_CLASS}
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={onSave}
        className={SETTINGS_PRIMARY_BUTTON_CLASS}
      >
        <Save className="w-3.5 h-3.5" />
        {provider.id ? 'Aplicar' : 'Adicionar motor'}
      </button>
    </div>
  </div>
  );
};
