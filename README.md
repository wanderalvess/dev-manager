# Dev Manager 🚀

> **Cockpit e Painel de Automação Desktop Integrado para Desenvolvedores e Apache Karaf OSGi.**

Desenvolvido em **Electron + React + TypeScript + Tailwind CSS**, o **Dev Manager** centraliza e automatiza todas as tarefas rotineiras do dia a dia de desenvolvimento: liberação de portas e serviços conflitantes em segundo plano, inicialização de IDEs, disparo do contêiner OSGi em modo debug, deploy automatizado de features Maven no Karaf, gerenciamento de repositórios Git / Azure DevOps, catálogo de rotinas e central completa de ajuda e diagnósticos. Além do Cockpit desktop, todas essas automações também ficam disponíveis para assistentes de IA como o Claude Code via um **servidor MCP** embutido.

---

## 📸 Visão Geral dos Recursos

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                   DEV MANAGER                                                    │
├─────────────┬──────────────┬─────────────┬─────────────────┬──────────────┬────────────┬──────────┬────────┬─────────┤
│ ⚡ Ambiente │ 🗄️ Database  │ 🐳 Docker   │ 📦 Karaf Deploy │ 🔀 Git/Azure │ 📑 Rotinas │ 📚 Docs  │⚙ Config│ ❓ Ajuda│
├─────────────┴──────────────┴─────────────┴─────────────────┴──────────────┴────────────┴──────────┴────────┴─────────┤
│ • Pipeline 1-Clique (Stop Srv -> Kill -> Launch IDE -> Servidor Debug)                                           │
│ • Database Studio Multi-Vendor (Oracle, Postgres, MySQL) com Inspetor de Colunas, Histórico e Snippets Custom     │
│ • Docker Cockpit: CPU/RAM em Tempo Real (docker stats), Terminal Interativo (docker exec) e Inspeção de Logs    │
│ • Karaf OSGi Deployer: Snapshots & Comparativo de Estado (Diff), Árvore de Dependências e Fiações Wired          │
│ • Hub Git & Azure DevOps: Sincronização rápida, detecção de branches e gerador de Pull Requests                  │
│ • Catálogo de Rotinas (.EXE e .PC) com busca rápida e favoritos                                                  │
│ • RAG & IA Local: Busca semântica (FastEmbed), Conectores Confluence/Jira, Assistente IA (BYOK) e DocSync         │
│ • Quick Launcher Spotlight (Ctrl+K) e Navegação Global por Teclado (Alt+1 .. Alt+9)                              │
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

#### 🛡️ Central de Backup & Restauração Integrada (5 Abas de Controle)
O Dev Manager conta com uma central avançada de backup acessível pelo botão **Backup & Restore**:
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
* **Gerenciamento Seguro de Bundles:**
  * Instalação via Maven/JAR/Projeto, atualização in-place de versão (`bundle:update`), reinstalação com rebuild Maven opcional e desinstalação com análise de risco de fiação.

---

### 5. 🔀 Git & Azure DevOps Hub
* **Varredura Automática de Repositórios:**
  * Localização automática de todos os projetos clonados na pasta de repositórios.
  * Detecção instantânea da branch atual ativa e contador de arquivos modificados (*uncommitted changes*).
* **Ações Rápidas de Sincronização:**
  * Botões diretos para `git fetch`, `git pull`, `git stash` e `git stash pop` sem precisar abrir o terminal.
* **Gerador de Pull Request no Azure DevOps:**
  * Reconhece organizações, projetos e repositórios hospedados no Azure DevOps (HTTPS e SSH).
  * Monta a URL de criação de PR comparando a branch de trabalho com a branch de destino (`develop`, `master`, etc.) e abre diretamente no navegador.

---

### 6. 📑 Catálogo & Lançador de Rotinas
* **Varredura Completa do Diretório Configurado:**
  * Reconhece executáveis (`.EXE`) e rotinas compiladas (`.PC`) organizadas por módulos funcionais.
* **Filtros e Busca Instantânea:**
  * Busca por código da rotina ou nome e filtro por módulo.
* **Sistema de Favoritos:**
  * Marcação de rotinas favoritas com estrelas fixadas no topo e salvas localmente.

---

### 7. 📚 Central de Documentação, RAG & Assistente IA Integrado
O **Módulo de Documentações** do Dev Manager transforma a base documental técnica dispersa do projeto em uma **central de conhecimento viva, pesquisável e acionável por Inteligência Artificial**. Ele funciona simultaneamente como catálogo centralizado para consulta rápida do desenvolvedor e como **motor de RAG (Retrieval-Augmented Generation)** tanto para o Assistente IA embutido quanto para agentes externos via servidor MCP.

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
Para desenvolvedores que utilizam assistentes de codificação como **Claude Code**, **Cursor**, **GitHub Copilot Chat** ou **Antigravity**, o Dev Manager disponibiliza ferramentas MCP nativas:
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
  * Expõe as mesmas automações do Cockpit (Ambiente, Perfis, Karaf, Git & Azure, Rotinas, Configurações) como *tools* que um cliente MCP — como o Claude Code — pode chamar diretamente, sem passar pela interface gráfica.
* **106 Tools Organizadas por Domínio:**
  * `system_*`, `env_*`, `profile_*`, `karaf_*` (inclui gerência de bundles: listar, instalar, reinstalar, atualizar versão, desinstalar e checar dependências), `docker_*`/`container_*`, `git_*`, `routines_*`, `rag_*`, `settings_*`, `db_*` (Oracle/PostgreSQL/MySQL, inclui backup/restore/restore drill agendável), `logs_*` (leitura e limpeza de arquivos de log), `deploy_*`, `llm_*` e `network_*` — desde consultas de status até o pipeline completo de deploy Karaf e execução de perfis de automação.
* **Terceiro Consumidor da Mesma Camada de Serviços:**
  * Reaproveita exatamente as mesmas classes de serviço e validações de segurança (`isValidIdentifier`, `isSafeLocalPath`, `isSafeKarafCommand`) já usadas pelo IPC do Electron e pela API REST (`src/server`) — nenhuma lógica de negócio duplicada.
* **Protocolo Aberto — Funciona em Qualquer Cliente MCP:**
  * O servidor é MCP puro via stdio, sem nada específico de um cliente. Só muda o arquivo de registro:
  * **Claude Code:** [`.mcp.json`](.mcp.json) na raiz — abra o projeto e rode `/mcp`.
  * **VS Code / GitHub Copilot Chat (agent mode):** [`.vscode/mcp.json`](.vscode/mcp.json).
  * **Google Antigravity:** [`.agents/mcp_config.json`](.agents/mcp_config.json) (workspace) ou `~/.gemini/config/mcp_config.json` (global).
* **Execução Manual:**
  ```bash
  npm run mcp
  ```
  Inicia o servidor MCP via stdio (`tsx src/mcp/index.ts`) — mesmo mecanismo do script `server` (REST/Docker), agora falando o protocolo MCP.

> ⚠️ **Nota de segurança:** o servidor MCP tem o mesmo poder que o próprio Cockpit — iniciar/parar serviços Windows, matar processos, rodar builds Maven e comandos Karaf. Ele roda localmente via stdio (sem porta de rede exposta) e é pensado para uso pelo mesmo desenvolvedor que já opera essas ações pela interface. Transporte remoto/HTTP não faz parte desta versão.

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

### Tipos de Executáveis Gerados na pasta `release/`:

| Arquivo | Formato | Descrição |
| :--- | :--- | :--- |
| **`Dev Manager 1.0.0.exe`** | Portátil (*Standalone*) | Executa diretamente sem necessidade de instalação prévia. Ideal para pendrives, ambientes restritos ou compartilhamento rápido em rede. |
| **`Dev Manager Setup 1.0.0.exe`** | Instalador NSIS | Assistente tradicional do Windows com opções de escolha do diretório de instalação e criação de atalhos no Desktop e Menu Iniciar. |

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

### 🛡️ Elevação UAC Automática:
Ambos os executáveis incluem manifesto interno configurado com `requestedExecutionLevel: requireAdministrator`. Ao abrir o executável, o Windows solicitará permissão de Administrador automaticamente, o que garante permissão para:
* Iniciar e parar serviços do sistema operacional Windows (`sc.exe`, `net.exe`).
* Encerrar processos em segundo plano para liberação de portas e arquivos travados.
* Monitorar sockets e conexões TCP ativas via `netstat`.

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
dev-manager/
├── .mcp.json                   # Registro do servidor MCP para clientes como o Claude Code
├── electron-builder.json5      # Configuração de empacotamento Windows / NSIS
├── package.json                # Dependências e scripts do projeto
├── tailwind.config.js          # Configurações de cores, fontes e temas
├── tsconfig.json               # Configuração do compilador TypeScript
├── vite.config.ts              # Configuração do Vite + Plugins Electron
│
└── src/
    ├── main/                   # Processo Principal do Electron (Node.js backend)
    │   ├── index.ts            # Inicialização da janela principal e ciclo de vida
    │   ├── ipc/
    │   │   └── registerIpc.ts  # Registro de canais de comunicação IPC seguros
    │   ├── services/           # Regras de negócio e integração de sistema
    │   │   ├── ConfigService.ts    # Persistência de configurações e auto-detecção
    │   │   ├── DocsIndexService.ts # Motor RAG, embeddings FastEmbed, busca e DocSync
    │   │   ├── LlmService.ts       # Hub de provedores LLM (Gemini, OpenAI, Claude, Ollama)
    │   │   ├── GitAzureService.ts  # Leitura de repositórios Git e URLs do Azure
    │   │   ├── KarafService.ts     # Execução de comandos Karaf e console embutido
    │   │   ├── RoutinesService.ts  # Varredura e lançamento de rotinas
    │   │   ├── WindowsService.ts   # Controle de serviços Windows e portas de rede
    │   │   └── docSources/         # Conectores de fontes (Local, Confluence, Jira, Extratores)
    │   └── utils/
    │       └── security.ts     # Validadores compartilhados (paths, comandos, identificadores)
    │
    ├── server/                 # API REST + WebSocket standalone (modo Web/Docker)
    │   ├── index.ts            # Express + ws, mesmos services do Electron, sem UI
    │   └── services/
    │       └── NetworkPortScanner.ts
    │
    ├── mcp/                    # Servidor MCP (Model Context Protocol) via stdio
    │   └── index.ts            # Terceiro consumidor dos services — tools para clientes MCP/IA
    │
    ├── preload/                # Script Preload (Ponte IPC segura com contextBridge)
    │   ├── index.ts
    │   └── index.d.ts          # Definição TypeScript global para window.electronAPI
    │
    ├── renderer/               # Processo de Renderização (Interface React)
    │   ├── index.html          # HTML mestre
    │   └── src/
    │       ├── App.tsx         # Componente raiz, abas e atalhos de teclado
    │       ├── main.tsx        # Ponto de entrada do React
    │       ├── index.css       # Estilos globais e variáveis de tema
    │       ├── components/     # Componentes reutilizáveis
    │       │   ├── Header.tsx          # Barra superior cockpit com status e tema
    │       │   ├── TerminalViewer.tsx  # Terminal com streaming de logs e prompt interativo
    │       │   ├── DocSettingsModal.tsx# Configurações de pastas, Confluence, Jira e LLMs
    │       │   ├── MarkdownReader.tsx  # Leitor e renderizador embutido de Markdown
    │       │   └── ThemeToggle.tsx     # Alternador de modo escuro / claro / midnight
    │       ├── context/
    │       │   └── ThemeContext.tsx    # Contexto global de temas
    │       └── pages/          # Telas principais da aplicação
    │           ├── EnvironmentPage.tsx # Cockpit de preparação de ambiente e serviços
    │           ├── DatabasePage.tsx    # Studio SQL Multi-Vendor, histórico e snippets
    │           ├── ContainersPage.tsx  # Containers (Docker / Podman), métricas em tempo real e terminal
    │           ├── DeployPage.tsx      # Deployer Karaf OSGi, snapshots e árvore de bundles
    │           ├── GitAzurePage.tsx    # Hub de repositórios Git e Pull Requests
    │           ├── RoutinesPage.tsx    # Catálogo e lançador de rotinas
    │           ├── DocsPage.tsx        # Busca semântica RAG, preview e abertura em editor
    │           ├── SettingsPage.tsx    # Tela de configurações e portas monitoradas
    │           └── HelpPage.tsx        # Central de Ajuda, FAQ, atalhos e diagnóstico
    │
    └── shared/                 # Tipos e utilitários compartilhados entre main, server e mcp
        └── types.ts            # Interfaces TypeScript (AppSettings, ServiceStatus, etc.)
```

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
| `Alt + 8` | Navega para a aba **Configurações** |
| `Alt + 9` | Navega para a aba **Ajuda & Diagnóstico** |

---

## 📄 Licença

Este projeto é distribuído sob a licença **MIT**. Veja o arquivo `LICENSE` para mais detalhes.

---

<p align="center">
  Desenvolvido por <b>Wanderson Alves</b> • Cockpit integrado para produtividade e automação no desenvolvimento de software 🚀
</p>
