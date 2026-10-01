# Documentação das Ferramentas MCP (Model Context Protocol)

O Dev Manager expõe **145 ferramentas (tools)** através de seu servidor MCP embutido. Estas ferramentas permitem que assistentes de Inteligência Artificial (como o próprio Antigravity ou outras IAs conectadas via MCP) leiam contextos, executem automações e gerenciem o ambiente local de desenvolvimento no Windows.

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
*   **`settings_get` / `settings_save`**: Lê as configurações do Dev Manager (com segredos ofuscados) e grava um conjunto parcial delas.

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
*   **`karaf_start_embedded` / `karaf_stop_embedded` / `karaf_is_embedded_running`**: Inicia, encerra e verifica se a instância do Karaf embutida do Dev Manager está ativa.
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
Ferramentas para manipular a stack do Docker. As ferramentas funcionam para chamadas que começam com `docker_...` ou `container_...`.

*   **`docker_status` / `docker_list_containers` / `docker_get_stats`**: Lista containers locais em execução e seu consumo.
*   **`docker_start_container` / `docker_stop_container` / `docker_restart_container` / `docker_remove_container`**: Gerencia o ciclo de vida dos containers.
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
*   **`llm_chat`**: Proxy direto para conversar com os modelos (OpenAI, Anthropic, Gemini, etc) pelo Dev Manager.

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

**Exemplo de como pedir à IA:**
> "Mostre as colunas da tabela PCEMPR."
> "Rode um Explain Plan na query 'SELECT * FROM PCPEDIDO' e analise se há problemas de performance."
> "Quais sessões estão ativas no Oracle agora e o que cada uma está rodando?"
> "Quais foram as últimas queries que rodaram no schema APP_KARAF?"
> "Quais foram os parâmetros passados na query com SQL_ID '5g4b09m8d123k' no Oracle? Me mostre a SQL pronta para rodar."
> "Liga a captura do Oracle no schema APP_KARAF; vou gravar um pedido no WinThor e depois te aviso para você me dizer quais SQLs rodaram."

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

*   **`db_run_backup` / `db_list_backups` / `db_restore_backup` / `db_run_restore_drill`**: Executa backup manual, lista arquivos existentes, restaura um backup e testa a restaurabilidade contra uma conexão "scratch" descartável.
*   **`db_save_backup_config` / `db_list_backup_history`**: Salva o agendamento (cron) de backup/restore drill de uma conexão e consulta o histórico persistido de execuções.
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


