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
  HelpCircle
} from 'lucide-react';
import { SystemAppInfo, UpdateStatus, getWebPort, getKarafSshPort, getWebUrl } from '../../../shared/types';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { MarkdownReader } from '../components/MarkdownReader';
import { AppLogo } from '../components/AppLogo';
import { getMissingRequiredPaths } from '../utils/environmentPageUtils';

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
    setIsLoadingChangelog(true);
    setChangelogContent('');
    try {
      const content = await window.electronAPI?.getChangelog?.();
      setChangelogContent(content || 'Nenhum registro de mudanças encontrado.');
    } catch (err: any) {
      setChangelogContent(`Erro ao carregar o changelog: ${err?.message || err}`);
    } finally {
      setIsLoadingChangelog(false);
    }
  };

  const handleOpenMcpDocs = async () => {
    setIsMcpDocsOpen(true);
    setIsLoadingMcpDocs(true);
    setMcpDocsContent('');
    try {
      const content = await window.electronAPI?.getMcpDocs?.();
      setMcpDocsContent(content || 'Nenhuma documentação encontrada.');
    } catch (err: any) {
      setMcpDocsContent(`Erro ao carregar a documentação: ${err?.message || err}`);
    } finally {
      setIsLoadingMcpDocs(false);
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
            <span className="font-bold text-foreground block pt-1 text-[11px] uppercase tracking-wider text-primary">Arquivos gerados:</span>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong className="text-foreground">Dev Manager {appInfo?.appVersion || '1.14.0'}.exe (Portátil):</strong> Não precisa instalar. Basta clicar duas vezes e usar. Ideal para rodar de pendrives ou pastas de rede.
              </li>
              <li>
                <strong className="text-foreground">Dev Manager Setup {appInfo?.appVersion || '1.14.0'}.exe (Instalador):</strong> Instalador assistido (NSIS) que cria atalhos no Desktop e Menu Iniciar.
              </li>
            </ul>
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
      question: 'O que é o servidor MCP e como uso o Dev Manager a partir de um assistente de IA (Claude Code)?',
      category: 'Integração & MCP',
      tags: ['mcp', 'claude', 'ia', 'agente', 'automação', 'model context protocol', 'stdio'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            O Dev Manager inclui um servidor <strong className="text-foreground">MCP (Model Context Protocol)</strong> que expõe as mesmas automações do Cockpit como <strong className="text-foreground">73 tools</strong> que um assistente de IA (Claude Code, Antigravity, Copilot, etc.) pode chamar diretamente — sem passar pela interface gráfica.
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-3 shadow-sm">
            <div>
              <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary mb-1">Catálogo de Ferramentas:</span>
              <p className="mb-2">
                As ferramentas permitem executar desde o start do ambiente até comandos Karaf complexos e análise de queries no banco.
              </p>
              <button
                onClick={handleOpenMcpDocs}
                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-2 w-fit cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Ver Catálogo e Exemplos de Prompts</span>
              </button>
            </div>
            
            <div className="pt-2 border-t border-border/50">
              <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Ativar no Claude Code:</span>
              <p className="mb-2">
                O arquivo <code className="font-mono text-primary font-semibold">.mcp.json</code> na raiz do projeto já registra o servidor. Basta abrir esta pasta no Claude Code e rodar <code className="font-mono text-primary">/mcp</code> para conectar.
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
    { key: 'Alt + 8', desc: 'Acessar "Configurações" (Diretórios, IDEs e Portas TCP)', category: 'Navegação' },
    { key: 'Alt + 9', desc: 'Acessar esta Central de Ajuda & Launchpad do Sistema', category: 'Navegação' },
    { key: 'Ctrl + K', desc: 'Abrir o Quick Launcher (Busca Rápida de Ações & Projetos)', category: 'Navegação' },
    { key: 'Ctrl + Enter', desc: 'Executar consulta SQL selecionada no Database Studio', category: 'Banco de Dados' },
    { key: 'Shift + F9', desc: `Depuração Remota JVM no IntelliJ IDEA (Porta :${debugPort})`, category: 'Desenvolvimento' },
    { key: 'Enter', desc: 'Enviar comando no Terminal Integrado do Shell Karaf', category: 'Terminal' }
  ];

  const categories = [
    { id: 'overview', label: 'Visão Geral & Início', icon: Rocket, badge: 'Launchpad' },
    { id: 'modules', label: 'Guia dos Módulos', icon: BookOpen, badge: '8 Módulos' },
    { id: 'shortcuts', label: 'Atalhos & Dicas Pro', icon: Zap, badge: 'Produtividade' },
    { id: 'faq', label: 'FAQ & Resolução de Dúvidas', icon: LifeBuoy, badge: `${faqList.length}` },
    { id: 'about', label: 'Sobre & Diagnóstico', icon: Info, badge: `v${appInfo?.appVersion || '1.14.0'}` }
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
                      Dev Manager • v{appInfo?.appVersion || '1.14.0'}
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
                      Localização instantânea de executáveis Delphi (.exe e .pc) por código ou nome, com favoritos salvos para abertura rápida.
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1 font-mono text-[9px] text-muted-foreground">
                      <span className="px-1.5 py-0.5 rounded bg-muted/70">Delphi .exe</span>
                      <span className="px-1.5 py-0.5 rounded bg-muted/70">Favoritos</span>
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
                  Atalhos globais de acesso direto (Alt + 1..8)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                      Busca rápida por código de executáveis Delphi (.exe e .pc).
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

                {/* 8. Configurações */}
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
                  <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground font-bold shrink-0">
                    Alt+8
                  </kbd>
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
                      <span><strong>Docker Pipelines:</strong> Build de imagem, push para registry e restart do serviço em etapas separadas.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>Diagnóstico Karaf:</strong> Listar bundles instalados (<code className="font-mono text-primary">bundle:list</code>) e logs (<code className="font-mono text-primary">log:display</code>).</span>
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
                      <span><strong>Varredura Automática:</strong> Detecta branch atual e status de arquivos modificados em cada projeto.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span><strong>Ações Rápidas:</strong> Botões dedicados para <code className="font-mono text-primary">git fetch</code>, <code className="font-mono text-primary">pull</code>, <code className="font-mono text-primary">stash</code> e <code className="font-mono text-primary">pop</code>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span><strong>Abertura de PR Direta:</strong> Abre a página de criação de Pull Request no Azure DevOps sem preenchimento manual.</span>
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

            {/* 8. Servidor MCP */}
            <div className="cockpit-panel rounded-2xl p-5 border border-border space-y-3.5 shadow-md flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-foreground">
                        8. Servidor MCP (Automação por IA)
                      </h3>
                      <span className="text-[10px] text-muted-foreground font-mono">73 Tools expostas via stdio para IAs</span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 font-mono font-bold">
                    MCP STDIO
                  </span>
                </div>

                <div className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
                  <p>
                    Permite que agentes de IA controlem seu ambiente, rodem builds, verifiquem portas e pesquisem docs:
                  </p>
                  <ul className="space-y-1.5 pl-1">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                      <span><strong>73 Tools Especializadas:</strong> Controle de serviços Windows, Karaf, Docker, Git, Banco, Deploy, e RAG.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                      <span><strong>Catálogo de Ferramentas:</strong> Documentação completa e dicas de prompts para a IA.</span>
                    </li>
                  </ul>
                  <button
                    onClick={handleOpenMcpDocs}
                    className="w-full mt-2 py-2 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Ver Catálogo de Ferramentas MCP</span>
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between p-2 rounded-xl bg-muted/60 border border-border/60">
                <code className="font-mono text-[11px] text-primary">npm run mcp</code>
                <button
                  onClick={() => copyToClipboard('npm run mcp', 'cmd-mcp-module')}
                  className="px-2.5 py-1 bg-card hover:bg-card/90 text-foreground border border-border rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  {copiedItem === 'cmd-mcp-module' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar Comando</span>
                </button>
              </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        v{appInfo?.appVersion || '1.14.0'}
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
                  {window.electronAPI?.onUpdateStatus && (
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
                      Dev Manager {appInfo?.appVersion || '1.14.0'}.exe (Portátil)
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Versão autônoma que não necessita instalação. Pode ser executada diretamente de pastas de rede ou pendrives.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-1 shadow-xs">
                    <span className="font-bold text-foreground block text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      Dev Manager Setup {appInfo?.appVersion || '1.14.0'}.exe (Instalador)
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
