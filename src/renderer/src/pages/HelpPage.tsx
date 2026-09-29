import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Terminal,
  Layers,
  GitPullRequest,
  Grid,
  Settings,
  Zap,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Search,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  HardDrive,
  Monitor,
  Info,
  Sparkles,
  LifeBuoy,
  Code2,
  ArrowRight,
  Laptop,
  Bot,
  Download,
  RefreshCw,
  Database,
  FileText,
  Rocket,
  X,
  FileSearch,
  Boxes,
  Compass,
  KeyRound,
  Globe,
  Workflow,
  HelpCircle,
  Activity,
  RotateCcw,
  ScrollText
} from 'lucide-react';
import { SystemAppInfo, UpdateStatus, getWebPort, getKarafSshPort, getWebUrl } from '../../../shared/types';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { MarkdownReader } from '../components/MarkdownReader';
import { AppLogo } from '../components/AppLogo';
import { getMissingRequiredPaths } from '../utils/environmentPageUtils';
import mcpDocsRaw from '../../../../docs/MCP_TOOLS.md?raw';
import changelogRaw from '../../../../CHANGELOG.md?raw';

interface HelpPageProps {
  onNavigate?: (tab: string) => void;
  /** Termo de busca vindo de um hint contextual de outra tela (ex: "?" ao lado das portas monitoradas) */
  initialSearch?: string;
  /** Reabre o tour guiado de boas-vindas (spotlight nos itens do Header) */
  onRestartTour?: () => void;
  settingsVersion?: number;
}

type HelpCategory = 'overview' | 'modules' | 'shortcuts' | 'faq' | 'about';

interface FaqItem {
  id: string;
  question: string;
  category: string;
  answer: React.ReactNode;
  tags: string[];
}

export const HelpPage: React.FC<HelpPageProps> = ({ onNavigate, initialSearch, onRestartTour, settingsVersion }) => {
  const [activeCategory, setActiveCategory] = useState<HelpCategory>(initialSearch ? 'faq' : 'overview');
  const [searchQuery, setSearchQuery] = useState(initialSearch || '');
  const [faqCategoryFilter, setFaqCategoryFilter] = useState<string>('all');
  const [expandedFaqs, setExpandedFaqs] = useState<Record<string, boolean>>({});
  const [appInfo, setAppInfo] = useState<SystemAppInfo | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [changelogContent, setChangelogContent] = useState('');
  const [isLoadingChangelog, setIsLoadingChangelog] = useState(false);

  const [isMcpDocsOpen, setIsMcpDocsOpen] = useState(false);
  const [mcpDocsContent, setMcpDocsContent] = useState('');
  const [isLoadingMcpDocs, setIsLoadingMcpDocs] = useState(false);

  const [settings, setSettings] = useState<any>(null);
  const needsSetup = useMemo(() => getMissingRequiredPaths(settings).length > 0, [settings]);

  const { copy: copyDiag, copiedKey: copiedDiagKey } = useCopyToClipboard(2500);
  const copiedDiag = copiedDiagKey === 'diag';
  const { copy: copyToClipboard, copiedKey: copiedItem } = useCopyToClipboard(2000);

  useEffect(() => {
    if (initialSearch) {
      setSearchQuery(initialSearch);
      setActiveCategory('faq');
    }
  }, [initialSearch]);

  useEffect(() => {
    if (window.electronAPI) {
      if (window.electronAPI.getAppInfo) {
        window.electronAPI.getAppInfo().then((info) => setAppInfo(info)).catch(() => {});
      }
      if (window.electronAPI.getSettings) {
        window.electronAPI.getSettings().then((st) => setSettings(st)).catch(() => {});
      }
      const unsubUpdate = window.electronAPI.onUpdateStatus?.(setUpdateStatus);
      return () => unsubUpdate?.();
    }
  }, [settingsVersion]);

  const handleCheckForUpdates = () => {
    setUpdateStatus({ status: 'checking' });
    window.electronAPI?.checkForUpdate?.();
  };

  const handleOpenChangelog = async () => {
    setIsChangelogOpen(true);
    setChangelogContent(changelogRaw);
    setIsLoadingChangelog(false);
    try {
      const content = await window.electronAPI?.getChangelog?.();
      if (content && !content.startsWith('Erro ao ler')) {
        setChangelogContent(content);
      }
    } catch {
      // Mantém o changelog embutido caso falhe a leitura dinâmica
    }
  };

  const handleOpenMcpDocs = async () => {
    setIsMcpDocsOpen(true);
    setMcpDocsContent(mcpDocsRaw);
    setIsLoadingMcpDocs(false);
    try {
      const content = await window.electronAPI?.getMcpDocs?.();
      if (
        content &&
        !content.startsWith('# Documentação não encontrada') &&
        !content.startsWith('# Erro ao ler documentação')
      ) {
        setMcpDocsContent(content);
      }
    } catch {
      // Mantém a documentação embutida caso falhe a leitura dinâmica
    }
  };

  const toggleFaq = (id: string) => {
    setExpandedFaqs((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleCopyDiagnostic = () => {
    if (!appInfo) return;
    const report = [
      `=== DIAGNÓSTICO DO SISTEMA - DEV MANAGER ===`,
      `Data/Hora: ${new Date().toLocaleString('pt-BR')}`,
      `Aplicação: ${appInfo.appName} v${appInfo.appVersion}`,
      `Privilégios UAC: ${appInfo.isAdmin ? 'Administrador (Elevado)' : 'Usuário Padrão (Sem Elevação)'}`,
      `Sistema Operacional: Windows (${appInfo.osPlatform} ${appInfo.osRelease} ${appInfo.osArch})`,
      `Hostname: ${appInfo.osHostname}`,
      `Memória RAM: ${appInfo.freeMemoryMb} MB livres de ${appInfo.totalMemoryMb} MB totais`,
      `Electron: v${appInfo.electronVersion}`,
      `Node.js: v${appInfo.nodeVersion}`,
      `Chromium: v${appInfo.chromeVersion}`,
      `V8 Engine: v${appInfo.v8Version}`,
      `Arquivo Config: ${appInfo.configPath}`,
      `====================================================`
    ].join('\n');

    copyDiag(report, 'diag');
  };

  const handleOpenLink = (url: string) => {
    if (window.electronAPI && window.electronAPI.openExternal) {
      window.electronAPI.openExternal(url);
    }
  };

  const webPort = getWebPort(settings);
  const sshPort = getKarafSshPort(settings);
  const debugPort = settings?.karafDebugPort || 5005;
  const portalWebUrl = getWebUrl(settings, '');
  const consoleUrl = getWebUrl(settings, '/system/console');

  // Cálculo da porcentagem de uso de RAM
  const memoryUsagePercent = useMemo(() => {
    if (!appInfo || !appInfo.totalMemoryMb || !appInfo.freeMemoryMb) return 0;
    const used = appInfo.totalMemoryMb - appInfo.freeMemoryMb;
    return Math.min(100, Math.max(0, Math.round((used / appInfo.totalMemoryMb) * 100)));
  }, [appInfo]);

  const faqList: FaqItem[] = useMemo(() => [
    {
      id: 'admin-privileges',
      question: 'Por que o status indica "Sem Elevação" ou não consigo parar/iniciar serviços do Windows?',
      category: 'Ambiente & Windows',
      tags: ['uac', 'administrador', 'serviços', 'permissão', 'net start', 'net stop'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            O Windows exige permissões de <strong className="text-foreground">Administrador</strong> para gerenciar e interromper serviços do sistema e processos em segundo plano.
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-1.5 shadow-sm">
            <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Como resolver:</span>
            <ul className="list-disc pl-4 space-y-1">
              <li>Feche o Dev Manager.</li>
              <li>Clique com o botão direito no atalho ou executável do programa.</li>
              <li>Selecione <strong className="text-foreground">"Executar como Administrador"</strong>.</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'intellij-debug',
      question: `Como conectar a depuração remota do IntelliJ IDEA ao Servidor Debug (Porta ${debugPort})?`,
      category: 'Debug & IDE',
      tags: ['intellij', 'debug', String(debugPort), 'jvm', 'remote', 'breakpoints'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            O script de inicialização do servidor ativa automaticamente o modo de depuração remota Java na porta <strong className="text-foreground font-mono">:{debugPort}</strong> via JDWP (<code className="font-mono text-primary font-semibold">transport=dt_socket,server=y,suspend=n,address={debugPort}</code>).
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2 shadow-sm">
            <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Passo a passo no IntelliJ IDEA:</span>
            <ol className="list-decimal pl-4 space-y-1.5">
              <li>No IntelliJ, vá no menu superior em <strong className="text-foreground">Run &gt; Edit Configurations...</strong></li>
              <li>Clique no botão <strong className="text-foreground">+</strong> e adicione uma configuração do tipo <strong className="text-foreground">Remote JVM Debug</strong>.</li>
              <li>Defina o Host como <code className="font-mono text-primary font-semibold">localhost</code> e a Porta como <code className="font-mono text-primary font-semibold">{debugPort}</code>.</li>
              <li>Clique em <strong className="text-foreground">Apply</strong> e inicie o Debug (<kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold shadow-xs">Shift+F9</kbd>). Seus breakpoints nos bundles Maven serão acionados instantaneamente!</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      id: 'karaf-client-bat',
      question: 'A aba Deploy informa que o executável client.bat não foi localizado. O que fazer?',
      category: 'Karaf OSGi',
      tags: ['karaf', 'client.bat', 'deploy', 'caminho', 'diretório'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            Isso ocorre quando a pasta raiz do Apache Karaf nas <strong className="text-foreground">Configurações</strong> não corresponde ao diretório onde o Karaf está instalado no seu computador.
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2 shadow-sm">
            <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Solução:</span>
            <p>
              Verifique se o arquivo <code className="font-mono text-primary font-semibold">bin\client.bat</code> existe dentro da pasta configurada para o Apache Karaf.
            </p>
            {onNavigate && (
              <button
                onClick={() => onNavigate('settings')}
                className="mt-1 px-3 py-1.5 bg-primary text-primary-foreground font-semibold rounded-lg text-[11px] flex items-center gap-1.5 hover:opacity-90 transition-opacity shadow-sm"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Abrir Configurações para Ajustar Caminho</span>
              </button>
            )}
          </div>
        </div>
      )
    },
    {
      id: 'karaf-resolution-missing-requirement',
      question: 'O deploy de uma feature Karaf falhou com "missing requirement" ou erro de resolução OSGi. O que fazer?',
      category: 'Karaf OSGi',
      tags: ['karaf', 'deploy', 'missing requirement', 'resolutionexception', 'dependencia', 'osgi', 'bundle', 'pom'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            No ecossistema OSGi/Karaf, quando um bundle importa um pacote ou serviço Java (<code className="font-mono text-primary font-semibold">osgi.wiring.package</code>) fornecido por outro módulo ou feature, o container só consegue ativar a feature se esse fornecedor já estiver instalado e ativo na versão exigida.
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2 shadow-sm">
            <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Diagnóstico Inteligente do Dev Manager:</span>
            <p>
              Ao detectar esse erro, o Dev Manager analisa automaticamente a árvore causal da falha, extrai o pacote e a faixa de versão requerida e correlaciona com o <code className="font-mono text-primary font-semibold">pom.xml</code> do projeto.
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong className="text-foreground">Card de Ação Rápida:</strong> Se você já possui um perfil de deploy ou projeto local cadastrado para essa dependência (ex: <em>matcon</em>), um botão destacado permite executar o perfil correspondente em 1 clique.
              </li>
              <li>
                <strong className="text-foreground">Release do Nexus:</strong> Oferece botão para instalar a release oficial diretamente do repositório remoto via comandos Karaf (<code className="font-mono text-primary font-semibold">feature:repo-add</code> / <code className="font-mono text-primary font-semibold">feature:install</code>).
              </li>
              <li>
                <strong className="text-foreground">Verificação:</strong> O botão de verificação roda <code className="font-mono text-primary font-semibold">bundle:diag</code> para analisar bundles com pendências no container.
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'karaf-jvm-memory-oom',
      question: 'Como funciona o monitor de memória Heap da JVM e a prevenção de OutOfMemoryError no Karaf?',
      category: 'Karaf OSGi',
      tags: ['jvm', 'heap', 'non-heap', 'metaspace', 'outofmemory', 'oom', 'gc', 'garbage collection', 'jmx'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            O Apache Karaf roda sobre uma Java Virtual Machine (JVM). Durante compilações volumosas ou múltiplos deploys de bundles OSGi sem reinício, o consumo de memória Heap e Metaspace pode crescer até causar um <strong className="text-rose-500 font-bold">java.lang.OutOfMemoryError (OOM)</strong>, travando os serviços.
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2 shadow-sm">
            <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Recursos do Monitor de Memória JVM:</span>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong className="text-foreground">Telemetria em Tempo Real:</strong> Gráfico SVG com histórico temporal do consumo de Heap (usado, alocado e máximo em MB) e Non-Heap (Metaspace/CodeCache), com contagem de threads e classes carregadas.
              </li>
              <li>
                <strong className="text-foreground">Alertas Preventivos de OOM:</strong> Quando o consumo ultrapassa 70%, o painel entra em estado de <span className="text-amber-500 font-bold">AVISO</span>; acima de 85%, é emitido um alerta <span className="text-rose-500 font-bold">CRÍTICO</span> de risco iminente de travamento.
              </li>
              <li>
                <strong className="text-foreground">Disparo de GC em 1 Clique:</strong> Botão <em>"Executar GC"</em> que solicita coleta imediata de lixo via JMX (<code className="font-mono text-primary font-semibold">java.lang:type=Memory gc</code>) ou shell nativo.
              </li>
            </ul>
            <p className="pt-1 text-[11px]">
              Acesse o monitor pelo botão <strong className="text-foreground">"Memória JVM"</strong> no cabeçalho da página de Deploy (<kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold shadow-xs">Alt+4</kbd>).
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'karaf-features-repos',
      question: 'Como gerenciar repositórios Maven e features OSGi na tela de Deploy?',
      category: 'Karaf OSGi',
      tags: ['feature', 'repositório', 'repo-list', 'repo-add', 'repo-refresh', 'maven', 'xml', 'winthor'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            No Apache Karaf, features são grupos lógicos de bundles e dependências declarados em arquivos XML distribuídos via Maven.
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2 shadow-sm">
            <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Gerenciador de Features & Repositórios:</span>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong className="text-foreground">Aba Features:</strong> Lista todas as features disponíveis e instaladas com filtro rápido para módulos WinThor/TOTVS e botão de 1 clique para instalar ou desinstalar.
              </li>
              <li>
                <strong className="text-foreground">Aba Repositórios:</strong> Lista repositórios registrados (<code className="font-mono text-primary font-semibold">feature:repo-list</code>) com destaque para WinThor, botão de atualização (<code className="font-mono text-primary font-semibold">feature:repo-refresh</code>), remoção segura e formulário para cadastrar novos repositórios com URL Maven (<code className="font-mono text-primary font-semibold">mvn:groupId/artifactId/version/xml/features</code>).
              </li>
            </ul>
            <p className="pt-1 text-[11px]">
              Acesse pelo botão <strong className="text-foreground">"Features Karaf"</strong> na barra de ferramentas da página de Deploy (<kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold shadow-xs">Alt+4</kbd>).
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'log-analyzer-winthor',
      question: 'Como utilizar o Log Analyzer para diagnosticar erros ORA-XXXXX, NullPointer e conflitos OSGi?',
      category: 'Logs & Diagnóstico',
      tags: ['log', 'analyzer', 'ora', 'oracle', 'nullpointer', 'npe', 'bundleexception', 'exceção', 'diagnóstico'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            O módulo de Logs conta com um analisador contínuo de exceções projetado especificamente para o ecossistema WinThor e Apache Karaf:
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2 shadow-sm">
            <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Classificação Automática de Falhas:</span>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong className="text-foreground">Erros Oracle (ORA-XXXXX):</strong> Reconhece códigos comuns (ex: <code className="font-mono text-primary font-semibold">ORA-00942</code> Tabela inexistente, <code className="font-mono text-primary font-semibold">ORA-00001</code> Unique constraint, <code className="font-mono text-primary font-semibold">ORA-01403</code> No data found) e sugere queries de diagnóstico.
              </li>
              <li>
                <strong className="text-foreground">NullPointerException (NPE):</strong> Detecta a classe e método do stacktrace onde o valor nulo foi acessado.
              </li>
              <li>
                <strong className="text-foreground">BundleException & OSGi:</strong> Aponta pacotes ou serviços que não puderam ser resolvidos pelo ClassLoader OSGi.
              </li>
              <li>
                <strong className="text-foreground">OutOfMemoryError:</strong> Identifica esgotamento de Heap ou Metaspace.
              </li>
            </ul>
            <p className="pt-1 text-[11px]">
              As linhas do log exibem pílulas com o código do erro (ex: <span className="bg-rose-500/20 text-rose-400 px-1 py-0.2 rounded font-mono font-bold">ORA-00942</span>). Clique na pílula ou no botão <strong className="text-foreground">"Analisar Exceções"</strong> na barra de ferramentas para abrir a gaveta com filtros e comandos sugeridos de diagnóstico!
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'port-in-use',
      question: `Uma porta monitorada (:${webPort}, :${sshPort}, :${debugPort}, etc.) está aparecendo como "Em uso" (Ocupada). Como liberar ou customizar?`,
      category: 'Ambiente & Rede',
      tags: ['porta', String(webPort), String(sshPort), String(debugPort), 'conflito', 'pid', 'em uso'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            Quando uma porta está com indicador ativo, significa que um processo no Windows (como o Portal Web, Karaf SSH, Tomcat, Java ou serviço local) está escutando nela.
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2 shadow-sm">
            <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Portas 100% Customizáveis:</span>
            <p>
              Você pode alterar a porta do Portal Web Local (ex: <code className="font-mono text-primary font-bold">{webPort}</code>), a porta SSH do Karaf e adicionar ou remover qualquer porta TCP na aba <strong className="text-foreground">Configurações &gt; Portas de Rede Monitoradas</strong>.
            </p>
            <span className="font-bold text-foreground block pt-1 text-[11px] uppercase tracking-wider text-primary">Como liberar em 1 clique:</span>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                Na aba <strong className="text-foreground">Ambiente Dev</strong>, clique no botão principal <strong className="text-foreground">"Preparar Ambiente Dev"</strong> com a opção "Liberar Portas" ativa.
              </li>
              <li>
                Para finalizar um processo específico, clique no botão "Matar" no painel de processos em segundo plano.
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'git-pr-creation',
      question: 'Como funciona a abertura de Pull Request no Azure DevOps em 1 clique?',
      category: 'Git & Azure DevOps',
      tags: ['git', 'azure', 'pull request', 'pr', 'branch', 'develop'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            O Dev Manager inspeciona o arquivo de configuração do Git (<code className="font-mono text-primary font-semibold">.git/config</code>) de cada repositório, identifica a URL do Azure DevOps (organização, projeto e repositório) e a branch em que você está trabalhando no momento.
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-1.5 shadow-sm">
            <p>
              Ao clicar em <strong className="text-foreground">"Abrir Criação de Pull Request no Azure DevOps"</strong>, seu navegador padrão é aberto diretamente na URL de criação de PR já com o <em>Source Branch</em> (sua branch) e o <em>Target Branch</em> (ex: <code className="font-mono text-primary font-bold">develop</code>) pré-configurados.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'routines-favorites',
      question: 'Como fixar minhas rotinas favoritas e onde elas ficam salvas?',
      category: 'Catálogo de Rotinas',
      tags: ['rotinas', 'favoritos', 'estrelas', 'executaveis'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            Na aba <strong className="text-foreground">Catálogo de Rotinas</strong>, clique no ícone de <strong className="text-amber-400 font-semibold">estrela (★)</strong> no cartão de qualquer rotina.
          </p>
          <p>
            As rotinas marcadas são exibidas no topo do painel na seção "Rotinas Favoritas" para acesso instantâneo. A lista é persistida automaticamente no seu perfil de usuário local.
          </p>
        </div>
      )
    },
    {
      id: 'routines-karaf-offline-auth',
      question: 'Por que a rotina apresenta erro ao iniciar quando o Apache Karaf está desligado?',
      category: 'Catálogo de Rotinas',
      tags: ['rotinas', 'karaf', 'wta', 'winthor start', 'autenticação', 'datasnap', '8889', '9195', 'sessão', 'erro ao iniciar'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            A inicialização de rotinas pelo <strong className="text-foreground">WinThor Start</strong> depende da geração de parâmetros de autenticação e sessão pelo portal <strong className="text-foreground">WinThor Anywhere (WTA)</strong>, que roda dentro do container <strong className="text-foreground">Apache Karaf</strong> (na porta padrão <code className="font-mono text-primary font-bold">8889</code>).
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2 shadow-sm">
            <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Como funciona o fluxo de autenticação:</span>
            <ol className="list-decimal pl-4 space-y-1.5">
              <li>
                O Dev Manager faz uma requisição HTTP para a API do WTA (<code className="font-mono text-primary">:8889</code>) buscando os tokens de sessão da rotina (<code className="font-mono text-primary">m, u, p, t, s</code>).
              </li>
              <li>
                Com a sessão autenticada, envia os parâmetros para o serviço local do WinThor Start (<code className="font-mono text-primary">:9195</code>), que abre a rotina já logada no ERP.
              </li>
              <li>
                <strong className="text-amber-500">Quando o Karaf não está em execução:</strong> a chamada ao WTA falha por conexão recusada. Sem a sessão do Karaf, a rotina não consegue autenticar e apresenta erro de inicialização.
              </li>
            </ol>
            <p className="pt-1.5 border-t border-border/50">
              <strong className="text-foreground">Como resolver:</strong> No próprio Catálogo de Rotinas, observe o badge <strong className="text-foreground">Karaf (WTA)</strong> no cabeçalho ou clique em <strong className="text-foreground">"Ir para Ambiente Dev &amp; Iniciar Karaf (Alt+1)"</strong> para subir o container antes de abrir rotinas. Caso queira abrir o executável diretamente pelo Windows sem sessão do ERP, utilize a opção <em>"Tentar abrir direto (sem autenticação)"</em> no aviso de erro.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'routines-ccw-download-and-backup',
      question: 'Como baixar e atualizar rotinas do WinThor direto da Central de Controle (CCW)?',
      category: 'Catálogo de Rotinas',
      tags: ['ccw', 'central de controle', 'download rotinas', 'backup', 'prod', 'atualizar rotina', 'totvs', 'pc sistemas'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            O Dev Manager se integra diretamente à <strong className="text-foreground">Central de Controle do WinThor (CCW)</strong> em <code className="font-mono text-primary">centraldecontrole.pcinformatica.com.br</code> para baixar e atualizar rotinas sem precisar abrir o navegador nem descompactar arquivos manualmente.
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2 shadow-sm">
            <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Como utilizar:</span>
            <ul className="list-disc pl-4 space-y-1.5">
              <li>
                <strong className="text-foreground">Botão "Atualizar Rotina (CCW)":</strong> No cabeçalho da página de Rotinas, clique no botão azul para abrir a central de download.
              </li>
              <li>
                <strong className="text-foreground">Atualização Rápida no Cartão:</strong> No card de qualquer rotina existente, clique no ícone de nuvem (<Download className="w-3 h-3 inline text-primary" />) para abrir o diálogo já com o código da rotina e versão preenchidos.
              </li>
              <li>
                <strong className="text-foreground">Backup Automático (.bak):</strong> Sempre que um executável já existir no diretório de destino (ex.: <code className="font-mono text-primary">C:\Winthor\Prod\MOD-001\PCSIS101.EXE</code>), o Dev Manager cria automaticamente uma cópia de segurança renomeada com timestamp (ex.: <code className="font-mono text-primary">PCSIS101.EXE.20260929_120000.bak</code>).
              </li>
              <li>
                <strong className="text-foreground">Suporte a ZIP e EXE:</strong> Caso a CCW retorne um pacote ZIP compactado, o Dev Manager extrai os binários transparentemente sem requerer ferramentas externas.
              </li>
              <li>
                <strong className="text-foreground">Instalação Local ou Árvore CCW:</strong> Você também pode instalar arquivos <code className="font-mono text-primary">.exe</code> ou <code className="font-mono text-primary">.zip</code> baixados manualmente ou explorar a árvore oficial com cookie de sessão.
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'routines-rollback-versioning-batch',
      question: 'Como funciona o Gerenciador de Rollback (.bak), a leitura de versão PE e o download em lote de rotinas?',
      category: 'Catálogo de Rotinas',
      tags: ['rollback', 'bak', 'backup', 'pe header', 'fileversion', 'productversion', 'batch', 'download em lote', 'versao executavel'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            O Dev Manager oferece gestão completa do ciclo de vida das rotinas WinThor no disco local:
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2.5 shadow-sm">
            <div>
              <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary mb-1">
                1. Histórico de Versões &amp; Rollback em 1 Clique (.bak)
              </span>
              <p>
                No card de qualquer rotina, clique no ícone de retorno (<RotateCcw className="w-3 h-3 inline text-amber-500" />) ou na aba <strong>Histórico &amp; Rollback</strong> da central de rotinas. O sistema lista todos os arquivos <code className="font-mono text-primary">.bak</code> encontrados com data, hora e tamanho. Ao clicar em <strong>Restaurar</strong>, uma cópia preventiva de segurança (<code className="font-mono text-primary">_pre_rollback.bak</code>) é gerada automaticamente antes da substituição do executável, garantindo reversibilidade total.
              </p>
            </div>
            <div className="pt-2 border-t border-border/50">
              <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary mb-1">
                2. Leitura Binária de Versão do Executável (PE Header / FileVersion)
              </span>
              <p>
                O Dev Manager inspeciona o cabeçalho binário (PE Header / <code className="font-mono text-primary">.rsrc</code>) do executável sem depender de ferramentas externas do Windows. Ele extrai e exibe diretamente no card o badge verde com a <code className="font-mono text-primary">FileVersion</code> (ex: <span className="text-emerald-500 font-bold">v30.0.12</span>) e a <code className="font-mono text-primary">ProductVersion</code>, facilitando a comparação visual com as versões publicadas na CCW.
              </p>
            </div>
            <div className="pt-2 border-t border-border/50">
              <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary mb-1">
                3. Download e Atualização em Lote (Batch Download)
              </span>
              <p>
                No cabeçalho do catálogo, clique em <strong>Atualização em Lote</strong> para atualizar de uma só vez todas as suas rotinas favoritas, um módulo funcional inteiro (ex: <code className="font-mono text-primary">MOD-001</code>) ou uma lista personalizada de códigos. O processo exibe progresso em tempo real rotina a rotina com preservação de backups.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'routine-801-connection-troubleshooting',
      question: 'Por que o Catálogo da Rotina 801 informa que localhost:8889 não responde se a porta está aberta?',
      category: 'Deploy & OSGi',
      tags: ['801', 'rotina 801', 'wta', 'catalogo', '8889', 'localhost', '127.0.0.1', 'karaf', 'servidor', 'instalacao', 'conexão'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            No Windows, o host <code className="font-mono text-primary font-bold">localhost</code> pode ser resolvido prioritariamente para o endereço IPv6 (<code className="font-mono text-primary">::1</code>), enquanto a JVM do Apache Karaf / WTA normalmente se vincula apenas à interface IPv4 (<code className="font-mono text-primary">127.0.0.1:8889</code>).
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2 shadow-sm">
            <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Como o Dev Manager trata e como resolver:</span>
            <ul className="list-disc pl-4 space-y-1.5">
              <li>
                <strong className="text-foreground">Fallback automático:</strong> O Dev Manager implementa detecção automática (Happy Eyeballs) e fallback transparente de <code className="font-mono text-primary">localhost</code> para <code className="font-mono text-primary">127.0.0.1</code> ao consultar a API da Rotina 801.
              </li>
              <li>
                <strong className="text-foreground">Botões rápidos no modal:</strong> No cabeçalho do Catálogo Oficial (Rotina 801), clique em <strong className="text-foreground">Conexão</strong> e utilize os botões rápidos para alternar diretamente entre <code className="font-mono text-primary">localhost</code> e <code className="font-mono text-primary">127.0.0.1</code>.
              </li>
              <li>
                <strong className="text-foreground">Bundle de serviço:</strong> Os endpoints do catálogo (<code className="font-mono text-primary">/winthor/ferramenta/servidor/v1/instalacao</code> e <code className="font-mono text-primary">/atualizacao</code>) exigem que o bundle <strong className="text-foreground">ferramenta-servidor</strong> esteja ativo no container Karaf.
              </li>
              <li>
                <strong className="text-foreground">Modos de Instalação:</strong> Você pode alternar no cabeçalho do catálogo entre o <strong className="text-foreground">Console Karaf</strong> (executa client.bat com streaming em tempo real dos comandos feature:repo-add e feature:install) e a <strong className="text-foreground">API WTA</strong> (dispara a instalação diretamente via endpoint REST da ferramenta servidor).
              </li>
              <li>
                <strong className="text-foreground">Download e Timeout Estendido:</strong> Instalar serviços ou rotinas completas baixa dezenas de dependências Maven do Nexus/Artifactory. O Dev Manager aplica timeouts dedicados de até 5 minutos para que downloads pesados nunca sejam cancelados prematuramente.
              </li>
              <li>
                <strong className="text-foreground">Credenciais WTA:</strong> Caso o ambiente exija autenticação (Apache Shiro), o Dev Manager envia automaticamente o token/cookie do usuário configurado em Configurações.
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'build-executable',
      question: 'Como gerar o executável (.exe) de produção do Dev Manager para o Windows?',
      category: 'Build & Executável',
      tags: ['executavel', 'exe', 'build', 'electron-builder', 'producao', 'instalador', 'nsis', 'portable', 'release'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            O Dev Manager pode ser empacotado em executáveis nativos do Windows (<code className="font-mono text-primary font-bold">.exe</code>) através do script configurado com o Electron Builder.
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2 shadow-sm">
            <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Comando para compilar e gerar na pasta release/:</span>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted font-mono text-[11px] text-primary border border-border/60">
              <code>npm run build:electron</code>
              <button
                onClick={() => copyToClipboard('npm run build:electron', 'cmd-build-faq')}
                className="p-1 hover:text-foreground transition-colors cursor-pointer"
                title="Copiar comando"
              >
                {copiedItem === 'cmd-build-faq' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <span className="font-bold text-foreground block pt-1 text-[11px] uppercase tracking-wider text-primary">Arquivos gerados na pasta release/:</span>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong className="text-foreground">Dev Manager {appInfo?.appVersion || '1.22.0'}.exe (Portátil):</strong> Não precisa instalar. Basta clicar duas vezes e usar. Ideal para rodar de pendrives ou pastas de rede.
              </li>
              <li>
                <strong className="text-foreground">Dev Manager Setup {appInfo?.appVersion || '1.22.0'}.exe (Instalador):</strong> Instalador assistido (NSIS) que cria atalhos no Desktop e Menu Iniciar.
              </li>
              <li>
                <strong className="text-foreground">LEIA-ME.txt &amp; RELEASE_NOTES.md (Notas da Versão):</strong> Gerados automaticamente ao empacotar a release ou via <code className="font-mono text-primary font-semibold">npm run release:notes</code>. Contêm o resumo das novidades extraídas do CHANGELOG, guia de instalação para anexar ao usuário e instruções do Windows SmartScreen ("Mais informações" &gt; "Executar assim mesmo").
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'git-diff-and-task-branches',
      question: 'Como funciona o Visualizador de Diff de Arquivos e a Criação de Branch por Tarefa (Azure DevOps / Jira)?',
      category: 'Git & Azure DevOps',
      tags: ['git', 'diff', 'ide', 'intellij', 'branch', 'azure', 'jira', 'tarefa', 'uncommitted', 'work items'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            O Hub <strong className="text-foreground">Git &amp; Azure DevOps</strong> centraliza o ciclo de vida do código antes do commit e agiliza a abertura de branches padronizadas vinculadas a tarefas:
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2.5 shadow-sm">
            <div>
              <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary mb-1">
                1. Visualizador de Diff &amp; Ação "Abrir na IDE"
              </span>
              <p>
                No painel de <strong>Alterações Pendentes</strong> do repositório selecionado ou na janela de Commit, clique em qualquer arquivo modificado para inspecionar o diff em modal com realce de sintaxe (linhas adicionadas em verde, removidas em vermelho e blocos de contexto). Use o botão <strong>"Abrir na IDE"</strong> (<ExternalLink className="w-3 h-3 inline text-primary" />) no cabeçalho ou ao lado de cada arquivo para abrir diretamente o arquivo e linha no seu IntelliJ IDEA ou editor do sistema.
              </p>
            </div>
            <div className="pt-2 border-t border-border/50">
              <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary mb-1">
                2. Criação Integrada de Branch por Tarefa
              </span>
              <p>
                Clique no botão <strong>"Branch por Tarefa"</strong> no cabeçalho da branch ativa. Você pode:
              </p>
              <ul className="list-disc pl-4 space-y-1 mt-1">
                <li>Colar a URL completa da tarefa (Azure DevOps ou Jira) ou texto como <code className="font-mono text-primary font-semibold">SRE-1234 Ajustes no faturamento</code>; o sistema faz o parsing automático do ID e título.</li>
                <li>Buscar tarefas ativas no Azure DevOps ou Jira diretamente pela API REST / WIQL (usando o Personal Access Token configurado em Configurações &gt; Azure/Jira).</li>
                <li>Escolher o prefixo semântico (<code className="font-mono text-primary">feature/</code>, <code className="font-mono text-primary">bugfix/</code>, <code className="font-mono text-primary">hotfix/</code>, etc.) e a branch base (ex: <code className="font-mono text-primary">develop</code> ou <code className="font-mono text-primary">main</code>).</li>
                <li>Gerar o slug normalizado (sem acentos e caracteres inválidos) e executar o checkout em 1 clique com validação completa de nomes de branch do Git.</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'docs-rag-search',
      question: 'O que é a aba de Documentação (RAG) e para que serve a vetorização de documentos?',
      category: 'Documentação & RAG',
      tags: ['rag', 'docs', 'documentacao', 'vetorizacao', 'embeddings', 'busca semantica', 'fastembed', 'offline', 'ia'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            A aba <strong className="text-foreground">Documentação</strong> é a central de busca inteligente do Dev Manager. Ela indexa manuais, diagnósticos de projetos, mapeamentos de rotinas e contratos de API REST (<code className="font-mono text-primary">.md, .txt, .pdf, .docx</code>), permitindo encontrar informações técnicas em segundos.
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2 shadow-sm">
            <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Busca Vetorizada (Embeddings) vs. Ctrl+F:</span>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong className="text-foreground">Busca comum (Ctrl+F):</strong> Faz correspondência literal de caracteres. Se buscar por <em>"estoque"</em> e o documento falar em <em>"saldo de mercadoria"</em>, nada é encontrado.
              </li>
              <li>
                <strong className="text-foreground">Busca Vetorizada (RAG Local):</strong> O modelo de IA local (<code className="font-mono text-primary font-semibold">FastEmbed AllMiniLML6V2</code>) converte cada trecho em um vetor matemático de 384 dimensões que representa seu significado conceitual. Ao buscar <em>"como consultar saldo disponível na filial?"</em>, o sistema traz os trechos exatos de contratos de API e rotinas correspondentes, mesmo com vocabulário diferente.
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'mcp-server',
      question: 'O que é o servidor MCP e como automatizar tarefas via assistentes de IA (Copilot, IntelliJ, Claude)?',
      category: 'Integração & MCP',
      tags: ['mcp', 'claude', 'copilot', 'intellij', 'ia', 'agente', 'automação', 'model context protocol', 'stdio'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            O Dev Manager inclui um servidor <strong className="text-foreground">MCP (Model Context Protocol)</strong> que expõe as mesmas automações do Cockpit como <strong className="text-foreground">145 tools</strong> que assistentes de IA (GitHub Copilot no IntelliJ IDEA, Claude Code, JetBrains AI Assistant, Antigravity, VS Code, Cursor) podem chamar diretamente — sem passar pela interface gráfica.
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-3 shadow-sm">
            <div>
              <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary mb-1">O que a IA consegue realizar por você:</span>
              <ul className="list-disc pl-4 space-y-1 mb-2">
                <li><strong className="text-foreground">Build Maven &amp; Deploy Karaf:</strong> Roda <code className="font-mono text-primary font-semibold">mvn clean install</code>, instala features Maven via <code className="font-mono text-primary font-semibold">client.bat</code> e confirma se os bundles ficaram no estado <strong className="text-emerald-500 font-semibold">Started / Active</strong>.</li>
                <li><strong className="text-foreground">Diagnóstico OSGi:</strong> Identifica bundles parados, com falha de fiação (wiring) ou dependências ausentes (<code className="font-mono text-primary">ResolutionException</code>).</li>
                <li><strong className="text-foreground">Ambiente Windows:</strong> Checa portas TCP ocupadas, finaliza processos conflitantes e inicia/para serviços.</li>
                <li><strong className="text-foreground">Banco de Dados:</strong> Executa consultas no Oracle/Postgres/MySQL e rastreia queries lentas com captura de binds.</li>
                <li><strong className="text-foreground">Documentação RAG:</strong> Pesquisa semanticamente em manuais, arquivos Markdown e contratos de API locais.</li>
                <li><strong className="text-foreground">Git &amp; Tarefas:</strong> Cria branches padronizadas a partir de work items do Azure DevOps/Jira e inspeciona diffs de arquivos.</li>
              </ul>
              <button
                onClick={handleOpenMcpDocs}
                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-2 w-fit cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Ver Catálogo Completo das 145 Ferramentas e Prompts</span>
              </button>
            </div>
            
            <div className="pt-2 border-t border-border/50">
              <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Execução Manual do Servidor:</span>
              <p className="mb-2">
                O servidor roda localmente via stdio utilizando Node.js/tsx (mesmo mecanismo do app, sem portas HTTP expostas):
              </p>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted font-mono text-[11px] text-primary border border-border/60">
                <code>npm run mcp</code>
                <button
                  onClick={() => copyToClipboard('npm run mcp', 'cmd-mcp-faq')}
                  className="p-1 hover:text-foreground transition-colors cursor-pointer"
                  title="Copiar comando"
                >
                  {copiedItem === 'cmd-mcp-faq' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'mcp-intellij-setup',
      question: 'Como configurar e conectar o servidor MCP no IntelliJ IDEA (GitHub Copilot e JetBrains AI)?',
      category: 'Integração & MCP',
      tags: ['mcp', 'intellij', 'copilot', 'github copilot', 'ai assistant', 'jetbrains', 'configuracao', 'mcp.json', 'stdio'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            Você pode conectar o servidor MCP do Dev Manager ao <strong className="text-foreground">IntelliJ IDEA</strong> tanto pelo <strong className="text-foreground">GitHub Copilot Chat</strong> (modo Agent) quanto pelo <strong className="text-foreground">JetBrains AI Assistant</strong> ou pelo plugin <strong className="text-foreground">Continue</strong>.
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-3 shadow-sm">
            <div>
              <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary mb-1">Método 1: GitHub Copilot no IntelliJ IDEA</span>
              <p className="mb-2">
                Crie ou edite o arquivo <code className="font-mono text-primary font-semibold">.mcp.json</code> (ou <code className="font-mono text-primary font-semibold">mcp.json</code>) na raiz do projeto aberto na IDE com a seguinte configuração:
              </p>
              <div className="relative p-2.5 rounded-lg bg-muted font-mono text-[11px] text-foreground border border-border/60 overflow-x-auto">
                <pre>{`{
  "mcpServers": {
    "dev-manager": {
      "command": "npx.cmd",
      "args": [
        "tsx",
        "C:/caminho/para/winthor-dev-manager/src/mcp/index.ts"
      ],
      "cwd": "C:/caminho/para/winthor-dev-manager"
    }
  }
}`}</pre>
                <button
                  onClick={() =>
                    copyToClipboard(
                      JSON.stringify(
                        {
                          mcpServers: {
                            'dev-manager': {
                              command: 'npx.cmd',
                              args: ['tsx', 'C:/caminho/para/winthor-dev-manager/src/mcp/index.ts'],
                              cwd: 'C:/caminho/para/winthor-dev-manager'
                            }
                          }
                        },
                        null,
                        2
                      ),
                      'snippet-mcp-copilot'
                    )
                  }
                  className="absolute right-2 top-2 p-1.5 bg-card/80 hover:bg-card text-foreground rounded-md border border-border transition-colors cursor-pointer"
                  title="Copiar JSON"
                >
                  {copiedItem === 'snippet-mcp-copilot' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-border/50">
              <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary mb-1">Método 2: JetBrains AI Assistant (Nativo - 2025.1+)</span>
              <ol className="list-decimal pl-4 space-y-1 text-[11px]">
                <li>No IntelliJ IDEA, abra as configurações: <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold shadow-xs">Ctrl+Alt+S</kbd>.</li>
                <li>Navegue até <strong className="text-foreground">Tools &gt; AI Assistant &gt; Model Context Protocol (MCP)</strong>.</li>
                <li>Clique no botão <strong className="text-foreground">+</strong> (Add Server):
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    <li><strong className="text-foreground">Type:</strong> STDIO</li>
                    <li><strong className="text-foreground">Name:</strong> <code className="font-mono text-primary">dev-manager</code></li>
                    <li><strong className="text-foreground">Command:</strong> <code className="font-mono text-primary">npx.cmd</code> (ou <code className="font-mono text-primary">npm.cmd</code>)</li>
                    <li><strong className="text-foreground">Arguments:</strong> <code className="font-mono text-primary">tsx src/mcp/index.ts</code> (ou <code className="font-mono text-primary">run mcp</code>)</li>
                    <li><strong className="text-foreground">Working Directory:</strong> pasta raiz do winthor-dev-manager</li>
                  </ul>
                </li>
                <li>Clique em <strong className="text-foreground">Apply</strong> e <strong className="text-foreground">OK</strong>. As ferramentas surgirão automaticamente no chat do assistente!</li>
              </ol>
            </div>

            <div className="pt-2 border-t border-border/50 bg-amber-500/5 p-2 rounded-lg border border-amber-500/20">
              <span className="font-bold text-amber-500 block text-[11px] uppercase tracking-wider mb-0.5">⚠️ Dica Essencial para Windows:</span>
              <p className="text-[11px]">
                No Windows, sempre utilize <code className="font-mono text-foreground font-bold">npx.cmd</code> ou <code className="font-mono text-foreground font-bold">npm.cmd</code> no campo <code className="font-mono text-foreground">command</code>. Executar apenas <code className="font-mono text-foreground">npx</code> sem extensão faz o subprocesso do IntelliJ acusar erro de arquivo não encontrado (<code className="font-mono text-amber-500">CreateProcess error=2</code>).
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'mcp-vscode-setup',
      question: 'Como configurar e conectar o servidor MCP no Visual Studio Code (VS Code & Copilot)?',
      category: 'Integração & MCP',
      tags: ['mcp', 'vscode', 'vs code', 'copilot', 'github copilot', 'agent mode', 'cline', 'roo code', 'mcp.json', 'stdio'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            No <strong className="text-foreground">Visual Studio Code (VS Code)</strong>, você pode utilizar o servidor MCP do Dev Manager tanto com o <strong className="text-foreground">GitHub Copilot Chat</strong> (no modo <em>Agent</em>) quanto com extensões agênticas como <strong className="text-foreground">Cline</strong>, <strong className="text-foreground">Roo Code</strong> ou <strong className="text-foreground">Continue</strong>.
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-3 shadow-sm">
            <div>
              <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary mb-1">Método 1: GitHub Copilot Chat (Arquivo .vscode/mcp.json)</span>
              <p className="mb-2">
                O VS Code com GitHub Copilot Chat suporta servidores MCP diretamente pelo arquivo de configuração de workspace. Crie a pasta <code className="font-mono text-primary font-semibold">.vscode</code> na raiz do projeto e dentro dela o arquivo <code className="font-mono text-primary font-semibold">mcp.json</code>:
              </p>
              <div className="relative p-2.5 rounded-lg bg-muted font-mono text-[11px] text-foreground border border-border/60 overflow-x-auto">
                <pre>{`{
  "servers": {
    "dev-manager": {
      "type": "stdio",
      "command": "npx.cmd",
      "args": [
        "tsx",
        "C:/caminho/para/winthor-dev-manager/src/mcp/index.ts"
      ],
      "cwd": "C:/caminho/para/winthor-dev-manager"
    }
  }
}`}</pre>
                <button
                  onClick={() =>
                    copyToClipboard(
                      JSON.stringify(
                        {
                          servers: {
                            'dev-manager': {
                              type: 'stdio',
                              command: 'npx.cmd',
                              args: ['tsx', 'C:/caminho/para/winthor-dev-manager/src/mcp/index.ts'],
                              cwd: 'C:/caminho/para/winthor-dev-manager'
                            }
                          }
                        },
                        null,
                        2
                      ),
                      'snippet-mcp-vscode'
                    )
                  }
                  className="absolute right-2 top-2 p-1.5 bg-card/80 hover:bg-card text-foreground rounded-md border border-border transition-colors cursor-pointer"
                  title="Copiar JSON para VS Code"
                >
                  {copiedItem === 'snippet-mcp-vscode' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="mt-2 text-[11px]">
                💡 <em>Dica:</em> Se o projeto aberto no VS Code for o próprio Dev Manager, você também pode usar <code className="font-mono text-primary font-semibold">{'${workspaceFolder}'}/src/mcp/index.ts</code>.
              </p>
            </div>

            <div className="pt-2 border-t border-border/50">
              <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary mb-1">Como acionar no GitHub Copilot Chat do VS Code:</span>
              <ol className="list-decimal pl-4 space-y-1 text-[11px]">
                <li>Abra o Copilot Chat (<kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold shadow-xs">Ctrl+Alt+I</kbd>).</li>
                <li>Selecione o modo <strong className="text-foreground">Agent</strong> (ou digite <code className="font-mono text-primary">@agent</code> no campo de mensagem).</li>
                <li>No campo de chat, clique no ícone de ferramentas / anexos (🛠️) para conferir que as 145 tools do <code className="font-mono text-primary">dev-manager</code> estão ativas.</li>
                <li>Envie sua solicitação diretamente (ex.: <em>"Faça o clean install (pulando testes) do projeto atual e instale a feature no Karaf. No final, confirme se ela ficou ativa."</em>).</li>
              </ol>
            </div>

            <div className="pt-2 border-t border-border/50">
              <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary mb-1">Método 2: Extensões Cline / Roo Code / Continue</span>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li>
                  <strong className="text-foreground">Cline / Roo Code:</strong> Abra a aba da extensão, clique em ⚙️ (Configurações) ➔ aba <strong>MCP Servers</strong> ➔ clique em <em>"Edit MCP Settings"</em> e adicione a chave <code className="font-mono text-primary">"mcpServers"</code> com o comando <code className="font-mono text-primary">npx.cmd</code>.
                </li>
                <li>
                  <strong className="text-foreground">Continue.dev:</strong> Adicione no arquivo <code className="font-mono text-primary">%USERPROFILE%\.continue\config.json</code> dentro do array <code className="font-mono text-primary">"mcpServers"</code>.
                </li>
              </ul>
            </div>

            <div className="pt-2 border-t border-border/50 bg-amber-500/5 p-2 rounded-lg border border-amber-500/20">
              <span className="font-bold text-amber-500 block text-[11px] uppercase tracking-wider mb-0.5">⚠️ Dica Windows:</span>
              <p className="text-[11px]">
                No Windows, utilize sempre <code className="font-mono text-foreground font-bold">npx.cmd</code> ou <code className="font-mono text-foreground font-bold">npm.cmd</code> no campo <code className="font-mono text-foreground">command</code>. Isso impede que o VS Code falhe com erro de <code className="font-mono text-amber-500">spawn ENOENT</code> ao inicializar o servidor em segundo plano.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'mcp-karaf-maven-deploy',
      question: 'Como pedir para a IA (Copilot no IntelliJ/VS Code ou Claude) fazer Clean Install Maven e Deploy da Feature no Karaf?',
      category: 'Integração & MCP',
      tags: ['mcp', 'copilot', 'karaf', 'clean install', 'maven', 'deploy', 'feature', 'prompt', 'exemplo', 'verify', 'active', 'intellij', 'vscode', 'vs code'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            Com o MCP conectado no IntelliJ IDEA, VS Code (Copilot/Cline) ou Claude Code, você pode solicitar o ciclo completo de build Maven e publicação de features OSGi no Apache Karaf em uma única frase em linguagem natural.
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-3 shadow-sm">
            <div>
              <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary mb-1">Exemplo de Prompt Recomendado (Testado e Aprovado):</span>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-primary/10 border border-primary/30 text-foreground font-medium text-xs">
                <span>"Faça o clean install (pulando testes) do projeto atual e instale a feature no Karaf. No final, confirme se ela ficou ativa."</span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      'Faça o clean install (pulando testes) do projeto atual e instale a feature no Karaf. No final, confirme se ela ficou ativa.',
                      'prompt-deploy-karaf'
                    )
                  }
                  className="p-1 hover:text-primary transition-colors cursor-pointer shrink-0 ml-2"
                  title="Copiar prompt"
                >
                  {copiedItem === 'prompt-deploy-karaf' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-primary" />}
                </button>
              </div>
            </div>

            <div>
              <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary mb-1">Como a IA orquestra os passos nos bastidores:</span>
              <ol className="list-decimal pl-4 space-y-1.5 text-[11px]">
                <li>
                  <strong className="text-foreground">Compilação Maven:</strong> A IA dispara <code className="font-mono text-primary font-semibold">mvn clean install -DskipTests</code> (ou chama <code className="font-mono text-primary font-semibold">karaf_run_maven_build</code>) no diretório do projeto e aguarda o <code className="font-mono text-emerald-500 font-bold">BUILD SUCCESS</code>.
                </li>
                <li>
                  <strong className="text-foreground">Injeção no Karaf:</strong> Invoca a ferramenta <code className="font-mono text-primary font-semibold">karaf_exec_command</code> do Dev Manager para executar <code className="font-mono text-primary">feature:repo-add mvn:.../features.xml</code> e <code className="font-mono text-primary">feature:install &lt;nome-da-feature&gt;</code> via <code className="font-mono text-primary">client.bat</code>.
                </li>
                <li>
                  <strong className="text-foreground">Verificação Pós-Deploy:</strong> Invoca a ferramenta <code className="font-mono text-primary font-semibold">karaf_verify_bundle</code> para validar <code className="font-mono text-primary">feature:list -i</code> e <code className="font-mono text-primary">bundle:list</code>, confirmando que a feature passou para o estado <strong className="text-emerald-500 font-bold">Started (Ativa)</strong>.
                </li>
              </ol>
            </div>

            <div className="pt-2 border-t border-border/50">
              <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary mb-1">Outros Exemplos de Prompts Úteis para o Chat da IA:</span>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li><em className="text-foreground">"Verifique se o Apache Karaf está rodando antes de iniciar o deploy."</em> (Chama <code className="font-mono text-primary">karaf_is_running</code>)</li>
                <li><em className="text-foreground">"Liste os bundles que estão com status de falha ou problema de fiação no Karaf."</em> (Chama <code className="font-mono text-primary">karaf_detect_wiring_conflicts</code>)</li>
                <li><em className="text-foreground">"Verifique o status do meu ambiente, mate qualquer processo na porta 8181 e inicie a IDE."</em> (Chama <code className="font-mono text-primary">env_check_ports</code> e <code className="font-mono text-primary">env_batch_kill_processes</code>)</li>
                <li><em className="text-foreground">"Consulte as últimas 50 linhas do arquivo karaf.log e resuma se há exceções recentes."</em> (Chama <code className="font-mono text-primary">karaf_get_log</code> ou <code className="font-mono text-primary">logs_read_last_lines</code>)</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'database-backup-custom',
      question: 'Como configurar e personalizar backups de banco de dados (especialmente Oracle 11g/12c/19c)?',
      category: 'Banco de Dados & Backup',
      tags: ['backup', 'oracle', 'expdp', 'exp', '11g', '19c', 'dump', 'cron', 'retenção', 'postgres', 'mysql'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            A <strong className="text-foreground">Central de Backup &amp; Restauração</strong> (aba Banco de Dados) suporta os utilitários nativos de exportação do Oracle, PostgreSQL e MySQL, além de um modo flexível de <strong className="text-foreground">Comando Personalizado</strong>.
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2 shadow-sm">
            <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Destaques Oracle:</span>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong className="text-foreground">Oracle 11g / 12c (Data Pump):</strong> Requer os parâmetros <code className="font-mono text-primary font-semibold">VERSION=11.2</code> e <code className="font-mono text-primary font-semibold">EXCLUDE=STATISTICS</code> para compatibilidade.
              </li>
              <li>
                <strong className="text-foreground">Oracle Remoto / Docker (exp clássico):</strong> Quando você não tem acesso à pasta física <code className="font-mono text-primary font-semibold">DATA_PUMP_DIR</code> no servidor remoto, use o utilitário clássico <code className="font-mono text-primary font-semibold">exp</code>, que salva o <code className="font-mono text-primary">.dmp</code> diretamente na sua estação de trabalho local.
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'oracle-statement-tracer',
      question: 'Como descobrir qual SQL outro sistema executou no Oracle (Statement Tracer)?',
      category: 'Banco de Dados & Backup',
      tags: ['tracer', 'statement', 'oracle', 'v$session', 'v$sql', 'sql_id', 'sessão', 'captura', 'rastrear', 'winthor'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            A aba <strong className="text-foreground">Statement Tracer</strong> do Database Studio acompanha a atividade do Oracle consultando <code className="font-mono text-primary">v$session</code> e <code className="font-mono text-primary">v$sql</code> em intervalos. Serve para descobrir que SQL uma rotina ou API rodou sem precisar ligar trace no servidor.
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2 shadow-sm">
            <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Passo a passo:</span>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Selecione uma conexão <strong className="text-foreground">Oracle</strong> na barra lateral do Banco de Dados e abra a aba <strong className="text-foreground">Statement Tracer</strong>.</li>
              <li>Escolha o intervalo (2s, 5s, 10s ou 30s) e clique em <strong className="text-foreground">Iniciar Captura</strong>.</li>
              <li>Vá até o outro sistema (rotina WinThor, API no Karaf etc.) e dispare a ação. A captura continua mesmo se você trocar de aba ou de página no Dev Manager.</li>
              <li>Volte e veja a <strong className="text-foreground">Linha do tempo</strong> (cada troca de SQL por sessão, com SID/SERIAL, schema, programa e módulo) ou a lista <strong className="text-foreground">SQL capturado</strong> (instruções distintas por <code className="font-mono text-primary">SQL_ID</code>, com número de execuções). Os filtros por schema e por texto ajudam a achar a sua sessão.</li>
            </ol>
            <p className="pt-1">
              A captura para sozinha depois de <strong className="text-foreground">30 minutos</strong>. O usuário da conexão precisa ter permissão de leitura nas views <code className="font-mono text-primary">v$session</code>/<code className="font-mono text-primary">v$sql</code> (ex.: <code className="font-mono text-primary">SELECT_CATALOG_ROLE</code>); sem isso, o painel mostra o erro do Oracle.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'oracle-bind-capture-tracer',
      question: 'Como inspecionar os parâmetros (binds) passados nas queries do Oracle e evitar o log:set trace root no Karaf?',
      category: 'Banco de Dados & Backup',
      tags: ['binds', 'parametros', 'tracer', 'oracle', 'v$sql_bind_capture', 'sql interpolado', 'karaf', 'trace root', 'oratrace', 'winthor'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            O <strong className="text-foreground">Statement Tracer</strong> do Dev Manager agora captura automaticamente os valores dos parâmetros passados nas instruções SQL (<code className="font-mono text-primary">v$sql_bind_capture</code>), eliminando a necessidade de habilitar <code className="font-mono text-primary font-bold">log:set trace root</code> no Karaf ou depender de utilitários externos como o <em>Statement Tracer for Oracle (OraTracer.exe)</em>.
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2.5 shadow-sm">
            <div>
              <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary mb-1">
                Por que evitar o "log:set trace root" no Karaf?
              </span>
              <p>
                Ativar o nível <code className="font-mono text-primary">TRACE</code> em todo o contêiner OSGi satura o log com milhares de linhas internas do framework por segundo, degrada a performance da JVM, enche o disco e torna difícil achar a query que você procura. Consultar <code className="font-mono text-primary">v$sql_bind_capture</code> direto no Oracle lê apenas os parâmetros reais gravados no cursor da query (<code className="font-mono text-primary">SQL_ID</code>) com zero impacto nos logs do servidor.
              </p>
            </div>
            <div className="pt-2 border-t border-border/50">
              <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary mb-1">
                Como inspecionar e rodar o SQL pronto:
              </span>
              <ol className="list-decimal pl-4 space-y-1">
                <li>No <strong>Statement Tracer</strong>, selecione qualquer query na tabela para abrir o inspetor inferior.</li>
                <li>Na aba <strong>Parâmetros (Binds)</strong>, veja a posição (<code className="font-mono text-primary">:1</code>, <code className="font-mono text-primary">:NOME</code>), o tipo do dado (VARCHAR2, NUMBER, DATE, etc.) e o valor exato capturado.</li>
                <li>O Dev Manager formata e interpola os valores no SQL automaticamente, tratando aspas, datas e números.</li>
                <li>Clique em <strong>"Usar no Editor"</strong> para abrir a query já pronta no Editor SQL do DB Studio, ou <strong>"Copiar SQL"</strong> para colar onde precisar.</li>
              </ol>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'apm-connect',
      question: 'Como envio traces do Karaf/WinThor para a tela APM & Traces?',
      category: 'APM & Traces',
      tags: ['apm', 'traces', 'opentelemetry', 'otel', 'otlp', '4318', 'javaagent', 'telemetria', 'latência', 'span'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            O Dev Manager traz um receptor <strong className="text-foreground">OpenTelemetry (OTLP/HTTP, JSON ou Protobuf)</strong> embutido, que escuta por padrão na porta <code className="font-mono text-primary font-semibold">4318</code>. Os spans recebidos alimentam o <strong className="text-foreground">Dashboard</strong> (vazão, latências p50/p95/p99, taxa de erros, % do tempo em banco, endpoints e queries lentas) e o <strong className="text-foreground">Traces Explorer</strong> (waterfall, atributos, SQL, stacktrace e divisão do tempo entre banco, chamadas externas e aplicação). Métricas e logs OTLP não são coletados, só traces.
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2 shadow-sm">
            <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Karaf iniciado pelo Cockpit:</span>
            <p>
              Coloque o <code className="font-mono text-primary font-semibold">opentelemetry-javaagent.jar</code> na pasta <code className="font-mono text-primary">bin</code> do Karaf. Ao iniciar pelo Dev Manager, o agente é anexado automaticamente e exporta para a porta configurada. Para scripts externos (ex.: <code className="font-mono text-primary">winthor.bat</code>), copie o comando pronto em <strong className="text-foreground">APM &amp; Traces → Como Conectar</strong>.
            </p>
            <span className="font-bold text-foreground block pt-1 text-[11px] uppercase tracking-wider text-primary">Porta ocupada?</span>
            <p>
              Se outro coletor (OTel Collector, Jaeger, SigNoz) já usa a 4318, o receptor fica inativo e a tela avisa. Troque a porta em <strong className="text-foreground">Como Conectar</strong>: a nova porta é aberta antes de fechar a atual, então o receptor em uso não cai se a nova estiver ocupada. O Karaf passa a exportar para ela no próximo start.
            </p>
            <span className="font-bold text-foreground block pt-1 text-[11px] uppercase tracking-wider text-primary">Teste rápido:</span>
            <p>
              A aba <strong className="text-foreground">cURL</strong> de Como Conectar envia um span de exemplo; o botão <strong className="text-foreground">Simular Tráfego</strong> gera dados fictícios para conhecer a tela.
            </p>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('apm')}
              className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-2 w-fit cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Abrir APM &amp; Traces</span>
            </button>
          )}
        </div>
      )
    },
    {
      id: 'apm-waterfall-and-slow-queries',
      question: 'Como funciona o gráfico Waterfall e a detecção de chamadas e queries lentas no APM?',
      category: 'APM & Traces',
      tags: ['apm', 'waterfall', 'régua', 'http', 'java', 'jdbc', 'gargalo', 'queries lentas', 'endpoints', 'top lentos'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            O <strong className="text-foreground">Traces Explorer</strong> decompõe automaticamente cada requisição em uma régua de tempo visual dividida em 3 camadas semânticas essenciais:
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2 shadow-sm">
            <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Régua de Tempo Visual (Time Budget):</span>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong className="text-sky-600 dark:text-sky-400">Requisição HTTP:</strong> tempo gasto em I/O de rede, filtros de servlet e recepção/despacho do servidor web.
              </li>
              <li>
                <strong className="text-purple-600 dark:text-purple-400">Processamento Java:</strong> tempo gasto em regras de negócio, transformações de dados e handlers OSGi dentro do Apache Karaf.
              </li>
              <li>
                <strong className="text-amber-600 dark:text-amber-400">Queries JDBC no banco:</strong> tempo dedicado a consultas e comandos SQL executados no Oracle/PostgreSQL.
              </li>
            </ul>
            <span className="font-bold text-foreground block pt-1 text-[11px] uppercase tracking-wider text-primary">Detecção de Consultas e Endpoints Lentos:</span>
            <p>
              O sistema detecta automaticamente chamadas com duração elevada (&gt;400ms ou &gt;1s) e exibe o badge <code className="font-mono text-amber-500 font-bold">⚡ Lenta</code> diretamente nos spans do Waterfall. Na barra de filtros e no Dashboard, use os botões rápidos <strong className="text-foreground">Top Lentos</strong>, <strong className="text-foreground">🗄️ Queries Lentas</strong>, <strong className="text-foreground">🌐 Endpoints Lentos</strong> ou ordene por <strong className="text-foreground">Mais Lentos</strong> em 1 clique.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'winthor-start',
      question: 'Como as rotinas do WinThor abrem já autenticadas (WinThor Start e WTA)?',
      category: 'Catálogo de Rotinas',
      tags: ['winthor', 'winthor start', 'wta', 'datasnap', '9195', '8889', 'rotinas', 'login', 'token'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            Quando o serviço local <strong className="text-foreground">WinThor Start</strong> (<code className="font-mono text-primary">http://localhost:9195</code>) está ativo, o Catálogo de Rotinas abre executáveis (<code className="font-mono text-primary">.EXE</code>, <code className="font-mono text-primary">.PC</code>) por ele, já com contexto autenticado e sem precisar do menu do WinThor aberto. O badge no topo do Catálogo mostra se o serviço está disponível.
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2 shadow-sm">
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong className="text-foreground">Login no WTA:</strong> o Dev Manager se autentica no portal WinThor Anywhere para obter token, matrícula e dados de banco da sessão.
              </li>
              <li>
                <strong className="text-foreground">Payload fixo:</strong> se o login falhar, usa o payload de sessão salvo como contingência.
              </li>
              <li>
                <strong className="text-foreground">Sem o serviço:</strong> cai para execução direta do executável ou para o launcher customizado.
              </li>
            </ul>
            <p>
              Configure em <strong className="text-foreground">Configurações → Diretórios → Integração WinThor Start (DataSnap) &amp; WTA</strong>. As portas 9195 e 8889 aparecem nas portas monitoradas.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'routine-launch-eftype',
      question: 'Por que ao abrir uma rotina aparecia erro "spawn EFTYPE" e como funciona o lançamento seguro?',
      category: 'Catálogo de Rotinas',
      tags: ['spawn', 'eftype', 'rotina', 'delphi', 'uac', 'winthor start', 'timeout', 'execução', 'contingência'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            No Windows, o erro <code className="font-mono text-primary font-semibold">spawn EFTYPE</code> (código do sistema <code className="font-mono text-primary">ERROR_BAD_EXE_FORMAT</code>) ocorria quando um processo era invocado via chamada direta da API do sistema sem shell em situações onde o executável exigia elevação UAC (Administrador), continha travas temporárias de antivírus ou quando havia concorrência prematura com o WinThor Start.
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2 shadow-sm">
            <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Melhorias implementadas:</span>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong className="text-foreground">Lançador Seguro Windows:</strong> Todas as rotinas e aplicativos agora utilizam delegação ao Shell do Windows (<code className="font-mono text-primary">cmd /c start</code>), respeitando o diretório de trabalho (<code className="font-mono text-primary">cwd</code>) indispensável para carregar DLLs e arquivos INI das rotinas Delphi, além de suportar elevação UAC e scripts transparentemente.
              </li>
              <li>
                <strong className="text-foreground">Timeouts Estendidos &amp; Sem Concorrência:</strong> O tempo limite de espera pelo WinThor Start foi ampliado de 3s para 8s. Se a requisição expirar ou o serviço responder com erro, o Dev Manager não dispara um processo concorrente às cegas, prevenindo contenção e travamento de arquivos.
              </li>
              <li>
                <strong className="text-foreground">Contingência com 1 Clique:</strong> Caso o WinThor Start demore ou retorne erro, o botão <strong className="text-foreground">"Tentar abrir direto (sem autenticação)"</strong> surge instantaneamente no banner de feedback para abrir a rotina localmente de forma isolada.
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'secrets-encryption',
      question: 'As senhas e tokens que salvo nas Configurações ficam em texto puro no disco?',
      category: 'Segurança & Configurações',
      tags: ['senha', 'segredo', 'token', 'criptografia', 'aes', 'config.json', 'api key', 'segurança'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            Não. Senhas de banco, senha do Karaf, token pessoal do Azure DevOps (PAT), tokens do Confluence/Jira, API keys de provedores de IA e credenciais de webhooks ficam <strong className="text-foreground">criptografados (AES-256-GCM)</strong> no <code className="font-mono text-primary">config.json</code>.
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-1.5 shadow-sm">
            <p>
              A chave é gerada na primeira execução e fica no arquivo <code className="font-mono text-primary">.secrets.key</code>, ao lado do <code className="font-mono text-primary">config.json</code>. <strong className="text-foreground">Copiar o config.json para outra máquina sem essa chave faz os segredos serem perdidos</strong>: será preciso digitá-los de novo.
            </p>
            <p>
              A interface e a API nunca devolvem o valor salvo, só uma máscara. Se você trocar o host ou a URL de um destino, a credencial antiga não é reaproveitada: informe-a de novo.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'karaf-offline-deploy',
      question: 'Por que o deploy avisa "Karaf / OSGi offline (porta SSH fechada)" ou falha com "Failed to get the session"?',
      category: 'Deploy & Pipelines',
      tags: ['karaf', 'osgi', 'deploy', 'client.bat', 'failed to get the session', 'ssh', '8101', 'offline', 'pipeline'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            Para comandos Karaf (<code className="font-mono text-primary font-semibold">feature:repo-add</code>, <code className="font-mono text-primary font-semibold">feature:install</code>, <code className="font-mono text-primary font-semibold">bundle:*</code>), o Dev Manager valida previamente se o contêiner OSGi está rodando e escutando na porta SSH (padrão <code className="font-mono text-primary font-semibold">8101</code>).
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-1.5 shadow-sm">
            <p>
              O script oficial <code className="font-mono text-primary">client.bat</code> do Windows frequentemente retorna código de saída <code className="font-mono text-primary">0</code> mesmo ao exibir a mensagem de erro <code className="font-mono text-primary">"Failed to get the session."</code> quando o Karaf não está ativo.
            </p>
            <p>
              A verificação prévia do Dev Manager impede que você gaste tempo esperando compilações Maven lentas (<code className="font-mono text-primary">mvn clean install</code>) para depois falhar no deploy, e garante que falhas de conexão SSH não sejam mascaradas como falso sucesso.
            </p>
            <p className="pt-1">
              <strong>Como resolver:</strong> Inicie o Karaf pelo botão <strong className="text-foreground">Iniciar Karaf Embutido</strong> no banner de alerta da tela de Deploy, pela tela de <strong className="text-foreground">Ambiente Dev</strong>, ou adicione uma etapa que inicie o serviço/script Karaf antes dos comandos no seu perfil.
            </p>
          </div>
        </div>
      )
    }
  ], [appInfo, copiedItem, copyToClipboard, debugPort, onNavigate, sshPort, webPort]);

  const faqCategories = useMemo(() => {
    const cats = new Set(faqList.map((f) => f.category));
    return ['all', ...Array.from(cats)];
  }, [faqList]);

  const filteredFaqs = useMemo(() => {
    return faqList.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = faqCategoryFilter === 'all' || item.category === faqCategoryFilter;

      return matchesSearch && matchesCat;
    });
  }, [faqList, searchQuery, faqCategoryFilter]);

  const keyboardShortcuts = [
    { key: 'Alt + 1', desc: 'Acessar "Ambiente Dev" (Cockpit de Serviços e Automação)', category: 'Navegação' },
    { key: 'Alt + 2', desc: 'Acessar "Banco de Dados" (SQL Runner Oracle, MySQL, Postgres)', category: 'Navegação' },
    { key: 'Alt + 3', desc: 'Acessar "Containers" (Gerenciador de Containers Docker)', category: 'Navegação' },
    { key: 'Alt + 4', desc: 'Acessar "Deploy" (Perfis Karaf OSGi, Docker & Scripts)', category: 'Navegação' },
    { key: 'Alt + 5', desc: 'Acessar "Git & Azure DevOps" (Branches, Commits e PRs)', category: 'Navegação' },
    { key: 'Alt + 6', desc: 'Acessar "Catálogo de Rotinas" (Executáveis Delphi .exe/.pc)', category: 'Navegação' },
    { key: 'Alt + 7', desc: 'Acessar "Documentação" (Busca Semântica RAG com IA)', category: 'Navegação' },
    { key: 'Alt + 8', desc: 'Acessar "Logs em Tempo Real" (tail -f de logs de aplicações)', category: 'Navegação' },
    { key: 'Alt + 9', desc: 'Acessar esta Central de Ajuda & Launchpad do Sistema', category: 'Navegação' },
    { key: 'Alt + 0', desc: 'Acessar "APM & Traces" (Dashboard e Traces Explorer OpenTelemetry)', category: 'Navegação' },
    { key: 'Ctrl + K', desc: 'Abrir o Quick Launcher (busca aproximada de ações, projetos e Configurações)', category: 'Navegação' },
    { key: 'Ctrl + Enter', desc: 'Executar consulta SQL selecionada no Database Studio', category: 'Banco de Dados' },
    { key: 'Shift + F9', desc: `Depuração Remota JVM no IntelliJ IDEA (Porta :${debugPort})`, category: 'Desenvolvimento' },
    { key: 'Enter', desc: 'Enviar comando no Terminal Integrado do Shell Karaf', category: 'Terminal' }
  ];

  const categories = [
    { id: 'overview', label: 'Visão Geral & Início', icon: Rocket, badge: 'Launchpad' },
    { id: 'modules', label: 'Guia dos Módulos', icon: BookOpen, badge: '10 Módulos' },
    { id: 'shortcuts', label: 'Atalhos & Dicas Pro', icon: Zap, badge: 'Produtividade' },
    { id: 'faq', label: 'FAQ & Resolução de Dúvidas', icon: LifeBuoy, badge: `${faqList.length}` },
    { id: 'about', label: 'Sobre & Diagnóstico', icon: Info, badge: `v${appInfo?.appVersion || '1.22.0'}` }
  ];

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (val.trim() && activeCategory === 'overview') {
      setActiveCategory('faq');
    }
  };

  return (
    <div className="h-full flex flex-col p-4 sm:p-5 space-y-4 overflow-hidden">
      {/* 1. TOPO / HEADER DA CENTRAL DE AJUDA & LAUNCHPAD */}
      <div className="cockpit-panel rounded-2xl p-3.5 sm:p-4 shadow-xl border border-border flex flex-wrap items-center justify-between gap-3 shrink-0 backdrop-blur-md">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary shrink-0">
            <HelpCircle className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight truncate">
                Central de Ajuda &amp; Documentação
              </h2>
              <span className="text-[10px] bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-mono font-bold tracking-wider uppercase">
                PORTA DE ENTRADA
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              Hub operacional: orientações de uso, fluxo diário, atalhos de teclado, FAQs e diagnósticos técnicos
            </p>
          </div>
        </div>

        {/* Busca Rápida Integrada */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Pesquisar ajuda, comandos, FAQ, portas..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-card/70 border border-border hover:border-primary/40 focus:border-primary rounded-xl pl-9 pr-8 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none transition-all font-sans shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. SUB-NAVEGAÇÃO POR PÍLULAS TEMÁTICAS */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 shrink-0 scrollbar-none">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as HelpCategory)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                  : 'bg-card/60 text-muted-foreground border-border hover:text-foreground hover:bg-card/90'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{cat.label}</span>
              {cat.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                    isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {cat.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. CONTEÚDO PRINCIPAL ROLÁVEL */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
        {/* ========================================================================= */}
        {/* TAB 1: VISÃO GERAL & LAUNCHPAD OPERACIONAL */}
        {/* ========================================================================= */}
        {activeCategory === 'overview' && (
          <div className="space-y-4">
            {/* HERO BANNER / COCKPIT COMMAND DECK */}
            <div className="cockpit-panel rounded-2xl p-5 sm:p-6 border border-border shadow-xl relative overflow-hidden">
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="space-y-2.5 max-w-2xl">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                      COCKPIT DO DESENVOLVEDOR
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      Dev Manager • v{appInfo?.appVersion || '1.22.0'}
                    </span>
                    {appInfo?.isAdmin ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/25">
                        <ShieldCheck className="w-3 h-3" /> Modo Administrador
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/25">
                        <ShieldAlert className="w-3 h-3" /> Usuário Padrão
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                    Bem-vindo ao Dev Manager 🚀
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    O cockpit unificado para eliminar o atrito diário do desenvolvimento WinThor. Controle serviços do Windows, compile e publique bundles OSGi no Apache Karaf e containers Docker, sincronize branches e abra Pull Requests no Azure DevOps sem preenchimento manual.
                  </p>

                  {/* Chips de Informações Chave */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap text-xs">
                    <div className="px-2.5 py-1 rounded-lg bg-muted/60 border border-border text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
                      <Globe className="w-3 h-3 text-primary" />
                      <span>Web: <strong className="text-foreground">:{webPort}</strong></span>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-muted/60 border border-border text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
                      <Terminal className="w-3 h-3 text-cyan-400" />
                      <span>SSH Karaf: <strong className="text-foreground">:{sshPort}</strong></span>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-muted/60 border border-border text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>JVM Debug: <strong className="text-foreground">:{debugPort}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Botões de Ação Imediata do Hero */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
                  {onNavigate && (
                    <button
                      type="button"
                      onClick={() => onNavigate(needsSetup ? 'settings' : 'env')}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {needsSetup ? <Settings className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                      <span>{needsSetup ? 'Configurar Ambiente' : 'Preparar Ambiente Dev'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {onRestartTour && (
                    <button
                      type="button"
                      onClick={onRestartTour}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-card/80 hover:bg-card text-foreground border border-border hover:border-primary/40 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                      title="Reabrir o tour guiado de boas-vindas"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span>Ver Tour Guiado</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveCategory('shortcuts')}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground border border-border hover:border-primary/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ver Atalhos de Teclado</span>
                  </button>
                </div>
              </div>
            </div>

            {/* PIPELINE DO FLUXO DE TRABALHO DIÁRIO (5 PASSOS ESTRUTURADOS) */}
            <div className="cockpit-panel rounded-2xl p-5 border border-border shadow-xl space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-border flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <Workflow className="w-4 h-4 text-primary" />
                  <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-foreground">
                    Fluxo de Trabalho Diário Recomendado
                  </h3>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  5 passos essenciais para máxima produtividade
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* Passo 1: Preparar Ambiente */}
                <div className="p-4 rounded-xl bg-card/60 border border-cyan-500/20 hover:border-cyan-500/60 transition-all duration-200 flex flex-col justify-between space-y-3 group shadow-sm hover:shadow-md">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 flex items-center justify-center font-bold text-xs">
                        1
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-semibold">
                        Ambiente
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-foreground group-hover:text-cyan-400 transition-colors">
                      Preparar Ambiente
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Encerra processos travados, libera portas TCP, inicia a IDE configurada e sobe os serviços em modo Debug.
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1 font-mono text-[9px] text-muted-foreground">
                      <span className="px-1.5 py-0.5 rounded bg-muted/70">:{debugPort} JDWP</span>
                      <span className="px-1.5 py-0.5 rounded bg-muted/70">Portas</span>
                    </div>
                  </div>

                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('env')}
                      className="pt-2 text-[11px] text-cyan-400 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <span>Ir para Ambiente</span> <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Passo 2: Perfis de Deploy */}
                <div className="p-4 rounded-xl bg-card/60 border border-amber-500/20 hover:border-amber-500/60 transition-all duration-200 flex flex-col justify-between space-y-3 group shadow-sm hover:shadow-md">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/25 flex items-center justify-center font-bold text-xs">
                        2
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-semibold">
                        Deploy
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-foreground group-hover:text-amber-500 transition-colors">
                      Compilar &amp; Deploy
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Pipelines sequenciais de build Maven, deploy de bundles OSGi no Karaf (<code className="font-mono text-primary">client.bat</code>) e Docker com streaming de saída.
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1 font-mono text-[9px] text-muted-foreground">
                      <span className="px-1.5 py-0.5 rounded bg-muted/70">OSGi</span>
                      <span className="px-1.5 py-0.5 rounded bg-muted/70">Docker</span>
                      <span className="px-1.5 py-0.5 rounded bg-muted/70">Maven</span>
                    </div>
                  </div>

                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('deploy')}
                      className="pt-2 text-[11px] text-amber-500 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <span>Ir para Deploy</span> <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Passo 3: Git & Pull Request */}
                <div className="p-4 rounded-xl bg-card/60 border border-blue-500/20 hover:border-blue-500/60 transition-all duration-200 flex flex-col justify-between space-y-3 group shadow-sm hover:shadow-md">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/25 flex items-center justify-center font-bold text-xs">
                        3
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-semibold">
                        Git Hub
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-foreground group-hover:text-blue-500 transition-colors">
                      Git &amp; Pull Request
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Sincroniza branches locais com a develop e abre a tela de criação de Pull Request no Azure DevOps sem preenchimento manual.
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1 font-mono text-[9px] text-muted-foreground">
                      <span className="px-1.5 py-0.5 rounded bg-muted/70">Azure DevOps</span>
                      <span className="px-1.5 py-0.5 rounded bg-muted/70">Branches</span>
                    </div>
                  </div>

                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('git')}
                      className="pt-2 text-[11px] text-blue-500 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <span>Ir para Git &amp; Azure</span> <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Passo 4: Catálogo de Rotinas */}
                <div className="p-4 rounded-xl bg-card/60 border border-indigo-500/20 hover:border-indigo-500/60 transition-all duration-200 flex flex-col justify-between space-y-3 group shadow-sm hover:shadow-md">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 flex items-center justify-center font-bold text-xs">
                        4
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-semibold">
                        Rotinas
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-foreground group-hover:text-indigo-400 transition-colors">
                      Catálogo de Rotinas
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Localização instantânea de executáveis Delphi (.exe e .pc), download direto e atualização pela Central de Controle WinThor (CCW) com backup .bak automático.
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1 font-mono text-[9px] text-muted-foreground">
                      <span className="px-1.5 py-0.5 rounded bg-muted/70">Delphi .exe</span>
                      <span className="px-1.5 py-0.5 rounded bg-muted/70">CCW Download</span>
                      <span className="px-1.5 py-0.5 rounded bg-muted/70">Backup .bak</span>
                    </div>
                  </div>

                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('routines')}
                      className="pt-2 text-[11px] text-indigo-400 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <span>Ir para Rotinas</span> <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Passo 5: Banco de Dados & RAG */}
                <div className="p-4 rounded-xl bg-card/60 border border-violet-500/20 hover:border-violet-500/60 transition-all duration-200 flex flex-col justify-between space-y-3 group shadow-sm hover:shadow-md">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="w-7 h-7 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/25 flex items-center justify-center font-bold text-xs">
                        5
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 font-semibold">
                        Dados &amp; Docs
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-foreground group-hover:text-violet-400 transition-colors">
                      Banco &amp; Docs RAG
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Studio SQL multi-vendor (Oracle/Postgres) com rotinas de backup, e busca semântica em contratos de API e manuais com IA.
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1 font-mono text-[9px] text-muted-foreground">
                      <span className="px-1.5 py-0.5 rounded bg-muted/70">Oracle / PG</span>
                      <span className="px-1.5 py-0.5 rounded bg-muted/70">FastEmbed IA</span>
                    </div>
                  </div>

                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('database')}
                      className="pt-2 text-[11px] text-violet-400 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <span>Ir para Banco</span> <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* MATRIZ DE MÓDULOS & ATALHOS RÁPIDOS */}
            <div className="cockpit-panel rounded-2xl p-5 border border-border shadow-xl space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-border flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <Boxes className="w-4 h-4 text-primary" />
                  <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-foreground">
                    Ecossistema &amp; Módulos do Sistema
                  </h3>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  Atalhos globais de acesso direto (Alt + 0..9)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 gap-3">
                {/* 1. Ambiente */}
                <div
                  onClick={() => onNavigate?.('env')}
                  className="p-3.5 rounded-xl bg-card/60 border border-border hover:border-primary/50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        Ambiente Dev
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      Serviços Windows, liberação de portas e servidor OSGi Debug.
                    </p>
                  </div>
                  <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold shrink-0">
                    Alt+1
                  </kbd>
                </div>

                {/* 2. Banco de Dados */}
                <div
                  onClick={() => onNavigate?.('database')}
                  className="p-3.5 rounded-xl bg-card/60 border border-border hover:border-emerald-500/50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="text-xs font-bold text-foreground group-hover:text-emerald-500 transition-colors truncate">
                        Banco de Dados
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      Database Studio Oracle, PostgreSQL, MySQL e Backups agendados.
                    </p>
                  </div>
                  <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold shrink-0">
                    Alt+2
                  </kbd>
                </div>

                {/* 3. Containers */}
                <div
                  onClick={() => onNavigate?.('containers')}
                  className="p-3.5 rounded-xl bg-card/60 border border-border hover:border-blue-400/50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Boxes className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="text-xs font-bold text-foreground group-hover:text-blue-400 transition-colors truncate">
                        Containers Docker
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      Gestão de ciclo de vida de containers, streaming de logs e status.
                    </p>
                  </div>
                  <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold shrink-0">
                    Alt+3
                  </kbd>
                </div>

                {/* 4. Deploy */}
                <div
                  onClick={() => onNavigate?.('deploy')}
                  className="p-3.5 rounded-xl bg-card/60 border border-border hover:border-amber-500/50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="text-xs font-bold text-foreground group-hover:text-amber-500 transition-colors truncate">
                        Perfis de Deploy
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      Build Maven, publicação de bundles OSGi no Karaf e scripts.
                    </p>
                  </div>
                  <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold shrink-0">
                    Alt+4
                  </kbd>
                </div>

                {/* 5. Git & Azure */}
                <div
                  onClick={() => onNavigate?.('git')}
                  className="p-3.5 rounded-xl bg-card/60 border border-border hover:border-blue-500/50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <GitPullRequest className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="text-xs font-bold text-foreground group-hover:text-blue-500 transition-colors truncate">
                        Git &amp; Azure DevOps
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      Varredura de repositórios, gestão de branches e criação de PRs.
                    </p>
                  </div>
                  <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold shrink-0">
                    Alt+5
                  </kbd>
                </div>

                {/* 6. Catálogo de Rotinas */}
                <div
                  onClick={() => onNavigate?.('routines')}
                  className="p-3.5 rounded-xl bg-card/60 border border-border hover:border-indigo-400/50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Grid className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="text-xs font-bold text-foreground group-hover:text-indigo-400 transition-colors truncate">
                        Catálogo de Rotinas
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      Busca rápida de executáveis Delphi, download e atualização via CCW.
                    </p>
                  </div>
                  <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold shrink-0">
                    Alt+6
                  </kbd>
                </div>

                {/* 7. Documentação RAG */}
                <div
                  onClick={() => onNavigate?.('docs')}
                  className="p-3.5 rounded-xl bg-card/60 border border-border hover:border-purple-400/50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <FileSearch className="w-4 h-4 text-purple-400 shrink-0" />
                      <span className="text-xs font-bold text-foreground group-hover:text-purple-400 transition-colors truncate">
                        Documentação (RAG)
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      Busca semântica em manuais e contratos de API com IA local.
                    </p>
                  </div>
                  <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold shrink-0">
                    Alt+7
                  </kbd>
                </div>

                {/* 8. Logs */}
                <div
                  onClick={() => onNavigate?.('logs')}
                  className="p-3.5 rounded-xl bg-card/60 border border-border hover:border-sky-500/50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-sky-500 shrink-0" />
                      <span className="text-xs font-bold text-foreground group-hover:text-sky-500 transition-colors truncate">
                        Logs em Tempo Real
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      Acompanhamento contínuo (tail -f) de logs de aplicações.
                    </p>
                  </div>
                  <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold shrink-0">
                    Alt+8
                  </kbd>
                </div>

                {/* 9. APM & Traces */}
                <div
                  onClick={() => onNavigate?.('apm')}
                  className="p-3.5 rounded-xl bg-card/60 border border-border hover:border-rose-500/50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-rose-500 shrink-0" />
                      <span className="text-xs font-bold text-foreground group-hover:text-rose-500 transition-colors truncate">
                        APM &amp; Traces
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      Receptor OpenTelemetry, latências, erros e waterfall de traces.
                    </p>
                  </div>
                  <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold shrink-0">
                    Alt+0
                  </kbd>
                </div>

                {/* 10. Configurações (sem atalho Alt; acessível pelo ícone no cabeçalho ou Ctrl+K) */}
                <div
                  onClick={() => onNavigate?.('settings')}
                  className="p-3.5 rounded-xl bg-card/60 border border-border hover:border-primary/50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Settings className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        Configurações
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      Pastas do workspace, portas monitoradas, Karaf e IDEs.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* DECK DE SERVIÇOS & ENDPOINTS LOCAIS */}
            <div className="cockpit-panel rounded-2xl p-5 border border-border shadow-xl space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-border flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <Compass className="w-4 h-4 text-primary" />
                  <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-foreground">
                    Serviços Locais &amp; Portais Externos
                  </h3>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  Acesso rápido em 1 clique aos endpoints do ecossistema
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Portal Web Local */}
                <div className="p-4 rounded-xl bg-card/60 border border-border hover:border-primary/50 transition-all space-y-3 flex flex-col justify-between shadow-xs">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground block">
                        Portal Web Local
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                        :{webPort}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-muted-foreground truncate" title={portalWebUrl}>
                      {portalWebUrl.replace('http://', '')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleOpenLink(portalWebUrl)}
                      className="flex-1 py-1.5 px-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir</span>
                    </button>
                    <button
                      onClick={() => copyToClipboard(portalWebUrl, 'link-web')}
                      className="p-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition cursor-pointer"
                      title="Copiar URL"
                    >
                      {copiedItem === 'link-web' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* 2. Console Felix / OSGi */}
                <div className="p-4 rounded-xl bg-card/60 border border-border hover:border-amber-500/50 transition-all space-y-3 flex flex-col justify-between shadow-xs">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground block">
                        Console Felix / OSGi
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold">
                        Bundles
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-muted-foreground truncate" title={consoleUrl}>
                      {consoleUrl.replace('http://', '')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleOpenLink(consoleUrl)}
                      className="flex-1 py-1.5 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir</span>
                    </button>
                    <button
                      onClick={() => copyToClipboard(consoleUrl, 'link-console')}
                      className="p-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition cursor-pointer"
                      title="Copiar URL"
                    >
                      {copiedItem === 'link-console' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* 3. Documentação Apache Karaf */}
                <div className="p-4 rounded-xl bg-card/60 border border-border hover:border-blue-500/50 transition-all space-y-3 flex flex-col justify-between shadow-xs">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground block">
                        Apache Karaf Docs
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-bold">
                        Manual
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-muted-foreground truncate">
                      karaf.apache.org/documentation
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleOpenLink('https://karaf.apache.org/documentation.html')}
                      className="w-full py-1.5 px-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Acessar Manual</span>
                    </button>
                  </div>
                </div>

                {/* 4. Portal Azure DevOps */}
                <div className="p-4 rounded-xl bg-card/60 border border-border hover:border-indigo-500/50 transition-all space-y-3 flex flex-col justify-between shadow-xs">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground block">
                        Azure DevOps
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold">
                        PRs &amp; Repos
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-muted-foreground truncate">
                      dev.azure.com
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleOpenLink('https://dev.azure.com')}
                      className="w-full py-1.5 px-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir Portal</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: GUIA DOS MÓDULOS */}
        {/* ========================================================================= */}
        {activeCategory === 'modules' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 1. Gestor de Ambiente & Automação */}
            <div className="cockpit-panel rounded-2xl p-5 border border-border space-y-3.5 shadow-md flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <Terminal className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-foreground">
                        1. Gestor de Ambiente &amp; Automação
                      </h3>
                      <span className="text-[10px] text-muted-foreground font-mono">Servidor OSGi Debug, Portas &amp; Serviços</span>
                    </div>
                  </div>
                  <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold">
                    Alt+1
                  </kbd>
                </div>

                <div className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
                  <p>
                    Automatiza o ciclo de preparação do computador para testes e depuração de ponta a ponta:
                  </p>
                  <ul className="space-y-1.5 pl-1">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Parada dos Serviços:</strong> Interrompe serviços em segundo plano do Windows para liberar portas de rede.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Encerramento de Travas:</strong> Finaliza processos presos que travam arquivos JAR ou portas TCP.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Inicialização da IDE:</strong> Abre automaticamente o IntelliJ IDEA, VS Code ou Cursor conforme configurado.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Servidor Debug:</strong> Inicia o Karaf em modo JDWP (<code className="font-mono text-primary">:{debugPort}</code>) com Console Integrado interativo ou Janela Externa.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {onNavigate && (
                <button
                  onClick={() => onNavigate('env')}
                  className="mt-3 w-full py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Abrir Módulo de Ambiente</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 2. Banco de Dados & Central de Backup */}
            <div className="cockpit-panel rounded-2xl p-5 border border-border space-y-3.5 shadow-md flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-foreground">
                        2. Banco de Dados &amp; Backups
                      </h3>
                      <span className="text-[10px] text-muted-foreground font-mono">Oracle · PostgreSQL · MySQL · CLI Custom</span>
                    </div>
                  </div>
                  <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold">
                    Alt+2
                  </kbd>
                </div>

                <div className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
                  <p>
                    Gerenciador de bancos multi-vendor com suporte a rotinas de exportação e restauração seguras:
                  </p>
                  <ul className="space-y-1.5 pl-1">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Modo Personalizado Oracle:</strong> Alternância entre <em>expdp padrão</em>, <em>expdp com VERSION=11.2</em> e <em>exp clássico</em> (sem depender de pasta remota).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Tokens Dinâmicos:</strong> Marcadores automáticos como <code className="font-mono text-primary">{'{filePath}'}</code>, <code className="font-mono text-primary">{'{user}'}</code>, <code className="font-mono text-primary">{'{connectString}'}</code>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Cron &amp; Retenção:</strong> Backups recorrentes automáticos com expurgo por idade ou limite de arquivos.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Restore Drill &amp; Webhooks:</strong> Teste de restauração em base temporária e avisos no Discord/Slack.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Statement Tracer &amp; Parâmetros (Binds):</strong> Rastreamento de queries Oracle (<code className="font-mono text-primary">v$session</code>/<code className="font-mono text-primary">v$sql</code>) com captura de valores de binds (<code className="font-mono text-primary">v$sql_bind_capture</code>), dispensando <code className="font-mono text-primary">log:set trace root</code> no Karaf e gerando SQL executável interpolado em 1 clique.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {onNavigate && (
                <button
                  onClick={() => onNavigate('database')}
                  className="mt-3 w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Abrir Módulo de Banco de Dados</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 3. Containers Docker */}
            <div className="cockpit-panel rounded-2xl p-5 border border-border space-y-3.5 shadow-md flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-blue-400/10 text-blue-400 border border-blue-400/20">
                      <Boxes className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-foreground">
                        3. Containers Docker
                      </h3>
                      <span className="text-[10px] text-muted-foreground font-mono">Gerenciador do Daemon Docker Local</span>
                    </div>
                  </div>
                  <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold">
                    Alt+3
                  </kbd>
                </div>

                <div className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
                  <p>
                    Controle intuitivo dos containers de apoio do seu ecossistema (bancos de dados, filas, caches):
                  </p>
                  <ul className="space-y-1.5 pl-1">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span><strong>Status em Tempo Real:</strong> Identifica containers ativos, portas expostas e consumo.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span><strong>Operações em 1 Clique:</strong> Iniciar, pausar, reiniciar e remover containers sem decorar comandos CLI.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span><strong>Streaming de Logs:</strong> Visualização contínua das saídas stdout/stderr de cada container.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {onNavigate && (
                <button
                  onClick={() => onNavigate('containers')}
                  className="mt-3 w-full py-2 bg-blue-400/10 hover:bg-blue-400/20 text-blue-400 border border-blue-400/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Abrir Módulo de Containers</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 4. Perfis de Deploy */}
            <div className="cockpit-panel rounded-2xl p-5 border border-border space-y-3.5 shadow-md flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-foreground">
                        4. Perfis de Deploy (Multi-Alvo)
                      </h3>
                      <span className="text-[10px] text-muted-foreground font-mono">Karaf OSGi · Docker · Comandos Maven</span>
                    </div>
                  </div>
                  <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold">
                    Alt+4
                  </kbd>
                </div>

                <div className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
                  <p>
                    Crie pipelines sequenciais de build e publicação com feedback visual instantâneo:
                  </p>
                  <ul className="space-y-1.5 pl-1">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>Karaf OSGi:</strong> Comandos <code className="font-mono text-primary">feature:repo-add</code> e <code className="font-mono text-primary">feature:install</code> sugeridos pelo <code className="font-mono text-primary">pom.xml</code>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>Proteção Prévia OSGi:</strong> Validação automática do status do Karaf (porta SSH 8101) antes de compilar ou instalar, prevenindo falsos sucessos e esperas desnecessárias com container offline.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>Docker Pipelines:</strong> Build de imagem, push para registry e restart do serviço em etapas separadas.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>Diagnóstico Inteligente de Dependências OSGi:</strong> Detecção e parsing automático de falhas <code className="font-mono text-primary">ResolutionException</code> / <code className="font-mono text-primary">missing requirement</code>, correlacionando o pacote ausente com o <code className="font-mono text-primary">pom.xml</code> e sugerindo card de ação com 1 clique para rodar o perfil da dependência ou instalar a release necessária.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>Diagnóstico Karaf:</strong> Listar bundles instalados (<code className="font-mono text-primary">bundle:list</code>) e logs (<code className="font-mono text-primary">log:display</code>).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>Monitor de Memória Heap da JVM (JMX):</strong> Telemetria contínua com gráfico de consumo de Heap e Non-Heap (Metaspace), alertas automáticos de risco de OutOfMemoryError (OOM) e botão de 1 clique para executar Garbage Collection (GC) na JVM.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>Gerenciador de Features Maven &amp; Repositórios:</strong> Interface interativa para listar repositórios (<code className="font-mono text-primary">feature:repo-list</code>), atualizar (<code className="font-mono text-primary">feature:repo-refresh</code>), cadastrar URLs Maven e instalar/desinstalar features OSGi do WinThor com 1 clique.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {onNavigate && (
                <button
                  onClick={() => onNavigate('deploy')}
                  className="mt-3 w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Abrir Módulo de Deploy</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 5. Git & Azure DevOps */}
            <div className="cockpit-panel rounded-2xl p-5 border border-border space-y-3.5 shadow-md flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <GitPullRequest className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-foreground">
                        5. Git &amp; Azure DevOps Hub
                      </h3>
                      <span className="text-[10px] text-muted-foreground font-mono">Gestão de Branches &amp; Pull Requests</span>
                    </div>
                  </div>
                  <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold">
                    Alt+5
                  </kbd>
                </div>

                <div className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
                  <p>
                    Hub centralizado para gerenciar múltiplos repositórios do seu workspace local:
                  </p>
                  <ul className="space-y-1.5 pl-1">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span><strong>Varredura Automática:</strong> Detecta branch atual, contagem de arquivos não commitados em cada projeto (incluindo worktrees e submódulos) e aviso de HEAD destacado.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span><strong>Visualizador de Diff &amp; Alterações Pendentes:</strong> Painel dedicado de arquivos modificados com status visual (M, A, D, ?, R), modal de diff com syntax highlighting e atalho "Abrir na IDE" em 1 clique para navegar direto ao arquivo no IntelliJ IDEA ou VS Code.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span><strong>Criação Integrada de Branch por Tarefa:</strong> Criação e checkout de branches padronizadas baseadas em itens de trabalho do Azure DevOps ou Jira (busca via API, importação por URL/texto, prefixos <code className="font-mono text-primary">feature/</code>, <code className="font-mono text-primary">bugfix/</code>, <code className="font-mono text-primary">hotfix/</code> e seleção de branch base).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span><strong>Ações Rápidas:</strong> Botões dedicados para <code className="font-mono text-primary">git fetch</code>, <code className="font-mono text-primary">pull</code>, <code className="font-mono text-primary">stash</code> e <code className="font-mono text-primary">pop</code>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span><strong>Branches Remotas:</strong> Branches que só existem no <code className="font-mono text-primary">origin</code> aparecem na lista; o checkout cria a branch local já rastreando a remota. O push de uma branch nova publica em <code className="font-mono text-primary">origin</code> e configura o upstream.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span><strong>Abertura de PR Direta:</strong> Abre a criação de Pull Request no Azure DevOps ou GitHub (ou Merge Request no GitLab) sem preenchimento manual.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {onNavigate && (
                <button
                  onClick={() => onNavigate('git')}
                  className="mt-3 w-full py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Abrir Git &amp; Azure DevOps</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 6. Catálogo de Rotinas */}
            <div className="cockpit-panel rounded-2xl p-5 border border-border space-y-3.5 shadow-md flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <Grid className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-foreground">
                        6. Catálogo de Rotinas WinThor
                      </h3>
                      <span className="text-[10px] text-muted-foreground font-mono">Executáveis Delphi .exe e .pc</span>
                    </div>
                  </div>
                  <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold">
                    Alt+6
                  </kbd>
                </div>

                <div className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
                  <p>
                    Acesso instantâneo aos executáveis compilados na sua máquina:
                  </p>
                  <ul className="space-y-1.5 pl-1">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span><strong>Busca Instantânea:</strong> Filtre rotinas por código numérico ou nome do executável.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span><strong>Filtro por Módulo:</strong> Agrupamento automático por subpastas do diretório configurado.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span><strong>Favoritos Persistidos:</strong> Fixe suas rotinas de trabalho com estrela (★) para acesso no topo.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span><strong>WinThor Start &amp; WTA:</strong> Abre rotinas já autenticadas pelo serviço local (<code className="font-mono text-primary">:9195</code>), com monitoramento de status do Karaf (WTA na porta <code className="font-mono text-primary">:8889</code>), alerta explícito de autenticação e fallback direto.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span><strong>Download e Atualização via CCW:</strong> Baixe rotinas oficiais diretamente da Central de Controle WinThor para a pasta <code className="font-mono text-primary">Prod</code> do módulo, com descompactação de ZIP automática.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span><strong>Gerenciador de Rollback (.bak):</strong> Histórico de versões anteriores com data, hora, tamanho e restauração em 1 clique com backup prévio de segurança (<code className="font-mono text-primary">_pre_rollback.bak</code>).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span><strong>Leitura de Versão do Executável (PE Header):</strong> Inspeção de metadados binários (<code className="font-mono text-primary">FileVersion</code> / <code className="font-mono text-primary">ProductVersion</code>) exibida diretamente nos cartões para validação instantânea de releases.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span><strong>Atualização em Lote (Batch Download):</strong> Atualize todas as rotinas favoritas ou módulos inteiros com um único clique e acompanhamento em tempo real.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span><strong>Instalação Local &amp; Árvore Oficial:</strong> Atualize a partir de arquivos <code className="font-mono text-primary">.exe</code> ou <code className="font-mono text-primary">.zip</code> baixados localmente ou explore a árvore de rotinas da CCW.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {onNavigate && (
                <button
                  onClick={() => onNavigate('routines')}
                  className="mt-3 w-full py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Abrir Catálogo de Rotinas</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 7. Documentação Semântica com IA / RAG */}
            <div className="cockpit-panel rounded-2xl p-5 border border-border space-y-3.5 shadow-md flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <FileSearch className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-foreground">
                        7. Documentação Semântica (RAG Local)
                      </h3>
                      <span className="text-[10px] text-muted-foreground font-mono">IA Local com Embeddings FastEmbed</span>
                    </div>
                  </div>
                  <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold">
                    Alt+7
                  </kbd>
                </div>

                <div className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
                  <p>
                    Indexação de manuais, diagnósticos técnicos e contratos de API com pesquisa por significado conceitual:
                  </p>
                  <ul className="space-y-1.5 pl-1">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                      <span><strong>Perguntas em Linguagem Natural:</strong> Encontre respostas mesmo sem saber o nome exato da função.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                      <span><strong>100% Offline e Seguro:</strong> Processamento de embeddings local, sem envio de código para nuvem.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {onNavigate && (
                <button
                  onClick={() => onNavigate('docs')}
                  className="mt-3 w-full py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Abrir Documentação Semântica</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 8. APM & Traces */}
            <div className="cockpit-panel rounded-2xl p-5 border border-border space-y-3.5 shadow-md flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-foreground">
                        8. APM &amp; Traces (OpenTelemetry)
                      </h3>
                      <span className="text-[10px] text-muted-foreground font-mono">Receptor OTLP/HTTP embutido · porta 4318</span>
                    </div>
                  </div>
                  <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold">
                    Alt+0
                  </kbd>
                </div>

                <div className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
                  <p>
                    Observabilidade local das suas APIs sem subir um OTel Collector ou SigNoz:
                  </p>
                  <ul className="space-y-1.5 pl-1">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span><strong>Dashboard &amp; Detecção de Gargalos:</strong> Vazão (RPS), percentis (p50/p95/p99), taxa de erros, ranking dos endpoints mais lentos e consultas SQL demoradas com filtros instantâneos em 1 clique.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span><strong>Waterfall com Régua Visual:</strong> Linha do tempo com régua graduada dividindo proporcionalmente o tempo total entre <em>Requisição HTTP</em>, <em>Processamento Java</em> e <em>Queries JDBC no banco</em>, tags de queries lentas e filtros por camada.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span><strong>Karaf Instrumentado:</strong> Com o <code className="font-mono text-primary">opentelemetry-javaagent.jar</code> em <code className="font-mono text-primary">&lt;karaf&gt;/bin</code>, o agente é anexado sozinho ao iniciar pelo Cockpit.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span><strong>Porta Configurável:</strong> Troque a porta em <em>Como Conectar</em> se outro coletor já ocupa a 4318.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {onNavigate && (
                <button
                  onClick={() => onNavigate('apm')}
                  className="mt-3 w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Abrir APM &amp; Traces</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 9. Servidor MCP */}
            <div className="cockpit-panel rounded-2xl p-5 border border-border space-y-3.5 shadow-md flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-foreground">
                        9. Servidor MCP (Automação por IA)
                      </h3>
                      <span className="text-[10px] text-muted-foreground font-mono">145 Tools via stdio · IntelliJ · VS Code · Claude</span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 font-mono font-bold">
                    145 TOOLS
                  </span>
                </div>

                <div className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
                  <p>
                    Permite que assistentes de IA (GitHub Copilot no IntelliJ IDEA e VS Code, Claude Code, JetBrains AI, Cline, Roo Code, Cursor e Antigravity) executem ações operacionais no seu computador sem passar pela interface gráfica:
                  </p>
                  <ul className="space-y-1.5 pl-1">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                      <span><strong>Clean Install &amp; Deploy Karaf:</strong> Peça à IA para rodar <code className="font-mono text-primary">mvn clean install</code>, instalar features OSGi no Karaf e confirmar se o bundle ficou no estado <strong className="text-emerald-500 font-semibold">Started (Ativo)</strong> com 1 único prompt.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                      <span><strong>Diagnóstico &amp; Fiação OSGi:</strong> Detecção de bundles parados, pacotes em conflito e dependências ausentes (<code className="font-mono text-primary">missing requirement</code>).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                      <span><strong>Telemetria JVM &amp; Repositórios:</strong> Inspeção de consumo Heap/Non-Heap, alertas de OOM, disparo de GC e gestão de repositórios Maven em 1 comando.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                      <span><strong>Ambiente &amp; Portas:</strong> Verificação de status, liberação de portas presas (<code className="font-mono text-primary">:8889</code>, <code className="font-mono text-primary">:8101</code>, <code className="font-mono text-primary">:5005</code>) e gerenciamento de serviços Windows.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                      <span><strong>Banco de Dados &amp; Binds:</strong> Execução de queries no Oracle/Postgres, Statement Tracer com captura e interpolação de binds e busca semântica em manuais locais.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                      <span><strong>Git, Tarefas &amp; Rotinas:</strong> Criação de branch padronizada vinculada a tarefas Azure DevOps/Jira, rollback de rotinas .bak e download CCW.</span>
                    </li>
                  </ul>

                  <div className="p-2.5 rounded-xl bg-card/80 border border-border space-y-1.5 shadow-inner">
                    <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Exemplo de Prompt no IntelliJ / VS Code Copilot:</span>
                    <p className="font-mono text-[11px] text-foreground bg-muted/80 p-2 rounded-lg border border-border/50">
                      "Faça o clean install (pulando testes) do projeto atual e instale a feature no Karaf. No final, confirme se ela ficou ativa."
                    </p>
                  </div>

                  <button
                    onClick={handleOpenMcpDocs}
                    className="w-full mt-2 py-2 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Ver Catálogo Completo das 145 Ferramentas MCP</span>
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between p-2 rounded-xl bg-muted/60 border border-border/60">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Terminal className="w-3.5 h-3.5 text-primary shrink-0" />
                  <code className="font-mono text-[11px] text-primary truncate">npm run mcp</code>
                </div>
                <button
                  onClick={() => copyToClipboard('npm run mcp', 'cmd-mcp-module')}
                  className="px-2.5 py-1 bg-card hover:bg-card/90 text-foreground border border-border rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {copiedItem === 'cmd-mcp-module' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar Comando</span>
                </button>
              </div>
            </div>

            {/* 10. Logs em Tempo Real & Analisador de Exceções */}
            <div className="cockpit-panel rounded-2xl p-5 border border-border space-y-3.5 shadow-md flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <ScrollText className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-foreground">
                        10. Logs em Tempo Real &amp; Log Analyzer
                      </h3>
                      <span className="text-[10px] text-muted-foreground font-mono">Tail -f · Diagnóstico ORA / NPE / OSGi</span>
                    </div>
                  </div>
                  <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold">
                    Alt+8
                  </kbd>
                </div>

                <div className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
                  <p>
                    Monitoramento contínuo em tempo real (tail -f) de arquivos de log do Karaf e serviços locais:
                  </p>
                  <ul className="space-y-1.5 pl-1">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span><strong>Log Analyzer WinThor:</strong> Classificação instantânea de falhas críticas (ORA-XXXXX, NullPointerException, BundleException, OutOfMemoryError).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span><strong>Comandos Sugeridos:</strong> Diagnósticos recomendados e queries SQL prontas para copiar com 1 clique.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span><strong>Navegação Rápida:</strong> Pílulas interativas com o código da falha e salto direto para a linha afetada no console.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {onNavigate && (
                <button
                  onClick={() => onNavigate('logs')}
                  className="mt-3 w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Abrir Logs em Tempo Real</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ATALHOS & DICAS PRO */}
        {/* ========================================================================= */}
        {activeCategory === 'shortcuts' && (
          <div className="space-y-4">
            {/* Tabela de Atalhos de Teclado Globais */}
            <div className="cockpit-panel rounded-2xl p-5 border border-border shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-foreground">
                    Atalhos de Teclado Globais
                  </h3>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  Navegação instantânea sem tirar as mãos do teclado
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {keyboardShortcuts.map((sc, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-card/60 border border-border flex items-center justify-between hover:border-primary/40 transition-colors shadow-xs"
                  >
                    <div className="space-y-0.5 min-w-0 pr-3">
                      <span className="text-xs font-bold text-foreground block truncate">{sc.desc}</span>
                      <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                        {sc.category}
                      </span>
                    </div>
                    <kbd className="px-2.5 py-1 rounded-lg bg-muted border border-border font-mono text-xs font-bold text-primary shrink-0 shadow-sm">
                      {sc.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>

            {/* Dicas Pro para Desenvolvedores */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Dica 1: Debug IntelliJ */}
              <div className="cockpit-panel rounded-2xl p-5 border border-border shadow-md space-y-3">
                <div className="flex items-center space-x-2 text-primary font-bold text-xs uppercase tracking-wider">
                  <Code2 className="w-4 h-4" />
                  <span>Dica Pro: Depuração JVM Remota no IntelliJ IDEA</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Para depurar código Java dos serviços sem reiniciar o Karaf, crie uma configuração <strong className="text-foreground">Remote JVM Debug</strong> no IntelliJ apontando para <code className="font-mono text-primary font-semibold">localhost:{debugPort}</code>. Coloque breakpoints nos seus bundles e a IDE pausará a execução em tempo real!
                </p>
                <div className="p-2.5 rounded-xl bg-muted/60 border border-border font-mono text-[11px] text-foreground flex items-center justify-between">
                  <span>Host: localhost • Port: {debugPort}</span>
                  <span className="text-[10px] text-muted-foreground font-sans">JDWP Socket</span>
                </div>
              </div>

              {/* Dica 2: Karaf Shell */}
              <div className="cockpit-panel rounded-2xl p-5 border border-border shadow-md space-y-3">
                <div className="flex items-center space-x-2 text-amber-500 font-bold text-xs uppercase tracking-wider">
                  <Terminal className="w-4 h-4" />
                  <span>Dica Pro: Comandos Rápidos do Apache Karaf</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No terminal integrado ou via SSH (<code className="font-mono text-primary">localhost:{sshPort}</code>), use <code className="font-mono text-primary font-semibold">bundle:list -s</code> para inspecionar o status dos JARs OSGi, <code className="font-mono text-primary font-semibold">log:tail</code> para acompanhar logs e <code className="font-mono text-primary font-semibold">bundle:restart &lt;ID&gt;</code> para recarregar um bundle em 2 segundos.
                </p>
                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/60 border border-border font-mono text-[11px]">
                  <code className="text-primary font-bold">bundle:list -s</code>
                  <button
                    onClick={() => copyToClipboard('bundle:list -s', 'cmd-karaf-bl')}
                    className="p-1 hover:text-foreground text-muted-foreground transition cursor-pointer"
                    title="Copiar comando"
                  >
                    {copiedItem === 'cmd-karaf-bl' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Dica 3: Automação por IA via MCP */}
              <div className="cockpit-panel rounded-2xl p-5 border border-border shadow-md space-y-3">
                <div className="flex items-center space-x-2 text-violet-400 font-bold text-xs uppercase tracking-wider">
                  <Bot className="w-4 h-4" />
                  <span>Dica Pro: Automação por IA no IntelliJ &amp; VS Code (Copilot / MCP)</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Conecte o servidor MCP do Dev Manager ao seu GitHub Copilot no IntelliJ IDEA ou VS Code. Basta pedir em linguagem natural: <strong className="text-foreground">"Faça o clean install do projeto atual e instale a feature no Karaf"</strong>. A IA compila via Maven, aciona os comandos Karaf e verifica se o bundle ficou ativo automaticamente!
                </p>
                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/60 border border-border font-mono text-[11px]">
                  <code className="text-primary truncate" title="Faça o clean install (pulando testes) do projeto atual e instale a feature no Karaf. No final, confirme se ela ficou ativa.">Faça o clean install... e instale a feature</code>
                  <button
                    onClick={() => copyToClipboard('Faça o clean install (pulando testes) do projeto atual e instale a feature no Karaf. No final, confirme se ela ficou ativa.', 'tip-mcp-prompt')}
                    className="p-1 hover:text-foreground text-muted-foreground transition cursor-pointer shrink-0 ml-2"
                    title="Copiar prompt completo"
                  >
                    {copiedItem === 'tip-mcp-prompt' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: FAQ & RESOLUÇÃO DE DÚVIDAS */}
        {/* ========================================================================= */}
        {activeCategory === 'faq' && (
          <div className="space-y-4">
            {/* Filtros por Categoria do FAQ */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-none">
              {faqCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFaqCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 border cursor-pointer ${
                    faqCategoryFilter === cat
                      ? 'bg-primary/15 text-primary border-primary/30 font-bold'
                      : 'bg-card/50 text-muted-foreground border-border hover:text-foreground hover:bg-card'
                  }`}
                >
                  {cat === 'all' ? 'Todas as Perguntas' : cat}
                </button>
              ))}
            </div>

            {/* Lista Accordion */}
            <div className="space-y-3">
              {filteredFaqs.length === 0 ? (
                <div className="cockpit-panel rounded-2xl p-8 text-center border border-border space-y-2">
                  <LifeBuoy className="w-8 h-8 text-muted-foreground mx-auto" />
                  <h4 className="text-xs font-bold text-foreground">Nenhuma pergunta encontrada</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Nenhum tópico correspondeu aos filtros atuais. Tente pesquisar por termos como "porta", "uac", "karaf", "mcp" ou "git".
                  </p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-2 px-3 py-1 bg-primary text-primary-foreground rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Limpar Termo de Busca
                    </button>
                  )}
                </div>
              ) : (
                filteredFaqs.map((faq) => {
                  const isExpanded = expandedFaqs[faq.id] ?? true;
                  return (
                    <div
                      key={faq.id}
                      className="cockpit-panel rounded-2xl border border-border overflow-hidden transition-all shadow-md"
                    >
                      <button
                        onClick={() => toggleFaq(faq.id)}
                        className="w-full p-4 text-left flex items-start justify-between gap-3 hover:bg-card/70 transition-colors cursor-pointer"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                              {faq.category}
                            </span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5 pt-0.5">
                            {faq.question}
                          </h4>
                        </div>
                        <div className="p-1.5 rounded-lg bg-muted text-muted-foreground shrink-0 mt-0.5">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-border/60 bg-card/40">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: SOBRE & DIAGNÓSTICO DO SISTEMA */}
        {/* ========================================================================= */}
        {activeCategory === 'about' && (
          <div className="space-y-4">
            {/* Informações da Aplicação & Banner */}
            <div className="cockpit-panel rounded-2xl p-5 sm:p-6 border border-border space-y-4 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  <AppLogo size="md" />
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-foreground flex items-center gap-2">
                      Dev <span className="text-primary font-bold">Manager</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-bold border border-primary/30">
                        v{appInfo?.appVersion || '1.22.0'}
                      </span>
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Cockpit Integrado de Automação e Produtividade para Desenvolvedores
                    </p>
                    <p className="text-[10px] text-muted-foreground/80 font-mono mt-0.5">
                      Desenvolvido por <strong>Wanderson Alves</strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleCopyDiagnostic}
                  className="px-3.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer shrink-0"
                  title="Copiar relatório completo de diagnóstico para a área de transferência"
                >
                  {copiedDiag ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Diagnóstico Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Diagnóstico do Sistema</span>
                    </>
                  )}
                </button>
              </div>

              {/* Tabela de Diagnóstico Técnico da Máquina */}
              <div className="pt-3 border-t border-border space-y-3">
                <div className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-primary" />
                  <span>Diagnóstico do Ambiente de Execução</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {/* UAC / Permissão */}
                  <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-1.5 shadow-xs">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                      Elevação UAC (Windows):
                    </span>
                    <div className="flex items-center space-x-1.5 font-bold">
                      {appInfo?.isAdmin ? (
                        <>
                          <ShieldCheck className="w-4 h-4 text-emerald-500" />
                          <span className="text-emerald-500">Modo Administrador (Ativo)</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-4 h-4 text-amber-500" />
                          <span className="text-amber-500">Usuário Padrão (Sem Elevação)</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Sistema Operacional */}
                  <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-1.5 shadow-xs">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                      Sistema Operacional:
                    </span>
                    <div className="flex items-center space-x-1.5 font-mono text-foreground font-semibold truncate">
                      <Monitor className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="truncate">
                        {appInfo ? `Windows (${appInfo.osRelease} ${appInfo.osArch})` : 'Carregando...'}
                      </span>
                    </div>
                  </div>

                  {/* Memória RAM */}
                  <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-1.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                        Memória RAM do Sistema:
                      </span>
                      <span className="text-[10px] font-mono text-primary font-bold">
                        {memoryUsagePercent}% em uso
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5 font-mono text-foreground font-semibold">
                      <HardDrive className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-[11px]">
                        {appInfo
                          ? `${appInfo.freeMemoryMb} MB livres de ${appInfo.totalMemoryMb} MB`
                          : 'Carregando...'}
                      </span>
                    </div>
                    {/* Barra de Progresso de Memória */}
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${memoryUsagePercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Versão Electron & Chromium */}
                  <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-1.5 shadow-xs">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                      Runtimes Desktop:
                    </span>
                    <div className="font-mono text-foreground text-[11px] truncate">
                      Electron <strong className="text-primary">v{appInfo?.electronVersion}</strong> • Chrome{' '}
                      <strong>v{appInfo?.chromeVersion}</strong>
                    </div>
                  </div>

                  {/* Versão Node & V8 */}
                  <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-1.5 shadow-xs">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                      Motor JavaScript:
                    </span>
                    <div className="font-mono text-foreground text-[11px] truncate">
                      Node.js <strong className="text-emerald-500">v{appInfo?.nodeVersion}</strong> • V8{' '}
                      <strong>v{appInfo?.v8Version}</strong>
                    </div>
                  </div>

                  {/* Hostname */}
                  <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-1.5 shadow-xs">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                      Nome da Máquina (Host):
                    </span>
                    <div className="font-mono text-foreground text-[11px] truncate flex items-center gap-1.5">
                      <Laptop className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{appInfo?.osHostname || 'Localhost'}</span>
                    </div>
                  </div>

                  {/* Versão do App & Atualizações */}
                  {Boolean(window.electronAPI?.onUpdateStatus) && (
                    <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-1.5 shadow-xs">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                        Versão do Aplicativo:
                      </span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-foreground text-[11px]">
                          v{appInfo?.appVersion || '...'}
                          {updateStatus?.status === 'available' && (
                            <span className="ml-1.5 text-emerald-500 font-bold">→ v{updateStatus.version}</span>
                          )}
                        </span>
                        {updateStatus?.status === 'downloaded' ? (
                          <button
                            onClick={() => window.electronAPI?.installUpdate?.()}
                            className="flex items-center gap-1 px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                          >
                            <Download className="w-3 h-3" /> Instalar e Reiniciar
                          </button>
                        ) : updateStatus?.status === 'available' ? (
                          <button
                            onClick={() => window.electronAPI?.downloadUpdate?.()}
                            className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded-lg text-[10px] font-bold transition cursor-pointer"
                          >
                            <Download className="w-3 h-3" /> Baixar
                          </button>
                        ) : (
                          <button
                            onClick={handleCheckForUpdates}
                            disabled={updateStatus?.status === 'checking' || updateStatus?.status === 'downloading'}
                            className="flex items-center gap-1 px-2.5 py-1 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-[10px] font-bold transition disabled:opacity-50 cursor-pointer"
                          >
                            <RefreshCw className={`w-3 h-3 ${updateStatus?.status === 'checking' ? 'animate-spin' : ''}`} />
                            Verificar
                          </button>
                        )}
                      </div>
                      {updateStatus?.status === 'downloading' && (
                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${Math.round(updateStatus.percent)}%` }}
                          />
                        </div>
                      )}
                      {updateStatus?.status === 'not-available' && (
                        <p className="text-[10px] text-muted-foreground">Você já está na versão mais recente.</p>
                      )}
                      {updateStatus?.status === 'error' && (
                        <p className="text-[10px] text-rose-500 truncate" title={updateStatus.message}>
                          Falha ao verificar: {updateStatus.message}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Notas de Versão / Changelog */}
                  <div className="p-3.5 rounded-xl bg-card/60 border border-border flex items-center justify-between gap-2 shadow-xs">
                    <div className="min-w-0">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                        Notas de Versão
                      </span>
                      <span className="text-[11px] text-foreground truncate block">Histórico de mudanças e melhorias</span>
                    </div>
                    <button
                      onClick={handleOpenChangelog}
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-[10px] font-bold transition cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" /> Ver Changelog
                    </button>
                  </div>
                </div>

                {/* Caminho do Config JSON */}
                {appInfo?.configPath && (
                  <div className="mt-3 p-3.5 rounded-xl bg-muted/60 border border-border flex items-center justify-between gap-2 shadow-inner">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Arquivo de Configurações Persistidas do Dev Manager:
                      </span>
                      <span className="text-[11px] font-mono text-foreground truncate block">
                        {appInfo.configPath}
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(appInfo.configPath, 'configPath')}
                      className="p-1.5 rounded-lg bg-card hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
                      title="Copiar caminho completo"
                    >
                      {copiedItem === 'configPath' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Geração e Distribuição do Executável (.exe) */}
            <div className="cockpit-panel rounded-2xl p-5 sm:p-6 border border-border space-y-3.5 shadow-md">
              <div className="flex items-center justify-between pb-2 border-b border-border flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-foreground">
                      Empacotamento &amp; Geração de Executável (.exe)
                    </h3>
                    <span className="text-[10px] text-muted-foreground font-mono">Electron Builder • Windows Release</span>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard('npm run build:electron', 'btn-copy-build')}
                  className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer"
                  title="Copiar comando de build"
                >
                  {copiedItem === 'btn-copy-build' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Comando Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Comando de Build</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-xs text-muted-foreground space-y-3 leading-relaxed">
                <p>
                  Para distribuir o <strong className="text-foreground">Dev Manager</strong> para outros desenvolvedores ou computadores em formato executável Windows sem necessidade de Node.js instalado:
                </p>

                <div className="p-3 rounded-xl bg-card/80 border border-border font-mono text-xs text-primary flex items-center justify-between shadow-inner">
                  <span>npm run build:electron</span>
                  <span className="text-[10px] text-muted-foreground font-sans">PowerShell / CMD</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-1 shadow-xs">
                    <span className="font-bold text-foreground block text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Dev Manager {appInfo?.appVersion || '1.22.0'}.exe (Portátil)
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Versão autônoma que não necessita instalação. Pode ser executada diretamente de pastas de rede ou pendrives.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-1 shadow-xs">
                    <span className="font-bold text-foreground block text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      Dev Manager Setup {appInfo?.appVersion || '1.22.0'}.exe (Instalador)
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Instalador padrão NSIS que cria atalhos no Menu Iniciar e Área de Trabalho com desinstalador integrado.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-600 dark:text-emerald-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>Ambos os executáveis solicitam elevação de Administrador (UAC) automaticamente ao abrir.</span>
                </div>
              </div>
            </div>

            {/* Tecnologias Utilizadas */}
            <div className="cockpit-panel rounded-2xl p-5 border border-border space-y-3 shadow-md">
              <div className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-primary" />
                <span>Stack Tecnológica do Painel</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-mono">
                <span className="px-2.5 py-1 rounded-lg bg-card border border-border text-foreground font-semibold">
                  Electron 29
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-card border border-border text-cyan-400 font-semibold">
                  React 18 + TypeScript 5
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-card border border-border text-blue-400 font-semibold">
                  Tailwind CSS 3
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-card border border-border text-amber-400 font-semibold">
                  Vite 5
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-card border border-border text-primary font-semibold">
                  Lucide Icons
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-card border border-border text-purple-400 font-semibold">
                  Apache Karaf OSGi
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-card border border-border text-emerald-400 font-semibold">
                  Git &amp; Azure DevOps REST
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-card border border-border text-violet-400 font-semibold">
                  Model Context Protocol (MCP)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {isChangelogOpen && (
        <MarkdownReader
          title="Changelog"
          filePath="CHANGELOG.md"
          content={changelogContent}
          isLoading={isLoadingChangelog}
          onClose={() => setIsChangelogOpen(false)}
        />
      )}

      {isMcpDocsOpen && (
        <MarkdownReader
          title="Catálogo de Ferramentas MCP"
          filePath="docs/MCP_TOOLS.md"
          content={mcpDocsContent}
          isLoading={isLoadingMcpDocs}
          onClose={() => setIsMcpDocsOpen(false)}
        />
      )}
    </div>
  );
};

export default HelpPage;
