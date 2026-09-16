# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

Cada versão abaixo corresponde a um commit específico em `main`, do `v1.0.0` até aqui — tags criadas retroativamente sobre o histórico já existente (sem reescrever nenhum commit).

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
