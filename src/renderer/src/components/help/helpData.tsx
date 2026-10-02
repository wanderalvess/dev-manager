import React from 'react';
import {
  Rocket,
  BookOpen,
  Zap,
  LifeBuoy,
  Info,
  Settings,
  Download,
  ExternalLink,
  Check,
  Copy,
  RotateCcw,
  Activity,
  LucideIcon
} from 'lucide-react';

export type HelpCategory = 'overview' | 'modules' | 'shortcuts' | 'faq' | 'about';

export interface HelpCategoryItem {
  id: HelpCategory;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

export const MCP_ADD_COMMAND = 'claude mcp add dev-manager --scope user -- cmd /c C:\\DevManager\\mcp\\dev-manager-mcp.cmd';

// Mesmos links do LEIA-ME.txt gerado no release (scripts/release-templates/LEIA-ME.txt) e do README.
export const OPTIONAL_DOWNLOADS = {
  ragModel: 'https://storage.googleapis.com/qdrant-fastembed/sentence-transformers-all-MiniLM-L6-v2.tar.gz',
  oracleInstantClient: 'https://www.oracle.com/database/technologies/instant-client/winx64-64-downloads.html',
  vcRedist: 'https://aka.ms/vs/17/release/vc_redist.x64.exe',
  ollama: 'https://ollama.com/download'
};

export interface FaqItem {
  id: string;
  question: string;
  category: string;
  answer: React.ReactNode;
  tags: string[];
}

export interface GetFaqListOptions {
  debugPort: number;
  webPort: number;
  sshPort: number;
  portalWebUrl: string;
  consoleUrl: string;
  onNavigate?: (tab: string) => void;
  copyToClipboard: (text: string, key?: string) => void;
  copiedItem: string | null;
  handleOpenLink: (url: string) => void;
  handleOpenMcpDocs: () => void;
  appInfo?: { appVersion?: string } | null;
}

export function getFaqList({
  debugPort,
  webPort,
  sshPort,
  onNavigate,
  copyToClipboard,
  copiedItem,
  handleOpenLink,
  handleOpenMcpDocs,
  appInfo
}: GetFaqListOptions): FaqItem[] {
  return [
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
              Verifique se o arquivo <code className="font-mono text-primary font-semibold">bin\\client.bat</code> existe dentro da pasta configurada para o Apache Karaf.
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
            <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Gerenciador de Features &amp; Repositórios:</span>
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
                <strong className="text-foreground">BundleException &amp; OSGi:</strong> Aponta pacotes ou serviços que não puderam ser resolvidos pelo ClassLoader OSGi.
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
      id: 'optional-downloads',
      question: 'O que preciso baixar à parte? (Oracle Instant Client, modelo do RAG, LLM)',
      category: 'Instalação & Pré-requisitos',
      tags: ['download', 'instalar', 'instant client', 'oracle', 'thick', '11g', 'expdp', 'modelo', 'rag', 'embeddings', 'proxy', 'offline', 'llm', 'ollama', 'leia-me', 'extras'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            Nada disso é obrigatório para usar o Dev Manager: cada item só libera uma funcionalidade. Se a pasta do release já trouxer os arquivos, rode o <code className="font-mono text-primary font-semibold">instalar-extras.cmd</code> que está nela: ele instala o modelo do RAG e extrai o Instant Client em <code className="font-mono text-primary">C:\\oracle</code>.
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-3 shadow-sm">
            <div className="space-y-1">
              <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Modelo do RAG (busca semântica):</span>
              <p>
                O app baixa sozinho na primeira indexação da <strong className="text-foreground">Documentação Semântica</strong>. Baixe à mão só se a rede bloquear (proxy corporativo) e extraia em <code className="font-mono text-primary">%APPDATA%\\dev-manager\\models</code>, de modo que exista <code className="font-mono text-primary">models\\fast-all-MiniLM-L6-v2\\model.onnx</code>. Sem o modelo, a busca funciona em modo textual.
              </p>
              <button
                onClick={() => handleOpenLink(OPTIONAL_DOWNLOADS.ragModel)}
                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 w-fit cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Baixar modelo (.tar.gz)</span>
              </button>
            </div>
            <div className="space-y-1 pt-2 border-t border-border/50">
              <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Oracle Instant Client 64-bit:</span>
              <p>
                Só para Oracle 11g ou anterior (<strong className="text-foreground">Modo Thick / Suporte a Oracle 11g (Instant Client)</strong> na conexão) e para backup/restore com <code className="font-mono text-primary">expdp</code>/<code className="font-mono text-primary">impdp</code>/<code className="font-mono text-primary">exp</code>/<code className="font-mono text-primary">imp</code>. Oracle 12c ou mais novo conecta sem nada instalado. Baixe os pacotes <strong className="text-foreground">Basic</strong> e, para backup, <strong className="text-foreground">Tools</strong>, extraia os dois na mesma pasta e informe essa pasta na conexão. Requer o Visual C++ Redistributable x64.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleOpenLink(OPTIONAL_DOWNLOADS.oracleInstantClient)}
                  className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 w-fit cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Oracle Instant Client</span>
                </button>
                <button
                  onClick={() => handleOpenLink(OPTIONAL_DOWNLOADS.vcRedist)}
                  className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 w-fit cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Visual C++ Redistributable x64</span>
                </button>
              </div>
            </div>
            <div className="space-y-1 pt-2 border-t border-border/50">
              <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">LLM para o Assistente IA:</span>
              <p>
                Use uma chave de API sua (OpenAI, Gemini, Anthropic, OpenRouter, Groq, DeepSeek) ou rode um modelo local com o Ollama (<code className="font-mono text-primary">ollama pull llama3.2</code>). Configure em <strong className="text-foreground">Configurações → IA &amp; LLM (BYOK)</strong>.
              </p>
              <button
                onClick={() => handleOpenLink(OPTIONAL_DOWNLOADS.ollama)}
                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 w-fit cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Baixar Ollama</span>
              </button>
            </div>
          </div>
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
                <strong className="text-foreground">Backup Automático (.bak):</strong> Sempre que um executável já existir no diretório de destino (ex.: <code className="font-mono text-primary">C:\\Winthor\\Prod\\MOD-001\\PCSIS101.EXE</code>), o Dev Manager cria automaticamente uma cópia de segurança renomeada com timestamp (ex.: <code className="font-mono text-primary">PCSIS101.EXE.20260929_120000.bak</code>).
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
                <strong className="text-foreground">Filtro por Família de Versão &amp; Seleção em Lote:</strong> Filtre instantaneamente as funcionalidades por linhas de versão (ex: <code className="font-mono text-primary">1.39.*</code>, <code className="font-mono text-primary">1.38.*</code>, <code className="font-mono text-primary">0.39.*</code>) e utilize o botão rápido <strong className="text-foreground">+ Selecionar N da vX.X.x</strong> para marcar todos os serviços e rotinas daquela release para instalação conjunta.
              </li>
              <li>
                <strong className="text-foreground">Instalação Direta &amp; Override de Versão:</strong> Precisa instalar uma versão específica que não consta no catálogo ativo ou montar um ambiente com pacotes pontuais? Use o botão <strong className="text-foreground">+ Instalação Direta</strong> no cabeçalho ou informe a versão no campo <strong className="text-foreground">Versão Alvo (Override)</strong> na barra de lote / drawer de inspeção.
              </li>
              <li>
                <strong className="text-foreground">Resolução de "No matching features":</strong> Esse erro ocorre no Karaf quando o comando <code className="font-mono text-primary">feature:install</code> é executado sem que o repositório Maven (<code className="font-mono text-primary">features.xml</code>) tenha sido registrado previamente via <code className="font-mono text-primary">feature:repo-add</code>. O Dev Manager agora infere automaticamente as coordenadas canônicas Maven do WinThor (<code className="font-mono text-primary">mvn:br.com.pcsist.winthor...</code>) e executa o <code className="font-mono text-primary">feature:repo-add</code> antes da instalação, além de oferecer o botão dedicado <strong className="text-foreground">Registrar Repositórios</strong> para pré-adicionar as features no Karaf.
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
                <strong className="text-foreground">Dev Manager {appInfo?.appVersion || '1.25.0'}.exe (Portátil):</strong> Não precisa instalar. Basta clicar duas vezes e usar. Ideal para rodar de pendrives ou pastas de rede.
              </li>
              <li>
                <strong className="text-foreground">Dev Manager Setup {appInfo?.appVersion || '1.25.0'}.exe (Instalador):</strong> Instalador assistido (NSIS) que cria atalhos no Desktop e Menu Iniciar.
              </li>
              <li>
                <strong className="text-foreground">LEIA-ME.txt, instalar-extras.cmd e mcp\\:</strong> guia do usuário com os links dos downloads opcionais, script que instala o modelo do RAG e o Oracle Instant Client colocados na pasta, e o servidor MCP pronto para uso. Para regenerar só esses arquivos: <code className="font-mono text-primary">npm run release:folder</code>.
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
              <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Com o app instalado (pasta do release):</span>
              <p className="mb-2">
                A pasta do release traz o servidor pronto em <code className="font-mono text-primary font-semibold">mcp\\</code>, sem precisar do código-fonte nem de Node.js: o launcher usa o próprio <code className="font-mono text-primary">Dev Manager.exe</code> instalado pelo Setup. Copie a pasta para um local fixo (ex.: <code className="font-mono text-primary">C:\\DevManager\\mcp</code>) e registre no Claude Code:
              </p>
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted font-mono text-[11px] text-primary border border-border/60 mb-2">
                <code className="break-all">{MCP_ADD_COMMAND}</code>
                <button
                  onClick={() => copyToClipboard(MCP_ADD_COMMAND, 'cmd-mcp-add-faq')}
                  className="p-1 hover:text-foreground transition-colors cursor-pointer shrink-0"
                  title="Copiar comando"
                >
                  {copiedItem === 'cmd-mcp-add-faq' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="mb-2">
                No VS Code/Copilot e no Antigravity, use <code className="font-mono text-primary">"command": "cmd"</code> com <code className="font-mono text-primary">"args": ["/c", "C:\\\\DevManager\\\\mcp\\\\dev-manager-mcp.cmd"]</code>. Se instalou o app fora da pasta padrão, defina a variável <code className="font-mono text-primary">DEV_MANAGER_EXE</code> com o caminho do executável no campo <code className="font-mono text-primary">env</code>. O <code className="font-mono text-primary">LEIA-ME.txt</code> do release traz os exemplos completos. A versão portátil não serve de runtime: sem o Setup, é preciso ter Node.js 20+ no PATH.
              </p>
            </div>

            <div className="pt-2 border-t border-border/50">
              <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">A partir do código-fonte (Claude Code):</span>
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
                  <strong className="text-foreground">Continue.dev:</strong> Adicione no arquivo <code className="font-mono text-primary">%USERPROFILE%\\.continue\\config.json</code> dentro do array <code className="font-mono text-primary">"mcpServers"</code>.
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
      id: 'database-edit-grid',
      question: 'Como inserir, editar ou excluir linhas de uma tabela sem escrever SQL na mão?',
      category: 'Banco de Dados & Backup',
      tags: ['insert', 'update', 'delete', 'editar', 'inserir', 'excluir', 'grid', 'planilha', 'linha', 'célula', 'chave primária'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            Clique numa tabela na barra lateral do Database Studio para abrir um <code className="font-mono text-primary">SELECT * FROM</code> simples — quando o resultado vem exatamente desse tipo de consulta (uma única tabela, sem JOIN/agregação), a grade de resultados exibe o selo <strong className="text-foreground">"Editável"</strong> e passa a funcionar como uma planilha:
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2 shadow-sm">
            <ul className="list-disc pl-4 space-y-1">
              <li><strong className="text-foreground">Nova linha:</strong> botão na barra da grade abre uma linha em branco no topo — preencha e confirme (✓) para inserir.</li>
              <li><strong className="text-foreground">Editar célula:</strong> duplo-clique no valor, digite o novo valor e pressione Enter (ou clique fora para confirmar). Digite <code className="font-mono text-primary">[NULL]</code> para gravar nulo.</li>
              <li><strong className="text-foreground">Excluir linha:</strong> botão direito na linha → "Excluir linha".</li>
            </ul>
          </div>
          <p>
            A edição usa a <strong className="text-foreground">chave primária</strong> da tabela (via metadados já lidos pelo navegador de colunas) para montar o <code className="font-mono text-primary">WHERE</code> do UPDATE/DELETE. Tabelas sem chave primária definida caem no fallback de usar todas as colunas da linha como condição — funciona na maioria dos casos, mas pode afetar mais de uma linha se houver registros duplicados. Resultado de consultas com JOIN, agregação ou múltiplas tabelas continua somente leitura (não há como saber de qual tabela cada linha veio); para esses casos, use o editor SQL com INSERT/UPDATE/DELETE manual, que sempre esteve disponível.
          </p>
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
              Coloque o <code className="font-mono text-primary font-semibold">opentelemetry-javaagent.jar</code> na pasta <code className="font-mono text-primary">bin</code> do Karaf e ative a opção <strong className="text-foreground">"Ativar Telemetria APM (OpenTelemetry Java Agent) ao iniciar o Karaf"</strong> em <strong className="text-foreground">Configurações → Apache Karaf</strong> ou em <strong className="text-foreground">APM &amp; Traces → Como Conectar</strong> — desligado por padrão, para não poluir o log do Karaf nem adicionar overhead quando você não estiver inspecionando traces. Com a opção ligada, o agente é anexado e exporta para a porta configurada a cada start pelo Dev Manager. Para scripts externos (ex.: <code className="font-mono text-primary">winthor.bat</code>), copie o comando pronto na mesma tela.
            </p>
            <span className="font-bold text-foreground block pt-1 text-[11px] uppercase tracking-wider text-primary">Porta ocupada?</span>
            <p>
              Se outro coletor (OTel Collector, Jaeger, SigNoz) já usa a 4318, o receptor fica inativo e a tela avisa. Troque a porta em <strong className="text-foreground">Como Conectar</strong>: a nova porta é aberta antes de fechar a atual, então o receptor em uso não cai se a nova estiver ocupada. O Karaf passa a exportar para ela no próximo start.
            </p>
            <span className="font-bold text-foreground block pt-1 text-[11px] uppercase tracking-wider text-primary">Teste rápido:</span>
            <p>
              A aba <strong className="text-foreground">cURL</strong> de Como Conectar envia um span de exemplo; o botão <strong className="text-foreground">Simular Tráfego</strong> gera dados fictícios para conhecer a tela.
            </p>
            <span className="font-bold text-foreground block pt-1 text-[11px] uppercase tracking-wider text-primary">Nome do serviço:</span>
            <p>
              O campo <strong className="text-foreground">Nome do serviço</strong> em Como Conectar define o <code className="font-mono text-primary">otel.service.name</code> anexado pelo Cockpit (padrão genérico <code className="font-mono text-primary">karaf-app</code>) — use o nome real da sua aplicação para identificá-la no Dashboard e nos filtros por serviço.
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
              Por segurança contra vazamentos, a interface e a API nunca devolvem as senhas em texto puro: os campos exibem a indicação <strong className="text-emerald-500">"Senha salva e protegida"</strong>. Ao editar uma conexão de banco ou o Karaf, <strong className="text-foreground">deixe o campo em branco para manter a senha atual</strong>, ou digite uma nova para alterá-la. Se você trocar o Host ou a Porta de uma conexão, digite a senha novamente por segurança para evitar redirecionamento de credenciais.
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
    },
    {
      id: 'whats-new-and-changelog',
      question: 'Como consultar o que mudou na versão atual e navegar pelas versões anteriores (Changelog)?',
      category: 'Sistema & Geral',
      tags: ['versão', 'changelog', 'novidades', 'atualização', 'histórico', 'releases', 'notas'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            O Dev Manager traz um modal interativo de <strong className="text-foreground">Novidades da Versão</strong> que é exibido automaticamente após uma atualização e pode ser reaberto a qualquer momento.
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2 shadow-sm">
            <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Como acessar e navegar:</span>
            <ul className="list-disc pl-4 space-y-1.5">
              <li>
                <strong className="text-foreground">Badge no Header:</strong> Clique diretamente na etiqueta de versão (<code className="font-mono text-primary font-bold">v{appInfo?.appVersion || '1.25.0'}</code>) no topo esquerdo do cockpit para abrir o modal.
              </li>
              <li>
                <strong className="text-foreground">Navegação entre releases:</strong> No cabeçalho do modal, utilize os botões rápidos <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono font-bold">&lt;</kbd> e <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono font-bold">&gt;</kbd> (ou os atalhos <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono font-bold">Alt + ←</kbd> e <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono font-bold">Alt + →</kbd>) para folhear versão a versão.
              </li>
              <li>
                <strong className="text-foreground">Seletor Dropdown:</strong> Clique no seletor com o nome da versão para buscar e pular diretamente para qualquer release anterior com data de lançamento.
              </li>
              <li>
                <strong className="text-foreground">Histórico Completo:</strong> Alterne para a opção <em>"Ver Histórico Completo"</em> para rolar por todas as versões registradas do projeto.
              </li>
              <li>
                <strong className="text-foreground">Aba Sobre:</strong> Na Central de Ajuda → Sobre &amp; Diagnóstico, o botão <em>"Ver Changelog"</em> também abre este mesmo leitor com todas as versões estruturadas.
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'quality-hub-qa-po',
      question: 'O que é o módulo de Qualidade & Homologação (QA Hub) e como ele auxilia QAs e Product Owners?',
      category: 'Qualidade & Homologação',
      tags: ['qa', 'qualidade', 'testes', 'po', 'homologação', 'cenários', 'prontidão', 'checklist', 'bugs'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            O módulo <strong className="text-foreground">Qualidade &amp; Homologação (QA Hub)</strong> marca a expansão do Dev Manager além do desenvolvimento puro, fornecendo um cockpit dedicado para analistas de qualidade (QA) e donos de produto (PO).
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2 shadow-sm">
            <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Principais recursos da 1ª etapa:</span>
            <ul className="list-disc pl-4 space-y-1.5">
              <li>
                <strong className="text-foreground">Matriz de Validação &amp; Homologação:</strong> Checklist interativo para registrar status de testes por rotina Delphi, serviço Karaf, APIs ou fluxos E2E com persistência local.
              </li>
              <li>
                <strong className="text-foreground">Painel de Prontidão (PO):</strong> Semáforo executivo com pontuação de prontidão da release (Readiness Score) e taxa de sucesso dos testes para embasar decisões de entrega.
              </li>
              <li>
                <strong className="text-foreground">Exportação de Relatório Markdown:</strong> Crie com um clique um relatório executivo formatado para compartilhar em chats (Teams, Slack) ou tarefas (Azure DevOps, Jira).
              </li>
              <li>
                <strong className="text-foreground">Integração com Ferramentas Técnicas:</strong> Atalhos diretos para inspecionar logs em tempo real, executar rotinas locais e consultar massa de dados no banco durante o teste.
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'how-to-configure-quality-sources',
      question: 'Como configurar as origens de dados de qualidade (Zephyr Scale, Zephyr Squad, Jira e Azure DevOps)?',
      category: 'Qualidade & Homologação',
      tags: ['zephyr', 'jira', 'azure test plans', 'configuração', 'token', 'qa', 'testes', 'homologação', 'api'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            As fontes externas de casos de teste, planos de homologação e defeitos são configuradas na aba <strong className="text-foreground">Qualidade &amp; QA</strong> das Configurações do Cockpit.
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2 shadow-sm">
            <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Como configurar e conectar:</span>
            <ul className="list-disc pl-4 space-y-1.5">
              <li>
                <strong className="text-foreground">Onde acessar:</strong> Abra as <em>Configurações</em> e clique na aba <em>Qualidade &amp; QA</em> (ou utilize o atalho de busca <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">Ctrl+K</kbd> e digite <em>"Zephyr"</em>).
              </li>
              <li>
                <strong className="text-foreground">Templates em 1 Clique:</strong> Utilize os cards pré-configurados para <em>Zephyr Scale (Cloud)</em>, <em>Zephyr Squad / Jira Server</em>, <em>Jira Software</em> ou <em>Azure DevOps Test Plans</em>.
              </li>
              <li>
                <strong className="text-foreground">Chaves e Credenciais:</strong> Informe a URL da instância, a chave do projeto (ex.: <code className="font-mono text-primary font-bold">WIN</code>), o usuário/e-mail e o token de autenticação (Zephyr API Token, Atlassian API Token ou Azure PAT).
              </li>
              <li>
                <strong className="text-foreground">Segurança dos Segredos:</strong> Todos os tokens de QA são gravados no disco criptografados com <strong className="text-foreground">AES-256-GCM</strong> e nunca são expostos em texto plano na interface.
              </li>
              <li>
                <strong className="text-foreground">Teste de Conectividade:</strong> Clique no botão <em>"Testar"</em> no card da fonte para verificar a validade dos parâmetros antes de salvar.
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'docker-container-groups-and-batch',
      question: 'Como criar grupos de containers para subir vários de uma vez e usar ações em lote?',
      category: 'Containers & Docker',
      tags: ['containers', 'docker', 'grupos', 'lote', 'batch', 'subir', 'iniciar', 'parar', 'sequência', 'delay'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            O gerenciador de <strong className="text-foreground">Containers (Docker)</strong> permite agrupar múltiplos containers em conjuntos nomeados (ex.: <em>"Stack Backend"</em>, <em>"Bancos de Dados"</em>, <em>"Serviços de Mensageria"</em>) para inicialização ou parada sequencial com apenas um clique:
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2 shadow-sm">
            <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Como criar e gerenciar grupos:</span>
            <ul className="list-disc pl-4 space-y-1.5">
              <li>
                <strong className="text-foreground">Painel Superior de Grupos:</strong> No topo da tela de Containers, visualize todos os grupos cadastrados com o status em tempo real (ex.: <code className="font-mono text-emerald-500 font-bold">3/3 rodando</code> ou <code className="font-mono text-amber-500 font-bold">1/3</code>). Clique em <strong className="text-emerald-500">Subir Grupo</strong> para iniciar todos os containers do conjunto ou em <strong className="text-foreground">Parar</strong> para interrompê-los.
              </li>
              <li>
                <strong className="text-foreground">Criação Rápida por Seleção em Lote:</strong> Marque a caixa de seleção (checkbox) nos cards dos containers desejados. Na barra flutuante que surge no rodapé, clique em <strong className="text-foreground">"Criar Grupo (N)"</strong> para abrir o modal com os containers já pré-selecionados.
              </li>
              <li>
                <strong className="text-foreground">Configuração com Delays e Ordem:</strong> No modal do grupo, você pode buscar e selecionar livremente qualquer container do Docker/WSL, reordenar a sequência de subida e definir um tempo de espera (warm-up) opcional em segundos entre eles (útil quando um serviço depende de outro já ativo, como Kafka ou Oracle).
              </li>
              <li>
                <strong className="text-foreground">Ações em Lote Instantâneas:</strong> Com múltiplos containers selecionados, a barra de lote permite também <strong className="text-emerald-500">Subir Selecionados</strong>, <strong className="text-rose-500">Parar Selecionados</strong> ou <strong className="text-amber-500">Reiniciar Selecionados</strong> sem precisar criar um grupo fixo.
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'qa-regression-suite-runner',
      question: 'Como funciona o Validador Regressivo (QA Studio) para checagem de dados e asserções no Oracle?',
      category: 'Qualidade & Homologação',
      tags: ['qa', 'regressivo', 'oracle', 'asserções', 'json', 'pdv', 'jira', 'validação', 'mississauga', 'winthor', 'tabelas'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            O <strong className="text-foreground">Validador Regressivo (QA Studio)</strong> automatiza a conferência de dados gravados nas tabelas do WinThor após transações via PDV ou APIs de integração:
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2 shadow-sm">
            <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Fluxo de Trabalho:</span>
            <ul className="list-disc pl-4 space-y-1.5">
              <li>
                <strong className="text-foreground">Seleção do Cenário &amp; Banco:</strong> Selecione a conexão Oracle desejada e o cenário de homologação (ex.: <em>Venda PDV — Integração WSH Mississauga</em>, <em>Cancelamento de Venda</em>, <em>Kits e Cestas</em>).
              </li>
              <li>
                <strong className="text-foreground">Entrada de Dados (JSON / Binds):</strong> Cole o payload JSON da API ou PDV e clique em <strong className="text-emerald-500">"Mapear Binds"</strong> para auto-preencher parâmetros como <code className="font-mono text-primary font-bold">:codFilial</code> e <code className="font-mono text-primary font-bold">:numCupom</code>.
              </li>
              <li>
                <strong className="text-foreground">Execução Automatizada:</strong> O sistema executa cada query SQL na ordem, repassa variáveis extraídas entre passos (ex.: <code className="font-mono text-primary font-bold">NUMTRANSVENDA</code>) e compara os resultados com o esperado.
              </li>
              <li>
                <strong className="text-foreground">Regras de Asserção:</strong> Suporta validações por JSONPath (<code className="font-mono text-primary font-bold">$.vlTotal</code>), valores literais, <code className="font-mono text-primary font-bold">&lt;S&gt;</code> (preenchido), <code className="font-mono text-primary font-bold">&lt;N&gt;</code> (vazio/nulo) e <code className="font-mono text-primary font-bold">&lt;0&gt;</code> (zero).
              </li>
              <li>
                <strong className="text-foreground">Exportação em 1 Clique para Jira:</strong> Informe o código da issue (ex.: <code className="font-mono text-primary font-bold">DDWMISSI-T966</code>) e clique em <strong className="text-foreground">"Copiar Markdown (Jira)"</strong> para gerar a tabela de evidências pronta para o ticket.
              </li>
              <li>
                <strong className="text-foreground">Pasta Dedicada de Templates:</strong> Novos templates podem ser criados, editados, duplicados, importados ou exportados em JSON diretamente na pasta dedicada (<code className="font-mono text-foreground font-bold">qa-templates/</code>).
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'taut-cypress-automation',
      question: 'Como funciona a integração com o projeto TAUT-Mississauga (Cypress) para testes de API?',
      category: 'Qualidade & Homologação',
      tags: ['taut', 'mississauga', 'cypress', 'qa', 'tags', 'esteira', 'critico', 'zephyr', 'coverage', 'intake', 'csv'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            O <strong className="text-foreground">Dev Manager</strong> integra nativamente com o projeto <code className="font-mono text-primary font-bold">TAUT-Mississauga</code> na aba <strong className="text-foreground">Qualidade (Alt+Q) &gt; Automação TAUT (Cypress)</strong>:
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2 shadow-sm">
            <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-primary">Recursos Integrados:</span>
            <ul className="list-disc pl-4 space-y-1.5">
              <li>
                <strong className="text-foreground">Sincronização de .env:</strong> Botão de 1 clique que atualiza as variáveis <code className="font-mono text-primary">ORACLE_USER</code>, <code className="font-mono text-primary">ORACLE_PASSWORD</code> e <code className="font-mono text-primary">ORACLE_CONNECT_STRING</code> do TAUT com base na conexão Oracle ativa no Dev Manager.
              </li>
              <li>
                <strong className="text-foreground">Disparador por Tags (@cypress/grep):</strong> Seleção visual de meta-tags (<code className="font-mono text-emerald-400">esteira</code>, <code className="font-mono text-rose-400">critico</code>, <code className="font-mono text-blue-400">regressao</code>, <code className="font-mono text-amber-400">-develop</code>) e serviços WTA (<code className="font-mono text-primary">winthor-pedido-venda</code>, <code className="font-mono text-primary">winthor-tributacao</code>, etc.) com streaming dos logs do Cypress em tempo real.
              </li>
              <li>
                <strong className="text-foreground">Auditoria de Cobertura Zephyr Scale:</strong> Cruza os cenários dos arquivos CSV da pasta <code className="font-mono text-foreground font-bold">Insumo/</code> com os testes implementados em <code className="font-mono text-foreground font-bold">cypress/e2e/api/</code>, calculando o percentual e apontando testes pendentes.
              </li>
              <li>
                <strong className="text-foreground">Orquestrador de Intake CSV (IA):</strong> Lê o CSV do Zephyr, valida as 11 regras arquiteturais do projeto TAUT e gera o bloco estruturado e o plano de implementação pronto para copiar ou passar para a IA.
              </li>
              <li>
                <strong className="text-foreground">Tools MCP:</strong> As ferramentas <code className="font-mono text-primary">taut_*</code> permitem que assistentes de IA disparem os testes, auditem cobertura e criem novos specs sem sair do chat.
              </li>
            </ul>
          </div>
        </div>
      )
    }
  ];
}

export function getKeyboardShortcuts(debugPort: number) {
  return [
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
    { key: 'Alt + Q', desc: 'Acessar "Qualidade & Homologação" (QA Hub e Matriz de Validação)', category: 'Navegação' },
    { key: 'Ctrl + K', desc: 'Abrir o Quick Launcher (busca aproximada de ações, projetos e Configurações)', category: 'Navegação' },
    { key: 'Alt + ← / →', desc: 'Navegar entre versões anterior e seguinte no modal de Novidades', category: 'Navegação' },
    { key: 'Ctrl + Enter', desc: 'Executar consulta SQL selecionada no Database Studio', category: 'Banco de Dados' },
    { key: 'Shift + F9', desc: `Depuração Remota JVM no IntelliJ IDEA (Porta :${debugPort})`, category: 'Desenvolvimento' },
    { key: 'Enter', desc: 'Enviar comando no Terminal Integrado do Shell Karaf', category: 'Terminal' }
  ];
}

export function getHelpCategories(faqCount: number, appVersion: string = '1.26.0'): HelpCategoryItem[] {
  return [
    { id: 'overview', label: 'Visão Geral & Início', icon: Rocket, badge: 'Launchpad' },
    { id: 'modules', label: 'Guia dos Módulos', icon: BookOpen, badge: '11 Módulos' },
    { id: 'shortcuts', label: 'Atalhos & Dicas Pro', icon: Zap, badge: 'Produtividade' },
    { id: 'faq', label: 'FAQ & Resolução de Dúvidas', icon: LifeBuoy, badge: `${faqCount}` },
    { id: 'about', label: 'Sobre & Diagnóstico', icon: Info, badge: `v${appVersion}` }
  ];
}
