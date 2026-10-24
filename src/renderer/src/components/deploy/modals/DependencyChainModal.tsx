import React, { useState } from 'react';
import {
  GitMerge,
  ArrowDown,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Play,
  Save,
  CheckCircle2,
  ShieldCheck,
  FolderGit2
} from 'lucide-react';
import type { DependencyChainNode, DeployProfile, GitProjectInfo } from '../../../../../shared/types';
import { Modal } from '../../ui/Modal';
import { buildProfileFromDependencyChain, validateDependencyChain } from '../../../utils/dependencyChainUtils';
import { showToast } from '../../ToastHost';

interface DependencyChainModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: GitProjectInfo[];
  onSaveProfile: (profile: DeployProfile) => Promise<void>;
  onRunProfile?: (profile: DeployProfile) => void;
}

export const DependencyChainModal: React.FC<DependencyChainModalProps> = ({
  isOpen,
  onClose,
  projects,
  onSaveProfile,
  onRunProfile
}) => {
  const [chainName, setChainName] = useState('Esteira Multi-Camadas (Venda -> Pedido -> Varejo)');
  const [createPomBackups, setCreatePomBackups] = useState(true);
  const [nodes, setNodes] = useState<DependencyChainNode[]>([
    { id: '1', projectName: '', projectPath: '', skipTests: true },
    { id: '2', projectName: '', projectPath: '', skipTests: true },
    { id: '3', projectName: '', projectPath: '', skipTests: true, deployToKaraf: true }
  ]);

  if (!isOpen) return null;

  const handleSelectProject = (index: number, projectPath: string) => {
    const proj = projects.find((p) => p.path === projectPath);
    const projectName = proj ? proj.name : projectPath.split(/[/\\]/).pop() || '';
    setNodes((prev) =>
      prev.map((n, idx) => (idx === index ? { ...n, projectPath, projectName } : n))
    );
  };

  const handleMoveNode = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= nodes.length) return;
    setNodes((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  const handleAddNode = () => {
    setNodes((prev) => [
      ...prev,
      { id: String(Date.now()), projectName: '', projectPath: '', skipTests: true }
    ]);
  };

  const handleRemoveNode = (index: number) => {
    if (nodes.length <= 2) {
      showToast('A cadeia precisa de pelo menos 2 camadas.', 'info');
      return;
    }
    setNodes((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleToggleDeployKaraf = (index: number) => {
    setNodes((prev) =>
      prev.map((n, idx) => (idx === index ? { ...n, deployToKaraf: !n.deployToKaraf } : n))
    );
  };

  const handleSaveOnly = async () => {
    const val = validateDependencyChain(nodes);
    if (!val.valid) {
      showToast(val.error || 'Configuração inválida', 'error');
      return;
    }
    const profile = buildProfileFromDependencyChain(chainName, nodes, createPomBackups);
    await onSaveProfile(profile);
    showToast(`Perfil "${profile.name}" salvo com sucesso!`, 'success');
    onClose();
  };

  const handleRunNow = async () => {
    const val = validateDependencyChain(nodes);
    if (!val.valid) {
      showToast(val.error || 'Configuração inválida', 'error');
      return;
    }
    const profile = buildProfileFromDependencyChain(chainName, nodes, createPomBackups);
    await onSaveProfile(profile);
    onClose();
    if (onRunProfile) {
      onRunProfile(profile);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Cadeia Automatizada de Dependências Maven (Multi-Camadas)"
      description="Compilação sequencial com extração de versão e atualização automática do pom.xml downstream"
      size="xl"
    >
      <div className="p-5 space-y-5 select-text">
        {/* Nome da Esteira e Opções Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-bold text-foreground">Nome da Esteira / Perfil</label>
            <input
              type="text"
              value={chainName}
              onChange={(e) => setChainName(e.target.value)}
              className="w-full bg-background border border-input rounded-[10px] px-3 py-2.5 text-sm text-foreground focus:outline-hidden font-medium"
              placeholder="Ex: Esteira Varejo (Venda -> Pedido -> Varejo)"
            />
          </div>

          <div className="flex items-center gap-2 pt-5">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              <input
                type="checkbox"
                checked={createPomBackups}
                onChange={(e) => setCreatePomBackups(e.target.checked)}
                className="rounded border-border text-primary focus:ring-0"
              />
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Gerar cópia .bak do pom.xml</span>
            </label>
          </div>
        </div>

        {/* Nós da Cadeia */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <GitMerge className="w-3.5 h-3.5 text-primary" /> Camadas em Sequência ({nodes.length})
            </span>
            <button
              type="button"
              onClick={handleAddNode}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/90 bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Camada
            </button>
          </div>

          <div className="space-y-2">
            {nodes.map((node, index) => {
              const isFirst = index === 0;
              const isLast = index === nodes.length - 1;

              return (
                <div key={node.id} className="space-y-2">
                  {!isFirst && (
                    <div className="flex items-center justify-center gap-2 text-2xs text-muted-foreground font-mono py-0.5">
                      <ArrowDown className="w-3.5 h-3.5 text-primary animate-bounce" />
                      <span>atualiza versão no pom.xml downstream</span>
                    </div>
                  )}

                  <div className="p-3.5 rounded-xl border border-border/80 bg-card shadow-2xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {index + 1}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <FolderGit2 className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-bold text-foreground">
                            {isFirst ? 'Camada Base (Upstream)' : isLast ? 'Camada Final (Alvo)' : `Camada Intermediária ${index}`}
                          </span>
                        </div>

                        <select
                          value={node.projectPath}
                          onChange={(e) => handleSelectProject(index, e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono"
                        >
                          <option value="">Selecione o projeto Git local...</option>
                          {projects.map((p) => (
                            <option key={p.path} value={p.path}>
                              {p.name} ({p.path})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isLast && (
                        <button
                          type="button"
                          onClick={() => handleToggleDeployKaraf(index)}
                          className={`px-2.5 py-1 rounded-lg text-2xs font-semibold border transition-all cursor-pointer ${
                            node.deployToKaraf
                              ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40'
                              : 'bg-muted text-muted-foreground border-border'
                          }`}
                          title="Instalar feature final no Apache Karaf"
                        >
                          Deploy Karaf
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleMoveNode(index, 'up')}
                        disabled={isFirst}
                        className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded disabled:opacity-30 cursor-pointer"
                        title="Subir na ordem"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveNode(index, 'down')}
                        disabled={isLast}
                        className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded disabled:opacity-30 cursor-pointer"
                        title="Descer na ordem"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveNode(index)}
                        disabled={nodes.length <= 2}
                        className="p-1 hover:bg-danger/20 text-muted-foreground hover:text-danger rounded disabled:opacity-30 cursor-pointer"
                        title="Remover camada"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="pt-3 border-t border-border flex items-center justify-between">
          <span className="text-2xs text-muted-foreground">
            A esteira executa clean install na ordem, propaga as versões geradas e atualiza o Karaf.
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveOnly}
              className="px-3.5 py-2 rounded-xl bg-card hover:bg-muted border border-border text-foreground font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Save className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Salvar Perfil</span>
            </button>

            <button
              type="button"
              onClick={handleRunNow}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Executar Cadeia Completa</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
