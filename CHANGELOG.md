# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

Cada versão abaixo corresponde a um commit específico em `main`, do `v1.0.0` até aqui — tags criadas retroativamente sobre o histórico já existente (sem reescrever nenhum commit).

## [1.32.0] - 2026-10-06
### Adicionado
- **Qualidade em páginas próprias**: o menu **QA** do cabeçalho agora abre quatro páginas separadas — **Homologação** (Matriz, Prontidão e Roadmap; atalho `Alt+Q`), **Validador Regressivo**, **Test Runners** e **TAUT (Cypress)**. Cada página mostra só o que é dela; Release, Exportar Relatório e Novo Cenário ficam apenas em Homologação. A Matriz de Validação é única e compartilhada, então o resultado de um runner continua atualizando os cenários vinculados. As novas páginas também aparecem na busca rápida (`Ctrl+K`).
- **Matriz de Validação**: editar cenário já criado (título, alvo, categoria e notas), exportar os cenários exibidos em **CSV** (UTF-8, com proteção contra injeção de fórmula no Excel), ordenar por Status, Cenário, Alvo, Categoria e Atualizado (em Status, falhas e bloqueios vêm primeiro), coluna **Atualizado**, contador "Exibindo N de M" com *Limpar filtros* e cards de métrica clicáveis que filtram a Matriz por status.
- **Primeiro uso**: ao concluir o tour, os caminhos obrigatórios vazios (repositórios, IDE) são preenchidos com o que a detecção automática encontrar, e o app avisa quais foram preenchidos. Nunca sobrescreve valores já configurados.
- **Instalador (NSIS)**: sempre em pt-BR, com atalhos de Desktop e Menu Iniciar e execução ao finalizar declarados explicitamente.

### Alterado
- **Marca**: "Dev Manager" deu lugar a **Hub Manager** na interface, na Central de Ajuda, nas descrições das tools MCP, no README, no DOCKER.md, no AGENTS.md, no LEIA-ME e nas notas de release. O README e o LEIA-ME apontam o instalador `Hub Manager Setup <versão>.exe` e a variável `HUB_MANAGER_EXE`; o launcher do MCP continua aceitando `DEV_MANAGER_EXE`. A pasta de dados, o `dev-manager-mcp.cmd` e o nome do servidor MCP não mudaram.
- **Configurações → Qualidade**: deixa claro que a sincronização com Zephyr, Jira e Azure ainda não existe (as fontes só ficam registradas); o selo "ATIVA" virou "SELECIONADA".
- **Remover cenário** da Matriz pede confirmação.
- Removido o código sem uso de *evidências* (`QualityEvidence` e a seção do relatório em Markdown), que nenhuma tela utilizava.

### Corrigido
- **Onboarding reaparecia na 2ª abertura**: o app apagava os marcadores gravados quando o usuário pulava a introdução antes de o Electron responder a primeira execução. Recarregar a janela também não reabre mais o onboarding nem o "O que há de novo", e a versão do app passa a ser lida na primeira execução.
- **"Detectar automaticamente"** sobrescrevia caminhos já configurados com vazio quando a detecção não achava nada; agora só preenche campos vazios.
- **Dados ao atualizar**: a pasta de dados do Electron (`localStorage`: Matriz de Qualidade, tema, marcadores de onboarding) fica fixa em `%APPDATA%\dev-manager`. A troca do nome do pacote para `hub-manager` a moveria e faria quem atualiza perder esses dados.
- **Sincronização de Test Runners com a Matriz**: o aviso podia mostrar contagem errada; runner abortado agora marca o cenário como *Bloqueado* (antes virava *Falha*); vínculos que já não existem na Matriz são avisados.
- **Prontidão** sem cenários mostra "Sem cenários para avaliar" em vez de "Bloqueado".
- **Acessibilidade na Qualidade**: rótulos nos filtros, busca, status, ações de linha e campo de release; o modal de cenário tem `role="dialog"`, fecha com `Esc` e a tabela anuncia a ordenação (`aria-sort`). A tabela da Matriz tem largura mínima por coluna, para não espremer o texto em telas estreitas.

### Testes
- Cobertura de `readinessScore`, tolerância numérica das asserções e das regras de sincronização e edição da Matriz (lógica extraída dos hooks para funções puras). Verificado por mutação: as 5 alterações propositais de código que antes passavam sem falha agora são detectadas.

## [1.31.3] - 2026-10-05
### Alterado
- **Identidade do Produto (Rebranding)**: o cockpit agora se chama **Hub Manager**, com o subtítulo oficial *"Cockpit Integrado de Operação, Desenvolvimento e Qualidade"*. O novo posicionamento reflete a evolução da plataforma para atender toda a squad (Dev, QA, PO e SME) em fluxos de infraestrutura, banco de dados, catálogo de rotinas, qualidade de software e observabilidade.
- **Legibilidade**: nenhum texto da interface fica abaixo de 11px. O novo token `text-2xs` (11px) substituiu todas as fontes de 7 a 10,5px em badges, rótulos de seção, dicas de atalho e consoles.
- **Qualidade**: as abas agora estão agrupadas em Automação (TAUT, Test Runners), Validação (Matriz, Validador Regressivo) e Entrega (Prontidão, Roadmap). Os badges decorativos ("QA Hub", "Automação", "Oracle QA") saíram; ficam só a contagem da Matriz e a nota de Prontidão. Abas renomeadas: "TAUT (Cypress)", "Matriz" e "Prontidão (PO)".
- **Configurações**: as abas ficam em três grupos separados por divisor, e o contador só aparece quando há itens (antes mostrava 0). A barra virou o componente `SettingsTabsNav`.
- **Contraste**: o texto do botão primário atinge 4,5:1 em todos os temas (texto escuro nos temas escuros; laranja e verde do tema claro levemente mais escuros). No tema claro, tons fixos como `text-emerald-500`/`-600` e o texto secundário em chips ficam mais escuros, preservando consoles e superfícies escuras.

### Corrigido
- **Acessibilidade**: os campos de Configurações agora têm rótulo associado (`label` ligado ao campo ou `aria-label`), incluindo busca, perfis de ambiente, launchers por extensão, portas monitoradas e o toggle do WinThor Start. Leitores de tela leem o nome do campo, e o rótulo não some mais ao digitar.
- **Central de Ajuda**: os nomes das abas de Qualidade no Guia dos Módulos e nos atalhos acompanham a nova interface.

## [1.31.2] - 2026-10-05
### Alterado
- **Qualidade — Painel de Prontidão (PO)**: os cartões por categoria (Rotinas Delphi, Serviço Karaf, API REST, Fluxo E2E) agora mostram números reais calculados da Matriz de Validação (aprovados/total, barra de progresso e contagem de pendentes, em teste, falhas e bloqueados). Antes eram textos fixos, que sugeriam ler a saúde do Karaf.
- **TAUT**: o cabeçalho mostra "Cypress não detectado" quando não há versão no projeto (antes exibia "Cypress 15.6.0" fixo). O placeholder do campo Release deixou de sugerir `v1.24.0`.

### Corrigido
- **Matriz de Validação**: cenários-modelo antigos já gravados no navegador (um "Aprovado" e um "Em teste" com testador "QA Team", nunca verificados) voltam a *pendente* ao abrir a tela, e a release `v1.24.0` antiga é limpa. Itens editados pelo usuário são preservados.

## [1.31.1] - 2026-10-05
### Adicionado
- **Prefixo das chaves de cenário Zephyr (TAUT)** em Configurações > Diretórios & IDE (`tautKeyPrefix`): restringe a cobertura e o Intake CSV às chaves de um projeto (ex.: `PROJ-T`). Vazio aceita qualquer chave no formato `ABC-T123`.
- Detecção automática do projeto TAUT por qualquer pasta `taut*` (além de `cypress-tests`, `cypress` e `e2e-tests`) no diretório de projetos.

### Alterado
- **Qualidade — Matriz de Validação**: os 4 cenários-modelo iniciais agora nascem como *pendentes* (antes, um vinha "Aprovado" sem verificação) e a Release padrão ficou vazia (era `v1.24.0`). Dados inválidos no `localStorage` não quebram mais a tela.
- **Qualidade — Roadmap**: status refletem o que já existe (*Disponível*) e o que *ainda não foi implementado*.
- **Qualidade — Prontidão**: com falha, bloqueio ou pendência, o veredito nunca é "Release Pronta".
- **Qualidade — Fontes (Zephyr/Jira/Azure)**: o botão *Testar* agora informa que a validação é só local e que a sincronização ainda não está implementada.
- **TAUT**: sem CSV em `Insumo/` a porcentagem de cobertura não é calculada (`baselineMissing`), em vez de dar 100% trivial. O nome "TAUT-Mississauga" e o prefixo `DDWMISSI-T` deixaram de ser fixos no código, na UI, na Ajuda e nas tools MCP.
- **Validador Regressivo**: suíte só é aprovada se houver asserções e todas puderem ser verificadas; JSON de payload inválido gera erro (antes era ignorado) e a issue de exemplo deixou de ser pré-preenchida.
- **Test Runners**: o comando respeita aspas (ex.: `node -e "..."`) e um diretório de trabalho inexistente falha com mensagem, em vez de rodar na pasta do próprio app.
- **Perfil de deploy de exemplo** vem com as etapas desabilitadas (as coordenadas Maven são fictícias).
- **WSL/INFR e Rotinas**: removidos caminhos pessoais fixos; a detecção usa a pasta do usuário atual e o header de Rotinas mostra "não configurada" quando não há diretório.
- A tool MCP `db_save_backup_config` agora explica que o cron só é reagendado pelo app desktop/servidor.

### Corrigido
- **DB Studio**: Ctrl+Enter executa a query mesmo com a lista de sugestões aberta (antes aceitava a sugestão e substituía o texto digitado).
- `saveSettings` deixou de responder sucesso quando a gravação do `config.json` falha.
- O erro do botão *Simular Tráfego* (APM) deixou de ser engolido.

### Segurança
- A tool MCP `settings_save` devolvia as configurações sem sanitizar (senhas e tokens em texto puro); agora responde com os segredos ofuscados, como `settings_get`.
- O sincronismo de `.env` do TAUT não grava mais credencial padrão da API quando o login do WTA não está configurado.

## [1.31.0] - 2026-10-02
### Adicionado
- **Importação e Seleção de Conexões Oracle via `tnsnames.ora`**:
  - **Configuração de Caminho de Rede em Configurações > Banco de Dados**: Novo campo com botão de seleção de arquivo (`.ora`) no Windows Explorer para definir o caminho do arquivo `tnsnames.ora` (ex.: `C:\oracle\product\11.2.0\dbhome_1\network\admin\tnsnames.ora`);
  - **Configuração Automática de `TNS_ADMIN`**: Ao iniciar conexões ou inicializar o Oracle Thick Client, o Dev Manager detecta automaticamente o diretório do `tnsnames.ora` e ajusta as variáveis de ambiente necessárias e o `configDir` do driver Oracle;
  - **Seletor Visual de Conexões no DB Studio**: No modal de criação/edição de conexões Oracle (`ConnectionModal`), agora há um seletor visual (`OracleTnsSelector`) que lê o arquivo configurado, exibe todos os aliases cadastrados e preenche instantaneamente o nome, host, porta, base de dados (SID ou Service Name) e modo de conexão com 1 clique;
  - **Fallback Manual no Modal**: Caso o caminho não esteja definido nas configurações globais, o usuário pode selecionar um arquivo `.ora` pontual diretamente dentro do próprio modal de conexão;
  - **Parser Puro de TNS**: Novo utilitário (`tnsnamesParser.ts`) com suporte a comentários, múltiplos aliases na mesma definição, `SERVICE_NAME`, `SID` e protocolo `TCP`;
  - **Nova Ferramenta MCP (`db_list_tns_entries`)**: Total do catálogo expandido para **166 ferramentas**, permitindo que assistentes de IA inspecionem aliases e parâmetros de rede de arquivos `tnsnames.ora`;
  - **Sincronização nos Três Transportes**: Handlers IPC `db:parse-tnsnames`, rotas REST `POST /api/db/tnsnames/parse` e `GET /api/db/tnsnames`, e tool MCP correspondente.

## [1.30.0] - 2026-10-02
### Adicionado
- **Suporte Nativo a Apache Karaf no WSL 2 (Linux Virtualizado)**:
  - **Seletor de Ambiente em Configurações > Apache Karaf**: Nova seção dedicada (`KarafWslSection`) permitindo alternar entre o modo padrão *Local (Windows Nativo)* e *WSL 2 (Linux Virtualizado)* sem nenhum impacto ou quebra no ambiente Windows existente;
  - **Detecção Automática de Distribuições WSL**: Listagem automática das distribuições instaladas (Ubuntu, Debian, etc.) com status de execução em tempo real e seleção rápida via dropdown;
  - **Resolução Híbrida de Caminhos Linux e Windows UNC**: O Dev Manager agora aceita tanto caminhos do Linux (ex: `/home/usuario/karaf`) quanto caminhos UNC de rede do Windows (`\\wsl.localhost\Ubuntu\home\usuario\karaf`), mapeando-os de forma bidirecional transparente;
  - **Execução Transparente de Comandos OSGi**: Comandos de deploy (`bundle:list`, `feature:install`, diagnósticos OSGi e verificações JMX) passam a ser executados diretamente via `wsl.exe -d <distro> -- <path>/bin/client` quando configurado em modo WSL;
  - **Inicialização em Debug e Encerramento Limpo**: Inicialização do servidor Karaf em modo Debug (via terminal externo ou console integrado) invocando o container Linux no WSL, com liberação limpa de processos via `pkill -f karaf` no reset de ambiente;
  - **Fallback de Rede Inteligente**: Checagem de disponibilidade do Karaf via porta SSH (`8101`) com teste em `127.0.0.1` e fallback automático para o IP virtual da distro WSL caso o localhost forwarding não esteja ativo;
  - **Documentação e Central de Ajuda**: Novo tópico de FAQ completo adicionado na Central de Ajuda (Alt+9) com orientações passo a passo e dicas de rede espelhada (`networkingMode=mirrored` no `.wslconfig`).

## [1.29.0] - 2026-10-02
### Adicionado
- **Obtenção Flexível de Payloads de Integração no Validador Regressivo (Banco Oracle & API REST Externa)**:
  - **Consulta Direta no Banco Oracle (`PCINTEGRACAOCORE`)**: Novo modal interativo (`QaFetchPayloadModal` / `QaOraclePayloadTab`) com botão *"Obter Payload"* na aba de dados, permitindo localizar instantaneamente os payloads originais de transações recepcionadas pelo PDVSync e WSH gravados na tabela `PCINTEGRACAOCORE` (coluna `DADOSTRANSFORMADOS`);
  - **5 Modos Especializados de Filtro no Banco**:
    - *CPF/CNPJ do Consumidor (`cgcEnt`)*: Localiza transações diretamente pelo documento do cliente gravado no JSON (ex.: `68886626088`);
    - *Cupom e Filial*: Busca combinada por número do cupom fiscal e código de filial da venda;
    - *Chave NFC-e / NF-e*: Filtro por chave SEFAZ de 44 dígitos (`chaveNfce` / `chaveNfe`);
    - *ID Externo ou Interno*: Busca por identificador de integração (ex.: `pdvsync-vendamensagem-...`);
    - *Últimas Transações*: Listagem dos registros mais recentes recebidos na fila de integração;
  - **Busca Direta via API REST Externa (`QaApiPayloadTab`)**: Nova aba permitindo disparar requisições HTTP (`GET` ou `POST`) diretamente para endpoints de serviços de mensageria, gateways ou microsserviços externos. Suporte a cabeçalhos customizados (tokens, Bearer, API Keys), corpo em JSON e extração flexível via JSONPath (ex.: `data.pedido`);
  - **Persistência de Preferências**: Armazenamento automático da última URL de API e headers configurados para agilizar testes subsequentes;
  - **Auto-Mapeamento de Binds em 1 Clique**: Ao carregar o payload para o teste regressivo, o Dev Manager formata o JSON e extrai automaticamente os parâmetros de bind (`:codFilial`, `:numCupom`, `:chaveNfe`, `:vlTotal`, etc.) para execução imediata das asserções;
  - **Novas Ferramentas MCP (`qa_fetch_incoming_payload` e `qa_fetch_api_payload`)**: Total do catálogo expandido para **165 ferramentas**, permitindo que assistentes de IA localizem payloads no banco ou consultem APIs externas diretamente;
  - **Sincronização nos Três Transportes**: Handlers IPC `qa:search-core-payloads` e `qa:fetch-api-payload`, rotas REST `POST /api/qa/payloads/search` e `POST /api/qa/payloads/fetch-api`, e tools MCP correspondentes.

## [1.28.2] - 2026-10-02
### Adicionado
- **Novos Templates Oficiais de Homologação no Validador Regressivo Oracle (`QaRegressionRunner`)**:
  - **Pré-Venda Balcão Omni (TV7 e TV8 — Entrega / Encomenda / Retira)**: Bateria automatizada cobrindo validação de cabeçalho (`PCPEDC` com `NUMPEDHUBE` e `NUMPEDENTFUT`), itens do TV7 (`PCPEDI` com validação de `TIPOENTREGA` 'RI'/'RP'/'EN'/'EF', status `NUMCAR Gravado` e status de desconto `PERCOM`), itens futuros do TV8, validação cadastral e de cidade do cliente (`PCCLIENT`/`PCCIDADE`) e validação da mensageria no PDVSync (`PCINTEGRACAOCORE` garantindo status de sucesso `RECEBIDO`/`RESGATADA` e alertando falhas em `DISPONIVEL`);
  - **Movimentação de Caixa — Sangria e Suprimento (PDV / ECF)**: Validação das operações financeiras de frente de caixa com verificação da fila de mensageria (`PCFILAMENSAGEMHISTORICO` com tipo `SANG`/`SUPR`), vales de caixa de ECF (`PCVALECXECF` com tipo 'A' para sangria e 'U' para suprimento) e réplica para a tesouraria/retaguarda (`PCVALECX`);
  - **Inutilização de Numeração NFC-e (SEFAZ)**: Validação do registro de inutilização fiscal na `PCINUTILIZACAONFCE` com verificação de protocolo SEFAZ autorizado (`PREENCHIDO_INUTILIZACAO = 'S'`), faixas inicial e final e justificativa;
  - **Enriquecimento da Venda PDV Fim-a-Fim**: Inclusão de novos passos no template de Venda (`wsh-venda-pdv-completa`) para conferência de baixa real no estoque (`PCLOGESTOQUE`), custos do produto (`PCMOV` com custos financeiro, contábil, reposição e real), itens ajustados por embalagem (`PCPEDI` com `QTUNIT`) e cálculo de troco / pagamentos digitais e TEF (`PCPRESTECF` com `CODBANDEIRA_AJUSTADO` e `NSU_AJUSTADO`);
  - **Inicialização Automática de Novos Templates Padrão**: Ajustado o `QaRegressionService.ensureDefaultTemplates` para inicializar automaticamente quaisquer novos templates padrão sem sobrescrever templates customizados ou duplicar arquivos já existentes.

### Alterado
- **Modularização de Templates (Regra de 300 Linhas)**: Subdivisão do catálogo de templates padrão em submódulos dedicados em `src/main/utils/qaTemplates/` (`templateVendaPdv.ts`, `templateCancelamento.ts`, `templateKitCesta.ts`, `templatePreVendaTv7Tv8.ts`, `templateMovimentacaoCaixa.ts`, `templateInutilizacaoNfce.ts`), mantendo todos os arquivos com menos de 250 linhas.

## [1.28.1] - 2026-10-02
### Adicionado
- **Exportação & Guia Prático de Templates no Validador Regressivo (`QualityPage` / `QaRegressionRunner`)**:
  - **Exportação Direta do Template Selecionado**: Botão *"Exportar Template"* adicionado na barra superior do Validador Regressivo, permitindo baixar o cenário ativo em arquivo `.json` identado (`{template-id}.json`) com 1 clique;
  - **Exportação no Editor de Templates**: Opção *"Exportar JSON"* adicionada na barra de ações de edição de templates (`QaRegressionTemplatesManager`), permitindo salvar o template em disco local antes ou depois de persistir no banco;
  - **Exportação em Lote (Backup Completo)**: Novo botão *"Exportar Todos"* na listagem geral do Gerenciador de Templates, gerando um bundle JSON com todos os cenários cadastrados para compartilhamento entre o time de QA e versionamento;
  - **Guia Didático Interativo ("Como Usar")**: Novo modal (`QaRegressionTemplatesHelpModal`) acessível tanto no Validador Regressivo quanto no Gerenciador de Templates, com 4 abas didáticas:
    - *Fluxo Passo a Passo*: Conceito dos templates e ciclo de 6 etapas desde a escolha do banco até a evidência no Jira;
    - *Tipos de Asserção*: Tabela explicativa detalhada de `JSONPath`, `Literal`, `<S>` (preenchido), `<N>` (nulo), `<0>` (zero) e `Regex` com sintaxes e exemplos de uso;
    - *Exportação & Compartilhamento*: Instruções de exportação individual, em lote e importação JSON;
    - *Exemplo de JSON*: Código canônico de template com botão de 1 clique para copiar (`Copiar JSON`);
  - **FAQ Detalhado na Central de Ajuda**: Novo tópico na Central de Ajuda (Alt+9) cobrindo criação, configuração de binds nomeados e exportação de templates;
  - **Utilitário Dedicado (`qaTemplateExportUtils`)**: Módulo puro de serialização, sanitização e download de templates com cobertura de testes unitários automatizados (`qaTemplateExportUtils.test.ts`).

## [1.28.0] - 2026-10-01
### Adicionado
- **Integração & Cockpit de Automação TAUT (Cypress E2E + Oracle + Zephyr Scale)**:
  - **Novo Painel "Automação TAUT" na Central de Qualidade (`QualityPage`)**: Cockpit visual dedicado para conectar o projeto de testes automatizados da equipe de qualidade (`TAUT-Mississauga`) com resolução automática de caminho e monitoramento do ambiente.
  - **Sincronização de Ambiente em 1 Clique (`syncEnvFromDevManager`)**:
    - Sincronização automática das credenciais da conexão Oracle ativa no Dev Manager (`USER_BD`, `PASS_BD`, `TNS_NAME`, `INSTANT_CLIENT`) diretamente para o arquivo `.env` do TAUT;
    - Parametrização dinâmica das URLs da API do WinThor Anywhere (`URL_API_WINTHOR`, `URL_API_AUTH`, `URL_API_PARAMETRO`), permitindo alternância instantânea entre as versões `v39` e legado.
  - **Disparador Inteligente por Tags Cypress (`@cypress/grep`)**:
    - Execução headless com filtragem por tags com seleção rápida de chips: Meta-tags (`@esteira`, `@critico`, `@regressao`, `@contrato`, `-@develop`) e Módulos de Negócio (`@winthor-pedido-venda`, `@winthor-tributacao`, `@winthor-financeiro`, `@winthor-fiscal`, `@winthor-logistica`, `@winthor-wms`);
    - Suporte a abertura interativa da interface gráfica do Cypress com 1 clique (`cy:open`);
    - Terminal streaming integrado com saída em tempo real e botão de abortar/cancelar seguro com encerramento de árvore de processos (`killProcessTree`).
  - **Relatório e Rastreabilidade Zephyr Scale (`COVERAGE.md`)**:
    - Mapeamento e vinculação de cenários de teste documentados em planilhas CSV (`Insumo/*.csv`) com specs Cypress (`cypress/e2e/**/*.cy.ts`) através dos identificadores de teste Zephyr (`DDWMISSI-T\d+`);
    - Painel visual com cards de métricas (Total de Cenários, Automatizados, Pendentes e Taxa de Automação), busca textual por ID, descrição ou arquivo, e filtros rápidos por status.
  - **Catálogo de Specs & Suítes Cypress**:
    - Listagem e agrupamento automático de arquivos `.cy.ts` por submódulo, contadores de testes e lista de tags declaradas nos blocos `it`/`describe`.
  - **Orquestrador de Intake CSV com IA (Subagente 0)**:
    - Leitor automático de arquivos CSV de insumo na pasta `Insumo/`;
    - Extrator inteligente de cenários e gerador de prompt estruturado e plano de implementação para acelerar a criação de novas specs Cypress com assistentes de IA seguindo o padrão do TAUT Mississauga.
  - **Novas Ferramentas no Servidor MCP (Total: 161 Ferramentas)**:
    - `taut_get_status`: Inspeciona o diretório do projeto TAUT, versão do Cypress, variáveis do `.env` e status do banco Oracle;
    - `taut_run_tests`: Dispara execução de testes Cypress (headless ou interativo) com suporte a tags do `@cypress/grep` e specs específicos;
    - `taut_get_coverage`: Analisa a cobertura de testes do Zephyr Scale cruzando arquivos de insumo CSV com specs implementadas;
    - `taut_list_specs`: Cataloga todos os arquivos de especificação `.cy.ts` com tags e contadores de testes;
    - `taut_sync_env`: Sincroniza credenciais do Oracle ativo e URLs de API do Dev Manager para o `.env` do TAUT;
    - `taut_process_csv_intake`: Lê planilhas de insumo CSV e monta prompt/plano de implementação formatado para assistentes de IA.
  - **Sincronização nos Três Transportes**:
    - **Electron IPC**: Handlers `taut:get-status`, `taut:save-path`, `taut:get-coverage`, `taut:list-specs`, `taut:sync-env`, `taut:process-intake`, `taut:run-tests`, `taut:abort-tests`;
    - **Servidor Express / REST & WebSocket**: Endpoints `/api/taut/*` e canal de streaming em tempo real `taut:chunk`;
    - **Documentação e Central de Ajuda**: Atualizada a contagem total para 161 tools MCP em `docs/MCP_TOOLS.md` e na Central de Ajuda (`HelpModulesTab`, `helpData`).

## [1.27.0] - 2026-10-01
### Adicionado
- **Runner de Testes Automatizados & Cockpit de Automação (Central de Qualidade)**:
  - **Aba "Test Runners" na Central de Qualidade (`QualityPage`)**: Nova visão com gerenciamento visual e execução de suítes de testes automatizados com terminal interativo e streaming de stdout/stderr via WebSocket/IPC.
  - **Suporte Multi-Framework / Multi-Linguagem**:
    - **Backend Java / Apache Karaf**: Execução de `mvn test` e `mvn verify` (JUnit / Mockito), com resolução de executáveis Maven (`mvnw.cmd` e `mvn`), detecção de `JAVA_HOME` e parsing nativo de relatórios Surefire/Failsafe;
    - **Testes Web End-to-End**: Integração com **Playwright** (`npx playwright test`) e **Cypress** (`npx cypress run`), com extração automática de contadores de specs e testes passados, com falha ou ignorados;
    - **Contratos e Testes de API REST**: Integração com **Newman / Postman CLI** (`npx newman run`), com parsing da tabela de asserções do Postman;
    - **Scripts Customizados**: Suporte a qualquer comando/script arbitrário definido pelo desenvolvedor ou QA.
  - **Presets Prontos de Início Rápido**:
    - Botões para adicionar com 1 clique runners pré-configurados para Maven Unit/Integration, Maven Verify com Fail-Safe, Playwright E2E, Cypress E2E e Newman API Collections.
  - **Sincronização com a Matriz de Validação**:
    - Vínculo direto de suítes de teste a um ou múltiplos cenários da Matriz de Validação;
    - Botão *Sincronizar com Matriz* que atualiza instantaneamente o status dos cenários vinculados (para *Aprovado* ou *Falhas/Bugs*) e carimba a evidência com a data, hora e contadores da execução, refletindo automaticamente no Score de Prontidão da release do PO.
  - **Histórico Persistido & Controle de Processos**:
    - Armazenamento em disco das últimas 100 execuções analíticas com filtros e visualização de saída;
    - Cancelamento seguro e imediato via botão *Abortar*, com encerramento em árvore de processos (`killProcessTree` / `taskkill /F /T`).
  - **Sincronização Completa nos Três Transportes**:
    - **Electron IPC**: Handlers `test-runner:list`, `test-runner:save`, `test-runner:delete`, `test-runner:execute`, `test-runner:abort`, `test-runner:get-history` e `test-runner:clear-history`;
    - **Servidor Express / REST**: Endpoints `/api/test-runner/list`, `/api/test-runner/save`, `/api/test-runner/execute`, `/api/test-runner/abort`, `/api/test-runner/history` e transmissão de chunks em tempo real via canal WS `test-runner:chunk`;
    - **Servidor MCP**: Novas ferramentas para assistentes de IA (`test_runner_list`, `test_runner_execute`, `test_runner_history`), totalizando **155 ferramentas**.

## [1.26.0] - 2026-10-01
### Adicionado
- **Validador Regressivo & Asserções de Banco (QA Studio / Oracle QA)**:
  - **Módulo Dedicado na Central de Qualidade (`QualityPage`)**: Nova aba *Validador Regressivo* com cockpit integrado para equipes de QA e desenvolvedores executarem baterias automatizadas de consultas SQL e validações de integridade no banco Oracle em 1 clique.
  - **Esteira de Asserções Fim-a-Fim do WinThor**:
    - Validação encadeada de todo o ciclo de vida de dados: Mensageria (`PCFILAMENSAGEMHISTORICO`), Documentos Eletrônicos (`PCDOCELETRONICO`), Cabeçalhos Fiscais e Venda (`PCNFSAID`, `PCPEDCECF`, `PCPEDC`), Dados do Consumidor (`PCVENDACONSUM`), Movimentação e Estoque (`PCMOV`, `PCPEDIECF`, `PCPEDI`), Contas a Receber / TEF (`PCPREST`, `PCPRESTECF`), Consistência de RCA / Operador x Matrícula (`PCEMPR`), Decomposição de Kits / Cestas (`PCPEDICESTA` + `PCEMBALAGEM`) e Fluxos de Cancelamento/Estorno (`PCNFCAN`, `PCNFCANITEM`).
  - **Mapeamento Inteligente por JSONPath & Regras Estritas**:
    - Suporte a extração de dados diretamente do payload JSON da API ou PDV colado na tela (`$.vlTotal`, `$.produtos[*].qt`, `$.consumidorFinal.cgcEnt`);
    - Botão *Mapear Binds* (varinha mágica) que varre o JSON e auto-preenche variáveis `:codFilial`, `:numCupom`, `:chaveNfe`, `:numPed`, etc.;
    - Avaliação de regras estritas: `<S>` (espera preenchido/not null), `<N>` (espera vazio/nulo), `<0>` (espera zero), valores literais e expressões regulares;
    - Encadeamento dinâmico de variáveis: passos anteriores podem extrair dados (ex.: `NUMTRANSVENDA`, `NUMPED`) e alimentar automaticamente os passos seguintes.
  - **Gerenciador de Cenários & Pasta Dedicada de Templates**:
    - Templates salvos em pasta dedicada (`qa-templates/`) no diretório de dados do app (ou customizável em configurações);
    - Templates padrão canônicos pré-carregados: *Venda PDV — Integração WSH Mississauga (Fim-a-Fim)*, *Cancelamento de Venda PDV* e *Venda com Kit / Cesta*;
    - Criação, edição, duplicação e exclusão visual de cenários, com editor de query SQL e regras de asserção por coluna;
    - Importação e exportação de templates em arquivos `.json` para fácil compartilhamento entre o time de QA.
  - **Exportação de Evidências em 1 Clique para Jira & Confluence**:
    - Botão *Copiar Markdown (Jira)*: Gera relatório completo com métricas de asserção, tabelas comparativas (Esperado vs Retornado no Banco), status visual (Aprovado / Divergência) e queries SQL executadas, já com o código da issue do Jira informado (ex.: `DDWMISSI-T966`);
    - Botão *Jira Table*: Gera tabela em formatação Confluence/Jira markup clássico com cores semânticas.
  - **Sincronização nos Três Transportes**:
    - **Electron IPC**: Handlers `qa:list-templates`, `qa:get-template`, `qa:save-template`, `qa:delete-template`, `qa:execute-suite` e `qa:get-templates-dir`;
    - **Servidor Express / REST (Headless & Docker)**: Endpoints `/api/qa/templates`, `/api/qa/templates/:id`, `/api/qa/execute` e `/api/qa/templates-dir`;
    - **Servidor MCP**: 3 novas ferramentas para assistentes de IA (`qa_list_templates`, `qa_get_template` e `qa_run_regression_suite`), elevando o catálogo total do cockpit para **152 ferramentas**.
### Alterado
- **Reorganização dos Menus do Header & Central de Ajuda**:
  - **Botão Dedicado da Central de Ajuda na Barra de Ações**: A Central de Ajuda (`HelpCircle`, `Alt+9`) foi movida de dentro do dropdown de desenvolvimento para um botão de acesso rápido na barra superior direita (ao lado de Configurações, Status, Tema e Atualizar), com destaque visual ativo e integração ao tour de boas-vindas (`data-tour="help"`).
  - **Estruturação dos 4 Pilares Temáticos de Navegação**:
    - **Infraestrutura**: *Ambiente Dev*, *Containers*, *Deploy*, *Logs em Tempo Real* e *APM & Traces*;
    - **Dados & Rotinas**: *Banco de Dados* e *Catálogo de Rotinas*;
    - **Desenvolvimento & DevOps**: *Git & DevOps* (`Alt+5`) e *Documentação Semântica (RAG)* (`Alt+7`);
    - **Qualidade & Homologação**: Mantido como pilar estratégico independente (`nav-qa`), abrigando a *Central de Qualidade (QA Studio)* (`Alt+Q`) e preparado para a expansão das próximas telas e suítes de teste;
    - No seletor compacto para telas menores (< md), adicionada a seção *Sistema & Suporte* com navegação direta para a Central de Ajuda e Configurações.

## [1.25.0] - 2026-10-01
### Adicionado
- **Grupos de Containers Personalizados & Inicialização em 1 Clique (Containers & Docker)**:
  - **Painel Superior de Grupos (`ContainerGroupsBar`)**: Nova barra fixa no topo da tela de Containers exibindo cartões para cada grupo salvo (ex.: *Stack Backend*, *Bancos de Dados*, *Mensageria*), com contadores de status em tempo real (ex.: <code className="font-mono text-emerald-500 font-bold">X/Y rodando</code>), semáforo visual de execução (*Rodando*, *Parcial*, *Parado*), botões de ação rápida (*Subir Grupo* com streaming de progresso e *Parar* conjunto), edição e exclusão.
  - **Modal Inteligente de Grupos (`SaveEnvironmentModal`)**: Assistente remodelado para criação e edição de grupos, permitindo buscar e selecionar livremente qualquer container detectado no Docker local ou distribuições WSL via checkboxes, reordenar a sequência de subida e definir um tempo de espera opcional (*Delay/Warm-up* em segundos) entre a subida de cada container (ideal para bancos de dados ou message brokers que exigem estabilização antes dos serviços dependentes).
- **Seleção Múltipla & Barra Flutuante de Ações em Lote**:
  - **Seleção por Checkbox nos Cards**: Cada cartão de container (`ContainerCard`) agora conta com caixa de seleção dedicada e destaque visual ao ser selecionado, além de atalho no cabeçalho para *Selecionar Todos* ou *Limpar Seleção*.
  - **Barra de Ações em Lote (`ContainerBatchBar`)**: Barra flutuante contextual no rodapé da página exibindo a quantidade de containers marcados e botões de comando em lote em 1 clique:
    - **Subir Selecionados**: Inicia todos os containers selecionados de uma vez;
    - **Parar Selecionados**: Interrompe com segurança todos os containers marcados;
    - **Reiniciar Selecionados**: Executa reinicialização sequencial rápida do lote;
    - **Criar Grupo (N)**: Transforma a seleção atual instantaneamente em um novo grupo persistido, já abrindo o modal com os slots preenchidos.
- **Parada Coordenada & Sincronização nos Três Transportes (Electron, Express e MCP)**:
  - **`DockerService.stopContainerSequence`**: Novo método central de negócio no serviço de Docker com notificações de progresso em tempo real (`onProgress`) e tratamento de erros;
  - **Transporte IPC (Desktop)**: Handlers registrados `docker:stop-sequence` e aliases `container:start-sequence` e `container:stop-sequence`, com interfaces tipadas no `preload` e no `apiBridge`;
  - **Transporte REST / Express (Headless)**: Novos endpoints `POST /api/docker/stop-sequence` e `POST /api/containers/stop-sequence`;
  - **Servidor MCP**: Novas ferramentas disponibilizadas para agentes e LLMs: `docker_stop_sequence`, `container_stop_sequence`, `docker_start_sequence` e `container_start_sequence`.
- **Documentação e Central de Ajuda**:
  - Card de Containers no Guia dos Módulos (`HelpModulesTab.tsx`) atualizado com Grupos de Containers e Ações em Lote;
  - Nova pergunta no FAQ da Central de Ajuda (`HelpPage.tsx`) com passo a passo sobre a criação de grupos, warm-up e controle em lote;
  - Catálogo de Ferramentas MCP (`docs/MCP_TOOLS.md`) atualizado para o total de 149 ferramentas.

## [1.24.0] - 2026-10-01
### Adicionado
- **Expansão do Dev Manager para QA & Donos de Produto (1ª Etapa - Módulo de Qualidade)**:
  - **4º Grupo Temático no Header ("Qualidade & Homologação")**: Novo menu superior ao lado de Infraestrutura, Dados e Desenvolvimento, com acesso rápido às ferramentas de qualidade e atalho global dedicado <kbd className="font-mono text-primary font-bold">Alt+Q</kbd>.
  - **Central de Qualidade (QA Hub)**: Nova página dedicada (`QualityPage`) concebida especificamente para apoiar analistas de qualidade (QA) e Product Owners (PO) no ciclo de homologação:
    - **Matriz de Validação & Homologação**: Tabela interativa para acompanhamento ágil de cenários de teste vinculados a rotinas Delphi, serviços Karaf, APIs e fluxos E2E, com alteração rápida de status (*Pendente*, *Em Teste*, *Aprovado*, *Falha/Bug*, *Bloqueado*), inclusão de novos cenários e persistência em `localStorage`.
    - **Painel de Prontidão da Release (PO)**: Semáforo executivo com cálculo automático de prontidão (*Readiness Score* de 0 a 100%) e taxa de sucesso dos testes para orientar a decisão de subida para produção.
    - **Exportação de Relatórios de Homologação em Markdown**: Botão *Exportar Relatório* que gera um resumo executivo com métricas e tabela de validação pronto para colar no Teams, Slack, Azure DevOps ou Jira.
    - **Apoio Direto ao Teste**: Atalhos em 1 clique para inspecionar logs em tempo real na tela de Logs, consultar massa de dados no Database Studio e disparar rotinas locais para teste.
    - **Roadmap & Futuras Demandas**: Painel documentando a evolução contínua planejada para QA e POs (automação de testes E2E com runners, central de evidências assistida e geração de massa de dados com IA).
  - **Configurações de Origens de Dados de Qualidade (Zephyr, Jira, Azure DevOps)**:
    - **Nova Aba "Qualidade & QA" em Configurações**: Gerenciamento centralizado de provedores de testes com templates pré-configurados para *Zephyr Scale (Cloud v2)*, *Zephyr Squad / Jira Server*, *Jira Software (Bugs & Histórias)* e *Azure DevOps Test Plans*;
    - **Criptografia em Repouso de Segredos**: Todos os tokens de API, Zephyr Tokens e PATs são persistidos no `config.json` criptografados com **AES-256-GCM** via `ConfigService` e `secretsCrypto`, protegendo credenciais em repouso e impedindo vazamentos em texto plano;
    - **Validação & Teste de Conectividade**: Botão de teste direto no card da fonte para verificar parâmetros e status operacional antes de salvar;
    - **Vinculação com o QA Hub**: O cabeçalho da Central de Qualidade identifica a fonte de teste ativa em tempo real com indicador visual pulsante e atalho direto para alternar ou cadastrar novas integrações.
  - **Integração Global ao Cockpit**:
    - **Busca Rápida (Ctrl+K)**: Novo comando *Central de Qualidade (QA Hub)* cadastrado no Quick Launcher;
    - **Busca nas Configurações**: Novos termos indexados (*zephyr, scale, squad, jira, test plans, homologacao, token*);
    - **Tour Guiado de Boas-Vindas**: Novo passo `nav-qa` no tour de navegação;
    - **Central de Ajuda**: Módulo 11 documentado no Guia dos Módulos, card na Visão Geral, atalho `Alt + Q` na tabela de atalhos e perguntas dedicadas no FAQ sobre o QA Hub e configuração de integrações.
- **Filtro por Famílias de Versão & Seleção em Lote no Catálogo da Rotina 801**:
  - **Agrupamento Automático por Release Line**: Dropdown dinâmico no cabeçalho do catálogo que extrai e agrupa automaticamente todas as funcionalidades pelas suas famílias de versão (ex: `Versão 1.39.x`, `Versão 1.38.x`, `Versão 0.39.x`).
  - **Seleção Rápida em 1 Clique**: Botão de conveniência `+ Selecionar N da vX.X.x` exibido junto ao filtro para marcar instantaneamente todos os serviços ou rotinas da release desejada para instalação combinada.
- **Assistente de Instalação Direta & Montagem de Ambientes**:
  - **Modal "+ Instalação Direta"**: Permite aos desenvolvedores especificar manualmente qualquer nome de feature (ex.: `winthor-atualizacao-dados`, `winthor-ferramenta-servidor`), o tipo do projeto (`SERVICO` ou `ROTINA`) e a versão desejada, mesmo que não conste na lista ativa retornada pela API do catálogo.
  - **Campo de Versão Alvo (Override) em Lote**: Permite definir uma versão global na barra de ações em lote para aplicar a todos os itens selecionados de uma só vez.
  - **Override Dinâmico no Drawer de Detalhes**: Ao inspecionar uma feature individual, o desenvolvedor pode alterar a versão e acompanhar em tempo real o recálculo das coordenadas Maven e dos comandos Karaf (`feature:repo-add` e `feature:install`).
- **Pré-registro Isolado de Repositórios (`repo_add_only`) no Karaf e MCP**:
  - Nova ação no instalador do Karaf, na interface visual (botão *Registrar Repositórios* na barra de lote e *Apenas Repositório* no drawer) e na tool MCP (`routine801_install_features` com `action: 'repo_add_only'`), permitindo cadastrar os repositórios Maven no Karaf previamente sem forçar a instalação imediata das features.
- **Expansão de Ferramentas MCP & Testes da Rotina 801**:
  - Parâmetros `action` (`install` | `repo_add_only`) e `targetVersionOverride` adicionados à ferramenta `routine801_install_features`.
  - Cobertura de testes unitários em `routine801Utils.test.ts` e `Routine801Service.test.ts` para inferência Maven, famílias de versão, override de versão e execução isolada de repositório.
- **Visualização Otimizada para Queries Grandes no DB Studio**:
  - **Divisor Vertical Redimensionável (Splitter)**: O editor SQL agora pode ter sua altura ajustada livremente clicando e arrastando o divisor com o mouse (de 140px até 800px), com o tamanho preferido persistido automaticamente no navegador.
  - **Modo Maximizar / Foco (Tela Cheia do Editor)**: Botão *Maximizar / Restaurar* na barra superior do editor que expande o editor para ocupar 100% da altura da tela, permitindo navegar e editar queries SQL complexas de centenas de linhas sem espremer o conteúdo. Duplo clique no divisor também alterna o modo maximizado.
  - **Gutter com Números de Linha Sincronizado**: Coluna de números de linha à esquerda da área de código com alinhamento preciso, rolagem perfeitamente sincronizada com o texto e destaque visual da linha atual onde o cursor está posicionado.
  - **Barra de Métricas e Status do Editor**: Indicador em tempo real exibindo a posição do cursor (`Ln X, Col Y`), total de linhas e contagem de caracteres da consulta.
  - **Formatação Inteligente de SQL (Beautify / Indent)**: Botão *Formatar SQL* na barra de status que adiciona quebras de linha e indentação organizada em cláusulas principais (`SELECT`, `FROM`, `WHERE`, `AND`, `OR`, `JOIN`, `GROUP BY`, `ORDER BY`), preservando rigorosamente strings literais e comentários.
  - **Quebra Automática de Linha (Word Wrap)**: Botão comutador *Wrap: ON / OFF* para alternar entre quebra automática de linha ou rolagem horizontal contínua.
  - **Ajuste de Tamanho da Fonte (Zoom)**: Botões *A-* e *A+* para ajustar o tamanho da fonte do editor (de 10px a 18px), salvo nas preferências locais.
  - **Recolhimento da Barra Lateral de Conexões e Tabelas**: Botão de toggle no topo da sidebar que permite recolher o painel lateral para uma barra compacta de 48px, liberando mais de 240px de largura horizontal para inspecionar queries largas com múltiplos joins e colunas.
- **Suporte Abrangente a Parâmetros e Variáveis de Consulta**:
  - **Múltiplos Formatos de Variáveis**: O sistema agora detecta, gerencia e interpola:
    - Bind Variables nativas (<code className="font-mono">:VAR</code>);
    - Variáveis de substituição do Oracle / SQL*Plus / WinThor (<code className="font-mono">&amp;VAR</code> e <code className="font-mono">&amp;&amp;VAR</code>);
    - Variáveis de script e sessão (<code className="font-mono">@VAR</code>);
    - Placeholders de templates dinâmicos (<code className="font-mono">${'{VAR}'}</code> e <code className="font-mono">#{'{VAR}'}</code>).
  - **Eliminação de Erros de Sintaxe no Oracle (`ORA-00911: invalid character`)**: Consultas contendo variáveis de substituição (`&VAR`, `@VAR`, `${VAR}`) agora são interpoladas com segurança e convertidas em literais formatados antes do envio ao driver do Oracle, dispensando intervenções manuais.
  - **Painel e Modal Enriquecido de Parâmetros**:
    - Botão *Parâmetros* sempre acessível no cabeçalho do editor com badge dinâmico indicando o número de variáveis identificadas;
    - Badges visuais identificando a origem do prefixo da variável (`: Bind`, `& SQL*Plus`, `@ Script`, `${} Template`);
    - Suporte ao tipo **Lista IN** (`list`) para cláusulas como `WHERE CODCLI IN (:CLIENTES)`, formatando itens múltiplos separados por vírgula sem quebrar aspas;
    - Opção para adicionar novas variáveis manualmente pelo modal (+ Adicionar Variável Manual);
    - Opção de limpar valores em 1 clique e botão *Substituir no SQL (Inline)* para visualizar a query resolvida no editor antes de executar.
- **Suíte de Testes para Formatação e Variáveis Expandida**:
  - Criação de `sqlFormatUtils.test.ts` cobrindo formatação de SQL, preservação de literais/comentários e cálculo de métricas.
  - Expansão de `sqlBinds.test.ts` e `DatabaseService.test.ts` cobrindo extração e interpolação de `:VAR`, `&VAR`, `&&VAR`, `@VAR`, `${VAR}` e listas `IN`.

### Corrigido
- **Resolução da Falha "No matching features" na Instalação via Karaf CLI**:
  - O Dev Manager agora infere automaticamente a URL canônica padrão do WinThor no repositório Maven (`mvn:br.com.pcsist.winthor.<servico|rotina>/<nome>-features/<versao>/xml/features`) caso a API da Rotina 801 não retorne um repositório explícito.
  - O comando `feature:repo-add` passa a ser executado preventivamente antes do `feature:install`, garantindo que o catálogo de features seja indexado na JVM do Apache Karaf e impedindo o erro `Error executing command: No matching features`.
  - Detecção aprimorada de falhas no stdout do `client.bat`, alertando o desenvolvedor caso o Karaf rejeite o comando mesmo quando o script bat finalizar com código 0.

## [1.23.0] - 2026-09-30
### Alterado
- **Componentização & Decomposição Modular do Frontend**:
  - **Refatoração dos 4 Maiores Módulos Monolíticos**: Redução de mais de 82% do volume de código acumulado nos arquivos raiz das páginas e modais centrais (de 15.764 para 2.813 linhas totais), particionando e extraindo 44 novos componentes atômicos, focados e reutilizáveis:
    - **Configurações (`SettingsPage.tsx`)**: De 3.428 para 1.183 linhas (-65%), desacoplando as 9 abas de configuração (`DirsTab`, `KarafTab`, `AzureTab`, `ServicesTab`, `PortsTab`, `AutomationTab`, `LogsTab`, `BackupTab`, `AiTab`), a barra de pesquisa rápida (`SettingsSearchBar`) e o checklist de setup inicial (`SetupChecklistCard`).
    - **Contêineres Docker (`ContainersPage.tsx`)**: De 5.020 para 770 linhas (-85%), particionando 16 submódulos dedicados em `src/renderer/src/components/containers/` (cabeçalho, barra de topologia de rede, painel Docker Compose, cards de contêiner e 12 modais operacionais carregados sob demanda).
    - **Gerenciador de Bundles OSGi (`KarafBundleManagerModal.tsx`)**: De 3.984 para 598 linhas (-85%), particionando a tabela, barra de escopos, cabeçalho e modais de histórico, snapshots, diagnóstico e features em `src/renderer/src/components/karaf/`.
    - **Central de Ajuda (`HelpPage.tsx`)**: De 3.332 para 262 linhas (-92%), particionando o catálogo de dados estáticos (`helpData.tsx`), catálogo de perguntas frequentes, lista de atalhos globais, visão geral e aba sobre o sistema em `src/renderer/src/components/help/`.
  - **Performance de Renderização & Hot Reload**: O carregamento de páginas e a renderização do React tornaram-se consideravelmente mais ágeis e eficientes através do isolamento de estado local por componente e renderização condicional de modais pesados apenas quando acionados.

### Adicionado
- **Suíte de Testes Automatizados para a Central de Ajuda (`helpData.test.ts`)**:
  - Testes unitários puros co-localizados cobrindo a integridade dos dados, categorias, FAQs pesquisáveis, atalhos de teclado e URLs de download oficiais.
- **Governança Arquitetural & Memória no `AGENTS.md`**:
  - Formalização de regras estritas de tipagem do TypeScript/React 18 (`RefObject<T>` nativo), resolução de profundidade relativa de imports (`../../../../../shared/types`) e preenchimento de literais de contratos de dados em novos componentes.

### Corrigido
- **Resolução de Tipos e Contratos no TypeScript**:
  - Corrigidos caminhos relativos de importação em componentes de 3º nível em `containers/` e `settings/tabs/`.
  - Alinhada a tipagem de referências `useRef` para elementos HTML (`<pre>` e `<input>`) no React 18, eliminando incompatibilidades na prop nativa `ref`.
  - Ajustados objetos literais em `validateSinglePath` para satisfazer o contrato completo exigido por `PathStatusInfo`.
- **Preservação e Resolução de Senhas do Banco de Dados e Apache Karaf**:
  - **Injeção de ConfigService no `DatabaseService` e `BackupService`**: Os serviços de banco de dados e backup agora resolvem automaticamente as senhas criptografadas salvas em `config.json` a partir do ID da conexão ou da tupla `(host, port, user, database)` quando a senha trafega sanitizada da UI (`password: ''`), solucionando o erro `ORA-01017: invalid username/password` e falhas de autenticação ao testar conexões, listar tabelas, executar queries, rodar Explain Plan e executar backups lógicos.
  - **Indicadores de Senha Salva (`hasKarafPass` e `hasPassword`)**: Introduzidas flags booleanas retornadas na sanitização de segredos para indicar à interface se a credencial já está configurada e criptografada no sistema.
  - **Checklist de Configuração Inicial**: Corrigido o cálculo de `karaf-creds` em `computeSetupChecklistStatus` para reconhecer `hasKarafPass`, marcando a etapa como concluída quando a senha do Karaf estiver salva.
  - **Experiência Visual nos Modais (`ConnectionModal` e `KarafTab`)**: Exibição de badge informativo (`Senha salva e protegida. Deixe em branco para mantê-la ou digite para alterá-la`), placeholder especial e botão de alternância (Exibir/Ocultar com ícones Eye/EyeOff) para inspecionar a digitação de senhas.

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
