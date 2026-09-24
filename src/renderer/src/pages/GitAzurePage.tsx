import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { buildTargetBranchOptions, fileStatusBadge, limitDiffLines } from '../utils/gitPageUtils';

const MAX_RENDERED_DIFF_LINES = 4000;

interface GitAzurePageProps {
  projects: GitProjectInfo[];
  onRefreshProjects: () => void | Promise<void>;
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
        setPreferredTarget(st.targetPrBranch || '');
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
  const [preferredTarget, setPreferredTarget] = useState<string>('');
  const [gitOutput, setGitOutput] = useState<string | null>(null);
  const [gitOutputIsError, setGitOutputIsError] = useState<boolean>(false);
  const [isExecutingGit, setIsExecutingGit] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Estados de Modais Avançados
  const [isCommitModalOpen, setIsCommitModalOpen] = useState<boolean>(false);
  const [commitMessage, setCommitMessage] = useState<string>('');
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [commitFiles, setCommitFiles] = useState<GitFileStatus[]>([]);
  const [isLoadingCommitFiles, setIsLoadingCommitFiles] = useState<boolean>(false);

  const [isBranchModalOpen, setIsBranchModalOpen] = useState<boolean>(false);
  const [newBranchName, setNewBranchName] = useState<string>('');
  const [branchFilter, setBranchFilter] = useState<string>('');
  const [branchError, setBranchError] = useState<string | null>(null);

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

  const diffRequestRef = useRef(0);

  // Info "fresca" do repositório selecionado (com contagem de alterações via git status); a lista
  // vinda do App usa só leitura de filesystem. Precisa ser recarregada após cada operação git,
  // senão o painel continua mostrando a branch/contagem de antes do checkout ou commit.
  const [activeProjectOverride, setActiveProjectOverride] = useState<GitProjectInfo | null>(null);
  const selectedPathRef = useRef(selectedPath);
  selectedPathRef.current = selectedPath;

  // Contagem de alterações de todos os repositórios (git status em lote). Só roda quando esta
  // aba é aberta ou sincronizada — a lista do App vem do filesystem para não pesar no startup.
  const [uncommittedCounts, setUncommittedCounts] = useState<Record<string, number>>({});
  const isCountingRef = useRef(false);

  const refreshUncommittedCounts = useCallback(async () => {
    if (isCountingRef.current || !window.electronAPI?.getGitUncommittedCounts) return;
    isCountingRef.current = true;
    try {
      setUncommittedCounts((await window.electronAPI.getGitUncommittedCounts()) || {});
    } catch (err) {
      console.warn('[Git] Erro ao contar alterações dos repositórios:', err);
    } finally {
      isCountingRef.current = false;
    }
  }, []);

  useEffect(() => {
    refreshUncommittedCounts();
  }, [settingsVersion, refreshUncommittedCounts]);

  const refreshSelectedProject = useCallback(async (projectPath: string) => {
    if (!projectPath || !window.electronAPI?.getProjectInfo) return;
    try {
      const info = await window.electronAPI.getProjectInfo(projectPath);
      if (info) {
        setUncommittedCounts((prev) => ({ ...prev, [info.path]: info.uncommittedCount ?? 0 }));
      }
      // Descarta respostas de um repositório que deixou de estar selecionado no meio da chamada.
      if (info && info.path === selectedPathRef.current) {
        setActiveProjectOverride(info);
      }
    } catch (err) {
      console.warn('[Git] Erro ao atualizar informações do repositório:', err);
    }
  }, []);

  useEffect(() => {
    // A saída do terminal é do repositório anterior; mantê-la sugere que o erro é do atual.
    setGitOutput(null);
    setGitOutputIsError(false);
    if (selectedPath) refreshSelectedProject(selectedPath);
  }, [selectedPath, refreshSelectedProject]);

  // Em sequência: a lista (listProjects) usa a contagem de alterações em cache no service, que só
  // fica atualizada depois do git status disparado por getProjectInfo do repositório selecionado.
  const refreshAfterGitChange = async (projectPath: string) => {
    await refreshSelectedProject(projectPath);
    await onRefreshProjects();
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.currentBranch.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentProject =
    (activeProjectOverride && activeProjectOverride.path === selectedPath)
      ? activeProjectOverride
      : (projects.find((p) => p.path === selectedPath) || filteredProjects[0]);

  const targetBranchOptions = useMemo(
    () =>
      currentProject
        ? buildTargetBranchOptions({
            remoteBranches: currentProject.remoteBranches,
            currentBranch: currentProject.currentBranch,
            selected: targetBranch,
            preferred: preferredTarget
          })
        : [],
    [currentProject, targetBranch, preferredTarget]
  );

  const prBlockedReason = !currentProject
    ? null
    : !currentProject.provider
    ? 'Repositório não possui remoto compatível (Azure DevOps, GitHub ou GitLab)'
    : currentProject.detachedHead
    ? 'HEAD destacado: faça checkout de uma branch para abrir um Pull Request'
    : targetBranch === currentProject.currentBranch
    ? 'A branch de destino é a mesma da branch atual'
    : null;

  const handleOpenPr = async () => {
    if (!currentProject || prBlockedReason) return;
    const url = await window.electronAPI.buildPrUrl(currentProject.path, targetBranch);
    if (url) {
      await window.electronAPI.openExternal(url);
    } else {
      setGitOutputIsError(true);
      setGitOutput('Não foi possível montar a URL do Pull Request para este repositório.');
    }
  };

  const handleOpenRemoteRepo = async () => {
    if (!currentProject?.webUrl) return;
    await window.electronAPI.openExternal(currentProject.webUrl);
  };

  const remoteProviderLabel =
    currentProject?.provider === 'github'
      ? 'Ver no GitHub'
      : currentProject?.provider === 'gitlab'
      ? 'Ver no GitLab'
      : currentProject?.provider === 'azure'
      ? 'Ver no Azure'
      : 'Ver Remoto';

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
      setGitOutputIsError(!res.success);
      setGitOutput(res.output);
      await refreshAfterGitChange(currentProject.path);
    } catch (err: any) {
      setGitOutputIsError(true);
      setGitOutput(`Erro: ${err?.message || err}`);
    } finally {
      setIsExecutingGit(false);
    }
  };

  const closeBranchModal = () => {
    setIsBranchModalOpen(false);
    setBranchError(null);
    setBranchFilter('');
  };

  const handleCheckoutBranch = async (branchName: string, createNew = false) => {
    if (!currentProject || isExecutingGit) return;
    setIsExecutingGit(true);
    setBranchError(null);
    setGitOutputIsError(false);
    setGitOutput(`Alternando branch para '${branchName}' no repositório ${currentProject.name}...`);
    try {
      const res = await window.electronAPI.checkoutBranch(currentProject.path, branchName, createNew);
      setGitOutputIsError(!res.success);
      setGitOutput(res.output);
      if (res.success) {
        closeBranchModal();
        setNewBranchName('');
        await refreshAfterGitChange(currentProject.path);
      } else {
        // O modal cobre o terminal da página; o erro precisa aparecer dentro dele.
        setBranchError(res.output);
      }
    } catch (err: any) {
      const message = `Erro ao alternar branch: ${err?.message || err}`;
      setGitOutputIsError(true);
      setGitOutput(message);
      setBranchError(message);
    } finally {
      setIsExecutingGit(false);
    }
  };

  const openCommitModal = async () => {
    if (!currentProject) return;
    setCommitError(null);
    setIsCommitModalOpen(true);
    setIsLoadingCommitFiles(true);
    try {
      const files = await window.electronAPI.getGitStatusDetails(currentProject.path);
      setCommitFiles(files || []);
    } catch {
      setCommitFiles([]);
    } finally {
      setIsLoadingCommitFiles(false);
    }
  };

  const handleCommitAndPush = async () => {
    if (!currentProject || !commitMessage.trim() || isCommitting) return;
    setIsCommitting(true);
    setCommitError(null);
    setGitOutputIsError(false);
    setGitOutput(`Executando commit & push no repositório ${currentProject.name}...`);
    try {
      const res = await window.electronAPI.commitAndPush(currentProject.path, commitMessage.trim());
      if (!res.success) {
        // Mantém o modal aberto com a mensagem digitada para o usuário corrigir e tentar de novo.
        setCommitError(res.output);
        setGitOutputIsError(true);
        setGitOutput(res.output);
      } else {
        // Push com falha: o commit já existe localmente, então o modal fecha, mas o aviso fica em destaque.
        setGitOutputIsError(Boolean(res.pushFailed));
        setGitOutput(res.output);
        setIsCommitModalOpen(false);
        setCommitMessage('');
      }
      await refreshAfterGitChange(currentProject.path);
    } catch (err: any) {
      const message = `Erro no commit/push: ${err?.message || err}`;
      setCommitError(message);
      setGitOutputIsError(true);
      setGitOutput(message);
    } finally {
      setIsCommitting(false);
    }
  };

  const handleSyncRepositories = async () => {
    setIsSyncing(true);
    try {
      await refreshAfterGitChange(selectedPath);
      await refreshUncommittedCounts();
    } finally {
      setIsSyncing(false);
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
    const requestId = ++diffRequestRef.current;
    setIsDiffModalOpen(true);
    setIsLoadingDiff(true);
    setDiffError(null);
    setSelectedDiffFile(targetFilePath || null);
    try {
      const [files, diffRes] = await Promise.all([
        window.electronAPI.getGitStatusDetails(currentProject.path),
        window.electronAPI.getGitDiff(currentProject.path, targetFilePath)
      ]);
      if (requestId !== diffRequestRef.current) return;
      setDiffFiles(files || []);
      if (diffRes?.error) {
        setDiffError(diffRes.error);
        setDiffText('');
      } else {
        setDiffText(diffRes?.diff || '');
      }
    } catch (err: any) {
      if (requestId === diffRequestRef.current) setDiffError(err?.message || String(err));
    } finally {
      if (requestId === diffRequestRef.current) setIsLoadingDiff(false);
    }
  };

  const handleSelectDiffFile = async (filePath: string | null) => {
    if (!currentProject) return;
    // Cliques rápidos em arquivos diferentes: só a última resposta pode preencher o visualizador.
    const requestId = ++diffRequestRef.current;
    setSelectedDiffFile(filePath);
    setIsLoadingDiff(true);
    setDiffError(null);
    try {
      const diffRes = await window.electronAPI.getGitDiff(currentProject.path, filePath || undefined);
      if (requestId !== diffRequestRef.current) return;
      if (diffRes?.error) {
        setDiffError(diffRes.error);
        setDiffText('');
      } else {
        setDiffText(diffRes?.diff || '');
      }
    } catch (err: any) {
      if (requestId === diffRequestRef.current) setDiffError(err?.message || String(err));
    } finally {
      if (requestId === diffRequestRef.current) setIsLoadingDiff(false);
    }
  };

  const renderedDiff = useMemo(() => limitDiffLines(diffText, MAX_RENDERED_DIFF_LINES), [diffText]);

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
              onClick={handleSyncRepositories}
              disabled={isRefreshing || isSyncing}
              className="px-3 py-2 bg-card hover:bg-muted border border-border rounded-xl text-xs font-semibold text-foreground transition-colors flex items-center gap-1.5 disabled:opacity-60"
              title="Reescanear diretório de projetos Git"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isSyncing ? 'animate-spin text-primary' : ''}`} />
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
              const pendingCount = uncommittedCounts[p.path] ?? p.uncommittedCount ?? 0;
              const hasChanges = pendingCount > 0;

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
                          title={`${pendingCount} arquivo(s) modificado(s)`}
                        >
                          ● {pendingCount}
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

                  {currentProject.webUrl && (
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
                        <span>{remoteProviderLabel}</span>
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
                        {currentProject.detachedHead && (
                          <span
                            className="text-[9px] bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold"
                            title="O repositório está em um commit específico, fora de qualquer branch"
                          >
                            HEAD DESTACADO
                          </span>
                        )}
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
                      onClick={openCommitModal}
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
                        {targetBranchOptions.map((b) => (
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
                    disabled={Boolean(prBlockedReason)}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg ${
                      !prBlockedReason
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/30 hover:scale-[1.01] border border-primary/40'
                        : 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                    }`}
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>
                      {prBlockedReason
                        ? prBlockedReason
                        : currentProject.provider === 'azure'
                        ? 'Abrir Formulário de Pull Request no Azure DevOps'
                        : currentProject.provider === 'github'
                        ? 'Abrir Formulário de Pull Request no GitHub'
                        : 'Abrir Formulário de Merge Request no GitLab'}
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
                onClick={closeBranchModal}
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {branchError && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-[11px] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{branchError}</span>
                </div>
              )}

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

              {/* Lista de Branches Existentes (locais + só no origin, que o checkout passa a rastrear) */}
              {(() => {
                const localBranches = currentProject.branches;
                const remoteOnly = (currentProject.remoteBranches || []).filter((b) => !localBranches.includes(b));
                const filter = branchFilter.trim().toLowerCase();
                const visible = [
                  ...localBranches.map((name) => ({ name, remote: false })),
                  ...remoteOnly.map((name) => ({ name, remote: true }))
                ].filter((b) => !filter || b.name.toLowerCase().includes(filter));

                return (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider block">
                        Branches Disponíveis ({localBranches.length + remoteOnly.length}):
                      </label>
                      <div className="relative">
                        <Search className="w-3 h-3 text-muted-foreground absolute left-2 top-1.5" />
                        <input
                          type="text"
                          value={branchFilter}
                          onChange={(e) => setBranchFilter(e.target.value)}
                          placeholder="Filtrar..."
                          aria-label="Filtrar branches"
                          className="w-36 bg-background border border-border rounded-lg pl-6 pr-2 py-1 text-[11px] text-foreground font-mono focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {visible.length === 0 && (
                        <p className="text-[11px] text-muted-foreground text-center py-3">Nenhuma branch encontrada.</p>
                      )}
                      {visible.map(({ name, remote }) => {
                        const isCurrent = !remote && name === currentProject.currentBranch;
                        return (
                          <button
                            key={`${remote ? 'remote' : 'local'}:${name}`}
                            type="button"
                            onClick={() => !isCurrent && handleCheckoutBranch(name, false)}
                            disabled={isCurrent || isExecutingGit}
                            className={`w-full text-left p-2 rounded-lg font-mono text-xs flex items-center justify-between transition border cursor-pointer ${
                              isCurrent
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold'
                                : 'bg-card border-transparent hover:bg-muted text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <span className="truncate">{name}</span>
                            {isCurrent ? (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 px-1.5 py-0.5 rounded font-sans">Ativa</span>
                            ) : remote ? (
                              <span
                                className="text-[10px] text-sky-600 dark:text-sky-400 font-sans shrink-0"
                                title="Existe só no origin; o checkout cria a branch local rastreando origin"
                              >
                                origin · Checkout
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground font-sans">Checkout</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
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
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {commitError && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-[11px] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{commitError}</span>
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Mensagem de Commit (git add -A && git commit && git push):
                </label>
                <textarea
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="ex: feat: ajustes na rotina de faturamento 1400"
                  rows={3}
                  className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-foreground font-mono focus:outline-none focus:border-primary resize-none"
                />
              </div>

              {/* git add -A inclui arquivos não rastreados: listar evita subir um .env ou build por engano */}
              <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-xl border border-border/60 overflow-hidden">
                <div className="flex items-center justify-between p-2.5 border-b border-border/60">
                  <span>
                    {isLoadingCommitFiles
                      ? 'Carregando arquivos alterados...'
                      : `${commitFiles.length} arquivo(s) serão incluídos (inclusive não rastreados).`}
                  </span>
                  <span className="text-primary font-mono font-bold">git push origin</span>
                </div>
                {!isLoadingCommitFiles && commitFiles.length > 0 && (
                  <div className="max-h-36 overflow-y-auto p-1.5 space-y-0.5">
                    {commitFiles.map((file) => {
                      const badge = fileStatusBadge(file.status);
                      return (
                        <div
                          key={file.path}
                          className="flex items-center gap-2 px-1.5 py-0.5 font-mono text-[11px] text-foreground"
                          title={file.originalPath ? `${file.originalPath} → ${file.path}` : file.path}
                        >
                          <span className={`px-1 rounded text-[9px] font-bold border shrink-0 ${badge.className}`}>{badge.label}</span>
                          <span className="truncate">{file.path}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
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
                  disabled={isCommitting || !commitMessage.trim() || (!isLoadingCommitFiles && commitFiles.length === 0)}
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
                    openCommitModal();
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
                      const badge = fileStatusBadge(file.status);

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
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                          <span
                            className="truncate flex-1"
                            title={file.originalPath ? `${file.originalPath} → ${file.path}` : file.path}
                          >
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
                    {renderedDiff.hiddenCount > 0 && (
                      <div className="mb-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-sans text-[11px]">
                        Diff extenso: exibindo as primeiras {MAX_RENDERED_DIFF_LINES} linhas ({renderedDiff.hiddenCount} ocultas).
                        Selecione um arquivo na lista ou use "Copiar Diff" para obter o conteúdo completo.
                      </div>
                    )}
                    <pre className="whitespace-pre font-mono">
                      {renderedDiff.lines.map((line, idx) => {
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
