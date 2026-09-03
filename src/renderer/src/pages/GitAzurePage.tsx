import React, { useState } from 'react';
import {
  GitPullRequest,
  GitBranch,
  Download,
  RefreshCw,
  ExternalLink,
  Search,
  FolderGit2,
  ArrowUpRight,
  GitMerge,
  ArrowRight,
  Archive,
  ArchiveRestore,
  FileEdit,
  Settings,
  FolderOpen
} from 'lucide-react';
import { GitProjectInfo } from '../../../shared/types';

interface GitAzurePageProps {
  projects: GitProjectInfo[];
  onRefreshProjects: () => void;
  isRefreshing: boolean;
  onNavigateToSettings?: () => void;
}

export const GitAzurePage: React.FC<GitAzurePageProps> = ({
  projects,
  onRefreshProjects,
  isRefreshing,
  onNavigateToSettings
}) => {
  const [selectedPath, setSelectedPath] = useState<string>(projects[0]?.path || '');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [targetBranch, setTargetBranch] = useState<string>('develop');
  const [gitOutput, setGitOutput] = useState<string | null>(null);
  const [isExecutingGit, setIsExecutingGit] = useState<boolean>(false);

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.currentBranch.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentProject = projects.find((p) => p.path === selectedPath) || filteredProjects[0];

  const handleOpenPr = async () => {
    if (!currentProject) return;
    const url = await window.electronAPI.buildPrUrl(currentProject.path, targetBranch);
    if (url) {
      await window.electronAPI.openExternal(url);
    }
  };

  const handleOpenAzureRepo = async () => {
    if (!currentProject || !currentProject.remoteUrl) return;
    let url = currentProject.remoteUrl;
    if (url.includes('dev.azure.com')) {
      const match = url.match(/https:\/\/[^@]*@?(dev\.azure\.com\/[^/]+\/[^/]+\/_git\/[^/\s]+)/);
      if (match) url = `https://${match[1]}`;
    }
    await window.electronAPI.openExternal(url);
  };

  const handleOpenAzurePipelines = async () => {
    if (!currentProject || !currentProject.isAzure || !currentProject.azureOrg || !currentProject.azureProject) return;
    const url = `https://dev.azure.com/${currentProject.azureOrg}/${currentProject.azureProject}/_build`;
    await window.electronAPI.openExternal(url);
  };

  const handleExecGit = async (command: 'fetch' | 'pull' | 'stash' | 'stash-pop') => {
    if (!currentProject || isExecutingGit) return;
    setIsExecutingGit(true);
    setGitOutput(`Executando git ${command} no repositório ${currentProject.name}...`);
    try {
      const res = await window.electronAPI.execGitCommand(currentProject.path, command);
      setGitOutput(res.output);
      onRefreshProjects();
    } catch (err: any) {
      setGitOutput(`Erro: ${err?.message || err}`);
    } finally {
      setIsExecutingGit(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-5 space-y-4 overflow-hidden">
      {/* Topo do Hub Git & Azure */}
      <div className="cockpit-panel rounded-2xl p-4 shadow-xl border border-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary">
              <GitPullRequest className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                Controle de Versão (Git & Azure DevOps)
                <span className="text-[10px] bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  {projects.length} {projects.length === 1 ? 'Repositório Ativo' : 'Repositórios Ativos'}
                </span>
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Gestão de branches locais, sincronização remota e criação direta de Pull Requests no Azure DevOps.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onRefreshProjects}
              disabled={isRefreshing}
              className="px-3 py-2 bg-card hover:bg-muted border border-border rounded-xl text-xs font-semibold text-foreground transition-colors flex items-center gap-1.5"
              title="Reescanear diretório de projetos Git"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
              <span>Sincronizar Repositórios</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
        {/* Coluna Esquerda: Lista de Repositórios */}
        <div className="lg:col-span-4 flex flex-col space-y-3 cockpit-panel rounded-2xl p-3.5 overflow-hidden border border-border">
          {/* Busca */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar repositório ou branch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-card border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary font-mono"
            />
          </div>

          {/* Lista Rolável */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
            {filteredProjects.map((p) => {
              const isSelected = currentProject?.path === p.path;
              const hasChanges = (p.uncommittedCount || 0) > 0;

              return (
                <button
                  key={p.path}
                  onClick={() => setSelectedPath(p.path)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-sm font-semibold'
                      : 'bg-card/70 border-border/70 hover:border-border hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                      {p.name}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      {hasChanges && (
                        <span
                          className="text-[9px] bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono font-bold"
                          title={`${p.uncommittedCount} arquivo(s) modificado(s)`}
                        >
                          ● {p.uncommittedCount}
                        </span>
                      )}
                      {p.isAzure && (
                        <span className="text-[9px] bg-primary/10 text-primary border border-primary/30 px-1.5 py-0.2 rounded font-mono font-bold">
                          AZURE
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 mt-1.5 text-[11px] text-muted-foreground truncate">
                    <GitBranch className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="truncate font-mono text-emerald-600 dark:text-emerald-300 font-medium">
                      {p.currentBranch}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Coluna Direita: Detalhes do Repositório e Criador de Pull Request */}
        <div className="lg:col-span-8 flex flex-col space-y-3 overflow-y-auto pr-1">
          {currentProject ? (
            <>
              {/* Card de Informações e Fluxo Visual de PR */}
              <div className="cockpit-panel rounded-2xl p-5 space-y-4 border border-border">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                      <FolderGit2 className="w-5 h-5 text-primary" />
                      {currentProject.name}
                    </h3>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{currentProject.path}</p>
                  </div>

                  {currentProject.isAzure && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleOpenAzurePipelines}
                        className="flex items-center space-x-1.5 text-xs text-foreground bg-card hover:bg-muted border border-border px-3 py-1.5 rounded-xl font-bold transition-all shadow-sm"
                        title="Ver pipelines de integração contínua (CI/CD) no Azure DevOps"
                      >
                        <span>Pipelines CI/CD</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>

                      <button
                        onClick={handleOpenAzureRepo}
                        className="flex items-center space-x-1.5 text-xs text-primary bg-primary/10 hover:bg-primary/20 border border-primary/30 px-3 py-1.5 rounded-xl font-bold transition-all shadow-sm"
                        title="Abrir repositório no portal do Azure DevOps"
                      >
                        <span>Ver no Azure</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Sincronização, Status e Stash */}
                <div className="bg-card border border-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                      <GitBranch className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                        Branch Atual
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-300">
                        {currentProject.currentBranch}
                      </span>
                    </div>

                    {(currentProject.uncommittedCount || 0) > 0 && (
                      <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-[11px] font-mono">
                        <FileEdit className="w-3.5 h-3.5" />
                        <span>{currentProject.uncommittedCount} alteração(ões) pendente(s)</span>
                      </div>
                    )}
                  </div>

                  {/* Ações Rápidas de Git */}
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleExecGit('fetch')}
                      disabled={isExecutingGit}
                      className="px-2.5 py-1.5 bg-card hover:bg-muted border border-border text-foreground rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                      title="Sincronizar referências remotas (git fetch)"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isExecutingGit ? 'animate-spin' : ''}`} />
                      <span>Fetch</span>
                    </button>
                    <button
                      onClick={() => handleExecGit('pull')}
                      disabled={isExecutingGit}
                      className="px-2.5 py-1.5 bg-card hover:bg-muted border border-border text-foreground rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                      title="Baixar e mesclar alterações da branch remota (git pull)"
                    >
                      <Download className="w-3.5 h-3.5 text-primary" />
                      <span>Pull</span>
                    </button>
                    <button
                      onClick={() => handleExecGit('stash')}
                      disabled={isExecutingGit}
                      className="p-1.5 bg-card hover:bg-muted border border-border text-foreground rounded-lg transition-colors shadow-sm"
                      title="Guardar alterações locais temporariamente (git stash)"
                      aria-label="Guardar alterações locais (git stash)"
                    >
                      <Archive className="w-3.5 h-3.5 text-amber-500" />
                    </button>
                    <button
                      onClick={() => handleExecGit('stash-pop')}
                      disabled={isExecutingGit}
                      className="p-1.5 bg-card hover:bg-muted border border-border text-foreground rounded-lg transition-colors shadow-sm"
                      title="Restaurar alterações locais guardadas (git stash pop)"
                      aria-label="Restaurar alterações guardadas (git stash pop)"
                    >
                      <ArchiveRestore className="w-3.5 h-3.5 text-emerald-500" />
                    </button>
                  </div>
                </div>

                {/* Fluxo Visual de Pull Request */}
                <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <GitMerge className="w-4 h-4" />
                      Criar Pull Request no Azure DevOps
                    </span>

                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-muted-foreground font-medium">Branch de Destino:</span>
                      <select
                        value={targetBranch}
                        onChange={(e) => setTargetBranch(e.target.value)}
                        className="bg-card border border-border rounded-lg px-2.5 py-1 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
                      >
                        <option value="develop">develop</option>
                        <option value="master">master</option>
                        <option value="release/37.0">release/37.0</option>
                        {currentProject.branches
                          .filter((b) => !['develop', 'master', 'release/37.0', currentProject.currentBranch].includes(b))
                          .map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Diagrama Visual das Branches */}
                  <div className="bg-muted/40 border border-border/80 rounded-xl p-3 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center space-x-2 truncate">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span className="text-emerald-600 dark:text-emerald-300 font-bold truncate max-w-[200px]">
                        {currentProject.currentBranch}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-muted-foreground shrink-0 px-3">
                      <div className="h-[1px] w-8 bg-border" />
                      <span className="text-[10px] font-bold text-primary">PULL REQUEST</span>
                      <ArrowRight className="w-3.5 h-3.5 text-primary" />
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-foreground font-bold">{targetBranch}</span>
                      <span className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                  </div>

                  {/* Botão de Criação de PR */}
                  <button
                    onClick={handleOpenPr}
                    disabled={!currentProject.isAzure}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg ${
                      currentProject.isAzure
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/30 hover:scale-[1.01] border border-primary/40'
                        : 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                    }`}
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>
                      {currentProject.isAzure
                        ? 'Abrir Formulário de Pull Request no Azure DevOps'
                        : 'Repositório não possui remoto Azure DevOps configurado'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Console de Saída do Git */}
              {gitOutput && (
                <div className="bg-card border border-border rounded-xl p-3 font-mono text-xs text-foreground whitespace-pre-wrap">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    Terminal Git:
                  </div>
                  {gitOutput}
                </div>
              )}
            </>
          ) : projects.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center cockpit-panel rounded-2xl border border-border space-y-3">
              <FolderOpen className="w-10 h-10 text-primary/50" />
              <div>
                <h4 className="text-sm font-bold text-foreground">Nenhum repositório Git encontrado</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                  Nenhum projeto com diretório <code className="text-primary font-mono">.git</code> foi localizado no caminho configurado.
                </p>
              </div>
              {onNavigateToSettings && (
                <button
                  type="button"
                  onClick={onNavigateToSettings}
                  className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shadow-lg shadow-primary/20"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Configurar Diretório de Projetos</span>
                </button>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-xs">
              Selecione um repositório na lista para visualizar status e criar Pull Requests.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
