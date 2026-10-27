# 0003 — Rastreio de Integração ponta a ponta (WinThor → WSH → CH → PDV)

- **Data:** 2026-10-25
- **Status:** Proposta. Plano de implementação neste documento; os dados das APIs externas ainda
  serão coletados (seção [Pendências de coleta](#pendências-de-coleta)).
- **Decisores:** mantenedor

## Contexto

Na empresa, o maior gargalo de desenvolvimento e manutenção é confirmar que uma integração foi
executada da retaguarda até o PDV. A cadeia tem quatro camadas, cada uma com seu runtime e seu
banco:

| Camada | O que é | Depende de |
|--------|---------|------------|
| **WinThor** | Retaguarda. APIs em bundles OSGi no Karaf. | Oracle |
| **WSH** (Winthor Smart Hub) | Integrador. Executa "fluxos": lê a API do WinThor, transforma com JOLT e envia ao CH. | WinThor e CH no ar |
| **CH** (Commerce Hub) | Recebe os dados em **lotes** e os desce para o PDV. Expõe API para abrir, consultar, monitorar e fechar lote. | Serviços do CH na máquina |
| **PDV** | Ponto de venda. | Postgres |

Um fluxo do WSH (ex.: venda) executa oito passos encadeados:

1. Abre um lote no CH informando o tipo; o CH devolve o **número do lote**.
2. Autentica no WinThor e obtém o token.
3. Chama a API configurada no fluxo com esse token.
4. Transforma o retorno com o JOLT configurado.
5. Autentica no CH e obtém o token.
6. Envia o JSON transformado à API do CH com o número do lote.
7. O CH desce os dados para o PDV.
8. Fecha o lote.

Qualquer passo pode quebrar e hoje não há um lugar que mostre **onde** quebrou. Para testar de
ponta a ponta na máquina local a pessoa precisa de Oracle, Karaf com os serviços WinThor, WSH,
serviços do CH, Postgres e PDV todos de pé, e confere cada camada à mão (logs, banco, Postman).

## Decisão

Criar no Hub Manager o módulo **Rastreio de Integração**, com três entregas:

1. **Pré-voo:** confirma cada camada antes de testar (conexão, serviço, porta, login).
2. **Linha do tempo do lote:** dispara um fluxo (ou aponta um lote já executado) e mostra os oito
   passos com status, latência, contagem de itens e a evidência do primeiro que falhou.
3. **Evidência e automação:** relatório em Markdown para o Jira e tools MCP para o assistente
   rodar o teste de ponta a ponta sozinho.

### Princípios

- **O número do lote é o ID de correlação.** Ele costura CH, WSH, logs e PDV. Onde não houver
  lote (passos 2 a 4, do lado WinThor), a correlação é por janela de tempo.
- **A API de lote do CH é a fonte de verdade** sobre abertura, itens aceitos e fechamento. Log,
  APM e banco são evidência complementar, nunca a única fonte de um passo.
- **O app só observa e dispara.** Nenhuma alteração em WSH, CH ou PDV. Se um passo não tem fonte
  observável, ele aparece como `unknown`, não como `ok`.
- **Nada chumbado.** Endpoints, credenciais, caminhos de log, serviços e consultas de evidência
  vivem num catálogo em Configurações, seguindo a regra de caminhos do [AGENTS.md](../../AGENTS.md).
- **Uma lógica, três transportes.** Tudo nasce num Service e é exposto em IPC, REST/WS e MCP, como
  o resto do app.
- **Reaproveitar o que existe** (tabela abaixo) em vez de reescrever cliente HTTP, consulta SQL ou
  leitura de log.

### Peças existentes que o módulo reaproveita

| Necessidade | Já existe em | Tool MCP correspondente |
|-------------|--------------|-------------------------|
| Serviço Windows parado/rodando | `WindowsService` (`trackedServices`) | `env_get_services_status` |
| Porta ocupada | `NetworkService` / `monitoredPorts` | `env_check_ports` |
| Health HTTP de um endpoint local | `NetworkService.checkHttpHealth` | `network_check_health` |
| Conexão Oracle e Postgres, consulta SQL | `DatabaseService` (`databaseConnections`) | `db_test_connection`, `db_execute_query` |
| Login no WinThor e requisição autenticada | `HttpClientService` | `http_login_winthor`, `http_send_request` |
| Requisição HTTP com JSONPath no retorno | `QaPayloadService.fetchPayloadFromApi` | `qa_fetch_api_payload` |
| Payload original gravado no Oracle (`PCINTEGRACAOCORE`) | `QaPayloadService` | `qa_fetch_incoming_payload` |
| Traces OTLP do Karaf (rota, status, SQL, latência) | `ApmService` + `ApmReceiverClient` | `apm_get_traces`, `apm_get_trace_details` |
| Últimas linhas de um arquivo de log | `LogWatcherService` | `logs_read_last_lines` |
| Relatório Markdown para o Jira | padrão do Validador Regressivo (`QaRegressionService`) | `qa_run_regression_suite` |

## Modelo de dados

Os tipos vão num arquivo novo `src/shared/integrationTypes.ts` (o `types.ts` já passa do teto de
300 linhas) e são reexportados onde o app espera.

```ts
export type IntegrationLayerId = 'winthor' | 'wsh' | 'ch' | 'pdv';

/** Como alcançar e observar uma camada na máquina local. Tudo opcional: o pré-voo pula o que não estiver preenchido. */
export interface IntegrationLayerConfig {
  layer: IntegrationLayerId;
  baseUrl?: string;              // validado com isSafeUrl
  healthPath?: string;           // ex.: /actuator/health; sem isso, o pré-voo testa só a porta
  port?: number;
  windowsServiceName?: string;   // serviço a conferir via WindowsService
  processName?: string;          // ex.: executável do PDV
  dbConnectionId?: string;       // Oracle (winthor) ou Postgres (pdv), de databaseConnections
  logFilePath?: string;          // lido com isLogFilePath/isInsideDir
  auth?: { type: 'none' | 'basic' | 'bearer' | 'winthor'; user?: string; password?: string; token?: string };
}

/** Um fluxo do WSH e como provar cada passo dele. */
export interface IntegrationFlowDefinition {
  id: string;
  name: string;                  // ex.: "Venda"
  chBatchType: string;           // tipo de lote informado ao CH
  trigger?: { method: 'GET' | 'POST'; path: string; body?: string };   // como disparar o fluxo no WSH
  winthorApiPath?: string;       // API chamada pelo fluxo (para a evidência do passo 3)
  evidence: {
    oracleQuery?: string;        // opcional: o dado existe na retaguarda? (binds :lote, :inicio, :fim)
    pdvQuery: string;            // prova de chegada no Postgres do PDV (binds :lote, :inicio, :fim)
    pdvWaitSeconds: number;      // quanto esperar a descida CH → PDV (polling)
    expectedItemsJsonPath?: string; // onde contar itens no retorno da API do WinThor
  };
  logMarkers?: { wsh?: string; ch?: string };   // texto além do nº do lote para filtrar os logs
}

export type IntegrationStepId =
  | 'open-batch' | 'winthor-token' | 'winthor-api' | 'jolt'
  | 'ch-token' | 'ch-send' | 'pdv-arrival' | 'close-batch';

export type IntegrationStepStatus = 'ok' | 'failed' | 'pending' | 'skipped' | 'unknown';

export interface IntegrationTraceStep {
  id: IntegrationStepId;
  status: IntegrationStepStatus;
  startedAt?: number;
  durationMs?: number;
  httpStatus?: number;
  itemCount?: number;
  source: 'ch-api' | 'apm' | 'log' | 'sql' | 'http' | 'none';
  evidence?: string;             // trecho curto: linha de log, resumo do SQL, corpo da resposta
  message?: string;              // em português, para a tela e o Jira
}

export interface IntegrationTraceResult {
  id: string;
  flowId: string;
  batchNumber?: string;
  startedAt: number;
  finishedAt?: number;
  steps: IntegrationTraceStep[];
  brokenAt?: IntegrationStepId;  // primeiro passo com status failed
  evidenceMarkdown: string;
}

export interface IntegrationReadinessResult {
  checkedAt: number;
  layers: Array<{
    layer: IntegrationLayerId;
    status: 'ok' | 'warning' | 'failed' | 'not-configured';
    checks: Array<{ label: string; status: 'ok' | 'failed' | 'skipped'; detail?: string; durationMs?: number }>;
  }>;
}
```

Em `AppSettings` entram `integrationLayers?: IntegrationLayerConfig[]` e
`integrationFlows?: IntegrationFlowDefinition[]`. Os campos `auth.password` e `auth.token` são
segredos: entram em `encryptSecretsForDisk`, `decryptSecretsInPlace`, `sanitizeSecrets` e
`preserveExistingSecrets` **no mesmo commit** que criar o tipo.

O **histórico de rastreios** não fica em memória nem em `config.json`: vai para
`integration-traces/<id>.json` na pasta de dados do usuário, para o processo do MCP ler o que a
tela gerou e vice-versa (mesma regra das métricas de uso). Guardar os últimos 50 e podar.

## Arquitetura

```
src/main/services/IntegrationTraceService.ts        orquestra pré-voo, disparo e rastreio (≤300 linhas)
src/main/services/integration/
  readinessChecks.ts        um check por camada, cada um devolve { label, status, detail }
  chBatchClient.ts          abrir/consultar/monitorar/fechar lote (preenchido na fase 2)
  wshFlowClient.ts          disparar fluxo e listar fluxos, se o WSH expuser
  winthorCorrelation.ts     acha o trace no APM (ou a linha do log) na janela do passo 3
  pdvEvidence.ts            roda pdvQuery com polling até pdvWaitSeconds
  traceTimeline.ts          PURO: monta e atualiza os 8 passos, decide brokenAt
  traceEvidenceMarkdown.ts  PURO: gera o relatório para o Jira
  traceHistoryStore.ts      lê/grava integration-traces/*.json
```

- Dependências injetadas no construtor: `ConfigService`, `DatabaseService`, `NetworkService`,
  `WindowsService`, `HttpClientService`, `ApmReceiverClient`, `LogWatcherService`.
- Progresso em streaming por callback `onStep(step)`, consumido pelo WebSocket na tela; no MCP o
  `collect()` já existente buffereia e devolve a linha do tempo completa.
- Instanciado nos três entry points, na mesma ordem (`main/index.ts`, `server/index.ts`,
  `mcp/index.ts`).

### Camada de exposição

| Transporte | Onde |
|------------|------|
| IPC | `main/ipc/handlers/integrationHandlers.ts`, canais `integration:*` |
| Preload / web | método novo no `preload/index.ts` + `renderer/src/services/webBridge/integration.ts` |
| REST / WS | `server/index.ts`: `/api/integration/*` (extrair para `server/routes/integrationRoutes.ts`, o arquivo já passa do teto) |
| MCP | `integration_check_readiness` (leitura), `integration_check_batch`, `integration_list_traces` e `integration_get_trace` (leitura: consultam um lote existente e o histórico), `integration_run_flow` (**`DESTRUCTIVE_TOOLS`**: dispara processamento real) |

### Tela

Página nova `IntegrationTracePage.tsx` no grupo **Infra** do menu, ao lado de **APM** e **WinThor**,
composta por subcomponentes em `components/integrationtrace/`:

- `ReadinessStrip.tsx`: um cartão por camada, no padrão do `QualityReadinessPanel`.
- `FlowPicker.tsx`: escolhe o fluxo, botão **Disparar fluxo** e campo **Rastrear lote existente**.
- `TraceTimeline.tsx` + `TraceStepRow.tsx`: os oito passos; o passo quebrado destacado em vermelho
  com o trecho da evidência e link para **ver log** / **ver antes/depois** (JOLT).
- `TraceHistoryList.tsx`: últimos rastreios, para reabrir.
- `modals/JoltDiffModal.tsx`: JSON antes e depois lado a lado (Monaco diff, já no bundle).
- Configurações: aba **Integração ponta a ponta** com editor das camadas e dos fluxos, no padrão
  dos editores de lista de `settingsListEditors.ts`.
- Atalho `Alt+<tecla>`: a definir, ajustando os quatro lugares listados no AGENTS.md (navegação,
  Header, QuickLauncher e tabela da Ajuda).

### Métricas de uso

Entram em `USAGE_BASELINE_DEFINITIONS`: `integration/readiness-check` (manual: 10 min),
`integration/run-flow` (manual: 30 min, o teste de ponta a ponta de hoje) e
`integration/trace-batch` (manual: 20 min). As tools correspondentes entram em
`MCP_TOOL_TO_BASELINE_KEY`. Só contadores e durações, nunca número de lote, SQL ou payload.

## Plano por fases

| Fase | Situação |
|------|----------|
| 0. Fundamentos | Entregue (tipos, segredos, aba de Configurações, linha do tempo e Markdown puros) |
| 1. Pré-voo | Entregue (página, `IntegrationTraceService`, `integration_check_readiness`, `POST /api/integration/readiness`) |
| Rastreio parcial de lote (adiantado das fases 2 a 4) | Entregue sem depender de P1 a P5: chegada no PDV por SQL com espera, retaguarda Oracle, passo 3 pelo APM, logs filtrados pelo lote, histórico em arquivo e relatório Markdown (`integration_check_batch`, `integration_list_traces`, `integration_get_trace`, `POST /api/integration/trace`) |
| 2. Cliente do PDVSync e passos reais | **Entregue**: login RAC, consultar lote e status por loja (só leitura), configuração na camada CH, pré-voo do login, modelo de oito passos na ordem real e chegada por loja. Falta validar contra um ambiente real (P1) |
| Monitor do WSH (Oracle) | **Entregue**: busca na `PCINTEGRACAOCORE` por rota, dado, status e período, resposta do PDVSync lida da `OBSERVACAO`, percurso do item e `integration_check_wsh`. Fonte principal a partir da coleta |
| Vista animada e modo ao vivo | **Entregue**: percurso do lote em SVG com replay e 3D em CSS, lojas clicáveis e reconsulta a cada 15 s enquanto a chegada está pendente (`POST /api/integration/traces/:id/refresh`) |
| 3. Disparo do fluxo | Pendente de P2 (disparo e número do lote) e P3 (OTLP no Karaf) |
| 5. Fechamento | Parcial: relatório e histórico existem; falta o diff do JOLT |

### Decisões do rastreio parcial

- **Semântica da evidência:** `:lote` vai sempre como texto; `:inicio` e `:fim` como `AAAA-MM-DD HH:MM:SS` em hora local, e só os binds que a consulta usa são enviados. Com `count(*)` vale o valor da primeira coluna; em qualquer outra consulta, o número de linhas.
- **Somente leitura:** a consulta do cadastro passa por `isReadOnlySql` antes de cada execução, mesmo que o `config.json` tenha sido editado à mão.
- **Sem evidência nunca é ok:** passo sem fonte fica `unknown` com o motivo. Erro de SQL na consulta do PDV também vira `unknown` (o erro é da evidência, não da integração) e a causa vai para as observações. A retaguarda Oracle sozinha deixa o passo 3 como `unknown`, porque o dado existir não prova que a API foi chamada.
- **Logs:** só a janela final do arquivo (até 5000 linhas e 512 KB, limite do leitor), o lote precisa estar isolado no texto (482 não casa com 14821) e o marcador do fluxo restringe, não amplia. Mesma guarda do visualizador de logs: extensão de log e fora da pasta de dados do app.
- **Nomes das tools:** `integration_check_batch` no lugar de `integration_trace_batch`, para o classificador de risco tratá-la como leitura pelo nome (`check`).
- **Histórico:** um JSON por rastreio em `integration-traces/` ao lado do `config.json`, com o lote e trechos de log, só nesta máquina; os 50 mais recentes.
- **Fora do que foi feito:** disparar o fluxo, abrir ou fechar lote e comparar o JSON antes e depois do JOLT.

Cada fase fecha com testes das funções puras, Ajuda atualizada e entrada no CHANGELOG. As fases
0 e 1 não dependem de nenhuma pendência de coleta.

### Fase 0 — Fundamentos (sem dados externos)

- `shared/integrationTypes.ts`, campos em `AppSettings`, criptografia dos segredos.
- Aba de Configurações com editor de camadas e fluxos; validação com `isSafeUrl`.
- `traceTimeline.ts` e `traceEvidenceMarkdown.ts` já com testes (são puros).
- Página vazia registrada no menu e na Ajuda ("em construção" não: a página já mostra a
  configuração e o pré-voo da fase 1 chega no mesmo ciclo).

**Pronto quando:** `npm run build` e `npm test` passam; um fluxo salvo em Configurações reaparece
após reabrir o app e a senha não aparece em `config.json` nem em `GET /api/settings`.

### Fase 1 — Pré-voo

- `readinessChecks.ts`: WinThor (Oracle conecta + login na API), WSH (serviço/porta/health),
  CH (serviço/porta/health), PDV (Postgres conecta + processo/serviço).
- `ReadinessStrip` na tela, tool `integration_check_readiness`, rota REST.
- Sem `healthPath` configurado, a camada é testada só pela porta e marcada `warning`.

**Pronto quando:** com o Postgres parado o cartão do PDV fica vermelho e diz qual check falhou;
o MCP devolve o mesmo resultado que a tela.

### Fase 2 — Rastrear lote existente pela API do CH (depende de P1)

- `chBatchClient.ts`: consultar e monitorar lote; mapear a resposta para os passos
  `open-batch`, `ch-send` (itens aceitos/rejeitados) e `close-batch`.
- Campo **Rastrear lote existente**, `TraceTimeline` com os passos que o CH prova; os outros
  ficam `unknown`.
- Tool `integration_check_batch`, histórico em arquivo (já entregues no rastreio parcial).

**Pronto quando:** informando um número de lote real, a tela mostra aberto/itens/fechado com os
horários do CH.

### Fase 3 — Disparar fluxo e correlacionar o lado WinThor (depende de P2 e P3)

- `wshFlowClient.ts`: disparar o fluxo e capturar o número do lote devolvido (ou achá-lo no log do
  WSH logo após o disparo).
- `winthorCorrelation.ts`: passo 3 pelo APM (`apm_get_traces` filtrando rota e janela de tempo);
  sem OTLP, pelo log do Karaf na mesma janela.
- Passo 4 (JOLT): diff entre o retorno da API do WinThor e o payload que entrou no lote do CH.
- Tool `integration_run_flow` em `DESTRUCTIVE_TOOLS`; botão **Disparar fluxo** pede confirmação
  com `requestConfirm`.

**Pronto quando:** um clique dispara o fluxo e a linha do tempo preenche os passos 1 a 6 em tempo
real pelo WebSocket.

### Fase 4 — Evidência no PDV e logs (depende de P4 e P5)

- `pdvEvidence.ts`: polling da `pdvQuery` até `pdvWaitSeconds`; passo 7 vira `ok` com a contagem
  ou `failed` com "0 de N registros após X s".
- Logs do WSH e do CH filtrados pelo número do lote (`LogWatcherService`), exibidos no passo
  quebrado.

**Pronto quando:** um lote que não desceu aparece quebrado no passo 7 com o trecho do log do CH.

### Fase 5 — Fechamento

- Botão **Copiar evidência (Jira)** com o Markdown do rastreio.
- Métricas de uso, catálogo `docs/MCP_TOOLS.md`, Ajuda completa (Guia dos Módulos, FAQ com
  pré-requisitos por camada, atalho), CHANGELOG e versão `minor`.

## Pendências de coleta

Roteiro para ir à máquina do ambiente e trazer as respostas: [roteiro-coleta-integracao.md](../roteiro-coleta-integracao.md).

**Atualização após ler o repositório de layouts do WSH** ([referencia-wsh-pdvsync.md](../referencia-wsh-pdvsync.md)): o contrato da
API de lote (P1) e o agendamento dos fluxos (parte de P2) já são conhecidos, e três premissas deste documento mudam. A tabela
abaixo mostra o estado de cada pendência; as premissas corrigidas estão em "Correções do modelo".

Preencher aqui antes de iniciar a fase indicada. Até lá, os clientes correspondentes ficam com
interface definida e implementação que devolve `unknown`.

| Nº | O que coletar | Bloqueia | Resposta |
|----|---------------|----------|----------|
| P1 | API de lote do CH (PDVSync) | Fase 2 | **Contrato conhecido** pelo repositório de layouts ([referência](../referencia-wsh-pdvsync.md)). Falta: ambiente usado (nuvem, homologação ou cópia local), inquilino, credenciais (ficam com você) e respostas reais de três lotes |
| P2 | WSH: como disparar um fluxo, onde loga e como o lote aparece no log | Fase 3 | **Parcial**: os fluxos rodam por agendamento, com intervalo configurado por cliente. Falta: como forçar a execução, o log do WSH e as linhas com o lote |
| P3 | Os serviços WinThor no Karaf exportam OTLP para o APM do app, ou só log? Qual arquivo de log | Fase 3 | _pendente_ |
| P4 | Tabela e colunas do Postgres do PDV que provam a chegada | Fase 4 | _pendente_, **menos crítica**: o PDVSync informa o status do lote por loja |
| P5 | O CH do ambiente é a nuvem, uma cópia local ou um simulador? Serviços, porta e log | Fases 1 (health) e 4 (log) | _pendente_ |
| O1 | Estrutura e amostras das tabelas `PCINTEGRACAO*` do Oracle (colunas de status, erro e data; como o lote aparece) | Fases 2 a 4 | _pendente_ |
| V1 | Como se confere que uma **venda** (sentido PDV → WinThor) chegou ao WinThor | Novo modelo de venda | _pendente_ |

## Correções do modelo após ler os layouts do WSH

Este documento foi escrito a partir da descrição verbal da cadeia. O repositório de layouts mostra o que realmente roda, e três
premissas mudam (detalhes em [referencia-wsh-pdvsync.md](../referencia-wsh-pdvsync.md)):

1. **Venda não usa lote.** É um fluxo de entrada (PDV → WinThor): busca as vendas no PDVSync, envia ao WinThor e devolve o status.
   Os oito passos modelados aqui valem para fluxos de **saída** (produto, preço, estoque, cliente...). A venda precisa de modelo
   próprio, que depende de V1.
2. **A ordem dos passos é outra.** Num fluxo de saída: login no WinThor, busca, JOLT, login no PDVSync, **abrir lote**, enviar,
   **fechar lote**, consultar lote. O lote só é aberto depois de buscar os dados. Os identificadores `open-batch`,
   `winthor-token`, `ch-token` e a ordem de `INTEGRATION_STEP_ORDER` foram revistos e **aplicados**: os ids agora são `winthor-login`, `winthor-fetch`, `jolt`, `pdvsync-login`, `open-batch`, `send`, `close-batch` e `pdv-arrival`.
3. **A chegada ao PDV tem uma fonte melhor que o SQL do PDV.** O PDVSync informa o status do lote e o status por loja
   (`LoteExternoRetornos` e `LojaLoteStatusretorno`). O SQL no Postgres vira confirmação, **aplicado**.

### Decisões do cliente do PDVSync

- **Só leitura.** O Hub faz login e consulta; nunca abre nem fecha lote, para não competir com o WSH (só existe um lote aberto por tipo).
- **Segredos:** senha e `client_secret` na criptografia do `config.json`; trocar o endereço do login sem digitá-los de novo descarta os salvos.
- **Abertura e fechamento por inferência explícita:** o lote existir prova a abertura; sair de `EmPreparacao` indica o fechamento (a confirmar); ficar em `EmPreparacao` é `pending`, não falha, porque o fluxo pode estar rodando.
- **Chegada:** por loja, `BaixadoComSucesso` em todas é `ok`, `BaixadoComErro` em alguma é `failed` com o motivo, e `Disponivel` ou `EmProcessoDeBaixa` é `pending`. Sem status por loja, vale o status do lote. `EnviadoComSucesso` não prova a baixa e fica sem evidência.
- **Conflito entre fontes:** falha do PDVSync vence um `ok` do banco; PDVSync em andamento com dado ainda ausente no banco é `pending`; e uma consulta rápida do banco que não acha o lote, quando o PDVSync já deu a resposta final, vira observação, não falha.

Também muda o "disparar fluxo": os fluxos rodam por agendamento (`PCINTEGRACAOAGENDAMENTO`), então o botão depende de saber como
forçar uma execução (P2). E o Oracle do WSH (`PCINTEGRACAOCORE` e tabelas de fluxo) guarda o histórico de execuções, o que pode
substituir a leitura de log para dizer se uma integração rodou (O1).

### Monitor do WSH: o Oracle como fonte principal (após a coleta de 2026-10-25)

A coleta no ambiente real mudou a fonte principal. O WSH já registra cada integração na `PCINTEGRACAOCORE`, e é lá que o time
procura hoje (no monitor do WSH, filtrando por fluxo e pelo dado). Então o Hub passa a **monitorar o que o WSH gravou**, sem
credencial do PDVSync:

- **Unidade:** cada linha é um **item** (produto, preço, cobrança...), não um lote. A rota de busca (`WTA - Buscar ...`) cria a linha
  (`DATACRIACAO`, `IDEXTERNO` = `pdvsync-<tipo>-<código>-...`); a rota de envio (`PDVSYNC - ...`) atualiza a mesma linha
  (`IDROTASERVICOENVIO`, `IDREQUISICAOENVIO`, `DATASINCRONISMO`) e grava a resposta do PDVSync na `OBSERVACAO`.
- **Status:** só 2 (integrado) e 3 (erro) apareceram; outro código é mostrado como está, sem inventar significado.
- **Erros:** a `OBSERVACAO` traz `errors` por índice, com o campo, a mensagem e o `identificadorExterno`. O PDVSync recusa a requisição
  inteira: um item sem erro próprio fica com status 3 por causa de outros itens do mesmo envio, e o Hub separa os dois casos.
- **Só leitura e sem dado sensível:** o SQL é fixo com binds; `OBSERVACAO` é lida até 3800 caracteres com `dbms_lob.substr`, e
  `VARIAVEIS`, `DADOSRECEBIDOS` e `DADOSTRANSFORMADOS` nunca são lidos (podem ter token ou dado de cliente).
- **O que a tabela não prova:** abertura e fechamento do lote e a baixa nas lojas ficam *sem evidência* no percurso. O FLUXO-24
  (*Atualizar Status Lote Retaguarda*) grava o status por loja (`pdvsync-post-status-...`), mas não roda no ambiente coletado.
- **Rastrear lote e o cliente do PDVSync continuam**, como complemento para quem tiver as credenciais; deixam de ser o caminho principal.
- **Catálogo de fluxos (WORKFLOW_PDVSYNC):** `shared/wshFlowCatalog.ts` liga a rota ao fluxo (nome, categoria, sentido, API,
  tabelas, se roda por agendamento e dependências; o intervalo é de cada cliente e não entra no catálogo). O filtro mostra "FLUXO-09 · Produto" agrupado por categoria; rota fora do catálogo aparece
  pelo nome, em "Outras rotas".
- **Sentido:** o percurso usa o perfil de envio (WinThor → WSH → PDVSync → PDV) ou de recebimento (PDVSync → WSH → WinThor →
  retaguarda). Fora do catálogo, o prefixo da rota decide (`PDVSYNC -` = recebimento).
- **Dependências:** no detalhe, a última integração e os erros dos últimos 30 dias de cada fluxo do qual o item depende, numa
  consulta agregada por rota. "Nunca integrou neste banco" quando a rota não tem linha. O campo recusado aponta a causa provável
  (`impostos` → ICMS, `pisCofins` → PIS/COFINS, `ncms` → NCM). A tool `integration_check_wsh` devolve as dependências quando recebe `routeId`.
- **Como resolver (níveis 1 e 2):** `shared/wshSuggestions.ts` transforma os erros, o catálogo e as dependências em ações
  ordenadas (corrigir os itens que derrubaram o envio, valor fora do Enum, campo vazio, dependência que não integrou), só
  afirmando o que os dados mostram; o link do TDN (`linkDocumentacao`) aparece quando é https da TOTVS. O nível 2 lê a
  `LAYOUTTRANSFORMACAO` das rotas do item no Oracle (definição do JOLT, sem dado de negócio) e `shared/joltFieldMap.ts` acha as regras
  que escrevem o campo recusado, marcando a que casa com o item (PIXS casa com `PIX*` → `tipo = 8`). Do Jolt do WSH: valor fixo de shift (`#8`) é texto
  até um `=toInteger` seguinte, e o painel liga os dois; `custom-totvs`/`custom-decode` só decodifica Base64 e é ignorada; `{{X}}`
  é variável opaca do WSH. Não está confirmado se a rota de envio roda sobre a saída da de busca, então cada rota aparece separada. O nível 3 (explicação pela IA)
  fica para depois.
- **IDINTERNO:** a busca procura também no `IDINTERNO`, que nas transações traz o identificador do negócio (venda:
  filial-série-cupom). A lista mostra o `IDINTERNO` quando existe. Assim o cupom acha a venda sem ler o `DADOSTRANSFORMADOS`.
- **Origem dos campos:** `fieldOrigins` no catálogo diz de onde o JOLT tira cada campo, conferido num par real (vendas, FLUXO-16). O "Como
  resolver" usa isso quando o destino recusa um campo ("codCob vem de PagamentoForma.IdRetaguarda no PDVSync").
- **Processos online** (PDVOmni → WinThor direto) ficam para uma próxima etapa: não passam pelo WSH.

### Decisões da vista animada e do modo ao vivo

- **Só desenha o que foi provado.** A animação é derivada do rastreio (`traceAnimationModel.ts`, puro e testado): um trecho só ganha cor depois que o lote passa por ele, `unknown` e `skipped` ficam tracejados e nada depois do passo quebrado é revelado.
- **Ritmo:** a duração de cada passo na animação vem da duração medida, em escala logarítmica entre 350 ms e 1,4 s, para 10 ms e 6 s caberem na mesma cena.
- **Lojas:** até 6 no desenho; acima disso, as 5 primeiras e um grupo com o pior status (falha > pendente > sem evidência). Sem status por loja, um destino único "PDV" com o status da chegada.
- **3D leve:** perspectiva e `rotateX/rotateZ` em CSS sobre o mesmo SVG, sem biblioteca 3D nem WebGL. A escolha fica em `localStorage`; com movimento reduzido, a cena abre no estado final.
- **Modo ao vivo:** `refreshTrace(id)` refaz o rastreio no mesmo id do histórico (sem entrada nova) com o SQL em modo rápido. A tela liga sozinha quando a chegada está `pending`, reconsulta a cada 15 s e para quando a chegada sai de `pending` ou depois de 40 consultas (`liveTrace.ts`). Não há tool MCP de reconsulta: o assistente pode chamar `integration_check_batch` de novo. A reconsulta não entra em Meu uso, porque acompanhar não é um uso novo.

## Riscos e respostas

- **CH não devolve status por item.** O passo 6 mostra só o total enviado e o passo 7 depende do
  Postgres. Marcar `itemCount` como desconhecido em vez de inventar.
- **Karaf sem OTLP.** Correlação do passo 3 por log e janela de tempo; o APM continua opcional.
- **JOLT "antes" só existe dentro do WSH.** Se o WSH não loga, o diff compara o retorno da API do
  WinThor (que o app consegue chamar de novo) com o payload do lote. Dizer isso na tela.
- **Descida CH → PDV demora.** `pdvWaitSeconds` configurável por fluxo, polling com intervalo
  crescente, nunca bloqueia a UI.
- **Fluxo real tem efeito colateral.** `integration_run_flow` é destrutiva no MCP e pede
  confirmação na tela; a conexão do PDV marcada como `isProduction` recusa o disparo.
- **Catálogo diverge entre máquinas.** Export/import de configuração já existente cobre isso; não
  compartilhar instância (modo Web é single-tenant).

## Fora de escopo

- Alterar WSH, CH ou PDV.
- Rastrear fluxos que não passam por lote do CH.
- Monitoramento contínuo em produção: o alvo é a máquina de desenvolvimento e o ambiente de QA.
