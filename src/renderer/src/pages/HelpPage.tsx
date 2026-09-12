import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
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
  Bot
} from 'lucide-react';
import { SystemAppInfo, getWebPort, getKarafSshPort, getWebUrl } from '../../../shared/types';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

interface HelpPageProps {
  onNavigate?: (tab: string) => void;
  /** Termo de busca vindo de um hint contextual de outra tela (ex: "?" ao lado das portas monitoradas) */
  initialSearch?: string;
}

type HelpCategory = 'overview' | 'modules' | 'shortcuts' | 'faq' | 'about';

interface FaqItem {
  id: string;
  question: string;
  category: string;
  answer: React.ReactNode;
  tags: string[];
}

export const HelpPage: React.FC<HelpPageProps> = ({ onNavigate, initialSearch }) => {
  const [activeCategory, setActiveCategory] = useState<HelpCategory>(initialSearch ? 'faq' : 'overview');
  const [searchQuery, setSearchQuery] = useState(initialSearch || '');
  const [expandedFaqs, setExpandedFaqs] = useState<Record<string, boolean>>({});
  const [appInfo, setAppInfo] = useState<SystemAppInfo | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const { copy: copyDiag, copiedKey: copiedDiagKey } = useCopyToClipboard(2500);
  const copiedDiag = copiedDiagKey === 'diag';
  const { copy: copyToClipboard, copiedKey: copiedItem } = useCopyToClipboard(2000);

  useEffect(() => {
    if (window.electronAPI) {
      if (window.electronAPI.getAppInfo) {
        window.electronAPI.getAppInfo().then((info) => setAppInfo(info));
      }
      if (window.electronAPI.getSettings) {
        window.electronAPI.getSettings().then((st) => setSettings(st));
      }
    }
  }, []);

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

  const faqList: FaqItem[] = [
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
          <div className="p-2.5 rounded-lg bg-card/70 border border-border space-y-1">
            <span className="font-bold text-foreground block">Como resolver:</span>
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
            O script de inicialização do servidor ativa automaticamente o modo de depuração remota Java na porta <strong className="text-foreground font-mono">:{debugPort}</strong> via JDWP (<code className="font-mono text-primary">transport=dt_socket,server=y,suspend=n,address={debugPort}</code>).
          </p>
          <div className="p-2.5 rounded-lg bg-card/70 border border-border space-y-1.5">
            <span className="font-bold text-foreground block">Passo a passo no IntelliJ:</span>
            <ol className="list-decimal pl-4 space-y-1">
              <li>No IntelliJ, vá no menu superior em <strong className="text-foreground">Run &gt; Edit Configurations...</strong></li>
              <li>Clique no botão <strong className="text-foreground">+</strong> e adicione uma configuração do tipo <strong className="text-foreground">Remote JVM Debug</strong>.</li>
              <li>Defina o Host como <code className="font-mono text-primary font-semibold">localhost</code> e a Porta como <code className="font-mono text-primary font-semibold">{debugPort}</code>.</li>
              <li>Clique em <strong className="text-foreground">Apply</strong> e inicie o Debug (<kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono">Shift+F9</kbd>). Seus breakpoints nos bundles Maven serão acionados instantaneamente!</li>
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
          <div className="p-2.5 rounded-lg bg-card/70 border border-border space-y-1.5">
            <span className="font-bold text-foreground block">Solução:</span>
            <p>
              Verifique se o arquivo <code className="font-mono text-primary">bin\client.bat</code> existe dentro da pasta configurada para o Apache Karaf.
            </p>
            {onNavigate && (
              <button
                onClick={() => onNavigate('settings')}
                className="mt-1 px-3 py-1 bg-primary text-primary-foreground font-semibold rounded-lg text-[11px] flex items-center gap-1.5 hover:opacity-90 transition-opacity"
              >
                <Settings className="w-3 h-3" />
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
            Quando uma porta está com indicador verde ativo, significa que um processo no Windows (como o Portal Web, Karaf SSH, Tomcat, Java ou serviço local) está escutando naquela porta.
          </p>
          <div className="p-2.5 rounded-lg bg-card/70 border border-border space-y-1.5">
            <span className="font-bold text-foreground block">Portas 100% Customizáveis:</span>
            <p>
              Você pode alterar a porta do Portal Web Local (ex: <code className="font-mono text-primary font-bold">{webPort}</code>), a porta SSH do Karaf e adicionar ou remover qualquer porta TCP na aba <strong className="text-foreground">Configurações &gt; Portas de Rede Monitoradas</strong>.
            </p>
            <span className="font-bold text-foreground block pt-1">Como liberar em 1 clique:</span>
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
            O Dev Manager inspeciona o arquivo de configuração do Git (<code className="font-mono text-primary">.git/config</code>) de cada repositório, identifica a URL do Azure DevOps (organização, projeto e repositório) e a branch em que você está trabalhando no momento.
          </p>
          <div className="p-2.5 rounded-lg bg-card/70 border border-border space-y-1.5">
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
            As rotinas marcadas são exibidas no topo do painel na seção "Rotinas Favoritas" para acesso instantâneo. A lista é persistida automaticamente no seu perfil de usuário.
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
          <div className="p-2.5 rounded-lg bg-card/70 border border-border space-y-2">
            <span className="font-bold text-foreground block">Comando para compilar e gerar na pasta release/:</span>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted font-mono text-[11px] text-primary border border-border/60">
              <code>npm run build:electron</code>
              <button
                onClick={() => copyToClipboard('npm run build:electron', 'cmd-build-faq')}
                className="p-1 hover:text-foreground transition-colors"
                title="Copiar comando"
              >
                {copiedItem === 'cmd-build-faq' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <span className="font-bold text-foreground block pt-1">Arquivos gerados:</span>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong className="text-foreground">Dev Manager 1.0.0.exe (Portátil):</strong> Não precisa instalar. Basta clicar duas vezes e usar. Ideal para rodar de pendrives ou pastas de rede.
              </li>
              <li>
                <strong className="text-foreground">Dev Manager Setup 1.0.0.exe (Instalador):</strong> Instalador assistido (NSIS) que cria atalhos no Desktop e Menu Iniciar.
              </li>
            </ul>
            <span className="font-bold text-foreground block pt-1">Privilégios de Administrador (UAC):</span>
            <p>
              O app abre sem elevação (<code className="font-mono text-primary">asInvoker</code>), compatível com usuários sem admin local em máquinas corporativas. Ações que dependem de privilégio elevado (parar/iniciar serviços Windows, liberar portas) podem falhar silenciosamente em modo padrão — o app sinaliza o status de admin na tela e recomenda "Executar como administrador" quando necessário.
            </p>
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
          <div className="p-2.5 rounded-lg bg-card/70 border border-border space-y-1.5">
            <span className="font-bold text-foreground block">Por que Vetorizar? (Busca Semântica vs. Ctrl+F tradicional):</span>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong className="text-foreground">Busca comum (Ctrl+F):</strong> Faz correspondência cega de caracteres. Se você buscar por <em>"estoque"</em> e o documento falar em <em>"saldo de mercadoria"</em>, o Ctrl+F não acha nada.
              </li>
              <li>
                <strong className="text-foreground">Busca Vetorizada (Embeddings / RAG):</strong> O modelo de IA local (<code className="font-mono text-primary">FastEmbed AllMiniLML6V2</code>) converte cada trecho em um vetor matemático de 384 números que representa o seu <strong>significado conceitual</strong>. Frases com temas semelhantes ficam com números próximos.
              </li>
              <li>
                <strong className="text-foreground">Perguntas em linguagem natural:</strong> Ao buscar <em>"como consultar saldo disponível na filial?"</em>, o sistema calcula a similaridade matemática e traz os trechos exatos de contratos de API e rotinas correspondentes, mesmo com palavras diferentes.
              </li>
            </ul>
          </div>
          <div className="p-2.5 rounded-lg bg-card/70 border border-border space-y-1.5">
            <span className="font-bold text-foreground block">Controle Total de Fontes:</span>
            <p>
              Você pode desativar a varredura de projetos Git com um toggle na tela para focar apenas nas suas pastas centrais de documentação (como <code className="font-mono text-primary">prompt-hub/docs</code>), tornando a indexação rápida e precisa.
            </p>
            <span className="font-bold text-foreground block pt-1">Uso por Assistentes de IA (MCP):</span>
            <p>
              O servidor MCP do Dev Manager expõe as tools <code className="font-mono text-primary">rag_search_docs</code> e <code className="font-mono text-primary">rag_reindex_docs</code>, permitindo que agentes de IA (Claude Code, Cursor, Copilot) consultem essa base de conhecimento local em milissegundos enquanto programam para você.
            </p>
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
            O Dev Manager inclui um servidor <strong className="text-foreground">MCP (Model Context Protocol)</strong> que expõe as mesmas automações do Cockpit como <strong className="text-foreground">52 tools</strong> que um assistente de IA (Claude Code, Copilot, etc.) pode chamar diretamente — sem passar pela interface gráfica, sem clique, sem espera de build.
          </p>

          <div className="p-2.5 rounded-lg bg-card/70 border border-border space-y-1.5">
            <span className="font-bold text-foreground block">O que dá pra pedir pro agente fazer:</span>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong className="text-foreground">Ambiente</strong> (12): status/start/stop de serviços Windows e processos, checar portas ocupadas, abrir IDE, subir Karaf em debug, resetar ambiente.</li>
              <li><strong className="text-foreground">Perfis de automação</strong> (6): rodar/parar um perfil inteiro ou um passo específico, matar porta.</li>
              <li><strong className="text-foreground">Karaf</strong> (11): console embutido, <code className="font-mono text-primary">feature:repo-add</code> + <code className="font-mono text-primary">install</code>, build Maven, build+deploy num só passo, <strong className="text-foreground">verificar se o bundle instalou e ficou ativo</strong>, ler pom.xml e sugerir comando.</li>
              <li><strong className="text-foreground">Docker</strong> (7): status do daemon, listar/iniciar/parar/reiniciar container, ler logs, remover.</li>
              <li><strong className="text-foreground">Git &amp; Azure DevOps</strong> (4): listar repositórios do workspace, branch/remote atual, montar URL de PR, comandos git arbitrários (validados).</li>
              <li><strong className="text-foreground">Rotinas</strong> (4): listar, executar, executar mapeada, favoritar executáveis Delphi.</li>
              <li><strong className="text-foreground">Documentação (RAG local)</strong> (3): reindexar docs de todos os projetos do workspace, busca semântica por trecho, status do índice — cobre qualquer <code className="font-mono text-primary">.md/.mdx/.txt</code>, incluindo pastas <code className="font-mono text-primary">/docs</code> dentro de cada repo.</li>
              <li><strong className="text-foreground">Sistema &amp; Configurações</strong> (5): info do SO, auto-detectar caminhos (IntelliJ/Karaf), ler/salvar settings.</li>
            </ul>
          </div>

          <div className="p-2.5 rounded-lg bg-card/70 border border-border space-y-2">
            <span className="font-bold text-foreground block">Ativar no Claude Code (dentro deste repo):</span>
            <p>
              O arquivo <code className="font-mono text-primary">.mcp.json</code> na raiz do projeto já registra o servidor. Basta abrir esta pasta no Claude Code e rodar <code className="font-mono text-primary">/mcp</code> para conectar — nenhuma configuração manual é necessária.
            </p>
            <span className="font-bold text-foreground block pt-1">Rodar manualmente (stdio):</span>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted font-mono text-[11px] text-primary border border-border/60">
              <code>npm run mcp</code>
              <button
                onClick={() => copyToClipboard('npm run mcp', 'cmd-mcp-faq')}
                className="p-1 hover:text-foreground transition-colors"
                title="Copiar comando"
              >
                {copiedItem === 'cmd-mcp-faq' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-card/70 border border-border space-y-2">
            <span className="font-bold text-foreground block">Usar a partir de outro projeto (ex: junto do MCP do Jira):</span>
            <p>
              Adicione uma entrada <code className="font-mono text-primary">dev-manager</code> no <code className="font-mono text-primary">mcp.json</code> desse outro projeto, com caminho absoluto (não roda de dentro dele, então <code className="font-mono text-primary">${'{workspaceFolder}'}</code> não resolve):
            </p>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted font-mono text-[11px] text-primary border border-border/60 whitespace-pre-wrap break-all">
              <code>{`"dev-manager": { "command": "npx", "args": ["tsx", "C:\\\\caminho\\\\dev-manager\\\\src\\\\mcp\\\\index.ts"] }`}</code>
              <button
                onClick={() =>
                  copyToClipboard(
                    '"dev-manager": { "command": "npx", "args": ["tsx", "C:\\\\caminho\\\\dev-manager\\\\src\\\\mcp\\\\index.ts"] }',
                    'cmd-mcp-external'
                  )
                }
                className="p-1 hover:text-foreground transition-colors shrink-0"
                title="Copiar trecho"
              >
                {copiedItem === 'cmd-mcp-external' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p>Requer <code className="font-mono text-primary">npm install</code> já rodado uma vez neste repo na máquina em questão. A sessão do agente passa a enxergar as duas listas de tools juntas.</p>
          </div>

          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-300 space-y-1">
            <span className="font-bold block">Segurança:</span>
            <p>
              O servidor MCP tem o mesmo poder do Cockpit — pode iniciar/parar serviços, matar processos, controlar containers e rodar builds/deploys. Ele roda só localmente via stdio (sem porta de rede exposta) e reaproveita as mesmas validações de segurança do REST/IPC: nomes de serviço/processo/container passam por whitelist de caracteres, caminhos de projeto são travados dentro da pasta de workspace configurada (sem <em>path traversal</em>), e comandos Karaf bloqueiam quebra de linha e operadores de shell. Ainda assim, qualquer agente conectado herda esse poder — não registre este MCP em sessões que não sejam suas.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-card/70 border border-border space-y-1">
            <span className="font-bold text-foreground block">Fora do MCP (só pela interface gráfica):</span>
            <p>
              Seletor de arquivo/pasta nativo, execução de SQL contra bancos configurados (Postgres/MySQL/Oracle) e edição visual de perfis de automação ainda não têm tool equivalente — ficam restritos ao Cockpit por enquanto.
            </p>
          </div>
        </div>
      )
    }
  ];

  const filteredFaqs = faqList.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const keyboardShortcuts = [
    { key: 'Alt + 1', desc: 'Navegar para a aba "Ambiente Dev" (Cockpit de Serviços e Automação)', category: 'Navegação' },
    { key: 'Alt + 2', desc: 'Navegar para a aba "Banco de Dados" (Oracle, MySQL, Postgres)', category: 'Navegação' },
    { key: 'Alt + 3', desc: 'Navegar para a aba "Containers" (Gerenciador Docker)', category: 'Navegação' },
    { key: 'Alt + 4', desc: 'Navegar para a aba "Deploy" (Perfis Karaf, Docker & comandos genéricos)', category: 'Navegação' },
    { key: 'Alt + 5', desc: 'Navegar para a aba "Git & Azure DevOps" (Branches & Pull Requests)', category: 'Navegação' },
    { key: 'Alt + 6', desc: 'Navegar para a aba "Catálogo de Rotinas" (Executáveis Delphi)', category: 'Navegação' },
    { key: 'Alt + 7', desc: 'Navegar para a aba "Documentação" (Busca semântica RAG)', category: 'Navegação' },
    { key: 'Alt + 8', desc: 'Navegar para a aba "Configurações" (Diretórios, IDEs e Portas)', category: 'Navegação' },
    { key: 'Alt + 9', desc: 'Navegar para esta aba de "Ajuda & Sobre o Programa"', category: 'Navegação' },
    { key: 'Ctrl + K', desc: 'Abrir o Buscador Rápido (Quick Launcher)', category: 'Navegação' },
    { key: 'Shift + F9', desc: `Atalho padrão do IntelliJ IDEA para iniciar o Remote JVM Debug (:${debugPort})`, category: 'Desenvolvimento' },
    { key: 'Enter', desc: 'Enviar comando no Terminal Integrado do Karaf Shell', category: 'Console' }
  ];

  const categories = [
    { id: 'overview', label: 'Visão Geral & Início', icon: Sparkles },
    { id: 'modules', label: 'Guia dos Módulos', icon: BookOpen },
    { id: 'shortcuts', label: 'Atalhos & Dicas Pro', icon: Zap },
    { id: 'faq', label: 'FAQ & Resolução de Dúvidas', icon: LifeBuoy },
    { id: 'about', label: 'Sobre & Diagnóstico', icon: Info }
  ];

  return (
    <div className="h-full flex flex-col p-5 space-y-4 overflow-hidden">
      {/* Topo / Header da Página de Ajuda */}
      <div className="cockpit-panel rounded-2xl p-4 shadow-xl border border-border flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              Central de Ajuda e Documentação
              <span className="text-[10px] bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-mono font-bold">
                MANUAL DO DESENVOLVEDOR
              </span>
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Guias de utilização, arquitetura dos módulos, atalhos de teclado, FAQ e diagnósticos técnicos do sistema
            </p>
          </div>
        </div>

        {/* Busca Rápida na Ajuda */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Pesquisar ajuda, comandos, FAQ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card/60 border border-border hover:border-primary/40 focus:border-primary rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none transition-colors font-sans shadow-inner"
          />
        </div>
      </div>

      {/* Sub-Navegação por Pílulas Temáticas */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 shrink-0 scrollbar-none">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as HelpCategory)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 border ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                  : 'bg-card/50 text-muted-foreground border-border hover:text-foreground hover:bg-card'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Conteúdo Principal Rolável */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
        {/* 1. VISÃO GERAL & INÍCIO RÁPIDO */}
        {activeCategory === 'overview' && (
          <div className="space-y-4">
            {/* Banner de Boas-Vindas & Propósito */}
            <div className="cockpit-panel rounded-2xl p-6 border border-border space-y-4 shadow-xl relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-start justify-between">
                <div className="space-y-1.5 max-w-3xl">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                      Cockpit do Desenvolvedor
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">Dev Manager • Automação</span>
                  </div>
                  <h3 className="text-lg font-extrabold text-foreground">
                    Bem-vindo ao Dev Manager 🚀
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    O Dev Manager foi construído especificamente para eliminar o atrito diário enfrentado pelos desenvolvedores. Ele unifica em uma única interface moderna o controle de serviços do Windows, o ciclo de vida de contêineres OSGi Apache Karaf, a gestão de repositórios Git com integração direta ao Azure DevOps e o catálogo de rotinas.
                  </p>
                </div>
              </div>

              {/* Fluxo de Trabalho Recomendado */}
              <div className="pt-2 border-t border-border">
                <span className="text-[13px] font-bold uppercase tracking-wider text-primary block mb-3">
                  Fluxo de Trabalho Diário Recomendado:
                </span>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-2 hover:border-primary/40 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                      1
                    </div>
                    <h4 className="text-xs font-bold text-foreground">Preparar Ambiente</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Em 1 clique, encerra travas de arquivos, inicia a IDE configurada e sobe os serviços do seu perfil de automação em modo Debug.
                    </p>
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate('env')}
                        className="text-[11px] text-primary font-semibold flex items-center gap-1 hover:underline pt-1"
                      >
                        <span>Ir para Ambiente</span> <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-2 hover:border-primary/40 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs border border-amber-500/20">
                      2
                    </div>
                    <h4 className="text-xs font-bold text-foreground">Perfis de Deploy</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Monte etapas sequenciais de build e publicação — Karaf (<code className="font-mono text-primary">client.bat</code>), Docker (build/push/restart) ou comando genérico — com streaming de saída.
                    </p>
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate('deploy')}
                        className="text-[11px] text-amber-500 font-semibold flex items-center gap-1 hover:underline pt-1"
                      >
                        <span>Ir para Deploy</span> <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-2 hover:border-primary/40 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs border border-blue-500/20">
                      3
                    </div>
                    <h4 className="text-xs font-bold text-foreground">Git & Pull Request</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Sincroniza branches locais e abre a tela de abertura de Pull Request no Azure DevOps sem preenchimento manual.
                    </p>
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate('git')}
                        className="text-[11px] text-blue-500 font-semibold flex items-center gap-1 hover:underline pt-1"
                      >
                        <span>Ir para Git &amp; Azure</span> <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-card/60 border border-border space-y-2 hover:border-primary/40 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs border border-indigo-500/20">
                      4
                    </div>
                    <h4 className="text-xs font-bold text-foreground">Catálogo de Rotinas</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Busca instantânea por código ou nome do executável e execução direta com favoritos salvos.
                    </p>
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate('routines')}
                        className="text-[11px] text-indigo-500 font-semibold flex items-center gap-1 hover:underline pt-1"
                      >
                        <span>Ir para Rotinas</span> <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Links Rápidos Oficiais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                onClick={() => handleOpenLink(portalWebUrl)}
                className="p-3.5 rounded-xl bg-card/60 border border-border hover:border-primary/50 text-left transition-all flex items-center justify-between group shadow-sm"
              >
                <div>
                  <span className="text-xs font-bold text-foreground block group-hover:text-primary transition-colors">
                    Portal Web Local
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono truncate max-w-[150px] inline-block" title={portalWebUrl}>{portalWebUrl.replace('http://', '')}</span>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>

              <button
                onClick={() => handleOpenLink(consoleUrl)}
                className="p-3.5 rounded-xl bg-card/60 border border-border hover:border-amber-500/50 text-left transition-all flex items-center justify-between group shadow-sm"
              >
                <div>
                  <span className="text-xs font-bold text-foreground block group-hover:text-amber-400 transition-colors">
                    Console Felix / OSGi
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono truncate max-w-[150px] inline-block" title={consoleUrl}>{consoleUrl.replace('http://', '')}</span>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-amber-400 transition-colors" />
              </button>

              <button
                onClick={() => handleOpenLink('https://karaf.apache.org/documentation.html')}
                className="p-3.5 rounded-xl bg-card/60 border border-border hover:border-blue-500/50 text-left transition-all flex items-center justify-between group shadow-sm"
              >
                <div>
                  <span className="text-xs font-bold text-foreground block group-hover:text-blue-400 transition-colors">
                    Apache Karaf Docs
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">Documentação Oficial</span>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-blue-400 transition-colors" />
              </button>

              <button
                onClick={() => handleOpenLink('https://dev.azure.com')}
                className="p-3.5 rounded-xl bg-card/60 border border-border hover:border-indigo-500/50 text-left transition-all flex items-center justify-between group shadow-sm"
              >
                <div>
                  <span className="text-xs font-bold text-foreground block group-hover:text-indigo-400 transition-colors">
                    Portal Azure DevOps
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">dev.azure.com</span>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-indigo-400 transition-colors" />
              </button>
            </div>
          </div>
        )}

        {/* 2. GUIA DOS MÓDULOS */}
        {activeCategory === 'modules' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Card: Ambiente Dev */}
            <div className="cockpit-panel rounded-2xl p-5 border border-border space-y-3.5 shadow-md">
              <div className="flex items-center space-x-2.5 pb-2 border-b border-border">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground">
                    1. Gestor de Ambiente & Automação
                  </h3>
                  <span className="text-[10px] text-muted-foreground font-mono">Servidor OSGi Debug & Serviços</span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
                <p>
                  O painel de Ambiente automatiza o ciclo completo de preparação do computador para testes e depuração:
                </p>
                <ul className="space-y-1.5 pl-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Parada dos Serviços:</strong> Interrompe serviços em segundo plano do Windows para liberar portas de comunicação.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Encerramento de Travas:</strong> Finaliza processos em segundo plano que causam travas de portas ou arquivos.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Inicialização da IDE:</strong> Abre automaticamente o IntelliJ IDEA, VS Code ou Cursor conforme configurado.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Servidor Debug:</strong> Aciona a inicialização em modo Debug com suporte a <strong>Console Integrado</strong> (visualização e envio de comandos interativos no próprio cockpit) ou <strong>Janela Externa (CMD)</strong>.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Card: Deploy OSGi Karaf */}
            <div className="cockpit-panel rounded-2xl p-5 border border-border space-y-3.5 shadow-md">
              <div className="flex items-center space-x-2.5 pb-2 border-b border-border">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground">
                    2. Deploy (Perfis multi-alvo)
                  </h3>
                  <span className="text-[10px] text-muted-foreground font-mono">Karaf OSGi · Docker · Comando Genérico</span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
                <p>
                  Monte perfis com etapas sequenciais de build e publicação — misture etapas Karaf, Docker e comandos genéricos no mesmo perfil, cada uma com saída em streaming:
                </p>
                <ul className="space-y-1.5 pl-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>Karaf OSGi:</strong> etapas <code className="font-mono text-primary">feature:repo-add</code> / <code className="font-mono text-primary">feature:install -r -u</code> (ou qualquer comando de shell), com sugestão automática a partir do <code className="font-mono text-primary">pom.xml</code> do projeto.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>Docker:</strong> build de imagem, push para o registry e restart de container, cada um como etapa independente.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>Build Maven &amp; Comando Genérico:</strong> compila o projeto (<code className="font-mono text-primary">mvn clean install</code>) ou roda qualquer script antes/depois das outras etapas.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>Diagnósticos Rápidos Karaf:</strong> Botões dedicados para listar features ativas (<code className="font-mono text-primary">feature:list -i</code>), bundles (<code className="font-mono text-primary">bundle:list -s</code>) e visualizar logs recentes (<code className="font-mono text-primary">log:display</code>).</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Card: Git & Azure DevOps */}
            <div className="cockpit-panel rounded-2xl p-5 border border-border space-y-3.5 shadow-md">
              <div className="flex items-center space-x-2.5 pb-2 border-b border-border">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <GitPullRequest className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground">
                    3. Git & Azure DevOps Hub
                  </h3>
                  <span className="text-[10px] text-muted-foreground font-mono">Gestão de Branches & PRs</span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
                <p>
                  Centraliza todos os repositórios clonados no seu computador:
                </p>
                <ul className="space-y-1.5 pl-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span><strong>Varredura Automática:</strong> Encontra todos os projetos Git na pasta base configurada e exibe a branch atual e contagem de alterações pendentes.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span><strong>Ações Rápidas de Git:</strong> Botões de <code className="font-mono text-primary">git fetch</code>, <code className="font-mono text-primary">git pull</code>, <code className="font-mono text-primary">git stash</code> e <code className="font-mono text-primary">git stash pop</code> com feedback visual.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span><strong>Criador de Pull Request:</strong> Gera a URL exata de abertura de PR no Azure DevOps comparando a branch selecionada com a branch alvo (ex: <code className="font-mono text-primary">develop</code>).</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Card: Catálogo de Rotinas */}
            <div className="cockpit-panel rounded-2xl p-5 border border-border space-y-3.5 shadow-md">
              <div className="flex items-center space-x-2.5 pb-2 border-b border-border">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Grid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground">
                    4. Catálogo de Rotinas
                  </h3>
                  <span className="text-[10px] text-muted-foreground font-mono">Executáveis .exe e .pc</span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
                <p>
                  Acesso instantâneo a todas as rotinas encontradas na pasta configurada:
                </p>
                <ul className="space-y-1.5 pl-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span><strong>Busca Instantânea:</strong> Filtre rotinas por código ou nome do executável.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span><strong>Filtro por Módulo:</strong> Agrupamento automático pelas subpastas do diretório configurado.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span><strong>Favoritos Persistidos:</strong> Fixe suas rotinas mais utilizadas com 1 clique para tê-las sempre no topo.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Card: Servidor MCP */}
            <div className="cockpit-panel rounded-2xl p-5 border border-border space-y-3.5 shadow-md">
              <div className="flex items-center space-x-2.5 pb-2 border-b border-border">
                <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground">
                    5. Servidor MCP (Automação via IA)
                  </h3>
                  <span className="text-[10px] text-muted-foreground font-mono">Model Context Protocol • stdio</span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
                <p>
                  Expõe as mesmas automações do Cockpit como <em>tools</em> chamáveis por um assistente de IA (ex: Claude Code), sem passar pela interface:
                </p>
                <ul className="space-y-1.5 pl-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                    <span><strong>41 Tools por Domínio:</strong> <code className="font-mono text-primary">env_*</code>, <code className="font-mono text-primary">karaf_*</code>, <code className="font-mono text-primary">git_*</code>, <code className="font-mono text-primary">routines_*</code>, <code className="font-mono text-primary">settings_*</code>, entre outros.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                    <span><strong>Mesma Camada de Segurança:</strong> Reaproveita as validações de path/comando/identificador já usadas pelo Cockpit e pela API REST — nenhuma lógica duplicada.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                    <span><strong>Local via stdio:</strong> Sem porta de rede exposta. Registro automático no Claude Code pelo <code className="font-mono text-primary">.mcp.json</code> da raiz do projeto.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 3. ATALHOS & DICAS PRO */}
        {activeCategory === 'shortcuts' && (
          <div className="space-y-4">
            {/* Tabela de Atalhos de Teclado */}
            <div className="cockpit-panel rounded-2xl p-5 border border-border space-y-3.5 shadow-md">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground">
                    Atalhos de Teclado Globais
                  </h3>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">Cockpit Keyboard Shortcuts</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {keyboardShortcuts.map((sc, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-card/60 border border-border flex items-center justify-between hover:border-primary/40 transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0 pr-3">
                      <span className="text-xs font-bold text-foreground block truncate">{sc.desc}</span>
                      <span className="text-[10px] text-muted-foreground font-mono uppercase">{sc.category}</span>
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
              <div className="cockpit-panel rounded-2xl p-5 border border-border space-y-2.5 shadow-md">
                <div className="flex items-center space-x-2 text-primary font-bold text-xs uppercase tracking-wider">
                  <Code2 className="w-4 h-4" />
                  <span>Dica Pro: Depuração JVM Remota no IntelliJ</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Para depurar código Java dos serviços sem interromper o Karaf, crie uma configuração <strong className="text-foreground">Remote JVM Debug</strong> no IntelliJ apontando para <code className="font-mono text-primary font-semibold">localhost:{debugPort}</code>. Você pode colocar breakpoints nos seus <em>bundles</em> e o IntelliJ pausará a execução em tempo real!
                </p>
              </div>

              <div className="cockpit-panel rounded-2xl p-5 border border-border space-y-2.5 shadow-md">
                <div className="flex items-center space-x-2 text-amber-500 font-bold text-xs uppercase tracking-wider">
                  <Terminal className="w-4 h-4" />
                  <span>Dica Pro: Comandos Úteis do Apache Karaf</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No terminal integrado, utilize <code className="font-mono text-primary">bundle:list -s</code> para inspecionar o estado dos seus JARs OSGi, <code className="font-mono text-primary">log:tail</code> para acompanhar logs do servidor e <code className="font-mono text-primary">bundle:restart &lt;ID&gt;</code> para reiniciar apenas um módulo específico rapidamente.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 4. FAQ & RESOLUÇÃO DE DÚVIDAS */}
        {activeCategory === 'faq' && (
          <div className="space-y-3">
            {filteredFaqs.length === 0 ? (
              <div className="cockpit-panel rounded-2xl p-8 text-center border border-border space-y-2">
                <LifeBuoy className="w-8 h-8 text-muted-foreground mx-auto" />
                <h4 className="text-xs font-bold text-foreground">Nenhuma pergunta encontrada</h4>
                <p className="text-[11px] text-muted-foreground">
                  Nenhum tópico correspondeu ao termo de busca "{searchQuery}". Tente pesquisar por palavras-chave como "porta", "uac", "karaf" ou "git".
                </p>
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
                      className="w-full p-4 text-left flex items-start justify-between gap-3 hover:bg-card/70 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                            {faq.category}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 pt-0.5">
                          {faq.question}
                        </h4>
                      </div>
                      <div className="p-1 rounded-lg bg-muted text-muted-foreground shrink-0 mt-1">
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
        )}

        {/* 5. SOBRE & DIAGNÓSTICO DO SISTEMA */}
        {activeCategory === 'about' && (
          <div className="space-y-4">
            {/* Informações da Aplicação */}
            <div className="cockpit-panel rounded-2xl p-5 border border-border space-y-4 shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary/80 via-primary to-primary flex items-center justify-center font-black text-primary-foreground shadow-lg shadow-primary/25 text-xl tracking-wider border border-primary/30">
                    D
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                      Dev <span className="text-primary font-bold">Manager</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-bold border border-primary/30">
                        v1.0.0
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
                  className="px-3.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
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
                      <span>Copiar Diagnóstico</span>
                    </>
                  )}
                </button>
              </div>

              {/* Tabela de Diagnóstico Técnico da Máquina */}
              <div className="pt-2 border-t border-border">
                <div className="text-[13px] font-bold uppercase tracking-wider text-foreground mb-3 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-primary" />
                  <span>Diagnóstico do Ambiente de Execução</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {/* UAC / Permissão */}
                  <div className="p-3 rounded-xl bg-card/60 border border-border space-y-1">
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
                  <div className="p-3 rounded-xl bg-card/60 border border-border space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                      Sistema Operacional:
                    </span>
                    <div className="flex items-center space-x-1.5 font-mono text-foreground font-semibold truncate">
                      <Monitor className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="truncate">
                        {appInfo ? `Windows ${appInfo.osRelease} (${appInfo.osArch})` : 'Carregando...'}
                      </span>
                    </div>
                  </div>

                  {/* Memória RAM */}
                  <div className="p-3 rounded-xl bg-card/60 border border-border space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                      Memória RAM do Sistema:
                    </span>
                    <div className="flex items-center space-x-1.5 font-mono text-foreground font-semibold">
                      <HardDrive className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        {appInfo
                          ? `${appInfo.freeMemoryMb} MB livres de ${appInfo.totalMemoryMb} MB`
                          : 'Carregando...'}
                      </span>
                    </div>
                  </div>

                  {/* Versão Electron & Chromium */}
                  <div className="p-3 rounded-xl bg-card/60 border border-border space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                      Runtimes Desktop:
                    </span>
                    <div className="font-mono text-foreground text-[11px] truncate">
                      Electron <strong className="text-primary">v{appInfo?.electronVersion}</strong> • Chrome{' '}
                      <strong>v{appInfo?.chromeVersion}</strong>
                    </div>
                  </div>

                  {/* Versão Node & V8 */}
                  <div className="p-3 rounded-xl bg-card/60 border border-border space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                      Motor JavaScript:
                    </span>
                    <div className="font-mono text-foreground text-[11px] truncate">
                      Node.js <strong className="text-emerald-500">v{appInfo?.nodeVersion}</strong> • V8{' '}
                      <strong>v{appInfo?.v8Version}</strong>
                    </div>
                  </div>

                  {/* Hostname */}
                  <div className="p-3 rounded-xl bg-card/60 border border-border space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                      Nome da Máquina (Host):
                    </span>
                    <div className="font-mono text-foreground text-[11px] truncate flex items-center gap-1">
                      <Laptop className="w-3.5 h-3.5 text-primary" />
                      <span className="truncate">{appInfo?.osHostname || 'Localhost'}</span>
                    </div>
                  </div>
                </div>

                {/* Caminho do Config JSON */}
                {appInfo?.configPath && (
                  <div className="mt-3 p-3 rounded-xl bg-muted/60 border border-border flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Caminho do Arquivo de Configurações do Aplicativo:
                      </span>
                      <span className="text-[11px] font-mono text-foreground truncate block">
                        {appInfo.configPath}
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(appInfo.configPath, 'configPath')}
                      className="p-1.5 rounded-lg bg-card hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      title="Copiar caminho completo"
                    >
                      {copiedItem === 'configPath' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Geração e Distribuição do Executável (.exe) */}
            <div className="cockpit-panel rounded-2xl p-5 border border-border space-y-3.5 shadow-md">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground">
                      Empacotamento & Geração de Executável (.exe)
                    </h3>
                    <span className="text-[10px] text-muted-foreground font-mono">Electron Builder • Windows Release</span>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard('npm run build:electron', 'btn-copy-build')}
                  className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 shadow-sm"
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
                      <span>Copiar Comando</span>
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
                  <div className="p-3 rounded-xl bg-card/60 border border-border space-y-1">
                    <span className="font-bold text-foreground block text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Dev Manager 1.0.0.exe (Portátil)
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Versão autônoma que não necessita instalação. Pode ser executada diretamente de pastas de rede ou pendrives.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-card/60 border border-border space-y-1">
                    <span className="font-bold text-foreground block text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      Dev Manager Setup 1.0.0.exe (Instalador)
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Instalador padrão NSIS que cria atalhos no Menu Iniciar e Área de Trabalho com desinstalador integrado.
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-600 dark:text-emerald-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>Ambos os executáveis solicitam elevação de Administrador (UAC) automaticamente ao abrir.</span>
                </div>
              </div>
            </div>

            {/* Tecnologias Utilizadas */}
            <div className="cockpit-panel rounded-2xl p-5 border border-border space-y-3 shadow-md">
              <div className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-primary" />
                <span>Stack Tecnológica do Painel</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-mono">
                <span className="px-2.5 py-1 rounded-lg bg-card border border-border text-foreground">
                  Electron 29
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-card border border-border text-cyan-400">
                  React 18 + TypeScript 5
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-card border border-border text-blue-400">
                  Tailwind CSS 3
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-card border border-border text-amber-400">
                  Vite 5
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-card border border-border text-primary">
                  Lucide Icons
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-card border border-border text-purple-400">
                  Apache Karaf OSGi
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-card border border-border text-emerald-400">
                  Git & Azure DevOps REST
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-card border border-border text-violet-400">
                  Model Context Protocol (MCP)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HelpPage;
