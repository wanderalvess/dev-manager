# Documentação das Ferramentas MCP (Model Context Protocol)

O Dev Manager expõe **106 ferramentas (tools)** através de seu servidor MCP embutido. Estas ferramentas permitem que assistentes de Inteligência Artificial (como o próprio Antigravity ou outras IAs conectadas via MCP) leiam contextos, executem automações e gerenciem o ambiente local de desenvolvimento no Windows.

Abaixo, as ferramentas estão categorizadas por domínio, para ajudar você a entender o que a IA pode fazer e como você pode pedir (exemplos de prompts).

---

## 1. Sistema e Ambiente Windows
Permite verificar e manipular o ambiente local: matar processos, iniciar serviços, checar portas, e muito mais.

*   **`system_get_info` / `system_get_metrics`**: Lê versão do SO, consumo de RAM, CPU e caminhos instalados.
*   **`env_get_services_status` / `env_start_service` / `env_stop_service`**: Lista e gerencia Serviços do Windows.
*   **`env_get_processes_status` / `env_batch_kill_processes` / `env_check_ports`**: Verifica processos rodando, libera portas ocupadas e mata tarefas travadas.
*   **`env_launch_ide` / `env_launch_app`**: Inicia a sua IDE (IntelliJ, VS Code) ou outros executáveis no Windows.
*   **`env_reset_environment`**: Executa uma automação completa de "reset" para limpar o ambiente local e subir tudo do zero.

**Exemplo de como pedir à IA:**
> "Verifique o status do meu ambiente, mate qualquer processo preso na porta 8181 e inicie a IDE."

---

## 2. Automação e Perfis (Profiles)
Ferramentas de orquestração local (macros).

*   **`profile_run` / `profile_stop`**: Roda um perfil de automação completo que você tenha configurado na UI.
*   **`profile_run_step` / `profile_restart_step`**: Roda ou reinicia um passo individual de automação.

**Exemplo de como pedir à IA:**
> "Rode meu perfil de automação 'Subir Ambiente Local' e avise quando terminar."

---

## 3. Servidor Apache Karaf e Bundles
Domínio completo para interagir com o Karaf, inspecionar logs, diagnosticar conflitos OSGi e fazer deploys.

*   **`karaf_start_embedded` / `karaf_stop_embedded` / `karaf_get_embedded_output`**: Inicia/lê e encerra a instância do Karaf embutida do Dev Manager.
*   **`karaf_list_bundles` / `karaf_get_bundle_details` / `karaf_manage_bundle`**: Lista, inspeciona e reinicia (start/stop/refresh/resolve) bundles OSGi.
*   **`karaf_detect_wiring_conflicts`**: Analisa ativamente todos os bundles parados, com falhas, ou duplicados e diagnostica erros (como *Unsatisfied Requirements* e conflitos de *Classloader*).
*   **`karaf_deploy` / `karaf_build_and_deploy` / `karaf_run_maven_build`**: Executa o maven local no seu repositório e injeta o bundle compilado dentro do Karaf.
*   **`karaf_get_log`**: Lê diretamente o arquivo `karaf.log` sem precisar abrir.

**Exemplo de como pedir à IA:**
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

*   **`git_list_projects` / `git_get_project_info`**: Lista projetos na pasta de trabalho e exibe branch atual e upstream.
*   **`git_exec_command` / `git_checkout_branch`**: Permite fazer checkout de branches, pull, stash e status.
*   **`git_build_pr_url`**: Monta um link direto para criar um Pull Request no Azure/GitHub/GitLab da branch atual.

**Exemplo de como pedir à IA:**
> "Em qual branch estou no repositório de vendas? Dê um git pull e monte a URL de Pull Request."

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
*   **`db_execute_query`**: Executa SELECTs de modo seguro no banco e retorna resultados tabulares.
*   **`db_explain_plan` / `db_analyze_explain_plan`**: Roda Planos de Execução do banco e usa Inteligência Artificial Heurística para avisar sobre lentidão (ex: Full Table Scans, falta de índices, ou ordenações custosas).

**Exemplo de como pedir à IA:**
> "Mostre as colunas da tabela PCEMPR."
> "Rode um Explain Plan na query 'SELECT * FROM PCPEDIDO' e analise se há problemas de performance."

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
