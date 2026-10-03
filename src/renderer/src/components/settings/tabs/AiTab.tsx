import React from 'react';
import {
  Bot,
  AlertTriangle,
  Plus,
  Cpu,
  Activity,
  CheckCircle2,
  RotateCcw,
  Zap,
  Sliders,
  Trash2,
  Eye,
  EyeOff,
  Save
} from 'lucide-react';
import {
  AppSettings,
  LlmProviderConfig,
  LlmProviderType,
  LlmTestResult,
  DEFAULT_LLM_PROVIDER_TEMPLATES
} from '../../../../../shared/types';

interface AiTabProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  editingLlmProvider: Partial<LlmProviderConfig> | null;
  setEditingLlmProvider: (provider: Partial<LlmProviderConfig> | null) => void;
  isTestingLlmId: string | null;
  llmTestResults: Record<string, LlmTestResult>;
  showLlmFormKey: boolean;
  setShowLlmFormKey: (show: boolean) => void;
  handleApplyLlmTemplate: (template: Omit<LlmProviderConfig, 'id'>) => void;
  handleSaveLlmProvider: () => void;
  handleDeleteLlmProvider: (id: string) => void;
  handleToggleLlmProvider: (id: string, enabled: boolean) => void;
  handleSetActiveLlmProvider: (id: string) => void;
  handleTestLlmConnection: (provider: LlmProviderConfig) => Promise<void>;
}

export const AiTab: React.FC<AiTabProps> = ({
  settings,
  editingLlmProvider,
  setEditingLlmProvider,
  isTestingLlmId,
  llmTestResults,
  showLlmFormKey,
  setShowLlmFormKey,
  handleApplyLlmTemplate,
  handleSaveLlmProvider,
  handleDeleteLlmProvider,
  handleToggleLlmProvider,
  handleSetActiveLlmProvider,
  handleTestLlmConnection
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1" id="field-ai">
      <div className="lg:col-span-12 space-y-4 flex flex-col">
        <div className="cockpit-panel rounded-2xl p-5 space-y-4 shadow-xl border border-border bg-card">
          {/* Cabeçalho com Status Operacional */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  Provedores de IA & Motores LLM (BYOK)
                </h3>
                {(() => {
                  const active = (settings.llmProviders || []).find((p) =>
                    settings.activeLlmProviderId ? p.id === settings.activeLlmProviderId : p.enabled
                  );
                  return active ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 font-mono text-[10px] font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      ONLINE · {active.name} ({active.model})
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 font-mono text-[10px] font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3" />
                      NENHUM MOTOR ATIVO
                    </span>
                  );
                })()}
              </div>
              <p className="text-xs text-muted-foreground max-w-2xl">
                Configure suas próprias credenciais (<em>Bring Your Own Key</em>) para OpenAI, Gemini, Claude, Ollama ou OpenRouter.
                As chaves são salvas apenas localmente e usadas para o Copilot de Documentação e ferramentas MCP.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setEditingLlmProvider({
                  id: `llm-${Date.now()}`,
                  name: 'Novo Motor',
                  provider: 'openai',
                  baseUrl: 'https://api.openai.com/v1',
                  model: 'gpt-4o-mini',
                  temperature: 0.7,
                  maxTokens: 2048,
                  timeoutMs: 30000,
                  enabled: true
                })
              }
              className="px-3.5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Novo Motor de IA
            </button>
          </div>

          {/* Presets Rápidos de Conexão */}
          <div className="p-3.5 bg-muted/30 rounded-2xl border border-border/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-primary" />
                Presets de Conexão Rápida
              </span>
              <span className="text-[10px] text-muted-foreground">
                Clique em um preset para carregar o template no formulário
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {DEFAULT_LLM_PROVIDER_TEMPLATES.map((tmpl) => {
                const isLocal = tmpl.provider === 'ollama';
                return (
                  <button
                    key={tmpl.name}
                    type="button"
                    onClick={() => handleApplyLlmTemplate(tmpl)}
                    className="p-2.5 rounded-xl bg-card hover:bg-muted/80 border border-border hover:border-primary/50 text-left transition-all flex flex-col justify-between group shadow-2xs cursor-pointer"
                    title={`Configurar ${tmpl.name} (${tmpl.model})`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                        {tmpl.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-muted-foreground">
                      <span className="truncate">{tmpl.model}</span>
                      {isLocal && (
                        <span className="px-1 py-0.2 rounded bg-cyan-500/10 text-cyan-500 text-[9px] font-bold border border-cyan-500/20">
                          LOCAL
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista de Motores Cadastrados */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-primary" />
                Motores Configurados ({(settings.llmProviders || []).length})
              </span>
              <span className="text-[11px] text-muted-foreground">
                O motor selecionado é consultado pelo Copilot de Documentação e MCP.
              </span>
            </div>

            {(settings.llmProviders || []).length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-lg">
                Nenhum motor configurado. Selecione um preset acima ou clique em{' '}
                <strong className="text-foreground">Novo Motor de IA</strong>.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {(settings.llmProviders || []).map((provider) => {
                  const isActive = settings.activeLlmProviderId === provider.id;
                  const testResult = llmTestResults[provider.id];
                  const isTesting = isTestingLlmId === provider.id;

                  return (
                    <div
                      key={provider.id}
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
                              <span className="font-bold text-sm text-foreground truncate block">
                                {provider.name}
                              </span>
                              <span className="text-[10px] font-mono text-muted-foreground uppercase">
                                {provider.provider}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isActive ? (
                              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                ATIVO
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetActiveLlmProvider(provider.id)}
                                className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-lg bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary border border-border transition-colors cursor-pointer"
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
                            <span className="text-foreground font-bold truncate max-w-[180px]">
                              {provider.model}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Endpoint:</span>
                            <span
                              className="text-muted-foreground truncate max-w-[180px]"
                              title={provider.baseUrl || 'Endpoint padrão'}
                            >
                              {provider.baseUrl ? provider.baseUrl.replace('https://', '') : 'Oficial Cloud'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Credencial:</span>
                            <span className="text-muted-foreground">
                              {provider.apiKey
                                ? `••••••••${provider.apiKey.slice(-4)}`
                                : provider.provider === 'ollama'
                                ? 'Sem chave (Local)'
                                : 'Não informada'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] pt-1 border-t border-border/40 text-muted-foreground">
                            <span>Temp: {(provider.temperature ?? 0.7).toFixed(2)}</span>
                            <span>Timeout: {((provider.timeoutMs ?? 30000) / 1000).toFixed(0)}s</span>
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
                              <span className="px-1.5 py-0.5 rounded bg-background/80 border border-current text-[10px] font-bold shrink-0">
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
                            onClick={() => handleTestLlmConnection(provider)}
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
                            onClick={() => handleToggleLlmProvider(provider.id, !provider.enabled)}
                            className="px-2.5 py-1.5 rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-[11px] border border-border transition-all cursor-pointer shadow-2xs"
                          >
                            {provider.enabled ? 'Desativar' : 'Habilitar'}
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingLlmProvider({ ...provider })}
                            className="p-1.5 rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-all cursor-pointer shadow-2xs"
                            title="Editar parâmetros"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLlmProvider(provider.id)}
                            className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                            title="Remover este motor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal de Adicionar / Editar Provedor */}
          {editingLlmProvider && (
            <div className="p-5 rounded-2xl border border-primary/40 bg-card shadow-2xl space-y-4 animate-in fade-in-0">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary" />
                  {editingLlmProvider.id ? 'Configurar Motor de LLM' : 'Novo Motor de LLM'}
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingLlmProvider(null)}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Fechar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Nome de Exibição */}
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Nome de Identificação</label>
                  <input
                    type="text"
                    value={editingLlmProvider.name || ''}
                    onChange={(e) => setEditingLlmProvider({ ...editingLlmProvider, name: e.target.value })}
                    placeholder="Ex: OpenAI Produtivo, Ollama Local"
                    className="w-full bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground text-xs focus:outline-none focus:border-primary shadow-2xs"
                  />
                </div>

                {/* Família de Provedor */}
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Tipo de Provedor / Protocolo</label>
                  <select
                    value={editingLlmProvider.provider || 'openai'}
                    onChange={(e) => {
                      const prov = e.target.value as LlmProviderType;
                      const template = DEFAULT_LLM_PROVIDER_TEMPLATES.find((t) => t.provider === prov);
                      setEditingLlmProvider({
                        ...editingLlmProvider,
                        provider: prov,
                        baseUrl: template?.baseUrl || editingLlmProvider.baseUrl,
                        model: template?.model || editingLlmProvider.model
                      });
                    }}
                    className="w-full bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground text-xs focus:outline-none focus:border-primary shadow-2xs cursor-pointer"
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
                  <label className="font-semibold text-foreground">URL Base do Endpoint</label>
                  <input
                    type="text"
                    value={editingLlmProvider.baseUrl || ''}
                    onChange={(e) => setEditingLlmProvider({ ...editingLlmProvider, baseUrl: e.target.value })}
                    placeholder="Ex: https://api.openai.com/v1 ou http://localhost:11434/v1"
                    className="w-full bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary shadow-2xs"
                  />
                </div>

                {/* Nome do Modelo */}
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Identificador do Modelo</label>
                  <input
                    type="text"
                    value={editingLlmProvider.model || ''}
                    onChange={(e) => setEditingLlmProvider({ ...editingLlmProvider, model: e.target.value })}
                    placeholder="Ex: gpt-4o-mini, gemini-2.0-flash, claude-3-5-sonnet, llama3.2"
                    className="w-full bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary shadow-2xs"
                  />
                </div>

                {/* Chave de API */}
                <div className="space-y-1 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-foreground">Chave de API (API Key)</label>
                    <span className="text-[10px] text-muted-foreground">
                      {editingLlmProvider.provider === 'ollama'
                        ? 'Opcional para Ollama local'
                        : 'Armazenada localmente e sanitizada em exportações'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type={showLlmFormKey ? 'text' : 'password'}
                      value={editingLlmProvider.apiKey || ''}
                      onChange={(e) => setEditingLlmProvider({ ...editingLlmProvider, apiKey: e.target.value })}
                      placeholder="sk-..., AIzaSy..., ou deixe em branco para Ollama"
                      className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLlmFormKey(!showLlmFormKey)}
                      className="p-2 bg-card hover:bg-muted border border-border rounded-xl text-muted-foreground hover:text-foreground shadow-2xs cursor-pointer"
                      title={showLlmFormKey ? 'Ocultar chave' : 'Mostrar chave'}
                    >
                      {showLlmFormKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Temperatura Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-foreground">Temperatura (Calibração)</label>
                    <span className="font-mono text-muted-foreground">
                      {(editingLlmProvider.temperature ?? 0.7).toFixed(2)} (
                      {(editingLlmProvider.temperature ?? 0.7) <= 0.3
                        ? 'Precisa'
                        : (editingLlmProvider.temperature ?? 0.7) <= 0.6
                        ? 'Técnica/Código'
                        : (editingLlmProvider.temperature ?? 0.7) >= 0.8
                        ? 'Criativa'
                        : 'Balanceada'}
                      )
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={editingLlmProvider.temperature ?? 0.7}
                    onChange={(e) =>
                      setEditingLlmProvider({ ...editingLlmProvider, temperature: parseFloat(e.target.value) })
                    }
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>

                {/* Timeout em segundos */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-foreground">Timeout da Requisição (segundos)</label>
                    <span className="font-mono text-muted-foreground">
                      {((editingLlmProvider.timeoutMs ?? 30000) / 1000).toFixed(0)}s
                    </span>
                  </div>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={(editingLlmProvider.timeoutMs ?? 30000) / 1000}
                    onChange={(e) =>
                      setEditingLlmProvider({
                        ...editingLlmProvider,
                        timeoutMs: Math.max(5000, Number(e.target.value) * 1000)
                      })
                    }
                    className="w-full bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-1.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary shadow-2xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingLlmProvider(null)}
                  className="px-3 py-1.5 rounded-xl border border-border text-foreground hover:bg-muted text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveLlmProvider}
                  className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  Salvar Motor
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
