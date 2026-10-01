import React from 'react';
import {
  Terminal,
  Database,
  Boxes,
  Layers,
  GitPullRequest,
  Grid,
  FileSearch,
  Activity,
  Bot,
  ScrollText,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Copy,
  Check
} from 'lucide-react';

interface HelpModulesTabProps {
  debugPort: number;
  onNavigate?: (tab: string) => void;
  handleOpenMcpDocs: () => void;
  copyToClipboard: (text: string, key?: string) => void;
  copiedItem: string | null;
}

export const HelpModulesTab: React.FC<HelpModulesTabProps> = ({
  debugPort,
  onNavigate,
  handleOpenMcpDocs,
  copyToClipboard,
  copiedItem
}) => {
  return (
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
                <span><strong>Editor SQL para Queries Grandes:</strong> Split redimensionável por arrasto vertical, modo Maximizar (tela cheia para foco total em queries grandes), gutter com números de linha sincronizado, quebra automática (Word Wrap), zoom da fonte (A-/A+) e botão para Formatar SQL automaticamente.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Parâmetros e Variáveis Dinâmicas:</strong> Suporte completo a Bind Variables (<code className="font-mono text-primary">:VAR</code>), variáveis de substituição do WinThor / SQL*Plus (<code className="font-mono text-primary">&amp;VAR</code> e <code className="font-mono text-primary">&amp;&amp;VAR</code>), scripts (<code className="font-mono text-primary">@VAR</code>) e templates (<code className="font-mono text-primary">{'{VAR}'}</code>), com histórico no cache, suporte a listas <code className="font-mono text-primary">IN (...)</code>, adição manual e substituição inline no editor.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Statement Tracer &amp; Parâmetros (Binds):</strong> Rastreamento de queries Oracle (<code className="font-mono text-primary">v$session</code>/<code className="font-mono text-primary">v$sql</code>) com captura de valores de binds (<code className="font-mono text-primary">v$sql_bind_capture</code>), dispensando <code className="font-mono text-primary">log:set trace root</code> no Karaf e gerando SQL executável interpolado em 1 clique.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Grade de dados editável:</strong> ao abrir uma tabela pela barra lateral (SELECT * simples), a grade de resultados vira uma planilha — botão <em>Nova linha</em>, duplo-clique numa célula para editar e botão direito para excluir a linha, sem precisar escrever INSERT/UPDATE/DELETE na mão.</span>
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
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span><strong>Catálogo Oficial da Rotina 801:</strong> Instalação e atualização de serviços web e rotinas com filtro por famílias de versão (ex.: 1.39.x, 1.38.x, 0.39.x), seleção em lote de releases completas, assistente de Instalação Direta com override de versão para montagem de ambientes específicos e pré-registro automático de repositórios Maven (<code className="font-mono text-primary">feature:repo-add</code>) eliminando o erro "No matching features".</span>
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
                <span><strong>Karaf Instrumentado:</strong> Com o <code className="font-mono text-primary">opentelemetry-javaagent.jar</code> em <code className="font-mono text-primary">&lt;karaf&gt;/bin</code> e o toggle "Anexar automaticamente" ligado em <em>Como Conectar</em>, o agente é anexado sozinho ao iniciar pelo Cockpit (desligado por padrão, para não poluir o log do Karaf).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                <span><strong>Porta Configurável:</strong> Troque a porta em <em>Como Conectar</em> se outro coletor já ocupa a 4318.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                <span><strong>Nome do Serviço Configurável:</strong> Defina o <code className="font-mono text-primary">otel.service.name</code> em <em>Como Conectar</em> — identifica sua aplicação no APM em vez do padrão genérico <code className="font-mono text-primary">karaf-app</code>.</span>
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
          </div>

          <div className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
            <p>
              Ponte de controle nativa para agentes e assistentes de IA interagirem com seu ambiente de desenvolvimento:
            </p>
            <ul className="space-y-1.5 pl-1">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                <span><strong>Automação de Build &amp; Deploy:</strong> Compilação Maven, deploy de features e verificação de ativação via linguagem natural no chat da IDE.</span>
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
                <span><strong>Gaveta de Diagnóstico:</strong> Sugestão contextual de queries e ações corretivas em 1 clique.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span><strong>Filtros por Nível:</strong> Destaque colorido para INFO, WARN e ERROR.</span>
              </li>
            </ul>
          </div>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate('logs')}
            className="mt-3 w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Abrir Módulo de Logs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
