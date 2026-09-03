import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  FolderOpen,
  Terminal,
  Server,
  Activity,
  Code2,
  Globe,
  Flame,
  Save,
  Clock,
  Layers
} from 'lucide-react';
import {
  AutomationProfile,
  AutomationStep,
  AutomationStepType
} from '../../../shared/types';

interface ProfileEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: AutomationProfile | null;
  onSave: (savedProfile: AutomationProfile) => Promise<void>;
  onDelete?: (profileId: string) => Promise<void>;
}

const STEP_TYPE_OPTIONS: { type: AutomationStepType; label: string; desc: string; icon: any }[] = [
  {
    type: 'command',
    label: 'Comando / Script (.bat, npm, mvnw, gradlew, docker)',
    desc: 'Executa um comando ou script em uma pasta específica',
    icon: Terminal
  },
  {
    type: 'kill-port',
    label: 'Liberar Porta (Kill Process)',
    desc: 'Encerra qualquer processo ocupando uma porta de rede',
    icon: Activity
  },
  {
    type: 'service-start',
    label: 'Iniciar Serviço Windows',
    desc: 'Inicia um serviço do Windows pelo nome',
    icon: Server
  },
  {
    type: 'service-stop',
    label: 'Parar Serviço Windows',
    desc: 'Para um serviço do Windows antes de rodar os projetos',
    icon: Server
  },
  {
    type: 'kill-process',
    label: 'Finalizar Processo por Nome',
    desc: 'Finaliza um processo .exe conflitante',
    icon: Flame
  },
  {
    type: 'ide',
    label: 'Inicializar IDE / Editor',
    desc: 'Abre a IDE configurada (IntelliJ, VSCode, Cursor)',
    icon: Code2
  },
  {
    type: 'karaf',
    label: 'Iniciar Karaf OSGi Debug',
    desc: 'Dispara o Karaf em modo debug',
    icon: Server
  },
  {
    type: 'browser',
    label: 'Abrir Navegador Web',
    desc: 'Abre uma URL específica no navegador padrão',
    icon: Globe
  }
];

export const ProfileEditorModal: React.FC<ProfileEditorModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSave,
  onDelete
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<AutomationStep[]>([]);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setDescription(profile.description || '');
      setSteps(profile.steps ? JSON.parse(JSON.stringify(profile.steps)) : []);
      setEditingStepIndex(profile.steps && profile.steps.length > 0 ? 0 : null);
    } else {
      setName('Novo Perfil de Ambiente');
      setDescription('Descrição das automações e serviços');
      setSteps([
        {
          id: `step-${Date.now()}-1`,
          name: 'Comando de Exemplo',
          type: 'command',
          enabled: true,
          command: 'npm run dev',
          cwd: '',
          port: 3000,
          launchMode: 'wt',
          delayAfterSeconds: 2
        }
      ]);
      setEditingStepIndex(0);
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const handleAddStep = (type: AutomationStepType = 'command') => {
    const newStep: AutomationStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name:
        type === 'command'
          ? 'Novo Comando'
          : type === 'kill-port'
          ? 'Liberar Porta'
          : type === 'browser'
          ? 'Abrir Navegador'
          : 'Novo Passo',
      type,
      enabled: true,
      command: type === 'command' ? 'npm run dev' : '',
      cwd: '',
      port: type === 'command' || type === 'kill-port' ? 8080 : undefined,
      launchMode: 'wt',
      delayAfterSeconds: 2
    };
    setSteps((prev) => [...prev, newStep]);
    setEditingStepIndex(steps.length);
  };

  const handleRemoveStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
    if (editingStepIndex === index) {
      setEditingStepIndex(null);
    } else if (editingStepIndex !== null && editingStepIndex > index) {
      setEditingStepIndex(editingStepIndex - 1);
    }
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    setSteps((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });

    if (editingStepIndex === index) {
      setEditingStepIndex(targetIndex);
    } else if (editingStepIndex === targetIndex) {
      setEditingStepIndex(index);
    }
  };

  const handleUpdateCurrentStep = (fields: Partial<AutomationStep>) => {
    if (editingStepIndex === null || !steps[editingStepIndex]) return;
    setSteps((prev) => {
      const copy = [...prev];
      copy[editingStepIndex] = { ...copy[editingStepIndex], ...fields };
      return copy;
    });
  };

  const handleSelectDirectory = async () => {
    if (window.electronAPI && window.electronAPI.selectDirectory) {
      const current = editingStep?.cwd;
      const selected = await window.electronAPI.selectDirectory(current);
      if (selected) {
        handleUpdateCurrentStep({ cwd: selected });
      }
    }
  };

  const handleSelectFile = async () => {
    if (window.electronAPI && window.electronAPI.selectFile) {
      const selected = await window.electronAPI.selectFile({
        filters: [
          { name: 'Scripts e Bat (*.bat, *.cmd)', extensions: ['bat', 'cmd'] },
          { name: 'Todos os arquivos (*.*)', extensions: ['*'] }
        ]
      });
      if (selected) {
        handleUpdateCurrentStep({ command: selected });
      }
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Por favor, informe um nome para o perfil.');
      return;
    }

    setIsSaving(true);
    try {
      const savedProfile: AutomationProfile = {
        id: profile?.id || `profile-${Date.now()}`,
        name: name.trim(),
        description: description.trim(),
        steps,
        isDefault: profile?.isDefault ?? false
      };
      await onSave(savedProfile);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const editingStep = editingStepIndex !== null ? steps[editingStepIndex] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {profile ? 'Editar Perfil de Automação' : 'Novo Perfil de Automação'}
              </h2>
              <p className="text-xs text-muted-foreground">
                Defina o fluxo sequencial de projetos, scripts e serviços do seu ambiente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informações Básicas do Perfil */}
        <div className="px-6 py-3 border-b border-border bg-background grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Nome do Perfil / Stack
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Minha Stack, Frontend + Backend..."
              className="w-full bg-input/50 border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Descrição (opcional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: PostgreSQL, SSO na 8787, Gateway 8080, API 8888, App 3000..."
              className="w-full bg-input/50 border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Corpo: Lista de Passos à esquerda + Editor do Passo selecionado à direita */}
        <div className="flex-1 flex overflow-hidden">
          {/* Coluna Esquerda: Lista de Passos Sequenciais */}
          <div className="w-80 border-r border-border flex flex-col bg-muted/10">
            <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
              <span className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
                Etapas na Sequência ({steps.length})
              </span>
              <button
                type="button"
                onClick={() => handleAddStep('command')}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 bg-primary/10 px-2 py-1 rounded transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {steps.length === 0 ? (
                <div className="text-center py-10 px-4 text-xs text-muted-foreground">
                  Nenhuma etapa cadastrada. Clique em "+ Adicionar" acima para começar.
                </div>
              ) : (
                steps.map((step, idx) => {
                  const isSelected = editingStepIndex === idx;
                  return (
                    <div
                      key={step.id}
                      onClick={() => setEditingStepIndex(idx)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-border/60 bg-card hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="w-5 h-5 flex items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground shrink-0">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <p className="font-semibold text-foreground truncate">{step.name || 'Sem nome'}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {step.type} {step.port ? `• :${step.port}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveStep(idx, 'up')}
                          className="p-1 hover:bg-muted text-muted-foreground disabled:opacity-30 rounded"
                          title="Mover para cima"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === steps.length - 1}
                          onClick={() => handleMoveStep(idx, 'down')}
                          className="p-1 hover:bg-muted text-muted-foreground disabled:opacity-30 rounded"
                          title="Mover para baixo"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(idx)}
                          className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded"
                          title="Remover etapa"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Coluna Direita: Detalhes do Passo Selecionado */}
          <div className="flex-1 overflow-y-auto p-6 bg-background">
            {editingStep ? (
              <div className="space-y-5 max-w-2xl">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <span>Configurar Passo #{editingStepIndex! + 1}:</span>
                      <span className="text-primary">{editingStep.name}</span>
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Ajuste o comando, pasta, porta e tempo de espera deste passo
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={editingStep.enabled !== false}
                      onChange={(e) => handleUpdateCurrentStep({ enabled: e.target.checked })}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-foreground font-medium">Habilitado</span>
                  </label>
                </div>

                {/* Tipo de Ação */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Tipo de Ação
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {STEP_TYPE_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const isChosen = editingStep.type === opt.type;
                      return (
                        <button
                          key={opt.type}
                          type="button"
                          onClick={() => handleUpdateCurrentStep({ type: opt.type })}
                          className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                            isChosen
                              ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary'
                              : 'border-border/70 hover:bg-muted/40 text-muted-foreground'
                          }`}
                        >
                          <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isChosen ? 'text-primary' : ''}`} />
                          <div>
                            <p className="text-xs font-semibold text-foreground">{opt.label.split('(')[0]}</p>
                            <p className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Nome do Passo */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Nome da Etapa / Título do Serviço
                  </label>
                  <input
                    type="text"
                    value={editingStep.name}
                    onChange={(e) => handleUpdateCurrentStep({ name: e.target.value })}
                    placeholder="Ex: Docker Postgres, SSO Auth, Gateway, API Backend..."
                    className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Campos Específicos para Comando */}
                {editingStep.type === 'command' && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-muted-foreground">
                          Comando de Execução
                        </label>
                        <button
                          type="button"
                          onClick={handleSelectFile}
                          className="text-[11px] text-primary hover:underline flex items-center gap-1"
                        >
                          <FolderOpen className="w-3 h-3" /> Selecionar arquivo .bat/.cmd
                        </button>
                      </div>
                      <input
                        type="text"
                        value={editingStep.command || ''}
                        onChange={(e) => handleUpdateCurrentStep({ command: e.target.value })}
                        placeholder="Ex: .\gradlew.bat bootRun, npm run dev, docker start banco-re, bats\_run-api.bat"
                        className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-muted-foreground">
                          Diretório de Trabalho (CWD)
                        </label>
                        <button
                          type="button"
                          onClick={handleSelectDirectory}
                          className="text-[11px] text-primary hover:underline flex items-center gap-1"
                        >
                          <FolderOpen className="w-3 h-3" /> Procurar Pasta
                        </button>
                      </div>
                      <input
                        type="text"
                        value={editingStep.cwd || ''}
                        onChange={(e) => handleUpdateCurrentStep({ cwd: e.target.value })}
                        placeholder="Ex: C:\projetos\minha-api ou .\minha-api"
                        className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">
                          Modo de Terminal
                        </label>
                        <select
                          value={editingStep.launchMode || 'wt'}
                          onChange={(e) =>
                            handleUpdateCurrentStep({ launchMode: e.target.value as 'wt' | 'cmd' | 'background' })
                          }
                          className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="wt">Windows Terminal (Abas agrupadas)</option>
                          <option value="cmd">Janela CMD Externa independente</option>
                          <option value="background">Segundo Plano (Processo oculto)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">
                          Porta Monitorada (Status & Stop)
                        </label>
                        <input
                          type="number"
                          value={editingStep.port || ''}
                          onChange={(e) =>
                            handleUpdateCurrentStep({
                              port: e.target.value ? parseInt(e.target.value, 10) : undefined
                            })
                          }
                          placeholder="Ex: 8787, 8080, 8888, 3000..."
                          className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Campos para Kill-Port */}
                {editingStep.type === 'kill-port' && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Porta a Liberar (Kill Process)
                    </label>
                    <input
                      type="number"
                      value={editingStep.port || ''}
                      onChange={(e) =>
                        handleUpdateCurrentStep({
                          port: e.target.value ? parseInt(e.target.value, 10) : undefined
                        })
                      }
                      placeholder="Ex: 8080, 3000..."
                      className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                {/* Campos para Serviço Windows ou Kill Process */}
                {(editingStep.type === 'service-start' ||
                  editingStep.type === 'service-stop' ||
                  editingStep.type === 'kill-process') && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Nome do Serviço ou Executável (opcional se vazio usa padrão)
                    </label>
                    <input
                      type="text"
                      value={editingStep.targetName || ''}
                      onChange={(e) => handleUpdateCurrentStep({ targetName: e.target.value })}
                      placeholder="Ex: MeuServico.API, servico-controle.exe..."
                      className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                {/* Campos para Navegador */}
                {editingStep.type === 'browser' && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      URL para Abrir
                    </label>
                    <input
                      type="text"
                      value={editingStep.browserUrl || ''}
                      onChange={(e) => handleUpdateCurrentStep({ browserUrl: e.target.value })}
                      placeholder="Ex: http://localhost:3000 ou http://localhost:8889/web"
                      className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                {/* Regras de Sequenciamento / Delay */}
                <div className="pt-3 border-t border-border/60 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Delay após execução (segundos)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={editingStep.delayAfterSeconds ?? 2}
                      onChange={(e) =>
                        handleUpdateCurrentStep({
                          delayAfterSeconds: parseInt(e.target.value || '0', 10)
                        })
                      }
                      className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Tempo de espera antes de chamar o próximo passo na esteira.
                    </p>
                  </div>

                  {editingStep.port ? (
                    <div className="flex flex-col justify-center">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                        <input
                          type="checkbox"
                          checked={editingStep.waitForPort ?? false}
                          onChange={(e) => handleUpdateCurrentStep({ waitForPort: e.target.checked })}
                          className="rounded border-border text-primary focus:ring-primary"
                        />
                        <span>Aguardar porta :{editingStep.port} responder antes do próximo</span>
                      </label>
                      <p className="text-[10px] text-muted-foreground mt-1 ml-6">
                        Pausa a esteira até o serviço abrir a porta (timeout 30s).
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-20">
                <Layers className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-semibold">Nenhuma etapa selecionada</p>
                <p className="text-xs">Selecione uma etapa à esquerda ou adicione uma nova para editar.</p>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
          <div>
            {onDelete && profile?.id && (
              <button
                type="button"
                onClick={async () => {
                  if (confirm(`Tem certeza que deseja excluir o perfil "${profile.name}"?`)) {
                    await onDelete(profile.id);
                    onClose();
                  }
                }}
                className="text-xs text-destructive hover:underline flex items-center gap-1 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir Perfil
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-lg shadow-sm transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Salvando...' : 'Salvar Perfil'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
