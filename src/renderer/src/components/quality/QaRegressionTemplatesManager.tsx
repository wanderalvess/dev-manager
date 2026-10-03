import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen,
  Plus,
  Trash2,
  Copy,
  Edit,
  Save,
  ArrowLeft,
  Layers,
  Table,
  Upload,
  Download,
  HelpCircle
} from 'lucide-react';
import {
  QaRegressionAssertion,
  QaRegressionStep,
  QaRegressionTemplate
} from '../../../../shared/types';
import { api } from '../../services/apiBridge';
import { showToast } from '../ToastHost';
import { extractBindsFromSql } from '../../utils/qaRegressionRendererUtils';
import {
  exportTemplateAsJsonFile,
  exportTemplatesBundleAsJsonFile
} from '../../utils/qaTemplateExportUtils';
import { QaRegressionTemplatesHelpModal } from './modals/QaRegressionTemplatesHelpModal';

interface QaRegressionTemplatesManagerProps {
  onBack: () => void;
  onSelectTemplate?: (templateId: string) => void;
}

export const QaRegressionTemplatesManager: React.FC<QaRegressionTemplatesManagerProps> = ({
  onBack,
  onSelectTemplate
}) => {
  const [templates, setTemplates] = useState<QaRegressionTemplate[]>([]);
  const [templatesDir, setTemplatesDir] = useState<string>('');
  const [editingTemplate, setEditingTemplate] = useState<QaRegressionTemplate | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);

  const loadTemplates = useCallback(async () => {
    try {
      if (api?.qaListTemplates) {
        const list = await api.qaListTemplates();
        setTemplates(list);
      }
      if (api?.qaGetTemplatesDir) {
        const dir = await api.qaGetTemplatesDir();
        setTemplatesDir(dir);
      }
    } catch (err: any) {
      console.warn('Erro ao carregar templates:', err);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleCreateNewTemplate = () => {
    const id = `template-${Date.now()}`;
    const newTmpl: QaRegressionTemplate = {
      id,
      name: 'Novo Cenário de Teste Regressivo',
      description: 'Descrição do fluxo a ser homologado',
      category: 'Geral',
      author: 'QA',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      defaultVariables: { codFilial: '1', numCupom: '4387' },
      steps: [
        {
          id: `step-${Date.now()}`,
          title: 'Passo 1 — Validação de Registro',
          tableName: 'PCNFSAID',
          enabled: true,
          query: 'SELECT * FROM PCNFSAID WHERE CODFILIAL = :codFilial AND NUMNOTA = :numCupom',
          assertions: [
            {
              id: `ass-${Date.now()}`,
              column: 'CODFILIAL',
              expectedType: 'literal',
              expectedValue: '1'
            }
          ]
        }
      ]
    };
    setEditingTemplate(newTmpl);
    setActiveStepIndex(0);
  };

  const handleDuplicateTemplate = (tmpl: QaRegressionTemplate) => {
    const duplicated: QaRegressionTemplate = {
      ...tmpl,
      id: `${tmpl.id}-copia-${Date.now()}`,
      name: `${tmpl.name} (Cópia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setEditingTemplate(duplicated);
    setActiveStepIndex(0);
  };

  const handleDeleteTemplate = async (tmpl: QaRegressionTemplate) => {
    if (!window.confirm(`Deseja realmente excluir o template "${tmpl.name}"?`)) return;

    try {
      if (api?.qaDeleteTemplate) {
        const ok = await api.qaDeleteTemplate(tmpl.id);
        if (ok) {
          showToast(`Template "${tmpl.name}" removido com sucesso.`, 'info');
          loadTemplates();
          if (editingTemplate?.id === tmpl.id) setEditingTemplate(null);
        }
      }
    } catch (err: any) {
      showToast(`Falha ao excluir template: ${err.message}`, 'error');
    }
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    if (!editingTemplate.name.trim()) {
      showToast('Informe um nome para o template.', 'info');
      return;
    }

    try {
      if (api?.qaSaveTemplate) {
        await api.qaSaveTemplate(editingTemplate);
        showToast('Template salvo com sucesso na pasta dedicada!', 'success');
        loadTemplates();
        setEditingTemplate(null);
      }
    } catch (err: any) {
      showToast(`Falha ao salvar template: ${err.message}`, 'error');
    }
  };

  const handleExportTemplateJson = (tmpl: QaRegressionTemplate) => {
    exportTemplateAsJsonFile(tmpl);
    showToast(`Template "${tmpl.name}" exportado com sucesso!`, 'success');
  };

  const handleExportAllTemplates = () => {
    if (templates.length === 0) {
      showToast('Nenhum template disponível para exportação.', 'info');
      return;
    }
    exportTemplatesBundleAsJsonFile(templates);
    showToast(`${templates.length} templates exportados com sucesso em lote!`, 'success');
  };

  const handleImportTemplateJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text) as QaRegressionTemplate;
        if (!parsed.id || !parsed.name || !Array.isArray(parsed.steps)) {
          showToast('Arquivo JSON de template inválido ou incompatível.', 'error');
          return;
        }
        if (api?.qaSaveTemplate) {
          await api.qaSaveTemplate(parsed);
          showToast(`Template "${parsed.name}" importado com sucesso!`, 'success');
          loadTemplates();
        }
      } catch (err: any) {
        showToast(`Erro ao importar template JSON: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Funções de manipulação de passos do template em edição
  const handleAddStep = () => {
    if (!editingTemplate) return;
    const newStep: QaRegressionStep = {
      id: `step-${Date.now()}`,
      title: `Novo Passo ${editingTemplate.steps.length + 1}`,
      tableName: 'PCPEDC',
      enabled: true,
      query: 'SELECT * FROM PCPEDC WHERE CODFILIAL = :codFilial AND NUMCUPOM = :numCupom',
      assertions: []
    };
    setEditingTemplate({
      ...editingTemplate,
      steps: [...editingTemplate.steps, newStep]
    });
    setActiveStepIndex(editingTemplate.steps.length);
  };

  const handleRemoveStep = (idx: number) => {
    if (!editingTemplate) return;
    const updated = editingTemplate.steps.filter((_, i) => i !== idx);
    setEditingTemplate({ ...editingTemplate, steps: updated });
    if (activeStepIndex >= updated.length) {
      setActiveStepIndex(Math.max(0, updated.length - 1));
    }
  };

  const handleAddAssertion = (stepIndex: number) => {
    if (!editingTemplate) return;
    const targetStep = editingTemplate.steps[stepIndex];
    if (!targetStep) return;

    const newAss: QaRegressionAssertion = {
      id: `ass-${Date.now()}`,
      column: 'VLTOTAL',
      expectedType: 'jsonPath',
      expectedValue: '$.vlTotal'
    };

    const updatedSteps = [...editingTemplate.steps];
    updatedSteps[stepIndex] = {
      ...targetStep,
      assertions: [...targetStep.assertions, newAss]
    };
    setEditingTemplate({ ...editingTemplate, steps: updatedSteps });
  };

  const handleRemoveAssertion = (stepIndex: number, assIndex: number) => {
    if (!editingTemplate) return;
    const targetStep = editingTemplate.steps[stepIndex];
    if (!targetStep) return;

    const updatedAssertions = targetStep.assertions.filter((_, i) => i !== assIndex);
    const updatedSteps = [...editingTemplate.steps];
    updatedSteps[stepIndex] = { ...targetStep, assertions: updatedAssertions };
    setEditingTemplate({ ...editingTemplate, steps: updatedSteps });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Top Header */}
      <div className="px-4 py-3 border-b border-border bg-card flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-md bg-background hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors cursor-pointer"
            title="Voltar para a Execução de Testes"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <span>Gerenciador de Cenários &amp; Templates de Regressivo</span>
            </h2>
            {templatesDir && (
              <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Pasta dedicada: {templatesDir}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {templates.length > 0 && !editingTemplate && (
            <button
              type="button"
              onClick={handleExportAllTemplates}
              className="px-2.5 py-1.5 rounded-md bg-background hover:bg-muted text-foreground border border-border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Exportar todos os templates em lote (arquivo JSON único para backup)"
            >
              <Download className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Exportar Todos</span>
            </button>
          )}

          <label className="px-2.5 py-1.5 rounded-md bg-background hover:bg-muted text-foreground border border-border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Importar JSON</span>
            <input type="file" accept=".json" onChange={handleImportTemplateJson} className="hidden" />
          </label>

          <button
            type="button"
            onClick={handleCreateNewTemplate}
            className="px-3 py-1.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Template</span>
          </button>

          <button
            type="button"
            onClick={() => setIsHelpModalOpen(true)}
            className="px-2.5 py-1.5 rounded-md bg-background hover:bg-muted text-muted-foreground hover:text-foreground border border-border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Guia Prático: Como usar, configurar asserções e exportar templates"
          >
            <HelpCircle className="w-3.5 h-3.5 text-primary" />
            <span>Como Usar</span>
          </button>
        </div>
      </div>

      {/* Visão de Edição de Template */}
      {editingTemplate ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Barra de Ações de Edição */}
          <div className="px-4 py-2.5 border-b border-border bg-card flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 flex-1">
              <input
                type="text"
                value={editingTemplate.name}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                placeholder="Nome do Cenário"
                className="bg-background border border-border rounded-md px-2.5 py-1 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-72"
              />
              <input
                type="text"
                value={editingTemplate.category || ''}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value })}
                placeholder="Categoria (ex: Vendas PDV)"
                className="bg-background border border-border rounded-md px-2.5 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-40"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleExportTemplateJson(editingTemplate)}
                className="px-3 py-1.5 rounded-md bg-background hover:bg-muted text-foreground border border-border text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Exportar este template para arquivo JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar JSON</span>
              </button>
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="px-3 py-1.5 rounded-md bg-background hover:bg-muted text-foreground border border-border text-xs font-medium cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveTemplate}
                className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Template</span>
              </button>
            </div>
          </div>

          {/* Área com Passos e Asserções */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Lista Lateral de Passos */}
            <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-border bg-card/40 flex flex-col shrink-0 overflow-hidden">
              <div className="p-3 border-b border-border flex items-center justify-between shrink-0">
                <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">
                  Passos / Queries ({editingTemplate.steps.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddStep}
                  className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                >
                  + Passo
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {editingTemplate.steps.map((step, idx) => (
                  <div
                    key={step.id}
                    onClick={() => setActiveStepIndex(idx)}
                    className={`p-2.5 rounded-md text-xs cursor-pointer border transition-colors flex items-center justify-between ${
                      activeStepIndex === idx
                        ? 'bg-card border-primary/40 border-l-2 border-l-primary text-foreground font-semibold shadow-xs'
                        : 'bg-card/50 border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    }`}
                  >
                    <div className="truncate flex-1 pr-2">
                      <div className="text-[10px] text-muted-foreground font-mono">
                        #{String(idx + 1).padStart(2, '0')} {step.tableName ? `[${step.tableName}]` : ''}
                      </div>
                      <div className="truncate font-sans">{step.title}</div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveStep(idx);
                      }}
                      className="text-muted-foreground hover:text-red-500 p-1 cursor-pointer transition-colors"
                      title="Excluir passo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Editor do Passo Selecionado */}
            {editingTemplate.steps[activeStepIndex] && (
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {(() => {
                  const currentStep = editingTemplate.steps[activeStepIndex];
                  const detectedBinds = extractBindsFromSql(currentStep.query);

                  return (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                            Título do Passo:
                          </label>
                          <input
                            type="text"
                            value={currentStep.title}
                            onChange={(e) => {
                              const updated = [...editingTemplate.steps];
                              updated[activeStepIndex] = { ...currentStep, title: e.target.value };
                              setEditingTemplate({ ...editingTemplate, steps: updated });
                            }}
                            className="w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                            Tabela Principal WinThor:
                          </label>
                          <input
                            type="text"
                            value={currentStep.tableName || ''}
                            onChange={(e) => {
                              const updated = [...editingTemplate.steps];
                              updated[activeStepIndex] = {
                                ...currentStep,
                                tableName: e.target.value.toUpperCase()
                              };
                              setEditingTemplate({ ...editingTemplate, steps: updated });
                            }}
                            placeholder="ex: PCNFSAID, PCPEDC, PCMOV"
                            className="w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-xs font-mono uppercase text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>

                      {/* Editor SQL da Query */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-muted-foreground">
                            Comando SQL (suporta :binds como :codFilial, :numCupom):
                          </label>
                          {detectedBinds.length > 0 && (
                            <span className="text-[10px] text-primary font-mono font-semibold">
                              Binds detectados: {detectedBinds.map((b) => `:${b}`).join(', ')}
                            </span>
                          )}
                        </div>
                        <textarea
                          value={currentStep.query}
                          onChange={(e) => {
                            const updated = [...editingTemplate.steps];
                            updated[activeStepIndex] = { ...currentStep, query: e.target.value };
                            setEditingTemplate({ ...editingTemplate, steps: updated });
                          }}
                          rows={6}
                          className="w-full bg-background border border-border rounded-md p-2.5 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                          spellCheck={false}
                        />
                      </div>

                      {/* Asserções deste Passo */}
                      <div className="border border-border rounded-md bg-card p-3 space-y-3">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <Table className="w-3.5 h-3.5 text-primary" />
                            <span>Regras de Asserção de Colunas</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddAssertion(activeStepIndex)}
                            className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                          >
                            + Adicionar Coluna
                          </button>
                        </div>

                        {currentStep.assertions.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-3 italic text-center font-mono">
                            Nenhuma asserção configurada. O passo apenas executará a query e retornará as linhas.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {currentStep.assertions.map((ass, aIdx) => (
                              <div
                                key={ass.id}
                                className="flex flex-wrap items-center gap-2 bg-background border border-border rounded-md p-1.5"
                              >
                                <input
                                  type="text"
                                  value={ass.column}
                                  onChange={(e) => {
                                    const updated = [...currentStep.assertions];
                                    updated[aIdx] = { ...ass, column: e.target.value.toUpperCase() };
                                    const updatedSteps = [...editingTemplate.steps];
                                    updatedSteps[activeStepIndex] = {
                                      ...currentStep,
                                      assertions: updated
                                    };
                                    setEditingTemplate({ ...editingTemplate, steps: updatedSteps });
                                  }}
                                  placeholder="COLUNA"
                                  className="bg-card border border-border rounded px-2 py-1 text-xs font-mono font-semibold text-foreground w-36 uppercase focus:outline-none focus:ring-1 focus:ring-primary"
                                />

                                <select
                                  value={ass.expectedType}
                                  onChange={(e) => {
                                    const updated = [...currentStep.assertions];
                                    updated[aIdx] = {
                                      ...ass,
                                      expectedType: e.target.value as any
                                    };
                                    const updatedSteps = [...editingTemplate.steps];
                                    updatedSteps[activeStepIndex] = {
                                      ...currentStep,
                                      assertions: updated
                                    };
                                    setEditingTemplate({ ...editingTemplate, steps: updatedSteps });
                                  }}
                                  className="bg-card border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                  <option value="jsonPath">JSONPath (do JSON)</option>
                                  <option value="literal">Literal (Fixo)</option>
                                  <option value="notNull">Preenchido (&lt;S&gt;)</option>
                                  <option value="null">Vazio / Nulo (&lt;N&gt;)</option>
                                  <option value="zero">Zero (&lt;0&gt;)</option>
                                  <option value="regex">Expressão Regular</option>
                                </select>

                                {ass.expectedType !== 'notNull' &&
                                  ass.expectedType !== 'null' &&
                                  ass.expectedType !== 'zero' && (
                                    <input
                                      type="text"
                                      value={ass.expectedValue || ''}
                                      onChange={(e) => {
                                        const updated = [...currentStep.assertions];
                                        updated[aIdx] = { ...ass, expectedValue: e.target.value };
                                        const updatedSteps = [...editingTemplate.steps];
                                        updatedSteps[activeStepIndex] = {
                                          ...currentStep,
                                          assertions: updated
                                        };
                                        setEditingTemplate({
                                          ...editingTemplate,
                                          steps: updatedSteps
                                        });
                                      }}
                                      placeholder={
                                        ass.expectedType === 'jsonPath'
                                          ? '$.vlTotal'
                                          : 'Valor esperado'
                                      }
                                      className="bg-card border border-border rounded px-2 py-1 text-xs font-mono text-foreground flex-1 min-w-[150px] focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                  )}

                                <button
                                  type="button"
                                  onClick={() => handleRemoveAssertion(activeStepIndex, aIdx)}
                                  className="text-muted-foreground hover:text-red-500 text-xs p-1 cursor-pointer transition-colors"
                                  title="Remover asserção"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Lista Geral de Templates */
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="border border-border rounded-md bg-card p-4 flex flex-col justify-between hover:border-primary/50 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-muted text-muted-foreground border border-border">
                      {tmpl.category || 'Geral'}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      v{tmpl.version || '1.0.0'}
                    </span>
                  </div>

                  <h3 className="font-semibold text-sm text-foreground mb-1">
                    {tmpl.name}
                  </h3>

                  <p className="text-xs text-muted-foreground line-clamp-3 mb-3">
                    {tmpl.description || 'Sem descrição.'}
                  </p>

                  <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-2 mb-4">
                    <span>
                      <b className="text-foreground">{tmpl.steps.length}</b> queries
                    </span>
                    <span className="text-border">|</span>
                    <span>
                      <b className="text-foreground">
                        {tmpl.steps.reduce((acc, s) => acc + s.assertions.length, 0)}
                      </b>{' '}
                      asserções
                    </span>
                  </div>
                </div>

                <div className="border-t border-border pt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTemplate(tmpl);
                        setActiveStepIndex(0);
                      }}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Editar template"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDuplicateTemplate(tmpl)}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Duplicar template"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExportTemplateJson(tmpl)}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Exportar para arquivo JSON"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(tmpl)}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                      title="Excluir template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {onSelectTemplate && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTemplate(tmpl.id);
                        onBack();
                      }}
                      className="px-2.5 py-1 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Selecionar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Guia de Ajuda de Templates */}
      <QaRegressionTemplatesHelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
    </div>
  );
};
