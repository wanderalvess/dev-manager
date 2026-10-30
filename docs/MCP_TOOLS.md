# Documentação das Ferramentas MCP (Model Context Protocol)

O Hub Manager expõe **178 ferramentas (tools)** através de seu servidor MCP embutido. Estas ferramentas permitem que assistentes de Inteligência Artificial (como o próprio Antigravity ou outras IAs conectadas via MCP) leiam contextos, executem automações e gerenciem o ambiente local de desenvolvimento no Windows.

Abaixo, as ferramentas estão categorizadas por domínio, para ajudar você a entender o que a IA pode fazer e como você pode pedir (exemplos de prompts).

---

## 1. Sistema e Ambiente Windows
Permite verificar e manipular o ambiente local: matar processos, iniciar serviços, checar portas, e muito mais.

*   **`system_get_info` / `system_get_metrics`**: Lê versão do SO, consumo de RAM, CPU e caminhos instalados.
*   **`system_check_path` / `system_auto_detect_paths`**: Verifica se um caminho local existe (e se é arquivo ou pasta) e tenta localizar sozinho a IDE, o Karaf e a pasta de projetos.
*   **`env_check_admin`**: Informa se o processo tem privilégios de administrador no Windows (necessário para gerenciar serviços).
*   **`env_get_services_status` / `env_start_service` / `env_stop_service`**: Lista e gerencia Serviços do Windows.
*   **`env_batch_start_services` / `env_batch_stop_services`**: Inicia ou para vários serviços Windows de uma vez.
*   **`env_get_processes_status` / `env_batch_kill_processes` / `env_check_ports`**: Verifica processos rodando, libera portas ocupadas e mata tarefas travadas.
*   **`env_launch_ide` / `env_launch_app`**: Inicia a sua IDE (IntelliJ, VS Code) ou outros executáveis no Windows.
*   **`env_launch_server_debug`**: Abre o script de debug do Karaf em uma janela externa.
*   **`env_reset_environment`**: Executa uma automação completa de "reset" para limpar o ambiente local e subir tudo do zero.
*   **`settings_get` / `settings_save`**: Lê as configurações do Hub Manager (com segredos ofuscados) e grava um conjunto parcial delas.

**Exemplo de como pedir à IA:**
> "Verifique o status do meu ambiente, mate qualquer processo preso na porta 8181 e inicie a IDE."

---

## 2. Automação e Perfis (Profiles)
Ferramentas de orquestração local (macros).

*   **`profile_run` / `profile_stop`**: Roda um perfil de automação completo que você tenha configurado na UI.
*   **`profile_run_step` / `profile_restart_step` / `profile_stop_step`**: Roda, reinicia ou interrompe um passo individual de automação.
*   **`profile_kill_port`**: Mata o processo que está ocupando uma porta TCP.

**Exemplo de como pedir à IA:**
> "Rode meu perfil de automação 'Subir Ambiente Local' e avise quando terminar."

---

## 3. Servidor Apache Karaf e Bundles
Domínio completo para interagir com o Karaf, inspecionar logs, diagnosticar conflitos OSGi e fazer deploys.

*   **`karaf_is_running`**: Verifica se o contêiner Apache Karaf/OSGi está em execução e respondendo na porta SSH (padrão 8101).
*   **`karaf_start_embedded` / `karaf_stop_embedded` / `karaf_is_embedded_running`**: Inicia, encerra e verifica se a instância do Karaf embutida do Hub Manager está ativa.
*   **`karaf_get_embedded_output` / `karaf_send_embedded_input`**: Lê a saída acumulada do console embutido desde a última leitura e envia uma linha de comando a ele.
*   **`karaf_get_persisted_logs`**: Lê o final do log do console embutido gravado em disco, sem consumir o buffer (sobrevive a reinícios).
*   **`karaf_exec_command`**: Executa um único comando no shell do Karaf via `client.bat` (ex.: `feature:list -i`).
*   **`karaf_list_bundles` / `karaf_get_bundle_details` / `karaf_manage_bundle`**: Lista, inspeciona e reinicia (start/stop/refresh/resolve) bundles OSGi.
*   **`karaf_install_bundle` / `karaf_uninstall_bundle`**: Instala um bundle a partir de coordenada Maven (`mvn:...`) ou arquivo local, e desinstala um bundle existente (com `bundle:refresh`).
*   **`karaf_reinstall_bundle` / `karaf_update_bundle_version`**: Atualiza um bundle instalado (`bundle:update` + refresh + start), opcionalmente rodando `mvn clean install` antes, ou o aponta para uma nova versão/localização.
*   **`karaf_check_install_dependencies` / `karaf_check_bundle_dependencies`**: Checagens antes de mexer em bundles — colisão com um bundle já instalado de mesmo nome/localização, e bundles dependentes (com nível de risco) antes de desinstalar ou alterar.
*   **`karaf_detect_wiring_conflicts`**: Analisa ativamente todos os bundles parados, com falhas, ou duplicados e diagnostica erros (como *Unsatisfied Requirements* e conflitos de *Classloader*).
*   **`karaf_parse_pom`**: Lê o `pom.xml`/`deploy-local.bat` do projeto e sugere os comandos de deploy.
*   **`karaf_deploy` / `karaf_build_and_deploy` / `karaf_run_maven_build`**: Executa o maven local no seu repositório e injeta o bundle compilado dentro do Karaf.
*   **`karaf_verify_bundle`**: Confirma após o deploy que a feature/bundle está instalada e ativa (`feature:list -i` + `bundle:list` filtrados pelo termo).
*   **`karaf_get_deploy_history`**: Histórico persistido de deploys/builds (mais recente primeiro, até 200 entradas).
*   **`karaf_get_log`**: Lê diretamente o log do Pax Logging do container Karaf via `log:display`.
*   **`karaf_get_jvm_memory`**: Obtém telemetria em tempo real da JVM do Karaf: consumo de Heap e Non-Heap (usado, alocado, máximo), percentual, contagem de threads, classes carregadas e status de alerta de OutOfMemory (OOM).
*   **`karaf_trigger_gc`**: Solicita a execução imediata do Garbage Collector na JVM do Apache Karaf via JMX ou comando nativo.
*   **`karaf_list_feature_repos` / `karaf_add_feature_repo` / `karaf_remove_feature_repo` / `karaf_refresh_feature_repo`**: Gerencia repositórios Maven/XML de features do Karaf (`feature:repo-list`, `repo-add`, `repo-remove`, `repo-refresh`).
*   **`karaf_list_all_features`**: Lista todas as features do Karaf (instaladas e disponíveis), versões e repositórios de origem.
*   **`karaf_analyze_log`**: Analisa logs do Karaf ou textos informados, detectando e categorizando falhas críticas (`ORA-XXXXX`, `NullPointerException`, `BundleException`, `OutOfMemoryError`, `ClassNotFoundException`) com diagnósticos e comandos recomendados.

**Exemplo de como pedir à IA:**
> "Faça o clean install (pulando testes) do projeto atual e instale a feature no Karaf. No final, confirme se ela ficou ativa."
> "Verifique o consumo de memória Heap da JVM do Karaf e se há risco de OutOfMemoryError."
> "Dispare o Garbage Collection na JVM do Karaf para liberar memória."
> "Liste os repositórios de features registrados no Karaf e adicione o repositório da rotina WinThor."
> "Analise os últimos 200 logs do Karaf procurando por erros ORA-XXXXX ou NullPointerException e me mostre os diagnósticos."
> "Verifique se o Apache Karaf está em execução antes de iniciar o deploy."
> "Faça o build Maven do projeto em c:\projetos\meu-servico e faça deploy no Karaf."
> "Verifique se há conflitos de versão OSGi ou bundles em estado de erro no meu Karaf."

---

## 4. Docker e Containers (Podman)
Ferramentas para manipular a stack do Docker. As ferramentas funcionam para chamadas que começam com `docker_...`.

*   **`docker_status` / `docker_list_containers` / `docker_get_stats`**: Lista containers locais em execução e seu consumo.
*   **`docker_start_container` / `docker_stop_container` / `docker_restart_container` / `docker_remove_container`**: Gerencia o ciclo de vida dos containers.
*   **`docker_start_sequence` / `docker_stop_sequence`**: Sobe ou derruba uma lista de containers em ordem, com atraso opcional entre eles.
*   **`docker_get_container_logs`**: Traz logs de um container específico para diagnóstico.
*   **`docker_compose_up` / `docker_compose_down` / `docker_compose_status`**: Gerencia pilhas complexas de Docker Compose (ex. bancos de dados locais).

**Exemplo de como pedir à IA:**
> "Reinicie o container do Oracle local e pegue os últimos 50 logs para eu ver se subiu bem."

---

## 5. Git & Azure DevOps
Ações automatizadas nos repositórios.

*   **`git_list_projects` / `git_get_project_info`**: Lista projetos na pasta de trabalho e exibe branch atual, branches locais e do origin. Com `includeUncommittedCount`, `git_list_projects` também conta as alterações pendentes de cada repositório.
*   **`git_get_status` / `git_get_diff` / `git_get_commit_history`** (somente leitura): Arquivos alterados, diff em relação ao HEAD (do repositório inteiro ou de um arquivo, com limite de tamanho) e últimos commits da branch atual.
*   **`git_exec_command` / `git_checkout_branch`**: Permite fazer checkout de branches (com suporte opcional a `baseBranch`), pull, stash e status. Fetch e pull têm tempo limite de 3 minutos.
*   **`git_create_task_branch`**: Cria e alterna para uma nova branch padronizada vinculada a uma tarefa do Azure DevOps ou Jira (`prefix/id-slug-titulo`), validando nomes de branch e permitindo definir a branch base.
*   **`git_list_tasks`**: Busca tarefas e work items no Jira (via API REST JQL) ou Azure DevOps (via Work Items / WIQL) para guiar a criação de branches.
*   **`git_build_pr_url`**: Monta um link direto para criar um Pull Request no Azure/GitHub/GitLab da branch atual.

**Exemplo de como pedir à IA:**
> "Em qual branch estou no repositório de vendas? Dê um git pull e monte a URL de Pull Request."
>
> "Quais repositórios têm alterações não commitadas? Me mostre o diff do de vendas e resuma o que mudou."
>
> "Busque a tarefa SRE-1234 e crie uma branch feature/1234-ajustes-rotina-1400 a partir da develop."

---

## 6. Documentação, LLM e RAG Local
Busca semântica avançada em PDFs, markdowns e manuais.

*   **`rag_reindex_docs` / `rag_search_docs` / `rag_index_status`**: Permite indexar pastas, criar embeddings e buscar informações específicas nos documentos da empresa offline.
*   **`docs_ask_ai`**: Usa a IA (com os LLMs configurados - BYOK) para formular respostas precisas baseadas nos seus documentos internos.
*   **`llm_chat`**: Proxy direto para conversar com os modelos (OpenAI, Anthropic, Gemini, etc) pelo Hub Manager.

**Exemplo de como pedir à IA:**
> "Busque nas documentações do projeto como configurar a variável de ambiente do banco."

---

## 7. Banco de Dados (Oracle, Postgres, MySQL)
As ferramentas MCP podem se conectar a bancos configurados localmente e investigar performance de queries.

*   **`db_list_connections` / `db_test_connection`**: Lista conexões seguras e as testa.
*   **`db_list_tables` / `db_get_table_columns`**: Inspeciona a estrutura dos bancos de dados.
*   **`db_execute_query`**: Executa SELECTs de modo seguro no banco e retorna resultados tabulares, com suporte a parâmetros e variáveis de bind e substituição (`:VAR`, `&VAR`, `&&VAR`, `@VAR`, `${VAR}`).
*   **`db_explain_plan` / `db_analyze_explain_plan`**: Roda Planos de Execução do banco e usa Inteligência Artificial Heurística para avisar sobre lentidão (ex: Full Table Scans, falta de índices, ou ordenações custosas).
*   **`db_get_oracle_active_sessions` / `db_get_oracle_recent_statements`**: Statement Tracer do Oracle — lista sessões conectadas com a SQL atual/última de cada uma (`v$session`/`v$sql`) ou as instruções mais recentes no cursor cache, com filtro opcional por schema/texto. Útil para descobrir qual query um app ou rotina disparou, quando vários sistemas compartilham o mesmo banco.
*   **`db_get_oracle_statement_binds`**: Captura os valores dos parâmetros (`bind variables`) passados na execução de um SQL no Oracle via `v$sql_bind_capture`, retornando tipo de dado, posição, nome e valor capturado, acompanhado do SQL executável interpolado (com os parâmetros substituídos no formato literal correto). Permite inspecionar parâmetros sem precisar habilitar `log:set trace root` no Karaf ou usar ferramentas externas como `OraTracer.exe`.
*   **`db_start_oracle_capture` / `db_get_oracle_capture_state` / `db_stop_oracle_capture` / `db_clear_oracle_capture`**: Captura contínua do Statement Tracer — consulta `v$session`/`v$sql` em segundo plano (intervalo padrão de 3s, mínimo de 2s, parada automática após 30 minutos) e acumula as SQLs distintas e a linha do tempo de qual sessão passou a rodar qual SQL. A leitura devolve até 50 itens de cada lista por padrão (`limit`). É uma captura própria do servidor MCP: não enxerga a captura iniciada na tela do app, e vice-versa.
*   **`db_analyze_oracle_capture`**: Analisa a captura contínua **por rotina**: agrupa as SQLs pelo módulo Oracle que as executou (ex.: `PCSIS2075.exe`) e devolve, para cada rotina, as consultas mais lentas (tempo médio por execução), as repetidas (possível N+1: mesma consulta em laço ou variações só de valor literal) e as telas (`ACTION`) tocadas.
    > "Iniciei a captura e abri o pedido na rotina 2075. Analise por rotina o que foi executado e me diga o que está lento ou repetido."
*   **`db_list_tns_entries`**: Lê e analisa o arquivo de rede `tnsnames.ora` configurado no Hub Manager (ou informado pontualmente via `filePath`), extraindo aliases, host, porta, SID, SERVICE_NAME e protocolo configurados para conexão ao Oracle.

**Exemplo de como pedir à IA:**
> "Mostre as colunas da tabela PCEMPR."
> "Rode um Explain Plan na query 'SELECT * FROM PCPEDIDO' e analise se há problemas de performance."
> "Quais sessões estão ativas no Oracle agora e o que cada uma está rodando?"
> "Quais foram as últimas queries que rodaram no schema APP_KARAF?"
> "Quais foram os parâmetros passados na query com SQL_ID '5g4b09m8d123k' no Oracle? Me mostre a SQL pronta para rodar."
> "Liga a captura do Oracle no schema APP_KARAF; vou gravar um pedido no WinThor e depois te aviso para você me dizer quais SQLs rodaram."
> "Leia o arquivo tnsnames.ora configurado e liste os aliases de banco disponíveis com seus hosts e serviços."

---

## 8. Perfis de Deploy e Rede
Orquestração fina de rede.

*   **`deploy_list_profiles` / `deploy_run_profile`**: Roda pipelines completos de entrega (esteira).
*   **`network_get_ips` / `network_check_health`**: Busca IPs da placa, rede WSL ou checa a saúde de um endpoint HTTP local.

**Exemplo de como pedir à IA:**
> "Rode o perfil de deploy 'Atualizar Backend' e cheque a URL http://localhost:8080/health para confirmar se o servidor ficou online."

---

## 9. Backup de Banco e Observador de Logs
Gestão de backup/restore agendado e leitura pontual de arquivos de log locais.

*   **`db_run_backup` / `db_list_backups` / `db_restore_backup` / `db_run_restore_drill`**: Executa backup manual, lista arquivos existentes, restaura um backup e testa a restaurabilidade contra uma conexão "scratch" descartável. Restauração e drill são destrutivas (pedem confirmação), exigem `connectionId` ou `config` explícito (não caem na conexão padrão) e recusam conexão marcada como produção. O drill também recusa a conexão de origem do backup (`sourceConnectionId`, ou deduzida pelo nome do arquivo).
*   **`db_save_backup_config` / `db_list_backup_history`**: Salva o agendamento (cron) de backup/restore drill de uma conexão e consulta o histórico persistido de execuções. Salvar é destrutiva: a configuração pode agendar um comando personalizado.
*   **`backup_test_webhook`**: Envia um payload de teste para um webhook de notificação de backup (Slack/Discord/Teams/genérico).
*   **`logs_check_file` / `logs_read_last_lines` / `logs_clear_file`**: Verifica o status de um arquivo de log, lê suas últimas N linhas sob demanda (sem observação contínua — isso é exclusivo da UI via WebSocket) e zera seu conteúdo.

**Exemplo de como pedir à IA:**
> "Rode um backup manual da conexão 'Produção' para D:\Backups e me mostre as últimas 50 linhas do log do Karaf."

## 10. APM & Traces (OpenTelemetry)
Consulta os traces recebidos pelo receptor OTLP do app (porta 4318 por padrão, configurável na tela de APM). O buffer de traces vive na memória do processo que recebe os spans — o app desktop ou o servidor web (`npm run server`) —, então estas tools consultam esse processo por uma API local do receptor (somente loopback, protegida por token): o app precisa estar aberto.

*   **`apm_get_overview`**: Vazão (RPS), taxa de erro, latências p50/p95/p99, % do tempo gasto em banco, top endpoints e queries mais lentas (filtros `serviceName` e `lastMinutes`).
*   **`apm_get_traces`**: Busca traces por serviço, rota/traceId, apenas erros, apenas com SQL, latência mínima, ordenação por duração ou horário (`sortBy: 'duration' | 'time'`) e filtro de chamadas lentas (`slowOnly`).
*   **`apm_get_trace_details`**: Spans na ordem do waterfall (profundidade e offset), SQL executado, exceções com stacktrace e a decomposição analítica do tempo entre Requisição HTTP, Processamento Java e Queries JDBC no banco.
*   **`apm_get_services` / `apm_get_receiver_status`**: Serviços monitorados com métricas agregadas; estado, porta, volume recebido e uso do buffer do receptor.

**Exemplo de como pedir à IA:**
> "Quais endpoints do Karaf estão mais lentos nos últimos 15 minutos? Abra o trace mais lento e me diga qual query está consumindo o tempo."

## 11. Rotina 801 (Serviços Web Oficiais do WinThor)
Catálogo e instalação das funcionalidades oficiais publicadas pela Rotina 801 (ferramenta-servidor) no Karaf.

*   **`routine801_get_catalog`**: Lista instalações ou atualizações disponíveis de serviços web e rotinas oficiais do WinThor.
*   **`routine801_check_health`**: Testa a conectividade com o serviço HTTP da Rotina 801 no Karaf.
*   **`routine801_install_features`**: Instala funcionalidades selecionadas no Karaf com resolução de dependências (via `karaf_cli` ou `api`), suportando auto-inferência de repositórios Maven canônicos, execução isolada de registro de repositório (`action: 'repo_add_only'`) e override pontual de versão (`targetVersionOverride`) para compor ambientes de teste específicos.

**Exemplo de como pedir à IA:**
> "Liste as atualizações pendentes da Rotina 801 e instale as que estão liberadas."
> "Instale o serviço winthor-atualizacao-dados na versão 1.39.1.6 no Karaf pré-adicionando o repositório Maven."
> "Apenas registre o repositório Maven da rotina 1531 no Karaf sem disparar a instalação imediata."

## 12. Catálogo de Rotinas
Rotinas (.EXE/.PC) descobertas no catálogo local, atualização direta da Central de Controle WinThor (CCW), gerenciamento de rollback (.bak), inspeção de versão PE e programas mapeados manualmente na UI.

*   **`routines_list` / `routines_check_karaf_status`**: Lista as rotinas descobertas no catálogo (com metadados de versão `fileVersion` extraídos) e checa se o servidor Apache Karaf / WTA está online e respondendo para autenticar rotinas via WinThor Start.
*   **`routines_launch` / `routines_launch_mapped`**: Executa uma rotina pelo caminho completo do arquivo (suportando WinThor Start autenticado ou execução direta com `forceDirect`), ou um programa mapeado manualmente pelo id.
*   **`routines_toggle_favorite`**: Marca ou desmarca uma rotina como favorita.
*   **`routines_download_ccw_routine`**: Baixa uma rotina oficial diretamente da Central de Controle WinThor (CCW), descompacta caso venha em ZIP, cria backup `.bak` preventivo com timestamp se o arquivo já existir e grava na pasta do módulo em `Prod`.
*   **`routines_install_local_file`**: Instala um executável ou pacote ZIP a partir de um arquivo local na máquina diretamente para o diretório de destino sob `Prod`, com criação preventiva de backup `.bak`.
*   **`routines_get_ccw_catalog`**: Consulta a árvore completa oficial de módulos e rotinas disponibilizada pela Central de Controle do WinThor (requer cookie de sessão CCW).
*   **`routines_get_ccw_download_link`**: Gera a URL direta oficial de download da CCW para uma rotina e versão específica do WinThor.
*   **`routines_get_ccw_cycles`**: Consulta os ciclos de evolução e versões oficiais disponíveis para download na Central de Controle WinThor (ex: 38.00, 37.00, 36.00).
*   **`routines_list_backups`**: Lista todos os arquivos de backup (`.bak`) existentes para uma rotina ou módulo funcional, com data/hora, tamanho e versão PE extraída do executável de backup.
*   **`routines_restore_backup`**: Restaura uma versão anterior (.bak) para o executável ativo, criando preventivamente um backup de segurança (`_pre_rollback.bak`) antes da substituição.
*   **`routines_delete_backup`**: Remove um arquivo de backup (`.bak`) de rotina do disco.
*   **`routines_get_executable_version`**: Inspeciona os metadados do cabeçalho binário (PE Header) de um `.EXE` local para extrair as versões reais gravadas (`FileVersion` e `ProductVersion`).
*   **`routines_batch_download`**: Orquestra o download e atualização em lote da Central de Controle (CCW) para todas as rotinas favoritas, um módulo funcional inteiro ou uma lista personalizada.

**Exemplo de como pedir à IA:**
> "Verifique se o Karaf está online e abra a rotina 132 pelo WinThor Start."
> "Abra a rotina 316 do catálogo e marque ela como favorita."
> "Baixe e atualize a rotina 132 versão 30 da Central de Controle do WinThor para a pasta Prod."
> "Gere o link de download direto da rotina 530 na CCW para a versão 30."
> "Instale o executável baixado D:\Downloads\PCSIS530.EXE no módulo MOD-005 com backup prévio."
> "Liste os backups existentes da rotina 132 e me mostre a data e a versão de cada um."
> "Faça o rollback da rotina 132 restaurando o backup PCSIS132.EXE.2026-09-29T10-00-00.bak."
> "Qual é a versão real gravada no executável C:\Winthor\Prod\MOD-001\PCSIS132.EXE?"
> "Atualize em lote todas as minhas rotinas favoritas da versão 30 da CCW."

---

## 13. Qualidade & Validador Regressivo (QA Suite)
Automação de homologação regressiva para equipes de QA e desenvolvedores: executa sequências de consultas SQL contra o banco Oracle, extrai valores e valida conformidade de colunas contra dados de payloads JSON (PDV/APIs) ou regras estritas.

*   **`qa_list_templates`**: Lista todos os cenários/templates de regressivo disponíveis na pasta dedicada (ex.: Venda PDV Completa, Cancelamento, Kits e Cestas).
*   **`qa_get_template`**: Consulta a definição detalhada de um template por ID, com todas as suas queries SQL e asserções configuradas.
*   **`qa_save_template`**: Cria ou atualiza um template de teste regressivo no catálogo local do Hub Manager, persistindo título, queries SQL, binds, variáveis e regras de asserção contra colunas.
*   **`qa_delete_template`**: Remove um template de teste regressivo do catálogo local pelo ID.
*   **`qa_fetch_incoming_payload`**: Localiza e recupera o payload JSON original de uma transação gravado na tabela `PCINTEGRACAOCORE` (coluna `DADOSTRANSFORMADOS`) do Oracle. Permite buscar por CPF/CNPJ do consumidor (`cgcEnt`), número de cupom fiscal/venda, chave de 44 dígitos da NFC-e/NF-e, ID externo ou listar transações recentes.
*   **`qa_fetch_api_payload`**: Dispara uma requisição HTTP (GET ou POST) a um serviço de mensageria, API gateway ou endpoint externo e extrai o payload JSON de entrada para alimentar o validador regressivo. Suporta cabeçalhos customizados (tokens, Bearer) e JSONPath para navegar até o objeto desejado (ex: `"data.pedido"`).
*   **`qa_run_regression_suite`**: Executa a esteira de asserções de um template contra o banco de dados Oracle, resolvendo binds (`:codFilial`, `:numCupom`) e avaliando cada coluna contra JSONPath (`$.vlTotal`), valores literais, preenchimento (`<S>`), nulidade (`<N>`) ou zero (`<0>`). Suporta execução por `templateId` ou template *inline* ad-hoc, e leitura de payload JSON tanto por string direta (`rawJson`) quanto por arquivo em disco (`jsonFilePath`). Retorna o relatório analítico e gera evidência formatada em Markdown para colar diretamente no Jira.

**Exemplo de como pedir à IA:**
> "Consulte a API 'http://localhost:8080/api/v1/pedidos/12345' e use o payload retornado para rodar o teste regressivo de venda."
> "Busque o payload JSON gravado na PCINTEGRACAOCORE para o cliente com CPF 68886626088 e execute o teste regressivo de venda."
> "Consulte a última transação da PCINTEGRACAOCORE pelo cupom 271454 da filial 1 e me mostre o JSON transformado."
> "Liste os cenários de teste regressivo de QA cadastrados."
> "Crie um template de teste regressivo chamado 'Validação de Devolução WSH' com query na PCDEVCONSUM e asserção de que CODCLI é igual ao do JSON."
> "Execute o teste regressivo 'wsh-venda-pdv-completa' para a filial 1 usando o payload do arquivo 'C:\Testes\cupom_4387.json' e gere o relatório para a issue PROJ-123."
> "Valide se a venda 10047 gravou corretamente os cabeçalhos PCNFSAID, PCPEDC e a movimentação fiscal PCMOV."
> "Exclua o template de teste temporário 'temp-homolog-123'."

### 13.1. Teste de bloqueio de login do WinThor (homologação)
As mesmas 12 checagens da aba **Validação de Cenários → Bloqueio de Login**, com tentativas controladas contra o login do WTA (`/winthor/autenticacao/v1/login`) e a correlação com o `winthor.log` e a API `/winthor/ferramenta/servidor/v1/logs`.

*   **`qa_list_auth_lockout_checks`**: Lista as 12 checagens (limiar, senha certa durante o bloqueio, troca de cliente, bloqueio por usuário, logoff, concorrência, duração, janela de contagem, exceções de APIs, exposição de erro, registro de logs e falha do destino de logs), com a tentativa e o que precisa ser verdade, e os padrões (URL do WTA, API de logs, `winthor.log`, limiar 5, janela 60 s, durações candidatas 4 e 5 min).
*   **`qa_run_auth_lockout_test`** (destrutiva, pede confirmação): **bloqueia as contas de teste de propósito**. Recebe login e senha dos usuários A e B (a senha vai como MD5 em maiúsculas, como o WTA espera; `passwordEncoding: "plain"` manda o texto puro) e, sem `checks`, roda as checagens rápidas (~2 min); `includeSlow` acrescenta a duração do bloqueio e a janela de contagem (~8 min). Devolve o status de cada checagem (`passed`, `failed`, `warning`, `info`, `manual`, `skipped`), como cada uma foi testada (`plan`), as evidências, o passo a passo (`log`: cada etapa explicada e cada requisição com o esperado) e o relatório em Markdown com senhas e tokens mascarados. A checagem do destino de logs só roda com `logSinkUnavailableConfirmed`, depois que a pessoa derrubou o log por um mecanismo autorizado.

**Exemplo de como pedir à IA:**
> "Liste as checagens do teste de bloqueio de login e os padrões que ele usa."
> "Rode o teste de bloqueio de login rápido com os usuários TESTE_A e TESTE_B (senhas a seguir) e me diga quais regras falharam."
> "Rode só a duração do bloqueio e a janela de contagem com o usuário TESTE_A e me diga se o bloqueio é de 4 ou de 5 minutos."


### 13.2. Validação de API (status, tempo, cabeçalho, corpo, JSON e banco)
Os cenários da aba **Validação de Cenários → Validação de API**: uma requisição e o que a resposta precisa ter. Ficam em `api-scenarios.json`, ao lado do `config.json`, sem nenhum segredo.

*   **`qa_list_api_scenarios`**: Lista os cenários salvos (nome, método, URL com `{{wtaUrl}}`, autenticação e regras).
*   **`qa_run_api_scenario`**: Roda um cenário salvo (`scenarioId`) ou uma definição avulsa (`scenario`, sem salvar) e confronta a resposta com cada regra (`kind`): `status` (`equals`, `not-equals`, `in` com lista `200, 201` ou faixa `2xx`), `duration` em ms (`less`, `greater`), `header` (`exists`, `not-exists`, `equals`, `contains`), `body` (`contains`, `not-contains`, `matches` com regex de até 300 caracteres), `json` por caminho (`equals`, `not-equals`, `contains`, `exists`, `not-exists`, `not-empty`, `greater`, `less`, `length-equals`) e `db`, que compara um campo da resposta com a primeira coluna de uma consulta SELECT numa conexão do DB Studio (`connectionId`, `sql` e, opcionalmente, `bindPath`, o campo da resposta que entra como `:valor`). Para exceções não mapeadas: `leak` (a resposta não pode expor stack trace, a mensagem crua da exceção, como `For input string: "NUMERO"`, `Failed to convert value of type [java.lang.String]` ou `nested exception is`, erro ORA-/SQL, string de conexão, senha ou token; o obtido traz o trecho que vazou) e `log` (o texto em `expected`, padrão `{{requestId}}`, precisa aparecer nas linhas novas do `winthor.log` e/ou na API de logs; `logSource` = `file`, `api` ou `any`). Cada execução devolve um `requestId`, enviado em `X-Request-Id`/`X-Correlation-Id` e usável como `{{requestId}}` na URL, nos cabeçalhos e no corpo. Devolve esperado, obtido e se passou em cada regra, a resposta com tokens mascarados, o passo a passo e o relatório em Markdown. Com `auth: "settings-wta"`, entra antes no WTA com o login de Configurações (senha em MD5).
*   **`qa_save_api_scenario`**: Cria ou atualiza (com `id`) um cenário, que aparece na tela.
*   **`qa_delete_api_scenario`** (destrutiva, pede confirmação): Apaga um cenário pelo id.

**Exemplo de como pedir à IA:**
> "Chame {{wtaUrl}}/winthor/ferramenta/servidor/v1/logs com o login do WTA e confira se o status é 200 e se $.itens não está vazio."
> "Salve um cenário de Validação de API para a rota de filiais que confira status 2xx e $.total maior que 0."
> "Rode todos os cenários de Validação de API e me diga quais regras falharam, com o esperado e o obtido."
> "Chame a API de filiais e confira se $.nome bate com SELECT FANTASIA FROM PCFILIAL WHERE CODIGO = :valor na conexão Oracle de homologação, usando $.codigo como :valor."
> "Confira se a API de logs responde em menos de 2 segundos, com content-type JSON e sem a palavra Exception no corpo."
> "Chame {{wtaUrl}}/winthor/pedidos?numero=NUMERO e confira se o erro não volta como UNK-ERR nem com a mensagem crua da exceção."
> "Mande um POST para {{wtaUrl}}/winthor/pedidos com um campo que não existe e confira se volta 4xx em JSON, sem stack trace nem SQL, e se o erro aparece no winthor.log pelo requestId."

### 13.3. Histórico de execuções da Validação de Cenários
As últimas 50 execuções do Bloqueio de Login e da Validação de API, rodadas pela tela, pelo modo Web ou pelo MCP. Ficam em `scenario-runs/`, ao lado do `config.json`, um arquivo por execução, com senhas e tokens já mascarados. Na tela, o botão **Histórico** da página abre, baixa (.md) e apaga cada uma.

*   **`qa_list_scenario_runs`**: Lista as execuções, mais recentes primeiro (id, tipo, nome, início, duração, veredito e resumo). `kind` filtra por `auth-lockout` ou `api`.
*   **`qa_get_scenario_run`**: Devolve uma execução completa pelo id: regras com esperado e obtido, evidências, passo a passo, requisição enviada (credenciais mascaradas) e o relatório em Markdown.

**Exemplo de como pedir à IA:**
> "Liste as últimas execuções da Validação de API e me diga quais falharam."
> "Abra a última execução do Bloqueio de Login e resuma o que reprovou, com as evidências."

---

## 14. Test Runners & Automação de Testes (Maven, Playwright, Cypress, Newman)
Executa suítes completas de testes automatizados unitários, de integração, E2E ou de contratos de API REST com captura e streaming de logs em tempo real, cálculo de métricas e vínculo com a Matriz de Validação da Central de Qualidade.

*   **`test_runner_list`**: Lista todos os executores/suítes de testes automatizados configurados no Hub Manager.
*   **`test_runner_execute`**: Dispara a execução de um runner por ID ou configuração inline (suporta Maven `mvn test`/`verify`, Playwright `npx playwright test`, Cypress `npx cypress run`, Newman `npx newman run` ou scripts personalizados). Retorna métricas detalhadas (testes passados, falhas, pulados, duração, código de saída e resumo).
*   **`test_runner_history`**: Obtém o histórico persistido das últimas execuções de testes automatizados com seus status e resultados analíticos.

**Exemplo de como pedir à IA:**
> "Liste os runners de testes automatizados configurados."
> "Execute a suíte de testes unitários do Maven no projeto de faturamento e me avise se todos os testes passaram."
> "Rode os testes E2E do Playwright e me mostre o histórico das últimas execuções."

---

## 15. TAUT & Automação Cypress (QA Hub)
Integração com o projeto de testes automatizados Cypress (**TAUT**), localizado pela pasta configurada em Configurações > Qualidade & QA ou detectada automaticamente (`taut*`, `cypress-tests`, `cypress`, `e2e-tests`). Permite que assistentes de IA disparem suítes de teste Cypress por tags (@cypress/grep), auditem a cobertura do Zephyr Scale (`COVERAGE.md`), listem specs por módulo, sincronizem credenciais de banco e processem arquivos CSV para intake de automação com IA.

*   **`taut_get_status`**: Inspeciona a integridade da pasta do projeto TAUT, validando versão do Cypress, configuração do `cypress.config.ts` e variáveis do `.env` (Oracle e WTA).
*   **`taut_run_tests`**: Executa testes Cypress no TAUT com filtros flexíveis de tags (`tags: "critico,winthor-pedido-venda,-develop"`), specs (`spec: "cypress/e2e/api/Pedido/**/*"`) e modo de API (`v39` ou `legacy`), coletando extrato da execução e métricas de aprovação/falhas.
*   **`taut_get_coverage`**: Analisa a paridade entre os cenários desenhados nos CSVs da pasta `/Insumo/` (chaves `ABC-T123`, ou só as do prefixo configurado em Configurações > Qualidade & QA) e os testes implementados em `cypress/e2e/`, reportando percentual de cobertura e lista de testes pendentes. Sem CSV na pasta `Insumo/`, o percentual não é calculado (`baselineMissing`).
*   **`taut_list_specs`**: Varre todos os arquivos `.cy.ts` do projeto TAUT, retornando quantidade de testes, tags de módulo e chaves do Zephyr associadas a cada spec.
*   **`taut_sync_env`**: Gera ou atualiza o arquivo `.env` do projeto TAUT utilizando a conexão Oracle ativa no Hub Manager (`ORACLE_USER`, `ORACLE_PASSWORD`, `ORACLE_CONNECT_STRING`) e parâmetros do WTA. As credenciais da API (`CYPRESS_API_USUARIO`/`CYPRESS_API_SENHA`) só são gravadas quando o login do WTA está configurado.
*   **`taut_process_csv_intake`**: Atua como o Orquestrador de Intake (Subagente 0) do TAUT: lê um arquivo CSV do Zephyr, valida a chave do cenário, o endpoint, a coluna Serviço e a existência de cenários de contrato e negativo, e gera o bloco estruturado e plano de implementação das 4 camadas.

**Exemplo de como pedir à IA:**
> "Verifique o status do projeto TAUT e confira se o .env está configurado com o Oracle."
> "Sincronize o .env do TAUT com a minha conexão Oracle ativa no Hub Manager."
> "Execute os testes críticos de Pedido do TAUT com a tag 'critico,winthor-pedido-venda'."
> "Qual é a cobertura atual de testes do Zephyr no TAUT e quais cenários ainda estão pendentes?"
> "Liste todas as specs de teste do TAUT relacionadas a Tributação e ICMS."
> "Processe o CSV Insumo/pedido.csv e gere o plano de implementação de automação para mim."


---

## 16. API Studio & Cliente HTTP REST (Postman)
Executa chamadas HTTP e gerencia coleções estilo Postman com suporte a interpolação de variáveis (`{{host}}`, `{{port}}`, `{{TOKEN}}`), tokens Bearer e autenticação integrada com a API do WinThor.

*   **`http_send_request`**: Executa chamadas HTTP diretas (GET, POST, PUT, DELETE, PATCH, etc.) com URL, cabeçalhos opcionais, body (JSON, form-data ou texto) e variáveis de ambiente.
*   **`http_list_collections`**: Lista todas as coleções, pastas e requisições salvas no cockpit do desenvolvedor.
*   **`http_login_winthor`**: Realiza autenticação na API do WinThor com usuário e senha (`/winthor/autenticacao/v1/login`) e retorna o accessToken.
*   **`http_import_postman_collection`**: Importa coleções exportadas do Postman (formato JSON v2.1/v2.0) contendo pastas, rotas, corpos e exemplos.

**Exemplo de como pedir à IA:**
> "Faça uma requisição GET para 'http://localhost:8181/winthor/autenticacao/v1/usuariologado' usando o Bearer Token ativo."
> "Autentique no WinThor com usuário PCADMIN e me informe o token gerado."
> "Liste as coleções de API que tenho salvas no API Studio."
> "Importe a coleção Postman que está no arquivo collection.json."

---

## 17. Build Delphi (MSBuild)

Compila projetos Delphi (10.x, 11, 12) pela mesma cadeia da IDE, sem abrir o RAD Studio. As tools começam com `delphi_...`.

*   **`delphi_detect_installations`**: Lista as versões do RAD Studio/Delphi instaladas e o `rsvars.bat` de cada uma.
    > "Quais versões do Delphi tenho instaladas?"
*   **`delphi_list_projects`**: Procura arquivos `.dproj` na pasta de projetos configurada (ou na pasta informada).
    > "Liste os projetos Delphi da minha pasta de projetos."
*   **`delphi_build`**: Compila um `.dproj` e devolve erros e avisos já estruturados (arquivo, linha, código E/W/H do compilador) e o `.exe` gerado.
    > "Compile o Rotina2075.dproj em Debug e me diga o que quebrou."
*   **`delphi_run_pipeline`**: Encerra o `.exe` em execução, compila, publica o executável numa pasta (guardando a versão anterior como `.bak`) e o abre.
    > "Compile a rotina 2075 e publique em Prod, depois abra para eu testar."

---

## 17.1. Rastreio de Integração ponta a ponta (WinThor → WSH → CH → PDV)

Ajuda a saber, na máquina local, em qual ponta da cadeia de integração está o problema. Usa o que foi preenchido em **Configurações → Integração ponta a ponta**; o que ficar em branco é ignorado. As tools começam com `integration_...`. A decisão completa está em `docs/decisions/0003-rastreio-de-integracao-ponta-a-ponta.md`.

*   **`integration_check_readiness`**: Pré-voo das quatro camadas (WinThor, WSH, CH e PDV). Para cada uma confere serviço Windows, processo, porta, health HTTP, login do WinThor, conexão Oracle/Postgres e arquivo de log, devolvendo status (`ok`, `warning`, `failed`, `not-configured`), detalhe e duração de cada verificação, mais um resumo que diz se o ambiente está pronto para testar. Só lê: o único efeito é emitir um token de login do WinThor, que não aparece no resultado.
    > "Antes de eu testar o fluxo de venda, confira se WinThor, WSH, CH e PDV estão no ar e me diga qual camada está fora."
*   **`integration_check_batch`**: Rastreia um lote já executado, sem disparar nada. Vale para fluxos de saída (produto, preço, estoque...); a venda é de entrada e não usa lote. Prova o que consegue com as fontes disponíveis: o lote e o status de cada loja na API do PDVSync (login RAC configurado na camada CH), a chegada no PDV por consulta SQL somente leitura (com espera e repetição até o tempo do fluxo), o dado na retaguarda Oracle, a chamada da API do WinThor no APM e as linhas dos logs do WSH e do CH que citam o lote. Devolve os oito passos como `ok`, `failed`, `pending` (ex.: lojas ainda baixando) ou `unknown` (sem evidência, nunca sucesso), o passo em que quebrou (`brokenAt`), observações sobre fontes indisponíveis e o relatório em Markdown para o Jira. Grava o resultado no histórico (últimos 50). Parâmetros: `flowId`, `batchNumber`, `lookbackMinutes` (padrão 120) e `branchId` (filial opcional).
    > "O lote 48213 do fluxo de venda chegou no PDV? Rastreie e me diga em que passo quebrou."
*   **`integration_check_wsh`**: Consulta o que o WSH gravou na `PCINTEGRACAOCORE` (pela conexão Oracle da camada WinThor, sem credencial do PDVSync), filtrando por rota, trecho do `IDEXTERNO`, status e período. Devolve cada item com status, tentativas, datas da busca e do envio e a resposta do PDVSync lida da `OBSERVACAO`, com os erros do próprio item separados dos de outros itens do mesmo envio. Cada item com erro traz `suggestions` (o que fazer, em ordem, com o link do TDN quando o PDVSync manda). Com `routeId`, devolve também `dependencies`: a última integração de cada fluxo do qual aquele depende (ex.: Produto → ICMS, PIS/COFINS e NCM).
*   **`integration_list_traces` / `integration_get_trace`**: Listam os rastreios guardados (mais recentes primeiro, com o passo em que quebrou) e devolvem um deles por id, com passos, trechos de log e relatório.
    > "Mostre o último rastreio que falhou e cole o relatório para o Jira."

---

## 18. Segurança e modo somente leitura

O servidor MCP roda via stdio com o mesmo poder do Cockpit na sua máquina, então ele ajuda o cliente a pedir confirmação antes do que é perigoso:

*   **Anotações de risco**: toda tool declara `readOnlyHint` e `destructiveHint`. Consultas (`*_get_*`, `*_list_*`, `db_explain_plan`...) são leitura; ações que apagam dados, executam comando livre ou mudam configuração (`db_execute_query`, `db_restore_backup`, `db_run_backup`, `db_run_restore_drill`, `db_save_backup_config`, `profile_run`, `env_launch_app`, `karaf_exec_command`, `docker_remove_container`, `delphi_build`, `delphi_run_pipeline`, `settings_save`, `logs_clear_file`...) são marcadas como destrutivas, para o cliente (Claude Code, Copilot...) pedir a sua aprovação.
*   **Modo somente leitura**: defina `HUB_MCP_MODE=readonly` no ambiente do servidor MCP e só as tools de leitura (95 das 178) são registradas. As demais nem aparecem para o cliente. No Claude Code: `claude mcp add dev-manager --scope user -e HUB_MCP_MODE=readonly -- cmd /c C:\DevManager\mcp\dev-manager-mcp.cmd`. Nos arquivos JSON, use o campo `env`.
*   **Contagem por risco**: das 178 tools, 95 são de leitura, 54 de escrita e 29 destrutivas. Os números ficam em `src/shared/mcpCatalog.ts`, e um teste falha se divergirem das tools registradas.
*   **Produção protegida**: `db_execute_query` recusa qualquer comando que não seja de leitura (`SELECT`, `EXPLAIN`, `SHOW`, `DESCRIBE`) em conexão marcada como **produção** no Database Studio, inclusive quando a conexão é informada inline e aponta para o mesmo destino de uma conexão de produção salva.
*   **Arquivos de log**: `logs_clear_file` só zera arquivos com extensão de log (`.log`, `.out`, `.err`, `.txt`, `.trace`), e nenhuma tool de log lê a pasta de dados do app (onde ficam o `config.json` e a chave de criptografia).

---

## 18. Métricas de uso

Consulta a contagem **local** de uso do Hub Manager nesta máquina: quantas vezes cada automação foi executada, com sucesso ou falha, e quanto tempo levou, agrupado por módulo, ação e origem (interface, API REST ou MCP). São só contadores e durações: nunca há SQL, caminhos, prompts, respostas da IA ou credenciais. A contagem pode ser desligada em **Configurações → Meu uso**.

*   **`usage_get_summary`**: Retorna o resumo de uso (totais, por módulo, por semana e por ação). Aceita `from` e `to` (`AAAA-MM-DD`, inclusivos) para filtrar o período. É de leitura e a própria consulta não conta como uso.

*   **`usage_get_impact`**: Retorna o tempo economizado (usos com sucesso × o tempo que a pessoa levava à mão − o tempo real), nos últimos 7 dias, 30 dias e desde o início, por módulo e por automação. Cada automação traz a origem do tempo manual (`default` = estimativa padrão, `user` = informado pela pessoa) e `confirmedMs` é a parte baseada em tempo informado. Falhas não contam e a economia nunca é negativa. Também é de leitura e não conta como uso.

**Exemplo de como pedir à IA:**
> "Quantas vezes usei o pipeline de ambiente nos últimos 30 dias, e quanto tempo isso levou no total?"
> "Quais módulos do Hub Manager eu mais usei neste mês?"
> "Quanto tempo o Hub Manager me economizou neste mês, e quanto disso é estimativa?"
