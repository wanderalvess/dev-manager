# Hub Manager 🚀

> **Cockpit e Painel de Automação Desktop Integrado para Desenvolvedores e Apache Karaf OSGi.**

Desenvolvido em **Electron + React + TypeScript + Tailwind CSS**, o **Hub Manager** centraliza e automatiza todas as tarefas rotineiras do dia a dia de desenvolvimento: liberação de portas e serviços conflitantes em segundo plano, inicialização de IDEs, disparo do contêiner OSGi em modo debug, deploy automatizado de features Maven no Karaf, gerenciamento de repositórios Git / Azure DevOps, catálogo de rotinas e central completa de ajuda e diagnósticos. Além do Cockpit desktop, todas essas automações também ficam disponíveis para assistentes de IA como o Claude Code via um **servidor MCP** embutido.

---

## 📸 Visão Geral dos Recursos

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                   HUB MANAGER                                                    │
├─────────────┬──────────────┬─────────────┬─────────────────┬──────────────┬────────────┬──────────┬────────┬─────────┤
│ ⚡ Ambiente │ 🗄️ Database  │ 🐳 Docker   │ 📦 Karaf Deploy │ 🔀 Git/Azure │ 📑 Rotinas │ 📚 Docs  │⚙ Config│ ❓ Ajuda│
├─────────────┴──────────────┴─────────────┴─────────────────┴──────────────┴────────────┴──────────┴────────┴─────────┤
│ • Pipeline 1-Clique (Stop Srv -> Kill -> Launch IDE -> Servidor Debug)                                           │
│ • Database Studio Multi-Vendor (Oracle, Postgres, MySQL): Inspetor, Snippets, Statement Tracer com Binds         │
│ • Docker Cockpit: CPU/RAM em Tempo Real (docker stats), Terminal Interativo (docker exec) e Inspeção de Logs    │
│ • Karaf OSGi Deployer: Snapshots/Diff, Diagnóstico Causal OSGi, Memória JVM (JMX) e Features/Repos Maven         │
│ • Hub Git & Azure DevOps: Sincronização, Visualizador de Diff de Arquivos e Criação de Branch por Tarefa         │
│ • Catálogo de Rotinas (.EXE/.PC): Download CCW, Histórico & Rollback (.bak), Versão PE Header e Lote             │
│ • APM & Traces (OpenTelemetry): Waterfall com Régua Semântica (HTTP/Java/JDBC) e Detecção de Top Lentos         │
│ • Logs em Tempo Real: Tail contínuo com Log Analyzer e Destaque de Exceções WinThor (ORA, NPE, OSGi, OOM)       │
│ • RAG & IA Local: Busca semântica (FastEmbed), Conectores Confluence/Jira, Assistente IA (BYOK) e DocSync         │
│ • Quick Launcher Spotlight (Ctrl+K) e Navegação Global por Teclado (Alt+0 .. Alt+9)                              │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🌟 Funcionalidades Detalhadas

### 1. ⚡ Cockpit & Preparação do Ambiente Dev
* **Pipeline Master de 1 Clique:**
  1. **Parada de Serviços Windows:** Interrompe serviços em segundo plano para liberar portas e comunicação.
  2. **Finalização de Processos:** Encerra processos em segundo plano que causam travas de portas ou arquivos.
  3. **Pausa de Segurança:** Aguarda liberação de sockets de rede e travas em arquivos de disco.
  4. **Inicialização da IDE:** Identifica e abre a IDE configurada (IntelliJ IDEA, VS Code, Cursor, Eclipse, etc.).
  5. **Disparo do Servidor Debug:** Inicializa o script de inicialização do Karaf em modo integrado no próprio painel ou em janela externa desvinculada.
* **Console Integrado OSGi:** Terminal interativo com streaming ao vivo e envio de comandos Karaf em tempo real (`bundle:list`, `la`, `feature:list`, `log:tail`, etc.).
* **Monitor de Portas de Rede em Tempo Real:**
  * Monitoramento contínuo de status e PID de portas essenciais: `:8889` (Portal Web), `:8101` (Karaf SSH), `:5005` (Java Remote Debug), `:1521` (DB Listener) e portas customizadas.
* **Controles Individuais:** Botões para iniciar/parar serviços separadamente, matar processos e abrir rotas web (`:8889` e `:8889/system/console`).

---

### 2. 🗄️ Database Studio Multi-Vendor & Central de Backup
* **Suporte a Múltiplos Bancos de Dados:**
  * Conexão e execução direta para **Oracle Database** (`oracledb`), **PostgreSQL** (`pg`) e **MySQL** (`mysql2`).
  * Conexões salvas localmente com teste instantâneo de conectividade e status visual.
* **Inspetor de Tabelas e Colunas:**
  * Barra lateral com listagem dinâmica de tabelas e expansão sob demanda para exibir colunas, tipos de dados, chaves primárias (PK) e nulabilidade.
  * Inserção rápida de nomes de colunas ou cláusulas `SELECT` no editor com 1 clique.
* **Histórico Persistente de Consultas:**
  * Registro automático de queries executadas com tempo de resposta em milissegundos e quantidade de linhas retornadas, salvo localmente.
  * Reutilização, cópia rápida ou reexecução direta a partir do histórico (`Ctrl + Enter` para executar).
* **Biblioteca de Snippets Rápidos e Customizados:**
  * Snippets de fábrica (`SELECT`, `COUNT`, `JOIN`, `DDL`) e criação de snippets próprios do desenvolvedor para acelerar consultas recorrentes.
* **Statement Tracer (Oracle) & Captura Nativa de Binds:**
  * Aba dedicada com captura contínua de `v$session`/`v$sql` rodando em segundo plano no processo do app — inicia com um clique e continua capturando mesmo se você trocar de aba ou página.
  * Linha do tempo de qual sessão passou a rodar qual SQL e lista de instruções distintas vistas no cursor cache, com filtros por schema/texto e intervalo configurável (2s–30s).
  * **Captura de Parâmetros (Binds) via `v$sql_bind_capture`**: Inspecione sob demanda os parâmetros passados na execução de queries Oracle (`:1`, `:NOME`, etc.) com tipo de dado, posição e valor capturado real.
  * **Interpolação de SQL Executável (`oracleSqlInterpolator`)**: Substituição inteligente dos marcadores pelos literais formatados (strings com escape, números, datas com `TO_DATE` e `NULL`), preservando comentários e literais existentes.
  * **Eliminação de `log:set trace root` no Karaf**: Depure queries Delphi e serviços Java/OSGi direto no banco sem poluir o `karaf.log`, degradar a JVM ou depender de softwares externos (`OraTracer.exe`).
  * **Inspetor Dedicado (`StatementInspector`)**: Tabela de binds com botões *"Copiar SQL"* e *"Usar no Editor"*, transferindo a query já interpolada direto para a aba de execução SQL.

#### 🛡️ Central de Backup & Restauração Integrada (5 Abas de Controle)
O Hub Manager conta com uma central avançada de backup acessível pelo botão **Backup & Restore**:
1. **Executar Backup:**
   * Seleção de banco/schema, escolha da pasta de destino com seletor nativo e alternância entre **Modo Padrão** e **Comando Personalizado**.
   * Console de terminal integrado com streaming de log ao vivo da saída da ferramenta CLI (`expdp`, `exp`, `pg_dump`, `mysqldump`).
   * Cálculo automático de hash de integridade **SHA-256**, tamanho do arquivo e tempo de execução.
2. **Agendamento & Retenção:**
   * Criação de agendamentos automatizados com expressões **Cron** (ex: `0 2 * * *` para diário às 02h00).
   * **Política de Retenção Inteligente:** expurgo automático configurável por dias de retenção (`maxAgeDays`) ou quantidade máxima de backups (`maxCount`), liberando espaço em disco sem intervenção manual.
3. **Gerenciador de Arquivos de Dump:**
   * Inventário local dos backups gerados na pasta de destino com data, tamanho, hash SHA-256, botão de exclusão e atalho de restauração imediata.
4. **Histórico de Execuções:**
   * Auditoria completa com filtros de status (*Sucesso*, *Falha*, *Executando*), duração e modal para inspeção do log completo de saída.
5. **Webhooks de Notificação:**
   * Disparo automático de notificações HTTP para canais do **Discord**, **Slack** ou **Microsoft Teams** ao concluir ou falhar um backup.

#### ⚙️ Modo de Comando Personalizado & Compatibilidade Oracle (11g vs 12c vs 19c)
Ambientes de desenvolvimento do ecossistema WinThor frequentemente utilizam diferentes versões do Oracle:
* **Incompatibilidade de Versões no Data Pump (`expdp`):** Ao exportar dados entre instâncias 19c e 11g/12c, o `expdp` padrão pode gerar dumps incompatíveis. Ativando o comando personalizado, você pode incluir facilmente parâmetros como `VERSION=11.2` e `EXCLUDE=STATISTICS`.
* **Oracle em Servidor Remoto ou Docker (`exp` clássico):** O utilitário `expdp` roda estritamente no servidor e grava o dump no diretório interno `DATA_PUMP_DIR`. Em ambientes onde o desenvolvedor não tem acesso ao sistema de arquivos do servidor, basta usar o preset do utilitário clássico **`exp`**, que grava o arquivo `.dmp` diretamente no disco local da máquina do cliente.

#### 🏷️ Tabela de Placeholders Dinâmicos
Ao personalizar comandos de backup, utilize os seguintes marcadores dinâmicos que são substituídos em tempo de execução:

| Placeholder | Descrição | Exemplo de Saída |
| :--- | :--- | :--- |
| `{filePath}` | Caminho absoluto do arquivo gerado *(obrigatório `{filePath}` ou `{fileName}`)* | `C:\backups\db_backup_20260916.dmp` |
| `{fileName}` | Nome do arquivo de dump com extensão | `db_backup_20260916.dmp` |
| `{folder}` | Pasta de destino selecionada | `C:\backups` |
| `{host}` | Host / IP do servidor de banco | `192.168.1.100` ou `localhost` |
| `{port}` | Porta de conexão do banco de dados | `1521` (Oracle), `5432` (PG), `3306` (MySQL) |
| `{user}` | Usuário autenticado | `SYSTEM` ou `postgres` |
| `{password}` | Senha do banco (mascarada na UI, injetada na execução) | `******` |
| `{connectString}` | String de conexão Oracle no formato `host:port/service` | `localhost:1521/XEPDB1` |
| `{schema}` | Schema ou usuário alvo selecionado | `PRODUCAO` |
| `{database}` | Nome da base de dados ou SID/Service | `winthor` |
| `{timestamp}` | Carimbo de data/hora atual no formato `YYYYMMDD_HHmmss` | `20260916_103000` |

#### ⚡ Presets de Fábrica com 1 Clique
* **Oracle Data Pump Padrão:**
  ```bash
  expdp {user}/{password}@{connectString} schemas={schema} directory=DATA_PUMP_DIR dumpfile={fileName} logfile=expdp_{timestamp}.log reuse_dumpfiles=y
  ```
* **Oracle Data Pump Compatível 11g / 12c:**
  ```bash
  expdp {user}/{password}@{connectString} schemas={schema} directory=DATA_PUMP_DIR dumpfile={fileName} logfile=expdp_{timestamp}.log version=11.2 exclude=statistics reuse_dumpfiles=y
  ```
* **Oracle Utilitário Clássico (Exportação Local Direta):**
  ```bash
  exp {user}/{password}@{connectString} file="{filePath}" log="{folder}/exp_{timestamp}.log" owner={schema} direct=y statistics=none
  ```
* **PostgreSQL (`pg_dump` custom format):**
  ```bash
  pg_dump -h {host} -p {port} -U {user} -F c -b -v -f "{filePath}" {database}
  ```
* **MySQL (`mysqldump` transacional):**
  ```bash
  mysqldump -h {host} -P {port} -u {user} -p{password} --single-transaction --quick {database} > "{filePath}"
  ```

#### 🧪 Prática Recomendada: Restore Drill em Banco Scratch / Teste
Antes de descartar cópias antigas ou aplicar rotinas de produção, utilize a função de **Restauração** em um banco de teste temporário (*scratch database*). Isso garante a validação da integridade física e lógica do arquivo de dump sem nenhum risco de sobrescrita acidental no ambiente principal.

#### 🔒 Segurança Operacional
* **Execução Segura:** Comandos são executados internamente via `execFile` sem inicialização de interpretador de terminal arbitrário (`cmd.exe`/`sh`), prevenindo shell injection.
* **Proteção de Credenciais:** As senhas são mascaradas (`****`) por padrão no editor de comando, com botão de alternância de visibilidade para conferência temporária antes do disparo.


---

### 3. 📦 Gerenciador de Containers (Docker & Podman)
* **Compatibilidade Corporativa Multimotor (Docker & Podman):**
  * Auto-detecção inteligente do motor disponível (`docker` ou `podman`), permitindo operação completa em redes corporativas com restrições ao Docker Desktop.
* **Métricas de Recursos em Tempo Real:**
  * Exibição de consumo de **CPU (%)** e **Memória RAM** (`uso / limite e %`) diretamente no card de cada container via `stats --no-stream`.
* **Terminal Interativo Integrado (`exec -it`):**
  * Disparo com 1 clique de uma janela de terminal interativa conectada ao container (`sh` ou `bash`).
* **Controle de Ciclo de Vida & Logs:**
  * Iniciar, parar, reiniciar, remover containers e inspecionar logs com seleção de quantidade de linhas e cópia para área de transferência.

---

### 4. 📦 Deployer OSGi Apache Karaf & Gerenciador de Bundles
* **Auto-Detecção Inteligente via `pom.xml` e `deploy-local.bat`:**
  * Lê automaticamente `groupId`, `artifactId`, `version` e módulos ao selecionar qualquer projeto Git.
* **Snapshots de Estado e Comparativo Pós-Deploy (Diff):**
  * Salve "fotos" do estado de todos os bundles do Karaf e compare com o estado atual.
  * Identificação instantânea de versões atualizadas, novos bundles adicionados, bundles ausentes e componentes que mudaram de estado (ex: Active -> Resolved).
* **Árvore Hierárquica de Dependências OSGi:**
  * Visualização gráfica conectando o bundle selecionado aos seus bundles clientes dependentes (consumidores) e pacotes importados/exportados.
* **Diagnóstico Inteligente de Resolução OSGi (`ResolutionException`):**
  * Parser causal automático de falhas `ResolutionException` e `missing requirement`, identificando o pacote ausente e analisando filtros de versão.
  * Correlação automática com o `pom.xml` e card de ação rápida em 1 clique para executar o perfil local da dependência ou instalar a release do Nexus.
* **Monitor de Memória Heap da JVM (JMX / Karaf):**
  * Telemetria contínua com gráfico SVG em tempo real de consumo de Heap e Non-Heap (Metaspace), alertas automáticos de risco de OutOfMemoryError (70% aviso, 85% crítico) e botão de 1 clique para executar Garbage Collection (GC).
* **Gerenciador de Features Maven e Repositórios Karaf:**
  * Interface dedicada para listar repositórios (`feature:repo-list`), atualizar (`repo-refresh`), cadastrar novas URLs Maven e instalar/desinstalar features OSGi com filtros por rotinas WinThor.
* **Gerenciamento Seguro de Bundles:**
  * Instalação via Maven/JAR/Projeto, atualização in-place de versão (`bundle:update`), reinstalação com rebuild Maven opcional e desinstalação com análise de risco de fiação.

---

### 5. 🔀 Git & Azure DevOps Hub
* **Varredura Automática de Repositórios:**
  * Localização automática de todos os projetos clonados na pasta de repositórios.
  * Detecção instantânea da branch atual ativa e contador de arquivos modificados (*uncommitted changes*).
* **Visualizador de Diff de Arquivos & Ação "Abrir na IDE":**
  * Painel dedicado de arquivos modificados com badges semânticos (`M` Modificado, `A` Adicionado, `D` Deletado, `?` Não rastreado, `R` Renomeado).
  * Modal visual de diff com realce de sintaxe colorido (linhas verdes para inserções, vermelhas para remoções) para inspecionar arquivos individuais ou o repositório completo antes do commit.
  * Botão em 1 clique para abrir o arquivo diretamente no IntelliJ IDEA ou no editor padrão configurado.
* **Criação Integrada de Branch por Tarefa (Azure DevOps & Jira):**
  * Modal inteligente com extração e parsing automático de IDs de tarefas e títulos a partir de URLs (`/workitems/edit/10482`, `/browse/SRE-1234`) ou texto livre.
  * Busca integrada de tarefas via API REST (WIQL no Azure DevOps e JQL no Jira) usando o PAT/Token configurado.
  * Geração de slug normalizado sem acentos, prefixos padronizados (`feature/`, `bugfix/`, `hotfix/`), escolha de branch base e validação estrita de nomenclatura Git.
* **Ações Rápidas de Sincronização:**
  * Botões diretos para `git fetch`, `git pull`, `git stash` e `git stash pop` sem precisar abrir o terminal.
* **Gerador de Pull Request no Azure DevOps:**
  * Reconhece organizações, projetos e repositórios hospedados no Azure DevOps (HTTPS e SSH).
  * Monta a URL de criação de PR comparando a branch de trabalho com a branch de destino (`develop`, `master`, etc.) e abre diretamente no navegador.

---

### 6. 📑 Catálogo & Lançador de Rotinas
* **Varredura Completa do Diretório Configurado:**
  * Reconhece executáveis (`.EXE`) e rotinas compiladas (`.PC`) organizadas por módulos funcionais.
* **Integração com a Central de Controle WinThor (CCW):**
  * Download direto da nuvem TOTVS/PC Sistemas (`centraldecontrole.pcinformatica.com.br`) por código numérico (ex: `132`, `316`) ou módulo e versão (padrão `30`).
  * Descompactação automática de arquivos compactados `.ZIP` em memória sem depender de ferramentas externas.
  * Navegação na árvore oficial de módulos e rotinas disponibilizada pela Central de Controle.
* **Gerenciador de Rollback de Rotinas (.bak) com Reversibilidade Segura:**
  * Criação automática preventiva de cópia `.bak` com timestamp antes de qualquer substituição de executável em `Prod`.
  * Histórico de versões anteriores com data/hora, tamanho e botão de 1 clique para restaurar versão de backup com cópia prévia de segurança (`_pre_rollback.bak`).
* **Leitura de Versão do Executável (PE Header / FileVersion):**
  * Parser nativo em TypeScript de baixo custo de I/O que extrai `FileVersion` e `ProductVersion` diretamente do cabeçalho binário `.rsrc`, exibindo badges verdes nos cartões para validação instantânea contra a CCW.
* **Download e Atualização em Lote (Batch Download):**
  * Atualização simultânea em 1 clique de todas as rotinas favoritas ou de um módulo funcional inteiro, com barra de progresso em tempo real.
* **Lançador Seguro de Processos & WinThor Start:**
  * Inicialização via shell do Windows (`launchProcessSafely`) imune a erros `spawn EFTYPE`, com preservação do diretório de trabalho (`cwd`) essencial para DLLs Delphi e suporte a UAC.
  * Abertura autenticada via WinThor Start / WTA com alerta de status e botão de contingência para abertura direta.
* **Filtros e Sistema de Favoritos:**
  * Busca por código da rotina ou nome, filtro por módulo funcional e fixação de favoritas com estrelas (★).

---

### 7. 📚 Central de Documentação, RAG & Assistente IA Integrado
O **Módulo de Documentações** do Hub Manager transforma a base documental técnica dispersa do projeto em uma **central de conhecimento viva, pesquisável e acionável por Inteligência Artificial**. Ele funciona simultaneamente como catálogo centralizado para consulta rápida do desenvolvedor e como **motor de RAG (Retrieval-Augmented Generation)** tanto para o Assistente IA embutido quanto para agentes externos via servidor MCP.

#### 🧠 1. Motor de Busca Semântica Local com Embeddings Neurais (FastEmbed)
* **Por que Vetorizar? (Busca Semântica vs. Ctrl+F tradicional):**
  * **Busca Textual Tradicional (Ctrl+F):** Exige exatidão literal de palavras. Se você buscar por *"saldo de mercadorias"* e o documento registrar *"estoque disponível"*, a busca textual comum não encontra nada.
  * **Busca Semântica com Embeddings:** O modelo neural local **FastEmbed** (`sentence-transformers/all-MiniLM-L6-v2`) converte cada trecho de texto em um vetor matemático de 384 dimensões que codifica seu significado contextual.
  * Perguntas em linguagem natural (ex: *"como consultar saldo disponível na filial no faturamento?"*) localizam os trechos mais relevantes por proximidade geométrica (similaridade de cosseno), superando variações de vocabulário, sinônimos e jargões técnicos.
* **Algoritmo Híbrido com Boost Textual:**
  * O motor combina a similaridade vetorial com pontuação de correspondência textual direta (relevância BM25/keywords) em títulos e no corpo do texto. Se houver correspondência exata de termos críticos, o resultado recebe um reforço (*boost*) automático no ranking.
* **Privacidade Absoluta e Execução 100% On-Device:**
  * A geração de vetores ocorre estritamente na CPU da máquina do desenvolvedor. Nenhum documento, código-fonte ou texto interno é enviado para a nuvem para fins de vetorização.
* **Chunking Inteligente e Processamento em Lote:**
  * Divisão automática de documentos em blocos com limite de 800 caracteres e sobreposição (*overlap*) de 100 caracteres entre parágrafos, preservando a coerência nas bordas de cada trecho.
  * Vetorização em lotes paralelos (`passageEmbed` em lotes de até 32 trechos), maximizando o throughput da CPU.
* **Cache Incremental por Timestamp (`mtimeMs`):**
  * O índice armazena o carimbo de modificação de cada arquivo. Em reindexações sucessivas, arquivos inalterados são reaproveitados instantaneamente do cache, reduzindo o tempo de varredura para menos de 1 segundo.

#### 🌐 2. Fontes Híbridas de Documentação (Locais e Remotas)
O módulo agrega dados de múltiplos pontos de origem em um único índice unificado:
* **Pastas Locais Dedicadas:**
  * Cadastro de diretórios adicionais de documentação salvos na máquina ou em compartilhamentos de rede (ex: `prompt-hub/docs`, manuais de arquitetura, contratos de API).
* **Varredura Opcional de Projetos Git:**
  * Toggle configurável (`indexProjectsDocs`) para descobrir e indexar automaticamente todos os arquivos de documentação presentes nos repositórios Git clonados.
* **Amplo Suporte a Formatos de Arquivo:**
  * **Documentos Textuais:** Markdown (`.md`), MDX (`.mdx`) e Texto Puro (`.txt`).
  * **Documentos Binários com Extração Dinâmica de Texto:**
    * **PDF (`.pdf`):** Extração de texto em tempo de execução via `pdf-parse`, com supressão inteligente de marcadores de página para evitar ruídos vetoriais.
    * **Microsoft Word (`.docx`):** Extração de texto formatado via `mammoth`.
* **Conector Atlassian Confluence Integrado:**
  * Conexão nativa via REST API v1 (`/wiki/rest/api/content`), compatível com **Confluence Cloud** e **Confluence Server / Data Center**.
  * Autenticação flexível: Personal Access Token (Bearer) ou Basic Auth (e-mail + API Token).
  * Filtragem por chave de espaço (`spaceKey`) com paginação automática.
  * Sanitização de marcação HTML interna para texto limpo.
  * **Processamento de Anexos:** Baixa e extrai automaticamente o texto de arquivos `.pdf` e `.docx` anexados diretamente às páginas do Confluence (até 10 anexos por página, até 20MB cada).
  * Botão de teste de conexão com diagnóstico em tempo real.
* **Conector Atlassian Jira Integrado:**
  * Conexão via REST API v2 (`/rest/api/2/search` e `/rest/api/2/issue/{key}`).
  * Filtragem por chave de projeto (`projectKey`) ou consulta avançada via **JQL** customizado.
  * Transforma cada issue/tarefa em um documento indexável contendo chave, resumo, descrição e todos os comentários trocados pela equipe técnica.
  * Botão de teste de conexão instantâneo.

#### 🤖 3. Assistente IA Integrado com Síntese RAG (BYOK - Bring Your Own Key)
Além de buscar trechos manualmente, o desenvolvedor pode interagir com o **Assistente IA Integrado** através do botão **"Perguntar à IA"**:
* **Arquitetura RAG Precisa:**
  * A dúvida do usuário recupera os trechos mais relevantes do índice local (Top-K) e os injeta como contexto factual estrito para o modelo de linguagem.
  * A IA sintetiza a resposta com fundamentação técnica sólida, eliminando alucinações sobre tabelas, rotinas WinThor e regras de negócio.
* **Múltiplos Provedores de IA Nativamente Suportados:**
  * **Google Gemini:** `gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-1.5-pro`.
  * **OpenAI Oficial:** `gpt-4o-mini`, `gpt-4o`, `gpt-4.5-preview`, `o3-mini`.
  * **Anthropic Claude:** `claude-3-5-sonnet`, `claude-3-5-haiku`, `claude-3-opus`.
  * **Ollama (100% Offline / Local):** `llama3.2`, `deepseek-r1`, `qwen2.5-coder`, `mistral` (execução local privada na máquina sem custo de API).
  * **OpenAI-Compatible Customizado:** Integração com qualquer servidor local ou gateway (LM Studio, vLLM, LocalAI, OpenRouter).
* **Painel de Configuração de LLM (DocSettingsModal):**
  * Gerenciamento de múltiplos provedores com definição do provedor ativo com 1 clique.
  * Ajuste fino de parâmetros: Base URL, Chave de API mascarada, Modelo, Temperatura (padrão 0.3 para respostas ancoradas), Max Tokens e Timeout (ms).
  * **System Prompt Customizável:** Pré-configurado com diretrizes especializadas para engenharia de software e ecossistema WinThor ERP/TOTVS, com opção de personalização total pelo desenvolvedor.
  * Teste de conectividade com medição de latência em tempo real (ms).
* **Interface de Síntese Inteligente:**
  * Exibição formatada em Markdown com suporte a blocos de código com destaque de sintaxe.
  * **Listagem de Fontes Utilizadas:** Cards clicáveis indicando os documentos que embasaram a resposta e seus respectivos graus de relevância percentual.
  * Ações rápidas para **Copiar Resposta** e **Regenerar**.

#### 👁️ 4. Monitoramento em Tempo Real (Auto-Reindex com Chokidar Watcher)
* **Observação Contínua de Disco:**
  * Monitora alterações no sistema de arquivos das pastas locais e projetos Git cadastrados.
* **Debounce Inteligente (2000ms):**
  * Quando múltiplos arquivos são modificados em rajada (ex: troca de branch com `git checkout`, `git pull` ou *Save All* da IDE), o watcher aguarda o término das alterações antes de disparar a reindexação automática.
* **Feedback Visual:**
  * Notificações discretas na conclusão informam o desenvolvedor assim que as novas alterações são integradas à base semântica.

#### 📖 5. Catálogo Completo & Leitor Integrado (MarkdownReader)
* **Catálogo de Documentos Indexados:**
  * Visão tabular em grid de todos os arquivos catalogados com identificador de fonte (`sourceLabel`), quantidade de trechos indexados e caminho relativo.
  * Filtro rápido por nome de documento em tempo real.
* **Leitor Embutido (MarkdownReader Modal):**
  * Visualização moderna e responsiva sem necessidade de abrir softwares externos.
  * Suporte a Markdown estendido (GFM): tabelas, listas de tarefas, blocos de código com destaque de sintaxe e citações.
* **Ações Rápidas de Produtividade:**
  * **Ler:** Abre a prévia formatada no leitor embutido.
  * **Editor:** Abre o arquivo instantaneamente na IDE configurada (VS Code, Cursor, IntelliJ, etc.).
  * **Pasta:** Revela o arquivo selecionado diretamente no Windows Explorer.

#### 📡 6. Sincronização Agnóstica de Documentação Vetorizada (DocSync)
Permite exportar a base de conhecimento local já processada para backends externos e plataformas web corporativas (como o **Espaço Ágil**):
* **Exportação Completa (Embeddings + Artigos):**
  * Transmite em lotes (`batchSize` configurável) os artigos consolidados com conteúdo unificado e seus respectivos trechos vetorizados (384 dimensões).
* **Modos de Sincronização:**
  * `all`: Envia tanto os artigos completos consolidados quanto os chunks vetorizados.
  * `articles`: Envia exclusivamente os artigos limpos (ideal para bases de conhecimento puramente textuais).
  * `chunks`: Envia exclusivamente os blocos e vetores (ideal para bancos vetoriais como Qdrant, Pinecone, Milvus ou pgvector).
* **Higienização Automática de Dados (`sanitizeDocPathInfo`):**
  * Remove estritamente letras de unidades Windows (`C:\`, `D:\`), barras invertidas e diretórios locais confidenciais antes do envio, gerando títulos limpos, categorias consistentes e tags seguras.
* **Identificadores Determinísticos SHA-256:**
  * Cada artigo recebe um ID exclusivo baseado em hash SHA-256 (`doc_<hash>`), garantindo idempotência e atualização in-place sem duplicação de registros no backend remoto.
* **Configuração de Destinos:**
  * Nome do destino, URL do endpoint, método HTTP (`POST` ou `PUT`), cabeçalho de autenticação customizado (`X-Api-Key`, `Authorization: Bearer`, etc.) e controle de ativação individual.

#### 🛡️ 7. Resiliência e Modo Offline Corporativo
* **Fallback Textual Automático (Zero Bloqueio):**
  * Caso o modelo neural ainda não tenha sido baixado ou a máquina esteja sem conexão externa, o sistema não trava: ele opera normalmente em **Modo de Busca Textual BM25 / Relevância**, permitindo pesquisar por palavras-chave em todos os documentos.
* **Guia de Instalação Offline Integrado:**
  * Modal explicativo com link direto e instruções detalhadas para download manual do arquivo `sentence-transformers-all-MiniLM-L6-v2.tar.gz` e extração no diretório `%APPDATA%\dev-manager\models\fast-all-MiniLM-L6-v2`, contornando bloqueios de proxy corporativo ou firewalls restritivos.

#### 🎓 8. Tour Guiado Integrado (Onboarding)
* Guia passo a passo interativo acessível pelo ícone de varinha mágica ✨ no topo da página.
* Apresenta aos novos desenvolvedores as principais áreas da interface:
  1. Barra de status e indicadores do modelo neural;
  2. Botão de configurações centrais (pastas, Jira, Confluence, LLMs);
  3. Disparo e acompanhamento da reindexação;
  4. Campo de pesquisa em linguagem natural;
  5. Filtros por fonte de documentação;
  6. Síntese contextual do Assistente IA;
  7. Catálogo e leitor integrado de documentos.

#### 🤖 9. Integração com Servidor MCP (Tools de RAG para Agentes de IA)
Para desenvolvedores que utilizam assistentes de codificação como **Claude Code**, **Cursor**, **GitHub Copilot Chat** ou **Antigravity**, o Hub Manager disponibiliza ferramentas MCP nativas:
* `rag_search_docs`: Executa buscas semânticas vetoriais ou textuais na base indexada, retornando trechos mais relevantes e seus caminhos.
* `rag_reindex_docs`: Dispara o processo de varredura e atualização de índices sob demanda diretamente via prompt da IA.
* `rag_index_status`: Consulta o total de documentos, trechos, fontes ativas e status do modelo neural.

---

### 8. ⚙️ Configurações & Personalização
* **Detecção e Configuração Flexível de Diretórios:**
  * Permite ao usuário configurar caminhos personalizados para diretórios de projetos, executáveis, banco de dados e servidor Karaf.
* **Gerenciador de Portas de Rede Monitoradas:**
  * Adição, remoção e alternância de portas monitoradas, com atalhos de adição rápida (`:8889`, `:8181`, `:8101`, `:5005`, `:1521`).
* **Suporte a Temas:**
  * Alternador entre **Dark Mode**, **Light Mode** e variante **Midnight**.

---

### 9. ❓ Central de Ajuda, FAQ e Diagnóstico
* **Diagnóstico do Sistema (Health Check):**
  * Verificação de saúde de binários essenciais (Node.js, Git, Java, Docker, Karaf client).
* **Base de Conhecimento e FAQ Integrado:**
  * Guia rápido de resolução de problemas comuns e atalhos operacionais.

---

### 10. 🤖 Servidor MCP — Automação via Assistentes de IA
* **Model Context Protocol (MCP) via stdio:**
  * Expõe as mesmas automações do Cockpit (Ambiente, Perfis, Karaf, Git & Azure, Rotinas, Configurações) como *tools* que um cliente MCP — como o Claude Code ou GitHub Copilot — pode chamar diretamente, sem passar pela interface gráfica.
* **166 Tools Organizadas por Domínio:**
  * Para detalhes e exemplos de como usar cada ferramenta, **[acesse o Catálogo Completo de Ferramentas MCP](docs/MCP_TOOLS.md)**.
  * O catálogo inclui ferramentas como: `system_*`, `env_*`, `profile_*`, `karaf_*` (gerência de bundles, diagnóstico de dependências OSGi, telemetria Heap/Metaspace JVM com alertas OOM, disparo de GC, gestão de repositórios/features Maven e Log Analyzer), `docker_*`/`container_*`, `git_*` (inspeção de diff, criação de branch por tarefas Azure DevOps/Jira e links de PR), `routines_*` (execução com WinThor Start, download CCW, rollback de `.bak`, versão PE Header e atualização em lote), `rag_*`, `settings_*`, `db_*` (Oracle/PostgreSQL/MySQL, backup/restore/restore drill, Statement Tracer com captura e interpolação de binds), `logs_*` (leitura pontual e limpeza de arquivos), `apm_*` (traces OTLP, waterfall analítico e top endpoints/queries lentas), `routine801_*`, `deploy_*`, `llm_*` e `network_*`.
* **Terceiro Consumidor da Mesma Camada de Serviços:**
  * Reaproveita exatamente as mesmas classes de serviço e validações de segurança (`isValidIdentifier`, `isSafeLocalPath`, `isSafeKarafCommand`) já usadas pelo IPC do Electron e pela API REST (`src/server`) — nenhuma lógica de negócio duplicada.
* **Protocolo Aberto — Funciona em Qualquer Cliente MCP:**
  * O servidor é MCP puro via stdio, sem nada específico de um cliente. Só muda o arquivo de registro:
  * **IntelliJ IDEA / GitHub Copilot:** `mcp.json` na raiz ou `.idea/mcp.json`, ou nativamente no JetBrains AI Assistant (**Settings ➔ Tools ➔ AI Assistant ➔ Model Context Protocol (MCP)**).
  * **Claude Code:** [`.mcp.json`](.mcp.json) na raiz — abra o projeto e rode `/mcp`.
  * **VS Code / GitHub Copilot Chat (agent mode):** [`.vscode/mcp.json`](.vscode/mcp.json).
  * **Google Antigravity:** [`.agents/mcp_config.json`](.agents/mcp_config.json) (workspace) ou `~/.gemini/config/mcp_config.json` (global).
* **Execução Manual:**
  ```bash
  npm run mcp
  ```
  Inicia o servidor MCP via stdio (`tsx src/mcp/index.ts`) — mesmo mecanismo do script `server` (REST/Docker), agora falando o protocolo MCP.

#### Uso a partir do release (sem o repositório)
O `npm run build:electron` gera `release/mcp/`: um bundle único do servidor (`dev-manager-mcp.mjs`), só os módulos nativos que não cabem no bundle (`oracledb`, `fastembed`/`onnxruntime-node`) e o launcher `dev-manager-mcp.cmd`. O launcher usa o próprio `Hub Manager.exe` instalado pelo Setup como runtime (Electron em modo Node, via `ELECTRON_RUN_AS_NODE`), então o usuário não precisa de Node.js nem do código-fonte. Sem o app instalado, cai para o Node.js 20+ do PATH. A versão portátil não serve de runtime, porque é extraída numa pasta temporária a cada execução.

1. Copie a pasta `mcp` para um local fixo (ex.: `C:\DevManager\mcp`).
2. Registre no assistente:
   ```bash
   claude mcp add dev-manager --scope user -- cmd /c C:\DevManager\mcp\dev-manager-mcp.cmd
   ```
   Em arquivos JSON (`.mcp.json`, `mcp.json` do VS Code ou `mcp_config.json` do Antigravity), use `"command": "cmd"` e `"args": ["/c", "C:\\DevManager\\mcp\\dev-manager-mcp.cmd"]` (no VS Code a chave raiz é `servers`, nos demais `mcpServers`).
3. Instalou o app fora da pasta padrão (`%LOCALAPPDATA%\Programs\Hub Manager`)? Defina a variável `HUB_MANAGER_EXE` com o caminho do `Hub Manager.exe` no campo `env` do registro.

Para gerar só essa pasta, sem empacotar o app: `npm run build:mcp`.

> ⚠️ **Nota de segurança:** o servidor MCP tem o mesmo poder que o próprio Cockpit — iniciar/parar serviços Windows, matar processos, rodar builds Maven e comandos Karaf. Ele roda localmente via stdio (sem porta de rede exposta) e é pensado para uso pelo mesmo desenvolvedor que já opera essas ações pela interface. Transporte remoto/HTTP não faz parte desta versão.

---

### 11. 📈 APM & Traces (OpenTelemetry)
* **Receptor OTLP/HTTP Embutido (porta 4318, configurável):**
  * Recebe traces em JSON ou Protobuf (com gzip/deflate) de qualquer aplicação instrumentada com OpenTelemetry.
  * No Karaf iniciado pelo Cockpit, basta colocar o `opentelemetry-javaagent.jar` em `<karaf>/bin`: o agente é anexado automaticamente, exportando via `http/protobuf` para `127.0.0.1` na porta configurada.
  * A porta pode ser trocada em **APM & Traces → Como Conectar** — útil quando outro coletor (OTel Collector, Jaeger, SigNoz) já ocupa a 4318. Se a nova porta falhar, o receptor continua na atual.
* **Dashboard & Top Lentos:**
  * Vazão (RPM), latências p50/p95/p99, taxa de erros, % do tempo gasto em banco, volume e latência dos últimos 15 minutos, endpoints mais acessados e ranking de queries lentas com atalho para o DB Studio.
  * Popover dedicado "Top Lentos" e presets rápidos (`🐢 Lentos`, `🗄️ Queries Lentas`, `🌐 Endpoints Lentos`) com alternância de ordenação por latência decrescente (`Mais Lentos`).
* **Traces Explorer & Waterfall Semântico (Time Budget):**
  * Filtros por serviço, erros, lentidão, SQL e faixa de latência; visualização em cascata (Waterfall) com régua de tempo visual dividindo proporcionalmente o tempo entre **Requisição HTTP**, **Processamento Java** e **Queries JDBC no banco**.
  * Chips interativos por camada com opacidade dinâmica, destaque automático do gargalo principal e tags de lentidão (`⚡ Lenta`) em spans que ultrapassam limites aceitáveis.
* **Buffer em Memória:**
  * Até 5.000 traces (100 mil spans, 2 mil por trace), descartando os menos recentes — nada é gravado em disco.
* **Integração com Assistentes de IA:**
  * As tools `apm_*` do servidor MCP consultam o buffer do app por uma API local do receptor (somente loopback, protegida por token e sem CORS).

---

### 12. 📜 Logs em Tempo Real & Log Analyzer WinThor
* **Monitoramento Contínuo (tail -f):**
  * Acompanhamento em tempo real de arquivos de log do Apache Karaf (`karaf.log`) e serviços Windows com rolagem automática, controle de pausa e limpeza de arquivo em 1 clique.
* **Log Analyzer & Destaque de Exceções Críticas:**
  * Parser contínuo que identifica e destaca falhas típicas do ecossistema WinThor e OSGi: códigos `ORA-XXXXX` (com catálogo explicativo em português), `NullPointerException`, `BundleException`, `OutOfMemoryError` e falhas de conexão de rede.
  * Pílulas clicáveis diretamente nas linhas do console com salto rápido para o erro e gaveta lateral de diagnósticos com comandos recomendados prontos para copiar.

---

## 🛠️ Tecnologias Utilizadas

| Camada | Tecnologias |
| :--- | :--- |
| **Shell Desktop** | [Electron](https://www.electronjs.org/) (v44), Node.js API (`child_process`, `fs`, `os`, `path`) |
| **Frontend** | [React](https://react.dev/) (v18), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/) |
| **Estilização** | [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) |
| **Empacotamento** | [Electron Builder](https://www.electron.build/) (Instalador NSIS e Portátil com elevação de Admin) |
| **Integrações de Sistema** | Windows Services (`sc`, `net stop/start`, `netstat`), Git CLI, Apache Karaf Client, Azure DevOps |
| **Documentação & RAG** | [FastEmbed](https://github.com/qdrant/fastembed) (`AllMiniLML6V2`), [pdf-parse](https://www.npmjs.com/package/pdf-parse), [mammoth](https://www.npmjs.com/package/mammoth), [Chokidar](https://github.com/paulmillr/chokidar) |
| **Inteligência Artificial (BYOK)** | Google Gemini, OpenAI, Anthropic Claude, Ollama (Local), [Model Context Protocol](https://modelcontextprotocol.io/) (`@modelcontextprotocol/sdk`), [Zod](https://zod.dev/) |
| **Servidor Web/Docker** | [Express](https://expressjs.com/), [ws](https://github.com/websockets/ws) (WebSocket), [tsx](https://github.com/privatenumber/tsx) |

---

## 📥 Instalação para Usuários (Pacote de Release)

A pasta de cada release traz o instalador, a versão portátil, o servidor MCP pronto para uso (`mcp/`), o `instalar-extras.cmd` e um `LEIA-ME.txt` com o passo a passo. Basta rodar o `Hub Manager Setup <versão>.exe`: nada abaixo é obrigatório para abrir o app, cada item só libera uma funcionalidade específica.

| Item | Para que serve | Quando precisa | Download |
| :--- | :--- | :--- | :--- |
| **Modelo de embeddings do RAG** (`all-MiniLM-L6-v2`) | Busca semântica em **Documentação Semântica** | O app baixa sozinho na primeira indexação. Baixe à mão só se a rede bloquear (proxy corporativo). Sem ele, a busca funciona em modo textual. | [sentence-transformers-all-MiniLM-L6-v2.tar.gz](https://storage.googleapis.com/qdrant-fastembed/sentence-transformers-all-MiniLM-L6-v2.tar.gz) |
| **Oracle Instant Client 64-bit** (Basic + Tools) | Oracle 11g ou anterior (Modo Thick) e backup/restore com `expdp`/`impdp`/`exp`/`imp` | Só nesses casos. Oracle 12c+ conecta em Thin Mode, sem nada instalado. | [Oracle Instant Client for Windows x64](https://www.oracle.com/database/technologies/instant-client/winx64-64-downloads.html) + [Visual C++ Redistributable x64](https://aka.ms/vs/17/release/vc_redist.x64.exe) |
| **LLM para o Assistente IA** | Chat com IA e respostas sobre a documentação indexada | Chave de API própria (OpenAI, Gemini, Anthropic, OpenRouter, Groq, DeepSeek) ou modelo local | [Ollama](https://ollama.com/download) (`ollama pull llama3.2`) — configure em **Configurações → IA & LLM (BYOK)** |

**Instalação manual dos extras:** coloque o `.tar.gz` do modelo e/ou os `.zip` do Instant Client na pasta do release e rode `instalar-extras.cmd`. Ele extrai o modelo em `%APPDATA%\dev-manager\models` (resultado: `models\fast-all-MiniLM-L6-v2\model.onnx`) e o Instant Client em `C:\oracle`. Depois, informe a pasta do Instant Client em **Banco de Dados → conexão Oracle → Modo Thick / Suporte a Oracle 11g (Instant Client)** e, para backup, o caminho do `expdp.exe`/`impdp.exe` em **Configurações → Backup de Bancos**.

**Servidor MCP sem o repositório:** veja [Uso a partir do release](#uso-a-partir-do-release-sem-o-repositório) na seção do Servidor MCP.

---

## 📋 Pré-requisitos

* **Sistema Operacional:** Windows 10 ou Windows 11 (64-bit).
* **Node.js:** Versão 22.12.x ou superior.
* **npm:** Versão 9.x ou superior.
* **Privilégios de Administrador:** Necessário para iniciar e parar serviços do Windows.
* **Git:** Instalado e configurado no PATH do Windows.
* **Java JDK e Apache Karaf:** Instalados localmente para desenvolvimento OSGi.

---

## 🚀 Como Executar em Modo de Desenvolvimento

1. **Clone o repositório:**
   ```bash
   git clone <url-do-repositorio>
   cd dev-manager
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie a aplicação em modo de desenvolvimento:**
   ```bash
   npm run dev
   ```
   > O Vite inicializará o servidor de desenvolvimento e o Electron abrirá a janela com hot-reload ativo.

---

## 🐳 Como Executar no Docker (Web Cockpit)

Para executar o painel como um aplicativo web em contêiner Docker acessível pelo navegador em `http://localhost:3000`:

1. **Inicie os contêineres via Docker Compose:**
   ```bash
   docker compose up -d
   ```

2. **Acesse no navegador:**
   👉 [http://localhost:3000](http://localhost:3000)

> 💡 **Para detalhes completos sobre montagem de volumes, perfis Karaf/Oracle e comandos, veja o [DOCKER.md](DOCKER.md).**

---

## 📦 Como Gerar o Executável de Produção (.exe)

O projeto está configurado com o **Electron Builder** para empacotar a aplicação em binários nativos do Windows (`.exe`) com solicitação automática de privilégios de administrador.

### Comando de Build Completo:

Para compilar o código TypeScript, gerar os bundles otimizados do React/Vite e criar os executáveis:

```bash
npm run build:electron
```

> **Nota:** Esse comando executa internamente `npm run build` (checagem de tipos com `tsc` + compilação via `vite build`) e em seguida dispara o `electron-builder`.

---

### Arquivos Gerados na pasta `release/`:

| Arquivo | Formato | Descrição |
| :--- | :--- | :--- |
| **`Hub Manager <versão>.exe`** | Portátil (*Standalone*) | Executa diretamente sem necessidade de instalação prévia. Ideal para pendrives, ambientes restritos ou compartilhamento rápido em rede. |
| **`Hub Manager Setup <versão>.exe`** | Instalador NSIS | Assistente tradicional do Windows com opções de escolha do diretório de instalação e criação de atalhos no Desktop e Menu Iniciar. |
| **`LEIA-ME.txt`** | Texto Puro (CRLF) | Guia rápido de instalação para o usuário final, ideal para abrir no Bloco de Notas, com explicação do executável a escolher, aviso do SmartScreen e resumo das mudanças. |
| **`RELEASE_NOTES.md`** | Markdown | Notas completas da versão com as novidades extraídas do changelog, ideal para publicação em releases no GitHub ou documentações internas. |
| **`instalar-extras.cmd`** | Script | Extrai o modelo do RAG e o Oracle Instant Client que forem colocados à mão na mesma pasta. |
| **`mcp/`** | Servidor MCP | Servidor MCP autossuficiente (ver [Uso a partir do release](#uso-a-partir-do-release-sem-o-repositório)). |

Os três últimos são gerados por [`scripts/prepare-release.cjs`](scripts/prepare-release.cjs) ao fim do `build:electron` (o `npm run pack` pula essa etapa). Para regenerá-los sem reempacotar o app: `npm run release:folder`. Arquivos colocados à mão na pasta, como o `.tar.gz` do modelo ou os `.zip` do Instant Client, não são apagados.
> **Dica:** Para gerar ou atualizar apenas os arquivos de notas da versão (`LEIA-ME.txt` e `RELEASE_NOTES.md`) sem precisar recompilar todo o instalador:
> ```bash
> npm run release:notes
> ```

---

### Opções Avançadas de Build:

Se desejar compilar apenas um dos formatos para economizar tempo de empacotamento:

* **Apenas Versão Portátil:**
  ```bash
  npm run build && npx electron-builder --win portable
  ```

* **Apenas Instalador NSIS:**
  ```bash
  npm run build && npx electron-builder --win nsis
  ```

---

### 🛡️ Permissões (UAC):
Os executáveis rodam com o nível do usuário (`requestedExecutionLevel: asInvoker`) e **não** pedem Administrador ao abrir. Algumas ações do Cockpit só funcionam elevadas: iniciar/parar serviços do Windows (`sc.exe`, `net.exe`) e encerrar processos de outro usuário. Para usá-las, abra o Hub Manager com "Executar como administrador"; o Cockpit avisa quando uma ação precisar disso.

---

### 🔏 Assinatura de Código (Code Signing) — Distribuição para a Equipe

Executáveis `.exe` sem assinatura digital disparam o aviso **"Windows protegeu seu PC" (SmartScreen)** em outros computadores, e o usuário pode desistir de instalar. Pra evitar isso na distribuição interna, o build assina automaticamente os binários com um **certificado self-signed** quando ele existe na máquina.

**Como funciona:**
- `scripts/build-electron.cjs` procura o arquivo `.env.codesign` na raiz do projeto. Se existir, carrega `CSC_LINK` e `CSC_KEY_PASSWORD` no ambiente antes de chamar o `electron-builder`, que assina o `.exe`, o instalador NSIS e o desinstalador automaticamente.
- Sem o `.env.codesign`, o build funciona normalmente, só que sem assinatura (volta o aviso do SmartScreen).
- O certificado (`certs/dev-manager-codesign.pfx`) e a senha (`.env.codesign`) **não vão pro Git** — são gerados uma vez por máquina de build e ficam só localmente. Faça backup deles em local seguro (ex: cofre de senhas), senão precisa gerar um novo certificado e reimportar em todo mundo.

**Gerar (ou renovar) o certificado:**
```bash
powershell -ExecutionPolicy Bypass -File scripts/generate-codesign-cert.ps1
```
Isso cria `certs/dev-manager-codesign.pfx` (privado), `certs/dev-manager-public.cer` (público) e `.env.codesign`. Validade: 5 anos.

**Pra equipe não ver mais o aviso do SmartScreen**, cada pessoa importa o certificado público **uma vez**, em um PowerShell/Prompt como Administrador:
```bash
certutil -addstore -f "Root" dev-manager-public.cer
```
(arquivo `certs/dev-manager-public.cer` — pode compartilhar livremente, não contém chave privada). Depois disso, qualquer versão futura assinada com o mesmo certificado instala sem aviso nessa máquina.

> Alternativa (sem mexer em nada): no aviso do SmartScreen, clicar em "Mais informações" → "Executar assim mesmo". Funciona, mas assusta usuário leigo e some a cada nova versão gerada sem esse ajuste.

---

## 📂 Estrutura de Diretórios do Projeto

```
src/
├── main/       # Processo principal do Electron: services (regras de negócio), ipc/, utils/
├── preload/    # Ponte segura (contextBridge) exposta como window.electronAPI
├── renderer/   # Interface React: pages/, components/ (por domínio), hooks/, utils/
├── server/     # API REST + WebSocket standalone (modo Web/Docker)
├── mcp/        # Servidor MCP (stdio) para assistentes de IA
└── shared/     # Tipos e utilitários compartilhados entre main, server, mcp e renderer
```

O mesmo conjunto de services alimenta o IPC do Electron, a API REST e o servidor MCP. Arquitetura, convenções e decisões estão em [AGENTS.md](AGENTS.md).

---

## ⌨️ Atalhos de Teclado

| Atalho | Ação |
| :--- | :--- |
| `Ctrl + K` / `Cmd + K` | Abre o **Quick Launcher (Spotlight)** com busca unificada e ações rápidas |
| `Alt + 1` | Navega para a aba **Ambiente Dev** |
| `Alt + 2` | Navega para a aba **Database Studio** |
| `Alt + 3` | Navega para a aba **Containers** |
| `Alt + 4` | Navega para a aba **Deployer Karaf OSGi** |
| `Alt + 5` | Navega para a aba **Git & Azure DevOps** |
| `Alt + 6` | Navega para a aba **Catálogo de Rotinas** |
| `Alt + 7` | Navega para a aba **Documentação & RAG** |
| `Alt + 8` | Navega para a aba **Logs em Tempo Real** |
| `Alt + 9` | Navega para a aba **Ajuda & Diagnóstico** |
| `Alt + 0` | Navega para a aba **APM & Traces** |
| `Alt + Q` | Navega para a aba **Central de Qualidade (QA Studio)** |

**Ajuda** e **Configurações** contam com botões dedicados de acesso rápido no canto direito do cabeçalho (ou via `Ctrl + K`).

---

## 📄 Licença

Este projeto é distribuído sob a licença **MIT**. Veja o arquivo `LICENSE` para mais detalhes.

---

<p align="center">
  Desenvolvido por <b>Wanderson Alves</b> • Cockpit integrado para produtividade e automação no desenvolvimento de software 🚀
</p>
