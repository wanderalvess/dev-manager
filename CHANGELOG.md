# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

Cada versão abaixo corresponde a um commit específico em `main`, do `v1.0.0` até aqui — tags criadas retroativamente sobre o histórico já existente (sem reescrever nenhum commit).

## [1.22.0] - 2026-09-29
### Adicionado
- **Visualizador de Diff de Arquivos & Ação "Abrir na IDE" (Hub Git & Azure DevOps)**:
  - **Inspeção de Alterações Pendentes (Uncommitted Changes)**: Novo painel no repositório selecionado listando arquivos alterados com badges semânticos de status (`M` Modificado, `A` Adicionado, `D` Deletado, `?` Não rastreado, `R` Renomeado).
  - **Visualizador de Diff Integrado (`DiffModal`)**: Modal visual completo com realce de sintaxe colorido (linhas verdes para inserções, vermelhas para remoções, blocos de cabeçalho `@@` e limites de diff extenso) permitindo inspecionar o diff de um arquivo específico ou de todo o repositório em relação a `HEAD`.
  - **Ação Rápida "Abrir na IDE"**: Atalho em 1 clique presente no painel de alterações, na barra lateral do modal de diff e no cabeçalho para abrir instantaneamente o arquivo selecionado no IntelliJ IDEA ou no editor padrão configurado no sistema.
  - **Inspeção Prévia no Commit**: Lista de arquivos na janela de commit rápido tornou-se clicável, abrindo o diff do arquivo para conferência antes do envio (`git commit && git push`).
- **Criação Integrada de Branch por Tarefa (Azure DevOps & Jira)**:
  - **Modal Inteligente de Branch por Tarefa (`TaskBranchModal`)**: Criação e checkout de branches padronizadas vinculadas a itens de trabalho diretamente pelo Dev Manager.
  - **Importação por URL ou Texto com Smart Parsing**: Identificação e extração automática de IDs de tarefas e títulos a partir de URLs do Azure DevOps (`.../workitems/edit/10482`), URLs do Jira (`.../browse/SRE-1234`) ou texto livre (`SRE-1234 Ajustes no faturamento`).
  - **Busca Integrada de Tarefas via API / WIQL**: Consulta direta a tarefas no Jira (JQL) e Azure DevOps (Work Items / WIQL) usando o token configurado, com preenchimento automático de tipo (`feature/`, `bugfix/`, `hotfix/`).
  - **Gerador de Slug e Validação Git Pura**: Conversão automática do título da tarefa em slug normalizado (sem acentos nem caracteres ilegais) e validação estrita das regras de nomenclatura de branches Git (`validateBranchName`).
  - **Seleção de Branch Base**: Suporte para definir a branch base de origem (`baseBranch`, ex: `develop` ou `main`) tanto na criação local quanto no checkout.
- **Segurança & Criptografia de Credenciais**:
  - **Criptografia AES-256-GCM para Token do Azure DevOps (`azureDevOpsToken`)**: Novo campo de token pessoal (PAT) integrado ao `ConfigService`, criptografado em repouso em `.secrets.key` e sanitizado contra vazamentos em respostas REST e IPC.
- **Exposição Unificada nos Três Transportes (IPC, REST & MCP)**:
  - **IPC Electron & Preload**: Novos canais `git:open-file-in-ide`, `git:create-task-branch`, `git:fetch-tasks` e suporte a `baseBranch` em `git:checkout-branch`.
  - **Servidor Express REST**: Endpoints `POST /api/git/create-task-branch`, `POST /api/git/open-file-in-ide`, `GET /api/git/tasks` e `POST /api/git/checkout`.
  - **Servidor MCP (Model Context Protocol)**: Novas ferramentas `git_create_task_branch` e `git_list_tasks` (totalizando **145 ferramentas** no catálogo oficial) e parâmetro `baseBranch` em `git_checkout_branch`.
- **Central de Ajuda & Documentação**:
  - Atualização do card de Git & Azure DevOps no Guia dos Módulos, novo tópico dedicado no FAQ sobre visualização de diff e criação de branches por tarefa, e atualização de `docs/MCP_TOOLS.md` com prompts e documentação de 145 tools.

## [1.21.0] - 2026-09-29
### Adicionado
- **Statement Tracer: Captura de Parâmetros (Binds) e Interpolação SQL Executável**:
  - **Captura Nativa de Variáveis Bind (`v$sql_bind_capture`)**: Inspeção automática e sob demanda dos parâmetros passados nas execuções de queries no banco Oracle, trazendo posição (`:1`, `:NOME`, `?`), tipo de dado (VARCHAR2, NUMBER, DATE, TIMESTAMP), nome e valor capturado real sem depender de logs nem de ferramentas externas como *Statement Tracer for Oracle* (`OraTracer.exe`).
  - **Eliminação de `log:set trace root` no Apache Karaf**: Permite que desenvolvedores depurem rotinas Delphi do WinThor e serviços Java/OSGi inspecionando queries parametrizadas diretamente no cursor cache do Oracle, evitando ligar o modo `TRACE` que satura arquivos de log (`karaf.log`), esgota I/O de disco e degrada a performance da JVM.
  - **Motor Puro de Interpolação de SQL (`oracleSqlInterpolator`)**: Mecanismo inteligente e isolado para substituição dos marcadores de bind pelos literais correspondentes formatados (strings com escape de aspas simples, números, datas com `TO_DATE` / `TO_TIMESTAMP` e `NULL`), preservando literais de texto existentes, blocos de comentários (`--` e `/* */`) e operadores de atribuição/cast (`:=`, `::`).
  - **Inspetor Dedicado no DB Studio (`StatementInspector`)**:
    - **Visualização Integrada e Gaveta de Detalhes**: Painel integrado ao Statement Tracer com contadores visuais de parâmetros e cursor child na tabela.
    - **Tabela de Parâmetros**: Visualização clara de cada variável bind com badges coloridos de tipo de dado.
    - **SQL Executável em 1 Clique**: Exibição da instrução final pronta para rodar com botões *"Copiar SQL"* e *"Usar no Editor"* (que transfere a query já interpolada direto para a aba de execução SQL do Database Studio).
- **Exposição Unificada nos Três Transportes (IPC, REST & MCP)**:
  - **IPC Electron & Preload**: Novo canal `db:get-oracle-statement-binds` tipado no `electronAPI` (`apiBridge.getOracleStatementBinds`).
  - **Servidor Express REST**: Endpoint `POST /api/db/oracle-statement-binds` aceitando conexão, `sqlId` e instrução SQL bruta com fallback seguro.
  - **Servidor MCP (Model Context Protocol)**: Nova ferramenta `db_get_oracle_statement_binds` (totalizando **143 ferramentas** no catálogo oficial) permitindo a agentes de IA inspecionar os parâmetros passados em qualquer query Oracle recente.
- **Central de Ajuda & Documentação**:
  - Atualização do card de Banco de Dados no Guia dos Módulos, novo tópico dedicado no FAQ explicando como inspecionar binds e evitar `log:set trace root`, e atualização do catálogo `docs/MCP_TOOLS.md` com prompts de exemplo.

## [1.20.0] - 2026-09-29
### Adicionado
- **Visualização em Gráfico Waterfall e Régua de Tempo Semântica (APM & Observabilidade)**:
  - **Régua de Tempo Visual Multi-Camada (Time Budget)**: Decomposição analítica e gráfica do tempo total de execução de cada trace dividindo proporcionalmente entre **🌐 Requisição HTTP** (I/O de rede e filtros de despacho), **☕ Processamento Java** (regras de negócio e serviços OSGi no Apache Karaf) e **🗄️ Queries JDBC** (consultas e comandos SQL no banco Oracle/PostgreSQL).
  - **Filtros e Chips Interativos por Camada**: Botões na régua de tempo para inspecionar e isolar instantaneamente spans de HTTP, Java ou JDBC, com opacidade dinâmica nos nós secundários preservando a árvore hierárquica.
  - **Modo Tela Cheia no Traces Explorer**: Botão de alternância entre painel lateral deslizante (*Split Drawer*) e modal expandido de alta resolução para inspeção aprofundada de traces complexos com muitos spans aninhados.
  - **Identificação Visual de Gargalos**: Destaque automático no Time Budget para detecção imediata do componente causador de maior latência (Gargalo no Banco vs Gargalo em Java vs Rede/HTTP) com atalho direto para a aba de Queries SQL.
  - **Destaque e Tags de Chamadas Lentas no Waterfall**: Spans e consultas demoradas (&gt;= 300ms) recebem automaticamente o badge `⚡ Lenta` com coloração semântica diferenciada na barra de duração.
- **Detecção Automática de Consultas e Endpoints Lentos (OTLP)**:
  - **Menu e Painel Rápido "Top Lentos"**: Popover dedicado na barra de ferramentas do Traces Explorer consolidando contadores de traces lentos (&gt;400ms), traces críticos (&gt;1s) e traces com queries de banco, com atalhos em 1 clique para filtrar os endpoints e queries mais demorados capturados pelo receptor OTLP.
  - **Novos Presets de Filtro Rápido**: Adicionados os presets `🐢 Lentos`, `🗄️ Queries Lentas` e `🌐 Endpoints Lentos` na barra de ferramentas.
  - **Alternador de Ordenação Rápida**: Botão para alternar entre ordenação por horário mais recente (`Mais Recentes`) e ordenação por latência decrescente (`Mais Lentos`).
  - **Ranking de Latência no Dashboard**: No Dashboard de APM, adicionada alternância entre *Mais Solicitados (Volume)* e *Mais Lentos (p95)* na lista de endpoints, além de botão *Filtrar* direto nos cards de queries mais lentas.
- **Exposição Unificada nos Três Transportes**:
  - Filtros `sortBy` ('time' | 'duration') e `slowOnly` suportados no serviço de APM (`ApmService`), nos canais IPC, nos endpoints REST (`GET /api/apm/traces`) e na ferramenta MCP `apm_get_traces`.

## [1.19.0] - 2026-09-29
### Adicionado
- **Monitor de Memória Heap e Non-Heap da JVM (JMX / Karaf)**:
  - **Telemetria em Tempo Real com Curva Visual**: Novo modal interativo (`KarafJvmMemoryModal`) com gráfico SVG contínuo mostrando a evolução temporal do consumo de memória Heap e Non-Heap (Metaspace/CodeCache), com contagem de threads ativas, classes carregadas e tempo de atividade (Uptime) da JVM.
  - **Detecção e Alertas de OutOfMemoryError (OOM)**: Alertas visuais multinível (`NORMAL`, `WARNING` a partir de 70% e `CRITICAL` a partir de 85% com flag `isNearOom`), avisando com antecedência riscos de esgotamento de memória no Apache Karaf.
  - **Disparo de Garbage Collection (GC) em 1 Clique**: Ação direta na interface para forçar a execução imediata do GC na JVM via JMX (`java.lang:type=Memory`) ou comando nativo do Karaf, com feedback visual em tempo real.
- **Log Analyzer & Destaque de Exceções Críticas WinThor**:
  - **Parser Contínuo de Exceções**: Mecanismo de análise e destaque visual em tempo real de falhas críticas do ecossistema WinThor e OSGi, cobrindo `ORA-XXXXX` (catálogo integrado de 11+ códigos de erro Oracle com explicações em português), `NullPointerException`, `BundleException` / falhas de resolução OSGi, `OutOfMemoryError`, `ClassNotFoundException` e falhas de conexão de rede.
  - **Badges Clicáveis e Gaveta de Diagnósticos (`LogExceptionAnalyzerDrawer`)**: Exibição de pílulas com códigos de erro diretamente nas linhas do console de log com navegação em 1 clique para a linha afetada, filtros por categoria de falha e sugestões imediatas de comandos de diagnóstico com botão de cópia rápida.
- **Gerenciador de Features Maven e Repositórios Karaf**:
  - **Aba Interativa de Features e Repositórios (`KarafFeaturesManagerModal`)**: Interface dedicada com duas abas operacionais acessível a partir da página de Deploy:
    - **Features Karaf**: Lista completa de features OSGi com filtros rápidos (Todas, Apenas Instaladas, Apenas WinThor), busca instantânea por nome ou repositório e instalação/desinstalação em 1 clique.
    - **Repositórios Maven**: Visualização de todos os repositórios registrados (`feature:repo-list`), identificação visual de repositórios WinThor, atualização em 1 clique (`feature:repo-refresh`), remoção segura e formulário com template para adicionar novas URLs Maven (`mvn:groupId/artifactId/version/xml/features`).
- **Exposição Unificada nos Três Transportes (IPC, REST & MCP)**:
  - **IPC Electron & Preload**: Novos canais `karaf:get-jvm-memory`, `karaf:trigger-gc`, `karaf:list-feature-repos`, `karaf:add-feature-repo`, `karaf:remove-feature-repo`, `karaf:refresh-feature-repo`, `karaf:list-all-features` e `karaf:analyze-log`.
  - **Servidor Express REST**: Endpoints `/api/karaf/jvm-memory`, `/api/karaf/gc`, `/api/karaf/feature-repos*`, `/api/karaf/features*` e `/api/karaf/analyze-log`.
  - **Servidor MCP (Model Context Protocol)**: 8 novas ferramentas registradas para agentes de IA (totalizando **142 ferramentas**): `karaf_get_jvm_memory`, `karaf_trigger_gc`, `karaf_list_feature_repos`, `karaf_add_feature_repo`, `karaf_remove_feature_repo`, `karaf_refresh_feature_repo`, `karaf_list_all_features` e `karaf_analyze_log`.
- **Central de Ajuda & Documentação**:
  - Documentação completa no Guia dos Módulos (Perfis de Deploy e Logs), novos tópicos no FAQ cobrindo telemetria JVM, alertas de OOM e resolução de erros ORA, e catálogo de ferramentas em `docs/MCP_TOOLS.md` atualizado para 142 tools.

## [1.18.0] - 2026-09-29
### Adicionado
- **Gerenciador de Rollback de Rotinas (.bak) com Reversibilidade Segura**:
  - **Histórico Completo de Versões**: Nova aba dedicada *"Histórico & Rollback"* e botão direto de rollback (<RotateCcw />) em cada card de rotina, listando todos os backups `.bak` existentes no disco com carimbo de data/hora legível, tamanho formatado e versão do executável.
  - **Restauração em 1 Clique com Proteção Preventiva**: Botão de restauração rápida que substitui o executável ativo pela versão de backup escolhida, gerando automaticamente uma cópia de segurança prévia (`_pre_rollback.bak`) antes de sobrescrever o arquivo ativo, impedindo regressões acidentais.
  - **Exclusão de Backups Obsoletos**: Possibilidade de remover arquivos `.bak` antigos diretamente pela interface gráfica, liberando espaço em disco.
- **Leitura de Versão do Executável (PE Header / FileVersion)**:
  - **Parser PE Nativo de Baixo Custo de I/O**: Implementado leitor de cabeçalho Portable Executable (PE Header / `.rsrc`) em TypeScript puro (`peVersionUtils.ts`), capaz de localizar e parsear a estrutura binária `VS_FIXEDFILEINFO` e blocos `StringFileInfo` UTF-16LE via seek direto no descritor de arquivo sem ler binários inteiros de 50MB-100MB em memória.
  - **Exibição Visual de Versão nos Cards**: Cada rotina no catálogo agora exibe automaticamente um badge verde com a sua `FileVersion` real gravada no binário (ex.: `v30.0.12`), com tooltip detalhando `ProductVersion`, permitindo conferir a versão homologada em disco e compará-la com a Central de Controle (CCW).
- **Download em Lote de Rotinas (Batch Download)**:
  - **Atualização Massiva em 1 Clique**: Nova aba e atalho no cabeçalho *"Atualização em Lote"* para atualizar simultaneamente todas as rotinas marcadas como Favoritas, todas as rotinas de um módulo funcional específico (ex.: `MOD-001`) ou uma lista livre de códigos.
  - **Monitoramento em Tempo Real**: Barra de progresso visual percentual e lista interativa exibindo o status individual de cada rotina (Pendente, Baixando com animação, Concluída ou Falha).
  - **Relatório Consolidado**: Resumo ao final com contagem de sucessos, falhas e duração total da operação.
- **Exposição Completa nos Três Transportes (IPC, REST & MCP)**:
  - **IPC Electron & Preload**: Handlers `routines:list-backups`, `routines:restore-backup`, `routines:delete-backup`, `routines:get-version` e `routines:batch-download`, com tipagem estrita no `electronAPI` e suporte a streaming de progresso.
  - **Servidor Express REST**: Endpoints `GET /api/routines/backups`, `POST /api/routines/restore-backup`, `DELETE /api/routines/backup`, `GET /api/routines/version-info` e `POST /api/routines/batch-download`.
  - **Servidor MCP (Model Context Protocol)**: 5 novas ferramentas expostas a agentes de IA (totalizando **134 tools**):
    - `routines_list_backups`: Lista backups de uma rotina com data, tamanho e versão extraída.
    - `routines_restore_backup`: Restaura um `.bak` criando preventivamente `_pre_rollback.bak`.
    - `routines_delete_backup`: Remove um arquivo `.bak` do disco.
    - `routines_get_executable_version`: Inspeciona o cabeçalho PE de qualquer `.EXE` no disco.
    - `routines_batch_download`: Orquestra downloads em lote com retorno consolidado via helper `collect()`.
- **Central de Ajuda & Documentação**:
  - Novo item de FAQ cobrindo rollback, leitura de versão PE e atualização em lote.
  - Atualização do Guia de Módulos (Catálogo de Rotinas) e da contagem oficial no catálogo `docs/MCP_TOOLS.md` (134 ferramentas).

## [1.17.0] - 2026-09-29
### Adicionado
- **Integração com a Central de Controle WinThor (CCW) & Atualização Automatizada de Rotinas**:
  - **Download Direto da Nuvem para o Ambiente Local**: Integração direta com a Central de Controle de Rotinas da PC Sistemas / TOTVS (`https://centraldecontrole.pcinformatica.com.br`). Permite baixar rotinas oficiais pelo seu código numérico (ex.: `132`, `316`, `530`) ou nome do executável e versão WinThor (padrão `30`).
  - **Extração e Descompactação Automática de ZIPs**: Tratamento transparente tanto para downloads que entregam executáveis binários `.EXE` diretos quanto para pacotes compactados `.ZIP`, utilizando parser puro em TypeScript (`zlib.inflateRawSync`) compatível com ambientes corporativos restritos.
  - **Backup Preventivo Automático (`.bak`)**: Antes de substituir qualquer executável existente na pasta do módulo em `C:\Winthor\Prod` (ex.: `MOD-001\PCSIS101.EXE`), o Dev Manager gera automaticamente uma cópia de segurança renomeada com carimbo de data e hora (ex.: `PCSIS101.EXE.20260929_120000.bak`), prevenindo regressões acidentais.
  - **Instalador de Arquivos Locais**: Aba para selecionar executáveis (`.exe`) ou pacotes compactados (`.zip`) baixados manualmente no disco e instalá-los diretamente no diretório do módulo WinThor com criação preventiva de backup.
  - **Árvore de Rotinas CCW**: Navegação completa pela árvore oficial de módulos e rotinas disponibilizada pela PC Sistemas (com suporte a cookie de autenticação `suukie` em repouso seguro com AES-256-GCM).
  - **Modal Interativo na Interface (`CcwRoutineModal`)**:
    - Botão destacado no cabeçalho da página de Rotinas: *"Atualizar Rotina (CCW)"*.
    - Botão de atualização rápida no cartão de cada rotina do catálogo, preenchendo automaticamente o código e versão.
    - Recarregamento automático do catálogo local após cada download ou instalação.
  - **Configurações Centralizadas**:
    - Novos campos nas Configurações (Aba Geral / Diretórios): URL Base da CCW, Versão WinThor padrão e Cookie de Sessão opcional.
  - **Exposição Multi-Transporte (REST & MCP)**:
    - Rotas Express REST: `POST /api/routines/download-ccw`, `POST /api/routines/install-local`, `GET /api/routines/ccw-catalog`, `GET /api/routines/ccw-download-url`.
    - 4 novas ferramentas no Servidor MCP (totalizando 129 tools): `routines_download_ccw_routine`, `routines_install_local_file`, `routines_get_ccw_catalog` e `routines_get_ccw_download_link`.
- **Central de Ajuda & Documentação**:
  - Novo item de FAQ sobre download e atualização de rotinas da CCW com backup preventivo.
  - Atualização do Guia de Módulos (Catálogo de Rotinas) e visão geral do ecossistema.
  - Atualização do catálogo oficial de ferramentas em `docs/MCP_TOOLS.md` para 129 ferramentas com exemplos práticos.

## [1.16.0] - 2026-09-28
### Adicionado
- **Diagnóstico Inteligente de Dependências OSGi & Ações Rápidas em 1 Clique**:
  - **Parser Causal de Exceções de Resolução (`karafResolutionParser`)**: Extração profunda de erros `ResolutionException`, `Unable to resolve root` e `missing requirement` emitidos pelo Apache Karaf e Pax URL. O parser percorre a cadeia causal (`caused by:`), identifica o bundle impactado, o tipo de requisito (`osgi.wiring.package`, `osgi.identity`, `bundle`, etc.), o nome do pacote ou classe ausente e analisa filtros LDAP (ex.: `(&(osgi.wiring.package=...)(version>=1.39.0)(!(version>=2.0.0)))`) para extrair restrições de versão mínima, máxima ou intervalos.
  - **Correlação Automática com o `pom.xml`**: O Dev Manager inspeciona o `pom.xml` do projeto em compilação/deploy, correlaciona o pacote ausente com a lista de `<dependency>` do Maven (ignorando blocos comentados) e aponta com exatidão o `groupId`, `artifactId` e a versão esperada.
  - **Card Interativo de Ação Rápida no Console de Deploy**: Ao ocorrer falha de dependência, a interface de Deploy exibe um card destacado acima do terminal detalhando o pacote ausente, faixa de versão e opções imediatas com 1 clique:
    - **Executar Perfil de Deploy da Dependência**: Se houver um perfil ou projeto cadastrado correspondente (ex.: perfil `matcon`), permite executá-lo diretamente para compilar e instalar a versão local necessária no Karaf.
    - **Instalar Release do Nexus**: Dispara os comandos oficiais do Karaf (`feature:repo-add` e `feature:install`) para obter a release remota do repositório Maven.
    - **Verificar Bundles no Karaf**: Executa `bundle:diag` ou comando de diagnóstico de fiação para investigar bundles com falha de ativação.
  - **Diagnóstico no Console de Logs**: Banner formatado com o resumo da falha, módulo POM mapeado e comandos sugeridos injetado no stream de logs (`deploy:log-chunk`).
- **Central de Ajuda**:
  - Novo item de FAQ e atualização do Guia de Módulos cobrindo diagnósticos de resolução OSGi, pacotes ausentes e opções de recuperação em 1 clique.

### Corrigido
- **Timeouts Silenciosos em Resolução de Dependências Maven/Karaf**:
  - Prevenção de timeouts indeterminados causados por dependências ausentes tentando conexões remotas; agora a causa raiz é diagnosticada e apresentada com clareza ao desenvolvedor.

## [1.15.4] - 2026-09-25
### Corrigido
- **Catálogo de Rotinas & Execução de Processos (Eliminação do erro `spawn EFTYPE`)**:
  - **Lançamento Seguro de Processos (`launchProcessSafely`)**: No Windows, disparar executáveis via `child_process.spawn()` sem shell invoca `CreateProcessW` diretamente. Quando o executável requer elevação de privilégios UAC (Administrador), está sob lock de antivírus ou é um script/atalho, o sistema operacional retorna `ERROR_BAD_EXE_FORMAT` (193), traduzido pelo libuv como `spawn EFTYPE`. Criado o utilitário central `launchProcessSafely` em `src/main/utils/routineLaunchUtils.ts`, que no Windows delega a execução ao Shell (`cmd.exe /c start "<título>" /d "<diretório>" "<executável>" [args...]`), preservando o diretório de trabalho (`cwd`) essencial para o carregamento de DLLs e arquivos INI das rotinas Delphi compiladas e tratando elevações UAC transparentemente.
  - **Eliminação de Falso Fallback Concorrente no WinThor Start**: Quando o WinThor Start demorava mais de 3.000ms na inicialização a frio, o `launchViaWinthorStart` tratava a demora prematuramente como `winthorStartOffline: true` e imediatamente tentava fazer fallback para execução direta via `spawn()`. Essa concorrência instantânea com o WinThor Start ativo causava contenção de arquivos e disparava o erro `spawn EFTYPE`, enquanto o WinThor Start completava a abertura em segundo plano (fazendo a rotina abrir apenas no segundo clique). O tempo limite de requisição ao WinThor Start foi ampliado de 3s para 8s, e expirações (`WINTHOR_START_TIMEOUT`) ou erros da API do serviço (`WINTHOR_START_ERROR`) não mais disparam o fallback concorrente às cegas.
  - **Reconhecimento Estendido de Prefixos de Rotinas**: O extrator de códigos de rotinas (`extractRoutineCode`) agora reconhece prefixos de nomenclatura oficiais do ecossistema WinThor como `PC` (ex.: `PC1406.EXE`), `PCINF` (ex.: `PCINF000.EXE`), `PCROT` e `ROTINA`, além de `PCSIS` e `ROT`.
  - **Correção no Ciclo de Renovação de Token WTA**: Ao renovar o token expirado com sucesso após um retorno HTTP 401, o sinalizador `isAuthRejected` agora é resetado apropriadamente, assegurando que tentativas seguintes com o novo token não sejam bloqueadas.
  - **Resiliência em Aplicativos Externos e IDE**: O `WindowsService` (`launchIntelliJ` e `launchExternalApp`) também foi migrado para o `launchProcessSafely`, garantindo inicialização imune a falhas de `EFTYPE` ao disparar editores ou ferramentas terceiras.

### Adicionado
- **Ação de Contingência com 1 Clique na Interface de Rotinas**:
  - Quando o WinThor Start apresentar indisponibilidade, timeout de resposta ou recusa de credencial, o banner de alerta no Catálogo de Rotinas exibe imediatamente o botão interativo **"Tentar abrir direto (sem autenticação)"**, permitindo ao desenvolvedor abrir a rotina localmente de forma isolada sem precisar esperar ou desligar a integração nas configurações.
- **Central de Ajuda**:
  - Nova pergunta detalhada no FAQ da Central de Ajuda sobre a resolução do erro `spawn EFTYPE`, o papel do diretório de trabalho (`cwd`), a prevenção de concorrência com o WinThor Start e o funcionamento do inicializador seguro.

## [1.15.3] - 2026-09-25
### Corrigido
- **Catálogo Oficial WinThor / Rotina 801 & Karaf CLI (Timeouts e Isolamento de JVM)**:
  - **Eliminação de Timeout Prematuro (30s) em Comandos Pesados**: O `executeKarafCommand` possuía um tempo limite fixo e curto de 30.000ms (30s), insuficiente para comandos pesados como `feature:install`, `feature:repo-add` e `bundle:install` que realizam download de artefatos Maven remotos (Nexus/Artifactory) e resolução de pacotes OSGi. Comandos pesados agora contam automaticamente com até 300.000ms (5 minutos) de tolerância (e 180s para adição de repositórios), além de permitir especificação dinâmica de tempo limite por chamada.
  - **Isolamento do Agente OpenTelemetry no `client.bat`**: Corrigida injeção indevida do `opentelemetry-javaagent.jar` via `JAVA_TOOL_OPTIONS` nas ferramentas CLI (`client.bat`). O agente de APM destina-se exclusivamente ao container Karaf (`winthor.bat` / `karaf.bat debug`). Ao ser carregado no `client.bat`, ele introduzia sobrecarga de inicialização na JVM, hooks de rede e emitia logs informativos no `stderr` (`[otel.javaagent ...] INFO io.opentelemetry...`), que eram erroneamente capturados como avisos e falhas na interface.
  - **Sanitização de Ruídos de Stderr**: Criação da função `filterBenignStderr` no `KarafService` para descartar linhas de ruído benignas da JVM e do Karaf (`Picked up JAVA_TOOL_OPTIONS`, `client.bat: Ignoring predefined value for KARAF_HOME`, logs informativos do Otel), assegurando que apenas erros e exceções legítimas do container OSGi sejam reportados.
  - **Fechamento Automático de Stdin em Processos Batch**: O utilitário `runCapturedProcess` agora encerra imediatamente o stream de `stdin` (`proc.stdin?.end()`) para processos não interativos, prevenindo que ferramentas CLI ou shells fiquem bloqueados indefinidamente aguardando entrada do teclado.
  - **Aumento de Timeout na API da Ferramenta Servidor**: O timeout da requisição HTTP no modo API da Rotina 801 (`/winthor/ferramenta/servidor/v1/sistema/instala-com-dependencias`) foi ampliado de 60s para 180s (3 minutos) para acomodar instalações volumosas no servidor.
- **Tipagem Preload e Integridade do Build**:
  - Declarada a assinatura de `isKarafRunning: (sshPort?: number) => Promise<boolean>` na interface `ElectronAPI` (`electronAPI.d.ts`), eliminando inconsistências de tipagem TypeScript no `apiBridge.ts` e na página de Deploy.
- **Validação de Executável Karaf (`client.bat`)**:
  - Em `executeKarafCommand`, a validação de existência do executável do cliente Karaf no disco agora é executada antes do teste de conectividade da porta SSH, emitindo diagnóstico imediato e preciso caso o caminho esteja incorreto ou o arquivo não exista.
- **Detecção de Conexões Recusadas e Rede**:
  - Refatorado o utilitário `isConnectionRefusedError` em `routineLaunchUtils.ts` para inspecionar apenas propriedades reais do erro (`message`, `code`, `name` e `cause`), removendo a leitura direta de `err.stack` e evitando falsos-positivos com identificadores internos de runners de teste (`runWithTimeout`).
- **Testes Unitários & Central de Ajuda**:
  - Ajustados os mocks de `isKarafRunning` e `getKarafClientExecutable` nas suítes de testes (`Routine801Service.test.ts` e `KarafService.test.ts`).
  - Sincronizados todos os fallbacks de versão para `1.15.3` na Central de Ajuda (`HelpPage.tsx`) e no servidor MCP (`src/mcp/index.ts`).

### Adicionado
- **Seletor de Modo de Instalação na Rotina 801**:
  - Novo controle interativo no cabeçalho do Catálogo Oficial permitindo alternar com 1 clique entre o modo **Console Karaf** (execução via `client.bat` com telemetria em tempo real no console) e **API WTA** (disparo direto pelo endpoint REST da ferramenta servidor), proporcionando uma alternativa imediata e resiliente caso qualquer dos métodos encontre restrições locais.
- **Central de Ajuda**:
  - Seção do FAQ sobre a Rotina 801 atualizada com instruções sobre os modos de instalação, download de pacotes Maven pesados e timeouts estendidos.

## [1.15.2] - 2026-09-25
### Corrigido
- **Perfis de Deploy & Karaf CLI (Prevenção de Falsos Positivos)**:
  - **Detecção de Sessão Falha (`client.bat`)**: Corrigida falha crítica onde o `client.bat` no Windows retornava exit code `0` com a mensagem `"Failed to get the session."` quando o Karaf estava offline, fazendo com que o pipeline de deploy registrasse falsos sucessos (`"PERFIL EXECUTADO COM SUCESSO!"`). O parser de erros do `KarafService` agora reconhece adequadamente mensagens de falha de conexão SSH (`Failed to get the session`, `Connection refused`, `ConnectException`, `Session is closed`), sinalizando o erro real e emitindo dicas de diagnóstico para o desenvolvedor.
  - **Validação Prévia do Container OSGi**: Implementada checagem antecipada de disponibilidade do Apache Karaf (porta SSH 8101) em `DeployService.executeProfile`. Caso o perfil contenha etapas Karaf (`karaf-command`, `karaf-bundle`) e não inclua uma etapa de inicialização prévia, a execução é interrompida imediatamente antes do primeiro passo, evitando esperas de 60s+ em compilações Maven inúteis (`mvn clean install`).
  - **Proteção em `deploy` e `buildAndDeployMaven`**: Adicionada verificação prévia de status do Karaf também nos deploys diretos e nas instalações de features da Rotina 801 (`karaf_cli`).

### Adicionado
- **Serviço Central e Transportes (`isKarafRunning`)**:
  - Nova checagem `isKarafRunning` exposta no processo principal Electron (`karaf:is-running`), no preload (`window.electronAPI.isKarafRunning`), na API Web/Docker (`GET /api/karaf/status`) e no MCP (`karaf_is_running`), unificando o diagnóstico de conectividade SSH local.
- **Interface de Deploy**:
  - Banner contextual de alerta na tela de Deploy avisando quando o perfil ativo requer o Karaf mas o container OSGi se encontra offline, acompanhado de botão de ação rápida para iniciar o Karaf Embutido em modo debug diretamente da tela.
- **Documentação e Central de Ajuda**:
  - Nova pergunta no FAQ da Central de Ajuda detalhando o comportamento do `client.bat`, a importância da porta SSH e como resolver falhas de sessão.
  - Atualização do catálogo de ferramentas MCP (`docs/MCP_TOOLS.md`) para 125 ferramentas com a inclusão de `karaf_is_running`.

## [1.15.1] - 2026-09-24
### Corrigido
- **Rotina 801 (Catálogo Oficial do WinThor - Porta 8889)**:
  - **Resolução IPv4/IPv6 (Happy Eyeballs)**: Corrigida falha de comunicação falso-positiva onde a aplicação reportava que `http://localhost:8889` não estava respondendo (apesar da porta responder normalmente no navegador e cURL). No Windows com Node.js 18+, o `localhost` resolve primariamente para IPv6 (`::1`), enquanto a JVM do Apache Karaf/Jetty escuta apenas na pilha IPv4 (`127.0.0.1`). O utilitário central `httpRequest` agora adota o algoritmo Happy Eyeballs (RFC 8305) com `autoSelectFamily: true`, timeout de 250ms e fallback transparente e imediato para `127.0.0.1` em caso de recusa de conexão.
  - **Autenticação e Renovação Automática WTA**: Implementado envio dinâmico de credenciais de sessão (`suukie` cookie e header `Authorization: Bearer <token>`). Caso o catálogo responda com HTTP 401/403 (sessão expirada ou protegida), o serviço autentica automaticamente via `POST /winthor/autenticacao/v1/login` utilizando as credenciais salvas e repete a requisição de forma transparente.
  - **Diagnóstico Real de Erros na UI**: Substituído o banner fixo genérico de indisponibilidade pela exibição do motivo real retornado pela API (`reason`), prevenindo falsos diagnósticos de rede quando o servidor recusa autenticação ou o bundle não está instalado.
  - **Drawer de Conexão com Alternância Rápida**: Adicionados botões de atalho no modal para alternar instantaneamente a URL entre `http://localhost:8889` e `http://127.0.0.1:8889`.
  - **Sincronização de Inicialização**: Eliminada condição de corrida na montagem do modal, garantindo o carregamento prévio das configurações de autenticação antes da consulta ao catálogo.

### Adicionado
- **Central de Ajuda (FAQ)**: Incluído tópico de troubleshooting detalhado sobre a porta 8889 e a convivência entre pilhas IPv4/IPv6 no Karaf sob Windows, orientando como testar o endpoint e alternar para `127.0.0.1` caso a resolução de nomes local esteja instável.

## [1.16.0] - 2026-09-25
### Adicionado
- Pasta do release mais completa: o `npm run build:electron` passa a gerar também `LEIA-ME.txt` (instalação, links dos downloads opcionais e registro do MCP, com a versão preenchida), `instalar-extras.cmd` (instala o modelo do RAG e extrai o Oracle Instant Client colocados na pasta) e `mcp/`, um servidor MCP autossuficiente que roda com o próprio `Dev Manager.exe` instalado, sem Node.js nem código-fonte. Novos scripts `npm run build:mcp` e `npm run release:folder`.
- Central de Ajuda: FAQ "O que preciso baixar à parte?" com links do Oracle Instant Client, Visual C++ Redistributable, modelo do RAG e Ollama; o FAQ do MCP ganha o passo a passo para quem usa o app instalado.
- **APM & Traces**: nome do serviço reportado pelo Java Agent (`otel.service.name`) configurável pela UI (`settings.apmServiceName`, tela Como Conectar), com fallback genérico `karaf-app` no lugar do nome fixo `karaf-winthor`. O anexo automático do agente ao Karaf passa a ser opt-in via o toggle "Anexar o agente automaticamente" (`settings.apmInstrumentationEnabled`, desligado por padrão) — antes bastava o `opentelemetry-javaagent.jar` existir em `<karaf>/bin` para ser anexado sempre, poluindo o log do Karaf mesmo com ninguém olhando o APM.
- **Database Studio**: grade de resultados editável no estilo planilha quando o resultado vem de um `SELECT * FROM <tabela única>` (ex.: clique numa tabela na sidebar) — botão "Nova linha", duplo-clique para editar célula (com `[NULL]` para gravar nulo) e exclusão de linha pelo menu de contexto. `DatabaseService` ganha `insertRow`/`updateRow`/`deleteRow` (binds posicionais, validação de tabela/colunas como identificadores SQL, `UPDATE`/`DELETE` sem `WHERE` bloqueado por segurança), expostos nos três transportes sem duplicar lógica de negócio.
- Configurações: busca rápida entre as abas que realça o campo encontrado, toggle de exibir/ocultar nas credenciais WTA (senha e cookie de sessão, mesmo padrão já usado na senha do Karaf) e indicador de alterações não salvas (badge ao lado do botão Salvar + aviso ao tentar fechar a janela com edições pendentes).
- Banco de Dados: aviso de primeiro uso quando não há nenhuma conexão cadastrada, com atalho direto para criar uma ou abrir Configurações.
- Central de Ajuda: botão "Rever Tours das Telas" reativa os tours individuais de cada módulo (Banco, Rotinas, Deploy, Containers, Git...), que antes ficavam perdidos para sempre depois da escolha inicial de pular no modal de onboarding.
### Alterado
- Configurações: botões "Restaurar Padrões" (serviços monitorados, processos conflitantes, portas e fontes de log) passam a pedir confirmação e usam estilo destrutivo, evitando perda acidental de listas configuradas manualmente.

## [1.15.0] - 2026-09-24
### Adicionado
- **Statement Tracer (Oracle)**: nova aba no DB Studio com captura contínua de atividade (`v$session`/`v$sql`) rodando em segundo plano no processo do app (não no componente React) — sobrevive a trocar de aba ou navegar para outra página do Dev Manager, então dá pra iniciar a captura, ir disparar uma ação em outro app conectado ao mesmo Oracle e voltar depois para ver a linha do tempo de qual sessão rodou qual SQL. Intervalo de consulta configurável (2s a 30s, piso de 2s) e parada automática de segurança após 30 minutos. Consultas pontuais também ficam expostas via MCP (`db_get_oracle_active_sessions`, `db_get_oracle_recent_statements`).
- Tools MCP de captura contínua do Statement Tracer: `db_start_oracle_capture`, `db_get_oracle_capture_state` (com `limit`, padrão 50), `db_stop_oracle_capture` e `db_clear_oracle_capture`. A IA liga a captura, o usuário executa a ação no app/rotina e a IA lê quais SQLs rodaram. A captura é própria do servidor MCP e independente da iniciada na tela do app.
- **APM & Traces (OpenTelemetry)**: receptor OTLP/HTTP embutido (JSON ou Protobuf, com gzip/deflate), dashboard (vazão, latências p50/p95/p99, taxa de erros, % do tempo em banco, endpoints e queries lentas) e Traces Explorer (waterfall, atributos, SQL, stacktrace e decomposição do tempo entre banco, chamadas externas e aplicação). O Karaf iniciado pelo Cockpit anexa o `opentelemetry-javaagent.jar` automaticamente quando ele está em `<karaf>/bin`.
- Porta do receptor configurável em **APM & Traces → Como Conectar**: a porta nova é aberta antes de fechar a atual, então uma porta ocupada (ex.: por um OTel Collector/SigNoz local) não derruba o receptor em uso; o anexo automático do agente segue a porta escolhida.
- Tools MCP `apm_*` (overview, traces, detalhes, serviços e status do receptor). Como o servidor MCP roda em outro processo, elas consultam o buffer do app por uma API local do receptor — somente loopback, sem CORS e protegida por um token publicado na pasta de dados do usuário.
- **Git & Azure DevOps**: contagem de alterações pendentes de todos os repositórios (em lote, com concorrência limitada, só ao abrir/sincronizar a tela), link "Ver no GitHub/GitLab/Azure", seletor de branch de destino do PR montado a partir das branches reais do origin, lista de branches com filtro incluindo branches locais ainda não publicadas e branches que só existem no origin (o checkout cria a local rastreando o origin), aviso de HEAD destacado e suporte a remotes SSH/SCP, ao formato legado `{org}.visualstudio.com`, a worktrees/submódulos e a `packed-refs`.
- Tools MCP de leitura de Git: `git_get_status`, `git_get_diff` (com limite de tamanho configurável) e `git_get_commit_history`; `git_list_projects` ganha `includeUncommittedCount`.
- Onboarding: atualização de versão passa a mostrar só um resumo do changelog (sem resetar Welcome/Tour), e o tour inicial leva direto para Configurações quando faltam caminhos essenciais (repositórios/IDE).
- Catálogo de tools MCP (`docs/MCP_TOOLS.md`) passa a documentar as tools `apm_*` e `routine801_*`, além de 27 tools que existiam mas não estavam listadas (`env_batch_*`, `env_check_admin`, `env_launch_server_debug`, 13 tools `karaf_*` de console embutido/bundles/histórico, `profile_kill_port`, `profile_stop_step`, `routines_*`, `settings_*`, `system_check_path` e `system_auto_detect_paths`), com uma seção nova de Catálogo de Rotinas (123 tools no total).
- Central de Ajuda cobre as funcionalidades das últimas versões: card de **APM & Traces** no Guia dos Módulos e na Visão Geral, Statement Tracer no card de Banco de Dados, branches remotas/upstream/worktrees e GitHub/GitLab no card de Git, WinThor Start no card de Rotinas, e FAQs sobre o Statement Tracer, conexão do Java Agent ao receptor APM, WinThor Start/WTA e criptografia de segredos.
- **Notas de Versão e Guia de Instalação na Release**: geração automática dos arquivos `RELEASE_NOTES.md` (Markdown) e `LEIA-ME.txt` (texto puro com quebras CRLF para o Bloco de Notas) na pasta `release/` ao empacotar os instaladores (`npm run build:electron`) ou sob demanda via `npm run release:notes`. Os arquivos acompanham os executáveis com instruções claras para quem for instalar, comparativo entre o instalador padrão e a versão portátil, instruções sobre o Windows SmartScreen, requisitos de sistema e resumo das alterações desta versão.
### Alterado
- Nova identidade visual do ícone/logo (fundo índigo mais claro, fonte de luz e reflexo), aplicada ao `AppLogo`, `icon.svg`, `icon.png` e `favicon.ico`.
- Welcome do onboarding reduzido de 3 telas para 1 (saudação + escolha de tema + começar).
- Listagem de tabelas do DB Studio sobe o teto de 500 para 50.000 tabelas (schemas de ERP passam fácil de alguns milhares), com a sidebar renderizando a lista em blocos conforme o scroll.
- Cabeçalho do gerenciador de bundles do Karaf quebra linha em telas estreitas, com botões de altura uniforme.
### Segurança
- A URL do remote Git devolvida pela API web e pelo MCP tinha usuário/PAT embutidos (ex.: `https://user:PAT@dev.azure.com/...`) — agora é sanitizada.
- O `GitAzureService` passa a validar o caminho do projeto no próprio service (e não só nas rotas), recusando caminhos UNC que apontariam o git para `.git/config`/hooks de terceiros, já que IPC, servidor web e MCP o chamam diretamente.
### Corrigido
- `git checkout` de um nome sem branch correspondente (ex.: `.` ou `src`) descartava as alterações locais desses caminhos; agora o nome é sempre tratado como branch.
- Fetch/pull/push ficavam presos indefinidamente num prompt de credencial ou de host SSH sem resposta; agora têm tempo limite de 3 minutos, e o estouro encerra a árvore inteira de processos (credential helper, `git-remote-https`, `ssh`). O `git status` de segundo plano também tem limite e usa `--no-optional-locks` para não disputar o `index.lock` com a IDE.
- Commit & Push numa branch nova sem upstream dependia de casar a mensagem de erro do git em inglês (falhava com o git em português); agora detecta o upstream antes, publica em `origin` com o mesmo nome e configura o tracking. A existência de algo no stage também deixou de depender do idioma do git. Erros de commit aparecem dentro do modal (mantendo a mensagem digitada), e falha só no push fecha o modal com o aviso em destaque.
- Diff de arquivo não rastreado vinha vazio (passa a ser exibido como arquivo novo); cliques rápidos em arquivos diferentes podiam mostrar o diff errado; e o painel continuava exibindo branch/contagem anteriores após checkout ou commit.
- Onboarding: condição de corrida no primeiro uso reabria Welcome/Tour depois que o usuário já tinha pulado; o botão "Ver Tour Guiado" da Central de Ajuda reabria a introdução completa em vez de só o tour; e o botão "Pular introdução" não recebia clique de mouse real (coberto pelo container de conteúdo).
- O receptor OTLP descartava com resposta 200 o array JSON do exemplo cURL da própria tela de conexão (e JSON com espaço/BOM), tratados como protobuf; as rotas do servidor web não aceitavam protobuf — formato padrão do Java Agent — nem payloads acima de 100KB.
- Decoder protobuf endurecido contra payload malformado (um varint longo tinha custo quadrático e podia travar o processo principal) e contra zip bomb; payload grande passa a receber 413, que o exportador não retenta.
- A tela de APM não carregava dados no modo Web/Docker (`api` do apiBridge era capturado antes do `initApiBridge`).
- O % do tempo em banco contava spans SERVER aninhados e spans sem pai como tempo total, e a taxa de erro do cabeçalho virava 100% com o filtro "Erros" ativo.
- O drawer do trace selecionava o span errado, a aba Atributos mostrava sempre o mesmo span, a aba de erro não exibia o stacktrace e as queries SQL apareciam sem os números.
- `Alt+0` abria Configurações, embora o menu e o Quick Launcher o anunciassem como atalho do **APM & Traces**; agora abre o APM. A tabela de atalhos da Ajuda e do README dizia que `Alt+8` abria Configurações (abre Logs) e não citava `Alt+0`.
- A Central de Ajuda informava 73 tools MCP; são 123.

## [1.14.0] - 2026-09-23
### Adicionado
- Criptografia em repouso (AES-256-GCM) dos segredos gravados no `config.json` — senha do Karaf, senhas de conexão de banco, tokens do Confluence/Jira e API keys de provedores LLM, antes salvos em texto plano no disco.
- Fuzzy match com destaque de trecho correspondente e ordenação por relevância no Quick Launcher (`Ctrl+K`).
- Autenticação por API key também no handshake do WebSocket do modo Web/Docker (`/ws`): antes, um cliente que não fosse navegador podia se conectar sem enviar o header `Origin` e, com isso, contornar por completo a autenticação já exigida nas rotas REST — inclusive para enviar comandos ao Karaf embutido (`karaf:input`).
- Paridade do servidor MCP com IPC/REST para backup/restore de banco (`db_run_backup`, `db_list_backups`, `db_restore_backup`, `db_run_restore_drill`, `db_save_backup_config`, `db_list_backup_history`, `backup_test_webhook`) e para o observador de logs (`logs_check_file`, `logs_read_last_lines`, `logs_clear_file`) — nenhum dos dois tinha qualquer tool exposta a assistentes de IA até aqui.
- Verificação de build (`npm run build`) adicionada ao pipeline de CI, além de lint/typecheck/test.
### Alterado
- Code-split das páginas via `React.lazy`: bundle inicial do renderer reduzido de 1.19MB para 247KB.
- Documentação esclarece que o modo Web/Docker é single-tenant (sem isolamento por usuário).
- Lógica de preservação de credenciais existentes ao salvar configurações (antes duplicada em `registerIpc.ts` e `server/index.ts`, ausente no MCP) centralizada em `ConfigService.saveSettings`.
### Corrigido
- 35 erros de typecheck e a maior parte dos avisos pré-existentes do ESLint (52 no total) acumulados após a modernização do cockpit de containers, incluindo 3 falhas de teste que quebravam o CI desde então.
- Credenciais de webhook (`docSyncTargets`/`backupWebhooks`, usadas por sincronização de documentação e notificações de backup) ficaram de fora da criptografia em repouso acima e também não eram mascaradas em `GET /api/settings`/`settings:get` — trafegavam e ficavam gravadas em texto plano, diferente das demais credenciais. Corrigido; e a proteção contra reaproveitar uma credencial salva quando só o destino (host/URL) muda — que já existia para API keys de LLM só na importação de configurações — passou a valer para todo campo de segredo, em todo caminho de salvamento.
- Teste de isolamento de cache do `ConfigService` (`cada instância... não vaza entre instâncias`) dependia da resolução de mtime do sistema de arquivos e falhava esporadicamente; passou a forçar o avanço do mtime como o teste vizinho já fazia.

## [1.13.0] - 2026-09-21
### Adicionado
- **Integração WinThor Start (DataSnap REST) & WTA**:
  - Abertura de rotinas desktop do WinThor (extensões `.EXE`, `.PC`, etc.) através do serviço local **WinThor Start** (`http://localhost:9195`), permitindo iniciar telas com contexto autenticado sem necessitar do menu aberto.
  - Autenticação automática no portal WinThor Anywhere (WTA) via endpoint `POST /winthor/autenticacao/v1/login` para obtenção dinâmica de tokens e parâmetros de inicialização de rotinas (`matriculaWinthor`, `usuarioBd`, `senhaBd`, `serverBd`, `token`).
  - Suporte a payload de sessão fixo (`winthorStartDefaultPayload`) como contingência e fallback permanente.
  - Monitoramento nativo da porta `9195` (`WinThor Start (Launcher Delphi)`) e `8889` (`Portal Web Local (WTA)`) no cockpit de portas monitoradas.
  - Painel de configuração visual dedicado em **Configurações > Diretórios** e badge de status em tempo real no **Catálogo de Rotinas**.
  - Fallback automático para execução direta (`spawn`) ou launcher customizado caso o serviço local esteja inativo.
- **Distribuição & Assinatura de Código (Code Signing)**:
  - Pipeline de empacotamento com suporte ativo e validado à assinatura digital de binários (`.exe`, instalador NSIS e desinstalador) via certificado corporativo (`.env.codesign`), prevenindo bloqueios do Windows SmartScreen na distribuição interna.

## [1.12.0] - 2026-09-17
### Adicionado
- Sistema completo de Onboarding Guiado e Tours Interativos (`src/renderer/src/components/onboarding/`):
  - Tour global no cabeçalho apresentando as principais ferramentas e recursos do cockpit (Infraestrutura, Banco de Dados, Desenvolvimento, Busca Rápida `Ctrl+K`, Diagnósticos/Rede, Configurações e Atualização).
  - Tours interativos contextuais dedicados em todas as telas do cockpit (Ambiente, Containers, Banco de Dados, Deploy Karaf, Git/Azure DevOps, Logs, Documentação RAG, Rotinas WinThor e Configurações).
  - Coordenação inteligente (`tourCoordinator` e `usePageTour`) para evitar sobreposição, abrindo os tours por página apenas após o usuário concluir ou dispensar o tour inicial.
  - Persistência de progresso e conclusão salva individualmente no `localStorage`.
- Gerador automático e validador de ícones para distribuição Desktop (`scripts/generate-icons.cjs`):
  - Garante a presença e conformidade dos ícones `.ico` e `.png` (mínimo 256x256) no pipeline do Electron através do hook de npm `prebuild`.
  - Configuração explícita de ícone Windows em `electron-builder.json5`.

## [1.10.0] - 2026-09-16
### Adicionado
- Autocomplete no editor SQL da página de Banco de Dados: sugere palavras-chave, tabelas e colunas (com resolução de `alias.coluna` a partir das cláusulas `FROM`/`JOIN`); navegação por setas, `Tab`/`Enter` pra aceitar, `Esc` pra fechar.
### Corrigido
- Listagem de tabelas do PostgreSQL considerava só o schema `public`, ocultando tabelas de outros schemas — agora lista todos (exceto `pg_catalog`/`information_schema`), qualificadas como `schema.tabela`; `getTableColumns` resolve o schema correspondente.

## [1.9.1] - 2026-09-16
### Corrigido
- Testes de `BackupService` (placeholders, tokenização de comando, mascaramento de senha) usando `require()` num projeto ESM, quebrando a suíte (`Cannot find module`) — trocados por `import` normal.

## [1.9.0] - 2026-09-16
### Adicionado
- Comando de backup personalizado por conexão: template com placeholders (`{filePath}`, `{connectString}`, `{directory}`, etc.), tokenizado e executado via `execFile` (sem shell), bloqueando metacaracteres de encadeamento (`; & | < > \``) e mascarando a senha nos logs — `BackupService.runCustomCommandBackup`.

## [1.8.2] - 2026-09-16
### Corrigido
- Ações de serviço/processo da Automação (Karaf e perfis de deploy) agora checam o estado atual antes de agir — não tentam mais parar um serviço já parado ou iniciar um já em execução, eliminando falhas genéricas enganosas.
- Botão único e inteligente para as etapas de serviço Windows (`service-start`/`service-stop`) na Automação: o rótulo e a ação seguem o estado real do serviço (Iniciar/Parar), no lugar do par Executar/Parar que antes convergia pra mesma ação.

## [1.8.1] - 2026-09-16
### Corrigido
- Teste desatualizado de `formatErrorMessage` (ORA-01008) que ainda usava a assinatura síncrona antiga.
- Substituição de bind `NULL` não aplicada no modo `auto` do interpolador de SQL (`substituteBindVariables`).

## [1.8.0] - 2026-09-16
### Adicionado
- Editor de variáveis de bind (`:PARAMETRO`) na página de Banco de Dados: detecta placeholders no SQL antes de executar, abre modal pra preencher valores tipados (auto/string/number/date/null) e cacheia os últimos valores usados (`src/renderer/src/utils/sqlBinds.ts`).
- Execução de etapa individual de um Perfil de Deploy (Karaf/Docker/comando genérico) sem rodar o perfil inteiro (`DeployService.executeSingleStep`).

## [1.7.1] - 2026-09-16
### Corrigido
- Detecção de colisão de porta local identifica o processo real escutando a porta (via `tasklist`) e só alerta quando ele não parece ser o motor de banco esperado — antes disparava até contra o próprio banco local correto.
### Adicionado
- Progresso ao vivo (streaming) das ações de bundle Karaf (instalar, reinstalar, gerenciar ciclo de vida, desinstalar, atualizar versão) no Gerenciador de Bundles, em vez de só o resultado final ao término.

## [1.7.0] - 2026-09-15
### Adicionado
- Detecção de colisão de porta local em falha de autenticação de banco: quando o host é loopback, avisa sobre possível túnel SSH que perdeu a porta pra um serviço local já rodando.

## [1.6.1] - 2026-09-15
### Corrigido
- 15 achados de segurança/robustez identificados na revisão das melhorias de containers: injeção de comando via senha/distro WSL/nome de container, TLS desligado por padrão no build do Electron, `spawn('wt.exe')` sem handler de erro, salvamento de ambiente quebrado no modo web, tradução de caminho Windows→WSL ausente no compose/build, progresso de containers congelado no modo web, detecção de status Docker/WSL desatualizada, validações ausentes em handlers IPC, entre outros.

## [1.6.0] - 2026-09-15
### Adicionado
- Gerenciamento de containers Docker/Podman bem mais completo (`ContainersPage.tsx`) com suporte a WSL (`WslService.ts`).

## [1.5.0] - 2026-09-13
### Adicionado
- Histórico persistido de deploys/builds Karaf (`settings.karafDeployHistory`, até 200 entradas): botão "Histórico de Deploys" no Gerenciador de Bundles, `karaf_get_deploy_history` (MCP), `GET /api/karaf/deploy-history`, `karaf:list-deploy-history` (IPC).
- Notificações desktop (toast + notificação nativa) para deploy/build Karaf concluído ou falho, e para reindexação automática do RAG concluída (`NotificationService.ts`).
- Auto-reindex do RAG por observação de arquivos (`chokidar`): toggle "Reindexar automaticamente ao detectar mudanças" na aba Documentação.
- `JiraSource`: nova fonte do RAG multi-fonte — projetos/JQLs do Jira indexados como documentação, painel "Fontes Jira" na aba Documentação.
- Perfis de Ambiente (`settings.environmentProfiles`): presets nomeados dos diretórios/portas com "Salvar estado atual como perfil" e "Ativar".

## [1.4.0] - 2026-09-12
### Adicionado
- Ação `bundle:resolve` e visualizador de log real do Karaf no Gerenciador de Bundles.

## [1.3.2] - 2026-09-12
### Corrigido
- Mensagem de erro preservada em `/api/db/test` no modo web (antes era engolida/genérica).

## [1.3.1] - 2026-09-12
### Corrigido
- Mensagens de erro engolidas no modo web e rótulo de PR fixo no provider Azure DevOps.

## [1.3.0] - 2026-09-12
### Adicionado
- Export CSV do histórico de backup, presets de webhook, e melhorias em compose/karaf/confluence/drill.

## [1.2.0] - 2026-09-12
### Adicionado
- Webhook de backup, restore drill, PR multi-provider, Docker Compose, log Karaf persistido, fonte Confluence e auto-update.

## [1.1.0] - 2026-09-12
### Adicionado
- Melhorias no backup de banco: lock contra execuções concorrentes, retenção por idade, compressão, histórico e notificação.

---

### Já incluído no [1.0.0]
- `git_checkout_branch`, `env_launch_app` e gerência de bundles Karaf via MCP (`karaf_list_bundles`, `karaf_manage_bundle`, `karaf_install_bundle`, etc.) — commit `49ecb34`, anterior à tag `v1.0.0`.
