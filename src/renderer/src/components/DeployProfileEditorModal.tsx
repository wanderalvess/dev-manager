import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  FolderOpen,
  Terminal,
  Hammer,
  Package,
  UploadCloud,
  RotateCcw,
  Save,
  Layers,
  Sparkles,
  ListTree,
  Copy,
  Clock,
  Globe,
  Server
} from 'lucide-react';
import {
  DeployProfile,
  DeployStep,
  DeployStepType,
  GitProjectInfo
} from '../../../shared/types';

interface DeployProfileEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: DeployProfile | null;
  projects: GitProjectInfo[];
  onSave: (savedProfile: DeployProfile) => Promise<void>;
  onDelete?: (profileId: string) => Promise<void>;
}

const STEP_TYPE_OPTIONS: { type: DeployStepType; label: string; desc: string; icon: any }[] = [
  {
    type: 'maven-build',
    label: 'Build Maven (mvn clean install)',
    desc: 'Compila o projeto antes de publicar',
    icon: Hammer
  },
  {
    type: 'karaf-command',
    label: 'Comando Karaf OSGi (client.bat)',
    desc: 'feature:repo-add, feature:install, bundle:*, ou qualquer comando de shell Karaf',
    icon: Layers
  },
  {
    type: 'karaf-bundle',
    label: 'Bundle OSGi: Ciclo de Vida',
    desc: 'Instalar, reinstalar, reiniciar ou desinstalar um bundle OSGi',
    icon: ListTree
  },
  {
    type: 'docker-build',
    label: 'Container: Build de Imagem',
    desc: 'Builda uma imagem a partir de um Dockerfile / Containerfile',
    icon: Package
  },
  {
    type: 'docker-push',
    label: 'Container: Push de Imagem',
    desc: 'Envia a imagem construída para o registry de containers',
    icon: UploadCloud
  },
  {
    type: 'docker-restart',
    label: 'Container: Reiniciar Container',
    desc: 'Reinicia um container já existente pelo nome ou ID',
    icon: RotateCcw
  },
  {
    type: 'command',
    label: 'Comando / Script Genérico',
    desc: 'Executa qualquer comando num diretório, com saída em tempo real',
    icon: Terminal
  },
  {
    type: 'wait',
    label: 'Aguardar / Delay (Sleep)',
    desc: 'Pausa a esteira por N segundos com contagem regressiva no log',
    icon: Clock
  },
  {
    type: 'http-healthcheck',
    label: 'Healthcheck HTTP (Sondagem)',
    desc: 'Verifica se uma URL responde com HTTP 200/esperado antes de prosseguir',
    icon: Globe
  },
  {
    type: 'service-action',
    label: 'Serviço Windows (Iniciar/Parar)',
    desc: 'Controla inicialização ou parada de serviços do Windows (ex: Oracle, Postgres)',
    icon: Server
  }
];

const stepTypeDefaultName = (type: DeployStepType): string => {
  switch (type) {
    case 'maven-build':
      return 'Build Maven';
    case 'karaf-command':
      return 'Comando Karaf';
    case 'karaf-bundle':
      return 'Ação de Bundle OSGi';
    case 'docker-build':
      return 'Container Build';
    case 'docker-push':
      return 'Container Push';
    case 'docker-restart':
      return 'Reiniciar Container';
    case 'command':
      return 'Comando Genérico';
    case 'wait':
      return 'Aguardar Inicialização';
    case 'http-healthcheck':
      return 'Healthcheck HTTP';
    case 'service-action':
      return 'Ação de Serviço Windows';
    default:
      return 'Nova Etapa';
  }
};

export const DeployProfileEditorModal: React.FC<DeployProfileEditorModalProps> = ({
  isOpen,
  onClose,
  profile,
  projects,
  onSave,
  onDelete
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<DeployStep[]>([]);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [suggestProjectPath, setSuggestProjectPath] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setDescription(profile.description || '');
      setSteps(profile.steps ? structuredClone(profile.steps) : []);
      setEditingStepIndex(profile.steps && profile.steps.length > 0 ? 0 : null);
    } else {
      setName('Novo Perfil de Deploy');
      setDescription('Descrição das etapas de build e publicação');
      setSteps([
        {
          id: `deploy-step-${Date.now()}-1`,
          name: 'Comando de Exemplo',
          type: 'command',
          enabled: true,
          command: 'echo "Configure aqui as etapas do seu deploy"',
          cwd: ''
        }
      ]);
      setEditingStepIndex(0);
    }
    setSuggestProjectPath('');
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const handleAddStep = (type: DeployStepType = 'command') => {
    const newStep: DeployStep = {
      id: `deploy-step-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: stepTypeDefaultName(type),
      type,
      enabled: true,
      command: type === 'karaf-command' || type === 'command' ? '' : undefined,
      cwd: '',
      skipTests: type === 'maven-build' ? true : undefined
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

  const handleDuplicateStep = (index: number) => {
    const stepToClone = steps[index];
    if (!stepToClone) return;
    const cloned: DeployStep = {
      ...structuredClone(stepToClone),
      id: `deploy-step-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: `${stepToClone.name} (Cópia)`
    };
    const newSteps = [...steps];
    newSteps.splice(index + 1, 0, cloned);
    setSteps(newSteps);
    setEditingStepIndex(index + 1);
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

  const handleUpdateCurrentStep = (fields: Partial<DeployStep>) => {
    if (editingStepIndex === null || !steps[editingStepIndex]) return;
    setSteps((prev) => {
      const copy = [...prev];
      copy[editingStepIndex] = { ...copy[editingStepIndex], ...fields };
      return copy;
    });
  };

  const handleSelectDirectory = async (field: 'projectPath' | 'cwd' | 'dockerContextPath') => {
    if (window.electronAPI && window.electronAPI.selectDirectory) {
      const current = editingStep?.[field];
      const selected = await window.electronAPI.selectDirectory(current);
      if (selected) {
        handleUpdateCurrentStep({ [field]: selected } as Partial<DeployStep>);
      }
    }
  };

  const handleSuggestFromPom = async (target: 'repo' | 'install') => {
    if (!window.electronAPI || !window.electronAPI.parsePom || !suggestProjectPath) return;
    setIsSuggesting(true);
    try {
      const pomInfo = await window.electronAPI.parsePom(suggestProjectPath);
      if (pomInfo) {
        const suggestion =
          target === 'repo' ? pomInfo.suggestedRepoCommand : pomInfo.suggestedInstallCommand;
        if (suggestion) {
          handleUpdateCurrentStep({ command: suggestion });
        }
      }
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Por favor, informe um nome para o perfil.');
      return;
    }

    setIsSaving(true);
    try {
      const savedProfile: DeployProfile = {
        id: profile?.id || `deploy-profile-${Date.now()}`,
        name: name.trim(),
        description: description.trim(),
        steps
      };
      await onSave(savedProfile);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const editingStep = editingStepIndex !== null ? steps[editingStepIndex] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-[96vw] xl:max-w-[1540px] h-[93vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {profile ? 'Editar Perfil de Deploy' : 'Novo Perfil de Deploy'}
              </h2>
              <p className="text-xs text-muted-foreground">
                Defina a sequência de build e publicação (Karaf, Containers ou comandos genéricos)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informações Básicas do Perfil */}
        <div className="px-6 py-3.5 border-b border-border bg-background grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Nome do Perfil de Deploy
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Deploy Karaf OSGi, Deploy Container Produção..."
              className="w-full bg-input/50 border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
              placeholder="Ex: Build + install no Karaf local, Build + push + restart do container..."
              className="w-full bg-input/50 border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Corpo: Lista de Etapas à esquerda + Editor da Etapa selecionada à direita */}
        <div className="flex-1 flex overflow-hidden">
          {/* Coluna Esquerda: Lista de Etapas Sequenciais */}
          <div className="w-80 md:w-96 border-r border-border flex flex-col bg-muted/10 shrink-0">
            <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
              <span className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
                Etapas na Sequência ({steps.length})
              </span>
              <button
                type="button"
                onClick={() => handleAddStep('command')}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/90 bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
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
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40'
                          : 'border-border/60 bg-card hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                        <span className="w-6 h-6 flex items-center justify-center rounded-lg bg-muted text-[11px] font-bold text-muted-foreground shrink-0">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <p className="font-bold text-foreground truncate">{step.name || 'Sem nome'}</p>
                          <span className="text-[10px] text-muted-foreground font-mono">{step.type}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleMoveStep(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded disabled:opacity-30"
                          title="Mover para cima"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveStep(idx, 'down')}
                          disabled={idx === steps.length - 1}
                          className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded disabled:opacity-30"
                          title="Mover para baixo"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateStep(idx)}
                          className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
                          title="Duplicar etapa"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(idx)}
                          className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded"
                          title="Remover etapa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Coluna Direita: Detalhes da Etapa Selecionada */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-background">
            {editingStep ? (
              <div className="space-y-6 max-w-4xl xl:max-w-5xl">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <span>Configurar Etapa #{editingStepIndex! + 1}:</span>
                      <span className="text-primary">{editingStep.name}</span>
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Ajuste o tipo de ação e os parâmetros desta etapa do deploy
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
                            <p className="text-xs font-semibold text-foreground">{opt.label}</p>
                            <p className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Nome da Etapa */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Nome da Etapa
                  </label>
                  <input
                    type="text"
                    value={editingStep.name}
                    onChange={(e) => handleUpdateCurrentStep({ name: e.target.value })}
                    placeholder="Ex: Build Maven, Instalar Feature, Build Imagem Container..."
                    className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Campos: Build Maven */}
                {editingStep.type === 'maven-build' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">
                        Projeto Git (opcional, preenche o diretório)
                      </label>
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) handleUpdateCurrentStep({ projectPath: e.target.value });
                        }}
                        className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                      >
                        <option value="">-- Selecionar projeto --</option>
                        {projects.map((p) => (
                          <option key={p.path} value={p.path}>
                            {p.name} {p.pomInfo?.version ? `[${p.pomInfo.version}]` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-muted-foreground">
                          Diretório do Projeto
                        </label>
                        <button
                          type="button"
                          onClick={() => handleSelectDirectory('projectPath')}
                          className="text-[11px] text-primary hover:underline flex items-center gap-1"
                        >
                          <FolderOpen className="w-3 h-3" /> Procurar Pasta
                        </button>
                      </div>
                      <input
                        type="text"
                        value={editingStep.projectPath || ''}
                        onChange={(e) => handleUpdateCurrentStep({ projectPath: e.target.value })}
                        placeholder="Ex: C:\projetos\meu-servico"
                        className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                      <input
                        type="checkbox"
                        checked={editingStep.skipTests ?? true}
                        onChange={(e) => handleUpdateCurrentStep({ skipTests: e.target.checked })}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <span>
                        Pular testes unitários (<code className="font-mono text-primary">-DskipTests</code>)
                      </span>
                    </label>
                  </>
                )}

                {/* Campos: Comando Karaf */}
                {editingStep.type === 'karaf-command' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">
                        Comando Karaf
                      </label>
                      <textarea
                        value={editingStep.command || ''}
                        onChange={(e) => handleUpdateCurrentStep({ command: e.target.value })}
                        rows={2}
                        placeholder='Ex: feature:repo-add mvn:com.empresa/meu-servico/1.0.0/xml/features'
                        className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      />
                    </div>
                    <div className="bg-muted/30 border border-border/60 rounded-lg p-3 space-y-2">
                      <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary" /> Sugerir comando a partir de um pom.xml
                      </p>
                      <select
                        value={suggestProjectPath}
                        onChange={(e) => setSuggestProjectPath(e.target.value)}
                        className="w-full bg-input/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                      >
                        <option value="">-- Selecionar projeto --</option>
                        {projects.map((p) => (
                          <option key={p.path} value={p.path}>
                            {p.name} {p.pomInfo?.version ? `[${p.pomInfo.version}]` : ''}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={!suggestProjectPath || isSuggesting}
                          onClick={() => handleSuggestFromPom('repo')}
                          className="flex-1 px-2 py-1.5 bg-card hover:bg-muted border border-border rounded-lg text-[11px] font-semibold text-foreground disabled:opacity-40 transition-colors"
                        >
                          Preencher com repo-add
                        </button>
                        <button
                          type="button"
                          disabled={!suggestProjectPath || isSuggesting}
                          onClick={() => handleSuggestFromPom('install')}
                          className="flex-1 px-2 py-1.5 bg-card hover:bg-muted border border-border rounded-lg text-[11px] font-semibold text-foreground disabled:opacity-40 transition-colors"
                        >
                          Preencher com install
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Campos: Bundle OSGi */}
                {editingStep.type === 'karaf-bundle' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">
                        Ação no Bundle
                      </label>
                      <select
                        value={editingStep.bundleAction || 'reinstall'}
                        onChange={(e) => handleUpdateCurrentStep({ bundleAction: e.target.value as any })}
                        className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="reinstall">Reinstalar (bundle:update + refresh + start)</option>
                        <option value="install">Instalar Novo (bundle:install)</option>
                        <option value="restart">Reiniciar (bundle:restart)</option>
                        <option value="refresh">Atualizar Fiações (bundle:refresh)</option>
                        <option value="start">Iniciar (bundle:start)</option>
                        <option value="stop">Parar (bundle:stop)</option>
                        <option value="uninstall">Desinstalar (bundle:uninstall)</option>
                      </select>
                    </div>

                    {editingStep.bundleAction !== 'install' && (
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">
                          ID do Bundle OSGi (numérico)
                        </label>
                        <input
                          type="text"
                          value={editingStep.bundleId || ''}
                          onChange={(e) => handleUpdateCurrentStep({ bundleId: e.target.value })}
                          placeholder="Ex: 154"
                          className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    )}

                    {(editingStep.bundleAction === 'install' || editingStep.bundleAction === 'reinstall') && (
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">
                          Localização / Coordenada Maven {editingStep.bundleAction === 'reinstall' ? '(opcional)' : ''}
                        </label>
                        <input
                          type="text"
                          value={editingStep.bundleLocation || ''}
                          onChange={(e) => handleUpdateCurrentStep({ bundleLocation: e.target.value })}
                          placeholder="mvn:com.minhaempresa/meu-modulo/1.0.0 ou file:/..."
                          className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    )}

                    {editingStep.bundleAction === 'install' && (
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                        <input
                          type="checkbox"
                          checked={editingStep.bundleStart ?? true}
                          onChange={(e) => handleUpdateCurrentStep({ bundleStart: e.target.checked })}
                          className="rounded border-border text-primary focus:ring-primary"
                        />
                        <span>
                          Iniciar bundle automaticamente após instalação (<code className="font-mono text-primary">-s</code>)
                        </span>
                      </label>
                    )}
                  </div>
                )}

                {/* Campos: Container Build */}
                {editingStep.type === 'docker-build' && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-muted-foreground">
                          Diretório de Contexto
                        </label>
                        <button
                          type="button"
                          onClick={() => handleSelectDirectory('dockerContextPath')}
                          className="text-[11px] text-primary hover:underline flex items-center gap-1"
                        >
                          <FolderOpen className="w-3 h-3" /> Procurar Pasta
                        </button>
                      </div>
                      <input
                        type="text"
                        value={editingStep.dockerContextPath || ''}
                        onChange={(e) => handleUpdateCurrentStep({ dockerContextPath: e.target.value })}
                        placeholder="Ex: C:\projetos\minha-api"
                        className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">
                          Dockerfile / Containerfile (opcional)
                        </label>
                        <input
                          type="text"
                          value={editingStep.dockerFile || ''}
                          onChange={(e) => handleUpdateCurrentStep({ dockerFile: e.target.value })}
                          placeholder="Dockerfile"
                          className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">
                          Tag da Imagem
                        </label>
                        <input
                          type="text"
                          value={editingStep.dockerImageTag || ''}
                          onChange={(e) => handleUpdateCurrentStep({ dockerImageTag: e.target.value })}
                          placeholder="Ex: minha-api:latest"
                          className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Campos: Docker Push */}
                {editingStep.type === 'docker-push' && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Tag da Imagem
                    </label>
                    <input
                      type="text"
                      value={editingStep.dockerImageTag || ''}
                      onChange={(e) => handleUpdateCurrentStep({ dockerImageTag: e.target.value })}
                      placeholder="Ex: registro.com/minha-api:latest"
                      className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                {/* Campos: Docker Restart */}
                {editingStep.type === 'docker-restart' && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Nome ou ID do Container
                    </label>
                    <input
                      type="text"
                      value={editingStep.dockerContainer || ''}
                      onChange={(e) => handleUpdateCurrentStep({ dockerContainer: e.target.value })}
                      placeholder="Ex: minha-api-container"
                      className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                {/* Campos: Comando Genérico */}
                {editingStep.type === 'command' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">
                        Comando de Execução
                      </label>
                      <input
                        type="text"
                        value={editingStep.command || ''}
                        onChange={(e) => handleUpdateCurrentStep({ command: e.target.value })}
                        placeholder="Ex: npm run deploy, .\deploy.bat, gradlew deployProd"
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
                          onClick={() => handleSelectDirectory('cwd')}
                          className="text-[11px] text-primary hover:underline flex items-center gap-1"
                        >
                          <FolderOpen className="w-3 h-3" /> Procurar Pasta
                        </button>
                      </div>
                      <input
                        type="text"
                        value={editingStep.cwd || ''}
                        onChange={(e) => handleUpdateCurrentStep({ cwd: e.target.value })}
                        placeholder="Ex: C:\projetos\minha-api"
                        className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </>
                )}

                {/* Campos: Aguardar / Delay */}
                {editingStep.type === 'wait' && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Tempo de Espera (em segundos)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={1}
                        max={600}
                        value={editingStep.waitDurationSeconds ?? 5}
                        onChange={(e) => handleUpdateCurrentStep({ waitDurationSeconds: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-32 bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                      />
                      <span className="text-xs text-muted-foreground">
                        A esteira pausará com contagem regressiva em tempo real no console.
                      </span>
                    </div>
                  </div>
                )}

                {/* Campos: Healthcheck HTTP */}
                {editingStep.type === 'http-healthcheck' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">
                        URL do Endpoint HTTP
                      </label>
                      <input
                        type="text"
                        value={editingStep.healthcheckUrl || ''}
                        onChange={(e) => handleUpdateCurrentStep({ healthcheckUrl: e.target.value })}
                        placeholder="Ex: http://localhost:8080/cxf/healthcheck ou http://localhost:8889"
                        className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">
                          Status Esperado
                        </label>
                        <input
                          type="number"
                          value={editingStep.healthcheckExpectedStatus ?? 200}
                          onChange={(e) => handleUpdateCurrentStep({ healthcheckExpectedStatus: parseInt(e.target.value) || 200 })}
                          className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">
                          Timeout (s)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={editingStep.healthcheckTimeoutSeconds ?? 5}
                          onChange={(e) => handleUpdateCurrentStep({ healthcheckTimeoutSeconds: Math.max(1, parseInt(e.target.value) || 5) })}
                          className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">
                          Tentativas
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={editingStep.healthcheckRetries ?? 10}
                          onChange={(e) => handleUpdateCurrentStep({ healthcheckRetries: Math.max(1, parseInt(e.target.value) || 10) })}
                          className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Realiza requisições periódicas a cada 2 segundos até o endpoint responder com o código esperado ou esgotar as tentativas.
                    </p>
                  </div>
                )}

                {/* Campos: Serviço Windows */}
                {editingStep.type === 'service-action' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">
                        Ação no Serviço
                      </label>
                      <select
                        value={editingStep.serviceAction || 'start'}
                        onChange={(e) => handleUpdateCurrentStep({ serviceAction: e.target.value as any })}
                        className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="start">Iniciar Serviço (start)</option>
                        <option value="stop">Parar Serviço (stop)</option>
                        <option value="restart">Reiniciar Serviço (restart)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">
                        Nome do Serviço Windows
                      </label>
                      <input
                        type="text"
                        value={editingStep.serviceName || ''}
                        onChange={(e) => handleUpdateCurrentStep({ serviceName: e.target.value })}
                        placeholder="Ex: OracleServiceXE, postgresql-x64-15, Winthor-Karaf"
                        className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Nome de identificação do serviço no Windows (conforme exibido em services.msc).
                      </p>
                    </div>
                  </div>
                )}

                {/* Configurações Avançadas e Tolerância */}
                <div className="pt-4 border-t border-border/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={editingStep.continueOnError ?? false}
                        onChange={(e) => handleUpdateCurrentStep({ continueOnError: e.target.checked })}
                        className="rounded border-border text-amber-500 focus:ring-amber-500 mt-0.5"
                      />
                      <div>
                        <span className="text-foreground font-semibold flex items-center gap-1.5">
                          Tolerar falha nesta etapa (continueOnError)
                        </span>
                        <span className="text-[11px] text-muted-foreground block">
                          Se ativado, um código de erro ou falha nesta etapa emitirá um aviso no log mas não interromperá as próximas etapas.
                        </span>
                      </div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">
                        Timeout Máximo (segundos, opcional)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={editingStep.timeoutSeconds ?? ''}
                        onChange={(e) => handleUpdateCurrentStep({ timeoutSeconds: e.target.value ? parseInt(e.target.value) : undefined })}
                        placeholder="Sem limite de tempo (padrão)"
                        className="w-full font-mono bg-input/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Dica de Variáveis Dinâmicas */}
                  <div className="bg-muted/20 border border-border/60 rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground mb-1.5">
                      <Sparkles className="w-3 h-3 text-primary" /> Variáveis dinâmicas para comandos e caminhos:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { token: '{PROJECTS_PATH}', desc: 'Pasta de projetos' },
                        { token: '{KARAF_PATH}', desc: 'Pasta do Karaf' },
                        { token: '{JDK_PATH}', desc: 'Pasta do JDK' },
                        { token: '{DATE}', desc: 'AAAA-MM-DD' },
                        { token: '{TIMESTAMP}', desc: 'Data e hora' }
                      ].map((v) => (
                        <span
                          key={v.token}
                          className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-card border border-border text-foreground"
                          title={v.desc}
                        >
                          <code className="text-primary font-bold">{v.token}</code>
                          <span className="text-muted-foreground text-[9px]">({v.desc})</span>
                        </span>
                      ))}
                    </div>
                  </div>
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
