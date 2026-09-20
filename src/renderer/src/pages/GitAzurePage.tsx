import React, { useEffect, useState, useMemo } from 'react';
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
  FolderOpen,
  Clock,
  UploadCloud,
  GitCommit,
  Plus,
  Check,
  X,
  AlertCircle,
  Split,
  Eye,
  Copy,
  FileCode,
  Sparkles
} from 'lucide-react';
import { GitProjectInfo, GitCommitInfo, GitFileStatus } from '../../../shared/types';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { OnboardingTour } from '../components/onboarding/OnboardingTour';
import { usePageTour } from '../components/onboarding/usePageTour';
import { GIT_TOUR_STEPS, GIT_TOUR_STORAGE_KEY } from '../components/onboarding/pageTours/gitAzureTour';

interface GitAzurePageProps {
  projects: GitProjectInfo[];
  onRefreshProjects: () => void;
  isRefreshing: boolean;
  onNavigateToSettings?: () => void;
  settingsVersion?: number;
}

export const GitAzurePage: React.FC<GitAzurePageProps> = ({
  projects,
  onRefreshProjects,
  isRefreshing,
  onNavigateToSettings,
  settingsVersion
}) => {
  const tour = usePageTour(GIT_TOUR_STORAGE_KEY);
  const [selectedPath, setSelectedPath] = useState<string>(projects[0]?.path || '');

  // `projects` chega vazio no primeiro render e é populado depois de um fetch
  // assíncrono; sincroniza a seleção assim que a lista chegar, caso o usuário
  // ainda não tenha escolhido um projeto manualmente.
  useEffect(() => {
    if (!selectedPath && projects.length > 0) {
      setSelectedPath(projects[0].path);
    }
  }, [projects, selectedPath]);

  // Sincroniza configurações globais (ex: branch alvo padrão configurado nas configurações)
  useEffect(() => {
    if (window.electronAPI?.getSettings) {
      window.electronAPI.getSettings().then((st) => {
        if (st.targetPrBranch) {
          setTargetBranch((curr) => (curr === 'develop' || !curr ? st.targetPrBranch : curr));
        }
      }).catch(() => {});
    }
    if (settingsVersion && settingsVersion > 0) {
      onRefreshProjects();
    }
  }, [settingsVersion, onRefreshProjects]);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [targetBranch, setTargetBranch] = useState<string>('develop');
  const [gitOutput, setGitOutput] = useState<string | null>(null);
  const [gitOutputIsError, setGitOutputIsError] = useState<boolean>(false);
  const [isExecutingGit, setIsExecutingGit] = useState<boolean>(false);

  // Estados de Modais Avançados
  const [isCommitModalOpen, setIsCommitModalOpen] = useState<boolean>(false);
  const [commitMessage, setCommitMessage] = useState<string>('');
  const [isCommitting, setIsCommitting] = useState<boolean>(false);

  const [isBranchModalOpen, setIsBranchModalOpen] = useState<boolean>(false);
  const [newBranchName, setNewBranchName] = useState<string>('');

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [commitHistory, setCommitHistory] = useState<GitCommitInfo[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const { copy: copyHash, copiedKey: copiedHash } = useCopyToClipboard();

  // Estados de Diff e Inspeção de Arquivos Alterados
  const [isDiffModalOpen, setIsDiffModalOpen] = useState<boolean>(false);
  const [diffFiles, setDiffFiles] = useState<GitFileStatus[]>([]);
  const [selectedDiffFile, setSelectedDiffFile] = useState<string | null>(null);
  const [diffText, setDiffText] = useState<string>('');
  const [isLoadingDiff, setIsLoadingDiff] = useState<boolean>(false);
  const [diffError, setDiffError] = useState<string | null>(null);
  const { copy: copyDiff, copiedKey: copiedDiffKey } = useCopyToClipboard();

  const [activeProjectOverride, setActiveProjectOverride] = useState<GitProjectInfo | null>(null);

  useEffect(() => {
    if (!selectedPath) return;
    if (window.electronAPI && window.electronAPI.getProjectInfo) {
      window.electronAPI.getProjectInfo(selectedPath).then((info) => {
        if (info) setActiveProjectOverride(info);
      });
    }
  }, [selectedPath]);

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.currentBranch.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentProject =
    (activeProjectOverride && activeProjectOverride.path === selectedPath)
      ? activeProjectOverride
      : (projects.find((p) => p.path === selectedPath) || filteredProjects[0]);

  const handleOpenPr = async () => {
    if (!currentProject) return;
    const url = await window.electronAPI.buildPrUrl(currentProject.path, targetBranch);
    if (url) {
      await window.electronAPI.openExternal(url);
    }
  };

  const handleOpenRemoteRepo = async () => {
    if (!currentProject || !currentProject.remoteUrl) return;
    let url = currentProject.remoteUrl;
    if (url.includes('dev.azure.com')) {
      const match = url.match(/https:\/\/[^@]*@?(dev\.azure\.com\/[^/]+\/[^/]+\/_git\/[^/\s]+)/);
      if (match) url = `https://${match[1]}`;
    } else if (url.includes('github.com')) {
      url = url
        .replace(/^git@github\.com:/, 'https://github.com/')
        .replace(/https:\/\/[^@]+@github\.com\//, 'https://github.com/')
        .replace(/\.git$/, '');
    } else if (url.includes('gitlab.com')) {
      url = url
        .replace(/^git@gitlab\.com:/, 'https://gitlab.com/')
        .replace(/https:\/\/[^@]+@gitlab\.com\//, 'https://gitlab.com/')
        .replace(/\.git$/, '');
    }
    await window.electronAPI.openExternal(url);
  };

  const remoteProviderLabel = useMemo(() => {
    if (!currentProject?.remoteUrl) return null;
    const prov = currentProject.provider;
    if (prov === 'github' || currentProject.remoteUrl.includes('github.com')) return 'Ver no GitHub';
    if (prov === 'gitlab' || currentProject.remoteUrl.includes('gitlab.com')) return 'Ver no GitLab';
    if (currentProject.isAzure || currentProject.remoteUrl.includes('dev.azure.com')) return 'Ver no Azure';
    return 'Ver Remoto';
  }, [currentProject]);

  const handleOpenAzurePipelines = async () => {
    if (!currentProject || !currentProject.isAzure || !currentProject.azureOrg || !currentProject.azureProject) return;
    const url = `https://dev.azure.com/${currentProject.azureOrg}/${currentProject.azureProject}/_build`;
    await window.electronAPI.openExternal(url);
  };

  const handleExecGit = async (command: 'fetch' | 'pull' | 'stash' | 'stash-pop') => {
    if (!currentProject || isExecutingGit) return;
    setIsExecutingGit(true);
    setGitOutputIsError(false);
    setGitOutput(`Executando git ${command} no repositório ${currentProject.name}...`);
    try {
      const res = await window.electronAPI.execGitCommand(currentProject.path, command);
      setGitOutput(res.output);
      onRefreshProjects();
    } catch (err: any) {
      setGitOutputIsError(true);
      setGitOutput(`Erro: ${err?.message || err}`);
    } finally {
      setIsExecutingGit(false);
    }
  };

  const handleCheckoutBranch = async (branchName: string, createNew = false) => {
    if (!currentProject) return;
    setIsExecutingGit(true);
    setGitOutputIsError(false);
    setGitOutput(`Alternando branch para '${branchName}' no repositório ${currentProject.name}...`);
    try {
      const res = await window.electronAPI.checkoutBranch(currentProject.path, branchName, createNew);
      setGitOutput(res.output);
      onRefreshProjects();
      setIsBranchModalOpen(false);
      setNewBranchName('');
    } catch (err: any) {
      setGitOutputIsError(true);
      setGitOutput(`Erro ao alternar branch: ${err?.message || err}`);
    } finally {
      setIsExecutingGit(false);
    }
  };

  const handleCommitAndPush = async () => {
    if (!currentProject || !commitMessage.trim()) return;
    setIsCommitting(true);
    setGitOutputIsError(false);
    setGitOutput(`Executando commit & push no repositório ${currentProject.name}...`);
    try {
      const res = await window.electronAPI.commitAndPush(currentProject.path, commitMessage.trim());
      setGitOutput(res.output);
      onRefreshProjects();
      setIsCommitModalOpen(false);
      setCommitMessage('');
    } catch (err: any) {
      setGitOutputIsError(true);
      setGitOutput(`Erro no commit/push: ${err?.message || err}`);
    } finally {
      setIsCommitting(false);
    }
  };

  const handleOpenHistory = async () => {
    if (!currentProject) return;
    setIsHistoryModalOpen(true);
    setIsLoadingHistory(true);
    setHistoryError(null);
    setCommitHistory([]);
    try {
      const history = await window.electronAPI.getCommitHistory(currentProject.path, 15);
      setCommitHistory(history || []);
    } catch (err: any) {
      console.error('Erro ao buscar histórico de commits:', err);
      setHistoryError(err?.message || String(err));
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleOpenDiff = async (targetFilePath?: string) => {
    if (!currentProject) return;
    setIsDiffModalOpen(true);
    setIsLoadingDiff(true);
    setDiffError(null);
    setSelectedDiffFile(targetFilePath || null);
    try {
      const [files, diffRes] = await Promise.all([
        window.electronAPI.getGitStatusDetails(currentProject.path),
        window.electronAPI.getGitDiff(currentProject.path, targetFilePath)
      ]);
      setDiffFiles(files || []);
      setDiffText(diffRes?.diff || (diffRes?.error ? `Erro: ${diffRes.error}` : 'Nenhuma alteração encontrada.'));
    } catch (err: any) {
      setDiffError(err?.message || String(err));
    } finally {
      setIsLoadingDiff(false);
    }
  };

  const handleSelectDiffFile = async (filePath: string | null) => {
    if (!currentProject) return;
    setSelectedDiffFile(filePath);
    setIsLoadingDiff(true);
    try {
      const diffRes = await window.electronAPI.getGitDiff(currentProject.path, filePath || undefined);
      setDiffText(diffRes?.diff || (diffRes?.error ? `Erro: ${diffRes.error}` : 'Nenhuma alteração encontrada neste arquivo.'));
    } catch (err: any) {
      setDiffError(err?.message || String(err));
    } finally {
      setIsLoadingDiff(false);
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
                Controle de Versão (Git)
                <span className="text-[10px] bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  {projects.length} {projects.length === 1 ? 'Repositório Ativo' : 'Repositórios Ativos'}
                </span>
                <button
                  type="button"
                  onClick={tour.open}
                  className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted transition cursor-pointer"
                  title="Rever o tour guiado desta página"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Gestão de branches locais, sincronização remota e criação direta de Pull Requests (Azure DevOps, GitHub ou GitLab).
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
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5" data-tour="repo-list">
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

                  {currentProject.remoteUrl && (
                    <div className="flex items-center space-x-2">
                      {currentProject.isAzure && (
                        <button
                          onClick={handleOpenAzurePipelines}
                          className="flex items-center space-x-1.5 text-xs text-foreground bg-card hover:bg-muted border border-border px-3 py-1.5 rounded-xl font-bold transition-all shadow-sm cursor-pointer"
                          title="Ver pipelines de integração contínua (CI/CD) no Azure DevOps"
                        >
                          <span>Pipelines CI/CD</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      )}

                      <button
                        onClick={handleOpenRemoteRepo}
                        className="flex items-center space-x-1.5 text-xs text-primary bg-primary/10 hover:bg-primary/20 border border-primary/30 px-3 py-1.5 rounded-xl font-bold transition-all shadow-sm cursor-pointer"
                        title="Abrir repositório no navegador"
                      >
                        <span>{remoteProviderLabel || 'Ver Remoto'}</span>
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
                      <div className="flex items-center gap-1.5 mt-0.5" data-tour="branch-atual">
                        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-300">
                          {currentProject.currentBranch}
                        </span>
                        <button
                          type="button"
                          data-tour="trocar-branch"
                          onClick={() => setIsBranchModalOpen(true)}
                          className="px-1.5 py-0.5 rounded bg-muted/60 hover:bg-muted border border-border text-[10px] font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer"
                          title="Alternar branch ou criar uma nova"
                        >
                          Trocar / Nova
                        </button>
                      </div>
                    </div>

                    {(currentProject.uncommittedCount || 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => handleOpenDiff()}
                        className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-[11px] font-mono transition cursor-pointer"
                        title="Inspecionar arquivos alterados e visualizador de diff"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                        <span>{currentProject.uncommittedCount} alteração(ões)</span>
                        <Eye className="w-3 h-3 ml-1 opacity-70" />
                      </button>
                    )}
                  </div>

                  {/* Ações Rápidas de Git */}
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenDiff()}
                      className="px-2.5 py-1.5 bg-card hover:bg-muted border border-border text-foreground rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
                      title="Visualizar diff e arquivos alterados"
                    >
                      <Split className="w-3.5 h-3.5 text-amber-400" />
                      <span>Diff</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenHistory}
                      className="px-2.5 py-1.5 bg-card hover:bg-muted border border-border text-foreground rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
                      title="Ver últimos commits deste repositório"
                    >
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span>Histórico</span>
                    </button>
                    <button
                      type="button"
                      data-tour="commit-push"
                      onClick={() => setIsCommitModalOpen(true)}
                      className="px-2.5 py-1.5 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/40 text-emerald-500 dark:text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
                      title="Fazer commit rápido e push para o repositório remoto"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Commit & Push</span>
                    </button>
                    <button
                      data-tour="acoes-sync"
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
                      {currentProject.provider === 'github'
                        ? 'Criar Pull Request no GitHub'
                        : currentProject.provider === 'gitlab'
                        ? 'Criar Merge Request no GitLab'
                        : 'Criar Pull Request no Azure DevOps'}
                    </span>

                    <div className="flex items-center space-x-2 text-xs" data-tour="selecionar-branch-destino">
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
                    data-tour="criar-pull-request"
                    onClick={handleOpenPr}
                    disabled={!currentProject.provider}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg ${
                      currentProject.provider
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/30 hover:scale-[1.01] border border-primary/40'
                        : 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                    }`}
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>
                      {currentProject.provider === 'azure'
                        ? 'Abrir Formulário de Pull Request no Azure DevOps'
                        : currentProject.provider === 'github'
                        ? 'Abrir Formulário de Pull Request no GitHub'
                        : currentProject.provider === 'gitlab'
                        ? 'Abrir Formulário de Merge Request no GitLab'
                        : 'Repositório não possui remoto compatível (Azure DevOps, GitHub ou GitLab)'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Console de Saída do Git */}
              {gitOutput && (
                <div
                  className={`rounded-xl p-3 font-mono text-xs whitespace-pre-wrap border ${
                    gitOutputIsError
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
                      : 'bg-card border-border text-foreground'
                  }`}
                >
                  <div
                    className={`flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider mb-1 ${
                      gitOutputIsError ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'
                    }`}
                  >
                    {gitOutputIsError && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span>{gitOutputIsError ? 'Erro no Git:' : 'Terminal Git:'}</span>
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
      {/* Modal 1: Trocar ou Criar Branch */}
      {isBranchModalOpen && currentProject && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
              <div className="flex items-center space-x-2">
                <GitBranch className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-bold text-foreground">Gerenciar Branches - {currentProject.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBranchModalOpen(false)}
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Criar Nova Branch */}
              <div className="p-3 bg-muted/40 border border-border/70 rounded-xl space-y-2">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-primary" /> Criar e alternar para nova branch:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder="ex: feature/rotina-1400"
                    className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => handleCheckoutBranch(newBranchName, true)}
                    disabled={isExecutingGit || !newBranchName.trim()}
                    className="px-3 py-1.5 bg-primary text-primary-foreground font-bold rounded-lg text-xs hover:bg-primary/90 transition disabled:opacity-50 cursor-pointer"
                  >
                    Criar
                  </button>
                </div>
              </div>

              {/* Lista de Branches Existentes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase text-[10px] tracking-wider block">
                  Branches Disponíveis ({currentProject.branches.length}):
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {currentProject.branches.map((b) => {
                    const isCurrent = b === currentProject.currentBranch;
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => !isCurrent && handleCheckoutBranch(b, false)}
                        disabled={isCurrent || isExecutingGit}
                        className={`w-full text-left p-2 rounded-lg font-mono text-xs flex items-center justify-between transition border cursor-pointer ${
                          isCurrent
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-bold'
                            : 'bg-card border-transparent hover:bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span className="truncate">{b}</span>
                        {isCurrent ? (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-sans">Ativa</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-sans">Checkout</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Commit & Push Rápido */}
      {isCommitModalOpen && currentProject && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
              <div className="flex items-center space-x-2">
                <UploadCloud className="w-5 h-5 text-emerald-500" />
                <div>
                  <h3 className="text-sm font-bold text-foreground">Commit & Push Rápido</h3>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {currentProject.name} [{currentProject.currentBranch}]
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCommitModalOpen(false)}
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Mensagem de Commit (git add . && git commit -m && git push):
                </label>
                <textarea
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="ex: feat: ajustes na rotina de faturamento 1400"
                  rows={3}
                  className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-foreground font-mono focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-muted/30 p-2.5 rounded-xl border border-border/60">
                <span>{currentProject.uncommittedCount || 0} arquivo(s) modificado(s) serão incluídos.</span>
                <span className="text-primary font-mono font-bold">git push origin</span>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCommitModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCommitAndPush}
                  disabled={isCommitting || !commitMessage.trim()}
                  className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs flex items-center space-x-1.5 transition disabled:opacity-50 shadow-md shadow-primary/25 cursor-pointer"
                >
                  <UploadCloud className={`w-3.5 h-3.5 ${isCommitting ? 'animate-pulse' : ''}`} />
                  <span>{isCommitting ? 'Enviando...' : 'Confirmar & Enviar (Push)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Histórico Visual de Commits */}
      {isHistoryModalOpen && currentProject && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold text-foreground">Histórico de Commits - {currentProject.name}</h3>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Últimos commits da branch {currentProject.currentBranch}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {isLoadingHistory ? (
                <div className="h-48 flex flex-col items-center justify-center text-xs text-muted-foreground space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                  <span>Carregando histórico do Git...</span>
                </div>
              ) : historyError ? (
                <div className="h-48 flex flex-col items-center justify-center text-xs text-rose-600 dark:text-rose-400 space-y-2 text-center px-4">
                  <AlertCircle className="w-8 h-8 opacity-70" />
                  <p className="font-semibold text-foreground">Falha ao carregar histórico</p>
                  <p className="text-muted-foreground font-mono">{historyError}</p>
                </div>
              ) : commitHistory.length === 0 ? (
                <div className="h-36 flex flex-col items-center justify-center text-xs text-muted-foreground">
                  <GitCommit className="w-8 h-8 opacity-30 mb-2" />
                  <p>Nenhum commit retornado pelo repositório.</p>
                </div>
              ) : (
                commitHistory.map((c) => (
                  <div
                    key={c.hash}
                    className="p-3 rounded-xl bg-card border border-border/70 hover:border-border transition space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => copyHash(c.hash)}
                          title="Clique para copiar hash do commit"
                          className="font-mono font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 px-1.5 py-0.5 rounded text-[10px] transition cursor-pointer"
                        >
                          {copiedHash === c.hash ? 'Copiado!' : c.hash}
                        </button>
                        <span className="font-bold text-foreground truncate max-w-[280px] sm:max-w-md">{c.author}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">{c.date}</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">{c.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Inspeção de Diff */}
      {isDiffModalOpen && currentProject && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Cabeçalho do Modal de Diff */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
              <div className="flex items-center space-x-2">
                <Split className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Alterações e Diff - {currentProject.name}
                  </h3>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {diffFiles.length} arquivo(s) modificado(s) em relação a HEAD
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => copyDiff(diffText)}
                  disabled={!diffText || isLoadingDiff}
                  className="px-2.5 py-1.5 bg-card hover:bg-muted border border-border text-foreground rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40"
                  title="Copiar diff unificado para a área de transferência"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedDiffKey === diffText ? 'Copiado!' : 'Copiar Diff'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDiffModalOpen(false);
                    setIsCommitModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  title="Prosseguir para commit destas alterações"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Commitar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDiffModalOpen(false)}
                  className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Corpo do Modal: Split entre lista de arquivos e visualizador */}
            <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
              {/* Painel lateral: lista de arquivos alterados */}
              <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-border bg-muted/20 flex flex-col shrink-0">
                <div className="p-3 border-b border-border flex items-center justify-between text-xs font-bold text-muted-foreground shrink-0">
                  <span>Arquivos Alterados</span>
                  <button
                    type="button"
                    onClick={() => handleSelectDiffFile(null)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ${
                      selectedDiffFile === null
                        ? 'bg-primary text-primary-foreground font-bold'
                        : 'bg-muted hover:bg-muted/80 text-foreground'
                    }`}
                  >
                    Ver Todos
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {diffFiles.length === 0 ? (
                    <div className="h-32 flex flex-col items-center justify-center text-xs text-muted-foreground text-center p-3">
                      <Check className="w-6 h-6 text-emerald-500 mb-1" />
                      <span>Árvore de trabalho limpa.</span>
                    </div>
                  ) : (
                    diffFiles.map((file) => {
                      const isSelected = selectedDiffFile === file.path;
                      const badgeColor =
                        file.status === 'added'
                          ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                          : file.status === 'deleted'
                          ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                          : file.status === 'untracked'
                          ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                          : 'bg-amber-500/15 text-amber-500 border-amber-500/30';
                      const badgeLabel =
                        file.status === 'added'
                          ? 'A'
                          : file.status === 'deleted'
                          ? 'D'
                          : file.status === 'untracked'
                          ? '?'
                          : 'M';

                      return (
                        <button
                          key={file.path}
                          type="button"
                          onClick={() => handleSelectDiffFile(file.path)}
                          className={`w-full text-left p-2 rounded-lg text-xs font-mono flex items-center gap-2 transition cursor-pointer ${
                            isSelected
                              ? 'bg-primary/15 border border-primary/40 text-foreground font-semibold'
                              : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground border border-transparent'
                          }`}
                        >
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${badgeColor}`}
                          >
                            {badgeLabel}
                          </span>
                          <span className="truncate flex-1" title={file.path}>
                            {file.path}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Painel Principal: Visualizador de Diff com coloração de sintaxe */}
              <div className="flex-1 bg-background/80 flex flex-col min-h-0 overflow-hidden">
                {isLoadingDiff ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-xs text-muted-foreground space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                    <span>Carregando diff do Git...</span>
                  </div>
                ) : diffError ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-xs text-rose-500 p-6 space-y-2 text-center">
                    <AlertCircle className="w-8 h-8 opacity-70" />
                    <p className="font-bold text-foreground">Erro ao carregar diff</p>
                    <p className="font-mono text-muted-foreground">{diffError}</p>
                  </div>
                ) : !diffText || diffText.trim() === '' ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-xs text-muted-foreground space-y-2">
                    <FileCode className="w-8 h-8 opacity-30" />
                    <p>Nenhuma alteração detectada para este arquivo.</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto p-3 font-mono text-xs select-text">
                    <pre className="whitespace-pre font-mono">
                      {diffText.split(/\r?\n/).map((line, idx) => {
                        let lineStyle = 'text-muted-foreground';
                        if (line.startsWith('+++') || line.startsWith('---')) {
                          lineStyle = 'text-foreground font-bold';
                        } else if (line.startsWith('+')) {
                          lineStyle = 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded-xs block';
                        } else if (line.startsWith('-')) {
                          lineStyle = 'text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1 rounded-xs block';
                        } else if (line.startsWith('@@')) {
                          lineStyle = 'text-sky-600 dark:text-sky-400 bg-sky-500/10 px-1 rounded-xs font-bold block my-1';
                        } else if (line.startsWith('diff --git')) {
                          lineStyle = 'text-foreground font-bold border-t border-border pt-2 mt-2 block';
                        }
                        return (
                          <div key={idx} className={lineStyle}>
                            {line || ' '}
                          </div>
                        );
                      })}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <OnboardingTour
        steps={GIT_TOUR_STEPS}
        isOpen={tour.isOpen}
        onClose={tour.close}
        storageKey={GIT_TOUR_STORAGE_KEY}
      />
    </div>
  );
};
