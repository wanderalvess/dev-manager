import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Play,
  AlertTriangle,
  Sparkles,
  Copy,
  Check,
  Package,
  FileText,
  ListTree,
  RotateCcw,
  RotateCw,
  Zap,
  Settings,
  Hammer,
  Search,
  Square,
  X
} from 'lucide-react';
import { GitProjectInfo, KarafDeployRequest, KarafBundleInfo } from '../../../shared/types';
import { TerminalViewer } from '../components/TerminalViewer';

interface KarafDeployPageProps {
  projects: GitProjectInfo[];
  onNavigateToSettings?: () => void;
}

export const KarafDeployPage: React.FC<KarafDeployPageProps> = ({ projects, onNavigateToSettings }) => {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [repoCommand, setRepoCommand] = useState<string>(
    'feature:repo-add mvn:com.empresa.service/meu-servico/0.0.1-SNAPSHOT/xml/features'
  );
  const [installCommand, setInstallCommand] = useState<string>(
    'feature:install -r -u meu-servico/0.0.1-SNAPSHOT'
  );
  const [karafUser, setKarafUser] = useState<string>('karaf');
  const [karafPass, setKarafPass] = useState<string>('karaf');
  const [karafPort, setKarafPort] = useState<number>(8101);
  const [karafPath, setKarafPath] = useState<string>('');
  const [karafValid, setKarafValid] = useState<boolean | null>(null);
  const [runMavenBeforeDeploy, setRunMavenBeforeDeploy] = useState<boolean>(false);
  const [skipTests, setSkipTests] = useState<boolean>(true);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [isBuildingMaven, setIsBuildingMaven] = useState<boolean>(false);

  // Modal e Gestão de Bundles OSGi
  const [isBundlesModalOpen, setIsBundlesModalOpen] = useState<boolean>(false);
  const [bundles, setBundles] = useState<KarafBundleInfo[]>([]);
  const [bundleSearch, setBundleSearch] = useState<string>('');
  const [isLoadingBundles, setIsLoadingBundles] = useState<boolean>(false);
  const [bundleActionLoading, setBundleActionLoading] = useState<Record<string, string>>({});

  const [isDiagRunning, setIsDiagRunning] = useState<string | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [copiedPill, setCopiedPill] = useState<string | null>(null);

  const selectedProjObj = projects.find((p) => p.path === selectedProject);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getSettings().then(async (st) => {
        setKarafUser(st.karafUser || 'karaf');
        setKarafPass(st.karafPass || 'karaf');
        setKarafPort(st.karafSshPort || 8101);
        setKarafPath(st.karafPath || '');
        if (st.karafPath) {
          const check = await window.electronAPI.checkPath(`${st.karafPath}\\bin\\client.bat`);
          setKarafValid(check.exists);
        }
      });

      const unsubscribe = window.electronAPI.onKarafLogChunk((chunk) => {
        setTerminalLogs((prev) => [...prev, chunk]);
      });
      return () => unsubscribe();
    }
  }, []);

  const handleSelectProject = (projectPath: string) => {
    setSelectedProject(projectPath);
    const proj = projects.find((p) => p.path === projectPath);
    if (proj?.pomInfo) {
      const { groupId, artifactId, version } = proj.pomInfo;
      setRepoCommand(`feature:repo-add mvn:${groupId}/${artifactId}/${version}/xml/features`);
      setInstallCommand(`feature:install -r -u ${artifactId}/${version}`);
    }
  };

  const copyToClipboard = (text: string, pillId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPill(pillId);
    setTimeout(() => setCopiedPill(null), 1800);
  };

  const handleRunDeploy = async () => {
    if (isDeploying) return;
    setIsDeploying(true);
    setTerminalLogs([]);

    try {
      const settings = await window.electronAPI.getSettings();
      const request: KarafDeployRequest = {
        karafClientPath: `${settings.karafPath}\\bin\\client.bat`,
        user: karafUser,
        pass: karafPass,
        port: karafPort,
        repoUrl: repoCommand,
        featureInstall: installCommand
      };

      if (runMavenBeforeDeploy && selectedProject) {
        await window.electronAPI.buildAndDeployKaraf(request, selectedProject, skipTests);
      } else {
        await window.electronAPI.deployKaraf(request);
      }
    } catch (err: any) {
      setTerminalLogs((prev) => [...prev, `[ERRO FATAL] ${err?.message || err}\r\n`]);
    } finally {
      setIsDeploying(false);
    }
  };


  const handleRunDiagnostic = async (cmd: string, label: string) => {
    if (isDeploying || isDiagRunning) return;
    setIsDiagRunning(label);
    setTerminalLogs((prev) => [...prev, `\r\n--- Executando Diagnóstico: ${cmd} ---\r\n`]);

    try {
      await window.electronAPI.execKarafDiagnostic(cmd);
    } catch (err: any) {
      setTerminalLogs((prev) => [...prev, `[ERRO] ${err?.message || err}\r\n`]);
    } finally {
      setIsDiagRunning(null);
    }
  };

  const handleRunOnlyMavenBuild = async () => {
    if (!selectedProject) {
      alert('Selecione um projeto antes de iniciar a compilação Maven.');
      return;
    }
    setIsBuildingMaven(true);
    setTerminalLogs((prev) => [...prev, `\r\n--- Disparando Compilação Maven Manual (mvn clean install) ---\r\n`]);
    try {
      await window.electronAPI.runMavenBuild(selectedProject, skipTests);
    } catch (err: any) {
      setTerminalLogs((prev) => [...prev, `[ERRO MAVEN] ${err?.message || err}\r\n`]);
    } finally {
      setIsBuildingMaven(false);
    }
  };

  const fetchBundles = async () => {
    setIsLoadingBundles(true);
    try {
      const data = await window.electronAPI.listKarafBundles({
        user: karafUser,
        pass: karafPass,
        port: karafPort
      });
      setBundles(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar bundles do Karaf:', err);
    } finally {
      setIsLoadingBundles(false);
    }
  };

  const handleOpenBundlesModal = async () => {
    setIsBundlesModalOpen(true);
    await fetchBundles();
  };

  const handleBundleAction = async (action: 'start' | 'stop' | 'restart' | 'uninstall', bundleId: string) => {
    setBundleActionLoading((prev) => ({ ...prev, [bundleId]: action }));
    try {
      await window.electronAPI.manageKarafBundle(action, bundleId, {
        user: karafUser,
        pass: karafPass,
        port: karafPort
      });
      await fetchBundles();
    } catch (err: any) {
      alert(`Falha ao executar ação no bundle: ${err?.message || err}`);
    } finally {
      setBundleActionLoading((prev) => {
        const next = { ...prev };
        delete next[bundleId];
        return next;
      });
    }
  };

  const filteredBundles = useMemo(() => {
    if (!bundleSearch.trim()) return bundles;
    const term = bundleSearch.toLowerCase();
    return bundles.filter(
      (b) =>
        b.id.toLowerCase().includes(term) ||
        b.name.toLowerCase().includes(term) ||
        b.version.toLowerCase().includes(term) ||
        b.state.toLowerCase().includes(term)
    );
  }, [bundles, bundleSearch]);

  return (
    <div className="h-full flex flex-col p-5 pb-8 space-y-4 overflow-y-auto">
      {/* Cabeçalho de Deploy Karaf */}
      <div className="cockpit-panel rounded-2xl p-4 shadow-xl border border-border shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                Publicação de Features OSGi (Apache Karaf)
                <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  client.bat
                </span>
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Instalação, atualização e diagnósticos de pacotes Maven no runtime Karaf local.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleRunOnlyMavenBuild}
              disabled={isDeploying || isBuildingMaven || !selectedProject}
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all bg-card hover:bg-muted border border-border text-foreground disabled:opacity-50 shadow-xs"
              title="Executar apenas compilação Maven (mvn clean install) no projeto selecionado"
            >
              <Hammer className={`w-3.5 h-3.5 text-amber-500 ${isBuildingMaven ? 'animate-spin' : ''}`} />
              <span>{isBuildingMaven ? 'Compilando...' : 'Compilar Maven'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenBundlesModal}
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all bg-card hover:bg-muted border border-border text-foreground shadow-xs"
              title="Abrir gerenciador visual de bundles OSGi"
            >
              <ListTree className="w-3.5 h-3.5 text-primary" />
              <span>Bundles OSGi</span>
            </button>

            <button
              onClick={handleRunDeploy}
              disabled={isDeploying || !repoCommand || !installCommand}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all shadow-lg ${
                isDeploying
                  ? 'bg-primary/40 text-muted-foreground cursor-not-allowed border border-primary/30'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/30 hover:scale-[1.02] border border-primary/40'
              }`}
            >
              <Play className={`w-4 h-4 fill-current ${isDeploying ? 'animate-pulse' : ''}`} />
              <span>
                {isDeploying
                  ? runMavenBeforeDeploy
                    ? 'Compilando & Publicando...'
                    : 'Publicando Feature...'
                  : runMavenBeforeDeploy
                  ? 'Compilar & Publicar Feature'
                  : 'Executar Publicação'}
              </span>
            </button>
          </div>

        </div>
      </div>

      {/* Grid Principal */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[480px]">
        {/* Coluna Esquerda: Configuração e Coordenadas Maven */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          {karafValid === false && (
            <div className="bg-rose-500/10 border border-rose-500/40 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-rose-700 dark:text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">Executável client.bat não localizado</span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  Não foi possível encontrar <code className="font-mono text-foreground">{karafPath}\bin\client.bat</code>.
                </span>
                {onNavigateToSettings && (
                  <button
                    type="button"
                    onClick={onNavigateToSettings}
                    className="mt-2 px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded-lg text-[11px] font-bold text-rose-700 dark:text-rose-200 flex items-center gap-1 transition-all"
                  >
                    <Settings className="w-3 h-3" />
                    <span>Ajustar Diretório nas Configurações</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Seletor do Projeto */}
          <div className="cockpit-panel rounded-2xl p-4 space-y-3.5 border border-border">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-amber-500" />
                  Projeto Selecionado para Publicação:
                </label>
                <span className="text-[10px] text-primary font-mono flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Detecção Automática (pom.xml)
                </span>
              </div>

              <select
                value={selectedProject}
                onChange={(e) => handleSelectProject(e.target.value)}
                className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors font-mono"
              >
                <option value="">-- Selecione o projeto para carregar comandos --</option>
                {projects.map((p) => (
                  <option key={p.path} value={p.path}>
                    {p.name} {p.pomInfo?.version ? `[${p.pomInfo.version}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Coordenadas Maven Detectadas */}
            {selectedProjObj?.pomInfo && (
              <div className="bg-muted/40 border border-border/70 rounded-xl p-3 space-y-2">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Coordenadas Maven Identificadas:
                </div>
                <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
                  <button
                    onClick={() => copyToClipboard(selectedProjObj.pomInfo!.groupId, 'group')}
                    className="px-2 py-0.5 rounded bg-card hover:bg-muted text-foreground border border-border flex items-center gap-1 transition-colors"
                    title="Copiar GroupID"
                  >
                    <span className="text-muted-foreground">g:</span>
                    <span className="text-primary truncate max-w-[140px]">{selectedProjObj.pomInfo.groupId}</span>
                    {copiedPill === 'group' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                  </button>

                  <button
                    onClick={() => copyToClipboard(selectedProjObj.pomInfo!.version, 'ver')}
                    className="px-2 py-0.5 rounded bg-card hover:bg-muted text-foreground border border-border flex items-center gap-1 transition-colors"
                    title="Copiar Versão"
                  >
                    <span className="text-muted-foreground">v:</span>
                    <span className="text-amber-500 font-bold">{selectedProjObj.pomInfo.version}</span>
                    {copiedPill === 'ver' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                  </button>
                </div>
              </div>
            )}

            {/* Opções de Compilação Maven pre-deploy */}
            <div className="p-3 bg-card/60 border border-border/80 rounded-xl space-y-2">
              <label className="flex items-center space-x-2 text-xs font-semibold text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={runMavenBeforeDeploy}
                  onChange={(e) => setRunMavenBeforeDeploy(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span className="flex items-center gap-1.5 font-bold">
                  <Hammer className="w-3.5 h-3.5 text-primary" />
                  Executar Maven Build (<code className="font-mono text-primary">mvn clean install</code>) antes de instalar
                </span>
              </label>

              {runMavenBeforeDeploy && (
                <div className="pl-6 pt-1 flex items-center space-x-4 text-[11px] text-muted-foreground">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skipTests}
                      onChange={(e) => setSkipTests(e.target.checked)}
                      className="rounded border-border text-amber-500 focus:ring-amber-500 h-3.5 w-3.5"
                    />
                    <span>Pular testes unitários (<code className="font-mono text-amber-500">-DskipTests</code>)</span>
                  </label>
                </div>
              )}
            </div>

            {/* Credenciais & Porta Karaf */}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Usuário Karaf
                </label>
                <input
                  type="text"
                  value={karafUser}
                  onChange={(e) => setKarafUser(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Senha Karaf
                </label>
                <input
                  type="password"
                  value={karafPass}
                  onChange={(e) => setKarafPass(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Porta SSH (client.bat)
                </label>
                <input
                  type="number"
                  value={karafPort}
                  onChange={(e) => setKarafPort(parseInt(e.target.value) || 0)}
                  className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
                  placeholder="8101"
                />
              </div>
            </div>

            {/* Comando 1: feature:repo-add */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Etapa 1: Registrar Repositório Maven (<code className="font-mono text-primary">feature:repo-add</code>)
              </label>
              <textarea
                value={repoCommand}
                onChange={(e) => setRepoCommand(e.target.value)}
                rows={2}
                className="w-full bg-card border border-border rounded-xl p-2.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary resize-none leading-relaxed"
                placeholder='feature:repo-add mvn:com.empresa.service/meu-servico/0.0.1-SNAPSHOT/xml/features'
              />
            </div>

            {/* Comando 2: feature:install */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Etapa 2: Instalar / Atualizar Feature (<code className="font-mono text-amber-500">feature:install -r -u</code>)
              </label>
              <textarea
                value={installCommand}
                onChange={(e) => setInstallCommand(e.target.value)}
                rows={2}
                className="w-full bg-card border border-border rounded-xl p-2.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary resize-none leading-relaxed"
                placeholder='feature:install -r -u meu-servico/0.0.1-SNAPSHOT'
              />
            </div>
          </div>

          {/* Ferramentas de Diagnóstico Rápido do Karaf */}
          <div className="cockpit-panel rounded-2xl p-4 space-y-2.5 shadow-xl border border-border">
            <div className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Diagnósticos Rápidos OSGi (client.bat)
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleRunDiagnostic('feature:list -i', 'features')}
                disabled={isDeploying || isDiagRunning !== null}
                className="p-2.5 bg-card hover:bg-muted border border-border rounded-xl text-left transition-all text-xs flex items-center gap-2 text-foreground"
              >
                <ListTree className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="truncate">
                  <span className="font-bold block truncate">Features Instaladas</span>
                  <span className="text-[10px] text-muted-foreground font-mono">feature:list -i</span>
                </div>
              </button>

              <button
                onClick={() => handleRunDiagnostic('bundle:list -s', 'bundles')}
                disabled={isDeploying || isDiagRunning !== null}
                className="p-2.5 bg-card hover:bg-muted border border-border rounded-xl text-left transition-all text-xs flex items-center gap-2 text-foreground"
              >
                <Package className="w-4 h-4 text-primary shrink-0" />
                <div className="truncate">
                  <span className="font-bold block truncate">Bundles Ativos</span>
                  <span className="text-[10px] text-muted-foreground font-mono">bundle:list -s</span>
                </div>
              </button>

              <button
                onClick={() => handleRunDiagnostic('log:display -n 50', 'logs')}
                disabled={isDeploying || isDiagRunning !== null}
                className="p-2.5 bg-card hover:bg-muted border border-border rounded-xl text-left transition-all text-xs flex items-center gap-2 text-foreground"
              >
                <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="truncate">
                  <span className="font-bold block truncate">Logs Recentes</span>
                  <span className="text-[10px] text-muted-foreground font-mono">log:display -n 50</span>
                </div>
              </button>

              <button
                onClick={() => handleRunDiagnostic('log:clear', 'clear')}
                disabled={isDeploying || isDiagRunning !== null}
                className="p-2.5 bg-card hover:bg-muted border border-border rounded-xl text-left transition-all text-xs flex items-center gap-2 text-foreground"
              >
                <RotateCcw className="w-4 h-4 text-rose-500 shrink-0" />
                <div className="truncate">
                  <span className="font-bold block truncate">Limpar Logs</span>
                  <span className="text-[10px] text-muted-foreground font-mono">log:clear</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Terminal com Streaming de Saída do client.bat */}
        <div className="lg:col-span-7 min-h-[450px] lg:min-h-full flex flex-col">
          <TerminalViewer
            logs={terminalLogs}
            onClear={() => setTerminalLogs([])}
            title="Console OSGi Karaf (client.bat)"
            isRunning={isDeploying || isDiagRunning !== null}
          />
        </div>
      </div>

      {/* Modal Gerenciador de Bundles OSGi */}
      {isBundlesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Header do Modal */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-primary/10 border border-primary/30 text-primary">
                  <ListTree className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    Gerenciador de Bundles OSGi
                    <span className="text-[10px] bg-primary/15 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-mono">
                      {bundles.length} bundles instalados
                    </span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Inspecione status, reinicie ou controle bundles ativos no runtime Karaf via client.bat.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={fetchBundles}
                  disabled={isLoadingBundles}
                  className="p-2 bg-card hover:bg-muted border border-border rounded-lg text-muted-foreground hover:text-foreground transition disabled:opacity-50 cursor-pointer"
                  title="Atualizar lista de bundles"
                >
                  <RotateCw className={`w-4 h-4 ${isLoadingBundles ? 'animate-spin text-primary' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsBundlesModalOpen(false)}
                  className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Barra de Filtro */}
            <div className="p-3 border-b border-border/70 bg-card/60 flex items-center gap-3 shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  value={bundleSearch}
                  onChange={(e) => setBundleSearch(e.target.value)}
                  placeholder="Pesquisar por ID, nome do bundle ou versão..."
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary font-mono"
                />
              </div>
              <span className="text-xs text-muted-foreground shrink-0 font-mono">
                {filteredBundles.length} de {bundles.length}
              </span>
            </div>

            {/* Tabela de Bundles */}
            <div className="flex-1 overflow-auto p-2">
              {isLoadingBundles ? (
                <div className="h-64 flex flex-col items-center justify-center text-xs text-muted-foreground space-y-2">
                  <RotateCw className="w-6 h-6 animate-spin text-primary" />
                  <span>Consultando bundles via Karaf client.bat...</span>
                </div>
              ) : filteredBundles.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-xs text-muted-foreground">
                  <Package className="w-8 h-8 opacity-30 mb-2" />
                  <p>Nenhum bundle encontrado para o termo pesquisado.</p>
                </div>
              ) : (
                <div className="min-w-full inline-block align-middle">
                  <table className="min-w-full divide-y divide-border/60 text-xs font-mono">
                    <thead className="bg-muted/70 sticky top-0 z-10 text-[11px]">
                      <tr>
                        <th className="px-3 py-2 text-left text-muted-foreground uppercase w-16">ID</th>
                        <th className="px-3 py-2 text-left text-muted-foreground uppercase w-28">Estado</th>
                        <th className="px-3 py-2 text-left text-muted-foreground uppercase">Nome do Bundle</th>
                        <th className="px-3 py-2 text-left text-muted-foreground uppercase w-28">Versão</th>
                        <th className="px-3 py-2 text-right text-muted-foreground uppercase w-32">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredBundles.map((b) => {
                        const isLoading = Boolean(bundleActionLoading[b.id]);
                        return (
                          <tr key={b.id} className="hover:bg-muted/40 transition">
                            <td className="px-3 py-2 text-primary font-bold">{b.id}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  b.state === 'Active'
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                    : b.state === 'Resolved'
                                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                    : b.state === 'Installed'
                                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                                    : 'bg-muted text-muted-foreground border-border'
                                }`}
                              >
                                {b.state}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-foreground font-medium truncate max-w-[360px]" title={b.name}>
                              {b.name}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground truncate">{b.version || '-'}</td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex items-center justify-end space-x-1">
                                <button
                                  type="button"
                                  onClick={() => handleBundleAction('restart', b.id)}
                                  disabled={isLoading}
                                  title="Reiniciar bundle"
                                  className="p-1 rounded bg-card hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition disabled:opacity-50 cursor-pointer"
                                >
                                  <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                                </button>
                                {b.state === 'Active' ? (
                                  <button
                                    type="button"
                                    onClick={() => handleBundleAction('stop', b.id)}
                                    disabled={isLoading}
                                    title="Parar bundle"
                                    className="p-1 rounded bg-card hover:bg-muted border border-border text-amber-400 hover:text-amber-300 transition disabled:opacity-50 cursor-pointer"
                                  >
                                    <Square className="w-3.5 h-3.5 fill-current" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleBundleAction('start', b.id)}
                                    disabled={isLoading}
                                    title="Iniciar bundle"
                                    className="p-1 rounded bg-card hover:bg-muted border border-border text-emerald-400 hover:text-emerald-300 transition disabled:opacity-50 cursor-pointer"
                                  >
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
