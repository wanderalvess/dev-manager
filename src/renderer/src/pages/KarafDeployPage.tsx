import React, { useState, useEffect } from 'react';
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
  Zap,
  Settings,
  Hammer
} from 'lucide-react';
import { GitProjectInfo, KarafDeployRequest } from '../../../shared/types';
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

          <button
            onClick={handleRunDeploy}
            disabled={isDeploying || !repoCommand || !installCommand}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all shadow-lg ${
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
    </div>
  );
};
