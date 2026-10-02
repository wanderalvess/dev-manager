import React from 'react';
import {
  CheckCheck,
  AlertTriangle,
  Plus,
  Activity,
  CheckCircle2,
  Trash2,
  Eye,
  EyeOff,
  Save,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import {
  AppSettings,
  QualitySourceConfig,
  QualitySourceType,
  QualitySourceTemplate,
  DEFAULT_QUALITY_SOURCE_TEMPLATES
} from '../../../../../shared/types';

interface QualityTabProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  editingQualitySource: Partial<QualitySourceConfig> | null;
  setEditingQualitySource: (source: Partial<QualitySourceConfig> | null) => void;
  showQualityToken: boolean;
  setShowQualityToken: (show: boolean) => void;
  handleApplyQualityTemplate: (template: QualitySourceTemplate) => void;
  handleSaveQualitySource: () => void;
  handleDeleteQualitySource: (id: string) => void;
  handleToggleQualitySource: (id: string, enabled: boolean) => void;
  handleSetActiveQualitySource: (id: string) => void;
  handleTestQualityConnection: (source: QualitySourceConfig) => void;
  testingQualityId: string | null;
  testResults: Record<string, { success: boolean; message: string }>;
}

export const QualityTab: React.FC<QualityTabProps> = ({
  settings,
  editingQualitySource,
  setEditingQualitySource,
  showQualityToken,
  setShowQualityToken,
  handleApplyQualityTemplate,
  handleSaveQualitySource,
  handleDeleteQualitySource,
  handleToggleQualitySource: _handleToggleQualitySource,
  handleSetActiveQualitySource,
  handleTestQualityConnection,
  testingQualityId,
  testResults
}) => {
  const sources = settings.qualitySources || [];
  const activeSourceId = settings.activeQualitySourceId;

  const getProviderBadge = (type: QualitySourceType) => {
    switch (type) {
      case 'zephyr-scale':
        return { label: 'Zephyr Scale', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' };
      case 'zephyr-squad':
        return { label: 'Zephyr Squad', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25' };
      case 'jira':
        return { label: 'Jira Software', color: 'bg-blue-500/10 text-blue-400 border-blue-500/25' };
      case 'azure-test-plans':
        return { label: 'Azure Test Plans', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25' };
      case 'custom-webhook':
      default:
        return { label: 'Webhook / Custom', color: 'bg-purple-500/10 text-purple-400 border-purple-500/25' };
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1" id="field-quality">
      <div className="lg:col-span-12 space-y-4 flex flex-col">
        <div className="cockpit-panel rounded-2xl p-5 space-y-4 shadow-xl border border-border bg-card">
          {/* Cabeçalho com Status */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <CheckCheck className="w-5 h-5 text-primary" />
                  Fontes de Informação de Qualidade &amp; Testes (QA / PO)
                </h3>
                {(() => {
                  const active = sources.find((s) => (activeSourceId ? s.id === activeSourceId : s.enabled));
                  return active ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 font-mono text-[10px] font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      ATIVA · {active.name} ({getProviderBadge(active.type).label})
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 font-mono text-[10px] font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3" />
                      NENHUMA FONTE ATIVA
                    </span>
                  );
                })()}
              </div>
              <p className="text-xs text-muted-foreground">
                Conecte ferramentas de gestão de testes (Zephyr Scale, Zephyr Squad, Jira e Azure DevOps) para sincronizar cenários, casos de teste e planos de homologação.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setEditingQualitySource({
                  id: `quality-${Date.now()}`,
                  name: 'Nova Fonte de Testes',
                  type: 'zephyr-scale',
                  baseUrl: 'https://api.zephyrscale.smartbear.com/v2',
                  enabled: true
                })
              }
              className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Fonte Manual</span>
            </button>
          </div>

          {/* Cards de Templates Rápidos */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Conexões Pré-Configuradas &amp; Templates Rápidos:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {DEFAULT_QUALITY_SOURCE_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.name}
                  type="button"
                  onClick={() => handleApplyQualityTemplate(tmpl)}
                  className="p-3 rounded-xl border border-border/80 bg-muted/30 hover:bg-muted/70 hover:border-primary/40 text-left transition space-y-1.5 group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      {tmpl.name}
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-primary opacity-60 group-hover:opacity-100" />
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {tmpl.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Formulário de Edição (Se ativo) */}
          {editingQualitySource && (
            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-primary/20">
                <span className="text-xs font-bold text-foreground flex items-center gap-2">
                  <CheckCheck className="w-4 h-4 text-primary" />
                  {sources.some((s) => s.id === editingQualitySource.id)
                    ? 'Editar Conexão de Teste'
                    : 'Nova Conexão de Teste'}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingQualitySource(null)}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-foreground block mb-1">Nome da Conexão / Rótulo</label>
                  <input
                    type="text"
                    value={editingQualitySource.name || ''}
                    onChange={(e) => setEditingQualitySource({ ...editingQualitySource, name: e.target.value })}
                    placeholder="Ex: Zephyr Scale - Squad Faturamento"
                    className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">Provedor / Tipo</label>
                  <select
                    value={editingQualitySource.type || 'zephyr-scale'}
                    onChange={(e) =>
                      setEditingQualitySource({
                        ...editingQualitySource,
                        type: e.target.value as QualitySourceType
                      })
                    }
                    className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="zephyr-scale">Zephyr Scale (API v2 / Cloud)</option>
                    <option value="zephyr-squad">Zephyr Squad / Jira Server</option>
                    <option value="jira">Jira Software (Bugs &amp; Histórias)</option>
                    <option value="azure-test-plans">Azure DevOps Test Plans</option>
                    <option value="custom-webhook">Webhook / API Customizada</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="font-bold text-foreground block mb-1">URL Base da API / Instância</label>
                  <input
                    type="text"
                    value={editingQualitySource.baseUrl || ''}
                    onChange={(e) => setEditingQualitySource({ ...editingQualitySource, baseUrl: e.target.value })}
                    placeholder="Ex: https://api.zephyrscale.smartbear.com/v2 ou https://empresa.atlassian.net"
                    className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-foreground font-mono focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">Chave do Projeto (Project Key)</label>
                  <input
                    type="text"
                    value={editingQualitySource.projectKey || ''}
                    onChange={(e) => setEditingQualitySource({ ...editingQualitySource, projectKey: e.target.value })}
                    placeholder="Ex: WIN, DIST, CORE"
                    className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-foreground font-mono focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">Plano ou Ciclo de Teste (Opcional)</label>
                  <input
                    type="text"
                    value={editingQualitySource.testPlanKey || ''}
                    onChange={(e) => setEditingQualitySource({ ...editingQualitySource, testPlanKey: e.target.value })}
                    placeholder="Ex: WIN-P12, Cycle-1, Test Suite ID"
                    className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-foreground font-mono focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">E-mail / Usuário de Autenticação</label>
                  <input
                    type="text"
                    value={editingQualitySource.userEmail || ''}
                    onChange={(e) => setEditingQualitySource({ ...editingQualitySource, userEmail: e.target.value })}
                    placeholder="seu.email@empresa.com.br (para Jira Cloud)"
                    className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-foreground">API Token / Zephyr Token / PAT</label>
                    {editingQualitySource.hasApiToken && !editingQualitySource.apiToken && (
                      <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Token salvo e protegido
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showQualityToken ? 'text' : 'password'}
                      value={editingQualitySource.apiToken || ''}
                      onChange={(e) => setEditingQualitySource({ ...editingQualitySource, apiToken: e.target.value })}
                      placeholder={editingQualitySource.hasApiToken ? 'Deixe em branco para manter o token atual' : 'Cole seu token de autenticação'}
                      className="w-full pl-3 pr-9 py-1.5 bg-background border border-border rounded-lg text-foreground font-mono focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowQualityToken(!showQualityToken)}
                      className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                      title={showQualityToken ? 'Ocultar token' : 'Revelar token'}
                    >
                      {showQualityToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="font-bold text-foreground block mb-1">Filtro JQL / Query de Testes &amp; Bugs (Opcional)</label>
                  <input
                    type="text"
                    value={editingQualitySource.jqlFilter || ''}
                    onChange={(e) => setEditingQualitySource({ ...editingQualitySource, jqlFilter: e.target.value })}
                    placeholder='Ex: issuetype in (Test, Bug) AND status != Closed ORDER BY priority DESC'
                    className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-foreground font-mono focus:outline-none focus:border-primary text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-primary/20">
                <button
                  type="button"
                  onClick={() => setEditingQualitySource(null)}
                  className="px-3 py-1.5 rounded-lg hover:bg-muted text-muted-foreground text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveQualitySource}
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 hover:bg-primary/90 transition shadow-xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Fonte de Teste</span>
                </button>
              </div>
            </div>
          )}

          {/* Lista de Fontes Configuradas */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Fontes Configuradas ({sources.length}):
            </span>

            {sources.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-border text-center space-y-2">
                <CheckCheck className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
                <p className="text-xs text-muted-foreground">
                  Nenhuma fonte de qualidade configurada ainda. Clique em um dos templates acima para conectar seu Zephyr ou Jira!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sources.map((source) => {
                  const badge = getProviderBadge(source.type);
                  const isCurrentActive = activeSourceId ? source.id === activeSourceId : source.enabled;
                  const testRes = testResults[source.id];
                  const isTesting = testingQualityId === source.id;

                  return (
                    <div
                      key={source.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isCurrentActive
                          ? 'bg-card border-primary/40 shadow-xs'
                          : 'bg-card/50 border-border opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-foreground">{source.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.color}`}>
                            {badge.label}
                          </span>
                          {source.projectKey && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground border border-border">
                              Projeto: {source.projectKey}
                            </span>
                          )}
                          {isCurrentActive && (
                            <span className="text-[10px] font-bold text-emerald-500 font-mono flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Padrão / Ativa
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground truncate">
                          {source.baseUrl}
                        </div>
                        {testRes && (
                          <div
                            className={`text-[11px] font-medium flex items-center gap-1 ${
                              testRes.success ? 'text-emerald-500' : 'text-rose-500'
                            }`}
                          >
                            {testRes.success ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                            <span>{testRes.message}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleTestQualityConnection(source)}
                          disabled={isTesting}
                          className="px-2.5 py-1 text-xs rounded-lg border border-border hover:bg-muted text-foreground transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                          title="Validar parâmetros da conexão"
                        >
                          <Activity className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
                          <span>{isTesting ? 'Testando...' : 'Testar'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSetActiveQualitySource(source.id)}
                          className={`px-2.5 py-1 text-xs rounded-lg border transition cursor-pointer ${
                            isCurrentActive
                              ? 'bg-primary/10 border-primary/30 text-primary font-bold'
                              : 'border-border hover:bg-muted text-muted-foreground'
                          }`}
                          title="Definir esta fonte como ativa no QA Hub"
                        >
                          {isCurrentActive ? 'Ativa' : 'Definir Ativa'}
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingQualitySource(source)}
                          className="px-2.5 py-1 text-xs rounded-lg border border-border hover:bg-muted text-foreground transition cursor-pointer"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteQualitySource(source.id)}
                          className="p-1.5 text-muted-foreground hover:text-rose-500 rounded-lg hover:bg-muted transition cursor-pointer"
                          title="Excluir fonte"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
